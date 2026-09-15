// @ts-nocheck
import { useLiveQuery } from "@/lib/firestore";
import { db } from "@/lib/db";
"use client";

import React, { useState } from "react";
import { firestoreAPI, useFirestoreQuery, useFirestoreDoc } from "@/lib/firestore";
import { where } from "firebase/firestore";;
import Link from "next/link";
import { ArrowLeft, Phone, Plus, X } from "lucide-react";
import styles from "./GroupView.module.css";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import groupStyles from "../Groups.module.css"; // Reuse modal styles

export default function GroupViewPage({ params }: { params: Promise<{ tagName: string }> }) {
  const unwrappedParams = React.use(params);
  const tagName = decodeURIComponent(unwrappedParams.tagName);
  const { currentUser } = useAuth();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const allContacts = useLiveQuery(async () => {
    if (!currentUser?.id) return [];
    return await db.people.where('ownerId').equals(currentUser.id).toArray();
  }, [currentUser?.id]);

  const peopleInGroup = allContacts?.filter(p => p.tags && p.tags.includes(tagName)).sort((a, b) => b.priorityScore - a.priorityScore) || [];
  
  const peopleNotInGroup = allContacts?.filter(p => !p.tags?.includes(tagName))
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.phone.includes(searchQuery))
    .sort((a, b) => b.priorityScore - a.priorityScore) || [];

  const handleToggleSelect = (id: number) => {
    const newSet = new Set(selectedContactIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedContactIds(newSet);
  };

  const handleAddContacts = async () => {
    if (selectedContactIds.size === 0) return;
    
    try {
      const contactsToUpdate = allContacts?.filter(p => selectedContactIds.has(p.id!)) || [];
      
      for (const contact of contactsToUpdate) {
        const newTags = [...(contact.tags || []), tagName];
        await firestoreAPI.update('people', contact.id!, { tags: newTags });
      }
      
      setShowAddModal(false);
      setSelectedContactIds(newSet => new Set());
      setSearchQuery("");
    } catch (err) {
      console.error("Failed to add contacts to group", err);
      alert("Failed to add contacts to group.");
    }
  };

  if (!allContacts) {
    return <div className={styles.container}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/groups" className={styles.backBtn}>
          <ArrowLeft size={20} /> Back to Groups
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{tagName}</h1>
            <span className={styles.badge}>{peopleInGroup.length} Members</span>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className={groupStyles.btnSave}
            style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px' }}
          >
            <Plus size={18} /> Add Contacts
          </button>
        </div>
      </header>

      <div className={styles.list}>
        {peopleInGroup.length === 0 ? (
          <div className={styles.emptyState}>No members found in this group.</div>
        ) : (
          peopleInGroup.map(person => (
            <div key={person.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.info}>
                  <Link href={`/people/${person.id}`} className={styles.name}>
                    {person.name}
                  </Link>
                  <div className={styles.metaRow}>
                    <span className={styles.phone}>{person.phone}</span>
                    {person.priorityScore > 0 && (
                      <span className={styles.priorityBadge}>⭐ {person.priorityScore}</span>
                    )}
                  </div>
                </div>
                <a 
                  href={`tel:${person.phone}`} 
                  className={styles.callBtn}
                >
                  <Phone size={18} />
                </a>
              </div>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <div className={groupStyles.modalOverlay}>
          <div className={groupStyles.modalContent} style={{ maxWidth: 500, display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
            <div className={groupStyles.modalHeader}>
              <h2 className={groupStyles.modalTitle}>Add Contacts to Group</h2>
              <button onClick={() => setShowAddModal(false)} className={groupStyles.closeBtn}><X size={24} /></button>
            </div>
            
            <input 
              type="text" 
              placeholder="Search contacts..." 
              className={groupStyles.input}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ marginBottom: 16 }}
            />
            
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {peopleNotInGroup.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 20 }}>
                  No available contacts found.
                </div>
              ) : (
                peopleNotInGroup.map(person => (
                  <div 
                    key={person.id} 
                    onClick={() => handleToggleSelect(person.id!)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 12, 
                      padding: 12, 
                      border: `1px solid ${selectedContactIds.has(person.id!) ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      borderRadius: 8,
                      cursor: 'pointer',
                      background: selectedContactIds.has(person.id!) ? 'var(--color-primary-light)' : 'transparent'
                    }}
                  >
                    <input 
                      type="checkbox" 
                      checked={selectedContactIds.has(person.id!)}
                      readOnly
                      style={{ pointerEvents: 'none' }}
                    />
                    <div>
                      <div style={{ fontWeight: 600 }}>{person.name}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{person.phone}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <button 
              className={groupStyles.btnSave} 
              onClick={handleAddContacts}
              disabled={selectedContactIds.size === 0}
              style={{ opacity: selectedContactIds.size === 0 ? 0.5 : 1 }}
            >
              Add {selectedContactIds.size > 0 ? selectedContactIds.size : ''} Contacts
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
