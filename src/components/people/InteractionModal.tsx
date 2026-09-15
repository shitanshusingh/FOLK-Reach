"use client";
// @ts-nocheck
import { db } from "@/lib/db";

import { useState } from "react";
import { X } from "lucide-react";
import styles from "./InteractionModal.module.css";
import { firestoreAPI, useFirestoreQuery, useFirestoreDoc } from "@/lib/firestore";
import { where } from "firebase/firestore";
import { Interaction, Person } from "@/lib/db";;
import { GlassSelect } from "@/components/ui/GlassSelect";

interface InteractionModalProps {
  personId: number;
  initialType?: Interaction['type'];
  onClose: () => void;
}

export function InteractionModal({ personId, initialType = 'CALL', onClose }: InteractionModalProps) {
  const [type, setType] = useState<Interaction['type']>(initialType);
  const [outcome, setOutcome] = useState("");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<number[]>([]);
  
  // Book specific
  const [bookTitle, setBookTitle] = useState("");
  const [bookQuantity, setBookQuantity] = useState("1");

  const topics = useFirestoreQuery('topics', [where('isActive', '==', 1)]);

  const handleTopicToggle = (topicId: number) => {
    setSelectedTopics(prev => 
      prev.includes(topicId) 
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalNotes = notes;
      if (type === 'BOOK' && bookTitle) {
        finalNotes = `Book: ${bookTitle} (Qty: ${bookQuantity})\n${notes}`;
      }

      await db.interactions.add({
        personId,
        type,
        date: new Date(),
        purpose,
        outcome,
        notes: finalNotes,
        topicsDiscussed: selectedTopics.length > 0 ? selectedTopics : undefined
      });
      
      // Update person lastInteractionDate and maybe adjust priorityScore
      await firestoreAPI.update('people', personId, {
        lastInteractionDate: new Date(),
        lastInteractionType: type
      });
      
      onClose();
    } catch (error) {
      console.error("Failed to log interaction", error);
      alert("Error saving interaction.");
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.header}>
          <h2 className={styles.title}>Log Interaction</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Type</label>
            <GlassSelect 
              value={type} 
              onChange={val => setType(val as Interaction['type'])}
              options={[
                { value: "CALL", label: "Call" },
                { value: "WHATSAPP", label: "WhatsApp" },
                { value: "MEETING", label: "One-to-One / Meeting" },
                { value: "PRASADAM", label: "Prasadam" },
                { value: "BOOK", label: "Book Distribution" },
                { value: "OTHER", label: "Other" }
              ]}
            />
          </div>

          {(type === 'CALL' || type === 'WHATSAPP') && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>Outcome</label>
                <GlassSelect 
                  value={outcome}
                  onChange={val => setOutcome(val)}
                  placeholder="-- Select Outcome --"
                  options={[
                    { value: "Connected", label: "Connected" },
                    { value: "Missed call", label: "Missed call" },
                    { value: "Did not answer", label: "Did not answer" },
                    { value: "Asked to call later", label: "Asked to call later" },
                    { value: "Good conversation", label: "Good conversation" },
                    { value: "Session Invite - Accepted", label: "Session Invite - Accepted" },
                    { value: "Session Invite - Declined", label: "Session Invite - Declined" },
                    { value: "Not interested", label: "Not interested" }
                  ]}
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>Purpose</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  placeholder="e.g. Session Invitation"
                  value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                />
              </div>
            </>
          )}

          {type === 'BOOK' && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>Book Title</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  required
                  value={bookTitle}
                  onChange={e => setBookTitle(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Quantity</label>
                <input 
                  type="number" 
                  className={styles.input} 
                  min="1"
                  required
                  value={bookQuantity}
                  onChange={e => setBookQuantity(e.target.value)}
                />
              </div>
            </>
          )}

          {type === 'MEETING' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Topics Discussed</label>
              <div className={styles.topicsContainer}>
                {topics?.map(topic => (
                  <label key={topic.id} className={styles.topicCheckbox}>
                    <input 
                      type="checkbox" 
                      checked={topic.id ? selectedTopics.includes(topic.id) : false}
                      onChange={() => topic.id && handleTopicToggle(topic.id)}
                    />
                    {topic.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.label}>Notes</label>
            <textarea 
              className={styles.textarea} 
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any additional details..."
            />
          </div>

          <div className={styles.actions}>
            <button type="button" className={`${styles.btn} ${styles.btnCancel}`} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={`${styles.btn} ${styles.btnSave}`}>
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
