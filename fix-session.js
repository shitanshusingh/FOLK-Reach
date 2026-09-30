const fs = require('fs');
let content = fs.readFileSync('src/app/sessions/[id]/page.tsx', 'utf8');

content = content.replace(/<h2 className=\{styles.sectionTitle\}>Calling Campaign<\/h2>/g, '<h2 className={styles.sectionTitle}>Session Calling List</h2>');
content = content.replace(/<UserPlus size=\{18\} \/> Add to Campaign/g, '<UserPlus size={18} /> Add to Calling List');
content = content.replace(/placeholder="Search campaign by name or phone\.\.\."/g, 'placeholder="Search list by name or phone..."');

fs.writeFileSync('src/app/sessions/[id]/page.tsx', content, 'utf8');
