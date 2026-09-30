const fs = require('fs');

let css = fs.readFileSync('src/app/campaigns/[id]/CampaignDetails.module.css', 'utf8');

css += `
.actionBtn {
  background: rgba(255,255,255,0.03);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.08);
  color: var(--color-text);
  padding: 8px 16px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.actionBtn:hover {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.15);
  transform: translateY(-1px);
}

.deleteBtn {
  background: rgba(239, 68, 68, 0.05);
  border: 1px solid rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.deleteBtn:hover {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.25);
}
`;

fs.writeFileSync('src/app/campaigns/[id]/CampaignDetails.module.css', css, 'utf8');

// Now update the page.tsx buttons to use the new classes
let page = fs.readFileSync('src/app/campaigns/[id]/page.tsx', 'utf8');
page = page.replace(
  /onClick=\{\(\) => setShowEditModal\(true\)\} style=\{\{[^}]+\}\}/,
  'onClick={() => setShowEditModal(true)} className={styles.actionBtn}'
);
page = page.replace(
  /onClick=\{handleDelete\} style=\{\{[^}]+\}\}/,
  'onClick={handleDelete} className={`${styles.actionBtn} ${styles.deleteBtn}`}'
);

fs.writeFileSync('src/app/campaigns/[id]/page.tsx', page, 'utf8');
