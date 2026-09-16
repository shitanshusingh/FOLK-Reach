"use client";
// @ts-nocheck
import { useLiveQuery } from "@/lib/firestore";
import { db } from "@/lib/db";

import { useState } from "react";
import Link from "next/link";
import { Calendar as CalendarIcon, Clock, Phone, Plus } from "lucide-react";
import styles from "./Meetings.module.css";
import { QuickAddTask } from "@/components/tasks/QuickAddTask";
import { firestoreAPI, useFirestoreQuery, useFirestoreDoc } from "@/lib/firestore";
import { where } from "firebase/firestore";;
import { format, isPast, isFuture, differenceInDays } from "date-fns";
import clsx from "clsx";
import { useAuth } from "@/contexts/AuthContext";

export default function MeetingsPage() {
  const [filter, setFilter] = useState<'UPCOMING' | 'OVERDUE' | 'PAST'>('UPCOMING');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const { currentUser } = useAuth();

  // We consider interactions of type MEETING as past meetings.
  // And tasks of type MEETING as upcoming/overdue meetings.
  
  const meetingsData = useLiveQuery(async () => {
    if (!currentUser) return [];
    
    let teamUserIds = new Set([currentUser.id]);
    if (currentUser.teamId) {
      const teamUsers = await db.users.where('teamId').equals(currentUser.teamId).toArray();
      teamUserIds = new Set(teamUsers.map(u => u.id));
    }

    const topicsMap = new Map();
    const allTopics = await db.topics.toArray();
    allTopics.forEach(t => topicsMap.set(t.id, t.name));

    if (filter === 'PAST') {
      const allMeetings = await db.interactions.where('type').equals('MEETING').reverse().sortBy('date');
      const resolved = await Promise.all(allMeetings.map(async m => {
        const person = await db.people.get(m.personId);
        return { person, m };
      }));
      
      const filtered = resolved.filter(res => res.person && teamUserIds.has(res.person.ownerId));

      return filtered.map(({ person, m }) => {
        const resolvedTopics = m.topicsDiscussed?.map(id => topicsMap.get(id)).filter(Boolean) || [];
        return { 
          ...m, 
          personName: person?.name || 'Unknown', 
          personPhone: person?.phone || '',
          personPriority: person?.priorityScore || 0,
          personLastContacted: person?.lastInteractionDate 
            ? differenceInDays(new Date(), new Date(person.lastInteractionDate))
            : (person?.firstContactDate ? differenceInDays(new Date(), new Date(person.firstContactDate)) : null),
          resolvedTopics 
        };
      });
    } else {
      const allTasks = await db.tasks.where('type').equals('MEETING').toArray();
      const resolved = await Promise.all(allTasks.map(async m => {
        const person = await db.people.get(m.personId);
        return { person, m };
      }));
      
      let filtered = resolved.filter(res => res.person && res.m.status === 'PENDING' && teamUserIds.has(res.person.ownerId));

      const now = new Date();
      if (filter === 'UPCOMING') {
        filtered = filtered.filter(res => new Date(res.m.dueDate) >= new Date(now.setHours(0,0,0,0)));
      } else if (filter === 'OVERDUE') {
        filtered = filtered.filter(res => new Date(res.m.dueDate) < new Date(now.setHours(0,0,0,0)));
      }

      return filtered.map(({ person, m }) => {
        return { 
          ...m, 
          date: m.dueDate, 
          personName: person?.name || 'Unknown', 
          personPhone: person?.phone || '',
          personPriority: person?.priorityScore || 0,
          personLastContacted: person?.lastInteractionDate 
            ? differenceInDays(new Date(), new Date(person.lastInteractionDate))
            : (person?.firstContactDate ? differenceInDays(new Date(), new Date(person.firstContactDate)) : null),
          resolvedTopics: [] 
        };
      }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
  }, [filter, currentUser]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>1-to-1 Meetings</h1>
      </header>

      <div className={styles.filters}>
        <button 
          className={clsx(styles.filterBtn, filter === 'UPCOMING' && styles.filterBtnActive)}
          onClick={() => setFilter('UPCOMING')}
        >
          Upcoming Scheduled
        </button>
        <button 
          className={clsx(styles.filterBtn, filter === 'PAST' && styles.filterBtnActive)}
          onClick={() => setFilter('PAST')}
        >
          Past Meetings
        </button>
        <button 
          className={clsx(styles.filterBtn, filter === 'OVERDUE' && styles.filterBtnActive)}
          onClick={() => setFilter('OVERDUE')}
        >
          Missed
        </button>
      </div>

      <div className={styles.list}>
        {meetingsData === undefined ? (
          <p>Loading...</p>
        ) : meetingsData.length === 0 ? (
          <div className={styles.emptyState}>
            No {filter.toLowerCase()} meetings found.
          </div>
        ) : (
          meetingsData.map((meeting: any) => (
            <div key={meeting.id} className={styles.meetingCard}>
              <div className={styles.meetingHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Link href={`/people/${meeting.personId}?from=/meetings`} className={styles.meetingPerson}>
                    {meeting.personName}
                  </Link>
                  {meeting.personPriority > 0 && (
                    <span className={styles.priorityBadge}>⭐ {meeting.personPriority}</span>
                  )}
                  {meeting.personLastContacted !== null && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      Last contact: {meeting.personLastContacted}d ago
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className={styles.meetingDate}>
                    <CalendarIcon size={14} />
                    {format(new Date(meeting.date), "MMM d, yyyy h:mm a")}
                  </div>
                  {meeting.personPhone && (
                    <a href={`tel:${meeting.personPhone}`} className={styles.callBtn} aria-label={`Call ${meeting.personName}`}>
                      <Phone size={14} />
                    </a>
                  )}
                </div>
              </div>
              
              {meeting.purpose && filter === 'PAST' && (
                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '8px' }}>
                  Purpose: {meeting.purpose}
                </div>
              )}
              {meeting.title && filter === 'UPCOMING' && (
                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '8px' }}>
                  Title: {meeting.title}
                </div>
              )}
              
              {meeting.notes && (
                <div className={styles.meetingNotes}>{meeting.notes}</div>
              )}
              
              {meeting.resolvedTopics && meeting.resolvedTopics.length > 0 && (
                <div className={styles.topicsList}>
                  {meeting.resolvedTopics.map((topic: string, i: number) => (
                    <span key={i} className={styles.topicBadge}>{topic}</span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <button 
        className={styles.globalFab}
        onClick={() => setShowQuickAdd(true)}
        aria-label="Add Meeting"
      >
        <Plus size={28} />
      </button>

      {showQuickAdd && (
        <QuickAddTask onClose={() => setShowQuickAdd(false)} defaultType="MEETING" />
      )}
    </div>
  );
}
