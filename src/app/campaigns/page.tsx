"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLiveQuery } from "@/lib/firestore";
import { db } from "@/lib/db";
import { PhoneCall, Plus, ArrowRight, Calendar, Trash2 } from "lucide-react";
import styles from "./Campaigns.module.css";
import { CreateCampaignModal } from "@/components/campaigns/CreateCampaignModal";

export default function CampaignsPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingCampaign, setDeletingCampaign] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Get all campaigns for this team
  const campaigns = useLiveQuery(async () => {
    if (!currentUser) return [];
    
    // Sort descending by creation date or ID
    const list = await db.campaigns.toArray();
    // Filter client-side by teamId (or all if Super Admin)
    return list.filter(c => currentUser.teamId ? c.teamId === currentUser.teamId : true).reverse();
  }, [currentUser]);

  if (!currentUser) return null;

  const isLeader = currentUser.role === "LEADER" || currentUser.role === "FOLK_LEADER" || currentUser.role === "ADMIN" || currentUser.role === "SUPER_ADMIN" || currentUser.role === "FOLK_GUIDE";

  const handleDeleteCampaign = async () => {
    if (!deletingCampaign) return;
    setIsDeleting(true);
    try {
      const leads = await db.campaignLeads.toArray();
      const campaignLeads = leads.filter(l => String(l.campaignId) === String(deletingCampaign.id));
      
      const chunkSize = 25;
      for (let i = 0; i < campaignLeads.length; i += chunkSize) {
        const chunk = campaignLeads.slice(i, i + chunkSize);
        await Promise.all(chunk.map(l => db.campaignLeads.delete(l.id)));
      }
      
      await db.campaigns.delete(deletingCampaign.id);
      setDeletingCampaign(null);
    } catch(err: any) {
      console.error("Error deleting campaign:", err);
      alert("Error deleting campaign: " + (err?.message || err));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="header-content">
          <h1><PhoneCall className="inline-icon" /> Telecalling Campaigns</h1>
          <p>Distribute leads and track calling performance</p>
        </div>
        {isLeader && (
          <button className="primary-btn" onClick={() => setShowCreateModal(true)}>
            <Plus size={20} /> New Campaign
          </button>
        )}
      </header>

      <div className={styles.campaignList}>
        {!campaigns || campaigns.length === 0 ? (
          <div className={styles.emptyState}>
            <PhoneCall size={48} />
            <h2>No Active Campaigns</h2>
            <p>Create a telecalling campaign to distribute leads to your team.</p>
          </div>
        ) : (
          campaigns.map(campaign => {
            const canManageThis = isLeader || String(campaign.creatorId) === String(currentUser?.id);
            return (
              <div 
                key={campaign.id} 
                className={styles.campaignCard}
                onClick={() => router.push(`/campaigns/${campaign.id}`)}
              >
                <div className={styles.cardHeader}>
                  <h3 style={{ wordBreak: 'break-word', flex: 1, paddingRight: 8 }}>{campaign.title}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span className={`${styles.statusBadge} ${styles[campaign.status.toLowerCase()]}`}>
                      {campaign.status}
                    </span>
                    {canManageThis && (
                      <button 
                        type="button"
                        title="Delete Campaign"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingCampaign(campaign);
                        }}
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          color: '#ef4444',
                          borderRadius: '50%',
                          width: 30,
                          height: 30,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <p className={styles.description}>{campaign.description || "No description provided."}</p>
                <div className={styles.cardFooter}>
                  <div className={styles.meta}>
                    <Calendar size={16} />
                    <span>{campaign.createdAt ? new Date(campaign.createdAt).toLocaleDateString() : ""}</span>
                  </div>
                  <button className={styles.viewBtn}>
                    View Details <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showCreateModal && (
        <CreateCampaignModal onClose={() => setShowCreateModal(false)} />
      )}

      {deletingCampaign && (
        <div className={styles.modalOverlay} style={{ zIndex: 1000 }}>
          <div className={styles.modalContent} style={{ maxWidth: 400, textAlign: 'center' }}>
            <Trash2 size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
            <h2 style={{ marginBottom: 12 }}>Delete Campaign?</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 20 }}>
              Are you sure you want to permanently delete <strong>{deletingCampaign.title}</strong> and all of its lead data? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button 
                type="button"
                onClick={() => setDeletingCampaign(null)} 
                className="secondary-btn" 
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleDeleteCampaign} 
                className="primary-btn" 
                style={{ background: '#ef4444', borderColor: '#ef4444', color: '#fff' }} 
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Yes, Delete It"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
