const fs = require('fs');
let content = fs.readFileSync('src/app/sessions/[id]/page.tsx', 'utf8');

const searchStr = `    const filtered = joined;`;

const replaceStr = `    // Fetch full hierarchy to determine visibility
    let allUsers = await db.users.toArray();
    let allTeams = await db.teams.toArray();
    
    let validOwnerIds = [String(currentUser.id)];

    if (currentUser.role === 'SUPER_ADMIN') {
      validOwnerIds = allUsers.map(u => String(u.id));
    } else if (currentUser.role === 'FOLK_GUIDE') {
      const myTeams = allTeams.filter(t => String(t.guideId) === String(currentUser.id));
      const myTeamIds = myTeams.map(t => String(t.id));
      const myUsers = allUsers.filter(u => 
        String(u.guideId) === String(currentUser.id) || 
        (u.teamId && myTeamIds.includes(String(u.teamId)))
      );
      validOwnerIds = [...validOwnerIds, ...myUsers.map(u => String(u.id))];
    } else if (currentUser.role === 'FOLK_LEADER' || currentUser.role === 'LEADER') {
      if (currentUser.teamId) {
        const myTeamUsers = allUsers.filter(u => String(u.teamId) === String(currentUser.teamId));
        validOwnerIds = [...validOwnerIds, ...myTeamUsers.map(u => String(u.id))];
      }
    }

    const uniqueOwnerIds = new Set(validOwnerIds);

    const filtered = joined.filter(record => {
      const ownerId = String(record.personOwnerId);
      const assignedId = record.assignedUserId ? String(record.assignedUserId) : null;
      return uniqueOwnerIds.has(ownerId) || (assignedId && uniqueOwnerIds.has(assignedId));
    });`;

content = content.replace(searchStr, replaceStr);

fs.writeFileSync('src/app/sessions/[id]/page.tsx', content, 'utf8');
