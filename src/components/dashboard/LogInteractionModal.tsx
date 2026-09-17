"use client";
// @ts-nocheck
import { db } from "@/lib/db";
import { useState } from "react";

import { X } from "lucide-react";
import styles from "./LogInteractionModal.module.css";
import { firestoreAPI, useFirestoreQuery, useFirestoreDoc } from "@/lib/firestore";
import { where } from "firebase/firestore";
import { Person } from "@/lib/db";;
import { GlassSelect } from "@/components/ui/GlassSelect";

interface LogInteractionModalProps {
  person: Person;
  type: 'CALL' | 'MEETING';
  onClose: () => void;
  onSuccess: (outcome: string) => void;
}

export function LogInteractionModal({ person, type, onClose, onSuccess }: LogInteractionModalProps) {
  const [outcome, setOutcome] = useState("Connected - Good Interaction");
  const [notes, setNotes] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number | "">("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Create interaction
      await db.interactions.add({
        personId: person.id as number,
        type: type,
        date: new Date(),
        outcome: outcome,
        notes: notes,
        ...(type === 'CALL' && typeof durationMinutes === 'number' ? { durationMinutes } : {})
      });

      // Update person last contacted date
      // If it was a good interaction, let's bump priority by 2 points up to a max of 20
      let newPriority = person.priorityScore;
      if (outcome.includes("Good Interaction") && newPriority < 20) {
        newPriority = Math.min(20, newPriority + 2);
      } else if (outcome.includes("Not Interested") && newPriority > 0) {
        newPriority = Math.max(0, newPriority - 5);
      }

      await firestoreAPI.update('people', person.id as number, {
        lastInteractionDate: new Date(),
        lastInteractionType: type,
        priorityScore: newPriority
      });

      // Auto-schedule physical task pipeline
      const existingTasks = await db.tasks.where('personId').equals(person.id as number).toArray();
      for (const t of existingTasks) {
        if (t.status === 'PENDING') {
          await firestoreAPI.update('tasks', t.id as number, { status: 'COMPLETED' });
        }
      }

      let threshold = 4;
      if (newPriority >= 20) threshold = 1; // Hot: Tomorrow
      else if (newPriority >= 10) threshold = 2; // Warm: 2 days
      else if (newPriority > 0) threshold = 3; // Cold: 3 days
      else threshold = 4; // Dormant: 4 days

      let nextType: 'CALL' | 'MEETING' = (type === 'MEETING' || type === 'PRASADAM' || type === 'BOOK') ? 'CALL' : 'MEETING';
      let reason = nextType === 'MEETING' ? '1-to-1 / Prasadam / Topic' : 'Follow-up Call';
      let shouldScheduleTask = true;

      // Force 1-to-1 meetings to be scheduled immediately (tomorrow) 
      if (nextType === 'MEETING') {
        threshold = 1;
      }

      // Dynamically adjust based on specific outcomes
      if (outcome === "Did Not Answer" || outcome === "Busy") {
        nextType = 'CALL';
        reason = `Follow-up Call (${outcome})`;
        threshold = 1; // Try again tomorrow
      } else if (outcome === "Number Invalid" || outcome === "Not Interested") {
        shouldScheduleTask = false; // Do not auto-schedule follow-ups for invalid/uninterested
      }

      if (shouldScheduleTask) {
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + threshold);

        await db.tasks.add({
          personId: person.id as number,
          title: reason,
          type: nextType,
          status: "PENDING",
          dueDate: nextDate,
          notes: "Auto-scheduled"
        });
      }

      onSuccess(outcome);
    } catch (err) {
      console.error(err);
      alert("Failed to save log");
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.header}>
          <h2 className={styles.title}>Log {type === 'CALL' ? 'Call' : 'Meeting'}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={24} />
          </button>
        </div>

        <p className={styles.subtitle}>with {person.name}</p>
        
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Outcome / Disposition</label>
            <GlassSelect 
              value={outcome}
              onChange={val => setOutcome(val)}
              options={[
                { value: "Connected - Good Interaction", label: "✅ Connected (Good Interaction)" },
                { value: "Connected - Average", label: "✅ Connected (Average)" },
                { value: "Meeting - Done", label: "🤝 Meeting Completed" },
                { value: "Busy", label: "⏳ Busy / Call Back Later" },
                { value: "Did Not Answer", label: "📵 Did Not Answer" },
                { value: "Number Invalid", label: "❌ Number Invalid" },
                { value: "Not Interested", label: "🛑 Not Interested" }
              ]}
            />
          </div>

          {type === 'CALL' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Call Duration (minutes)</label>
              <input 
                type="number"
                min="0"
                className={styles.input} 
                value={durationMinutes}
                onChange={e => setDurationMinutes(e.target.value ? Number(e.target.value) : "")}
                placeholder="e.g. 5"
              />
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.label}>Notes (Optional)</label>
            <textarea 
              className={styles.input} 
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="What did you discuss?"
            />
          </div>

          <div className={styles.actions}>
            <button type="button" className={`${styles.btn} ${styles.btnCancel}`} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={`${styles.btn} ${styles.btnSave}`}>
              Save Log
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
