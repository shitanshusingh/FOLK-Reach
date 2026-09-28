const fs = require('fs');
let content = fs.readFileSync('src/components/layout/Navigation.module.css', 'utf8');

const targetStr = `.globalFab {`;
const replacementStr = `.fabMenuOverlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.2);
  z-index: 49;
}

.fabMenu {
  position: fixed;
  bottom: 170px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 50;
  align-items: flex-end;
}

.fabMenuItem {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--glass-border);
  padding: 12px 16px;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: 0.95rem;
  box-shadow: var(--shadow-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.fabMenuItem:hover {
  background: var(--color-surface-hover);
  color: var(--color-primary);
  transform: scale(1.05);
}

.globalFab {`;
content = content.replace(targetStr, replacementStr);

const queryTargetStr = `  .globalFab {
    bottom: 40px;
    right: 40px;
  }`;
const queryReplacementStr = `  .globalFab {
    bottom: 40px;
    right: 40px;
  }
  .fabMenu {
    bottom: 110px;
    right: 40px;
  }`;
content = content.replace(queryTargetStr, queryReplacementStr);

fs.writeFileSync('src/components/layout/Navigation.module.css', content, 'utf8');
console.log('Modified Navigation.module.css');
