const https = require('https');
https.get('https://apidocs.delhivery.in/apidocs/btob.yaml', (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('status', res.statusCode);
    console.log(body.slice(0, 5000));
  });
}).on('error', (e) => console.error('error', e));
