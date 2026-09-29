const fs = require('fs');
let css = fs.readFileSync('src/app/campaigns/[id]/CampaignDetails.module.css', 'utf8');

css = css.replace(/\.statsCard \{\s*display: flex;\s*gap: 20px;\s*margin: 24px 0;\s*\}/, `.statsCard {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
  margin: 24px 0;
}`);

css = css.replace(/\.statBox \{\s*flex: 1;\s*background: var\(--glass-bg\);\s*backdrop-filter: var\(--glass-blur\);\s*border: 1px solid var\(--glass-border\);\s*border-radius: var\(--radius-lg\);\s*padding: 24px;\s*display: flex;\s*flex-direction: column;\s*justify-content: center;\s*align-items: center;\s*box-shadow: var\(--shadow-sm\);\s*\}/, `.statBox {
  background: rgba(255,255,255,0.03);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 16px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  position: relative;
  overflow: hidden;
}`);

css = css.replace(/\.statBox h3 \{\s*font-size: 1rem;\s*color: var\(--color-text-muted\);\s*margin: 0 0 8px 0;\s*font-weight: 600;\s*\}/, `.statBox h3 {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin: 0 0 6px 0;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}`);

css = css.replace(/\.statNumber \{\s*font-size: 2\.5rem;\s*font-weight: 800;\s*color: var\(--color-text\);\s*margin: 0;\s*\}/, `.statNumber {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--color-text);
  margin: 0;
  line-height: 1;
}`);

css = css.replace(/  \.statsCard \{\s*flex-direction: column;\s*gap: 12px;\s*\}/, `  .statsCard {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }`);

fs.writeFileSync('src/app/campaigns/[id]/CampaignDetails.module.css', css, 'utf8');
