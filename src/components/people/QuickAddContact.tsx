"use client";
// @ts-nocheck
import { db } from "@/lib/db";

import { useState } from "react";
import { X } from "lucide-react";
import styles from "./QuickAddContact.module.css";
import { firestoreAPI, useFirestoreQuery, useFirestoreDoc } from "@/lib/firestore";
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
        });
        if (onSuccess) onSuccess(personToEdit.id as number);
      } else {
        // Duplicate check for NEW contacts
        const existing = await db.people.where('phone').equals(phone).toArray();
        if (existing.length > 0) {
          const confirmMerge = window.confirm(
            `Warning: A contact with phone ${phone} already exists (${existing[0].name}).\nDo you want to add anyway?`
          );
          if (!confirmMerge) return;
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
                value={assignedUserId || ""}
                onChange={(val) => setAssignedUserId(val)}
                options={[
                  { value: currentUser?.id || "", label: "Me" },
                  ...(teamUsers?.filter((u: any) => u.id !== currentUser?.id).map((u: any) => ({
                    value: u.id,
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
                {assignedUserId === currentUser?.id ? 'Me' : teamUsers?.find((u: any) => u.id === assignedUserId)?.name || 'Unknown'}
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
      </div>
    </div>
  );
}
