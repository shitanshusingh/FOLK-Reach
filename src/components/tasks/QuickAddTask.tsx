// @ts-nocheck
import { useLiveQuery } from "@/lib/firestore";
import { db } from "@/lib/db";
import React, { useState } from 'react';
import { firestoreAPI, useFirestoreQuery, useFirestoreDoc } from "@/lib/firestore";
import { where } from "firebase/firestore";;
import { X, Calendar as CalendarIcon } from 'lucide-react';
import styles from './QuickAddTask.module.css';
import { GlassSelect } from '@/components/ui/GlassSelect';

export function QuickAddTask({ 
  onClose, 
  defaultType = 'CALL' 
}: { 
  onClose: () => void, 
  defaultType?: 'CALL' | 'MEETING' | 'PRASADAM' | 'BOOK' | 'OTHER'
}) {
  const [personId, setPersonId] = useState<number | ''>('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState(defaultType);
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const allPeople = useLiveQuery(() => db.people.orderBy('name').toArray());

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personId || !title || !dueDate) return;

    await db.tasks.add({
      personId: Number(personId),
      title,
      type,
      status: 'PENDING',
      dueDate: new Date(dueDate),
      notes
    });
    
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Schedule Follow-up</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSave} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Select Person</label>
            <GlassSelect 
              value={personId.toString()} 
              onChange={val => setPersonId(Number(val))}
              placeholder="-- Choose someone --"
              options={allPeople?.map(p => ({ value: p.id!.toString(), label: p.name })) || []}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Task Title</label>
            <input 
              type="text" 
              className={styles.input} 
              placeholder="e.g. Discuss session details"
              value={title} 
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          <div className={styles.row}>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className={styles.label}>Type</label>
              <GlassSelect 
                value={type} 
                onChange={val => setType(val as any)}
                options={[
                  { value: "CALL", label: "Call" },
                  { value: "MEETING", label: "1-to-1 Meeting" },
                  { value: "PRASADAM", label: "Prasadam" },
                  { value: "BOOK", label: "Book Reading" },
                  { value: "OTHER", label: "Other" }
                ]}
              />
            </div>
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
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Notes (Optional)</label>
            <textarea 
              className={styles.input} 
              rows={3}
              placeholder="Any details to remember..."
              value={notes} 
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <button type="submit" className={styles.submitBtn}>
            <CalendarIcon size={18} style={{ marginRight: 8 }} />
            Schedule Task
          </button>
        </form>
      </div>
    </div>
  );
}
