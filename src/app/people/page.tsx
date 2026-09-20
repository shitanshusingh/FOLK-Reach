"use client";
// @ts-nocheck
import { useLiveQuery } from "@/lib/firestore";
import { db } from "@/lib/db";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, Phone, User as UserIcon } from "lucide-react";
import styles from "./People.module.css";
import { firestoreAPI, useFirestoreQuery, useFirestoreDoc } from "@/lib/firestore";
import { where } from "firebase/firestore";
import { Person } from "@/lib/db";;
import { QuickAddContact } from "@/components/people/QuickAddContact";
import { LogInteractionModal } from "@/components/dashboard/LogInteractionModal";
import { useAuth } from "@/contexts/AuthContext";

import clsx from "clsx";

export default function PeoplePage() {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  
  const [activeCallPerson, setActiveCallPerson] = useState<Person | null>(null);

  const { currentUser } = useAuth();

  // useLiveQuery will re-render automatically when dexie data changes
  const people = useLiveQuery(
    async () => {
      if (!currentUser?.id) return [];
      
      let queryResult = await db.people.where('ownerId').equals(currentUser.id).toArray();
      // Sort by priorityScore descending
      queryResult.sort((a, b) => b.priorityScore - a.priorityScore);

      if (searchQuery.trim().length > 0) {
        // Case-insensitive search on name, phone, or college
        const query = searchQuery.toLowerCase();
        queryResult = queryResult.filter(person => 
          person.name.toLowerCase().includes(query) ||
          person.phone.includes(query) ||
          (person.college?.toLowerCase() || "").includes(query) ||
          (person.hostel?.toLowerCase() || "").includes(query)
        );
      }

      if (activeFilter === 'HOT') {
        queryResult = queryResult.filter(p => p.priorityScore >= 20);
      } else if (activeFilter === 'WARM') {
        queryResult = queryResult.filter(p => p.priorityScore >= 10 && p.priorityScore < 20);
      } else if (activeFilter === 'COLD') {
        queryResult = queryResult.filter(p => p.priorityScore > 0 && p.priorityScore < 10);
      } else if (activeFilter === 'DORMANT') {
        queryResult = queryResult.filter(p => p.priorityScore <= 0);
      } else if (activeFilter === 'ROUNDS_4') {
        queryResult = queryResult.filter(p => p.chantingRounds === 4);
      } else if (activeFilter === 'ROUNDS_8') {
        queryResult = queryResult.filter(p => p.chantingRounds === 8);
      } else if (activeFilter === 'ROUNDS_12') {
        queryResult = queryResult.filter(p => p.chantingRounds === 12);
      } else if (activeFilter === 'ROUNDS_16') {
        queryResult = queryResult.filter(p => p.chantingRounds && p.chantingRounds >= 16);
      }

      return queryResult;
    },
    [searchQuery, activeFilter, currentUser?.id]
  );

  const handleCall = (person: Person, e: React.MouseEvent) => {
    e.preventDefault();
    setActiveCallPerson(person);
    window.location.href = `tel:${person.phone}`;
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>People</h1>
      </header>

      <div className={styles.searchContainer}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
          <Search className={styles.searchIcon} color="var(--color-text-muted)" />
          <input 
            type="text" 
            placeholder="Search by name, phone, or college..." 
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className={styles.tabBar}>
          <button 
            className={clsx(styles.tabBtn, activeFilter === null && styles.tabBtnActive)}
            onClick={() => setActiveFilter(null)}
          >
            All
          </button>
          <button 
            className={clsx(styles.tabBtn, activeFilter === 'HOT' && styles.tabBtnActive)}
            onClick={() => setActiveFilter('HOT')}
          >
            Hot
          </button>
          <button 
            className={clsx(styles.tabBtn, activeFilter === 'WARM' && styles.tabBtnActive)}
            onClick={() => setActiveFilter('WARM')}
          >
            Warm
          </button>
          <button 
            className={clsx(styles.tabBtn, activeFilter === 'COLD' && styles.tabBtnActive)}
            onClick={() => setActiveFilter('COLD')}
          >
            Cold
          </button>
          <button 
            className={clsx(styles.tabBtn, activeFilter === 'DORMANT' && styles.tabBtnActive)}
            onClick={() => setActiveFilter('DORMANT')}
          >
            Dormant
          </button>
        </div>
        <div className={styles.tabBar}>
          <button 
            className={clsx(styles.tabBtn, activeFilter === 'ROUNDS_4' && styles.tabBtnActive)}
            onClick={() => setActiveFilter('ROUNDS_4')}
          >
            4
          </button>
          <button 
            className={clsx(styles.tabBtn, activeFilter === 'ROUNDS_8' && styles.tabBtnActive)}
            onClick={() => setActiveFilter('ROUNDS_8')}
          >
            8
          </button>
          <button 
            className={clsx(styles.tabBtn, activeFilter === 'ROUNDS_12' && styles.tabBtnActive)}
            onClick={() => setActiveFilter('ROUNDS_12')}
          >
            12
          </button>
          <button 
            className={clsx(styles.tabBtn, activeFilter === 'ROUNDS_16' && styles.tabBtnActive)}
            onClick={() => setActiveFilter('ROUNDS_16')}
          >
            16
          </button>
        </div>
      </div>

      <div className={styles.list}>
        {people === undefined ? (
          <p className={styles.emptyState}>Loading...</p>
        ) : people.length === 0 ? (
          <div className={styles.emptyState}>
            {searchQuery ? "No contacts match your search." : "You haven't added anyone yet."}
          </div>
        ) : (
          people.map(person => (
            <div key={person.id} className={styles.card}>
              <Link href={`/people/${person.id}`} className={styles.cardInfo}>
                <div className={styles.cardNameRow}>
                  <div className={styles.cardName}>{person.name}</div>
                  {person.priorityScore > 0 && (
                    <span className={styles.priorityBadge}>⭐ {person.priorityScore}</span>
                  )}
                </div>
                <div className={styles.cardMeta}>
                  {person.college || person.howMet || "No college details"} • {person.phone}
                </div>
              </Link>
              <div className={styles.cardActions}>
                {/* One-tap calling via standard tel: link + Open log modal */}
                <button 
                  className={styles.actionBtn} 
                  aria-label={`Call ${person.name}`}
                  onClick={(e) => handleCall(person, e)}
                >
                  <Phone size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {activeCallPerson && (
        <LogInteractionModal 
          person={activeCallPerson}
          type="CALL"
          onClose={() => setActiveCallPerson(null)}
          onSuccess={() => setActiveCallPerson(null)}
        />
      )}
    </div>
  );
}
