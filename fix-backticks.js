const fs = require('fs');

function fix(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\\\`/g, '`');
  content = content.replace(/\\\$/g, '$');
  content = content.replace(/\\\\n/g, '\\n');
  content = content.replace(/\\\\s/g, '\\s');
  content = content.replace(/\\\\d/g, '\\d');
  content = content.replace(/\\\\D/g, '\\D');
  content = content.replace(/\\\\+/g, '\\+');
  content = content.replace(/\\\\t/g, '\\t');
  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed syntax in ' + file);
}

fix('src/app/campaigns/page.tsx');
fix('src/components/campaigns/CreateCampaignModal.tsx');
fix('src/app/campaigns/[id]/page.tsx');
fix('src/app/campaigns/[id]/dialer/page.tsx');
