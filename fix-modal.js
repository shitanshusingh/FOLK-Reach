const fs = require('fs');

let content = fs.readFileSync('src/components/campaigns/CreateCampaignModal.tsx', 'utf8');

const replacement = `  const [targetTeamId, setTargetTeamId] = useState<string>(currentUser?.teamId ? String(currentUser.teamId) : "");

  // Fetch all teams for admins/guides
  const allTeams = useFirestoreQuery('teams');
  const isAdminOrGuide = ["SUPER_ADMIN", "FOLK_GUIDE", "ADMIN"].includes(currentUser?.role || "");

  // Get users for assignment based on targetTeamId
  const teamUsers = useFirestoreQuery(
    'users',
    targetTeamId ? [{ field: 'teamId', op: '==', value: targetTeamId }] : [{ field: 'teamId', op: '==', value: 'NO_MATCH' }]
  );`;

content = content.replace(
  /  \/\/ Get users for assignment \(all users in this team\)\s+const teamUsers = useFirestoreQuery\([\s\S]*?\);\s+/,
  replacement + '\n\n'
);

const teamSelector = `
          {isAdminOrGuide && (
            <div className={styles.formGroup}>
              <label>Target Residence/Team (Admin Override)</label>
              <select 
                className={styles.input} 
                value={targetTeamId}
                onChange={e => setTargetTeamId(e.target.value)}
                required
              >
                <option value="">-- Select a Team --</option>
                {allTeams?.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className={styles.smartPasteBox}>`;

content = content.replace(/          <div className=\{styles\.smartPasteBox\}>/, teamSelector);

// Also need to use targetTeamId when saving campaign
content = content.replace(/teamId: currentUser.teamId \|\| null,/, 'teamId: targetTeamId || null,');

fs.writeFileSync('src/components/campaigns/CreateCampaignModal.tsx', content, 'utf8');
console.log('Fixed team filtering');
