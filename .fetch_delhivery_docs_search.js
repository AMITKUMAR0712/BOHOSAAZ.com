const https = require('https');
https.get('https://apidocs.delhivery.in/apidocs/btob.yaml', (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    const lines = body.split('\n');
    const matches = lines.filter((line) => /cmu|manifest|bearer|authorization|securitySchemes|Login|login|token/i.test(line));
    console.log('status', res.statusCode);
    console.log(matches.slice(0, 200).join('\n'));
  });
}).on('error', (e) => console.error('error', e));
