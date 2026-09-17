"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import { firestoreAPI, useLiveQuery } from '@/lib/firestore';
import { Compass, Home, Users } from 'lucide-react';
import styles from './Guide.module.css';
import { GlassSelect } from '@/components/ui/GlassSelect';

export default function FolkGuidePage() {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();
  
  const [residenceName, setResidenceName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const residences = useLiveQuery(async () => {
    if (!currentUser) return [];
    return await db.teams.where('guideId').equals(currentUser.id).toArray();
  }, [currentUser?.id]);

  const users = useLiveQuery(async () => {
    if (!currentUser) return [];
    return await db.users.where('guideId').equals(currentUser.id).toArray();
  }, [currentUser?.id]);

  const contacts = useLiveQuery(async () => {
    if (!users) return [];
    const userIds = new Set(users.map(u => u.id));
    const allPeople = await db.people.toArray();
    return allPeople.filter(p => userIds.has(String(p.ownerId)));
  }, [users]);

  useEffect(() => {
    if (!isLoading && (!currentUser || currentUser.role !== 'FOLK_GUIDE')) {
      router.push('/');
    }
  }, [currentUser, isLoading, router]);

  if (isLoading || !currentUser || currentUser.role !== 'FOLK_GUIDE') {
    return <div className={styles.container}>Loading Folk Guide Panel...</div>;
  }

  const handleCreateResidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!residenceName) return;
    setIsSubmitting(true);
    
    try {
      await firestoreAPI.add('teams', {
        name: residenceName,
        guideId: currentUser.id,
        leaderId: '' // No leader assigned yet
      });
      setResidenceName('');
    } catch (err: any) {
      console.error(err);
      alert(`Error creating Folk Residence: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignLeader = async (residenceId: string | number, userId: string) => {
    try {
      const residence = residences?.find(r => String(r.id) === String(residenceId));
      if (residence?.leaderId && String(residence.leaderId) !== String(userId)) {
        // Demote old leader
        await firestoreAPI.update('users', residence.leaderId, { role: 'RESIDENT' });
      }

      await firestoreAPI.update('teams', residenceId, { leaderId: userId });
      
      if (userId) {
        // Update the new user's role to FOLK_LEADER
        await firestoreAPI.update('users', userId, { role: 'FOLK_LEADER' });
      }
    } catch (err) {
      console.error(err);
      alert("Failed to assign Folk Leader");
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <Compass className={styles.titleIcon} size={32} /> 
          Folk Guide Dashboard
        </h1>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>My Residences</div>
          <div className={styles.statValue}>{residences?.length || 0}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Residents</div>
          <div className={styles.statValue}>{users?.length || 0}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Contacts</div>
          <div className={styles.statValue}>{contacts?.length || 0}</div>
        </div>
      </div>

      <div className={styles.panel}>
        <h2 className={styles.panelTitle}><Home size={20} /> Create Folk Residence</h2>
        <form onSubmit={handleCreateResidence} className={styles.formGroup}>
          <input 
            type="text" 
            required 
            className={styles.input}
            value={residenceName}
            onChange={e => setResidenceName(e.target.value)}
            placeholder="e.g. North Campus Residence"
          />
          <button type="submit" className={styles.btn} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Residence'}
          </button>
        </form>
      </div>

      <h2 className={styles.panelTitle} style={{ marginBottom: 16 }}>Manage Residences</h2>
      <div className={styles.grid}>
        {residences?.map(residence => {
          const residenceUsers = users?.filter(u => String(u.teamId) === String(residence.id)) || [];
          
          return (
            <div key={residence.id} className={styles.card}>
              <h3 className={styles.cardTitle}>{residence.name}</h3>
              <div style={{ marginBottom: 16, color: 'var(--color-text-muted)' }}>
                {residenceUsers.length} Residents joined
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                  Assign Folk Leader:
                </label>
                <GlassSelect 
                  value={String(residence.leaderId || '')}
                  onChange={(val) => handleAssignLeader(residence.id!, val)}
                  options={[
                    { value: "", label: "No Leader Assigned" },
                    ...residenceUsers.map(u => ({ value: String(u.id), label: `${u.name} ${u.role === 'FOLK_LEADER' ? '(Current Leader)' : ''}` }))
                  ]}
                />
              </div>
            </div>
          );
        })}
        {residences?.length === 0 && (
          <div className={styles.emptyState} style={{ gridColumn: '1 / -1' }}>
            You haven't created any Folk Residences yet.
          </div>
        )}
      </div>
    </div>
  );
}
