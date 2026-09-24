const fs = require('fs');
let content = fs.readFileSync('src/app/people/page.tsx', 'utf8');

const searchPeople = `      } else if (currentUser.role === 'FOLK_LEADER' || currentUser.role === 'LEADER') {
        if (currentUser.teamId) {
          const myTeamUsers = allUsers.filter(u => String(u.teamId) === String(currentUser.teamId));
          validOwnerIds = [...validOwnerIds, ...myTeamUsers.map(u => String(u.id))];
        }
      }`;

content = content.replace(searchPeople, ``);

fs.writeFileSync('src/app/people/page.tsx', content, 'utf8');
