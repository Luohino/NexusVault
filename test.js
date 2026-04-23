import fetch from 'node-fetch';

async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'testuser2', email: 'test2@test.com', password: 'password' })
    });
    const text = await res.text();
    console.log('Signup:', res.status, text);

    const res2 = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'testuser2', password: 'password' })
    });
    const text2 = await res2.text();
    console.log('Login:', res2.status, text2);
  } catch (e) {
    console.error(e);
  }
}
test();
