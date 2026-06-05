const fs = require('fs');
const body = fs.readFileSync('.delhivery_docs.yaml', 'utf8');
const lines = body.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (/\/ums\/login\b/.test(lines[i]) || /\/v2\/manifest\b/.test(lines[i]) || /securitySchemes\b/.test(lines[i])) {
    console.log('--- line', i + 1, lines[i]);
    for (let j = i + 1; j < Math.min(i + 40, lines.length); j++) {
      console.log(lines[j]);
    }
    console.log('---');
  }
}
