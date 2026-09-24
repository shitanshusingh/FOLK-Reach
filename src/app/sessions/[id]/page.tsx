"use client";
// @ts-nocheck
import { useLiveQuery } from "@/lib/firestore";
import { db } from "@/lib/db";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, UserPlus, Phone, CheckCircle, Clock, Edit2, Trash2, QrCode, XCircle } from "lucide-react";
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
  const [attendanceSubTab, setAttendanceSubTab] = useState<'EXPECTED' | 'CHECKED_IN' | 'MISSED'>('EXPECTED');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeCallModal, setActiveCallModal] = useState<number | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [callingSearchQuery, setCallingSearchQuery] = useState("");
  const [showQRModal, setShowQRModal] = useState(false);
  const { currentUser } = useAuth();

  const session = useFirestoreDoc('sessions', id);
  const allUsers = useLiveQuery(async () => {
    if (!currentUser?.id) return [];
    let users = await db.users.toArray();
    
    if (currentUser.role === "SUPER_ADMIN") {
      return users;
    } else if (currentUser.role === "FOLK_GUIDE") {
      let creatorId = session?.ownerId;
      if (!creatorId) {
        const fetchedSession = await db.sessions.get(id);
        creatorId = fetchedSession?.ownerId;
      }
      
      const creator = users.find(u => String(u.id) === String(creatorId));
      
      if (creator && creator.teamId) {
        // If session was created by a specific team member, ONLY show that team
        return users.filter(u => String(u.teamId) === String(creator.teamId));
      }
      
      // Fallback: show all teams
      const allTeams = await db.teams.toArray();
      const myTeams = allTeams.filter(t => String(t.guideId) === String(currentUser.id));
      const myTeamIds = myTeams.map(t => String(t.id));
      return users.filter(u => 
        String(u.guideId) === String(currentUser.id) || 
        (u.teamId && myTeamIds.includes(String(u.teamId))) ||
        String(u.id) === String(currentUser.id)
      );
    } else if (currentUser.role === "FOLK_LEADER" || currentUser.role === "LEADER") {
      if (currentUser.teamId) {
        return users.filter(u => String(u.teamId) === String(currentUser.teamId) || String(u.id) === String(currentUser.id));
      }
    }
    return [currentUser];
  }, [currentUser?.id, currentUser?.role, session?.ownerId]);
  
  const attendanceRecords = useLiveQuery(async () => {
    let records = await db.sessionAttendance.where("sessionId").equals(id).toArray();
    
    // Deduplicate on the fly to fix data corruption
    const uniqueRecords = [];
    const seenPersonIds = new Set();
    const recordsToDelete = [];
    
    records.sort((a, b) => {
      const rank = (status: string) => {
        if (status === 'ATTENDED') return 3;
        if (status === 'CONFIRMED' || status === 'JOINING_NEXT_SESSION' || status === 'MAYBE') return 2;
        return 1;
      };
      return rank(b.status) - rank(a.status);
    });

    for (const r of records) {
      const pid = String(r.personId);
      if (seenPersonIds.has(pid)) {
        recordsToDelete.push(r.id);
      } else {
        seenPersonIds.add(pid);
        uniqueRecords.push(r);
      }
    }
    // We intentionally don't call bulkDelete here because mutating inside useLiveQuery causes infinite loops.
    // The data is deduplicated in memory.
    records = uniqueRecords;

    const joined = await Promise.all(records.map(async record => {
      const person = await db.people.get(record.personId);
      const user = record.assignedUserId ? await db.users.get(String(record.assignedUserId)) : null;
      const owner = person?.ownerId ? await db.users.get(String(person.ownerId)) : null;
      
      // Fetch latest call interaction to recover lost statuses
      const interactions = await db.interactions.where('personId').equals(record.personId).toArray();
      const lastCall = interactions.filter(i => i.type === 'CALL').sort((a,b) => new Date(safeDate(b.date)).getTime() - new Date(safeDate(a.date)).getTime())[0];
      const callsMadeForSession = interactions.filter(i => i.type === 'CALL' && String(i.outcome).includes('Session Call')).length;

      const currentSession = await db.sessions.get(id);
      const currentSessionDate = currentSession?.date ? new Date(safeDate(currentSession.date)) : new Date();

      const allSessionsForPerson = await db.sessionAttendance.where('personId').equals(record.personId).toArray();
      const pastSessionsAttended = allSessionsForPerson.filter(s => {
        if (s.status !== 'ATTENDED') return false;
        
        const otherDate = s.checkedInAt ? new Date(safeDate(s.checkedInAt)) : new Date(0);
        const cutoffDate = record.checkedInAt ? new Date(safeDate(record.checkedInAt)) : currentSessionDate;
        
        return otherDate.getTime() <= cutoffDate.getTime();
      }).length;

      return { 
        ...record, 
        personName: person?.name || "Unknown",
        personPhone: person?.phone || "",
        personPriority: person?.priorityScore || 0,
        personOwnerId: person?.ownerId,
        callerName: user?.name || owner?.name || null,
        ownerName: owner?.name || null,
        lastCallOutcome: lastCall ? lastCall.outcome : null,
        callsMadeForSession,
        pastSessionsAttended
      };
    }));

    const filtered = joined;

    filtered.sort((a, b) => {
      // 1. Current user's assigned/owned contacts bubble to the top
      const aIsMine = a.assignedUserId === currentUser?.id || a.personOwnerId === currentUser?.id;
      const bIsMine = b.assignedUserId === currentUser?.id || b.personOwnerId === currentUser?.id;
      
      if (aIsMine && !bIsMine) return -1;
      if (!aIsMine && bIsMine) return 1;
      
      // 2. Then sort by priority
      return b.personPriority - a.personPriority;
    });

    return filtered;
  }, [id, currentUser?.id, refreshTrigger]);

  const handleStatusChange = async (recordId: number, newStatus: SessionAttendance['status']) => {
    await firestoreAPI.update('sessionAttendance', recordId, { status: newStatus });
    setRefreshTrigger(prev => prev + 1);
  };

  const handleAssignCaller = async (recordId: number, userId: string | number) => {
    await firestoreAPI.update('sessionAttendance', recordId, { assignedUserId: userId });
    setRefreshTrigger(prev => prev + 1);
  };

  const repeatedAudience = attendanceRecords?.filter(r => r.status === 'ATTENDED' && (r.pastSessionsAttended || 0) > 1).length || 0;
  const oldContactsFirstTime = attendanceRecords?.filter(r => r.status === 'ATTENDED' && (r.pastSessionsAttended || 0) === 1 && !r.isNewContact).length || 0;

  if (session === undefined || attendanceRecords === undefined) return <div className={styles.container}>Loading...</div>;
  if (session === null) return <div className={styles.container}>Session not found</div>;

  // Analytics Metrics
  const totalInvited = attendanceRecords.length;
  const callsMade = attendanceRecords.filter(r => r.status !== 'PENDING_CALL' && r.status !== 'INVITED').length;
  const confirmedCount = attendanceRecords.filter(r => r.status === 'CONFIRMED' || r.status === 'JOINING_NEXT_SESSION').length;
  const attendedCount = attendanceRecords.filter(r => r.status === 'ATTENDED').length;
  const newContacts = attendanceRecords.filter(r => r.isNewContact).length;
  const oldContacts = totalInvited - newContacts;
  const followUpCalls = attendanceRecords.filter(r => (r.callCount || 0) > 1).reduce((acc, r) => acc + (r.callCount! - 1), 0);
  


  const downloadCSV = () => {
    const headers = ["Name", "Phone", "Status", "Priority", "Checked In At", "Call Count", "Is Walk-in"];
    const rows = attendanceRecords.map(r => [
      `"${r.personName}"`,
      `"${r.personPhone}"`,
      r.status,
      r.personPriority,
      r.checkedInAt ? format(safeDate(r.checkedInAt), "MMM d yyyy h:mm a") : "N/A",
      r.callCount || 0,
      r.isNewContact ? "Yes" : "No"
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Session_Report_${session?.name || id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const isSessionAdmin = ['SUPER_ADMIN', 'FOLK_GUIDE', 'FOLK_LEADER', 'LEADER'].includes(currentUser?.role || '') || session?.ownerId === currentUser?.id;

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
            {isSessionAdmin && (
              <>
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
                      await db.sessions.delete(id);
                      window.location.href = '/sessions';
                    }
                  }}
                  style={{ background: 'var(--color-danger-light)', border: '1px solid var(--color-danger)', borderRadius: '8px', padding: '8px', color: 'var(--color-danger)', cursor: 'pointer' }}
                  aria-label="Delete Session"
                >
                  <Trash2 size={18} />
                </button>
              </>
            )}
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

          <input
            type="text"
            placeholder="Search campaign by name or phone..."
            value={callingSearchQuery}
            onChange={e => setCallingSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', marginBottom: '16px', background: 'var(--color-surface)', color: 'var(--color-text)' }}
          />

          <div className={styles.callList}>
            {attendanceRecords
              .filter(r => r.personName.toLowerCase().includes(callingSearchQuery.toLowerCase()) || r.personPhone.includes(callingSearchQuery))
              .map(record => (
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
                          {record.actualCallerName && ` by ${record.actualCallerName}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className={styles.callCardActions}>
                  {['FOLK_LEADER', 'LEADER', 'SUPER_ADMIN', 'FOLK_GUIDE'].includes(currentUser?.role || '') ? (
                    <GlassSelect 
                      value={record.assignedUserId ? record.assignedUserId.toString() : ""}
                      onChange={(val) => handleAssignCaller(record.id as number, val)}
                      placeholder="Unassigned"
                      options={allUsers?.map(u => ({ value: u.id!.toString(), label: u.name })) || []}
                    />
                  ) : (
                    <div style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>
                      {record.assignedUserId === currentUser?.id ? 'Me' : allUsers?.find(u => u.id === record.assignedUserId)?.name || 'Unassigned'}
                    </div>
                  )}

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
        <div style={{ animation: 'var(--animate-fade-in)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 className={styles.sectionTitle} style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Campaign & Attendance Summary</h2>
            <button 
              className={styles.btnAction} 
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              onClick={downloadCSV}
            >
              ⬇️ Download Report (CSV)
            </button>
          </div>

          <div className={styles.analyticsGrid}>
            <div className={styles.metricCard} style={{ background: 'var(--gradient-primary)', color: 'white', border: 'none', transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(100, 108, 255, 0.25)' }}>
              <div className={styles.metricLabel} style={{ color: 'rgba(255,255,255,0.8)' }}>Remaining Expected</div>
              <div className={styles.metricValue} style={{ color: 'white' }}>{confirmedCount} <span style={{ fontSize: '0.9rem', fontWeight: 400 }}>people</span></div>
            </div>
            <div className={styles.metricCard} style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(16, 185, 129, 0.25)' }}>
              <div className={styles.metricLabel} style={{ color: 'rgba(255,255,255,0.8)' }}>Total Checked In</div>
              <div className={styles.metricValue} style={{ color: 'white' }}>{attendedCount} <span style={{ fontSize: '0.9rem', fontWeight: 400 }}>people</span></div>
            </div>
          </div>

          <div className={styles.analyticsGrid}>
            <div className={styles.metricCard} style={{ borderLeft: '4px solid var(--color-primary)' }}>
              <div className={styles.metricLabel}>Calls Executed</div>
              <div className={styles.metricValue}>{callsMade} <span style={{ fontSize: '1rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>/ {totalInvited} assigned</span></div>
              <div style={{ marginTop: 8, height: 6, background: 'var(--color-surface-hover)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'var(--color-primary)', width: `${totalInvited > 0 ? Math.round((callsMade/totalInvited)*100) : 0}%`, transition: 'width 1s ease-in-out' }} />
              </div>
            </div>
            <div className={styles.metricCard} style={{ borderLeft: '4px solid var(--color-secondary)' }}>
              <div className={styles.metricLabel}>Follow-up Calls</div>
              <div className={styles.metricValue} style={{ color: 'var(--color-text)' }}>{followUpCalls} <span style={{ fontSize: '1rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>repeats</span></div>
            </div>
          </div>

          <div className={styles.analyticsGrid}>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Repeated Audience</div>
              <div className={styles.metricValue} style={{ color: 'var(--color-primary)' }}>{repeatedAudience} <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>from past sessions</span></div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>New Walk-ins (Not Registered)</div>
              <div className={styles.metricValue} style={{ color: 'var(--color-secondary)' }}>{newContacts} <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>scanned at door</span></div>
            </div>
          </div>
          
          <div style={{ marginTop: '32px' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--color-text)', marginBottom: '16px' }}>Attendance by Assigned Member</h3>
            <div style={{ background: 'var(--color-surface)', borderRadius: '12px', padding: '16px', border: '1px solid var(--color-border)' }}>
              {Array.from(new Set((attendanceRecords || []).map(r => r.callerName))).sort().map(callerName => {
                const ownerRecords = (attendanceRecords || []).filter(r => r.callerName === callerName);
                const attended = ownerRecords.filter(r => r.status === 'ATTENDED').length;
                const expected = ownerRecords.filter(r => r.status === 'CONFIRMED' || r.status === 'JOINING_NEXT_SESSION').length;
                const missed = ownerRecords.filter(r => r.status === 'MISSED').length;
                const total = ownerRecords.length;
                const callsMade = ownerRecords.reduce((sum, r) => sum + (r.callsMadeForSession || 0), 0);
                
                return (
                  <div key={callerName} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>{callerName}</div>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Calls Made</span>
                        <span style={{ color: 'var(--color-warning)', fontWeight: 600, fontSize: '1rem' }}>{callsMade}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Checked In</span>
                        <span style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: '1rem' }}>{attended}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Expected</span>
                        <span style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '1rem' }}>{expected}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Assigned</span>
                        <span style={{ color: 'var(--color-text)', fontWeight: 600, fontSize: '1rem' }}>{total}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div style={{ marginTop: '32px' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--color-text)', marginBottom: '16px' }}>Old Contacts (First Session) ({oldContactsFirstTime})</h3>
            <div style={{ background: 'var(--color-surface)', borderRadius: '12px', padding: '16px', border: '1px solid var(--color-border)' }}>
              {(attendanceRecords || [])
                .filter(r => r.status === 'ATTENDED' && !r.isNewContact && (r.pastSessionsAttended || 0) === 1)
                .map(r => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>{r.personName}</div>
                    <div style={{ color: 'var(--color-success)', fontSize: '0.85rem', fontWeight: 600 }}>First Session</div>
                  </div>
              ))}
              {oldContactsFirstTime === 0 && (
                <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '16px' }}>No old contacts attended for the first time.</div>
              )}
            </div>
          </div>

          <div style={{ marginTop: '32px' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--color-text)', marginBottom: '16px' }}>Repeated Audience ({repeatedAudience})</h3>
            <div style={{ background: 'var(--color-surface)', borderRadius: '12px', padding: '16px', border: '1px solid var(--color-border)' }}>
              {(attendanceRecords || [])
                .filter(r => r.status === 'ATTENDED' && (r.pastSessionsAttended || 0) > 1)
                .sort((a,b) => (b.pastSessionsAttended || 0) - (a.pastSessionsAttended || 0))
                .map(r => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>{r.personName}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Sessions Attended:</span>
                      <span style={{ background: 'var(--color-surface-hover)', padding: '4px 10px', borderRadius: '12px', fontWeight: 600, color: 'var(--color-text)' }}>
                        {r.pastSessionsAttended}
                      </span>
                    </div>
                  </div>
              ))}
              {repeatedAudience === 0 && (
                <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '16px' }}>No repeated audience yet.</div>
              )}
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
          
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
            <button 
              onClick={() => setAttendanceSubTab('EXPECTED')}
              style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: attendanceSubTab === 'EXPECTED' ? 'var(--color-primary)' : 'var(--color-surface)', color: attendanceSubTab === 'EXPECTED' ? 'white' : 'var(--color-text)', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
            >
              Expected ({attendanceRecords.filter(r => r.status === 'CONFIRMED' || r.status === 'MAYBE' || r.status === 'JOINING_NEXT_SESSION').length})
            </button>
            <button 
              onClick={() => setAttendanceSubTab('CHECKED_IN')}
              style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: attendanceSubTab === 'CHECKED_IN' ? 'var(--color-success)' : 'var(--color-surface)', color: attendanceSubTab === 'CHECKED_IN' ? 'white' : 'var(--color-text)', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
            >
              Checked In ({attendanceRecords.filter(r => r.status === 'ATTENDED').length})
            </button>
            <button 
              onClick={() => setAttendanceSubTab('MISSED')}
              style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: attendanceSubTab === 'MISSED' ? 'var(--color-danger)' : 'var(--color-surface)', color: attendanceSubTab === 'MISSED' ? 'white' : 'var(--color-text)', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
            >
              Missed ({attendanceRecords.filter(r => r.status === 'MISSED').length})
            </button>
          </div>

          {attendanceSubTab === 'EXPECTED' && (
            <div style={{ marginBottom: '12px' }}>
              <button 
                onClick={async () => {
                  if (window.confirm("Mark everyone remaining in the Expected list as Missed?")) {
                    const expected = attendanceRecords.filter(r => r.status === 'CONFIRMED' || r.status === 'MAYBE' || r.status === 'JOINING_NEXT_SESSION');
                    for (const r of expected) {
                      await firestoreAPI.update('sessionAttendance', r.id as number, { status: 'MISSED', previousStatus: r.status });
                    }
                    setRefreshTrigger(prev => prev + 1);
                  }
                }}
                style={{ 
                  display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                  width: '100%',
                  padding: '12px 16px', 
                  borderRadius: '12px', 
                  border: '1px solid rgba(239, 68, 68, 0.3)', 
                  background: 'rgba(239, 68, 68, 0.05)', 
                  color: 'var(--color-danger)', 
                  cursor: 'pointer', 
                  fontWeight: 600, 
                  fontSize: '0.9rem' 
                }}
              >
                <XCircle size={18} /> Mark Remaining Missed
              </button>
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
            />
          </div>
          <div className={styles.callList}>
            {attendanceRecords
              .filter(r => {
                if (attendanceSubTab === 'EXPECTED') return r.status === 'CONFIRMED' || r.status === 'MAYBE' || r.status === 'JOINING_NEXT_SESSION';
                if (attendanceSubTab === 'CHECKED_IN') return r.status === 'ATTENDED';
                if (attendanceSubTab === 'MISSED') return r.status === 'MISSED';
                return false;
              })
              .filter(r => r.personName.toLowerCase().includes(searchQuery.toLowerCase()) || r.personPhone.includes(searchQuery))
              .sort((a, b) => {
                if (attendanceSubTab === 'CHECKED_IN') {
                  const timeA = a.checkedInAt ? new Date(safeDate(a.checkedInAt)).getTime() : 0;
                  const timeB = b.checkedInAt ? new Date(safeDate(b.checkedInAt)).getTime() : 0;
                  return timeB - timeA; // Latest first
                }
                // Alphabetical for others
                return a.personName.localeCompare(b.personName);
              })
              .map(record => (
              <div key={record.id} className={styles.callCard}>
                <div className={styles.callCardHeader}>
                  <div className={styles.callerInfo}>
                    <div className={styles.callerName}>
                      {record.personName}
                      {record.isNewContact && (
                        <span style={{ fontSize: '0.7rem', background: 'var(--color-primary)', color: 'white', padding: '2px 6px', borderRadius: '4px', marginLeft: 8, fontWeight: 700, verticalAlign: 'middle' }}>
                          NEW
                        </span>
                      )}
                      {record.callerName ? (
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginLeft: 8, fontWeight: 400 }}>
                          (assigned to {record.callerName})
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-warning)', marginLeft: 8, fontWeight: 400 }}>
                          (Unassigned)
                        </span>
                      )}
                      {attendanceSubTab === 'CHECKED_IN' && record.checkedInAt && (
                        <span style={{ fontSize: '0.85rem', fontWeight: 500, marginLeft: 8, color: 'var(--color-success)' }}>
                          • {format(safeDate(record.checkedInAt), "h:mm a")}
                        </span>
                      )}
                    </div>
                    {attendanceSubTab === 'EXPECTED' && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        Current Status: {record.status === 'CONFIRMED' ? 'Expected (Confirmed)' : record.status === 'JOINING_NEXT_SESSION' ? 'Next Session' : 'Maybe'}
                      </div>
                    )}
                    {(attendanceSubTab === 'MISSED' || attendanceSubTab === 'EXPECTED') && record.callOutcome && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                        <span style={{ fontWeight: 600 }}>Notes:</span> {record.callOutcome}
                      </div>
                    )}
                    {attendanceSubTab === 'MISSED' && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-warning)', marginTop: 4 }}>
                        {record.previousStatus ? (
                          <>Was originally: {record.previousStatus === 'CONFIRMED' ? 'Confirmed' : record.previousStatus === 'JOINING_NEXT_SESSION' ? 'Joining Next Session' : 'Maybe'}</>
                        ) : record.lastCallOutcome ? (
                          <>Last Call: {record.lastCallOutcome}</>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.callCardActions} style={{ display: 'flex', flexWrap: 'nowrap', gap: 12 }}>
                  {attendanceSubTab === 'EXPECTED' ? (
                    <button 
                      onClick={async () => {
                        await firestoreAPI.update('sessionAttendance', record.id as number, { 
                          status: 'ATTENDED',
                          checkedInAt: new Date()
                        });
                        const person = await firestoreAPI.get('people', record.personId as string | number);
                        if (person) {
                          await firestoreAPI.update('people', person.id as number, { priorityScore: (person.priorityScore || 0) + 5 });
                        }
                        await db.interactions.add({
                          personId: record.personId as number,
                          type: 'SESSION',
                          date: new Date(),
                          outcome: `Attended Session: ${session?.title || session?.name || 'Session'}`,
                          notes: `Checked in via Quick Check-In at ${format(new Date(), "h:mm a")}`
                        });
                        setRefreshTrigger(prev => prev + 1);
                      }}
                      style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: 'var(--color-success)', color: 'white', cursor: 'pointer', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}
                    >
                      <CheckCircle size={18} /> Quick Check In
                    </button>
                  ) : (
                    <div style={{ flex: 1 }}>
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
                              outcome: `Attended Session: ${session?.title || session?.name || 'Session'}`,
                              notes: `Checked in manually via dropdown at ${format(new Date(), "h:mm a")}`
                            });
                          }
                          await firestoreAPI.update('sessionAttendance', record.id as number, updateData);
                          setRefreshTrigger(prev => prev + 1);
                        }}
                        options={[
                          { value: "CONFIRMED", label: "Expected" },
                          { value: "ATTENDED", label: "Attended" },
                          { value: "MISSED", label: "Missed" },
                          { value: "JOINING_NEXT_SESSION", label: "Next Session" }
                        ]}
                      />
                    </div>
                  )}
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
          currentUser={currentUser}
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
            const person = await firestoreAPI.get('people', personId as string | number);
            
            // Prevent duplicate records
            const existingRecord = await db.sessionAttendance
              .where({ sessionId: id, personId: personId as number })
              .first() || await db.sessionAttendance.where('sessionId').equals(id).and(r => r.personId === (personId as number)).first();

            if (existingRecord) {
              await firestoreAPI.update('sessionAttendance', existingRecord.id as number, {
                status: 'ATTENDED',
                checkedInAt: new Date()
              });
            } else {
              await db.sessionAttendance.add({
                sessionId: id,
                personId: personId as number,
                status: 'ATTENDED',
                isNewContact: true,
                checkedInAt: new Date(),
                assignedUserId: person?.ownerId || currentUser?.id || null
              });
            }

            if (person) {
              await firestoreAPI.update('people', person.id as number, { priorityScore: (person.priorityScore || 0) + 5 });
            }
            await db.interactions.add({
              personId: personId as number,
              type: 'SESSION',
              date: new Date(),
              outcome: `Attended Session: ${session?.title || session?.name || 'Session'}`,
              notes: `Checked in as a new walk-in at ${format(new Date(), "h:mm a")}`
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

function CallOutcomeModal({ recordId, onClose, onSuccess, currentUser }: { recordId: number, onClose: () => void, onSuccess: () => void, currentUser: any }) {
  const [status, setStatus] = useState<SessionAttendance['status']>('CONFIRMED');
  const [outcomeStr, setOutcomeStr] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number | "">("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const record = await firestoreAPI.get('sessionAttendance', recordId);
    
    await firestoreAPI.update('sessionAttendance', recordId, { 
      status, 
      callOutcome: outcomeStr, 
      calledAt: new Date(),
      callCount: (record?.callCount || 0) + 1,
      actualCallerId: currentUser?.id,
      actualCallerName: currentUser?.name
    });

    if (record) {
      // 1. Create a fully recognized interaction in the main CRM timeline
      await db.interactions.add({
        personId: record.personId,
        type: 'CALL',
        date: new Date(),
        outcome: `Session Call (${status}): ${outcomeStr}`,
        notes: `Logged from Session Call Campaign`,
        ...(typeof durationMinutes === 'number' ? { durationMinutes } : {})
      });

      // 2. Update the contact's last interaction date
      await firestoreAPI.update('people', record.personId, {
        lastInteractionDate: new Date(),
        lastInteractionType: 'SESSION'
      });

      // 3. Mark any pending follow-up calls as completed (since we just called them!)
      const existingTasks = await db.tasks.where('personId').equals(record.personId).toArray();
      for (const t of existingTasks) {
        if (t.status === 'PENDING') {
          await firestoreAPI.update('tasks', t.id as number, { status: 'COMPLETED' });
        }
      }

      // 4. Auto-schedule next step if they promised to join next time
      if (status === 'JOINING_NEXT_SESSION') {
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
      } else if (status === 'RESCHEDULE' as any && rescheduleDate) {
        await db.tasks.add({
          personId: record.personId,
          title: "Rescheduled Session Call",
          type: "CALL",
          status: "PENDING",
          dueDate: new Date(rescheduleDate),
          notes: outcomeStr
        });
      } else if (status === 'DID_NOT_ANSWER' as any || status === 'UNAVAILABLE' as any || status === 'BUSY' as any) {
        // Try again tomorrow
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + 1);
        await db.tasks.add({
          personId: record.personId,
          title: `Follow-up Call (${status})`,
          type: "CALL",
          status: "PENDING",
          dueDate: nextDate,
          notes: outcomeStr
        });
      }
    } // end if(record)
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
      onSuccess();
      onClose();
    }
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
              { value: "DID_NOT_ANSWER", label: "📵 Did Not Answer" },
              { value: "BUSY", label: "🕒 Busy / Call Back Later" },
              { value: "UNAVAILABLE", label: "🚫 Unavailable" },
              { value: "RESCHEDULE", label: "📅 Reschedule Call" }
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

        {status === 'RESCHEDULE' as any && (
          <div className={styles.formGroup}>
            <label className={styles.detailLabel}>Reschedule To</label>
            <input 
              type="datetime-local" 
              className={styles.statusSelect} 
              value={rescheduleDate}
              onChange={e => setRescheduleDate(e.target.value)}
              required
            />
          </div>
        )}

        <div className={styles.formGroup}>
          <label className={styles.detailLabel}>Call Duration (minutes)</label>
          <input 
            type="number" 
            min="0"
            className={styles.statusSelect} 
            value={durationMinutes} 
            onChange={e => setDurationMinutes(e.target.value ? Number(e.target.value) : "")} 
            placeholder="e.g. 5"
          />
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
          <button className={styles.btnAction} style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.btnAction} onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Outcome"}
          </button>
        </div>
      </div>
    </div>
  );
}

function InviteModal({ sessionId, onClose, onSuccess, existingRecords }: any) {
  const [isNewContact, setIsNewContact] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { currentUser } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string>('ALL');

  const teamUsers = useLiveQuery(async () => {
    if (['SUPER_ADMIN', 'FOLK_GUIDE'].includes(currentUser?.role || '')) {
      return await db.users.toArray();
    }
    if (!currentUser?.teamId) return currentUser?.id ? [currentUser] : [];
    return await db.users.where('teamId').equals(currentUser.teamId).toArray();
  }, [currentUser?.teamId, currentUser?.id, currentUser?.role]);

  const allPeople = useLiveQuery(async () => {
    if (!currentUser?.id) return [];
    
    let userIdsToFetch = [currentUser.id];
    
    if (selectedUserId === 'ALL') {
      if (teamUsers && teamUsers.length > 0) {
        userIdsToFetch = teamUsers.map((u: any) => String(u.id));
      }
    } else {
      userIdsToFetch = [selectedUserId];
    }
    
    // Fetch contacts for the selected users
    const allTeamContacts = [];
    for (const uid of userIdsToFetch) {
      const contacts = await db.people.where('ownerId').equals(uid).toArray();
      allTeamContacts.push(...contacts);
    }
    
    return allTeamContacts;
  }, [currentUser?.id, selectedUserId, teamUsers]);
  const existingPersonIds = new Set(existingRecords.map((r: any) => r.personId));
  
  const handleInvite = async (personId: number) => {
    const existing = await db.sessionAttendance.where({ sessionId, personId }).first() || await db.sessionAttendance.where('sessionId').equals(sessionId).and(r => r.personId === personId).first();
    if (existing) {
      alert("This person is already in the campaign!");
      return;
    }

    const p = allPeople?.find(p => p.id === personId);
    await db.sessionAttendance.add({
      sessionId,
      personId,
      status: 'PENDING_CALL',
      isNewContact,
      assignedUserId: p?.ownerId || currentUser?.id || null
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

    // Double check DB to absolutely prevent race condition duplicates
    const currentRecords = await db.sessionAttendance.where('sessionId').equals(sessionId).toArray();
    const currentPersonIds = new Set(currentRecords.map(r => r.personId));
    toAdd = toAdd.filter(p => !currentPersonIds.has(p.id));

    const records = toAdd.map(p => ({
      sessionId,
      personId: p.id as number,
      status: 'PENDING_CALL' as const,
      isNewContact,
      assignedUserId: p.ownerId || currentUser?.id || null
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
        
        <div style={{ marginBottom: 16 }}>
          <input 
            type="text" 
            placeholder="Search by name, phone, college..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
          />
        </div>

        {teamUsers && teamUsers.length > 1 && (
          <div style={{ marginBottom: 16 }}>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
            >
              <option value="ALL">All Team Members</option>
              {teamUsers.map((u: any) => (
                <option key={u.id} value={String(u.id)}>{u.name}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" id="newContactCheck" checked={isNewContact} onChange={e => setIsNewContact(e.target.checked)} />
          <label htmlFor="newContactCheck" className={styles.detailLabel}>Mark as New Contact</label>
        </div>



        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 16, whiteSpace: 'nowrap', WebkitOverflowScrolling: 'touch' }}>
          <button className={styles.badge} style={{ flexShrink: 0, background: 'var(--color-danger-light)', color: 'var(--color-danger)' }} onClick={() => handleBulkInvite('HOT')}>
            + Add All Hot (⭐20+)
          </button>
          <button className={styles.badge} style={{ flexShrink: 0, background: 'var(--color-warning-light)', color: 'var(--color-warning)' }} onClick={() => handleBulkInvite('PRIORITY')}>
            + Add All Priority (⭐10+)
          </button>
          <button className={styles.badge} style={{ flexShrink: 0, background: 'var(--color-primary-light)', color: 'var(--color-primary)' }} onClick={() => handleBulkInvite('WARM')}>
            + Add All Warm (10-19)
          </button>
          <button className={styles.badge} style={{ flexShrink: 0, background: 'var(--glass-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} onClick={() => handleBulkInvite('COLD')}>
            + Add All Cold (1-9)
          </button>
          <button className={styles.badge} style={{ flexShrink: 0, background: 'var(--glass-bg)', color: 'var(--color-text-muted)' }} onClick={() => handleBulkInvite('DORMANT')}>
            + Add All Dormant
          </button>
          <button className={styles.badge} style={{ flexShrink: 0, background: 'var(--color-success-light)', color: 'var(--color-success)' }} onClick={() => handleBulkInvite('ALL')}>
            + Add All Contacts
          </button>
        </div>

        <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {allPeople?.filter(p => !existingPersonIds.has(p.id))
            .filter(p => {
              if (!searchQuery) return true;
              const q = searchQuery.toLowerCase();
              return (p.name?.toLowerCase().includes(q) || 
                      p.phone?.includes(q) || 
                      p.college?.toLowerCase().includes(q) || 
                      p.currentCity?.toLowerCase().includes(q));
            })
            .sort((a,b) => b.priorityScore - a.priorityScore).map(person => (
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

