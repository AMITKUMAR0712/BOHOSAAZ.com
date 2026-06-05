const https = require('https');
https.get('https://apidocs.delhivery.in/apidocs/btob.yaml', (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    const lines = body.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (/^\/ums\/login\//.test(lines[i]) || /^\/v2\/manifest/.test(lines[i]) || /securitySchemes:/.test(lines[i])) {
        console.log('--- line', i + 1, lines[i]);
        for (let j = i + 1; j < Math.min(i + 40, lines.length); j++) {
          console.log(lines[j]);
        }
        console.log('---');
      }
    }
  });
}).on('error', (e) => console.error('error', e));
