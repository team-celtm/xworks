
// ... appending F5 script part
async function testF5() {
  const baseUrl = 'http://localhost:3000/api';
  let cookies = [];

  const headers = () => {
    const h = { 'Content-Type': 'application/json' };
    if (cookies.length) {
      h['Cookie'] = cookies.join('; ');
    }
    return h;
  };

  const updateCookies = (res) => {
    const setCookie = res.headers.getRaw ? res.headers.getRaw('set-cookie') : res.headers.get('set-cookie');
    if (setCookie) {
      const arr = Array.isArray(setCookie) ? setCookie : setCookie.split(',');
      arr.forEach(c => {
        const primary = c.split(';')[0];
        const name = primary.split('=')[0];
        cookies = cookies.filter(cx => !cx.startsWith(name + '='));
        cookies.push(primary);
      });
    }
  };

  try {
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ email: 'test@example.com', password: 'Password123!' })
    });
    updateCookies(loginRes);

    const dsRes = await fetch(`${baseUrl}/learner/enrolments`, { headers: headers() });
    const enrolments = await dsRes.json();
    if (enrolments.length === 0) throw new Error('No enrolments to test F5');
    
    const enrolment = enrolments[0];
    console.log(`\n--- F5: Progress & Certification ---`);
    console.log(`Marking enrolment ${enrolment.enrolment_id} (Course: ${enrolment.name}) as 100% complete...`);

    const progressRes = await fetch(`${baseUrl}/learner/enrolments/${enrolment.enrolment_id}/progress`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ progressPct: 100 })
    });
    const progressData = await progressRes.json();
    if (!progressRes.ok) throw new Error('Failed to update progress: ' + JSON.stringify(progressData));
    console.log(`✅ Progress updated. Result:`, progressData);

    console.log(`Fetching certificates...`);
    const certsRes = await fetch(`${baseUrl}/learner/certificates`, { headers: headers() });
    const certs = await certsRes.json();
    console.log(`✅ Found ${certs.length} certificates for this user.`);

  } catch (e) {
    console.error('F5 Test failed:', e.message);
  }
}

testF5();
