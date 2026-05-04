const { Pool } = require('pg');

async function runTests() {
  const pool = new Pool({ connectionString: 'postgresql://postgres:VbaXdYSYcFkLumAFFWbtRFKPbEyLYIdC@switchyard.proxy.rlwy.net:50984/railway' });
  const email = 'test_cases_' + Date.now() + '@example.com';
  const password = 'Password123!';
  
  console.log('--- STARTING TESTS ---');

  // 1. Register a new user
  console.log(`\n1. Registering user ${email}`);
  const regRes = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Test',
      lastName: 'User',
      email: email,
      password: password,
      phone: '1234567890'
    })
  });
  const regBody = await regRes.json();
  console.log('Register Response:', regRes.status, regBody);
  if (regRes.status !== 201 || !regBody.needsVerification) throw new Error("Registration failed");

  // 2. Check DB status
  console.log('\n2. Checking DB state for user');
  const dbCheck1 = await pool.query('SELECT status, email_verified, verification_token FROM users WHERE email = $1', [email]);
  const user = dbCheck1.rows[0];
  console.log('DB State:', user);
  if (user.status !== 'pending_verification' || user.email_verified !== false) throw new Error("DB state incorrect");

  // 3. Login BEFORE verification
  console.log('\n3. Logging in before verification');
  const loginBeforeRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const loginBeforeBody = await loginBeforeRes.json();
  console.log('Login Before Verification Response:', loginBeforeRes.status, loginBeforeBody);
  if (loginBeforeRes.status !== 403 || !loginBeforeBody.needsVerification) throw new Error("Login before verification should fail");

  // 4. Verify with invalid token
  console.log('\n4. Verifying with invalid token');
  const verifyInvalidRes = await fetch('http://localhost:3000/api/auth/verify-email?token=invalid123');
  console.log('Verify Invalid Status:', verifyInvalidRes.status);
  if (verifyInvalidRes.status !== 404) throw new Error("Invalid token should 404");

  // 5. Verify with valid token
  console.log('\n5. Verifying with valid token');
  const verifyValidRes = await fetch(`http://localhost:3000/api/auth/verify-email?token=${user.verification_token}`, { redirect: 'manual' });
  console.log('Verify Valid Status:', verifyValidRes.status, 'Location:', verifyValidRes.headers.get('location'));
  if (verifyValidRes.status !== 307 && verifyValidRes.status !== 302) throw new Error("Valid token should redirect");

  // 6. Check DB status again
  console.log('\n6. Checking DB state after verification');
  const dbCheck2 = await pool.query('SELECT status, email_verified, verification_token FROM users WHERE email = $1', [email]);
  const userVerified = dbCheck2.rows[0];
  console.log('DB State:', userVerified);
  if (userVerified.status !== 'active' || userVerified.email_verified !== true) throw new Error("DB state not updated correctly");

  // 7. Login AFTER verification
  console.log('\n7. Logging in after verification');
  const loginAfterRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const loginAfterBody = await loginAfterRes.json();
  console.log('Login After Verification Response:', loginAfterRes.status, loginAfterBody);
  if (loginAfterRes.status !== 200) throw new Error("Login after verification failed");

  // 8. Test Duplicate Registration (Unverified update)
  console.log('\n8. Test duplicate registration (should update existing unverified or reject active)');
  const dupRes = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Test',
      lastName: 'User',
      email: email, // already active
      password: password,
      phone: '1234567890'
    })
  });
  const dupBody = await dupRes.json();
  console.log('Duplicate Registration Response:', dupRes.status, dupBody);
  if (dupRes.status !== 400 || dupBody.error !== 'User already exists') throw new Error("Duplicate active user should be rejected");

  console.log('\n--- ALL TESTS PASSED SUCCESSFULLY! ---');
  
  // Cleanup
  await pool.query('DELETE FROM users WHERE email = $1', [email]);
  pool.end();
}

runTests().catch(err => {
  console.error('\nTEST FAILED:', err);
  process.exit(1);
});
