"use client";
import React, { useState, useEffect } from "react";
import { firestoreAPI } from "@/lib/firestore";
import { CheckCircle } from "lucide-react";
import "./CheckIn.css";

export default function CheckInPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = React.use(params);
  const sessionId = unwrappedParams.id;
  
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [college, setCollege] = useState("");
  const [branch, setBranch] = useState("");
  const [hostel, setHostel] = useState("");

  useEffect(() => {
    async function fetchSession() {
      try {
        const s = await firestoreAPI.get('sessions', sessionId);
        setSession(s);
      } catch (err) {
        console.error("Failed to load session", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, [sessionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    
    // Ensure 10-digit phone number
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      alert("Please enter a valid 10-digit phone number.");
      return;
    }

    setSubmitting(true);

    try {
      // 1. Check if person already exists by phone
      let personId = null;
      let existingPerson = null;
      
      const existing = await firestoreAPI.query('people', [{ field: 'phone', op: '==', value: cleanPhone }]);
      if (existing && existing.length > 0) {
        existingPerson = existing[0];
        personId = existingPerson.id;
        
        // Update their details if they were blank
        await firestoreAPI.update('people', personId, {
          gender: existingPerson.gender || gender,
          college: existingPerson.college || college,
          branch: existingPerson.branch || branch,
          hostel: existingPerson.hostel || hostel
        });
      } else {
        // 2. Create new person
        personId = await firestoreAPI.add('people', {
          name,
          phone: cleanPhone,
          gender,
          college,
          branch,
          hostel,
          priorityScore: 10, // Warm priority
          tags: ['walk-in'],
          ownerId: session?.ownerId || 1, // Fallback to 1 if no owner
          assignedUserId: session?.ownerId || 1,
          firstContactDate: new Date()
        });
      }

      // 3. Mark Attendance
      // Check if already in attendance
      const attendance = await firestoreAPI.query('sessionAttendance', [
        { field: 'sessionId', op: '==', value: sessionId },
        { field: 'personId', op: '==', value: personId }
      ]);

      if (attendance && attendance.length > 0) {
        // Update existing attendance record
        await firestoreAPI.update('sessionAttendance', attendance[0].id, {
          status: 'ATTENDED',
          isNewContact: !existingPerson
        });
      } else {
        // Create new attendance record
        await firestoreAPI.add('sessionAttendance', {
          sessionId,
          personId,
          status: 'ATTENDED',
          assignedUserId: session?.ownerId || 1,
          isNewContact: !existingPerson
        });
      }

      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Failed to submit registration. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loadingContainer">Loading session details...</div>;
  }

  if (!session) {
    return <div className="loadingContainer">Session not found.</div>;
  }

  if (success) {
    return (
      <div className="successContainer">
        <CheckCircle size={64} color="var(--color-success)" style={{ marginBottom: 16 }} />
        <h1>Registration Successful!</h1>
        <p>Thank you for checking in to <strong>{session.name}</strong>.</p>
        <p>Please take your seat, the session will begin shortly.</p>
      </div>
    );
  }

  return (
    <div className="pageContainer">
      <div className="card">
        <div className="header">
          <div className="badge">{session.type}</div>
          <h1 className="title">Welcome!</h1>
          <p className="subtitle">Please register for <strong>{session.name}</strong></p>
        </div>
        
        <form onSubmit={handleSubmit} className="form">
          <div className="formGroup">
            <label>Full Name *</label>
            <input 
              type="text" 
              required 
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter your full name"
            />
          </div>

          <div className="formGroup">
            <label>Phone Number *</label>
            <input 
              type="tel" 
              required 
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="10-digit mobile number"
              maxLength={10}
              minLength={10}
            />
          </div>

          <div className="formGroup">
            <label>Gender *</label>
            <select required value={gender} onChange={e => setGender(e.target.value)}>
              <option value="" disabled>Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="formGroup">
            <label>College Name *</label>
            <input 
              type="text" 
              required 
              value={college}
              onChange={e => setCollege(e.target.value)}
              placeholder="Enter your college"
            />
          </div>

          <div className="formGroup">
            <label>Branch / Course *</label>
            <input 
              type="text" 
              required 
              value={branch}
              onChange={e => setBranch(e.target.value)}
              placeholder="e.g. Computer Science, B.Com"
            />
          </div>

          <div className="formGroup">
            <label>Hostel Name *</label>
            <input 
              type="text" 
              required 
              value={hostel}
              onChange={e => setHostel(e.target.value)}
              placeholder="Enter your hostel name or 'Day Scholar'"
            />
          </div>

          <button type="submit" className="submitBtn" disabled={submitting}>
            {submitting ? 'Registering...' : 'Check-in Now'}
          </button>
        </form>
      </div>
    </div>
  );
}
