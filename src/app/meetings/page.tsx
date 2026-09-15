"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar as CalendarIcon, Clock, Phone, Plus } from "lucide-react";
import styles from "./Meetings.module.css";
import { QuickAddTask } from "@/components/tasks/QuickAddTask";
import { firestoreAPI, useFirestoreQuery, useFirestoreDoc } from "@/lib/firestore";
import { where } from "firebase/firestore";;
import { format, isPast, isFuture, differenceInDays } from "date-fns";
import clsx from "clsx";

export default function MeetingsPage() {
  const [filter, setFilter] = useState<'UPCOMING' | 'PAST'>('PAST');
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // We consider interactions of type MEETING as past meetings.
  // And tasks of type MEETING as upcoming meetings.
  
  const meetingsData = useLiveQuery(async () => {
    const topicsMap = new Map();
    const allTopics = await db.topics.toArray();
    allTopics.forEach(t => topicsMap.set(t.id, t.name));

    if (filter === 'PAST') {
      const meetings = await db.interactions.where('type').equals('MEETING').reverse().sortBy('date');
      return await Promise.all(meetings.map(async m => {
        const person = await db.people.get(m.personId);
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
      }));
    } else {
      const upcoming = await db.tasks.where('type').equals('MEETING').toArray();
      const filtered = upcoming.filter(t => t.status === 'PENDING');
      return await Promise.all(filtered.map(async m => {
        const person = await db.people.get(m.personId);
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
      })).then(res => res.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    }
  }, [filter]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>1-to-1 Meetings</h1>
      </header>

      <div className={styles.filters}>
        <button 
          className={clsx(styles.filterBtn, filter === 'PAST' && styles.filterBtnActive)}
          onClick={() => setFilter('PAST')}
        >
          Past Meetings
        </button>
        <button 
          className={clsx(styles.filterBtn, filter === 'UPCOMING' && styles.filterBtnActive)}
          onClick={() => setFilter('UPCOMING')}
        >
          Upcoming Scheduled
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
