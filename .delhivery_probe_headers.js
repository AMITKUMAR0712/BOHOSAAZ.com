const https = require('https');
const headerTests = [
  { name: 'Bearer', value: 'Bearer dummy' },
  { name: 'Token', value: 'Token dummy' },
  { name: 'HQ', value: 'HQ dummy' },
  { name: 'Delhivery', value: 'Delhivery dummy' },
  { name: 'X-Auth-Token', value: 'dummy' },
];
const data = JSON.stringify({});
function testHeader(test) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'track.delhivery.com',
      port: 443,
      path: '/api/cmu/create.json',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        Authorization: test.value,
      },
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        resolve({ name: test.name, status: res.statusCode, headers: res.headers, body });
      });
    });
    req.on('error', (e) => resolve({ name: test.name, error: e.message }));
    req.write(data);
    req.end();
  });
}
(async () => {
  for (const test of headerTests) {
    const result = await testHeader(test);
    console.log('===', result.name, '===');
    console.log(result.status || 'error', result.error || '');
    if (result.headers) console.log(JSON.stringify(result.headers));
    console.log(result.body, '\n');
  }
})();
