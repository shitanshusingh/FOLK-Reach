const fs = require('fs');
let content = fs.readFileSync('src/app/sessions/[id]/page.tsx', 'utf8');

const searchTeamUsers = `    if (currentUser.role === 'FOLK_LEADER' || currentUser.role === 'LEADER') {
      if (!currentUser.teamId) return [currentUser];
      return await db.users.where('teamId').equals(currentUser.teamId).toArray();
    }`;

content = content.replace(searchTeamUsers, ``);

fs.writeFileSync('src/app/sessions/[id]/page.tsx', content, 'utf8');
