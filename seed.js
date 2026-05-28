const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:VbaXdYSYcFkLumAFFWbtRFKPbEyLYIdC@switchyard.proxy.rlwy.net:50984/railway'
});

async function seed() {
  try {
    const res = await pool.query('SELECT u.id, u.first_name, i.id as instructor_id FROM users u JOIN instructors i ON u.id = i.user_id WHERE u.first_name = $1 LIMIT 1', ['Rohan']);
    const instructor = res.rows[0];
    if (!instructor) {
      console.log('Instructor not found');
      return;
    }
    console.log('Seeding for instructor:', instructor.first_name);

    let courseRes = await pool.query('SELECT id, name FROM courses WHERE instructor_id = $1 LIMIT 1', [instructor.instructor_id]);
    let course = courseRes.rows[0];

    if (!course) {
      console.log('Creating a course...');
      const insertCourse = await pool.query(`
        INSERT INTO courses (instructor_id, name, slug, description, price_paise, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name
      `, [instructor.instructor_id, 'Mastering Web Development', 'mastering-web-dev', 'Learn everything', 500000, 'published']);
      course = insertCourse.rows[0];
    }

    console.log('Using course:', course.name);

    // Insert a few enrolments
    const dates = [
      new Date(), // today
      new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      new Date(Date.now() - 25 * 24 * 60 * 60 * 1000) // 25 days ago
    ];

    for (let i = 0; i < dates.length; i++) {
      const email = `dummy${Date.now()}${i}@student.com`;
      const newStudent = await pool.query(`
        INSERT INTO users (first_name, last_name, email, role)
        VALUES ($1, $2, $3, 'learner')
        RETURNING id
      `, [`Student${i}`, 'Test', email]);
      const studentId = newStudent.rows[0].id;
      
      const pricePaise = 500000; // 5000 INR
      
      const enrRes = await pool.query(`
        INSERT INTO enrolments (user_id, course_id, price_paid_paise, enrolled_at)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [studentId, course.id, pricePaise, dates[i]]);
      
      const enrolmentId = enrRes.rows[0].id;

      await pool.query(`
        INSERT INTO payments (enrolment_id, user_id, amount, status, payment_status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [enrolmentId, studentId, pricePaise, 'successful', 'captured', dates[i]]);
      
      console.log('Inserted enrolment & payment for', dates[i].toISOString());
    }

    console.log('Seeding complete!');
  } catch (err) {
    console.error('Error seeding:', err);
  } finally {
    pool.end();
  }
}

seed();
