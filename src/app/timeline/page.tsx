"use client";

import Link from "next/link";
import { Phone, MessageCircle, Calendar, PlusCircle, Book, Coffee } from "lucide-react";
import styles from "./Timeline.module.css";
import { firestoreAPI, useFirestoreQuery, useFirestoreDoc } from "@/lib/firestore";
import { where } from "firebase/firestore";;
import { format } from "date-fns";

export default function TimelinePage() {
  const interactionsData = useLiveQuery(async () => {
    const interactions = await db.interactions.reverse().sortBy('date');
    return await Promise.all(interactions.slice(0, 100).map(async int => {
      const person = await db.people.get(int.personId);
      return { ...int, personName: person?.name || 'Unknown' };
    }));
  });

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Global Timeline</h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: 8 }}>
          Recent activity across all contacts (Showing latest 100).
        </p>
      </header>

      <div className={styles.timeline}>
        {interactionsData === undefined ? (
          <p>Loading...</p>
        ) : interactionsData.length === 0 ? (
          <p>No activity yet.</p>
        ) : (
          interactionsData.map(interaction => (
            <div key={interaction.id} className={styles.timelineItem}>
              <div className={styles.timelineIcon}>
                {interaction.type === 'CALL' && <Phone size={20} />}
                {interaction.type === 'MEETING' && <Calendar size={20} />}
                {interaction.type === 'WHATSAPP' && <MessageCircle size={20} />}
                {interaction.type === 'PRASADAM' && <Coffee size={20} />}
                {interaction.type === 'BOOK' && <Book size={20} />}
                {interaction.type === 'OTHER' && <PlusCircle size={20} />}
              </div>
              <div className={styles.timelineContent}>
                <div className={styles.timelineHeader}>
                  <span className={styles.timelineType}>
                    <Link href={`/people/${interaction.personId}`} className={styles.personLink}>
                      {interaction.personName}
                    </Link>
                    {' • '}
                    {interaction.type} {interaction.outcome ? `- ${interaction.outcome}` : ''}
                  </span>
                  <span className={styles.timelineDate}>
                    {format(new Date(interaction.date), "MMM d, yyyy h:mm a")}
                  </span>
                </div>
                {interaction.purpose && (
                  <div style={{ fontWeight: 500, marginBottom: 4, fontSize: '0.875rem' }}>
                    Purpose: {interaction.purpose}
                  </div>
                )}
                {interaction.notes && (
                  <div className={styles.timelineNotes}>{interaction.notes}</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
