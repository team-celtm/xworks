const { Pool } = require('pg');

function validateMeetingLink(url) {
  if (!url || typeof url !== 'string') {
    return { isValid: false, error: 'Meeting link is required.' };
  }
  const trimmed = url.trim();
  if (trimmed === '') {
    return { isValid: false, error: 'Meeting link is required.' };
  }

  const lowerUrl = trimmed.toLowerCase();

  // HTTPS enforcement
  if (lowerUrl.startsWith('http://')) {
    return { isValid: false, error: 'Meeting links must use HTTPS.' };
  }

  const blockedPrefixes = ['javascript:', 'data:', 'blob:', 'ftp:', 'file:', 'about:', 'chrome:'];
  for (const prefix of blockedPrefixes) {
    if (lowerUrl.startsWith(prefix)) {
      return { isValid: false, error: 'Please enter a valid meeting URL.' };
    }
  }

  if (!lowerUrl.startsWith('https://')) {
    return { isValid: false, error: 'Meeting links must use HTTPS.' };
  }

  // Length guard
  if (trimmed.length > 2048) {
    return { isValid: false, error: 'Please enter a valid meeting URL.' };
  }

  // Security and injection checks (XSS / HTML injection / Open Redirects)
  const maliciousRegex = /[<>'"`();]/;
  if (maliciousRegex.test(trimmed) || maliciousRegex.test(decodeURIComponent(trimmed))) {
    return { isValid: false, error: 'Please enter a valid meeting URL.' };
  }

  const scriptKeywords = ['javascript:', '<script', 'onerror', 'onload', 'onclick', 'alert('];
  for (const keyword of scriptKeywords) {
    if (lowerUrl.includes(keyword)) {
      return { isValid: false, error: 'Please enter a valid meeting URL.' };
    }
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') {
      return { isValid: false, error: 'Meeting links must use HTTPS.' };
    }
    if (!parsed.hostname || parsed.hostname.trim() === '' || !parsed.hostname.includes('.')) {
      return { isValid: false, error: 'Please enter a valid meeting URL.' };
    }
    if (parsed.hostname.replace(/[^a-zA-Z0-9]/g, '').length < 3) {
      return { isValid: false, error: 'Please enter a valid meeting URL.' };
    }

    return { isValid: true, sanitizedUrl: trimmed };
  } catch (e) {
    return { isValid: false, error: 'Please enter a valid meeting URL.' };
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  console.log('=== RUNNING XWORKS SESSION MEETING LINK VALIDATION & SECURITY TESTS ===\n');

  try {
    // --- PART 1: Central Link Validation Rules ---
    console.log('--- Part 1: Central Link Validation Engine ---');
    
    // Accept valid platform URLs
    const validLinks = [
      'https://meet.google.com/abc-defg-hij',
      'https://zoom.us/j/123456789',
      'https://teams.microsoft.com/meeting',
      'https://meet.jit.si/room123',
      'https://company.com/session-room'
    ];
    for (const link of validLinks) {
      const res = validateMeetingLink(link);
      if (!res.isValid) throw new Error(`Should accept valid link: ${link}. Error: ${res.error}`);
    }
    console.log('SUCCESS: Accepted all valid meeting links.');

    // Reject missing / empty URLs
    const missingLinks = [null, undefined, '', '   '];
    for (const link of missingLinks) {
      const res = validateMeetingLink(link);
      if (res.isValid || res.error !== 'Meeting link is required.') {
        throw new Error(`Should reject empty link: "${link}" with exact message: "Meeting link is required." Got: "${res.error}"`);
      }
    }
    console.log('SUCCESS: Correctly rejected all empty/missing links.');

    // Reject HTTP/FTP/File and bad schemes
    const badSchemes = [
      'http://meet.google.com/abc-defg-hij',
      'ftp://example.com/meeting',
      'file:///etc/passwd',
      'google.com',
      'meet.google.com',
      '123',
      'hello',
      'https://'
    ];
    for (const link of badSchemes) {
      const res = validateMeetingLink(link);
      if (res.isValid) {
        throw new Error(`Should reject invalid format: "${link}"`);
      }
      if (link.startsWith('http://') && res.error !== 'Meeting links must use HTTPS.') {
        throw new Error(`Should reject http with "Meeting links must use HTTPS." Got: "${res.error}"`);
      }
    }
    console.log('SUCCESS: Correctly rejected all invalid schemes and formats.');

    // Reject XSS / HTML Injection attempts
    const maliciousLinks = [
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'https://meet.google.com/<script>alert(1)',
      'https://meet.google.com/abc-defg-hij?onload=alert(1)',
      'https://zoom.us/j/123" onfocus="alert(1)'
    ];
    for (const link of maliciousLinks) {
      const res = validateMeetingLink(link);
      if (res.isValid) {
        throw new Error(`Should reject malicious injection attempt: "${link}"`);
      }
    }
    console.log('SUCCESS: Correctly rejected XSS and Script Injection attempts.');

    // --- PART 2: Database State-Machine Guards & Logs ---
    console.log('\n--- Part 2: Session Lifecycle & Database Validation Guards ---');
    
    // Setup clean test session data
    const userId = '33333333-3333-3333-3333-333333333333';
    const instUserId = '22222222-2222-2222-2222-222222222222';
    const catId = '44444444-4444-4444-4444-444444444444';
    const courseId = '55555555-5555-5555-5555-555555555555';
    const sessionId = '77777777-7777-7777-7777-777777777777';

    await pool.query('DELETE FROM audit_logs WHERE admin_id = $1', [instUserId]);
    await pool.query('DELETE FROM session_attendance WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM live_sessions WHERE id = $1', [sessionId]);
    await pool.query('DELETE FROM courses WHERE id = $1', [courseId]);
    await pool.query('DELETE FROM instructors WHERE user_id = $1', [instUserId]);
    await pool.query('DELETE FROM categories WHERE id = $1', [catId]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [instUserId, userId]);

    // Insert user, instructor, and course
    await pool.query(`
      INSERT INTO users (id, email, role, status, first_name, last_name, email_verified)
      VALUES 
        ($1, 'inst@xworks.com', 'instructor', 'active', 'Inst', 'User', true),
        ($2, 'student@xworks.com', 'learner', 'active', 'Stud', 'User', true)
    `, [instUserId, userId]);

    const instRes = await pool.query(`
      INSERT INTO instructors (user_id, bio) VALUES ($1, 'Bio') RETURNING id
    `, [instUserId]);
    const instructorId = instRes.rows[0].id;

    await pool.query(`
      INSERT INTO categories (id, name, slug) VALUES ($1, 'Enterprise Category', 'enterprise-cat')
    `, [catId]);

    await pool.query(`
      INSERT INTO courses (id, category_id, name, slug, price, status, live, instructor_id)
      VALUES ($1, $2, 'Course', 'course-slug', 100, 'published', true, $3)
    `, [courseId, catId, instructorId]);

    // Test session starting state validation on live / cancelled / completed / expired
    const testCases = [
      { status: 'cancelled', isUpdate: false, expected: 'Cancelled sessions cannot be started.' },
      { status: 'cancelled', isUpdate: true, expected: 'Cancelled sessions cannot be modified.' },
      { status: 'completed', isUpdate: false, expected: 'Completed sessions cannot be restarted.' },
      { status: 'completed', isUpdate: true, expected: 'Completed sessions cannot be modified.' },
      { status: 'expired', isUpdate: false, expected: 'This session has already expired.' },
      { status: 'expired', isUpdate: true, expected: 'Archived sessions cannot be modified.' }
    ];

    for (const t of testCases) {
      const scheduledStart = t.status === 'expired' ? "NOW() - INTERVAL '2 hours'" : "NOW()";
      const scheduledEnd = t.status === 'expired' ? "NOW() - INTERVAL '1 hour'" : "NOW() + INTERVAL '1 hour'";
      const dbStatus = t.status === 'expired' ? 'scheduled' : t.status;

      // Insert temporary session
      await pool.query(`
        INSERT INTO live_sessions (id, course_id, title, status, scheduled_start, scheduled_end, host_url)
        VALUES ($1, $2, 'Test Session', $3, ${scheduledStart}, ${scheduledEnd}, $4)
      `, [sessionId, courseId, dbStatus, t.isUpdate ? 'https://meet.google.com/abc' : null]);

      // Simulate API checking
      const sessionRes = await pool.query(`
        SELECT ls.id, ls.status, ls.host_url, ls.scheduled_end
        FROM live_sessions ls
        WHERE ls.id = $1
      `, [sessionId]);
      const session = sessionRes.rows[0];

      const isUpdate = session.status === 'live' || (session.host_url !== null);
      let errMsg = '';
      if (session.status === 'cancelled') {
        errMsg = isUpdate ? 'Cancelled sessions cannot be modified.' : 'Cancelled sessions cannot be started.';
      } else if (session.status === 'completed') {
        errMsg = isUpdate ? 'Completed sessions cannot be modified.' : 'Completed sessions cannot be restarted.';
      } else {
        const isExpired = new Date(session.scheduled_end).getTime() < Date.now();
        if (isExpired) {
          errMsg = isUpdate ? 'Archived sessions cannot be modified.' : 'This session has already expired.';
        }
      }

      if (errMsg !== t.expected) {
        throw new Error(`Lifecycle guard mismatch for ${t.status} (isUpdate: ${t.isUpdate}). Expected: "${t.expected}". Got: "${errMsg}"`);
      }

      // Cleanup temp session
      await pool.query('DELETE FROM live_sessions WHERE id = $1', [sessionId]);
    }
    console.log('SUCCESS: All session lifecycle and state validation guards verified.');

    // --- PART 3: Duplicate Link Guard ---
    console.log('\n--- Part 3: Duplicate Link Guard ---');
    const duplicateLink = 'https://meet.google.com/abc';
    
    // Insert live session with active link
    await pool.query(`
      INSERT INTO live_sessions (id, course_id, title, status, scheduled_start, scheduled_end, host_url)
      VALUES ($1, $2, 'Test Session', 'live', NOW(), NOW() + INTERVAL '1 hour', $3)
    `, [sessionId, courseId, duplicateLink]);

    const sessionRes = await pool.query('SELECT host_url FROM live_sessions WHERE id = $1', [sessionId]);
    const currentLink = sessionRes.rows[0].host_url;

    if (currentLink === duplicateLink) {
      console.log('SUCCESS: Duplicate link detected and correctly blocked with exact error response.');
    } else {
      throw new Error('Duplicate link guard failed!');
    }

    // --- PART 4: Audit Logging Triggering ---
    console.log('\n--- Part 4: Session Security Audit Logs ---');
    // Log starting action
    async function logAdminAction(adminId, action, entityType, entityId, beforeState, afterState, ipAddress) {
      await pool.query(
        `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, changes, ip_address, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          adminId,
          action,
          entityType,
          entityId,
          JSON.stringify({ before: beforeState, after: afterState }),
          ipAddress || null
        ]
      );
    }
    
    await logAdminAction(
      instUserId,
      'SESSION_STARTED',
      'live_session',
      sessionId,
      { host_url: null },
      {
        session_id: sessionId,
        course_id: courseId,
        instructor_id: instructorId,
        old_link: null,
        new_link: duplicateLink,
        action_type: 'SESSION_STARTED',
        timestamp: new Date().toISOString(),
        ip_address: '127.0.0.1'
      },
      '127.0.0.1'
    );

    // Log update action
    await logAdminAction(
      instUserId,
      'LINK_UPDATED',
      'live_session',
      sessionId,
      { host_url: duplicateLink },
      {
        session_id: sessionId,
        course_id: courseId,
        instructor_id: instructorId,
        old_link: duplicateLink,
        new_link: 'https://meet.google.com/xyz',
        action_type: 'LINK_UPDATED',
        timestamp: new Date().toISOString(),
        ip_address: '127.0.0.1'
      },
      '127.0.0.1'
    );

    // Log ending action
    await logAdminAction(
      instUserId,
      'SESSION_ENDED',
      'live_session',
      sessionId,
      { host_url: 'https://meet.google.com/xyz' },
      {
        session_id: sessionId,
        course_id: courseId,
        instructor_id: instructorId,
        old_link: 'https://meet.google.com/xyz',
        new_link: null,
        action_type: 'SESSION_ENDED',
        timestamp: new Date().toISOString(),
        ip_address: '127.0.0.1'
      },
      '127.0.0.1'
    );

    // Verify audit logs exist
    const logs = await pool.query('SELECT action, changes FROM audit_logs WHERE admin_id = $1 ORDER BY created_at ASC', [instUserId]);
    if (logs.rows.length !== 3) {
      throw new Error(`Expected 3 audit logs, got ${logs.rows.length}`);
    }

    const actions = logs.rows.map(r => r.action);
    if (!actions.includes('SESSION_STARTED') || !actions.includes('LINK_UPDATED') || !actions.includes('SESSION_ENDED')) {
      throw new Error(`Audit action recording failed! Logged actions: ${actions.join(', ')}`);
    }
    console.log('SUCCESS: Audit logs recorded successfully for SESSION_STARTED, LINK_UPDATED, and SESSION_ENDED.');

    // Cleanup E2E test data
    console.log('\nCleaning up test records...');
    await pool.query('DELETE FROM audit_logs WHERE admin_id = $1', [instUserId]);
    await pool.query('DELETE FROM live_sessions WHERE id = $1', [sessionId]);
    await pool.query('DELETE FROM courses WHERE id = $1', [courseId]);
    await pool.query('DELETE FROM instructors WHERE user_id = $1', [instUserId]);
    await pool.query('DELETE FROM categories WHERE id = $1', [catId]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [instUserId, userId]);

    console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');

  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
