require('dotenv').config();
const http = require('http');

function post(path, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function testAll() {
  console.log('--- Testing Student Login (Register Number & Password) ---');
  const res1 = await post('/api/auth/student/login', {
    registerNumber: '420723104001',
    password: 'duwIksxwVF'
  });
  console.log('Status:', res1.status, '| Success:', res1.data?.success, '| Msg:', res1.data?.message, '| Student Name:', res1.data?.data?.name);

  console.log('\n--- Testing Student Login (Official Gmail & Password) ---');
  const res2 = await post('/api/auth/student/login', {
    officialGmail: 'aarthi.mariyappan@ckcet.ac.in',
    password: 'duwIksxwVF'
  });
  console.log('Status:', res2.status, '| Success:', res2.data?.success, '| Msg:', res2.data?.message, '| Student Name:', res2.data?.data?.name);

  console.log('\n--- Testing Coordinator Login ---');
  const res3 = await post('/api/auth/coordinator/login', {
    username: 'coord_cse',
    password: 'coord_cse'
  });
  console.log('Status:', res3.status, '| Success:', res3.data?.success, '| Msg:', res3.data?.message);

  process.exit(0);
}

testAll().catch(err => {
  console.error(err);
  process.exit(1);
});
