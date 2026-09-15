// @ts-nocheck
import { useLiveQuery } from "@/lib/firestore";
import { db } from "@/lib/db";
"use client";

import { firestoreAPI, useFirestoreQuery, useFirestoreDoc } from "@/lib/firestore";
import { where } from "firebase/firestore";;
import Link from "next/link";
import { FolderOpen, Users, Plus, X, Trash2 } from "lucide-react";
import styles from "./Groups.module.css";
import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function GroupsPage() {
  const { currentUser } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const allPeople = useLiveQuery(async () => {
    if (!currentUser?.id) return [];
    return await db.people.where('ownerId').equals(currentUser.id).toArray();
  }, [currentUser?.id]);

  const customGroups = useLiveQuery(async () => {
    if (!currentUser?.id) return [];
    return await db.customGroups.where('ownerId').equals(currentUser.id).toArray();
  }, [currentUser?.id]);

  if (!allPeople || !customGroups) {
    return <div className={styles.container}>Loading...</div>;
  }

  // Calculate members per group
  const tagCounts: Record<string, number> = {};
  allPeople.forEach(person => {
    if (person.tags) {
      person.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    }
  });

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !currentUser?.id) return;
    
    try {
      await db.customGroups.add({
        name: newGroupName.trim(),
        ownerId: currentUser.id
      });
      setNewGroupName("");
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
      alert("Failed to create group");
    }
  };

  const handleDeleteGroup = async (e: React.MouseEvent, id: number, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (window.confirm(`Are you sure you want to completely delete the group "${name}"? This will remove the group tag from all members.`)) {
      try {
        await firestoreAPI.delete('customGroups', id);
        
        // Remove tag from all people
        const peopleWithTag = await db.people.filter(p => p.ownerId === currentUser?.id && !!p.tags?.includes(name)).toArray();
        for (const p of peopleWithTag) {
          const newTags = p.tags.filter(t => t !== name);
          await firestoreAPI.update('people', p.id!, { tags: newTags });
        }
      } catch (err) {
        console.error(err);
        alert("Failed to delete group");
      }
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Custom Groups</h1>
        <p className={styles.subtitle}>
          Create groups and add contacts to organize your calling lists.
        </p>
      </header>

      {customGroups.length === 0 ? (
        <div className={styles.emptyState}>
          <FolderOpen size={48} style={{ opacity: 0.5, marginBottom: 16 }} />
          <h3>No Groups Found</h3>
          <p>Click the + button to create your first group.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {customGroups.map(group => (
            <Link href={`/groups/${encodeURIComponent(group.name)}`} key={group.id} className={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-start' }}>
                <div className={styles.cardIcon}>
                  <FolderOpen size={24} />
                </div>
                <button 
                  onClick={(e) => handleDeleteGroup(e, group.id!, group.name)} 
                  className={styles.deleteBtn}
                  title="Delete Group"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className={styles.cardInfo}>
                <h3 className={styles.cardTitle}>{group.name}</h3>
                <span className={styles.cardCount}>
                  <Users size={14} /> {tagCounts[group.name] || 0} members
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <button 
        className={styles.fab} 
        onClick={() => setShowAddModal(true)}
      >
        <Plus size={28} />
      </button>

      {showAddModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>New Group</h2>
              <button onClick={() => setShowAddModal(false)} className={styles.closeBtn}><X size={24} /></button>
            </div>
            <form onSubmit={handleAddGroup}>
              <div className={styles.formGroup}>
                <label>Group Name *</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  required 
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  placeholder="e.g. Youth Camp 2026"
                  autoFocus
                />
              </div>
              <button type="submit" className={styles.btnSave}>Create Group</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
