const fs = require('fs');
let content = fs.readFileSync('src/components/layout/Navigation.tsx', 'utf8');

const importTarget = `import { QuickAddContact } from '../people/QuickAddContact';`;
const importReplacement = `import { QuickAddContact } from '../people/QuickAddContact';
import { QuickDialerModal } from '../people/QuickDialerModal';
import { Phone, UserPlus } from 'lucide-react';`;
content = content.replace(importTarget, importReplacement);

const stateTarget = `  const [showGlobalQuickAdd, setShowGlobalQuickAdd] = useState(false);`;
const stateReplacement = `  const [showGlobalQuickAdd, setShowGlobalQuickAdd] = useState(false);
  const [showQuickDialer, setShowQuickDialer] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);`;
content = content.replace(stateTarget, stateReplacement);

const renderTarget = `      {/* Global Floating Action Button for Quick Add (Only on Dashboard & People) */}
      {(pathname === '/' || pathname === '/people') && (
        <button 
          className={styles.globalFab}
          onClick={() => setShowGlobalQuickAdd(true)}
          aria-label="Quick Add Contact"
        >
          <Plus size={28} />
        </button>
      )}

      {showGlobalQuickAdd && (
        <QuickAddContact onClose={() => setShowGlobalQuickAdd(false)} />
      )}`;
const renderReplacement = `      {/* Global Floating Action Button Menu (Only on Dashboard & People) */}
      {(pathname === '/' || pathname === '/people') && (
        <>
          {showFabMenu && (
            <div className={styles.fabMenuOverlay} onClick={() => setShowFabMenu(false)}>
              <div className={styles.fabMenu} onClick={e => e.stopPropagation()}>
                <button 
                  className={styles.fabMenuItem} 
                  onClick={() => { setShowFabMenu(false); setShowGlobalQuickAdd(true); }}
                >
                  <UserPlus size={20} />
                  <span>Add Contact</span>
                </button>
                <button 
                  className={styles.fabMenuItem} 
                  onClick={() => { setShowFabMenu(false); setShowQuickDialer(true); }}
                >
                  <Phone size={20} />
                  <span>Quick Dialer</span>
                </button>
              </div>
            </div>
          )}
          <button 
            className={styles.globalFab}
            onClick={() => setShowFabMenu(!showFabMenu)}
            aria-label="Actions Menu"
            style={{ transform: showFabMenu ? 'rotate(45deg)' : 'rotate(0deg)' }}
          >
            <Plus size={28} />
          </button>
        </>
      )}

      {showGlobalQuickAdd && (
        <QuickAddContact onClose={() => setShowGlobalQuickAdd(false)} />
      )}
      
      {showQuickDialer && (
        <QuickDialerModal onClose={() => setShowQuickDialer(false)} />
      )}`;
content = content.replace(renderTarget, renderReplacement);

fs.writeFileSync('src/components/layout/Navigation.tsx', content, 'utf8');
console.log('Modified Navigation.tsx');
