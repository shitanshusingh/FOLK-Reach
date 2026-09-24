"use client";

import { useLiveQuery } from "@/lib/firestore";
import { db } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./Referrals.module.css";
import { PhoneCall, CheckCircle, UserCheck } from "lucide-react";
import { format } from "date-fns";

export default function ReferralsPage() {
  const { currentUser } = useAuth();

  const referrals = useLiveQuery(async () => {
    if (!currentUser) return [];

    const tasks = await db.tasks.toArray();
    
    // Find all pending referral tasks assigned to this user
    const myReferrals = tasks.filter(t => 
      String(t.assignedToUserId || t.assignedUserId) === String(currentUser.id) && 
      t.title.includes('Referral') && 
      (t.status === 'TODO' || t.status === 'PENDING')
    );

    // Hydrate with person details
    const referralsWithPeople = await Promise.all(myReferrals.map(async ref => {
      const person = await db.people.get(Number(ref.personId)) || await db.people.get(String(ref.personId));
      return { ...ref, person };
    }));

    return referralsWithPeople.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  }, [currentUser]);

  const markAsDone = async (taskId: string | number | undefined) => {
    if (!taskId) return;
    await db.tasks.update(taskId, { status: 'DONE' });
  };

  if (!referrals) {
    return <div style={{ padding: 24 }}>Loading referrals...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Incoming Referrals</h1>
        <p className={styles.subtitle}>Contacts that have been referred to you by your team members.</p>
      </header>

      {referrals.length > 0 ? (
        <div className={styles.grid}>
          {referrals.map(ref => (
            <div key={ref.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h3 className={styles.name}>{ref.person?.name || 'Unknown Contact'}</h3>
                  <div className={styles.date}>
                    {ref.dueDate ? format(new Date(ref.dueDate), "MMM d, yyyy 'at' h:mm a") : 'No Date'}
                  </div>
                </div>
                {ref.person?.phone && (
                  <a href={`tel:${ref.person.phone}`} className={styles.btnCall}>
                    <PhoneCall size={18} /> Call
                  </a>
                )}
              </div>
              
              <div className={styles.notesWrapper}>
                <div className={styles.notesLabel}>Notes / Reason for Referral</div>
                <div className={styles.notes}>
                  {ref.description || ref.notes || "No additional notes provided."}
                </div>
              </div>

              <button 
                className={styles.btnDone}
                onClick={() => markAsDone(ref.id)}
              >
                Mark as Handled
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <UserCheck size={48} style={{ margin: '0 auto 16px', color: 'var(--color-primary)', opacity: 0.5 }} />
          <h2>You're all caught up!</h2>
          <p>You have no pending incoming referrals right now.</p>
        </div>
      )}
    </div>
  );
}
