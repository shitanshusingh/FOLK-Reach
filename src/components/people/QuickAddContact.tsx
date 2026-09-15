"use client";

import { useState } from "react";
import { X } from "lucide-react";
import styles from "./QuickAddContact.module.css";
import { firestoreAPI, useFirestoreQuery, useFirestoreDoc } from "@/lib/firestore";
import { where } from "firebase/firestore";;
import { GlassSelect } from "@/components/ui/GlassSelect";
import { useAuth } from "@/contexts/AuthContext";

interface QuickAddContactProps {
  onClose: () => void;
  onSuccess?: (id: number) => void;
}

export function QuickAddContact({ onClose, onSuccess }: QuickAddContactProps) {
  const [showOptional, setShowOptional] = useState(false);
  
  // Required
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [priorityScore, setPriorityScore] = useState(5); // Default to Cold (5)
  const { currentUser } = useAuth();
  
  // Optional
  const [college, setCollege] = useState("");
  const [branch, setBranch] = useState("");
  const [company, setCompany] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [nativePlace, setNativePlace] = useState("");
  const [currentCity, setCurrentCity] = useState("");
  const [birthday, setBirthday] = useState("");
  const [howMet, setHowMet] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    try {
      // Duplicate check
      const existing = await db.people.where('phone').equals(phone).toArray();
      if (existing.length > 0) {
        const confirmMerge = window.confirm(
          `Warning: A contact with phone ${phone} already exists (${existing[0].name}).\nDo you want to add anyway?`
        );
        if (!confirmMerge) return;
      }

      const id = await db.people.add({
        name,
        phone,
        college,
        branch,
        company,
        jobRole,
        nativePlace,
        currentCity,
        birthday: birthday ? new Date(birthday) : undefined,
        howMet,
        notes,
        firstContactDate: new Date(),
        priorityScore: Number(priorityScore),
        tags: [],
        ownerId: currentUser?.id,
      });
      if (onSuccess) onSuccess(id as number);
      onClose();
    } catch (error) {
      console.error("Failed to add person", error);
      alert("Error adding contact.");
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.header}>
          <h2 className={styles.title}>New Contact</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={24} />
          </button>
        </div>
        
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="name">Name *</label>
            <input 
              id="name"
              className={styles.input} 
              type="text" 
              required 
              value={name} 
              onChange={e => setName(e.target.value)}
              placeholder="E.g., Rahul Kumar"
              autoFocus
            />
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="phone">Phone Number *</label>
            <input 
              id="phone"
              className={styles.input} 
              type="tel" 
              required 
              value={phone} 
              onChange={e => setPhone(e.target.value)}
              placeholder="+91..."
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Category / Interest Level *</label>
            <GlassSelect 
              value={priorityScore.toString()} 
              onChange={val => setPriorityScore(Number(val))}
              options={[
                { value: "20", label: "Hot (Highly interested)", icon: <span>🔥</span> },
                { value: "10", label: "Warm (Moderately interested)", icon: <span>😊</span> },
                { value: "5", label: "Cold (New person, just interested)", icon: <span>❄️</span> },
                { value: "0", label: "Dormant (Not responding)", icon: <span>💤</span> }
              ]}
            />
          </div>

          {!showOptional ? (
            <button 
              type="button" 
              className={styles.optionalFieldsToggle} 
              onClick={() => setShowOptional(true)}
            >
              + Add more details (optional)
            </button>
          ) : (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="college">College / University</label>
                <input 
                  id="college"
                  className={styles.input} 
                  type="text" 
                  value={college} 
                  onChange={e => setCollege(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="branch">Branch / Year</label>
                <input 
                  id="branch"
                  className={styles.input} 
                  type="text" 
                  value={branch} 
                  onChange={e => setBranch(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="company">Company</label>
                <input 
                  id="company"
                  className={styles.input} 
                  type="text" 
                  value={company} 
                  onChange={e => setCompany(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="jobRole">Job Role / Profession</label>
                <input 
                  id="jobRole"
                  className={styles.input} 
                  type="text" 
                  value={jobRole} 
                  onChange={e => setJobRole(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="nativePlace">Native Place</label>
                <input 
                  id="nativePlace"
                  className={styles.input} 
                  type="text" 
                  value={nativePlace} 
                  onChange={e => setNativePlace(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="currentCity">Current City</label>
                <input 
                  id="currentCity"
                  className={styles.input} 
                  type="text" 
                  value={currentCity} 
                  onChange={e => setCurrentCity(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="birthday">Birthday</label>
                <input 
                  id="birthday"
                  className={styles.input} 
                  type="date" 
                  value={birthday} 
                  onChange={e => setBirthday(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="howMet">Source / How met?</label>
                <input 
                  id="howMet"
                  className={styles.input} 
                  type="text" 
                  value={howMet} 
                  onChange={e => setHowMet(e.target.value)}
                  placeholder="e.g. Book distribution, college session..."
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="notes">Initial Notes</label>
                <textarea 
                  id="notes"
                  className={styles.input} 
                  rows={2}
                  value={notes} 
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </>
          )}

          <div className={styles.actions}>
            <button type="button" className={`${styles.btn} ${styles.btnCancel}`} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={`${styles.btn} ${styles.btnSave}`} disabled={!name || !phone}>
              Save Contact
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
