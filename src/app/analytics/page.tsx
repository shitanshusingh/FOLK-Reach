"use client";
// @ts-nocheck
import { useLiveQuery } from "@/lib/firestore";
import { db } from "@/lib/db";

import styles from "./Analytics.module.css";
import { firestoreAPI, useFirestoreQuery, useFirestoreDoc } from "@/lib/firestore";
import { where } from "firebase/firestore";
import { startOfWeek, endOfWeek } from "date-fns";

export default function AnalyticsPage() {
  const analyticsData = useLiveQuery(async () => {
    const people = await db.people.toArray();
    const interactions = await db.interactions.toArray();
    const sessions = await db.sessions.toArray();
    const tasks = await db.tasks.toArray();

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const weeklyCalls = interactions.filter(i => {
      const d = i.date instanceof Date ? i.date : (typeof i.date === 'string' ? new Date(i.date) : i.date?.toDate?.());
      return i.type === 'CALL' && d >= weekStart && d <= weekEnd;
    });

    const weeklyCallDuration = weeklyCalls.reduce((total, call) => total + (call.durationMinutes || 0), 0);

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
      weeklyCallsCount: weeklyCalls.length,
      weeklyCallDuration
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

      {analyticsData && (
        <section className={styles.section} style={{ marginTop: '48px' }}>
          <h2 className={styles.sectionTitle}>This Week's Performance</h2>
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard} style={{ background: 'var(--color-primary-light)', borderColor: 'var(--color-primary)' }}>
              <span className={styles.metricLabel} style={{ color: 'var(--color-primary)' }}>Calls Made This Week</span>
              <span className={styles.metricValue} style={{ color: 'var(--color-primary)' }}>{analyticsData.weeklyCallsCount}</span>
            </div>
            <div className={styles.metricCard} style={{ background: 'var(--color-primary-light)', borderColor: 'var(--color-primary)' }}>
              <span className={styles.metricLabel} style={{ color: 'var(--color-primary)' }}>Total Call Duration</span>
              <span className={styles.metricValue} style={{ color: 'var(--color-primary)' }}>{analyticsData.weeklyCallDuration} mins</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
