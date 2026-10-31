import React, { useState } from "react";
import { db } from "@/lib/db";
import { X } from "lucide-react";
import styles from "../../app/campaigns/Campaigns.module.css";

export function EditCampaignModal({ 
  campaign, 
  onClose, 
  teamUsers, 
  rawLeads 
}: { 
  campaign: any; 
  onClose: () => void; 
  teamUsers: any[]; 
  rawLeads: any[];
}) {
  const [title, setTitle] = useState(campaign.title || "");
  const [description, setDescription] = useState(campaign.description || "");

  // Filter assignable users by allowed roles
  const allowedRoles = ['MEMBER', 'RESIDENT', 'LEADER', 'FOLK_LEADER', 'ADMIN'];
  const assignableUsers = (teamUsers || []).filter((u: any) => allowedRoles.includes(u.role));

  // Determine uncompleted leads that need redistribution
  const uncompletedLeads = rawLeads.filter((l: any) => l.status === 'PENDING' || l.status === 'NO_ANSWER');
  
  const currentAssigneeIds = Array.from(new Set(
    rawLeads.map((l: any) => String(l.assignedToUserId)).filter(Boolean)
  ));
  
  const effectiveInitial = campaign.assigneeIds && campaign.assigneeIds.length > 0
    ? campaign.assigneeIds
    : (currentAssigneeIds.length > 0 ? currentAssigneeIds : []);

  const [selectedAssignees, setSelectedAssignees] = useState<string[]>(effectiveInitial);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleAssignee = (userId: string) => {
    if (selectedAssignees.includes(userId)) {
      setSelectedAssignees(prev => prev.filter(id => id !== userId));
    } else {
      setSelectedAssignees(prev => [...prev, userId]);
    }
  };

  const selectAll = () => {
    setSelectedAssignees(assignableUsers.map((u: any) => String(u.id)));
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || selectedAssignees.length === 0) return;
    setIsSubmitting(true);

    try {
      // Redistribute all uncompleted leads (PENDING and NO_ANSWER) equally among the selected assignees
      if (uncompletedLeads.length > 0 && selectedAssignees.length > 0) {
        const total = uncompletedLeads.length;
        const numAssignees = selectedAssignees.length;
        const baseShare = Math.floor(total / numAssignees);
        let remainder = total % numAssignees;

        let leadIdx = 0;
        const updatePromises: Promise<any>[] = [];

        for (const userId of selectedAssignees) {
          const userShare = baseShare + (remainder > 0 ? 1 : 0);
          if (remainder > 0) remainder--;

          for (let i = 0; i < userShare; i++) {
            if (leadIdx >= total) break;
            const lead = uncompletedLeads[leadIdx];
            if (String(lead.assignedToUserId) !== String(userId)) {
              updatePromises.push(
                db.campaignLeads.update(lead.id as string, { assignedToUserId: userId })
              );
            }
            leadIdx++;
          }
        }

        // Execute in parallel chunks of 25 for fast updates
        const chunkSize = 25;
        for (let i = 0; i < updatePromises.length; i += chunkSize) {
          const chunk = updatePromises.slice(i, i + chunkSize);
          await Promise.all(chunk);
        }
      }

      // Update the campaign document
      await db.campaigns.update(campaign.id, {
        title,
        description,
        assigneeIds: selectedAssignees,
      });

      onClose();
    } catch (err: any) {
      console.error("Failed to update campaign:", err);
      alert("Failed to update campaign: " + (err?.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} style={{ maxWidth: 520 }}>
        <div className={styles.modalHeader}>
          <h2>Edit Campaign & Assignees</h2>
          <button onClick={onClose} className={styles.closeBtn} disabled={isSubmitting}><X size={20} /></button>
        </div>

        <form onSubmit={handleUpdate} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Campaign Title</label>
            <input required type="text" value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div className={styles.formGroup}>
            <label>Description (Optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          </div>

          <div className={styles.formGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ margin: 0 }}>Assign Team Members ({selectedAssignees.length} selected)</label>
              <button 
                type="button" 
                onClick={selectAll} 
                style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}
              >
                Select All
              </button>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 12 }}>
              Uncalled and retry leads will be divided equally among all checked callers. Completed calls stay preserved.
            </p>

            <div className={styles.assigneesList} style={{ maxHeight: 220, overflowY: 'auto' }}>
              {assignableUsers.map((u: any) => {
                const isChecked = selectedAssignees.includes(String(u.id));
                return (
                  <label key={u.id} className={styles.assigneeCheckbox} style={{ padding: '6px 0', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={isChecked}
                      onChange={() => toggleAssignee(String(u.id))}
                    />
                    <span style={{ fontWeight: isChecked ? 600 : 400, color: isChecked ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                      {u.name} <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>({u.role})</span>
                    </span>
                  </label>
                );
              })}
            </div>

            {selectedAssignees.length === 0 && (
              <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: 6 }}>
                Please select at least one assignee to distribute leads.
              </p>
            )}

            {uncompletedLeads.length > 0 && selectedAssignees.length > 0 && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid var(--glass-border)', fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Uncalled & Retry Leads: <strong style={{ color: '#fff' }}>{uncompletedLeads.length}</strong></span>
                <span>Each gets approx: <strong style={{ color: 'var(--color-primary)' }}>{Math.floor(uncompletedLeads.length / selectedAssignees.length)} leads</strong></span>
              </div>
            )}
          </div>

          <div className={styles.formActions} style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
            <button type="button" onClick={onClose} className={styles.btnCancel} disabled={isSubmitting}>
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting || selectedAssignees.length === 0 || !title.trim()} 
              className={styles.btnSubmit}
              style={{ padding: '10px 24px', fontWeight: 600 }}
            >
              {isSubmitting ? "Saving & Reassigning..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
