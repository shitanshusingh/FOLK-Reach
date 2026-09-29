"use client";
import React, { useState, useEffect } from "react";
import { X, Users, CheckCircle, AlertCircle } from "lucide-react";
import styles from "../../app/campaigns/Campaigns.module.css";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/db";
import { firestoreAPI, useFirestoreQuery } from "@/lib/firestore";

interface CreateCampaignModalProps {
  onClose: () => void;
}

export function CreateCampaignModal({ onClose }: CreateCampaignModalProps) {
  const { currentUser } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rawText, setRawText] = useState("");
  
  const [parsedLeads, setParsedLeads] = useState<{name: string, phone: string}[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [targetTeamId, setTargetTeamId] = useState<string>(currentUser?.teamId ? String(currentUser.teamId) : "");

  // Fetch all teams for admins/guides
  const allTeams = useFirestoreQuery('teams');
  const isAdminOrGuide = ["SUPER_ADMIN", "FOLK_GUIDE", "ADMIN"].includes(currentUser?.role || "");

  // Get users for assignment based on targetTeamId
  const teamUsers = useFirestoreQuery(
    'users',
    targetTeamId ? [{ field: 'teamId', op: '==', value: targetTeamId }] : [{ field: 'teamId', op: '==', value: 'NO_MATCH' }]
  );

const assignableUsers = React.useMemo(() => {
    if (!teamUsers) return [];
    const allowedRoles = ['MEMBER', 'RESIDENT', 'LEADER', 'FOLK_LEADER'];
    return teamUsers.filter(u => allowedRoles.includes(u.role));
  }, [teamUsers]);

  // Parse raw text whenever it changes
  useEffect(() => {
    if (!rawText.trim()) {
      setParsedLeads([]);
      return;
    }

    const lines = rawText.split('\n');
    const leads: {name: string, phone: string}[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      
      // Simple parser: Extract the first 10-digit number as phone, the rest as name
      const phoneMatch = line.match(/(?:\+91)?[\s\-.]*(?:\d[\s\-.]*){10}/);
      if (phoneMatch) {
        let phone = phoneMatch[0].replace(/\D/g, '').slice(-10);
        let name = line.replace(phoneMatch[0], '').replace(/[\t,;-]/g, ' ').trim();
        if (!name) name = "Unknown Lead";
        
        // Remove any remaining numbers if it's just garbage
        name = name.replace(/^\d+\s*/, '').trim() || "Unknown Lead";
        
        leads.push({ name, phone });
      }
    }
    
    setParsedLeads(leads);
  }, [rawText]);

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || parsedLeads.length === 0 || selectedAssignees.length === 0 || !currentUser) return;

    setIsSubmitting(true);
    try {
      // 1. Create the Campaign
      const campaignId = await db.campaigns.add({
        title,
        description,
        creatorId: currentUser.id!,
        teamId: targetTeamId || null,
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      });

      // 2. Distribute Leads
      // Handle remainders exactly as requested (e.g., 151 / 3 = 51, 50, 50)
      const totalLeads = parsedLeads.length;
      const totalAssignees = selectedAssignees.length;
      const baseShare = Math.floor(totalLeads / totalAssignees);
      let remainder = totalLeads % totalAssignees;

      const campaignLeads = [];
      let leadIndex = 0;

      for (const userId of selectedAssignees) {
        const shareForThisUser = baseShare + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder--;

        for (let i = 0; i < shareForThisUser; i++) {
          if (leadIndex >= totalLeads) break;
          const lead = parsedLeads[leadIndex];
          
          campaignLeads.push({
            campaignId: campaignId as string,
            name: lead.name,
            phone: lead.phone,
            status: 'PENDING',
            assignedToUserId: userId,
          });
          
          leadIndex++;
        }
      }

      // 3. Bulk Add Leads
      // Using direct firestore batch for speed, or just sequential for now
      for (const lead of campaignLeads) {
        await db.campaignLeads.add(lead);
      }

      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to create campaign");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>Create Telecalling Campaign</h2>
          <button className={styles.closeBtn} onClick={onClose} disabled={isSubmitting}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label>Campaign Title</label>
            <input 
              type="text" 
              className={styles.input} 
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Hostel A Freshers 2026"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Description (Optional)</label>
            <input 
              type="text" 
              className={styles.input} 
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What is the goal of this campaign?"
            />
          </div>


          {isAdminOrGuide && (
            <div className={styles.formGroup}>
              <label>Target Residence/Team (Admin Override)</label>
              <select 
                className={styles.input} 
                value={targetTeamId}
                onChange={e => setTargetTeamId(e.target.value)}
                required
              >
                <option value="">-- Select a Team --</option>
                {allTeams?.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className={styles.smartPasteBox}>
            <label style={{ color: 'var(--color-primary)' }}>1. Smart Paste Leads</label>
            <p className={styles.helpText} style={{ marginBottom: 12 }}>
              Copy columns (Name and Phone) from Excel and paste them below. 
              The system will automatically extract valid phone numbers.
            </p>
            <textarea 
              className={styles.textarea}
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder="John Doe  9876543210\nJane Smith  9998887776"
            />
            
            {parsedLeads.length > 0 && (
              <div style={{ marginTop: 12, color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                <CheckCircle size={16} /> Successfully parsed {parsedLeads.length} leads
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>2. Assign Team Members</label>
            <p className={styles.helpText} style={{ marginBottom: 12 }}>
              Leads will be distributed equally. Remainders will be distributed to the first selected members.
            </p>
            <div className={styles.assigneesList}>
              {assignableUsers.map(user => (
                <label key={user.id} className={styles.assigneeCheckbox}>
                  <input 
                    type="checkbox"
                    checked={selectedAssignees.includes(user.id as string)}
                    onChange={() => toggleAssignee(user.id as string)}
                  />
                  {user.name} ({user.role})
                </label>
              ))}
            </div>
          </div>

          {parsedLeads.length > 0 && selectedAssignees.length > 0 && (
            <div className={styles.statsRow}>
              <div>Total Leads: <span>{parsedLeads.length}</span></div>
              <div>Assignees: <span>{selectedAssignees.length}</span></div>
              <div>Approx. Share: <span>{Math.floor(parsedLeads.length / selectedAssignees.length)} leads/person</span></div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32 }}>
            <button type="button" className={styles.btnCancel} onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button 
              type="submit" 
              className={styles.btnSubmit}
              disabled={isSubmitting || parsedLeads.length === 0 || selectedAssignees.length === 0 || !title}
            >
              {isSubmitting ? "Creating..." : "Create & Distribute"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
