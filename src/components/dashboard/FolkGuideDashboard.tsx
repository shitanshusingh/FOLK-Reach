"use client";

import { useState } from "react";
import { useLiveQuery } from "@/lib/firestore";
import { db } from "@/lib/db";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, isWithinInterval, startOfDay, endOfDay, subDays } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./FolkGuideDashboard.module.css";
import { Users, Phone, Calendar as CalendarIcon, TrendingUp, Download, PhoneCall, X } from "lucide-react";

type DateFilter = 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'LAST_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'ALL_TIME' | 'CUSTOM';

export function FolkGuideDashboard() {
  const { currentUser } = useAuth();
  
  const [dateFilter, setDateFilter] = useState<DateFilter>('THIS_WEEK');
  const [customStartDate, setCustomStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [teamFilter, setTeamFilter] = useState<string>('ALL');
  const [peopleFilter, setPeopleFilter] = useState<string>('ALL');
  const [drilldownUserId, setDrilldownUserId] = useState<string | null>(null);

  const metrics = useLiveQuery(async () => {
    if (!currentUser) return null;
    
    // Get all users under this Folk Guide (or all if SUPER_ADMIN).
    let allUsers = await db.users.toArray();
    let myUsers = allUsers.filter(u => u.role !== 'SUPER_ADMIN' && u.role !== 'FOLK_GUIDE');
    
    if (teamFilter !== 'ALL') {
      myUsers = myUsers.filter(u => String(u.teamId) === teamFilter);
    }
    if (peopleFilter !== 'ALL') {
      myUsers = myUsers.filter(u => String(u.id) === peopleFilter);
    }
    
    const myUserIds = myUsers.map(u => String(u.id));
    
    // Get all teams for filter
    const allTeams = await db.teams.toArray();
    
    // Get all people assigned to these users
    const allPeople = await db.people.toArray();
    const myPeople = allPeople.filter(p => p.ownerId && myUserIds.includes(String(p.ownerId)));
    
    // Get all interactions
    const allInteractions = await db.interactions.toArray();
    const myInteractions = allInteractions.filter(i => {
      const person = myPeople.find(p => String(p.id) === String(i.personId));
      return !!person;
    });

    // Date Logic
    const now = new Date();
    let startD = new Date(0);
    let endD = new Date(9999, 11, 31);
    
    let prevStartD = new Date(0);
    let prevEndD = new Date(0);

    if (dateFilter === 'TODAY') {
      startD = startOfDay(now);
      endD = endOfDay(now);
      prevStartD = startOfDay(subDays(now, 1));
      prevEndD = endOfDay(subDays(now, 1));
    } else if (dateFilter === 'YESTERDAY') {
      startD = startOfDay(subDays(now, 1));
      endD = endOfDay(subDays(now, 1));
      prevStartD = startOfDay(subDays(now, 2));
      prevEndD = endOfDay(subDays(now, 2));
    } else if (dateFilter === 'THIS_WEEK') {
      startD = startOfWeek(now, { weekStartsOn: 1 });
      endD = endOfWeek(now, { weekStartsOn: 1 });
      prevStartD = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      prevEndD = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    } else if (dateFilter === 'LAST_WEEK') {
      startD = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      endD = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      prevStartD = startOfWeek(subWeeks(now, 2), { weekStartsOn: 1 });
      prevEndD = endOfWeek(subWeeks(now, 2), { weekStartsOn: 1 });
    } else if (dateFilter === 'THIS_MONTH') {
      startD = startOfMonth(now);
      endD = endOfMonth(now);
      prevStartD = startOfMonth(subMonths(now, 1));
      prevEndD = endOfMonth(subMonths(now, 1));
    } else if (dateFilter === 'LAST_MONTH') {
      startD = startOfMonth(subMonths(now, 1));
      endD = endOfMonth(subMonths(now, 1));
      prevStartD = startOfMonth(subMonths(now, 2));
      prevEndD = endOfMonth(subMonths(now, 2));
    } else if (dateFilter === 'CUSTOM') {
      startD = startOfDay(new Date(customStartDate));
      endD = endOfDay(new Date(customEndDate));
      const diffTime = Math.abs(endD.getTime() - startD.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      prevStartD = startOfDay(subDays(startD, diffDays));
      prevEndD = endOfDay(subDays(endD, diffDays));
    }

    const isCurrentDate = (d: string | Date | undefined | null) => d && isWithinInterval(new Date(d), { start: startD, end: endD });
    const isPrevDate = (d: string | Date | undefined | null) => d && isWithinInterval(new Date(d), { start: prevStartD, end: prevEndD });
    
    const contactsPeriod = myPeople.filter(p => isCurrentDate(p.firstContactDate)).length;
    const callsPeriod = myInteractions.filter(i => i.type === 'CALL' && isCurrentDate(i.date)).length;
    const meetingsPeriod = myInteractions.filter(i => (i.type === 'MEETING' || i.type === 'PRASADAM' || i.type === 'BOOK') && isCurrentDate(i.date)).length;
    
    // Performance by User
    const userPerformance = myUsers.map(u => {
      const uPeople = myPeople.filter(p => String(p.ownerId) === String(u.id));
      const uPeopleIds = uPeople.map(p => String(p.id));
      const uInteractions = myInteractions.filter(i => uPeopleIds.includes(String(i.personId)));
      
      const contactsWeek = uPeople.filter(p => isCurrentDate(p.firstContactDate)).length;
      const callsWeek = uInteractions.filter(i => i.type === 'CALL' && isCurrentDate(i.date)).length;
      const meetingsWeek = uInteractions.filter(i => (i.type === 'MEETING' || i.type === 'PRASADAM' || i.type === 'BOOK') && isCurrentDate(i.date)).length;
      
      const prevContactsWeek = uPeople.filter(p => isPrevDate(p.firstContactDate)).length;
      const prevCallsWeek = uInteractions.filter(i => i.type === 'CALL' && isPrevDate(i.date)).length;
      const prevMeetingsWeek = uInteractions.filter(i => (i.type === 'MEETING' || i.type === 'PRASADAM' || i.type === 'BOOK') && isPrevDate(i.date)).length;

      return {
        id: u.id,
        name: u.name,
        role: u.role,
        contactsTotal: uPeople.length,
        contactsWeek, callsWeek, meetingsWeek,
        prevContactsWeek, prevCallsWeek, prevMeetingsWeek
      };
    }).sort((a, b) => {
      if (b.meetingsWeek !== a.meetingsWeek) return b.meetingsWeek - a.meetingsWeek;
      if (b.callsWeek !== a.callsWeek) return b.callsWeek - a.callsWeek;
      return b.contactsWeek - a.contactsWeek;
    });

    // Incoming Referrals (Tasks)
    const tasks = await db.tasks.toArray();
    const myReferrals = tasks.filter(t => 
      String(t.assignedUserId) === String(currentUser.id) && 
      t.title.includes('Referral') && 
      t.status === 'PENDING'
    );

    const referralsWithPeople = await Promise.all(myReferrals.map(async ref => {
      const person = await db.people.get(Number(ref.personId)) || await db.people.get(String(ref.personId));
      return { ...ref, person };
    }));
    
    return {
      allUsersForFilter: allUsers.filter(u => u.role !== 'SUPER_ADMIN' && u.role !== 'FOLK_GUIDE'),
      allTeams,
      totalContacts: myPeople.length,
      contactsPeriod,
      callsPeriod,
      meetingsPeriod,
      userPerformance,
      referrals: referralsWithPeople
    };
  }, [currentUser, dateFilter, customStartDate, customEndDate, teamFilter, peopleFilter]);

  if (!metrics) return <div style={{ padding: 24 }}>Loading manager dashboard...</div>;

  return (
    <div className={styles.container} id="dashboard-report">
      <header className={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 className={styles.greeting}>Performance Dashboard</h1>
            <p className={styles.subtitle}>Welcome back, {currentUser?.name}. Monitor your team's progress.</p>
          </div>
          
          <div className="no-print" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <select 
              value={dateFilter} 
              onChange={e => setDateFilter(e.target.value as DateFilter)}
              className={styles.filterSelect}
            >
              <option value="TODAY">Today</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="THIS_WEEK">This Week</option>
              <option value="LAST_WEEK">Last Week</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="LAST_MONTH">Last Month</option>
              <option value="ALL_TIME">All Time</option>
              <option value="CUSTOM">Custom Range</option>
            </select>

            {dateFilter === 'CUSTOM' && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input 
                  type="date" 
                  value={customStartDate} 
                  onChange={e => setCustomStartDate(e.target.value)}
                  className={styles.filterSelect}
                />
                <span style={{ color: 'var(--color-text-muted)' }}>to</span>
                <input 
                  type="date" 
                  value={customEndDate} 
                  onChange={e => setCustomEndDate(e.target.value)}
                  className={styles.filterSelect}
                />
              </div>
            )}

            <select 
              value={teamFilter} 
              onChange={e => {
                setTeamFilter(e.target.value);
                setPeopleFilter('ALL'); // Reset member filter when team changes
              }}
              className={styles.filterSelect}
            >
              <option value="ALL">All Teams</option>
              {metrics.allTeams.map(t => (
                <option key={t.id} value={String(t.id)}>{t.name}</option>
              ))}
            </select>
            
            <select 
              value={peopleFilter} 
              onChange={e => setPeopleFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="ALL">All Members</option>
              {metrics.allUsersForFilter
                .filter(u => teamFilter === 'ALL' || String(u.teamId) === teamFilter)
                .map(u => (
                  <option key={u.id} value={String(u.id)}>{u.name}</option>
              ))}
            </select>
            
            <button className={styles.btnDownload} onClick={() => window.print()}>
              <Download size={16} /> Export PDF
            </button>
          </div>
        </div>
      </header>
      
      {metrics.referrals.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle} style={{ color: 'var(--color-danger)' }}>Incoming Referrals ({metrics.referrals.length})</h2>
          <div className={styles.referralGrid}>
            {metrics.referrals.map(ref => (
              <div key={ref.id} className={styles.referralCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{ref.person?.name || 'Unknown Contact'}</h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 4 }}>{ref.title}</div>
                  </div>
                  {ref.person?.phone && (
                    <a href={'tel:' + ref.person?.phone} className={styles.btnCall}>
                      <PhoneCall size={16} /> Call
                    </a>
                  )}
                </div>
                <div style={{ background: 'var(--glass-bg)', padding: 12, borderRadius: 8, fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                  {ref.notes}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-primary)' }}>
            <Users size={24} />
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statLabel}>New Contacts</div>
            <div className={styles.statValue}>{metrics.contactsPeriod}</div>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--color-success)' }}>
            <Phone size={24} />
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statLabel}>Follow-up Calls</div>
            <div className={styles.statValue}>{metrics.callsPeriod}</div>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
            <CalendarIcon size={24} />
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statLabel}>1-to-1 Meetings</div>
            <div className={styles.statValue}>{metrics.meetingsPeriod}</div>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)' }}>
            <TrendingUp size={24} />
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statLabel}>Total Network</div>
            <div className={styles.statValue}>{metrics.totalContacts}</div>
          </div>
        </div>
      </div>
      
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Leaderboard & Performance</h2>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Member</th>
                <th>Role</th>
                <th>1-to-1s</th>
                <th>Calls</th>
                <th>New Contacts</th>
                <th>Total Contacts</th>
              </tr>
            </thead>
            <tbody>
              {metrics.userPerformance.map((user, idx) => (
                <tr key={user.id} onClick={() => setDrilldownUserId(String(user.id))} style={{ cursor: 'pointer' }} className={styles.tableRowHover}>
                  <td style={{ fontWeight: 'bold', color: idx === 0 ? 'var(--color-warning)' : 'inherit' }}>#{idx + 1}</td>
                  <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{user.name}</td>
                  <td>
                    <span className={styles.roleBadge}>{user.role}</span>
                  </td>
                  <td style={{ fontWeight: user.meetingsWeek > 0 ? 'bold' : 'normal', color: user.meetingsWeek > 0 ? '#a855f7' : 'inherit' }}>{user.meetingsWeek}</td>
                  <td style={{ fontWeight: user.callsWeek > 0 ? 'bold' : 'normal', color: user.callsWeek > 0 ? 'var(--color-success)' : 'inherit' }}>{user.callsWeek}</td>
                  <td style={{ fontWeight: user.contactsWeek > 0 ? 'bold' : 'normal', color: user.contactsWeek > 0 ? 'var(--color-primary)' : 'inherit' }}>{user.contactsWeek}</td>
                  <td style={{ fontWeight: 600 }}>{user.contactsTotal}</td>
                </tr>
              ))}
              {metrics.userPerformance.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No team members found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {drilldownUserId && (
        <div className={
o-print }>
          <div className={styles.modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>Detailed Analysis</h2>
              <button onClick={() => setDrilldownUserId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text)' }}><X /></button>
            </div>
            
            {(() => {
              const u = metrics.userPerformance.find(up => String(up.id) === drilldownUserId);
              if (!u) return <p>User not found.</p>;

              const renderComparison = (curr: number, prev: number) => {
                const diff = curr - prev;
                if (diff > 0) return <span style={{ color: 'var(--color-success)', fontSize: '0.85rem' }}>? +{diff} vs prev</span>;
                if (diff < 0) return <span style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>? {Math.abs(diff)} vs prev</span>;
                return <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>- No change</span>;
              };

              return (
                <div>
                  <h3 style={{ color: 'var(--color-primary)', marginBottom: 24, fontSize: '1.5rem' }}>{u.name}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                    <div style={{ padding: 16, background: 'var(--glass-bg)', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 8 }}>Follow-ups (1-to-1)</div>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: 4 }}>{u.meetingsWeek}</div>
                      {renderComparison(u.meetingsWeek, u.prevMeetingsWeek)}
                    </div>
                    <div style={{ padding: 16, background: 'var(--glass-bg)', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 8 }}>Calls Made</div>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: 4 }}>{u.callsWeek}</div>
                      {renderComparison(u.callsWeek, u.prevCallsWeek)}
                    </div>
                    <div style={{ padding: 16, background: 'var(--glass-bg)', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 8 }}>New Contacts</div>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: 4 }}>{u.contactsWeek}</div>
                      {renderComparison(u.contactsWeek, u.prevContactsWeek)}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
