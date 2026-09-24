const fs = require('fs');
let content = fs.readFileSync('src/app/sessions/[id]/page.tsx', 'utf8');

const searchFallback = `<div style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>`;

const replaceFallback = `<div style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', flexBasis: '100%' }}>`;

content = content.replace(searchFallback, replaceFallback);

fs.writeFileSync('src/app/sessions/[id]/page.tsx', content, 'utf8');
