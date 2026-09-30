const fs = require('fs');
let content = fs.readFileSync('src/app/sessions/[id]/page.tsx', 'utf8');

const regex = /const existingRecord = await db\.sessionAttendance[\s\S]*?\.first\(\) \|\| await db\.sessionAttendance\.where\('sessionId'\)\.equals\(id\)\.and\(r => r\.personId === \(personId as number\)\)\.first\(\);/m;

const newStr = `const existingRecord = await db.sessionAttendance.where('sessionId').equals(id).filter((r: any) => String(r.personId) === String(personId)).first();`;

content = content.replace(regex, newStr);
fs.writeFileSync('src/app/sessions/[id]/page.tsx', content, 'utf8');
