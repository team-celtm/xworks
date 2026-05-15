
const fetch = require('node-fetch');

async function testAPIs() {
  console.log('--- Testing API Endpoints ---');

  // 1. Check Registration Validation
  console.log('\n1. Testing Instructor Registration Validation...');
  const regRes = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Test',
      lastName: 'Instructor',
      email: 'test_inst@xworks.com',
      password: 'Password123!',
      phone: '1234567890',
      profile: 'Instructor',
      bio: 'Too short',
      linkedin: 'not-a-url'
    })
  });
  const regData = await regRes.json();
  console.log('Registration Response (expecting validation error):', regRes.status, regData);

  // 2. Check Course List (including cert_type and issued_count)
  // Note: This requires an admin session, but we can check if it returns 401 correctly
  console.log('\n2. Testing Admin Course List Auth...');
  const courseRes = await fetch('http://localhost:3000/api/admin/courses/all');
  console.log('Admin Course List Status (expecting 401 if no cookie):', courseRes.status);
}

// testAPIs(); 
console.log('Script ready. Note: Localhost tests require dev server running.');
