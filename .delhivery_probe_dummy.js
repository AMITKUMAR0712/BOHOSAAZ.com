const https = require('https');
const data = JSON.stringify({ token: 'dummy' });
const options = {
  hostname: 'track.delhivery.com',
  port: 443,
  path: '/api/cmu/create.json',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
};
const req = https.request(options, (res) => {
  console.log('status', res.statusCode);
  console.log('headers', JSON.stringify(res.headers, null, 2));
  let body = '';
  res.on('data', (chunk) => (body += chunk));
  res.on('end', () => {
    console.log('body', body);
  });
});
req.on('error', (e) => {
  console.error('error', e.message);
});
req.write(data);
req.end();
