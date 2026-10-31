"use client";
import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLiveQuery } from "@/lib/firestore";
import { db } from "@/lib/db";
import { PhoneCall, ArrowLeft, Play, User, Clock, CheckCircle, Edit, Trash2, Download, RotateCcw } from "lucide-react";
import { EditCampaignModal } from "@/components/campaigns/EditCampaignModal";
import styles from "./CampaignDetails.module.css";

export default function CampaignDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useAuth();
  
  const campaignId = params.id as string;
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NO_ANSWER' | 'INTERESTED' | 'NOT_INTERESTED' | 'FOLLOW_UP' | 'PENDING'>('ALL');

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
  const uncalledLeads = visibleLeads.filter(l => l.status === 'PENDING');
  const noAnswerLeads = visibleLeads.filter(l => l.status === 'NO_ANSWER');
  const completedLeads = visibleLeads.filter(l => l.status !== 'PENDING' && l.status !== 'NO_ANSWER');
  const interestedLeads = visibleLeads.filter(l => l.status === 'INTERESTED' || l.status === 'CONVERTED');
  const notInterestedLeads = visibleLeads.filter(l => l.status === 'NOT_INTERESTED');
  const followUpLeads = visibleLeads.filter(l => l.status === 'FOLLOW_UP');

  const filteredLeads = visibleLeads.filter(lead => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'INTERESTED') return lead.status === 'INTERESTED' || lead.status === 'CONVERTED';
    return lead.status === statusFilter;
  });

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
      case 'FOLLOW_UP': return <span className={`${styles.badge} ${styles.pending}`}>Follow Up</span>;
      case 'AVERAGE': return <span className={`${styles.badge} ${styles.warning}`}>Average</span>;
      case 'NO_ANSWER': return <span className={`${styles.badge} ${styles.warning}`}>No Answer (Retry)</span>;
      default: return <span className={styles.badge}>{status}</span>;
    }
  };



  
  const performDelete = async () => {
    setIsDeleting(true);
    try {
      await db.campaigns.delete(campaignId);
      for (const l of rawLeads) {
         await db.campaignLeads.delete(l.id);
      }
      router.push('/campaigns');
    } catch(e) {
      console.error(e);
      alert("Error deleting campaign");
      setIsDeleting(false);
    }
  };


  const downloadCSV = () => {
    const headers = ["Name", "Phone", "Assigned Member", "Status", "Notes", "Duration (mins)", "Call Date"];
    const rows = filteredLeads.map(l => {
       const u = teamUsers?.find(u => String(u.id) === String(l.assignedToUserId));
       return [
         l.name,
         l.phone,
         u?.name || l.assignedToUserId,
         l.status,
         l.callNotes ? l.callNotes.replace(/,/g, " ") : "",
         l.durationMinutes || 0,
         l.lastCalledAt ? new Date(l.lastCalledAt).toLocaleString() : ""
       ];
    });
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `campaign_responses_${campaignId}_${statusFilter.toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="page-container">
      <header className="page-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 16 }}>
        <button className={styles.backBtn} onClick={() => router.push('/campaigns')}>
          <ArrowLeft size={16} /> Back to Campaigns
        </button>
        <div className={styles.headerFlex} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div style={{ wordBreak: 'break-word', overflowWrap: 'break-word', maxWidth: '100%', flex: 1 }}>
            <h1 style={{ fontSize: '2.5rem', lineHeight: 1.1, marginBottom: 8 }}>{campaign.title}</h1>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 12 }}>{campaign.description}</p>
            
            {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'FOLK_GUIDE' || String(campaign.creatorId) === String(currentUser?.id)) && (
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setShowEditModal(true)} className={styles.actionBtn}>
                  <Edit size={16} /> Edit
                </button>
                <button onClick={() => setShowDeleteModal(true)} className={`${styles.actionBtn} ${styles.deleteBtn}`}>
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {uncalledLeads.length > 0 && (
              <button 
                className="primary-btn" 
                style={{ padding: '12px 20px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={() => router.push(`/campaigns/${campaignId}/dialer?mode=pending`)}
              >
                <Play size={18} /> Start Calling ({uncalledLeads.length})
              </button>
            )}

            {noAnswerLeads.length > 0 && (
              <button 
                className="primary-btn" 
                style={{ 
                  padding: '12px 20px', 
                  fontSize: '1rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8,
                  background: uncalledLeads.length > 0 ? 'rgba(245, 158, 11, 0.15)' : 'var(--color-primary)',
                  color: uncalledLeads.length > 0 ? '#f59e0b' : '#fff',
                  border: uncalledLeads.length > 0 ? '1px solid rgba(245, 158, 11, 0.4)' : 'none'
                }}
                onClick={() => router.push(`/campaigns/${campaignId}/dialer?mode=retry`)}
              >
                <RotateCcw size={18} /> Retry No Answer ({noAnswerLeads.length})
              </button>
            )}

            {uncalledLeads.length === 0 && noAnswerLeads.length === 0 && (
              <button 
                className="primary-btn" 
                style={{ padding: '12px 20px', fontSize: '1rem', opacity: 0.7, cursor: 'default' }}
                disabled
              >
                <CheckCircle size={18} /> All Calls Completed!
              </button>
            )}
          </div>
        </div>
      </header>

      <div className={styles.statsCard}>
        <div className={styles.statBox}>
          <h3>Assigned</h3>
          <p className={styles.statNumber}>{totalLeads}</p>
        </div>
        <div className={styles.statBox}>
          <h3>Pending (New)</h3>
          <p className={styles.statNumber}>{uncalledLeads.length}</p>
        </div>
        <div className={styles.statBox}>
          <h3 style={{ color: '#f59e0b' }}>No Answer</h3>
          <p className={styles.statNumber} style={{ color: '#f59e0b' }}>
            {noAnswerLeads.length}
          </p>
        </div>
        <div className={styles.statBox}>
          <h3>Completed</h3>
          <p className={styles.statNumber}>{completedLeads.length}</p>
        </div>
        <div className={styles.statBox}>
          <h3>Interested</h3>
          <p className={`${styles.statNumber} ${styles.textSuccess}`}>
            {interestedLeads.length}
          </p>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <div className={styles.tableHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2>Lead Responses</h2>
            <p>View calling responses, filter by outcome, or restart the dialer to retry 'No Answer' leads.</p>
          </div>
          <button onClick={downloadCSV} style={{ background: 'var(--color-surface)', border: '1px solid var(--glass-border)', color: 'var(--color-text)', padding: '8px 16px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600 }}>
            <Download size={18} /> Export CSV {statusFilter !== 'ALL' ? `(${statusFilter})` : ''}
          </button>
        </div>

        <div className={styles.filterTabs}>
          <button 
            type="button"
            onClick={() => setStatusFilter('ALL')} 
            className={`${styles.filterTab} ${statusFilter === 'ALL' ? styles.filterTabActive : ''}`}
          >
            All ({totalLeads})
          </button>
          <button 
            type="button"
            onClick={() => setStatusFilter('NO_ANSWER')} 
            className={`${styles.filterTab} ${statusFilter === 'NO_ANSWER' ? styles.filterTabActive : ''}`}
          >
            No Answer ({noAnswerLeads.length})
          </button>
          <button 
            type="button"
            onClick={() => setStatusFilter('INTERESTED')} 
            className={`${styles.filterTab} ${statusFilter === 'INTERESTED' ? styles.filterTabActive : ''}`}
          >
            Interested ({interestedLeads.length})
          </button>
          <button 
            type="button"
            onClick={() => setStatusFilter('NOT_INTERESTED')} 
            className={`${styles.filterTab} ${statusFilter === 'NOT_INTERESTED' ? styles.filterTabActive : ''}`}
          >
            Not Interested ({notInterestedLeads.length})
          </button>
          <button 
            type="button"
            onClick={() => setStatusFilter('FOLLOW_UP')} 
            className={`${styles.filterTab} ${statusFilter === 'FOLLOW_UP' ? styles.filterTabActive : ''}`}
          >
            Follow Up ({followUpLeads.length})
          </button>
          <button 
            type="button"
            onClick={() => setStatusFilter('PENDING')} 
            className={`${styles.filterTab} ${statusFilter === 'PENDING' ? styles.filterTabActive : ''}`}
          >
            Pending ({uncalledLeads.length})
          </button>
        </div>
        
        {filteredLeads.length === 0 ? (
          <div className={styles.emptyState}>No leads found for this filter.</div>
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
                {filteredLeads.map(lead => (
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

      {showEditModal && teamUsers && (
        <EditCampaignModal 
          campaign={campaign} 
          teamUsers={teamUsers}
          rawLeads={rawLeads}
          onClose={() => setShowEditModal(false)} 
        />
      )}

      {showDeleteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: 400, textAlign: 'center' }}>
            <Trash2 size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
            <h2 style={{ marginBottom: 12 }}>Delete Campaign?</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>
              Are you sure you want to permanently delete this campaign and all of its lead data? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => setShowDeleteModal(false)} className="secondary-btn" disabled={isDeleting}>Cancel</button>
              <button onClick={performDelete} className="primary-btn" style={{ background: '#ef4444', borderColor: '#ef4444', color: '#fff' }} disabled={isDeleting}>
                {isDeleting ? "Deleting..." : "Yes, Delete It"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
