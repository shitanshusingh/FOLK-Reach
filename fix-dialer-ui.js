const fs = require('fs');

let content = fs.readFileSync('src/app/campaigns/[id]/dialer/page.tsx', 'utf8');

// Fix 1: Change height: '100vh' to '100%' so it fits in the app layout properly
content = content.replace(/height: '100vh'/g, "minHeight: 'calc(100vh - 80px)'"); // accounting for bottom nav

// Fix 2: Change phone number color from --color-primary-light (which is translucent) to --color-primary
content = content.replace(/color: 'var\(--color-primary-light\)'/g, "color: '#c4b5fd'"); // beautiful light purple

// Fix 3: For the Exit Dialer button, let's make it look more like a distinct button instead of just text
content = content.replace(
  /<button onClick=\{\(\) => router\.push\(`\/campaigns\/\$\{campaignId\}`\)\} style=\{\{ background: 'transparent', border: 'none', color: 'var\(--color-text\)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 \}\}>/,
  '<button onClick={() => router.push(`/campaigns/${campaignId}`)} style={{ background: \'rgba(255,255,255,0.1)\', border: \'none\', color: \'var(--color-text)\', display: \'flex\', alignItems: \'center\', gap: 8, cursor: \'pointer\', fontWeight: 600, padding: \'8px 12px\', borderRadius: 8 }}>'
);

fs.writeFileSync('src/app/campaigns/[id]/dialer/page.tsx', content, 'utf8');
console.log('Fixed dialer UI');
