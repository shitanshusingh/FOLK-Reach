// @ts-nocheck
import { db } from "@/lib/db";
"use client";

import { useState } from "react";
import styles from "./Topics.module.css";
import { firestoreAPI, useFirestoreQuery, useFirestoreDoc } from "@/lib/firestore";
import { where } from "firebase/firestore";;
import clsx from "clsx";

export default function TopicsPage() {
  const [newTopic, setNewTopic] = useState("");

  const topics = useFirestoreQuery('topics');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim()) return;
    
    await db.topics.add({
      name: newTopic.trim(),
      isActive: true
    });
    setNewTopic("");
  };

  const toggleActive = async (id: number, currentStatus: boolean) => {
    await firestoreAPI.update('topics', id, { isActive: !currentStatus });
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Topic Library</h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: 8 }}>
          Manage the predefined topics available during 1-to-1 meetings.
        </p>
      </header>

      <form className={styles.addForm} onSubmit={handleAdd}>
        <input 
          type="text"
          className={styles.input}
          placeholder="New Topic Name..."
          value={newTopic}
          onChange={(e) => setNewTopic(e.target.value)}
        />
        <button type="submit" className={styles.btnAdd}>Add Topic</button>
      </form>

      <div className={styles.list}>
        {topics === undefined ? (
          <p>Loading...</p>
        ) : (
          topics.map(topic => (
            <div key={topic.id} className={styles.topicCard}>
              <span className={clsx(styles.topicName, !topic.isActive && styles.inactive)}>
                {topic.name}
              </span>
              <button 
                className={styles.toggleBtn}
                onClick={() => toggleActive(topic.id as number, topic.isActive)}
              >
                {topic.isActive ? "Deactivate" : "Activate"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
