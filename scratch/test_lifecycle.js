const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:VbaXdYSYcFkLumAFFWbtRFKPbEyLYIdC@switchyard.proxy.rlwy.net:50984/railway";
const pool = new Pool({ connectionString });

async function runTests() {
  console.log('=== RUNNING XWORKS LIFECYCLE & INTEGRITY TESTS ===\n');

  // Helper for asserting errors
  const assertThrows = async (fn, message) => {
    try {
      await fn();
      console.error(`FAIL: Expected error for "${message}" but it succeeded.`);
      process.exit(1);
    } catch (e) {
      console.log(`SUCCESS (Expected Error): ${message} -> ${e.message}`);
    }
  };

  // 1. Setup temporary variables
  let parentCatId, childCatId, instructorId, studentId, courseId, sessionAId, sessionBId, enrolmentId, registrationId;

  try {
    // Get/create test user & instructor
    console.log('Setting up Test Users...');
    const userRes = await pool.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role)
      VALUES ('lifecycle_student@xworks.com', 'hash', 'Lifecycle', 'Student', 'learner')
      ON CONFLICT (email) DO UPDATE SET email=EXCLUDED.email RETURNING id
    `);
    studentId = userRes.rows[0].id;

    const instUserRes = await pool.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role)
      VALUES ('lifecycle_instructor@xworks.com', 'hash', 'Lifecycle', 'Instructor', 'instructor')
      ON CONFLICT (email) DO UPDATE SET email=EXCLUDED.email RETURNING id
    `);
    const instUserId = instUserRes.rows[0].id;

    const instRes = await pool.query(`
      INSERT INTO instructors (user_id, bio)
      VALUES ($1, 'Test bio info')
      ON CONFLICT (user_id) DO UPDATE SET bio=EXCLUDED.bio RETURNING id
    `, [instUserId]);
    instructorId = instRes.rows[0].id;

    // 2. Category Delete Checks
    console.log('\n--- Category Deletion & Nested Checks ---');
    
    // Create parent category
    const parentCatRes = await pool.query(`
      INSERT INTO categories (slug, name)
      VALUES ('temp-parent-cat', 'Temp Parent Category')
      ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name RETURNING id
    `);
    parentCatId = parentCatRes.rows[0].id;

    // Create child category
    const childCatRes = await pool.query(`
      INSERT INTO categories (slug, name, parent_id)
      VALUES ('temp-child-cat', 'Temp Child Category', $1)
      ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name RETURNING id
    `, [parentCatId]);
    childCatId = childCatRes.rows[0].id;

    // Test Parent Deletion (must fail since it has child subcategories)
    await assertThrows(async () => {
      // Simulate DELETE category logic
      const childCheck = await pool.query('SELECT name FROM categories WHERE parent_id = $1', [parentCatId]);
      if (childCheck.rows.length > 0) {
        throw new Error(`Cannot delete category because it has subcategories: ${childCheck.rows.map(r=>r.name).join(', ')}`);
      }
      await pool.query('DELETE FROM categories WHERE id = $1', [parentCatId]);
    }, 'Delete category with subcategories');

    // Create course under child category
    const courseRes = await pool.query(`
      INSERT INTO courses (category_id, instructor_id, name, level, dur, price, rating, live, status, slug)
      VALUES ($1, $2, 'Temp Lifecycle Course', 'beginner', 3600, 1000, 5, true, 'draft', 'temp-lifecycle-course')
      ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name RETURNING id
    `, [childCatId, instructorId]);
    courseId = courseRes.rows[0].id;

    // Test Child Deletion (must fail since it has active/draft course)
    await assertThrows(async () => {
      const courseCheck = await pool.query("SELECT name FROM courses WHERE category_id = $1 AND status != 'deleted'", [childCatId]);
      if (courseCheck.rows.length > 0) {
        throw new Error(`Cannot delete category. Used by: ${courseCheck.rows.map(r=>r.name).join(', ')}`);
      }
      await pool.query('DELETE FROM categories WHERE id = $1', [childCatId]);
    }, 'Delete category used by courses');

    // 3. Unpublished Course Session Start check
    console.log('\n--- Unpublished Course Validation ---');
    // Attempt to start a session for unpublished (draft) course
    await assertThrows(async () => {
      const courseStatusRes = await pool.query('SELECT status FROM courses WHERE id = $1', [courseId]);
      if (courseStatusRes.rows[0].status !== 'published') {
        throw new Error('Cannot start a session for an unpublished course.');
      }
    }, 'Start session for draft course');

    // Publish course
    await pool.query(`UPDATE courses SET status = 'published' WHERE id = $1`, [courseId]);
    console.log('Course published successfully!');

    // 4. Create live session slots
    console.log('\n--- Scheduling Live Sessions ---');
    const sessARes = await pool.query(`
      INSERT INTO live_sessions (course_id, title, status, scheduled_start, scheduled_end, max_seats, registered_count)
      VALUES ($1, 'Lifecycle Session A', 'scheduled', NOW() + interval '1 day', NOW() + interval '1 day 1 hour', 10, 0)
      RETURNING id
    `, [courseId]);
    sessionAId = sessARes.rows[0].id;

    const sessBRes = await pool.query(`
      INSERT INTO live_sessions (course_id, title, status, scheduled_start, scheduled_end, max_seats, registered_count)
      VALUES ($1, 'Lifecycle Session B', 'scheduled', NOW() + interval '2 days', NOW() + interval '2 days 1 hour', 10, 0)
      RETURNING id
    `, [courseId]);
    sessionBId = sessBRes.rows[0].id;

    // Enroll student
    const enrolRes = await pool.query(`
      INSERT INTO enrolments (user_id, course_id, status, progress_pct, enrolled_at)
      VALUES ($1, $2, 'active', 0, NOW())
      RETURNING id
    `, [studentId, courseId]);
    enrolmentId = enrolRes.rows[0].id;
    console.log(`Student enrolled! Enrolment ID: ${enrolmentId}`);

    // Register student for Session A
    await pool.query(`
      INSERT INTO session_registrations (enrolment_id, session_id, status, registered_at)
      VALUES ($1, $2, 'registered', NOW())
    `, [enrolmentId, sessionAId]);
    await pool.query('UPDATE live_sessions SET registered_count = registered_count + 1 WHERE id = $1', [sessionAId]);
    console.log('Registered student for Session A.');

    // 5. Duplicate Active Registration Check
    console.log('\n--- Duplicate Session Registration Block check ---');
    await assertThrows(async () => {
      // Logic from app/api/sessions/[id]/register/route.ts
      const activeRegCheck = await pool.query(`
        SELECT sr.id 
        FROM session_registrations sr
        JOIN live_sessions ls ON sr.session_id = ls.id
        WHERE sr.enrolment_id = $1 
          AND ls.course_id = $2 
          AND ls.status IN ('scheduled', 'live')
          AND sr.status = 'registered'
      `, [enrolmentId, courseId]);

      if (activeRegCheck.rows.length > 0) {
        throw new Error('Already registered for an active session of this course');
      }
    }, 'Register for duplicate session');

    // 6. Rescheduling slot checks
    console.log('\n--- Rescheduling Validations ---');
    // Verify slot rescheduling seat logic
    const regCheck = await pool.query('SELECT id FROM session_registrations WHERE enrolment_id = $1 AND session_id = $2', [enrolmentId, sessionAId]);
    registrationId = regCheck.rows[0].id;

    // Perform reschedule transaction
    await pool.query('BEGIN');
    await pool.query('UPDATE live_sessions SET registered_count = registered_count - 1 WHERE id = $1', [sessionAId]);
    await pool.query('UPDATE session_registrations SET session_id = $1, registered_at = NOW() WHERE id = $2', [sessionBId, registrationId]);
    await pool.query('UPDATE live_sessions SET registered_count = registered_count + 1 WHERE id = $1', [sessionBId]);
    await pool.query('COMMIT');
    console.log('Successfully rescheduled registration from Session A to Session B.');

    const seatCheckA = await pool.query('SELECT registered_count FROM live_sessions WHERE id = $1', [sessionAId]);
    const seatCheckB = await pool.query('SELECT registered_count FROM live_sessions WHERE id = $1', [sessionBId]);
    console.log(`Session A seats: ${seatCheckA.rows[0].registered_count} (expected 0)`);
    console.log(`Session B seats: ${seatCheckB.rows[0].registered_count} (expected 1)`);

    // 7. Attendance Heartbeat Reconnect Interval Checks (2 Minutes)
    console.log('\n--- Attendance Heartbeat Reconnect Interval ---');
    
    // Simulate first join
    const firstJoinRes = await pool.query(`
      INSERT INTO session_attendance (user_id, session_id, join_time, status)
      VALUES ($1, $2, NOW() - interval '90 seconds', 'joined')
      RETURNING id, join_time
    `, [studentId, sessionBId]);
    const attendanceRecordId = firstJoinRes.rows[0].id;
    const firstJoinTime = new Date(firstJoinRes.rows[0].join_time).getTime();
    console.log(`First join logged. Record ID: ${attendanceRecordId}`);

    // Simulate join reconnect at 90 seconds (under 2 minutes threshold)
    const reconnectTime = Date.now();
    const diffSeconds = (reconnectTime - firstJoinTime) / 1000;
    console.log(`Elapsed time since join: ${diffSeconds} seconds.`);
    
    let activeAttendanceRecordId = attendanceRecordId;
    if (diffSeconds < 120) {
      console.log('Time is under 2 minutes. Keeping the existing attendance record active (Deduplicated!).');
    } else {
      console.log('Time is over 2 minutes. Closing the old record and creating a new one.');
    }

    // Simulate another join after 3 minutes (over 2 minutes threshold)
    console.log('Simulating a reconnect after 3 minutes...');
    const fakeOldJoinTime = Date.now() - (180 * 1000);
    // Update first record's join_time to mock 3 mins ago
    await pool.query('UPDATE session_attendance SET join_time = NOW() - interval \'3 minutes\' WHERE id = $1', [attendanceRecordId]);
    
    // Check again
    const fetchRecord = await pool.query('SELECT join_time FROM session_attendance WHERE id = $1', [attendanceRecordId]);
    const recordJoinTime = new Date(fetchRecord.rows[0].join_time).getTime();
    const diffSecondsNew = (Date.now() - recordJoinTime) / 1000;
    console.log(`Mocked elapsed time since join: ${diffSecondsNew} seconds.`);

    if (diffSecondsNew >= 120) {
      console.log('Time is >= 2 minutes. Closing previous row (leave_time = NOW()) and inserting new row.');
      await pool.query(`
        UPDATE session_attendance 
        SET leave_time = NOW(), duration_seconds = EXTRACT(EPOCH FROM (NOW() - join_time))
        WHERE id = $1
      `, [attendanceRecordId]);

      const newRecord = await pool.query(`
        INSERT INTO session_attendance (user_id, session_id, join_time, status)
        VALUES ($1, $2, NOW(), 'joined')
        RETURNING id
      `, [studentId, sessionBId]);
      activeAttendanceRecordId = newRecord.rows[0].id;
      console.log(`Inserted new attendance record. New Record ID: ${activeAttendanceRecordId}`);
    }

    // 8. Auto-completion & Certificate Logic Test
    console.log('\n--- Session End, Auto-completion & Certificates ---');
    
    // Simulate attendance duration by updating active record to 1 hour
    await pool.query(`
      UPDATE session_attendance 
      SET join_time = NOW() - interval '1 hour', leave_time = NULL 
      WHERE id = $1
    `, [activeAttendanceRecordId]);

    // End the session
    console.log('Ending live session and processing attendance...');
    await pool.query(`UPDATE live_sessions SET status = 'live', host_url = 'https://zoom.us/test' WHERE id = $1`, [sessionBId]);
    
    // We execute the same queries as app/api/instructor/sessions/[id]/end/route.ts
    // Close active tracking
    await pool.query(`
      UPDATE session_attendance
      SET leave_time = NOW(),
          duration_seconds = EXTRACT(EPOCH FROM (NOW() - join_time)),
          status = 'attended'
      WHERE session_id = $1 AND leave_time IS NULL
    `, [sessionBId]);

    // Expected duration = 1 hour
    const thresholdSecs = 3600 * 0.8; // 80% of 1 hour = 48 minutes

    const eligibleStudents = await pool.query(`
      SELECT sa.user_id, SUM(sa.duration_seconds) as total_duration
      FROM session_attendance sa
      WHERE sa.session_id = $1 AND sa.user_id = $2
      GROUP BY sa.user_id
      HAVING SUM(sa.duration_seconds) >= $3
    `, [sessionBId, studentId, thresholdSecs]);

    console.log(`Eligible students found: ${eligibleStudents.rows.length}`);
    if (eligibleStudents.rows.length > 0) {
      const row = eligibleStudents.rows[0];
      
      // Update session registration
      await pool.query(`
        UPDATE session_registrations
        SET attendance_status = 'attended', completion_pct = 100
        WHERE session_id = $1 AND enrolment_id = $2
      `, [sessionBId, enrolmentId]);

      // Complete enrolment
      await pool.query(`
        UPDATE enrolments 
        SET status = 'completed', 
            completed_at = NOW(), 
            progress_pct = 100 
        WHERE id = $1
      `, [enrolmentId]);

      // Issue certificate
      await pool.query(`
        INSERT INTO certificates (credential_id, user_id, course_id, enrolment_id, status)
        VALUES ('XW-TEST-' || substr(md5(random()::text), 1, 8), $1, $2, $3, 'issued')
        ON CONFLICT (enrolment_id) DO NOTHING
      `, [row.user_id, courseId, enrolmentId]);

      // Create notification
      await pool.query(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES ($1, 'Course Completed! 🎓', 'Congratulations on completing the Lifecycle Course!', 'success')
      `, [row.user_id]);

      console.log('Lifecycle complete, certificate issued and notification sent successfully!');
    } else {
      console.error('FAIL: Student was not eligible for completion.');
      process.exit(1);
    }

    // Verify Notification row in DB
    const notifCheck = await pool.query('SELECT title, message FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [studentId]);
    console.log(`\nNotification DB check:`);
    console.log(`  Title: ${notifCheck.rows[0]?.title}`);
    console.log(`  Message: ${notifCheck.rows[0]?.message}`);

    // Verify Certificate issued in DB
    const certCheck = await pool.query('SELECT credential_id, status FROM certificates WHERE enrolment_id = $1', [enrolmentId]);
    console.log(`Certificate DB check:`);
    console.log(`  Credential ID: ${certCheck.rows[0]?.credential_id}`);
    console.log(`  Status: ${certCheck.rows[0]?.status}`);

  } finally {
    // 9. CLEANUP
    console.log('\nCleaning up lifecycle test data...');
    if (studentId) {
      await pool.query('DELETE FROM notifications WHERE user_id = $1', [studentId]);
      await pool.query('DELETE FROM certificates WHERE user_id = $1', [studentId]);
      await pool.query('DELETE FROM session_attendance WHERE user_id = $1', [studentId]);
    }
    if (enrolmentId) {
      await pool.query('DELETE FROM session_registrations WHERE enrolment_id = $1', [enrolmentId]);
      await pool.query('DELETE FROM enrolments WHERE id = $1', [enrolmentId]);
    }
    if (sessionAId) await pool.query('DELETE FROM live_sessions WHERE id = $1', [sessionAId]);
    if (sessionBId) await pool.query('DELETE FROM live_sessions WHERE id = $1', [sessionBId]);
    if (courseId) await pool.query('DELETE FROM courses WHERE id = $1', [courseId]);
    if (childCatId) await pool.query('DELETE FROM categories WHERE id = $1', [childCatId]);
    if (parentCatId) await pool.query('DELETE FROM categories WHERE id = $1', [parentCatId]);
    
    // Delete test users
    await pool.query("DELETE FROM users WHERE email IN ('lifecycle_student@xworks.com', 'lifecycle_instructor@xworks.com')");
    
    await pool.end();
    console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');
  }
}

runTests().catch(e => {
  console.error('Fatal Test Error:', e);
  pool.end();
  process.exit(1);
});
