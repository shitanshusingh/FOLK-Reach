"use client";
// @ts-nocheck
import { useLiveQuery } from "@/lib/firestore";
import { db } from "@/lib/db";

import { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Phone, MessageCircle, Calendar, PlusCircle, Book, Coffee } from "lucide-react";
import { firestoreAPI, useFirestoreQuery, useFirestoreDoc } from "@/lib/firestore";
import { where } from "firebase/firestore";;
import styles from "./PersonProfile.module.css";
import { format } from "date-fns";
import clsx from "clsx";
import React from "react";
import { InteractionModal } from "@/components/people/InteractionModal";

const safeDate = (d: any) => {
  if (!d) return new Date();
  if (typeof d.toDate === 'function') return d.toDate();
  return new Date(d);
};
import { QuickAddContact } from "@/components/people/QuickAddContact";
import { Interaction } from "@/lib/db";

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

  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [interactionType, setInteractionType] = useState<Interaction['type']>('CALL');

  const handleOpenInteraction = (type: Interaction['type']) => {
    setInteractionType(type);
    setShowInteractionModal(true);
  };

  const person = useFirestoreDoc('people', id);
  const interactions = useLiveQuery(() => 
    db.interactions.where("personId").equals(id).reverse().sortBy("date"), 
  [id]);

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
    <div className={styles.container}>
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
          <button 
            className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
            onClick={() => setIsEditing(true)}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            Edit Profile
          </button>
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
        </div>

        <div className={styles.quickActions}>
          <a href={`tel:${person.phone}`} className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}>
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
            <Book size={18} /> Give Book
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Relationship Timeline</h2>
        
        <div className={styles.timeline}>
          {interactions?.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>No interactions recorded yet.</p>
          ) : (
            interactions?.map(interaction => (
              <div key={interaction.id} className={styles.timelineItem}>
                <div className={styles.timelineIcon}>
                  {interaction.type === 'CALL' && <Phone size={20} />}
                  {interaction.type === 'MEETING' && <Calendar size={20} />}
                  {interaction.type === 'WHATSAPP' && <MessageCircle size={20} />}
                  {interaction.type === 'PRASADAM' && <Coffee size={20} />}
                  {interaction.type === 'BOOK' && <Book size={20} />}
                  {interaction.type === 'OTHER' && <PlusCircle size={20} />}
                </div>
                <div className={styles.timelineContent}>
                  <div className={styles.timelineHeader}>
                    <span className={styles.timelineType}>
                      {interaction.type} {interaction.outcome ? `- ${interaction.outcome}` : ''}
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
          personId={id} 
          initialType={interactionType}
          onClose={() => setShowInteractionModal(false)} 
        />
      )}

      {isEditing && (
        <QuickAddContact 
          personToEdit={person}
          onClose={() => setIsEditing(false)}
        />
      )}
    </div>
  );
}
