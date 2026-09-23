"use client";
// @ts-nocheck
import { db } from "@/lib/db";

import { useState } from "react";
import { X, AlertCircle } from "lucide-react";
import styles from "./QuickAddContact.module.css";
import { firestoreAPI, useFirestoreQuery, useFirestoreDoc, useLiveQuery } from "@/lib/firestore";
import { where } from "firebase/firestore";;
import { GlassSelect } from "@/components/ui/GlassSelect";
import { useAuth } from "@/contexts/AuthContext";

interface QuickAddContactProps {
  onClose: () => void;
  onSuccess?: (id: number) => void;
  personToEdit?: any;
}

export function QuickAddContact({ onClose, onSuccess, personToEdit }: QuickAddContactProps) {
  const [showOptional, setShowOptional] = useState(!!personToEdit);
  const [duplicateError, setDuplicateError] = useState<any>(null);
  
  // Required
  const [name, setName] = useState(personToEdit?.name || "");
  const [phone, setPhone] = useState(personToEdit?.phone || "");
  const [priorityScore, setPriorityScore] = useState(personToEdit?.priorityScore ?? 5); // Default to Cold (5)
  const { currentUser } = useAuth();
  const [assignedUserId, setAssignedUserId] = useState(personToEdit?.assignedUserId || currentUser?.id);
  
  const teamUsers = useLiveQuery(async () => {
    if (!currentUser?.teamId) return [];
    return await db.users.where('teamId').equals(currentUser.teamId).toArray();
  }, [currentUser?.teamId]);
  
  const formatBirthday = (date: any) => {
    if (!date) return "";
    try {
      const d = new Date(date?.toDate ? date.toDate() : date);
      return !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : "";
    } catch {
      return "";
    }
  };

  // Optional
  const [college, setCollege] = useState(personToEdit?.college || "");
  const [branch, setBranch] = useState(personToEdit?.branch || "");
  const [company, setCompany] = useState(personToEdit?.company || "");
  const [jobRole, setJobRole] = useState(personToEdit?.jobRole || "");
  const [nativePlace, setNativePlace] = useState(personToEdit?.nativePlace || "");
  const [currentCity, setCurrentCity] = useState(personToEdit?.currentCity || "");
  const [birthday, setBirthday] = useState(formatBirthday(personToEdit?.birthday));
  const [howMet, setHowMet] = useState(personToEdit?.howMet || "");
  const [notes, setNotes] = useState(personToEdit?.notes || "");
  const [chantingRounds, setChantingRounds] = useState<number | ''>(personToEdit?.chantingRounds ?? "");
  const [ashrayaLevel, setAshrayaLevel] = useState(personToEdit?.ashrayaLevel || "None");
  const [hostel, setHostel] = useState(personToEdit?.hostel || "");

  // Dynamic Custom Fields specific to this person only
  const [customFieldsList, setCustomFieldsList] = useState<{key: string, value: string}[]>(
    Object.entries(personToEdit?.customFields || {}).map(([k, v]) => ({ key: k, value: v as string }))
  );

  const handleAddCustomField = () => {
    setCustomFieldsList([...customFieldsList, { key: "", value: "" }]);
  };

  const updateCustomField = (index: number, field: 'key'|'value', val: string) => {
    const newList = [...customFieldsList];
    newList[index][field] = val;
    setCustomFieldsList(newList);
  };

  const removeCustomField = (index: number) => {
    setCustomFieldsList(customFieldsList.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    // Convert list back to object
    const customFieldsObj: Record<string, string> = {};
    for (const f of customFieldsList) {
      if (f.key.trim()) customFieldsObj[f.key.trim()] = f.value;
    }

    try {
      if (personToEdit?.id) {
        await db.people.update(personToEdit.id, {
          name,
          phone,
          college,
          branch,
          company,
          jobRole,
          nativePlace,
          currentCity,
          birthday: birthday ? new Date(birthday) : undefined,
          howMet,
          notes,
          priorityScore: Number(priorityScore),
          customFields: customFieldsObj,
          assignedUserId: assignedUserId || currentUser?.id,
          chantingRounds: chantingRounds === "" ? undefined : Number(chantingRounds),
          ashrayaLevel: ashrayaLevel === "None" ? undefined : ashrayaLevel,
          hostel: hostel.trim() || undefined,
        });
        if (onSuccess) onSuccess(personToEdit.id as number);
      } else {
        // Duplicate check for NEW contacts
        const normalizePhone = (p: string) => (p || '').replace(/\D/g, '').slice(-10);
        const normalizedInput = normalizePhone(phone);
        
        const allPeople = await db.people.toArray();
        const existing = allPeople.filter((p: any) => normalizePhone(p.phone) === normalizedInput);
        
        if (existing.length > 0) {
          const match = existing[0];
          
          if (String(match.ownerId) !== String(currentUser?.id)) {
            // Block and show UI for "Request Transfer"
            setDuplicateError(match);
            return;
          } else {
             alert(`You already have a contact with phone ${phone} (${match.name}). Please edit the existing contact instead.`);
             return;
          }
        }

        const id = await db.people.add({
          name,
          phone,
          college,
          branch,
          company,
          jobRole,
          nativePlace,
          currentCity,
          birthday: birthday ? new Date(birthday) : undefined,
          howMet,
          notes,
          firstContactDate: new Date(),
          priorityScore: Number(priorityScore),
          tags: [],
          ownerId: currentUser?.id,
          assignedUserId: assignedUserId || currentUser?.id,
          customFields: customFieldsObj,
          chantingRounds: chantingRounds === "" ? undefined : Number(chantingRounds),
          ashrayaLevel: ashrayaLevel === "None" ? undefined : ashrayaLevel,
          hostel: hostel.trim() || undefined,
        });

        // Physically create the initial follow-up task
        await db.tasks.add({
          personId: id as number,
          title: "Initial Follow-up Call",
          type: "CALL",
          status: "PENDING",
          dueDate: new Date(),
          notes: "Auto-scheduled on creation"
        });

        if (onSuccess) onSuccess(id as number);
      }
      onClose();
    } catch (error) {
      console.error("Failed to add person", error);
      alert("Error adding contact.");
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.header}>
          <h2 className={styles.title}>{personToEdit ? "Edit Contact" : "New Contact"}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={24} />
          </button>
        </div>
        
        {duplicateError ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ 
              width: '64px', height: '64px', borderRadius: '50%', 
              background: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '20px'
            }}>
              <AlertCircle size={32} />
            </div>
            <h3 style={{ color: 'white', marginBottom: '12px', fontSize: '1.25rem' }}>Contact Already Exists</h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
              This phone number is already saved in our database. It is currently managed by:
            </p>
            <div style={{ 
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              padding: '12px 24px', borderRadius: 'var(--radius-md)',
              marginBottom: '32px', color: 'white', fontWeight: '500',
              display: 'inline-block'
            }}>
              {(() => {
                const ownerId = duplicateError.ownerId || duplicateError.assignedUserId;
                const owner = teamUsers?.find(u => String(u.id) === String(ownerId));
                return owner ? owner.name : "Another team member";
              })()}
            </div>
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button 
                onClick={() => setDuplicateError(null)}
                style={{ 
                  flex: 1, padding: '12px', background: 'transparent', 
                  border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', 
                  color: 'white', cursor: 'pointer', transition: 'all 0.2s ease', fontWeight: 500
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                Go Back
              </button>
              <button 
                onClick={async () => {
                  await db.contactTransfers.add({
                    personId: duplicateError.id,
                    fromUserId: duplicateError.ownerId || duplicateError.assignedUserId,
                    toUserId: currentUser?.id,
                    status: 'PENDING',
                    requestDate: new Date(),
                    direction: 'PULL'
                  });
                  alert("Transfer request sent successfully!");
                  onClose();
                }}
                style={{ 
                  flex: 1, padding: '12px', background: 'var(--color-primary)', 
                  border: 'none', borderRadius: 'var(--radius-md)', 
                  color: 'white', cursor: 'pointer', transition: 'all 0.2s ease', fontWeight: 500
                }}
                onMouseOver={e => e.currentTarget.style.filter = 'brightness(1.1)'}
                onMouseOut={e => e.currentTarget.style.filter = 'brightness(1)'}
              >
                Request Transfer
              </button>
            </div>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="name">Name *</label>
            <input 
              id="name"
              className={styles.input} 
              type="text" 
              required 
              value={name} 
              onChange={e => setName(e.target.value)}
              placeholder="E.g., Rahul Kumar"
              autoFocus
            />
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="phone">Phone Number *</label>
            <input 
              id="phone"
              className={styles.input} 
              type="tel" 
              required 
              value={phone} 
              onChange={e => setPhone(e.target.value)}
              placeholder="+91..."
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Category / Interest Level *</label>
            <GlassSelect 
              value={priorityScore.toString()} 
              onChange={val => setPriorityScore(Number(val))}
              options={[
                { value: "20", label: "Hot (Highly interested)", icon: <span>🔥</span> },
                { value: "10", label: "Warm (Moderately interested)", icon: <span>😊</span> },
                { value: "5", label: "Cold (New person, just interested)", icon: <span>❄️</span> },
                { value: "0", label: "Dormant (Not responding)", icon: <span>💤</span> }
              ]}
            />
          </div>

          {['FOLK_LEADER', 'LEADER', 'SUPER_ADMIN', 'FOLK_GUIDE'].includes(currentUser?.role || '') && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Assigned To</label>
              <GlassSelect
                value={assignedUserId ? String(assignedUserId) : ""}
                onChange={(val) => setAssignedUserId(val)}
                options={[
                  { value: currentUser?.id ? String(currentUser.id) : "", label: "Me" },
                  ...(teamUsers?.filter((u: any) => String(u.id) !== String(currentUser?.id)).map((u: any) => ({
                    value: String(u.id),
                    label: u.name
                  })) || [])
                ]}
              />
            </div>
          )}

          {!['FOLK_LEADER', 'LEADER', 'SUPER_ADMIN', 'FOLK_GUIDE'].includes(currentUser?.role || '') && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Assigned To</label>
              <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                {String(assignedUserId) === String(currentUser?.id) ? 'Me' : teamUsers?.find((u: any) => String(u.id) === String(assignedUserId))?.name || 'Unknown'}
              </div>
            </div>
          )}

          {!showOptional ? (
            <button 
              type="button" 
              className={styles.optionalFieldsToggle} 
              onClick={() => setShowOptional(true)}
            >
              + Add more details (optional)
            </button>
          ) : (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="college">College / University</label>
                <input 
                  id="college"
                  className={styles.input} 
                  type="text" 
                  value={college} 
                  onChange={e => setCollege(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="branch">Branch / Year</label>
                <input 
                  id="branch"
                  className={styles.input} 
                  type="text" 
                  value={branch} 
                  onChange={e => setBranch(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="company">Company</label>
                <input 
                  id="company"
                  className={styles.input} 
                  type="text" 
                  value={company} 
                  onChange={e => setCompany(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="jobRole">Job Role / Profession</label>
                <input 
                  id="jobRole"
                  className={styles.input} 
                  type="text" 
                  value={jobRole} 
                  onChange={e => setJobRole(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="nativePlace">Native Place</label>
                <input 
                  id="nativePlace"
                  className={styles.input} 
                  type="text" 
                  value={nativePlace} 
                  onChange={e => setNativePlace(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="currentCity">Current City</label>
                <input 
                  id="currentCity"
                  className={styles.input} 
                  type="text" 
                  value={currentCity} 
                  onChange={e => setCurrentCity(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="hostel">Hostel (Free-text)</label>
                <input 
                  id="hostel"
                  className={styles.input} 
                  type="text" 
                  placeholder="E.g., Bhabha Bhavan"
                  value={hostel} 
                  onChange={e => setHostel(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="chantingRounds">Chanting Rounds</label>
                <GlassSelect 
                  value={chantingRounds.toString()} 
                  onChange={val => {
                    setChantingRounds(val === "" ? "" : Number(val));
                    // Optional auto-suggestion based on rounds can be handled here if needed, but per request it's user-selected.
                  }}
                  options={[
                    { value: "", label: "None" },
                    { value: "0", label: "0 Rounds" },
                    { value: "1", label: "1 Round" },
                    { value: "2", label: "2 Rounds" },
                    { value: "3", label: "3 Rounds" },
                    { value: "4", label: "4 Rounds" },
                    { value: "8", label: "8 Rounds" },
                    { value: "12", label: "12 Rounds" },
                    { value: "16", label: "16 Rounds" }
                  ]}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="ashrayaLevel">Ashraya Level</label>
                <GlassSelect 
                  value={ashrayaLevel} 
                  onChange={val => setAshrayaLevel(val)}
                  options={[
                    { value: "None", label: "None" },
                    { value: "Sevak", label: "Sevak" },
                    { value: "Sadhaka", label: "Sadhaka" },
                    { value: "Upasaka", label: "Upasaka" },
                    { value: "Charan Ashraya", label: "Charan Ashraya" }
                  ]}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="birthday">Birthday</label>
                <input 
                  id="birthday"
                  className={styles.input} 
                  type="date" 
                  value={birthday} 
                  onChange={e => setBirthday(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="howMet">Source / How met?</label>
                <input 
                  id="howMet"
                  className={styles.input} 
                  type="text" 
                  value={howMet} 
                  onChange={e => setHowMet(e.target.value)}
                  placeholder="e.g. Book distribution, college session..."
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="notes">Initial Notes</label>
                <textarea 
                  id="notes"
                  className={styles.input} 
                  rows={2}
                  value={notes} 
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              <div className={styles.formGroup} style={{ marginTop: 24, borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
                <label className={styles.label}>Custom Fields (Only for this person)</label>
                {customFieldsList.map((cf, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input 
                      className={styles.input} 
                      placeholder="Field Name (e.g. Favorite Topic)"
                      value={cf.key}
                      onChange={e => updateCustomField(idx, 'key', e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <input 
                      className={styles.input} 
                      placeholder="Value"
                      value={cf.value}
                      onChange={e => updateCustomField(idx, 'value', e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button type="button" onClick={() => removeCustomField(idx)} style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)', border: 'none', borderRadius: 4, padding: '0 12px', cursor: 'pointer' }}>
                      <X size={16} />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={handleAddCustomField} style={{ background: 'var(--color-surface)', color: 'var(--color-primary)', border: '1px dashed var(--color-primary)', borderRadius: 8, padding: '8px', cursor: 'pointer', marginTop: 8, width: '100%', display: 'block' }}>
                  + Add Custom Field
                </button>
              </div>
            </>
          )}

          <div className={styles.actions}>
            <button type="button" className={`${styles.btn} ${styles.btnCancel}`} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={`${styles.btn} ${styles.btnSave}`} disabled={!name || !phone}>
              {personToEdit ? "Update Contact" : "Save Contact"}
            </button>
          </div>
          </form>
        )}
      </div>
    </div>
  );
}
