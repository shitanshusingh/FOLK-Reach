const fs = require('fs');
let content = fs.readFileSync('src/app/sessions/[id]/page.tsx', 'utf8');

const searchAssign = `<select
                        className={styles.actionSelect}
                        value={record.assignedUserId ? record.assignedUserId.toString() : ""}
                        onChange={(e) => handleAssignCaller(record.id as number, e.target.value)}
                      >`;

const replaceAssign = `<select
                        className={styles.actionSelect}
                        style={{ flexBasis: '100%' }}
                        value={record.assignedUserId ? record.assignedUserId.toString() : ""}
                        onChange={(e) => handleAssignCaller(record.id as number, e.target.value)}
                      >`;

content = content.replace(searchAssign, replaceAssign);

fs.writeFileSync('src/app/sessions/[id]/page.tsx', content, 'utf8');
