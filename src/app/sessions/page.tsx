"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Calendar, MapPin, X } from "lucide-react";
import styles from "./Sessions.module.css";
import { firestoreAPI, useFirestoreQuery, useFirestoreDoc } from "@/lib/firestore";
import { where } from "firebase/firestore";;
import { format } from "date-fns";
import { GlassSelect } from "@/components/ui/GlassSelect";

export default function SessionsPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("Weekly Session");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [autoAddCount, setAutoAddCount] = useState<number>(0);

  const sessions = useLiveQuery(() => db.sessions.reverse().sortBy('date'));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !date) return;
    
    try {
      const sessionId = await db.sessions.add({
        name,
        type,
        date: new Date(date),
        location,
      });

      if (autoAddCount > 0) {
        const users = await db.users.toArray();
        const recordsToInsert = [];

        for (const user of users) {
          const userContacts = await db.people.where('ownerId').equals(user.id!).toArray();
          userContacts.sort((a, b) => b.priorityScore - a.priorityScore);
          
          const topContacts = userContacts.slice(0, autoAddCount);
          for (const contact of topContacts) {
            recordsToInsert.push({
              sessionId: sessionId as number,
              personId: contact.id!,
              status: 'PENDING_CALL' as const,
              assignedUserId: user.id!
            });
          }
        }
        
        if (recordsToInsert.length > 0) {
          await db.sessionAttendance.bulkAdd(recordsToInsert);
        }
      }

      setShowAddModal(false);
      setName("");
      setDate("");
      setLocation("");
      setAutoAddCount(0);
    } catch (err) {
      console.error(err);
      alert("Failed to save session");
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Sessions</h1>
      </header>

      <div className={styles.list}>
        {sessions === undefined ? (
          <p className={styles.emptyState}>Loading...</p>
        ) : sessions.length === 0 ? (
          <div className={styles.emptyState}>No sessions created yet.</div>
        ) : (
          sessions.map(session => (
            <Link href={`/sessions/${session.id}`} key={session.id} className={styles.card}>
              <div className={styles.cardTitle}>{session.name}</div>
              <div className={styles.cardMeta}>
                <div className={styles.metaItem}>
                  <Calendar size={14} /> 
                  {format(new Date(session.date), "MMM d, yyyy h:mm a")}
                </div>
                {session.location && (
                  <div className={styles.metaItem}>
                    <MapPin size={14} /> {session.location}
                  </div>
                )}
              </div>
            </Link>
          ))
        )}
      </div>

      <button 
        className={styles.fab} 
        onClick={() => setShowAddModal(true)}
      >
        <Plus size={28} />
      </button>

      {showAddModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.title}>New Session</h2>
              <button onClick={() => setShowAddModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className={styles.formGroup}>
                <label>Session Name *</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  required 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Sunday Special Session"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Type</label>
                <GlassSelect 
                  value={type} 
                  onChange={val => setType(val)}
                  options={[
                    { value: "Weekly Session", label: "Weekly Session" },
                    { value: "Special Session", label: "Special Session" },
                    { value: "College Session", label: "College Session" },
                    { value: "Other", label: "Other" }
                  ]}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Date & Time *</label>
                <input 
                  type="datetime-local" 
                  className={styles.input} 
                  required 
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Location</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Auto-Add Top Contacts (per Member)</label>
                <input 
                  type="number" 
                  className={styles.input} 
                  value={autoAddCount}
                  onChange={e => setAutoAddCount(Number(e.target.value))}
                  placeholder="e.g. 50"
                  min="0"
                />
              </div>
              <button type="submit" className={styles.btnSave}>Create Session</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
