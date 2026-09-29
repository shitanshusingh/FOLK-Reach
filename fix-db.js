const fs = require('fs');
let db = fs.readFileSync('src/lib/db.ts', 'utf8');
db = db.replace(/status: 'PENDING' \| 'INTERESTED' \| 'NOT_INTERESTED' \| 'NO_ANSWER' \| 'CONVERTED';/, "status: 'PENDING' | 'INTERESTED' | 'NOT_INTERESTED' | 'NO_ANSWER' | 'CONVERTED' | 'FOLLOW_UP' | 'AVERAGE';");
fs.writeFileSync('src/lib/db.ts', db, 'utf8');
