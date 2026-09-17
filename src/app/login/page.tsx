"use client";
// @ts-nocheck

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./Login.module.css";
import { LogIn, ArrowRight, Eye, EyeOff } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);
  
  const [name, setName] = useState("");
  const [guides, setGuides] = useState<any[]>([]);
  const [residences, setResidences] = useState<any[]>([]);
  
  const [selectedGuideId, setSelectedGuideId] = useState("");
  const [selectedResidenceId, setSelectedResidenceId] = useState("");



  useEffect(() => {
    // Fetch guides and residences once on mount for the signup form
    const fetchSignupData = async () => {
      try {
        const guidesSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'FOLK_GUIDE')));
        setGuides(guidesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        
        const residencesSnap = await getDocs(collection(db, 'teams')); // teams = Folk Residences
        setResidences(residencesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error fetching signup data:", err);
      }
    };
    fetchSignupData();
  }, []);

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
      if (!selectedGuideId) throw new Error("Please select a Folk Guide.");
      if (!selectedResidenceId) throw new Error("Please select a Folk Residence.");

      await signup(
        email, 
        password, 
        name, 
        'RESIDENT', 
        selectedResidenceId,
        selectedGuideId
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
              <div style={{ position: 'relative', width: '100%' }}>
                <input 
                  type={showPassword ? "text" : "password"} 
                  className={styles.input} 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ width: '100%', paddingRight: '40px' }}
                  required
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
              <div style={{ position: 'relative', width: '100%' }}>
                <input 
                  type={showPassword ? "text" : "password"} 
                  className={styles.input} 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ width: '100%', paddingRight: '40px' }}
                  required
                  minLength={6}
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
            </div>

            <div className={styles.formGroup} style={{ marginTop: 12 }}>
              <label className={styles.label}>Select Folk Guide</label>
              <select 
                className={styles.input}
                value={selectedGuideId}
                onChange={(e) => {
                  setSelectedGuideId(e.target.value);
                  setSelectedResidenceId(""); // Reset residence when guide changes
                }}
                required
                style={{ cursor: 'pointer', appearance: 'auto' }}
              >
                <option value="">-- Choose a Folk Guide --</option>
                {guides.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            {selectedGuideId && (
              <div className={styles.formGroup}>
                <label className={styles.label}>Select Folk Residence</label>
                <select 
                  className={styles.input}
                  value={selectedResidenceId}
                  onChange={(e) => setSelectedResidenceId(e.target.value)}
                  required
                  style={{ cursor: 'pointer', appearance: 'auto' }}
                >
                  <option value="">-- Choose a Residence --</option>
                  {residences.filter(r => r.guideId === selectedGuideId).map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                {residences.filter(r => r.guideId === selectedGuideId).length === 0 && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-warning)', marginTop: 4 }}>
                    This guide has no active residences yet.
                  </p>
                )}
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
