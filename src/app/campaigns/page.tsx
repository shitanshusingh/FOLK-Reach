"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLiveQuery } from "@/lib/firestore";
import { db } from "@/lib/db";
import { PhoneCall, Plus, Users, ArrowRight, Activity, Calendar } from "lucide-react";
import styles from "./Campaigns.module.css";
import { CreateCampaignModal } from "@/components/campaigns/CreateCampaignModal";

export default function CampaignsPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Get all campaigns for this team
  const campaigns = useLiveQuery(async () => {
    if (!currentUser) return [];
    const teamFilter = currentUser.teamId ? { field: 'teamId', op: '==', value: currentUser.teamId } : { field: 'teamId', op: '!=', value: 'FAKE' }; // Get all if no teamId (Super Admin)
    
    // Sort descending by ID or creation date normally
    const list = await db.campaigns.toArray();
    // Filter client-side temporarily since we don't have composite indexes yet
    return list.filter(c => currentUser.teamId ? c.teamId === currentUser.teamId : true).reverse();
  }, [currentUser]);

  if (!currentUser) return null;

  const isLeader = currentUser.role === "LEADER" || currentUser.role === "FOLK_LEADER" || currentUser.role === "ADMIN" || currentUser.role === "SUPER_ADMIN" || currentUser.role === "FOLK_GUIDE";

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
          campaigns.map(campaign => (
            <div 
              key={campaign.id} 
              className={styles.campaignCard}
              onClick={() => router.push(`/campaigns/${campaign.id}`)}
            >
              <div className={styles.cardHeader}>
                <h3>{campaign.title}</h3>
                <span className={`${styles.statusBadge} ${styles[campaign.status.toLowerCase()]}`}>
                  {campaign.status}
                </span>
              </div>
              <p className={styles.description}>{campaign.description || "No description provided."}</p>
              <div className={styles.cardFooter}>
                <div className={styles.meta}>
                  <Calendar size={16} />
                  <span>{new Date(campaign.createdAt).toLocaleDateString()}</span>
                </div>
                <button className={styles.viewBtn}>
                  View Details <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showCreateModal && (
        <CreateCampaignModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}
