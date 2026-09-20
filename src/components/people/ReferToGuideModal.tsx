"use client";
// @ts-nocheck
import { useLiveQuery } from "@/lib/firestore";
import { db } from "@/lib/db";
import React, { useState } from 'react';
import { X, Calendar as CalendarIcon, Clock } from 'lucide-react';
import styles from '../tasks/QuickAddTask.module.css'; // Reusing styles from QuickAddTask
import { GlassSelect } from '@/components/ui/GlassSelect';
import { useAuth } from "@/contexts/AuthContext";

export function ReferToGuideModal({ 
  onClose,
  personId,
  personName
}: { 
  onClose: () => void;
  personId: string | number;
  personName: string;
}) {
  const [guideId, setGuideId] = useState<string>('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('18:00');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { currentUser } = useAuth();
  
  // Fetch Folk Guides in the same team
  const folkGuides = useLiveQuery(async () => {
    if (!currentUser?.teamId) return [];
    const teamUsers = await db.users.where('teamId').equals(currentUser.teamId).toArray();
    // Only return users who are FOLK_GUIDE
    return teamUsers.filter(u => u.role === 'FOLK_GUIDE');
  }, [currentUser?.teamId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guideId || !dueDate || !time) return;

    setIsSubmitting(true);
    
    // Combine date and time
    const dateTimeString = `${dueDate}T${time}:00`;
    
    await db.tasks.add({
      personId: personId,
      assignedToUserId: guideId,
      referredByUserId: currentUser?.id,
      title: `Meeting with ${personName}`,
      type: 'MEETING',
      status: 'PENDING',
      dueDate: new Date(dateTimeString),
      notes: notes
    });
    
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Refer to Folk Guide</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div style={{ marginBottom: 16, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
          Schedule a 1-to-1 meeting with a Folk Guide for <strong>{personName}</strong>.
        </div>

        <form onSubmit={handleSave} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Select Folk Guide</label>
            <GlassSelect 
              value={guideId} 
              onChange={val => setGuideId(val)}
              placeholder="-- Choose a Guide --"
              options={folkGuides?.map((g: any) => ({ value: g.id!.toString(), label: g.name })) || []}
            />
          </div>

          <div className={styles.row}>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className={styles.label}>Date</label>
              <input 
                type="date" 
                className={styles.input} 
                value={dueDate} 
                onChange={e => setDueDate(e.target.value)}
                required
              />
            </div>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className={styles.label}>Time</label>
              <input 
                type="time" 
                className={styles.input} 
                value={time} 
                onChange={e => setTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Context / Notes</label>
            <textarea 
              className={styles.input} 
              rows={3}
              placeholder="What should the Guide know before meeting?"
              value={notes} 
              onChange={e => setNotes(e.target.value)}
              required
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={isSubmitting || !guideId}>
            <CalendarIcon size={18} style={{ marginRight: 8 }} />
            {isSubmitting ? "Scheduling..." : "Schedule Meeting"}
          </button>
        </form>
      </div>
    </div>
  );
}
