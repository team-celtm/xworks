
async function runTests() {
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
        // replace old cookie if exists
        const name = primary.split('=')[0];
        cookies = cookies.filter(cx => !cx.startsWith(name + '='));
        cookies.push(primary);
      });
    }
  };

  try {
    console.log('--- F0: Authentication ---');
    console.log('Logging in as test@example.com / Password123!');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ email: 'test@example.com', password: 'Password123!' })
    });
    
    updateCookies(loginRes);
    const loginBody = await loginRes.json();
    if (!loginRes.ok) throw new Error('Login failed: ' + JSON.stringify(loginBody));
    console.log('✅ Login successful, got cookies');

    console.log('\n--- F1: Course Discovery ---');
    const coursesRes = await fetch(`${baseUrl}/courses`);
    const courses = await coursesRes.json();
    if (!Array.isArray(courses)) throw new Error('Failed to fetch catalogue');
    console.log(`✅ Fetched ${courses.length} courses from catalogue`);

    const freeCourse = courses.find(c => c.price === 0);
    const paidCourse = courses.find(c => c.price > 0 && !c.live);
    const liveCourse = courses.find(c => c.live);
    
    if (freeCourse) {
      const detailRes = await fetch(`${baseUrl}/courses/${freeCourse.slug}`);
      const detail = await detailRes.json();
      console.log(`✅ Fetched detail for ${freeCourse.slug} (ID: ${detail.id})`);
    }

    console.log('\n--- F2: Enrolment (Free Course) ---');
    if (freeCourse) {
       const enrolRes = await fetch(`${baseUrl}/learner/enrolments`, {
         method: 'POST',
         headers: headers(),
         body: JSON.stringify({ courseId: freeCourse.id })
       });
       updateCookies(enrolRes);
       const enrolData = await enrolRes.json();
       if (enrolRes.ok) {
          console.log(`✅ Enrolled in free course ${freeCourse.name}`);
       } else if (enrolRes.status === 409 || enrolData.error?.includes('duplicate') || enrolData.error?.includes('already enrolled')) {
          console.log(`✅ Already enrolled in free course ${freeCourse.name}`);
       } else {
          throw new Error('Failed to enrol: ' + JSON.stringify(enrolData));
       }
    }

    console.log('\n--- F3: Learner Dashboard ---');
    const myCoursesRes = await fetch(`${baseUrl}/learner/enrolments`, { headers: headers() });
    updateCookies(myCoursesRes);
    const myCourses = await myCoursesRes.json();
    if (!Array.isArray(myCourses)) throw new Error('Failed to fetch dashboard: ' + JSON.stringify(myCourses));
    console.log(`✅ Fetched dashboard. My enrolled courses count: ${myCourses.length}`);
    
    console.log('\n--- SUMMARY ---');
    console.log('✅ API Tests for Core Flows passed successfully!');
    
  } catch (err) {
    console.error('❌ Test failed:', err.message);
  }
}

runTests();
