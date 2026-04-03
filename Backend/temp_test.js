require('dotenv').config();
(async () => {
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@bvrit.ac.in', password: 'password123' })
  });
  const loginPayload = await loginRes.json();
  console.log('login status', loginRes.status, loginPayload);
  const token = loginPayload?.data?.token;
  if (!token) return;
  const dashRes = await fetch('http://localhost:5000/api/admin/dashboard', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const dashPayload = await dashRes.json();
  console.log('dash status', dashRes.status, dashPayload);
})();
