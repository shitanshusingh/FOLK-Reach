"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { firestoreAPI } from '@/lib/firestore';
import { Compass } from 'lucide-react';
import { GlassSelect } from './GlassSelect';

export function MigrationModal() {
  const { currentUser, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  
  const [guides, setGuides] = useState<any[]>([]);
  const [residences, setResidences] = useState<any[]>([]);
  
  const [selectedGuideId, setSelectedGuideId] = useState("");
  const [selectedResidenceId, setSelectedResidenceId] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setIsOpen(false);
      return;
    }
    
    // Check if migration is needed
    const oldRoles = ['ADMIN', 'LEADER', 'MEMBER'];
    const isOldRole = oldRoles.includes(currentUser.role);
    const missingGuide = !currentUser.guideId;
    
    // Super admins and guides don't need this migration
    if (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'FOLK_GUIDE') {
      setIsOpen(false);
      return;
    }

    if (isOldRole || missingGuide) {
      setIsOpen(true);
      fetchData();
    } else {
      setIsOpen(false);
    }
  }, [currentUser]);

  const fetchData = async () => {
    try {
      const guidesSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'FOLK_GUIDE')));
      setGuides(guidesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      const residencesSnap = await getDocs(collection(db, 'teams'));
      setResidences(residencesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error fetching migration data:", err);
    }
  };

  const handleMigrate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuideId || !selectedResidenceId || !currentUser) return;
    
    setIsSubmitting(true);
    try {
      // Update the user's role and pointers in Firestore
      await setDoc(doc(db, 'users', currentUser.id), {
        role: 'RESIDENT',
        guideId: selectedGuideId,
        teamId: selectedResidenceId
      }, { merge: true });
      
      // Force reload to update context
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Failed to migrate account. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: 24
    }}>
      <div style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 24,
        padding: 32,
        maxWidth: 500,
        width: '100%',
        border: '1px solid var(--color-border)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          width: 64, height: 64,
          borderRadius: 32,
          backgroundColor: 'rgba(124, 58, 237, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
          color: 'var(--color-primary)'
        }}>
          <Compass size={32} />
        </div>
        
        <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: 12, color: 'var(--color-text)' }}>
          Welcome to the new structure!
        </h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 24, lineHeight: 1.6 }}>
          We have upgraded FOLKReach. To continue using the app without losing any of your contacts or data, please select your Folk Guide and Folk Residence below.
        </p>
        
        <form onSubmit={handleMigrate} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)' }}>
              Select your Folk Guide
            </label>
            <GlassSelect 
              value={selectedGuideId}
              onChange={(val) => {
                setSelectedGuideId(val);
                setSelectedResidenceId("");
              }}
              options={[
                { value: "", label: "-- Choose a Folk Guide --" },
                ...guides.map(g => ({ value: g.id, label: g.name }))
              ]}
            />
          </div>

          {selectedGuideId && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)' }}>
                Select your Folk Residence
              </label>
              <GlassSelect 
                value={selectedResidenceId}
                onChange={setSelectedResidenceId}
                options={[
                  { value: "", label: "-- Choose a Residence --" },
                  ...residences.filter(r => r.guideId === selectedGuideId).map(r => ({ value: r.id, label: r.name }))
                ]}
              />
              {residences.filter(r => r.guideId === selectedGuideId).length === 0 && (
                <p style={{ fontSize: '0.85rem', color: 'var(--color-warning)' }}>
                  This guide hasn't created any residences yet.
                </p>
              )}
            </div>
          )}

          <button 
            type="submit" 
            disabled={!selectedGuideId || !selectedResidenceId || isSubmitting}
            style={{
              marginTop: 12,
              background: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              padding: '14px',
              borderRadius: 12,
              fontWeight: 600,
              fontSize: '1rem',
              cursor: (!selectedGuideId || !selectedResidenceId || isSubmitting) ? 'not-allowed' : 'pointer',
              opacity: (!selectedGuideId || !selectedResidenceId || isSubmitting) ? 0.5 : 1
            }}
          >
            {isSubmitting ? 'Migrating Account...' : 'Continue to Dashboard'}
          </button>
          
          <button 
            type="button" 
            onClick={logout}
            style={{
              background: 'transparent',
              color: 'var(--color-text-muted)',
              border: 'none',
              padding: '8px',
              fontWeight: 500,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Sign out of this account for now
          </button>
        </form>
      </div>
    </div>
  );
}
