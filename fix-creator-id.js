const fs = require('fs');
let code = fs.readFileSync('src/app/campaigns/[id]/page.tsx', 'utf8');

code = code.replace(/campaign\.createdByUserId/g, 'campaign.creatorId');

fs.writeFileSync('src/app/campaigns/[id]/page.tsx', code, 'utf8');
