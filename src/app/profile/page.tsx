"use client";

import { useAuth } from "@/contexts/AuthContext";
import { firestoreAPI, useFirestoreQuery, useFirestoreDoc } from "@/lib/firestore";
import { where } from "firebase/firestore";;
import styles from "./Profile.module.css";
import { ShieldCheck, User as UserIcon, Mail, Users, Key } from "lucide-react";

export default function ProfilePage() {
  const { currentUser } = useAuth();
  
  const team = useLiveQuery(async () => {
    if (!currentUser?.teamId) return null;
    return await db.teams.get(currentUser.teamId);
  }, [currentUser?.teamId]);

  if (!currentUser) {
    return <div className={styles.container}>Loading profile...</div>;
  }

  const initial = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "?";

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>My Profile</h1>
        <p className={styles.subtitle}>View your account details and team information</p>
      </header>

      <div className={styles.card}>
        <div className={styles.profileHeader}>
          <div className={styles.avatar}>{initial}</div>
          <div className={styles.nameInfo}>
            <div className={styles.name}>{currentUser.name}</div>
            <div className={styles.roleBadge}>
              {currentUser.role === 'LEADER' ? (
                <><ShieldCheck size={16} /> Team Leader</>
              ) : (
                <><UserIcon size={16} /> Team Member</>
              )}
            </div>
          </div>
        </div>

        <div className={styles.detailsGrid}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Email Address</span>
            <span className={styles.detailValue}>
              <Mail size={18} style={{ color: 'var(--color-text-muted)' }} />
              {currentUser.email}
            </span>
          </div>

          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Assigned Team</span>
            <span className={styles.detailValue}>
              <Users size={18} style={{ color: 'var(--color-text-muted)' }} />
              {team?.name || 'Loading team...'}
            </span>
          </div>

          {currentUser.role === 'LEADER' && team?.inviteCode && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Team Invite Code</span>
              <span className={styles.detailValue} style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Share this code with your members so they can join your team:</span>
                <span className={styles.codeBox}>{team.inviteCode}</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
