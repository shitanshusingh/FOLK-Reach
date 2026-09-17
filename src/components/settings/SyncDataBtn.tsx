"use client";
// @ts-nocheck
import { useState } from "react";
import Dexie from "dexie";
import { firestoreAPI } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { Database } from "lucide-react";

export function SyncDataBtn() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [status, setStatus] = useState("");
  const { currentUser } = useAuth();

  const handleSync = async () => {
    if (!currentUser) {
      alert("You must be logged in to sync data.");
      return;
    }

    const confirmSync = confirm(
      "This will scan your browser's local hard drive for old offline data (created before the Cloud upgrade) and permanently upload it to Firebase so your team can see it. Proceed?"
    );
    if (!confirmSync) return;

    setIsSyncing(true);
    setStatus("Connecting to local offline database...");

    try {
      const localDb = new Dexie('crm_db');
      localDb.version(1).stores({
        people: '++id, name, phone, tags, lastInteractionDate, priorityScore',
        interactions: '++id, personId, type, date',
        sessions: '++id, date',
        sessionAttendance: '++id, sessionId, personId',
        tasks: '++id, personId, status, dueDate',
      });

      // 1. Sync Sessions
      setStatus("Syncing Sessions...");
      const localSessions = await localDb.table('sessions').toArray();
      let sessionsCount = 0;
      for (const session of localSessions) {
        const { id, ...data } = session;
        if (!data.ownerId) data.ownerId = currentUser.id;
        if (!data.teamId && currentUser.teamId) data.teamId = currentUser.teamId;
        await firestoreAPI.add('sessions', data);
        sessionsCount++;
      }

      // 2. Sync People (Contacts)
      setStatus("Syncing Contacts...");
      const localPeople = await localDb.table('people').toArray();
      let peopleCount = 0;
      for (const person of localPeople) {
        const { id, ...data } = person;
        if (!data.assignedUserId) data.assignedUserId = currentUser.id;
        if (!data.ownerId) data.ownerId = currentUser.id;
        await firestoreAPI.add('people', data);
        peopleCount++;
      }

      // 3. Sync Interactions
      setStatus("Syncing Interactions...");
      const localInteractions = await localDb.table('interactions').toArray();
      let interactionsCount = 0;
      for (const interaction of localInteractions) {
        const { id, ...data } = interaction;
        await firestoreAPI.add('interactions', data);
        interactionsCount++;
      }

      setStatus(`Success! Uploaded ${sessionsCount} sessions, ${peopleCount} contacts, and ${interactionsCount} interactions to the Cloud.`);
      
    } catch (err: any) {
      console.error(err);
      setStatus(`Failed to sync: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div style={{ padding: '24px', background: 'var(--color-surface)', borderRadius: '16px', border: '1px solid var(--color-border)', marginBottom: '24px' }}>
      <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Database size={20} color="var(--color-primary)" />
        Sync Offline Data to Cloud
      </h3>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '16px', lineHeight: 1.5, fontSize: '0.9rem' }}>
        If you created any Sessions, Contacts, or Calls before the recent Cloud upgrade, they are trapped on your local computer. 
        Click this button to instantly upload all your local offline data to the Cloud so the Super Admin and your Residence team can see it!
      </p>
      
      {status && (
        <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(124, 58, 237, 0.1)', color: 'var(--color-primary)', borderRadius: '8px', fontSize: '0.9rem' }}>
          {status}
        </div>
      )}

      <button 
        onClick={handleSync}
        disabled={isSyncing}
        style={{
          background: 'var(--color-primary)',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '8px',
          cursor: isSyncing ? 'not-allowed' : 'pointer',
          fontWeight: 600,
          opacity: isSyncing ? 0.7 : 1
        }}
      >
        {isSyncing ? "Uploading to Cloud..." : "Upload Local Data"}
      </button>
    </div>
  );
}
