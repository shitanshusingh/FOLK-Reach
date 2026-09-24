const fs = require('fs');
let content = fs.readFileSync('src/app/sessions/[id]/page.tsx', 'utf8');

const searchAssign = `                  {['FOLK_LEADER', 'LEADER', 'SUPER_ADMIN', 'FOLK_GUIDE'].includes(currentUser?.role || '') ? (
                    <GlassSelect 
                      value={record.assignedUserId ? record.assignedUserId.toString() : ""}
                      onChange={(val) => handleAssignCaller(record.id as number, val)}
                      placeholder="Unassigned"
                      options={allUsers?.map(u => ({ value: u.id!.toString(), label: u.name })) || []}
                    />
                  ) : (`;

const replaceAssign = `                  {['FOLK_LEADER', 'LEADER', 'SUPER_ADMIN', 'FOLK_GUIDE'].includes(currentUser?.role || '') ? (
                    <select
                      className={styles.actionSelect}
                      value={record.assignedUserId ? record.assignedUserId.toString() : ""}
                      onChange={(e) => handleAssignCaller(record.id as number, e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {allUsers?.map(u => (
                        <option key={u.id} value={u.id!.toString()}>{u.name}</option>
                      ))}
                    </select>
                  ) : (`;

content = content.replace(searchAssign, replaceAssign);

const searchStatus = `                  <div style={{ flex: 1 }}>
                    <GlassSelect 
                      value={record.status}
                      onChange={async (val) => {
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
                            notes: \`Checked in via Quick Check-In at \${format(new Date(), "h:mm a")}\`
                          });
                        }
                        handleStatusChange(record.id as number, val as any);
                      }}
                      options={[
                        { value: "CONFIRMED", label: "Expected" },
                        { value: "ATTENDED", label: "Attended" },
                        { value: "MISSED", label: "Missed" },
                        { value: "JOINING_NEXT_SESSION", label: "Next Session" }
                      ]}
                    />
                  </div>`;

const replaceStatus = `                  <div style={{ flex: 1 }}>
                    <select
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
                            notes: \`Checked in via Quick Check-In at \${format(new Date(), "h:mm a")}\`
                          });
                        }
                        handleStatusChange(record.id as number, val as any);
                      }}
                    >
                      <option value="CONFIRMED">Expected</option>
                      <option value="ATTENDED">Attended</option>
                      <option value="MISSED">Missed</option>
                      <option value="JOINING_NEXT_SESSION">Next Session</option>
                    </select>
                  </div>`;

content = content.replace(searchStatus, replaceStatus);

fs.writeFileSync('src/app/sessions/[id]/page.tsx', content, 'utf8');
