const fs = require('fs');
let content = fs.readFileSync('src/app/sessions/[id]/page.tsx', 'utf8');

// Replace corrupted emojis
content = content.replace(/â€¢/g, '•');
content = content.replace(/ðŸ”¥/g, '🔥');
content = content.replace(/âœ…/g, '✅');
content = content.replace(/ðŸ”/g, '🔥');
content = content.replace(/ðŸ‘¤/g, '👤');
content = content.replace(/ðŸ””/g, '🔔');
content = content.replace(/ðŸ“ž/g, '📞');
content = content.replace(/ðŸ“ /g, '📝');
content = content.replace(/â€”/g, '—');
content = content.replace(/-\?/g, '🔥');
content = content.replace(/dY\+ /g, '🔥');
content = content.replace(/\?\?,/g, '👥');
content = content.replace(/\?3/g, '⏳');
content = content.replace(/o\./g, '✅');
content = content.replace(/dY "/g, '🤔');
content = content.replace(/\?O/g, '❌');
content = content.replace(/\?-\,\?/g, '⏭️');
content = content.replace(/dY>`/g, '⛔');
content = content.replace(/dY"/g, '📵');
content = content.replace(/؋,\?/g, '📥');

// Fix flex layout
const searchFlex = `<div className={styles.callCardActions}>
                    {['FOLK_LEADER', 'LEADER', 'SUPER_ADMIN', 'FOLK_GUIDE'].includes(currentUser?.role || '') ? (
                      <GlassSelect`;

const replaceFlex = `<div className={styles.callCardActions}>
                    <div style={{ flex: 1, minWidth: '120px' }}>
                    {['FOLK_LEADER', 'LEADER', 'SUPER_ADMIN', 'FOLK_GUIDE'].includes(currentUser?.role || '') ? (
                      <GlassSelect`;

content = content.replace(searchFlex, replaceFlex);

const searchClosing = `                      </div>
                    )}

                  <div`;

const replaceClosing = `                      </div>
                    )}
                    </div>

                  <div`;

content = content.replace(searchClosing, replaceClosing);

fs.writeFileSync('src/app/sessions/[id]/page.tsx', content, 'utf8');
