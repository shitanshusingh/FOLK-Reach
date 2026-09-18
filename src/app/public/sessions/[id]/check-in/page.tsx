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
  const [assignedUserId, setAssignedUserId] = useState('UNASSIGNED');
  
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
    setSelectedPerson(person);
    // Check if missing compulsory fields
    if (!person.phone || !person.college || !person.branch || !person.hostel || !person.gender) {
      // Pre-fill existing data
      setPhone(person.phone || '');
      setCollege(person.college || '');
      setBranch(person.branch || '');
      setHostel(person.hostel || '');
      setGender(person.gender || '');
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
        await firestoreAPI.update('sessionAttendance', record.id, {
          status: 'ATTENDED',
          checkedInAt: new Date()
        });
      } else {
        await firestoreAPI.add('sessionAttendance', {
          sessionId,
          personId,
          status: 'ATTENDED',
          isNewContact: false,
          checkedInAt: new Date()
        });
      }
      const person = await firestoreAPI.get('people', personId as string | number);
      if (person) {
        await firestoreAPI.update('people', person.id as number, { priorityScore: (person.priorityScore || 0) + 5 });
      }
      await db.interactions.add({
        personId: personId as number,
        type: 'SESSION',
        date: new Date(),
        outcome: `Attended Session: ${sessionData?.name || sessionData?.title || 'Session'}`,
        notes: `Checked in via public registration page at ${format(new Date(), "h:mm a")}`
      });
      setStep('SUCCESS');
    } catch (err) {
      console.error(err);
      alert("Failed to check in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnrichSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson) return;
    setIsSubmitting(true);
    try {
      await firestoreAPI.update('people', selectedPerson.id as number, {
        phone, college, branch, hostel, gender
      });
      await handleCheckIn(selectedPerson.id as number);
    } catch (err) {
      console.error(err);
      alert("Failed to update profile.");
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // 1. DEDUPLICATION CHECK
      const existingMatches = await db.people.where('phone').equals(phone).toArray();
      const existingMatch = existingMatches.length > 0 ? existingMatches[0] : null;
      
      let finalPersonId = null;
      let ownerId = assignedUserId;

      if (existingMatch) {
        // Merge Data
        await firestoreAPI.update('people', existingMatch.id as number, {
          name, 
          college: college || existingMatch.college,
          branch: branch || existingMatch.branch,
          hostel: hostel || existingMatch.hostel,
          gender: gender || existingMatch.gender
        });
        finalPersonId = existingMatch.id;
        // If they were already in the DB but UNASSIGNED previously, keep ownerId as their existing one unless we are forcing an assignment?
        // Let's just respect the newly chosen ownerId if they selected one, otherwise keep their existing one.
        if (ownerId === 'UNASSIGNED') ownerId = existingMatch.ownerId || ownerId;
      } else {
        // Assign to Leader if unassigned
        if (ownerId === 'UNASSIGNED') {
          ownerId = team?.leaderId || (allUsers && allUsers.length > 0 ? allUsers.find((u:any)=>u.role==='FOLK_LEADER' || u.role==='LEADER')?.id || allUsers[0].id : '');
        }

        // Create New Person
        finalPersonId = await firestoreAPI.add('people', {
          name, phone, college, branch, hostel, gender,
          priorityScore: 0,
          tags: [],
          firstContactDate: new Date(),
          ownerId: ownerId,
          assignedUserId: ownerId
        });
      }

      // Check them in
      await firestoreAPI.add('sessionAttendance', {
        sessionId,
        personId: finalPersonId,
        status: 'ATTENDED',
        isNewContact: !existingMatch,
        assignedUserId: ownerId,
        checkedInAt: new Date()
      });
      
      if (existingMatch) {
        await firestoreAPI.update('people', finalPersonId as number, { priorityScore: (existingMatch.priorityScore || 0) + 5 });
      } else {
        await firestoreAPI.update('people', finalPersonId as number, { priorityScore: 5 });
      }
      await db.interactions.add({
        personId: finalPersonId as number,
        type: 'SESSION',
        date: new Date(),
        outcome: `Attended Session: ${sessionData?.name || sessionData?.title || 'Session'}`,
        notes: `Registered and checked in via public registration page at ${format(new Date(), "h:mm a")}`
      });

      setStep('SUCCESS');
    } catch (err) {
      console.error(err);
      alert("Registration failed. Please try again.");
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
                  { value: "UNASSIGNED", label: "Not in touch with anyone" },
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
