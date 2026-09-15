"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, Phone, User as UserIcon } from "lucide-react";
import styles from "./People.module.css";
import { firestoreAPI, useFirestoreQuery, useFirestoreDoc } from "@/lib/firestore";
import { where } from "firebase/firestore";
import { Person } from "@/lib/db";;
import { QuickAddContact } from "@/components/people/QuickAddContact";
import { useAuth } from "@/contexts/AuthContext";

import clsx from "clsx";

export default function PeoplePage() {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const { currentUser } = useAuth();

  // useLiveQuery will re-render automatically when dexie data changes
  const people = useLiveQuery(
    async () => {
      if (!currentUser?.id) return [];
      let queryResult = await db.people.where('ownerId').equals(currentUser.id).toArray();
      // Sort by priorityScore descending instead of alphabetical
      queryResult.sort((a, b) => b.priorityScore - a.priorityScore);

      if (searchQuery.trim().length > 0) {
        // Case-insensitive search on name, phone, or college
        const query = searchQuery.toLowerCase();
        queryResult = queryResult.filter(person => 
          person.name.toLowerCase().includes(query) ||
          person.phone.includes(query) ||
          (person.college?.toLowerCase() || "").includes(query)
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
      }

      return queryResult;
    },
    [searchQuery, activeFilter, currentUser?.id]
  );

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
                {/* One-tap calling via standard tel: link */}
                <a href={`tel:${person.phone}`} className={styles.actionBtn} aria-label={`Call ${person.name}`}>
                  <Phone size={18} />
                </a>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
