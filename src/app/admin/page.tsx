"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import { useLiveQuery } from '@/lib/firestore';
import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore';
import { ShieldCheck, UserPlus, Users, Eye, EyeOff, KeyRound } from 'lucide-react';
import styles from './Admin.module.css';

// Firebase imports for creating secondary app
import { initializeApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { firebaseConfig, db as firebaseDb } from '@/lib/firebase';

export default function SuperAdminPage() {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const folkGuides = useLiveQuery(async () => {
    return await db.users.where('role').equals('FOLK_GUIDE').toArray();
  }, []);

  const allResidences = useLiveQuery(async () => {
    return await db.teams.toArray();
  }, []);

  useEffect(() => {
    if (!isLoading && (!currentUser || currentUser.role !== 'SUPER_ADMIN')) {
      router.push('/');
    }
  }, [currentUser, isLoading, router]);

  if (isLoading || !currentUser || currentUser.role !== 'SUPER_ADMIN') {
    return <div className={styles.container}>Loading Super Admin Panel...</div>;
  }

  const handleResetPassword = async (email: string) => {
    try {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, email);
      alert(`A password reset email has been sent to ${email}`);
    } catch (err: any) {
      console.error(err);
      alert(`Error sending reset email: ${err.message}`);
    }
  };

  const handleCreateGuide = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Create secondary app to avoid logging out Super Admin
      const secondaryAppName = `SecondaryApp_${Date.now()}`;
      const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);
      
      let uid = '';
      try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        uid = userCredential.user.uid;
      } catch (authErr: any) {
        if (authErr.code === 'auth/email-already-in-use') {
          // It was partially created before (auth exists, but maybe firestore doc failed).
          // Let's try to sign in to get the UID and repair it!
          try {
            const signInCred = await signInWithEmailAndPassword(secondaryAuth, email, password);
            uid = signInCred.user.uid;
          } catch (signInErr) {
            throw new Error("This email is already registered and the password doesn't match, so we cannot overwrite it.");
          }
        } else if (authErr.code === 'auth/weak-password') {
          throw new Error("Password must be at least 6 characters.");
        } else {
          throw authErr;
        }
      }
      
      // Save user to Firestore with the same UID
      await setDoc(doc(firebaseDb, 'users', uid), {
        name,
        email,
        role: 'FOLK_GUIDE'
      });
      
      // Clean up the secondary app
      await secondaryAuth.signOut();
      
      const successMessage = `Folk Guide created successfully!\n\nEmail ID: ${email}\nPassword: ${password}\n\nYou can now share these credentials with the Folk Guide.`;
      
      setName('');
      setEmail('');
      setPassword('');
      alert(successMessage);
    } catch (err: any) {
      console.error(err);
      alert(`Error creating Folk Guide: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <ShieldCheck className={styles.titleIcon} size={32} /> 
          Super Admin Dashboard
        </h1>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Folk Guides</div>
          <div className={styles.statValue}>{folkGuides?.length || 0}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Folk Residences</div>
          <div className={styles.statValue}>{allResidences?.length || 0}</div>
        </div>
      </div>

      <div className={styles.panel}>
        <h2 className={styles.panelTitle}><UserPlus size={20} /> Create New Folk Guide</h2>
        <form onSubmit={handleCreateGuide} className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>Name</label>
            <input 
              type="text" 
              required 
              className={styles.input}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Radheshyam Prabhu"
            />
          </div>
          <div className={styles.formGroup}>
            <label>Email Address</label>
            <input 
              type="email" 
              required 
              className={styles.input}
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="guide@folk.in"
            />
          </div>
          <div className={styles.formGroup}>
            <label>Password</label>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  className={styles.input}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Secure Password"
                  style={{ width: '100%' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <button type="submit" className={styles.btn} disabled={isSubmitting} style={{ whiteSpace: 'nowrap' }}>
                {isSubmitting ? 'Creating...' : 'Create Guide'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className={styles.panel}>
        <h2 className={styles.panelTitle}><Users size={20} /> Active Folk Guides</h2>
        
        {folkGuides && folkGuides.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Residences Overseen</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {folkGuides.map(guide => {
                const residencesCount = allResidences?.filter(r => r.guideId === guide.id).length || 0;
                return (
                  <tr key={guide.id}>
                    <td><strong>{guide.name}</strong></td>
                    <td>{guide.email}</td>
                    <td>{residencesCount} Residences</td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        onClick={() => handleResetPassword(guide.email)}
                        className={styles.btnSecondary}
                        style={{ padding: '6px 12px', fontSize: '0.875rem' }}
                        title="Send Password Reset Email"
                      >
                        <KeyRound size={14} style={{ marginRight: 6, display: 'inline-block', verticalAlign: 'middle' }} />
                        Reset Password
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className={styles.emptyState}>No Folk Guides have been created yet.</div>
        )}
      </div>
    </div>
  );
}
