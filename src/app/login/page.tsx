// @ts-nocheck
"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./Login.module.css";
import { LogIn, ArrowRight } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";

export default function LoginPage() {
  const { login, signup } = useAuth();
  
  const [isLoginView, setIsLoginView] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [name, setName] = useState("");
  const [teamType, setTeamType] = useState<'create' | 'join'>('create');
  const [teamName, setTeamName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to login. Check credentials.");
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      let assignedTeamId = "";

      // Firebase team handling
      if (teamType === 'create') {
        if (!teamName) throw new Error("Team Name is required.");
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        // Create team in Firestore
        const teamRef = await addDoc(collection(db, 'teams'), {
          name: teamName,
          inviteCode: code,
          // leaderId will be updated later if needed, but for now we rely on user role
        });
        assignedTeamId = teamRef.id;
      } else {
        if (!inviteCode) throw new Error("Invite Code is required.");
        
        // Find team by invite code in Firestore
        const q = query(collection(db, 'teams'), where('inviteCode', '==', inviteCode));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          throw new Error("Invalid Invite Code. Team not found.");
        }
        
        assignedTeamId = querySnapshot.docs[0].id;
      }

      await signup(
        email, 
        password, 
        name, 
        teamType === 'create' ? 'LEADER' : 'MEMBER', 
        assignedTeamId
      );

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to sign up.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logoContainer}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="FOLKReach Logo" className={styles.logoImage} />
        </div>
        
        <h1 className={styles.title}>{isLoginView ? "Welcome Back" : "Join FOLKReach"}</h1>
        <p className={styles.subtitle}>
          {isLoginView ? "Enter your credentials to continue" : "Create an account to manage your outreach"}
        </p>

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: '0.9rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            {error}
          </div>
        )}

        {isLoginView ? (
          <form onSubmit={handleLogin}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Email Address</label>
              <input 
                type="email" 
                className={styles.input} 
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Password</label>
              <input 
                type="password" 
                className={styles.input} 
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
              {isSubmitting ? "Logging in..." : <><LogIn size={18} /> Log In</>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Full Name</label>
              <input 
                type="text" 
                className={styles.input} 
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Email Address</label>
              <input 
                type="email" 
                className={styles.input} 
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Password</label>
              <input 
                type="password" 
                className={styles.input} 
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className={styles.formGroup} style={{ marginTop: 12 }}>
              <label className={styles.label}>Are you creating a team or joining one?</label>
              <select 
                className={styles.input}
                value={teamType}
                onChange={(e) => setTeamType(e.target.value as 'create' | 'join')}
                style={{ cursor: 'pointer', appearance: 'auto' }}
              >
                <option value="create">Create a New Team (Become Leader)</option>
                <option value="join">Join Existing Team (Become Member)</option>
              </select>
            </div>

            {teamType === 'create' ? (
              <div className={styles.formGroup}>
                <label className={styles.label}>New Team Name</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  placeholder="e.g. Downtown Outreach"
                  required={teamType === 'create'}
                />
              </div>
            ) : (
              <div className={styles.formGroup}>
                <label className={styles.label}>Team Invite Code</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="e.g. FOLK123"
                  required={teamType === 'join'}
                />
              </div>
            )}

            <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
              {isSubmitting ? "Signing up..." : <><ArrowRight size={18} /> Sign Up</>}
            </button>
          </form>
        )}

        <div className={styles.toggleContainer}>
          {isLoginView ? (
            <>Don't have an account? <button type="button" className={styles.toggleLink} onClick={() => { setIsLoginView(false); setEmail(""); setPassword(""); setError(null); }}>Sign Up</button></>
          ) : (
            <>Already have an account? <button type="button" className={styles.toggleLink} onClick={() => { setIsLoginView(true); setEmail(""); setPassword(""); setError(null); }}>Log In</button></>
          )}
        </div>
      </div>
    </div>
  );
}
