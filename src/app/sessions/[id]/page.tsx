"use client";
// @ts-nocheck
import { useLiveQuery } from "@/lib/firestore";
import { db } from "@/lib/db";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, UserPlus, Phone, CheckCircle, Clock, Edit2, Trash2, QrCode } from "lucide-react";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { firestoreAPI, useFirestoreQuery, useFirestoreDoc } from "@/lib/firestore";
import { where } from "firebase/firestore";
import { SessionAttendance, User } from "@/lib/db";;
import styles from "./SessionDetails.module.css";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import clsx from "clsx";
import { QuickAddContact } from "@/components/people/QuickAddContact";
import { QRCodeSVG } from 'qrcode.react';

const safeDate = (d: any) => {
  if (!d) return new Date();
  if (typeof d.toDate === 'function') return d.toDate();
  return new Date(d);
};

export default function SessionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = React.use(params);
  const id = String(unwrappedParams.id);

  const [activeTab, setActiveTab] = useState<'CALLING' | 'ATTENDANCE' | 'ANALYTICS'>('CALLING');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeCallModal, setActiveCallModal] = useState<number | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showQRModal, setShowQRModal] = useState(false);
  const { currentUser } = useAuth();

  const session = useFirestoreDoc('sessions', id);
  const allUsers = useLiveQuery(async () => {
    if (!currentUser?.id) return [];
    if (currentUser.teamId) {
      return await db.users.where('teamId').equals(currentUser.teamId).toArray();
    }
    return [currentUser];
  }, [currentUser?.id, currentUser?.teamId]);
  
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
        personOwnerId: person?.ownerId,
        callerName: user?.name || "Unassigned"
      };
    }));

    let teamUserIds = new Set([currentUser?.id]);
    if (currentUser?.teamId) {
      const teamUsers = await db.users.where('teamId').equals(currentUser.teamId).toArray();
      teamUserIds = new Set(teamUsers.map((u: any) => u.id));
    }

    const filtered = joined.filter(r => teamUserIds.has(r.personOwnerId));

    filtered.sort((a, b) => {
      // 1. Current user's assigned contacts bubble to the top
      if (a.assignedUserId === currentUser?.id && b.assignedUserId !== currentUser?.id) return -1;
      if (a.assignedUserId !== currentUser?.id && b.assignedUserId === currentUser?.id) return 1;
      
      // 2. Then sort by priority
      return b.personPriority - a.personPriority;
    });

    return filtered;
  }, [id, currentUser?.id, refreshTrigger]);

  const handleStatusChange = async (recordId: number, newStatus: SessionAttendance['status']) => {
    await firestoreAPI.update('sessionAttendance', recordId, { status: newStatus });
    setRefreshTrigger(prev => prev + 1);
  };

  const handleAssignCaller = async (recordId: number, userId: number) => {
    await firestoreAPI.update('sessionAttendance', recordId, { assignedUserId: userId });
    setRefreshTrigger(prev => prev + 1);
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className={styles.typeBadge}>{session.type}</div>
            <h1 className={styles.title}>{session.name}</h1>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button 
              onClick={() => setShowQRModal(true)}
              style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '8px', color: 'var(--color-text)', cursor: 'pointer' }}
              aria-label="Show QR Code"
            >
              <QrCode size={18} />
            </button>
            <button 
              onClick={() => setShowEditModal(true)}
              style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '8px', color: 'var(--color-text)', cursor: 'pointer' }}
              aria-label="Edit Session"
            >
              <Edit2 size={18} />
            </button>
            <button 
              onClick={async () => {
                if (window.confirm("Are you sure you want to delete this session? This action cannot be undone.")) {
                  await firestoreAPI.delete('sessions', id);
                  window.location.href = '/sessions';
                }
              }}
              style={{ background: 'var(--color-danger-light)', border: '1px solid var(--color-danger)', borderRadius: '8px', padding: '8px', color: 'var(--color-danger)', cursor: 'pointer' }}
              aria-label="Delete Session"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
        
        <div className={styles.detailsGrid}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Date & Time</span>
            <span className={styles.detailValue}>
              {format(safeDate(session.date), "MMM d, yyyy h:mm a")}
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
                          ✅ Called at {format(safeDate(record.calledAt), 'h:mm a')}
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

                  <div 
                    onClick={() => setActiveCallModal(record.id as number)}
                    style={{ padding: '6px 12px', borderRadius: '4px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'center', flex: 1, fontWeight: 500 }}
                  >
                    {record.status === 'PENDING_CALL' && '⏳ Pending'}
                    {record.status === 'CONFIRMED' && '✅ Confirmed'}
                    {record.status === 'MAYBE' && '🤔 Maybe'}
                    {record.status === 'NOT_COMING' && '❌ Not Coming'}
                    {record.status === 'JOINING_NEXT_SESSION' && '⏭️ Next Session'}
                    {record.status === 'DECLINED' && '🛑 Declined'}
                    {record.status === 'DID_NOT_ANSWER' && '📵 No Answer'}
                    {record.status === 'ATTENDED' && '✅ Attended'}
                    {record.status === 'MISSED' && '❌ Missed'}
                  </div>
                  
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 className={styles.sectionTitle} style={{ margin: 0 }}>Mark Attendance</h2>
            <button className={styles.btnAction} onClick={() => setShowWalkInModal(true)}>
              <UserPlus size={18} /> Add Walk-in
            </button>
          </div>
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', marginBottom: '16px', background: 'var(--color-surface)', color: 'var(--color-text)' }}
          />
          <div className={styles.callList}>
            {attendanceRecords
              .filter(r => r.status === 'CONFIRMED' || r.status === 'MAYBE' || r.status === 'ATTENDED' || r.status === 'MISSED' || r.status === 'JOINING_NEXT_SESSION')
              .filter(r => r.personName.toLowerCase().includes(searchQuery.toLowerCase()) || r.personPhone.includes(searchQuery))
              .map(record => (
              <div key={record.id} className={styles.callCard}>
                <div className={styles.callCardHeader}>
                  <div className={styles.callerInfo}>
                    <div className={styles.callerName}>
                      {record.personName}
                      <span style={{ fontSize: '0.85rem', fontWeight: 400, marginLeft: 8 }}>
                        ({record.status === 'CONFIRMED' ? '✅ Confirmed' : record.status === 'JOINING_NEXT_SESSION' ? '⏭️ Next Session' : '⚠️ Maybe'})
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
                      { value: "MISSED", label: "Missed" },
                      { value: "JOINING_NEXT_SESSION", label: "Next Session" }
                    ]}
                  />
                  <a href={`tel:${record.personPhone}`} className={styles.callActionBtn} aria-label="Call">
                    <Phone size={18} />
                  </a>
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
          onSuccess={() => setRefreshTrigger(prev => prev + 1)}
        />
      )}

      {/* ADD TO CAMPAIGN MODAL */}
      {showInviteModal && (
        <InviteModal 
          sessionId={id} 
          onClose={() => setShowInviteModal(false)} 
          onSuccess={() => setRefreshTrigger(prev => prev + 1)}
          existingRecords={attendanceRecords}
        />
      )}

      {showWalkInModal && (
        <QuickAddContact 
          onClose={() => setShowWalkInModal(false)}
          onSuccess={async (personId) => {
            await db.sessionAttendance.add({
              sessionId: id,
              personId: personId as number,
              status: 'ATTENDED',
              isNewContact: true
            });
            setRefreshTrigger(prev => prev + 1);
            setShowWalkInModal(false);
          }}
        />
      )}

      {showEditModal && (
        <EditSessionModal 
          session={session}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setRefreshTrigger(prev => prev + 1);
            setShowEditModal(false);
          }}
        />
      )}

      {showQRModal && (
        <div className={styles.modalOverlay} onClick={() => setShowQRModal(false)}>
          <div className={styles.modalContent} style={{ maxWidth: 400, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 className={styles.sectionTitle}>Session QR Code</h2>
              <button onClick={() => setShowQRModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--color-text)' }}>✕</button>
            </div>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 24, fontSize: '0.9rem' }}>Guests can scan this code to check in and register.</p>
            <div style={{ display: 'inline-flex', justifyContent: 'center', background: 'white', padding: 24, borderRadius: 16, marginBottom: 24 }}>
              <QRCodeSVG value={`${window.location.origin}/public/sessions/${id}/check-in`} size={200} />
            </div>
            <button className={styles.btnAction} style={{ width: '100%' }} onClick={() => window.open(`/public/sessions/${id}/check-in`, '_blank')}>
              Open Registration Page
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// Modals
// ----------------------------------------------------

function EditSessionModal({ session, onClose, onSuccess }: { session: any, onClose: () => void, onSuccess: () => void }) {
  const [name, setName] = useState(session.name || "");
  const [type, setType] = useState(session.type || "Weekly Session");
  
  // Format date correctly for datetime-local input
  const initialDate = session.date ? new Date(session.date.toDate ? session.date.toDate() : session.date) : new Date();
  const offset = initialDate.getTimezoneOffset() * 60000;
  const localISOTime = (new Date(initialDate.getTime() - offset)).toISOString().slice(0,16);
  
  const [date, setDate] = useState(localISOTime);
  const [location, setLocation] = useState(session.location || "");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !date) return;
    
    await firestoreAPI.update('sessions', session.id, {
      name,
      type,
      date: new Date(date),
      location
    });
    
    onSuccess();
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 className={styles.sectionTitle}>Edit Session</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--color-text)' }}>✕</button>
        </div>
        <form onSubmit={handleSave}>
          <div className={styles.formGroup}>
            <label className={styles.detailLabel}>Session Name *</label>
            <input 
              type="text" 
              className={styles.statusSelect} 
              required 
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.detailLabel}>Type</label>
            <GlassSelect 
              value={type} 
              onChange={val => setType(val)}
              options={[
                { value: "Weekly Session", label: "Weekly Session" },
                { value: "Special Session", label: "Special Session" },
                { value: "College Session", label: "College Session" },
                { value: "Other", label: "Other" }
              ]}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.detailLabel}>Date & Time *</label>
            <input 
              type="datetime-local" 
              className={styles.statusSelect} 
              required 
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.detailLabel}>Location</label>
            <input 
              type="text" 
              className={styles.statusSelect} 
              value={location}
              onChange={e => setLocation(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
            <button type="button" className={styles.btnAction} style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.btnAction}>Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CallOutcomeModal({ recordId, onClose, onSuccess }: { recordId: number, onClose: () => void, onSuccess: () => void }) {
  const [status, setStatus] = useState<SessionAttendance['status']>('CONFIRMED');
  const [outcomeStr, setOutcomeStr] = useState("");

  const handleSave = async () => {
    const record = await firestoreAPI.get('sessionAttendance', recordId);
    
    await firestoreAPI.update('sessionAttendance', recordId, { 
      status, 
      callOutcome: outcomeStr, 
      calledAt: new Date() 
    });

    if (status === 'JOINING_NEXT_SESSION' && record) {
      // Auto-schedule a task for them for 5 days from now
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 5);
      await db.tasks.add({
        personId: record.personId,
        title: "Follow-up: Promised to join next session",
        type: "CALL",
        status: "PENDING",
        dueDate: nextDate,
        notes: outcomeStr
      });
    }

    onSuccess();
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
              { value: "CONFIRMED", label: "✅ Will Come (Confirmed)" },
              { value: "MAYBE", label: "🤔 Maybe / Not Sure" },
              { value: "JOINING_NEXT_SESSION", label: "⏭️ Will join for next session" },
              { value: "NOT_COMING", label: "❌ Not Coming (This time)" },
              { value: "DECLINED", label: "🛑 Declined / Not Interested" },
              { value: "DID_NOT_ANSWER", label: "📵 Did Not Answer / Busy" }
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

function InviteModal({ sessionId, onClose, onSuccess, existingRecords }: any) {
  const { currentUser } = useAuth();
  const allPeople = useLiveQuery(async () => {
    if (!currentUser?.id) return [];
    
    let teamUserIds = [currentUser.id];
    if (currentUser.teamId) {
      const teamUsers = await db.users.where('teamId').equals(currentUser.teamId).toArray();
      teamUserIds = teamUsers.map((u: any) => u.id);
    }
    
    // Fetch contacts for all team members
    const allTeamContacts = [];
    for (const uid of teamUserIds) {
      const contacts = await db.people.where('ownerId').equals(uid).toArray();
      allTeamContacts.push(...contacts);
    }
    
    return allTeamContacts;
  }, [currentUser?.id, currentUser?.teamId]);
  const existingPersonIds = new Set(existingRecords.map((r: any) => r.personId));
  const [isNewContact, setIsNewContact] = useState(false);
  
  const handleInvite = async (personId: number) => {
    await db.sessionAttendance.add({
      sessionId,
      personId,
      status: 'PENDING_CALL',
      isNewContact
    });
    onSuccess();
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
      onSuccess();
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

