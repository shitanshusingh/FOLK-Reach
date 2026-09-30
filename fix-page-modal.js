const fs = require('fs');

// 1. Update page.tsx to pass rawLeads properly
let page = fs.readFileSync('src/app/campaigns/[id]/page.tsx', 'utf8');
page = page.replace(
  /teamUsers=\{teamUsers\}\s+onClose=\{\(\) => setShowEditModal\(false\)\}/,
  'teamUsers={teamUsers}\n          rawLeads={rawLeads}\n          onClose={() => setShowEditModal(false)}'
);
fs.writeFileSync('src/app/campaigns/[id]/page.tsx', page, 'utf8');
