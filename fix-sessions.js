const fs = require('fs');
let content = fs.readFileSync('src/app/sessions/[id]/page.tsx', 'utf8');

// Replace all common powershell unicode corruptions
content = content.replace(/â€¢/g, '•');
content = content.replace(/ðŸ”¥/g, '🔥');
content = content.replace(/âœ…/g, '✅');
content = content.replace(/ðŸ”/g, '🔥');
content = content.replace(/ðŸ‘¤/g, '👤');
content = content.replace(/ðŸ””/g, '🔔');
content = content.replace(/ðŸ“ž/g, '📞');
content = content.replace(/ðŸ“ /g, '📝');
content = content.replace(/â€”/g, '—');

// Make the select dropdown look better
content = content.replace(/className=\{styles\.reassignSelect\}/g, 'className={styles.reassignSelect} style={{ appearance: "auto", padding: "8px 12px", background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "8px", color: "var(--color-text)", width: "100%", marginTop: "8px", marginBottom: "8px" }}');

fs.writeFileSync('src/app/sessions/[id]/page.tsx', content, 'utf8');
