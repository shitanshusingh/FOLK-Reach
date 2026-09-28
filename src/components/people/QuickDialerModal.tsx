"use client";
import React, { useState, useEffect } from "react";
import { X, Phone, User as UserIcon } from "lucide-react";
import styles from "./QuickAddContact.module.css";
import { db } from "@/lib/db";
import { useLiveQuery } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";

export function QuickDialerModal({ onClose }: { onClose: () => void }) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [matchedPerson, setMatchedPerson] = useState<any>(null);
  
  // Call State
  const [isCalling, setIsCalling] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number | "">("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isManuallyEdited, setIsManuallyEdited] = useState(false);
  
  // Outcome State (Only shown if tracking)
  const [outcome, setOutcome] = useState("Connected - Good Interaction");
  
  const { currentUser } = useAuth();
  const allPeople = useLiveQuery(() => db.people.toArray(), []);

  // Search for person whenever phone number changes
  useEffect(() => {
    if (!allPeople || phoneNumber.length < 8) {
      setMatchedPerson(null);
      return;
    }
    
    // Clean phone number for searching
    const cleanSearch = phoneNumber.replace(/\D/g, '').slice(-10);
    
    const match = allPeople.find(p => {
      const pPhone = p.phone.replace(/\D/g, '').slice(-10);
      return pPhone === cleanSearch;
    });
    
    setMatchedPerson(match || null);
  }, [phoneNumber, allPeople]);

  // Handle return from native dialer & live timer
  useEffect(() => {
    if (!isCalling || !startTime) return;

    const updateTimer = () => {
      const elapsedMs = Date.now() - startTime;
      const totalSecs = Math.floor(elapsedMs / 1000);
      setElapsedSeconds(totalSecs);
      
      if (!isManuallyEdited) {
        setDurationMinutes(Math.max(1, Math.ceil(totalSecs / 60)));
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        updateTimer();
      }
    };
    
    const interval = setInterval(updateTimer, 1000);

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, [isCalling, startTime, isManuallyEdited]);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleCall = () => {
    if (!phoneNumber) return;
    setIsCalling(true);
    setStartTime(Date.now());
    window.location.href = `tel:${phoneNumber}`;
  };

  const handleSaveTrack = async () => {
    // If they matched a person, we log it against them!
    const targetPersonId = matchedPerson ? matchedPerson.id : "UNSAVED_CALL";
    
    await db.interactions.add({
      personId: targetPersonId as any,
      type: 'CALL',
      date: new Date(),
      outcome: outcome,
      notes: "Logged via Quick Dialer",
      ...(typeof durationMinutes === 'number' ? { durationMinutes } : {}),
      creatorId: currentUser?.id
    });
    
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>📞 Quick Dialer</h2>
          <button onClick={onClose} className={styles.closeBtn}><X size={20} /></button>
        </div>

        <div className={styles.form}>
          {!isCalling ? (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>Enter Phone Number</label>
                <input 
                  type="tel"
                  className={styles.input} 
                  value={phoneNumber} 
                  onChange={e => setPhoneNumber(e.target.value)} 
                  placeholder="e.g. 9876543210"
                  autoFocus
                />
              </div>

              {matchedPerson && (
                <div style={{ padding: 12, background: 'var(--color-primary-light)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <UserIcon size={20} style={{ color: 'var(--color-primary)' }} />
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{matchedPerson.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Saved Contact Found</div>
                  </div>
                </div>
              )}

              <button 
                type="button" 
                className={`${styles.btn} ${styles.btnSave}`} 
                onClick={handleCall}
                disabled={!phoneNumber}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <Phone size={18} /> Dial Number
              </button>
            </>
          ) : (
            <>
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <Phone size={48} style={{ color: 'var(--color-primary)', marginBottom: 16, animation: 'pulse 2s infinite' }} />
                <h3>Call in progress...</h3>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-text)', margin: '16px 0', fontFamily: 'monospace' }}>
                  {formatTime(elapsedSeconds)}
                </div>
                <p style={{ color: 'var(--color-text-muted)' }}>Timer continues running in the background.</p>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Call Duration (minutes)</label>
                <input 
                  type="number"
                  min="0"
                  className={styles.input} 
                  value={durationMinutes}
                  onChange={e => {
                    setIsManuallyEdited(true);
                    setDurationMinutes(e.target.value ? Number(e.target.value) : "");
                  }}
                  placeholder="e.g. 5"
                />
                {!isManuallyEdited && elapsedSeconds > 0 && (
                  <small style={{ color: 'var(--color-primary)', marginTop: 4, display: 'block' }}>
                    Auto-tracking based on live timer.
                  </small>
                )}
              </div>

              {matchedPerson && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Outcome</label>
                  <select 
                    className={styles.input}
                    value={outcome}
                    onChange={e => setOutcome(e.target.value)}
                  >
                    <option value="Connected - Good Interaction">Connected - Good</option>
                    <option value="Connected - Busy">Connected - Busy</option>
                    <option value="No Answer">No Answer</option>
                    <option value="Switched Off">Switched Off</option>
                    <option value="Wrong Number">Wrong Number</option>
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button type="button" onClick={onClose} className={styles.cancelBtn} style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--color-text)' }}>
                  Discard
                </button>
                <button type="button" onClick={handleSaveTrack} className={`${styles.btn} ${styles.btnSave}`} style={{ flex: 1 }}>
                  Save Time
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
