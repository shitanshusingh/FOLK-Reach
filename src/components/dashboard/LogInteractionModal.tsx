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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Create interaction
      await db.interactions.add({
        personId: person.id as number,
        type: type,
        date: new Date(),
        outcome: outcome,
        notes: notes
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
