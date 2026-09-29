"use client";
import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLiveQuery } from "@/lib/firestore";
import { db } from "@/lib/db";
import { PhoneCall, ArrowLeft, Play, User, Clock, CheckCircle } from "lucide-react";
import styles from "./CampaignDetails.module.css";

export default function CampaignDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useAuth();
  
  const campaignId = params.id as string;

  const campaign = useLiveQuery(async () => {
    return await db.campaigns.get(campaignId);
  }, [campaignId]);

  const rawLeads = useLiveQuery(async () => {
    const list = await db.campaignLeads.toArray();
    return list.filter(l => String(l.campaignId) === String(campaignId));
  }, [campaignId]);

  const teamUsers = useLiveQuery(async () => {
    if (!currentUser?.teamId) return [];
    const list = await db.users.toArray();
    return list.filter(u => u.teamId === currentUser.teamId);
  }, [currentUser]);

  if (!currentUser || !campaign || !rawLeads) return null;

  const isLeader = ["LEADER", "FOLK_LEADER", "ADMIN", "SUPER_ADMIN", "FOLK_GUIDE"].includes(currentUser.role);
  
  // Members only see their leads. Leaders see all.
  const visibleLeads = isLeader 
    ? rawLeads 
    : rawLeads.filter(l => String(l.assignedToUserId) === String(currentUser.id));

  const totalLeads = visibleLeads.length;
  const completedLeads = visibleLeads.filter(l => l.status !== 'PENDING' && l.status !== 'NO_ANSWER').length; // No answer means still incomplete technically
  
  const pendingLeads = visibleLeads.filter(l => l.status === 'PENDING' || l.status === 'NO_ANSWER');

  const getUserName = (id: string) => {
    const u = teamUsers?.find(u => String(u.id) === String(id));
    return u ? u.name : "Unknown";
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'PENDING': return <span className={`${styles.badge} ${styles.pending}`}>Pending</span>;
      case 'INTERESTED': return <span className={`${styles.badge} ${styles.success}`}>Interested</span>;
      case 'CONVERTED': return <span className={`${styles.badge} ${styles.success}`}>Converted</span>;
      case 'NOT_INTERESTED': return <span className={`${styles.badge} ${styles.danger}`}>Not Interested</span>;
      case 'NO_ANSWER': return <span className={`${styles.badge} ${styles.warning}`}>No Answer (Retry)</span>;
      default: return <span className={styles.badge}>{status}</span>;
    }
  };

  return (
    <div className="page-container">
      <header className="page-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 16 }}>
        <button className={styles.backBtn} onClick={() => router.push('/campaigns')}>
          <ArrowLeft size={16} /> Back to Campaigns
        </button>
        <div className={styles.headerFlex} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div style={{ wordBreak: 'break-word', overflowWrap: 'break-word', maxWidth: '100%' }}>
            <h1 style={{ fontSize: '2.5rem', lineHeight: 1.1, marginBottom: 8 }}>{campaign.title}</h1>
            <p style={{ color: 'var(--color-text-muted)' }}>{campaign.description}</p>
          </div>
          <button 
            className="primary-btn" 
            style={{ padding: '12px 24px', fontSize: '1.1rem' }}
            disabled={pendingLeads.length === 0}
            onClick={() => router.push(`/campaigns/${campaignId}/dialer`)}
          >
            <Play size={20} /> {pendingLeads.length === 0 ? "All Done!" : "Start Calling"}
          </button>
        </div>
      </header>

      <div className={styles.statsCard}>
        <div className={styles.statBox}>
          <h3>Assigned</h3>
          <p className={styles.statNumber}>{totalLeads}</p>
        </div>
        <div className={styles.statBox}>
          <h3>Pending</h3>
          <p className={styles.statNumber}>{pendingLeads.length}</p>
        </div>
        <div className={styles.statBox}>
          <h3>Completed</h3>
          <p className={styles.statNumber}>{completedLeads}</p>
        </div>
        <div className={styles.statBox}>
          <h3>Interested</h3>
          <p className={`${styles.statNumber} ${styles.textSuccess}`}>
            {visibleLeads.filter(l => l.status === 'INTERESTED' || l.status === 'CONVERTED').length}
          </p>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <div className={styles.tableHeader}>
          <h2>Lead Responses</h2>
          <p>You can see responses here and restart the dialer to retry 'No Answer' leads.</p>
        </div>
        
        {visibleLeads.length === 0 ? (
          <div className={styles.emptyState}>No leads assigned to you.</div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  {isLeader && <th>Assigned To</th>}
                  <th>Status</th>
                  <th>Call Notes</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {visibleLeads.map(lead => (
                  <tr key={lead.id}>
                    <td className={styles.fw600}>{lead.name}</td>
                    <td className={styles.monospace}>{lead.phone}</td>
                    {isLeader && <td>
                      <div className={styles.assigneeBadge}>
                        <User size={14} /> {getUserName(lead.assignedToUserId as string)}
                      </div>
                    </td>}
                    <td>{getStatusBadge(lead.status)}</td>
                    <td className={styles.notesColumn}>{lead.callNotes || "-"}</td>
                    <td>{lead.durationMinutes ? `${lead.durationMinutes} min` : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
