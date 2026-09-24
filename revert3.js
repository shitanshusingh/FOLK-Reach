const fs = require('fs');
let content = fs.readFileSync('src/app/sessions/[id]/page.tsx', 'utf8');

const strAssign = `<GlassSelect 
                      value={record.assignedUserId ? record.assignedUserId.toString() : ""}
                      onChange={(val) => handleAssignCaller(record.id as number, val)}
                      placeholder="Unassigned"
                      options={allUsers?.map(u => ({ value: u.id!.toString(), label: u.name })) || []}
                    />`;

const repAssign = `<select
                      className={styles.actionSelect}
                      value={record.assignedUserId ? record.assignedUserId.toString() : ""}
                      onChange={(e) => handleAssignCaller(record.id as number, e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {allUsers?.map(u => (
                        <option key={u.id} value={u.id!.toString()}>{u.name}</option>
                      ))}
                    </select>`;

content = content.replace(strAssign, repAssign);

fs.writeFileSync('src/app/sessions/[id]/page.tsx', content, 'utf8');
