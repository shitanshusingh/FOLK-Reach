const fs = require('fs');
let content = fs.readFileSync('src/app/sessions/[id]/page.tsx', 'utf8');

const regex = /const teamUsers = useLiveQuery\(async \(\) => \{[\s\S]*?\}\, \[currentUser\?\.teamId\, currentUser\?\.id\, currentUser\?\.role\]\);/;

const replaceStr = `const teamUsers = useLiveQuery(async () => {
    if (!currentUser?.id) return [];
    if (currentUser.role === 'SUPER_ADMIN') {
      return await db.users.toArray();
    }
    if (currentUser.role === 'FOLK_GUIDE') {
      let allTeams = await db.teams.toArray();
      const myTeams = allTeams.filter(t => String(t.guideId) === String(currentUser.id));
      const myTeamIds = myTeams.map(t => String(t.id));
      const allUsers = await db.users.toArray();
      return allUsers.filter(u => 
        String(u.guideId) === String(currentUser.id) || 
        (u.teamId && myTeamIds.includes(String(u.teamId)))
      );
    }
    if (currentUser.role === 'FOLK_LEADER' || currentUser.role === 'LEADER') {
      if (!currentUser.teamId) return [currentUser];
      return await db.users.where('teamId').equals(currentUser.teamId).toArray();
    }
    // Regular MEMBER
    return [currentUser];
  }, [currentUser?.teamId, currentUser?.id, currentUser?.role]);`;

content = content.replace(regex, replaceStr);

fs.writeFileSync('src/app/sessions/[id]/page.tsx', content, 'utf8');
