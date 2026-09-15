// @ts-nocheck
import { useLiveQuery } from "@/lib/firestore";
import { db } from "@/lib/db";
"use client";

import styles from "./Analytics.module.css";
import { firestoreAPI, useFirestoreQuery, useFirestoreDoc } from "@/lib/firestore";
import { where } from "firebase/firestore";;

export default function AnalyticsPage() {
  const analyticsData = useLiveQuery(async () => {
    const people = await db.people.toArray();
    const interactions = await db.interactions.toArray();
    const sessions = await db.sessions.toArray();
    const tasks = await db.tasks.toArray();

    return {
      totalPeople: people.length,
      highPriorityPeople: people.filter(p => p.priorityScore > 10).length,
      totalInteractions: interactions.length,
      meetingsCompleted: interactions.filter(i => i.type === 'MEETING').length,
      booksDistributed: interactions.filter(i => i.type === 'BOOK').length,
      prasadamGiven: interactions.filter(i => i.type === 'PRASADAM').length,
      sessionsConducted: sessions.length,
      tasksCompleted: tasks.filter(t => t.status === 'COMPLETED').length,
      pendingTasks: tasks.filter(t => t.status === 'PENDING').length,
    };
  });

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Analytics & Reports</h1>
      </header>

      {analyticsData ? (
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Total Contacts</span>
            <span className={styles.metricValue}>{analyticsData.totalPeople}</span>
          </div>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>High Priority</span>
            <span className={styles.metricValue}>{analyticsData.highPriorityPeople}</span>
          </div>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Total Interactions</span>
            <span className={styles.metricValue}>{analyticsData.totalInteractions}</span>
          </div>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>1-to-1s Completed</span>
            <span className={styles.metricValue}>{analyticsData.meetingsCompleted}</span>
          </div>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Books Distributed</span>
            <span className={styles.metricValue}>{analyticsData.booksDistributed}</span>
          </div>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Prasadam Given</span>
            <span className={styles.metricValue}>{analyticsData.prasadamGiven}</span>
          </div>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Tasks Completed</span>
            <span className={styles.metricValue}>{analyticsData.tasksCompleted}</span>
          </div>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Pending Follow-ups</span>
            <span className={styles.metricValue}>{analyticsData.pendingTasks}</span>
          </div>
        </div>
      ) : (
        <p>Loading analytics...</p>
      )}
    </div>
  );
}
