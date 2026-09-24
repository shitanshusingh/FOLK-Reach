const fs = require('fs');
let content = fs.readFileSync('src/app/people/page.tsx', 'utf8');

const searchStr = `        validOwnerIds = [...validOwnerIds, ...myUsers.map(u => String(u.id))];


      const uniqueOwnerIds = Array.from(new Set(validOwnerIds));`;

const replaceStr = `        validOwnerIds = [...validOwnerIds, ...myUsers.map(u => String(u.id))];
      }

      const uniqueOwnerIds = Array.from(new Set(validOwnerIds));`;

content = content.replace(searchStr, replaceStr);

fs.writeFileSync('src/app/people/page.tsx', content, 'utf8');
