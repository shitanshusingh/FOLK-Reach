import React, { useState } from "react";
import { db } from "@/lib/db";
import { X } from "lucide-react";
import styles from "./CreateCampaignModal.module.css";
import { useLiveQuery } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";

export function EditCampaignModal({ campaign, onClose, teamUsers }: { campaign: any; onClose: () => void; teamUsers: any[] }) {
  const [title, setTitle] = useState(campaign.title);
  const [description, setDescription] = useState(campaign.description || "");
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>(campaign.assigneeIds || []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleAssignee = (userId: string) => {
    if (selectedAssignees.includes(userId)) {
      setSelectedAssignees(prev => prev.filter(id => id !== userId));
    } else {
      setSelectedAssignees(prev => [...prev, userId]);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    setIsSubmitting(true);

    try {
      // 1. Find removed assignees
      const removedAssignees = campaign.assigneeIds.filter((id: string) => !selectedAssignees.includes(id));
      
      if (removedAssignees.length > 0) {
        // Fetch all PENDING leads for this campaign
        const allLeads = await db.campaignLeads.toArray();
        const pendingLeads = allLeads.filter((l: any) => 
          String(l.campaignId) === String(campaign.id) && 
          l.status === 'PENDING'
        );
        
        // Find leads that belong to removed assignees
        const orphanedLeads = pendingLeads.filter((l: any) => removedAssignees.includes(String(l.assignedToUserId)));
        
        if (orphanedLeads.length > 0 && selectedAssignees.length > 0) {
          // Re-distribute orphaned leads among current assignees
          const baseShare = Math.floor(orphanedLeads.length / selectedAssignees.length);
          let remainder = orphanedLeads.length % selectedAssignees.length;
          
          let orphanIndex = 0;
          for (const userId of selectedAssignees) {
            const share = baseShare + (remainder > 0 ? 1 : 0);
            if (remainder > 0) remainder--;
            
            for (let i = 0; i < share; i++) {
              if (orphanIndex >= orphanedLeads.length) break;
              const lead = orphanedLeads[orphanIndex];
              await db.campaignLeads.update(lead.id as string, { assignedToUserId: userId });
              orphanIndex++;
            }
          }
        }
      }

      await db.campaigns.update(campaign.id, {
        title,
        description,
        assigneeIds: selectedAssignees,
      });

      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to update campaign");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>Edit Campaign</h2>
          <button onClick={onClose} className={styles.closeBtn}><X size={20} /></button>
        </div>

        <form onSubmit={handleUpdate} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Campaign Title</label>
            <input required type="text" value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div className={styles.formGroup}>
            <label>Description (Optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>

          <div className={styles.formGroup}>
            <label>Assign Callers</label>
            <div className={styles.assigneesGrid}>
              {teamUsers.map((u: any) => (
                <label key={u.id} className={styles.assigneeCheckbox}>
                  <input 
                    type="checkbox" 
                    checked={selectedAssignees.includes(String(u.id))}
                    onChange={() => toggleAssignee(String(u.id))}
                  />
                  {u.name}
                </label>
              ))}
            </div>
            {selectedAssignees.length === 0 && <p style={{color: '#ef4444', fontSize: '0.85rem', marginTop: 4}}>Please select at least one assignee.</p>}
          </div>

          <div className={styles.formActions}>
            <button type="button" onClick={onClose} className={styles.btnCancel}>Cancel</button>
            <button type="submit" disabled={isSubmitting || selectedAssignees.length === 0} className={styles.btnSubmit}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
