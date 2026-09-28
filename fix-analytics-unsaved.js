const fs = require('fs');
let content = fs.readFileSync('src/app/analytics/page.tsx', 'utf8');

const target1 = `interactions = interactions.filter(i => peopleIds.includes(String(i.personId)));`;
const replacement1 = `interactions = interactions.filter(i => peopleIds.includes(String(i.personId)) || (String(i.personId) === "UNSAVED_CALL" && userIds.includes(String(i.creatorId))));`;

// Needs to be done for all 3 occurrences!
content = content.replace(target1, replacement1);
content = content.replace(target1, replacement1);
content = content.replace(target1, replacement1);

fs.writeFileSync('src/app/analytics/page.tsx', content, 'utf8');
console.log('Modified analytics/page.tsx');
