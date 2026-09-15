"use client";
// @ts-nocheck
import { useLiveQuery } from "@/lib/firestore";
import { db } from "@/lib/db";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, UserPlus, Phone, CheckCircle, Clock } from "lucide-react";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { firestoreAPI, useFirestoreQuery, useFirestoreDoc } from "@/lib/firestore";
import { where } from "firebase/firestore";
import { SessionAttendance, User } from "@/lib/db";;
import styles from "./SessionDetails.module.css";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import clsx from "clsx";

export default function SessionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = React.use(params);
  const id = Number(unwrappedParams.id);

  const [activeTab, setActiveTab] = useState<'CALLING' | 'ATTENDANCE' | 'ANALYTICS'>('CALLING');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [activeCallModal, setActiveCallModal] = useState<number | null>(null);
  const { currentUser } = useAuth();

  const session = useFirestoreDoc('sessions', Number(id));
  const allUsers = useLiveQuery(() => db.users.toArray(), []);
  
  const attendanceRecords = useLiveQuery(async () => {
    const records = await db.sessionAttendance.where("sessionId").equals(id).toArray();
    const joined = await Promise.all(records.map(async record => {
      const person = await db.people.get(record.personId);
      const user = record.assignedUserId ? await db.users.get(record.assignedUserId) : null;
      return { 
        ...record, 
        personName: person?.name || "Unknown",
        personPhone: person?.phone || "",
        personPriority: person?.priorityScore || 0,
        callerName: user?.name || "Unassigned"
      };
    }));

    joined.sort((a, b) => {
      // 1. Current user's assigned contacts bubble to the top
      if (a.assignedUserId === currentUser?.id && b.assignedUserId !== currentUser?.id) return -1;
      if (a.assignedUserId !== currentUser?.id && b.assignedUserId === currentUser?.id) return 1;
      
      // 2. Then sort by priority
      return b.personPriority - a.personPriority;
    });

    return joined;
  }, [id, currentUser?.id]);

  const handleStatusChange = async (recordId: number, newStatus: SessionAttendance['status']) => {
    await firestoreAPI.update('sessionAttendance', recordId, { status: newStatus });
  };

  const handleAssignCaller = async (recordId: number, userId: number) => {
    await firestoreAPI.update('sessionAttendance', recordId, { assignedUserId: userId });
  };

  if (session === undefined || attendanceRecords === undefined) return <div className={styles.container}>Loading...</div>;
  if (session === null) return <div className={styles.container}>Session not found</div>;

  // Analytics Metrics
  const totalInvited = attendanceRecords.length;
  const callsMade = attendanceRecords.filter(r => r.status !== 'PENDING_CALL' && r.status !== 'INVITED').length;
  const confirmedCount = attendanceRecords.filter(r => r.status === 'CONFIRMED' || r.status === 'ATTENDED').length;
  const newContacts = attendanceRecords.filter(r => r.isNewContact).length;
  const oldContacts = totalInvited - newContacts;

  return (
    <div className={styles.container}>
      <Link href="/sessions" className={styles.backBtn}>
        <ArrowLeft size={20} /> Back to Sessions
      </Link>

      <div className={styles.sessionCard}>
        <div className={styles.typeBadge}>{session.type}</div>
        <h1 className={styles.title}>{session.name}</h1>
        
        <div className={styles.detailsGrid}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Date & Time</span>
            <span className={styles.detailValue}>
              {format(new Date(session.date), "MMM d, yyyy h:mm a")}
            </span>
          </div>
          {session.location && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Location</span>
              <span className={styles.detailValue}>{session.location}</span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.tabs}>
        <div 
          className={clsx(styles.tab, activeTab === 'CALLING' && styles.tabActive)} 
          onClick={() => setActiveTab('CALLING')}
        >
          Telecalling Sheet
        </div>
        <div 
          className={clsx(styles.tab, activeTab === 'ANALYTICS' && styles.tabActive)} 
          onClick={() => setActiveTab('ANALYTICS')}
        >
          Session Analytics
        </div>
        <div 
          className={clsx(styles.tab, activeTab === 'ATTENDANCE' && styles.tabActive)} 
          onClick={() => setActiveTab('ATTENDANCE')}
        >
          Attendance List
        </div>
      </div>

      {/* CALLING SHEET TAB */}
      {activeTab === 'CALLING' && (
        <div>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Calling Campaign</h2>
            <button className={styles.btnAction} onClick={() => setShowInviteModal(true)}>
              <UserPlus size={18} /> Add to Campaign
            </button>
          </div>

          <div className={styles.callList}>
            {attendanceRecords.map(record => (
              <div key={record.id} className={styles.callCard}>
                <div className={styles.callCardHeader}>
                  <div className={styles.callerInfo}>
                    <div className={styles.callerName}>
                      <Link href={`/people/${record.personId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        {record.personName}
                      </Link>
                      {record.personPriority > 0 && (
                        <span className={styles.callerPriority}>⭐ {record.personPriority}</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {record.isNewContact ? '🆕 New Contact' : '🔄 Old Contact'}
                      {record.calledAt && (
                        <span style={{ marginLeft: 8, color: 'var(--color-success)' }}>
                          ✅ Called at {format(new Date(record.calledAt), 'h:mm a')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className={styles.callCardActions}>
                  <GlassSelect 
                    value={record.assignedUserId?.toString() || ""}
                    onChange={(val) => handleAssignCaller(record.id as number, Number(val))}
                    placeholder="Unassigned"
                    options={allUsers?.map(u => ({ value: u.id!.toString(), label: u.name })) || []}
                  />

                  <GlassSelect 
                    value={record.status}
                    onChange={(val) => handleStatusChange(record.id as number, val as any)}
                    options={[
                      { value: "PENDING_CALL", label: "Pending Call" },
                      { value: "CONFIRMED", label: "Confirmed" },
                      { value: "MAYBE", label: "Maybe" },
                      { value: "DECLINED", label: "Declined" },
                      { value: "DID_NOT_ANSWER", label: "Did Not Answer" }
                    ]}
                  />
                  
                  <button 
                    className={styles.logBtn}
                    onClick={() => setActiveCallModal(record.id as number)}
                  >
                    Log Outcome
                  </button>

                  <a 
                    href={`tel:${record.personPhone}`}
                    className={styles.callActionBtn}
                    onClick={() => setActiveCallModal(record.id as number)}
                  >
                    <Phone size={18} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === 'ANALYTICS' && (
        <div>
          <h2 className={styles.sectionTitle} style={{ marginBottom: 16 }}>Campaign Metrics</h2>
          <div className={styles.analyticsGrid}>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Total Assigned for Call</div>
              <div className={styles.metricValue}>{totalInvited}</div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Calls Executed</div>
              <div className={styles.metricValue}>{callsMade}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                {totalInvited > 0 ? Math.round((callsMade/totalInvited)*100) : 0}% completion
              </div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Confirmed Attendees</div>
              <div className={styles.metricValue} style={{ color: 'var(--color-success)' }}>{confirmedCount}</div>
            </div>
          </div>

          <div className={styles.analyticsGrid}>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>New Contacts (This Session)</div>
              <div className={styles.metricValue} style={{ color: 'var(--color-secondary)' }}>{newContacts}</div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Old Contacts (Follow-ups)</div>
              <div className={styles.metricValue}>{oldContacts}</div>
            </div>
          </div>
        </div>
      )}

      {/* ATTENDANCE TAB */}
      {activeTab === 'ATTENDANCE' && (
        <div>
          <h2 className={styles.sectionTitle} style={{ marginBottom: 16 }}>Mark Attendance</h2>
          <div className={styles.callList}>
            {attendanceRecords.filter(r => r.status === 'CONFIRMED' || r.status === 'MAYBE' || r.status === 'ATTENDED' || r.status === 'MISSED').map(record => (
              <div key={record.id} className={styles.callCard}>
                <div className={styles.callCardHeader}>
                  <div className={styles.callerInfo}>
                    <div className={styles.callerName}>
                      {record.personName}
                      <span style={{ fontSize: '0.85rem', fontWeight: 400, marginLeft: 8 }}>
                        ({record.status === 'CONFIRMED' ? '✅ Confirmed' : '⚠️ Maybe'})
                      </span>
                    </div>
                  </div>
                </div>
                <div className={styles.callCardActions}>
                  <GlassSelect 
                    value={record.status}
                    onChange={(val) => handleStatusChange(record.id as number, val as any)}
                    options={[
                      { value: "CONFIRMED", label: "Expected" },
                      { value: "ATTENDED", label: "Attended" },
                      { value: "MISSED", label: "Missed" }
                    ]}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CALL OUTCOME MODAL */}
      {activeCallModal && (
        <CallOutcomeModal 
          recordId={activeCallModal} 
          onClose={() => setActiveCallModal(null)} 
        />
      )}

      {/* ADD TO CAMPAIGN MODAL */}
      {showInviteModal && (
        <InviteModal 
          sessionId={id} 
          onClose={() => setShowInviteModal(false)} 
          existingRecords={attendanceRecords}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------
// Modals
// ----------------------------------------------------

function CallOutcomeModal({ recordId, onClose }: { recordId: number, onClose: () => void }) {
  const [status, setStatus] = useState<SessionAttendance['status']>('CONFIRMED');
  const [outcomeStr, setOutcomeStr] = useState("");

  const handleSave = async () => {
    await firestoreAPI.update('sessionAttendance', recordId, { 
      status, 
      callOutcome: outcomeStr, 
      calledAt: new Date() 
    });
    onClose();
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2 className={styles.sectionTitle} style={{ marginBottom: 16 }}>Log Call Outcome</h2>
        
        <div className={styles.formGroup}>
          <label className={styles.detailLabel}>Result</label>
          <GlassSelect 
            value={status} 
            onChange={val => setStatus(val as any)}
            options={[
              { value: "CONFIRMED", label: "Will Come (Confirmed)" },
              { value: "MAYBE", label: "Maybe / Not Sure" },
              { value: "DECLINED", label: "Declined / Not Interested" },
              { value: "DID_NOT_ANSWER", label: "Did Not Answer / Busy" }
            ]}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.detailLabel}>Notes (Optional)</label>
          <input 
            type="text" 
            className={styles.statusSelect} 
            value={outcomeStr} 
            onChange={e => setOutcomeStr(e.target.value)} 
            placeholder="e.g. He is bringing 2 friends..."
          />
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
          <button className={styles.btnAction} style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.btnAction} onClick={handleSave}>
            Save Outcome
          </button>
        </div>
      </div>
    </div>
  );
}

function InviteModal({ sessionId, onClose, existingRecords }: any) {
  const allPeople = useLiveQuery(() => db.people.orderBy('name').toArray());
  const existingPersonIds = new Set(existingRecords.map((r: any) => r.personId));
  const [isNewContact, setIsNewContact] = useState(false);
  
  const handleInvite = async (personId: number) => {
    await db.sessionAttendance.add({
      sessionId,
      personId,
      status: 'PENDING_CALL',
      isNewContact
    });
  };

  const handleBulkInvite = async (type: 'HOT' | 'PRIORITY' | 'WARM' | 'COLD' | 'DORMANT' | 'ALL') => {
    let toAdd = allPeople?.filter(p => !existingPersonIds.has(p.id)) || [];
    if (type === 'HOT') toAdd = toAdd.filter(p => p.priorityScore >= 20);
    else if (type === 'PRIORITY') toAdd = toAdd.filter(p => p.priorityScore >= 10);
    else if (type === 'WARM') toAdd = toAdd.filter(p => p.priorityScore >= 10 && p.priorityScore < 20);
    else if (type === 'COLD') toAdd = toAdd.filter(p => p.priorityScore > 0 && p.priorityScore < 10);
    else if (type === 'DORMANT') toAdd = toAdd.filter(p => p.priorityScore <= 0);

    const records = toAdd.map(p => ({
      sessionId,
      personId: p.id as number,
      status: 'PENDING_CALL' as const,
      isNewContact
    }));

    if (records.length > 0) {
      await db.sessionAttendance.bulkAdd(records);
    } else {
      alert(`No ${type} contacts available to add.`);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} style={{ maxWidth: 600 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 className={styles.sectionTitle}>Add to Calling Campaign</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--color-text)' }}>✕</button>
        </div>
        
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" id="newContactCheck" checked={isNewContact} onChange={e => setIsNewContact(e.target.checked)} />
          <label htmlFor="newContactCheck" className={styles.detailLabel}>Mark as New Contact</label>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <button className={styles.badge} style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }} onClick={() => handleBulkInvite('HOT')}>
            + Add All Hot (⭐20+)
          </button>
          <button className={styles.badge} style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }} onClick={() => handleBulkInvite('PRIORITY')}>
            + Add All Priority (⭐10+)
          </button>
          <button className={styles.badge} style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }} onClick={() => handleBulkInvite('WARM')}>
            + Add All Warm (10-19)
          </button>
          <button className={styles.badge} style={{ background: 'var(--glass-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} onClick={() => handleBulkInvite('COLD')}>
            + Add All Cold (1-9)
          </button>
          <button className={styles.badge} style={{ background: 'var(--glass-bg)', color: 'var(--color-text-muted)' }} onClick={() => handleBulkInvite('DORMANT')}>
            + Add All Dormant
          </button>
          <button className={styles.badge} style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }} onClick={() => handleBulkInvite('ALL')}>
            + Add All Contacts
          </button>
        </div>

        <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {allPeople?.filter(p => !existingPersonIds.has(p.id)).sort((a,b) => b.priorityScore - a.priorityScore).map(person => (
            <div key={person.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, border: '1px solid var(--color-border)', borderRadius: 8 }}>
              <div>
                <span style={{ fontWeight: 600 }}>{person.name}</span>
                {person.priorityScore > 0 && <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--color-warning)' }}>⭐ {person.priorityScore}</span>}
              </div>
              <button 
                onClick={() => handleInvite(person.id as number)}
                className={styles.btnAction}
                style={{ padding: '6px 12px' }}
              >
                Add
              </button>
            </div>
          ))}
          {allPeople && allPeople.filter(p => !existingPersonIds.has(p.id)).length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 20 }}>Everyone is already in the campaign!</p>
          )}
        </div>
      </div>
    </div>
  );
}
