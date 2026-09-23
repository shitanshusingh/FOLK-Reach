"use client";

import { useLiveQuery } from "@/lib/firestore";
import { db } from "@/lib/db";
import { startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./FolkGuideDashboard.module.css";
import { Users, Phone, Calendar as CalendarIcon, TrendingUp } from "lucide-react";

export function FolkGuideDashboard() {
  const { currentUser } = useAuth();
  
  const metrics = useLiveQuery(async () => {
    if (!currentUser) return null;
    
    // Get all users under this Folk Guide.
    const allUsers = await db.users.toArray();
    
    const myUsers = allUsers.filter(u => u.role !== 'SUPER_ADMIN' && u.role !== 'FOLK_GUIDE');
    const myUserIds = myUsers.map(u => String(u.id));
    
    // Get all people assigned to these users
    const allPeople = await db.people.toArray();
    const myPeople = allPeople.filter(p => p.ownerId && myUserIds.includes(String(p.ownerId)));
    
    // Get all interactions
    const allInteractions = await db.interactions.toArray();
    const myInteractions = allInteractions.filter(i => {
      const person = myPeople.find(p => p.id === i.personId);
      return !!person;
    });
    
    const now = new Date();
    const startWeek = startOfWeek(now, { weekStartsOn: 1 });
    const endWeek = endOfWeek(now, { weekStartsOn: 1 });
    
    const contactsThisWeek = myPeople.filter(p => p.firstContactDate && isWithinInterval(new Date(p.firstContactDate), { start: startWeek, end: endWeek })).length;
    
    const callsThisWeek = myInteractions.filter(i => i.type === 'CALL' && isWithinInterval(new Date(i.date), { start: startWeek, end: endWeek })).length;
    
    const meetingsThisWeek = myInteractions.filter(i => (i.type === 'MEETING' || i.type === 'PRASADAM' || i.type === 'BOOK') && isWithinInterval(new Date(i.date), { start: startWeek, end: endWeek })).length;
    
    // Performance by User
    const userPerformance = myUsers.map(u => {
      const uPeople = myPeople.filter(p => String(p.ownerId) === String(u.id));
      const uPeopleIds = uPeople.map(p => p.id);
      const uInteractions = myInteractions.filter(i => uPeopleIds.includes(i.personId));
      
      return {
        id: u.id,
        name: u.name,
        role: u.role,
        contactsTotal: uPeople.length,
        contactsWeek: uPeople.filter(p => p.firstContactDate && isWithinInterval(new Date(p.firstContactDate), { start: startWeek, end: endWeek })).length,
        callsWeek: uInteractions.filter(i => i.type === 'CALL' && isWithinInterval(new Date(i.date), { start: startWeek, end: endWeek })).length,
        meetingsWeek: uInteractions.filter(i => (i.type === 'MEETING' || i.type === 'PRASADAM' || i.type === 'BOOK') && isWithinInterval(new Date(i.date), { start: startWeek, end: endWeek })).length
      };
    }).sort((a, b) => b.contactsWeek - a.contactsWeek);
    
    return {
      totalContacts: myPeople.length,
      contactsThisWeek,
      callsThisWeek,
      meetingsThisWeek,
      userPerformance
    };
  }, [currentUser]);

  if (!metrics) return <div style={{ padding: 24 }}>Loading manager dashboard...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.greeting}>Overview (This Week)</h1>
        <p className={styles.subtitle}>Welcome back, {currentUser?.name}. Here is your team's performance.</p>
      </header>
      
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-primary)' }}>
            <Users size={24} />
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statLabel}>New Contacts</div>
            <div className={styles.statValue}>{metrics.contactsThisWeek}</div>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--color-success)' }}>
            <Phone size={24} />
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statLabel}>Follow-up Calls</div>
            <div className={styles.statValue}>{metrics.callsThisWeek}</div>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
            <CalendarIcon size={24} />
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statLabel}>1-to-1 Meetings</div>
            <div className={styles.statValue}>{metrics.meetingsThisWeek}</div>
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
        <h2 className={styles.sectionTitle}>Team Performance</h2>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>New Contacts (Wk)</th>
                <th>Calls (Wk)</th>
                <th>1-to-1s (Wk)</th>
                <th>Total Contacts</th>
              </tr>
            </thead>
            <tbody>
              {metrics.userPerformance.map(user => (
                <tr key={user.id}>
                  <td style={{ fontWeight: 600 }}>{user.name}</td>
                  <td>
                    <span className={styles.roleBadge}>{user.role}</span>
                  </td>
                  <td style={{ color: user.contactsWeek > 0 ? 'var(--color-success)' : 'inherit', fontWeight: user.contactsWeek > 0 ? 'bold' : 'normal' }}>{user.contactsWeek}</td>
                  <td>{user.callsWeek}</td>
                  <td>{user.meetingsWeek}</td>
                  <td style={{ fontWeight: 600 }}>{user.contactsTotal}</td>
                </tr>
              ))}
              {metrics.userPerformance.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No team members found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
