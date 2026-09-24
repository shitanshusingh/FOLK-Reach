const fs = require('fs');
let content = fs.readFileSync('src/app/sessions/[id]/page.tsx', 'utf8');

// Replace assignedUserId GlassSelect
content = content.replace(
  /<GlassSelect\s+value=\{record\.assignedUserId[^>]*\/>/g,
  `<select
                        className={styles.actionSelect}
                        value={record.assignedUserId ? record.assignedUserId.toString() : ""}
                        onChange={(e) => handleAssignCaller(record.id as number, e.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {allUsers?.map(u => (
                          <option key={u.id} value={u.id!.toString()}>{u.name}</option>
                        ))}
                      </select>`
);

// Replace status GlassSelect
content = content.replace(
  /<GlassSelect\s+value=\{record\.status\}[^]*?options=\{\[[^]*?\]\}\s*\/>/,
  `<select
                        className={styles.actionSelect}
                        value={record.status}
                        onChange={async (e) => {
                          const val = e.target.value;
                          const updateData: any = { status: val };
                          if (val === 'ATTENDED' && !record.checkedInAt) {
                            updateData.checkedInAt = new Date();
                            const person = await firestoreAPI.get('people', record.personId as string | number);
                            if (person) {
                              await firestoreAPI.update('people', person.id as number, { priorityScore: (person.priorityScore || 0) + 5 });
                            }
                            await db.interactions.add({
                              personId: record.personId as number,
                              type: 'SESSION',
                              date: new Date(),
                              outcome: \`Attended Session: \${session?.title || session?.name || 'Session'}\`,
                              notes: \`Checked in manually via dropdown at \${format(new Date(), "h:mm a")}\`
                            });
                          }
                          await firestoreAPI.update('sessionAttendance', record.id as number, updateData);
                          setRefreshTrigger(prev => prev + 1);
                        }}
                      >
                        <option value="CONFIRMED">Expected</option>
                        <option value="ATTENDED">Attended</option>
                        <option value="MISSED">Missed</option>
                        <option value="JOINING_NEXT_SESSION">Next Session</option>
                      </select>`
);

fs.writeFileSync('src/app/sessions/[id]/page.tsx', content, 'utf8');
