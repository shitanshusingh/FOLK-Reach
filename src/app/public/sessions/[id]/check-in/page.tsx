"use client";

import React, { useState, useMemo } from 'react';
import { db, Person } from "@/lib/db";
import { firestoreAPI, useFirestoreDoc, useLiveQuery } from "@/lib/firestore";
import { Search, UserCheck, UserPlus, Check, ArrowLeft } from 'lucide-react';
import styles from './CheckIn.module.css';
import { GlassSelect } from "@/components/ui/GlassSelect";
import { format } from 'date-fns';

export default function PublicCheckInPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = React.use(params);
  const sessionId = String(unwrappedParams.id);
  
  const [step, setStep] = useState<'WELCOME' | 'SEARCH' | 'REGISTER' | 'ENRICH' | 'SUCCESS'>('WELCOME');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [college, setCollege] = useState('');
  const [branch, setBranch] = useState('');
  const [hostel, setHostel] = useState('');
  const [gender, setGender] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Data
  const session = useFirestoreDoc<any>('sessions', sessionId);
  const team = useFirestoreDoc<any>('teams', session?.teamId || '');
  
  const allPeople = useLiveQuery(async () => {
    return await db.people.toArray();
  }, []);

  const allUsers = useLiveQuery(async () => {
    let users = await db.users.toArray();
    
    // Filter out SUPER_ADMIN
    users = users.filter(u => u.role !== 'SUPER_ADMIN');
    
    // Filter out Hrishikesh Prabhu
    users = users.filter(u => !u.name.toLowerCase().includes('hrishikesh'));
    
    // Only show users belonging to this session's team to make the dropdown cleaner
    if (session?.teamId) {
      users = users.filter(u => String(u.teamId) === String(session.teamId));
    }
    
    // Sort alphabetically for elegance
    users.sort((a, b) => a.name.localeCompare(b.name));
    
    return users;
  }, [session?.teamId]);

  const filteredPeople = useMemo(() => {
    if (!allPeople || searchQuery.length < 2) return [];
    const query = searchQuery.toLowerCase();
    return allPeople.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.phone.includes(query)
    ).slice(0, 10);
  }, [allPeople, searchQuery]);

  const handleSelectPerson = (person: Person) => {
    // Cross-team hard block
    if (person.ownerId) {
       const isOwnerInThisTeam = allUsers?.some((u: any) => String(u.id) === String(person.ownerId));
       if (!isOwnerInThisTeam) {
          alert("You are already registered under a different team. Please contact the front desk.");
          return;
       }
    }
    
    setSelectedPerson(person);
    // Check if missing compulsory fields or missing owner
    if (!person.phone || !person.college || !person.branch || !person.hostel || !person.gender || !person.ownerId) {
      // Pre-fill existing data
      setPhone(person.phone || '');
      setCollege(person.college || '');
      setBranch(person.branch || '');
      setHostel(person.hostel || '');
      setGender(person.gender || '');
      setAssignedUserId(person.ownerId || '');
      setStep('ENRICH');
    } else {
      handleCheckIn(person.id as number);
    }
  };

  const handleCheckIn = async (personId: string | number) => {
    setIsSubmitting(true);
    try {
      // Check if already in attendance
      const existingRecords = await db.sessionAttendance.where('sessionId').equals(sessionId).toArray();
      const record = existingRecords.find((r: any) => String(r.personId) === String(personId));

      if (record) {
        await db.sessionAttendance.update(record.id, {
          status: 'ATTENDED',
          checkedInAt: new Date()
        });
      } else {
        const person = await db.people.get(personId);
        await db.sessionAttendance.add({
          sessionId,
          personId,
          status: 'ATTENDED',
          isNewContact: false,
          assignedUserId: person?.ownerId || null,
          checkedInAt: new Date()
        });
      }
      const person = await db.people.get(personId);
      if (person) {
        await db.people.update(person.id, { priorityScore: (person.priorityScore || 0) + 5 });
      }
      await db.interactions.add({
        personId: personId,
        type: 'SESSION',
        date: new Date(),
        outcome: `Attended Session: ${session?.name || session?.title || 'Session'}`,
        notes: `Checked in via public registration page at ${format(new Date(), "h:mm a")}`
      });
      setStep('SUCCESS');
    } catch (err: any) {
      console.error(err);
      alert("Failed to check in: " + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnrichSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson) return;
    
    if (!selectedPerson.ownerId && !assignedUserId) {
      alert("Please select who you are in touch with.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const updates: any = { phone, college, branch, hostel, gender };
      if (!selectedPerson.ownerId) {
        updates.ownerId = assignedUserId;
        updates.assignedUserId = assignedUserId;
      }
      
      await db.people.update(selectedPerson.id, updates);
      await handleCheckIn(selectedPerson.id);
    } catch (err: any) {
      console.error(err);
      alert("Failed to update profile: " + (err.message || err));
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedUserId) {
      alert("Please select who you are in touch with.");
      return;
    }
    setIsSubmitting(true);
    try {
      // 1. DEDUPLICATION CHECK
      const normalizePhone = (p: string) => (p || '').replace(/\D/g, '').slice(-10);
      const normalizedInput = normalizePhone(phone);
      const allPeople = await db.people.toArray();
      const existingMatches = allPeople.filter((p: any) => normalizePhone(p.phone) === normalizedInput);
      const existingMatch = existingMatches.length > 0 ? existingMatches[0] : null;
      
      let finalPersonId = null;
      let ownerId = assignedUserId;

      if (existingMatch) {
        // Cross-team hard block
        if (existingMatch.ownerId) {
           const isOwnerInThisTeam = allUsers?.some((u: any) => String(u.id) === String(existingMatch.ownerId));
           if (!isOwnerInThisTeam) {
              alert("You are already registered under a different team. Please contact the front desk.");
              setIsSubmitting(false);
              return;
           }
        }

        // Merge Data
        await db.people.update(existingMatch.id, {
          name, 
          college: college || existingMatch.college,
          branch: branch || existingMatch.branch,
          hostel: hostel || existingMatch.hostel,
          gender: gender || existingMatch.gender
        });
        finalPersonId = existingMatch.id;
        
        // STRICTLY preserve their existing owner if they are already in the database
        if (existingMatch.ownerId) {
          ownerId = existingMatch.ownerId;
        }
      }

      if (!existingMatch) {
        // Create New Person
        finalPersonId = await db.people.add({
          name, phone, college, branch, hostel, gender,
          priorityScore: 0,
          tags: [],
          firstContactDate: new Date(),
          ownerId: ownerId,
          assignedUserId: ownerId
        });
      }

      // Check them in
      await db.sessionAttendance.add({
        sessionId,
        personId: finalPersonId,
        status: 'ATTENDED',
        isNewContact: !existingMatch,
        assignedUserId: ownerId,
        checkedInAt: new Date()
      });
      
      if (existingMatch) {
        await db.people.update(finalPersonId, { priorityScore: (existingMatch.priorityScore || 0) + 5 });
      } else {
        await db.people.update(finalPersonId, { priorityScore: 5 });
      }
      await db.interactions.add({
        personId: finalPersonId,
        type: 'SESSION',
        date: new Date(),
        outcome: `Attended Session: ${session?.name || session?.title || 'Session'}`,
        notes: `Registered and checked in via public registration page at ${format(new Date(), "h:mm a")}`
      });

      setStep('SUCCESS');
    } catch (err: any) {
      console.error(err);
      alert("Registration failed: " + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session) return <div className={styles.container}>Loading...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.backgroundOrbs}>
        <div className={styles.orb1}></div>
        <div className={styles.orb2}></div>
      </div>

      <div className={styles.contentWrapper}>
        
        {step !== 'WELCOME' && step !== 'SUCCESS' && (
          <button className={styles.backBtn} onClick={() => setStep('WELCOME')}>
            <ArrowLeft size={20} /> Back
          </button>
        )}

        <div className={styles.header}>
          <div className={styles.sessionType}>{session.type || 'Session Check-in'}</div>
          <h1 className={styles.title}>{session.name}</h1>
          <div className={styles.meta}>
            <div className={styles.metaItem}>
              {session.date ? format(new Date(session.date.toDate ? session.date.toDate() : session.date), "MMM d, yyyy h:mm a") : ''}
            </div>
          </div>
        </div>

        {step === 'WELCOME' && (
          <div className={styles.optionsGrid}>
            <div className={styles.optionCard} onClick={() => setStep('SEARCH')}>
              <div className={styles.optionIcon}>
                <UserCheck size={32} />
              </div>
              <div className={styles.optionText}>
                <div className={styles.optionTitle}>I have attended before</div>
                <div className={styles.optionSubtitle}>Find your name and quickly check in.</div>
              </div>
            </div>

            <div className={styles.optionCard} onClick={() => setStep('REGISTER')}>
              <div className={styles.optionIcon}>
                <UserPlus size={32} />
              </div>
              <div className={styles.optionText}>
                <div className={styles.optionTitle}>I am a new visitor</div>
                <div className={styles.optionSubtitle}>Register your details to join us.</div>
              </div>
            </div>
          </div>
        )}

        {step === 'SEARCH' && (
          <div className={styles.glassPanel}>
            <h2 style={{ color: 'white', marginBottom: 24, fontSize: '1.5rem' }}>Welcome back!</h2>
            <div className={styles.searchWrapper}>
              <Search className={styles.searchIcon} size={20} />
              <input 
                type="text" 
                className={styles.searchInput}
                placeholder="Search your name or phone number..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            {searchQuery.length >= 2 && (
              <div className={styles.searchResults}>
                {filteredPeople.map(p => (
                  <div key={p.id} className={styles.resultCard} onClick={() => handleSelectPerson(p as Person)}>
                    <div className={styles.resultName}>{p.name}</div>
                    <div className={styles.resultPhone}>{p.phone} {p.college ? `• ${p.college}` : ''}</div>
                  </div>
                ))}
                {filteredPeople.length === 0 && (
                  <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>
                    No matching profile found.<br/>
                    <button 
                      onClick={() => setStep('REGISTER')}
                      style={{ background: 'none', border: 'none', color: '#7c3aed', fontWeight: 600, marginTop: 8, cursor: 'pointer', fontSize: '1rem' }}
                    >
                      Register as a new visitor instead?
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 'ENRICH' && selectedPerson && (
          <div className={styles.glassPanel}>
            <h2 style={{ color: 'white', marginBottom: 8, fontSize: '1.5rem' }}>Complete Profile</h2>
            <p style={{ color: '#94a3b8', marginBottom: 24, fontSize: '0.9rem' }}>
              Hi {selectedPerson.name}, please fill in these missing details to complete your check-in.
            </p>
            <form onSubmit={handleEnrichSubmit}>
              <div className={styles.formGroup}>
                <label>Phone Number *</label>
                <input type="tel" className={styles.input} required value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label>College *</label>
                <input type="text" className={styles.input} required value={college} onChange={e => setCollege(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label>Branch *</label>
                <input type="text" className={styles.input} required value={branch} onChange={e => setBranch(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label>Hostel *</label>
                <input type="text" className={styles.input} required value={hostel} onChange={e => setHostel(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label>Gender *</label>
                <GlassSelect value={gender} onChange={val => setGender(val)} options={[
                  { value: "", label: "Select Gender" },
                  { value: "Male", label: "Male" },
                  { value: "Female", label: "Female" }
                ]} />
              </div>
              
              {!selectedPerson.ownerId && (
                <div className={styles.formGroup}>
                  <label className={styles.detailLabel}>Who are you in touch with? *</label>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: '8px' }}>
                    Select the person who invited you or who you interact with.
                  </div>
                  <GlassSelect 
                    value={assignedUserId}
                    onChange={setAssignedUserId}
                    options={allUsers?.map(u => ({ value: u.id!.toString(), label: u.name })) || []}
                  />
                </div>
              )}
              <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                {isSubmitting ? 'Checking in...' : 'Save & Check In'}
              </button>
            </form>
          </div>
        )}

        {step === 'REGISTER' && (
          <div className={styles.glassPanel}>
            <h2 style={{ color: 'white', marginBottom: 24, fontSize: '1.5rem' }}>New Registration</h2>
            <form onSubmit={handleRegisterSubmit}>
              <div className={styles.formGroup}>
                <label>Full Name *</label>
                <input type="text" className={styles.input} required value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label>Phone Number *</label>
                <input type="tel" className={styles.input} required value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label>College *</label>
                <input type="text" className={styles.input} required value={college} onChange={e => setCollege(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label>Branch *</label>
                <input type="text" className={styles.input} required value={branch} onChange={e => setBranch(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label>Hostel *</label>
                <input type="text" className={styles.input} required value={hostel} onChange={e => setHostel(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label>Gender *</label>
                <GlassSelect value={gender} onChange={val => setGender(val)} options={[
                  { value: "", label: "Select Gender" },
                  { value: "Male", label: "Male" },
                  { value: "Female", label: "Female" }
                ]} />
              </div>
              <div className={styles.formGroup}>
                <label>Who are you in touch with? *</label>
                <GlassSelect value={assignedUserId} onChange={val => setAssignedUserId(val)} options={[
                  { value: "", label: "Select a member" },
                  ...(allUsers?.map(u => ({ value: String(u.id), label: u.name })) || [])
                ]} />
              </div>
              <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                {isSubmitting ? 'Registering...' : 'Complete Registration'}
              </button>
            </form>
          </div>
        )}

        {step === 'SUCCESS' && (
          <div className={styles.glassPanel} style={{ textAlign: 'center' }}>
            <div className={styles.successIcon}>
              <Check size={40} />
            </div>
            <h2 style={{ color: 'white', marginBottom: 12, fontSize: '1.8rem' }}>Checked In!</h2>
            <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>
              Your attendance has been successfully recorded. Please proceed to the session hall.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
