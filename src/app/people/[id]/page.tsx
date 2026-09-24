"use client";
// @ts-nocheck
import { useLiveQuery } from "@/lib/firestore";
import { db } from "@/lib/db";

import { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Phone, MessageCircle, Calendar, PlusCircle, Book, Coffee, Users } from "lucide-react";
import { firestoreAPI, useFirestoreQuery, useFirestoreDoc } from "@/lib/firestore";
import { where } from "firebase/firestore";;
import styles from "./PersonProfile.module.css";
import { format } from "date-fns";
import clsx from "clsx";
import React from "react";
import { InteractionModal } from "@/components/people/InteractionModal";
import { ReferToGuideModal } from "@/components/people/ReferToGuideModal";
import { TransferModal } from "@/components/people/TransferModal";

const safeDate = (d: any) => {
  if (!d) return new Date();
  if (typeof d.toDate === 'function') return d.toDate();
  return new Date(d);
};
import { QuickAddContact } from "@/components/people/QuickAddContact";
import { Interaction } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { GlassSelect } from "@/components/ui/GlassSelect";

export default function PersonProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = React.use(params);
  const id = String(unwrappedParams.id);
  const searchParams = useSearchParams();
  const from = searchParams.get('from');

  const handleBack = () => {
    if (from) {
      router.push(from);
    } else {
      router.back();
    }
  };

  const { currentUser } = useAuth();
  const teamUsers = useLiveQuery(async () => {
    if (!currentUser?.teamId) return [];
    const users = await db.users.where('teamId').equals(currentUser.teamId).toArray();
    return users.filter((u: any) => String(u.id) !== String(currentUser.id));
  }, [currentUser?.teamId]);

  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [showReferModal, setShowReferModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [interactionType, setInteractionType] = useState<Interaction['type']>('CALL');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState('');
  const [referGuideId, setReferGuideId] = useState('');
  const [referNotes, setReferNotes] = useState('');

  const allUsers = useLiveQuery(() => db.users.toArray(), []);

  const handleOpenInteraction = (type: Interaction['type']) => {
    setInteractionType(type);
    setShowInteractionModal(true);
  };

  const person = useFirestoreDoc('people', id);
  const timelineEvents = useLiveQuery(async () => {
    const interactions = await db.interactions.where("personId").equals(id).toArray();
    const attendances = await db.sessionAttendance.where("personId").equals(id).toArray();
    
    const attendedSessions = attendances.filter(a => ['ATTENDED', 'CONFIRMED', 'JOINING_NEXT_SESSION'].includes(a.status));
    
    const sessionPromises = attendedSessions.map(async (a) => {
      const session = await db.sessions.get(a.sessionId);
      let outcome = `Registered for: ${session?.name || 'Session'}`;
      if (a.status === 'ATTENDED') outcome = `Attended: ${session?.name || 'Session'}`;
      
      return {
        id: `attendance-${a.id}`,
        type: 'SESSION_ATTENDANCE' as any,
        date: a.checkedInAt || session?.date || new Date(),
        outcome: outcome,
        notes: a.status === 'ATTENDED' ? 'Checked in successfully' : `Status: ${a.status}`,
      };
    });

    const sessionEvents = await Promise.all(sessionPromises);
    const merged = [...interactions, ...sessionEvents];
    
    // Deduplicate: remove identical events logged within 60 seconds of each other
    const uniqueMerged = merged.reduce((acc, current) => {
      const isDuplicate = acc.some(item => 
        item.type === current.type && 
        item.outcome === current.outcome && 
        Math.abs(new Date(safeDate(item.date)).getTime() - new Date(safeDate(current.date)).getTime()) < 60000
      );
      if (!isDuplicate) {
        acc.push(current);
      }
      return acc;
    }, [] as any[]);

    return uniqueMerged.sort((a, b) => new Date(safeDate(b.date)).getTime() - new Date(safeDate(a.date)).getTime());
  }, [id]);

  if (person === undefined) {
    return <div className={styles.container}>Loading profile...</div>;
  }

  if (person === null) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button onClick={handleBack} className={styles.backBtn}>
            <ArrowLeft size={20} /> Back
          </button>
          <h2>Person not found</h2>
        </div>
      </div>
    );
  }

  // Priority indicator logic
  let priorityClass = styles.priorityLow;
  let priorityText = "Normal";
  if (person.priorityScore > 10) {
    priorityClass = styles.priorityHigh;
    priorityText = "High Priority";
  } else if (person.priorityScore > 0) {
    priorityClass = styles.priorityMedium;
    priorityText = "Active";
  }

  return (
    <div className={styles.container} style={{ paddingBottom: '90px' }}>
      <button onClick={handleBack} className={styles.backBtn}>
        <ArrowLeft size={20} /> Back
      </button>

      <div className={styles.profileCard}>
        <div className={styles.titleRow}>
          <div>
            <h1 className={styles.name}>{person.name}</h1>
            <div className={clsx(styles.priorityBadge, priorityClass)}>
              {priorityText}
            </div>
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '24px' }}>
            <button 
              className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
              onClick={() => setIsEditing(true)}
              style={{ padding: '10px 16px', fontSize: '0.85rem' }}
            >
              Edit Profile
            </button>
            <button 
              className={`${styles.actionBtn}`}
              onClick={() => setShowReferModal(true)}
              style={{ padding: '10px 16px', fontSize: '0.85rem', background: 'rgba(139, 92, 246, 0.1)', color: 'rgb(167, 139, 250)', border: '1px solid rgba(139, 92, 246, 0.3)' }}
            >
              Refer to Guide
            </button>
            {String(person.ownerId) === String(currentUser?.id) ? (
              <button 
                className={`${styles.actionBtn}`}
                onClick={() => setShowTransferModal(true)}
                style={{ padding: '10px 16px', fontSize: '0.85rem', background: 'rgba(59, 130, 246, 0.1)', color: 'rgb(96, 165, 250)', border: '1px solid rgba(59, 130, 246, 0.3)' }}
              >
                Transfer
              </button>
            ) : <div />}
            <button 
              className={`${styles.actionBtn}`}
              onClick={async () => {
                if (window.confirm("Are you sure you want to delete this contact? This action cannot be undone.")) {
                  await firestoreAPI.delete('people', id);
                  router.push('/people');
                }
              }}
              style={{ padding: '10px 16px', fontSize: '0.85rem', background: 'var(--color-danger-light)', color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}
            >
              Delete
            </button>
        </div>

        <div className={styles.quickActions} style={{ marginBottom: '24px', borderTop: 'none', paddingTop: 0 }}>
          <a href={`tel:${person.phone}`} className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} style={{ gridColumn: 'span 2' }}>
            <Phone size={18} /> Call
          </a>
          <button 
            className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
            onClick={() => handleOpenInteraction('CALL')}
          >
            <PlusCircle size={18} /> Log Interaction
          </button>
          <button 
            className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
            onClick={() => handleOpenInteraction('MEETING')}
          >
            <Calendar size={18} /> Schedule 1-to-1
          </button>
          <button 
            className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
            onClick={() => handleOpenInteraction('PRASADAM')}
          >
            <Coffee size={18} /> Prasadam
          </button>
          <button 
            className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
            onClick={() => handleOpenInteraction('BOOK')}
          >
            <Book size={18} /> Book Reading
          </button>
          <a href={`https://wa.me/${person.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className={`${styles.actionBtn} ${styles.actionBtnSecondary}`} style={{ gridColumn: 'span 2' }}>
            <MessageCircle size={18} /> WhatsApp Message
          </a>
        </div>

        <div className={styles.detailsGrid}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Phone</span>
            <span className={styles.detailValue}>{person.phone}</span>
          </div>
          {person.college && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>College</span>
              <span className={styles.detailValue}>{person.college}</span>
            </div>
          )}
          {person.university && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>University</span>
              <span className={styles.detailValue}>{person.university}</span>
            </div>
          )}
          {person.branch && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Branch / Year</span>
              <span className={styles.detailValue}>{person.branch} {person.year && `(${person.year})`}</span>
            </div>
          )}
          {person.company && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Company</span>
              <span className={styles.detailValue}>{person.company}</span>
            </div>
          )}
          {person.jobRole && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Job Role</span>
              <span className={styles.detailValue}>{person.jobRole}</span>
            </div>
          )}
          {person.currentCity && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Current City</span>
              <span className={styles.detailValue}>{person.currentCity}</span>
            </div>
          )}
          {person.nativePlace && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Native Place</span>
              <span className={styles.detailValue}>{person.nativePlace}</span>
            </div>
          )}
          {person.birthday && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Birthday</span>
              <span className={styles.detailValue}>{format(safeDate(person.birthday), "MMM d")}</span>
            </div>
          )}
          {person.howMet && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Source</span>
              <span className={styles.detailValue}>{person.howMet}</span>
            </div>
          )}
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>First Contact</span>
            <span className={styles.detailValue}>
              {format(safeDate(person.firstContactDate), "MMM d, yyyy")}
            </span>
          </div>
          {person.hostel && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Hostel</span>
              <span className={styles.detailValue}>{person.hostel}</span>
            </div>
          )}
          {person.customFields && Object.entries(person.customFields).map(([key, value]) => (
            <div className={styles.detailItem} key={key}>
              <span className={styles.detailLabel}>{key}</span>
              <span className={styles.detailValue}>{value as string}</span>
            </div>
          ))}
        </div>

        <div className={styles.detailsGrid} style={{ marginTop: '16px', background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.2)', padding: '12px 16px', borderRadius: '12px' }}>
          <div style={{ gridColumn: '1 / -1', marginBottom: '4px' }}>
            <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0, color: 'var(--color-primary)' }}>Spiritual Progress</h3>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Chanting Rounds</span>
            <span className={styles.detailValue} style={{ fontWeight: 600 }}>
              {person.chantingRounds !== undefined ? `${person.chantingRounds} Rounds` : "Not Started"}
            </span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Ashraya Level</span>
            <span className={styles.detailValue} style={{ fontWeight: 600, color: 'var(--color-warning)' }}>
              {person.ashrayaLevel || "None"}
            </span>
          </div>
        </div>


      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Relationship Timeline</h2>
        
        <div className={styles.timeline}>
          {timelineEvents?.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>No interactions recorded yet.</p>
          ) : (
            timelineEvents?.map(interaction => (
              <div key={interaction.id} className={styles.timelineItem}>
                <div className={styles.timelineIcon} style={interaction.type === 'SESSION_ATTENDANCE' ? { background: 'var(--color-primary-light)', color: 'var(--color-primary)' } : {}}>
                  {interaction.type === 'CALL' && <Phone size={20} />}
                  {interaction.type === 'MEETING' && <Calendar size={20} />}
                  {interaction.type === 'WHATSAPP' && <MessageCircle size={20} />}
                  {interaction.type === 'PRASADAM' && <Coffee size={20} />}
                  {interaction.type === 'BOOK' && <Book size={20} />}
                  {interaction.type === 'SESSION_ATTENDANCE' && <Users size={20} />}
                  {interaction.type === 'OTHER' && <PlusCircle size={20} />}
                </div>
                <div className={styles.timelineContent}>
                  <div className={styles.timelineHeader}>
                    <span className={styles.timelineType} style={interaction.type === 'SESSION_ATTENDANCE' ? { color: 'var(--color-primary)' } : {}}>
                      {interaction.type === 'SESSION_ATTENDANCE' ? 'SESSION' : interaction.type} {interaction.outcome ? `- ${interaction.outcome}` : ''}
                    </span>
                    <span className={styles.timelineDate}>
                      {format(safeDate(interaction.date), "MMM d, yyyy h:mm a")}
                    </span>
                  </div>
                  {interaction.purpose && (
                    <div style={{ fontWeight: 500, marginBottom: 4, fontSize: '0.875rem' }}>
                      Purpose: {interaction.purpose}
                    </div>
                  )}
                  {interaction.notes && (
                    <div className={styles.timelineNotes}>{interaction.notes}</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showInteractionModal && (
        <InteractionModal 
          personId={id as unknown as number} 
          initialType={interactionType}
          onClose={() => setShowInteractionModal(false)} 
        />
      )}

      {showReferModal && (
        <ReferToGuideModal
          personId={id}
          personName={person.name}
          onClose={() => setShowReferModal(false)}
        />
      )}

      {showTransferModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'var(--color-surface)', padding: 24, borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 400, border: '1px solid var(--color-border)' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: 16 }}>Transfer Contact</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 20, fontSize: '0.9rem' }}>
              Select a team member to willingly transfer <strong>{person.name}</strong> to. Once transferred, they will disappear from your list.
            </p>
            <div style={{ marginBottom: 24 }}>
              <GlassSelect 
                value={transferTargetId} 
                onChange={val => setTransferTargetId(val)}
                options={[
                  { value: "", label: "Select member..." },
                  ...(teamUsers?.map(u => ({ value: String(u.id), label: u.name })) || [])
                ]}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button 
                onClick={() => setShowTransferModal(false)}
                style={{ 
                  flex: 1, padding: '12px', background: 'transparent', 
                  border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', 
                  color: 'white', cursor: 'pointer', transition: 'all 0.2s ease', fontWeight: 500
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  if (!transferTargetId) return;
                  await db.contactTransfers.add({
                    personId: id,
                    fromUserId: currentUser?.id,
                    toUserId: transferTargetId,
                    status: 'PENDING',
                    requestDate: new Date(),
                    direction: 'PUSH'
                  });
                  await db.notifications.add({
                    userId: transferTargetId,
                    message: `${currentUser?.name || 'A team member'} wants to transfer a contact to you: ${person.name}. Please check your Inbox.`,
                    isRead: false,
                    createdAt: new Date(),
                    link: `/tasks`
                  });
                  alert(`Transfer request sent to the user's inbox successfully!`);
                  setShowTransferModal(false);
                }}
                disabled={!transferTargetId}
                style={{ 
                  flex: 1, padding: '12px', background: 'var(--color-primary)', 
                  border: 'none', borderRadius: 'var(--radius-md)', 
                  color: 'white', cursor: transferTargetId ? 'pointer' : 'not-allowed', 
                  transition: 'all 0.2s ease', fontWeight: 500, opacity: transferTargetId ? 1 : 0.5 
                }}
                onMouseOver={e => transferTargetId && (e.currentTarget.style.filter = 'brightness(1.1)')}
                onMouseOut={e => transferTargetId && (e.currentTarget.style.filter = 'brightness(1)')}
              >
                Transfer Now
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditing && (
        <QuickAddContact 
          personToEdit={person}
          onClose={() => setIsEditing(false)}
        />
      )}

      {showReferModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: 500, width: '90%' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: 16 }}>Refer to Folk Guide</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 20, fontSize: '0.9rem' }}>
              Select a Folk Guide to refer <strong>{person.name}</strong> to. Please provide details on why you are referring them.
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Select Folk Guide</label>
              <GlassSelect 
                value={referGuideId} 
                onChange={val => setReferGuideId(val)}
                options={[
                  { value: "", label: "Select Guide..." },
                  ...(allUsers?.filter(u => u.role === 'FOLK_GUIDE').map(u => ({ value: String(u.id), label: u.name })) || [])
                ]}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Notes / Reason for Referral</label>
              <textarea 
                value={referNotes}
                onChange={e => setReferNotes(e.target.value)}
                placeholder="He has to meet 1-to-1 regarding..."
                rows={4}
                style={{ width: '100%', padding: '12px', background: 'var(--glass-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button 
                onClick={() => setShowReferModal(false)}
                style={{ 
                  flex: 1, padding: '12px', background: 'transparent', 
                  border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', 
                  color: 'white', cursor: 'pointer', transition: 'all 0.2s ease', fontWeight: 500
                }}
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  if (!referGuideId) return;
                  await db.tasks.add({
                    personId: id,
                    assignedToUserId: referGuideId,
                    title: `Referral: ${person.name}`,
                    type: 'MEETING',
                    status: 'TODO',
                    dueDate: new Date().toISOString(),
                    description: `Referred by ${currentUser?.name}:\n${referNotes}`
                  });
                  await db.notifications.add({
                    userId: referGuideId,
                    message: `${currentUser?.name} referred a contact to you: ${person.name}.`,
                    isRead: false,
                    createdAt: new Date().toISOString(),
                    link: `/people/${id}`
                  });
                  alert(`Referred to Guide successfully!`);
                  setShowReferModal(false);
                }}
                disabled={!referGuideId || !referNotes}
                style={{ 
                  flex: 1, padding: '12px', background: 'var(--color-primary)', 
                  border: 'none', borderRadius: 'var(--radius-md)', 
                  color: 'white', cursor: (referGuideId && referNotes) ? 'pointer' : 'not-allowed', 
                  transition: 'all 0.2s ease', fontWeight: 500, opacity: (referGuideId && referNotes) ? 1 : 0.5 
                }}
              >
                Submit Referral
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
