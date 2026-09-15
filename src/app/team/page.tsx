"use client";
// @ts-nocheck
import { useLiveQuery } from "@/lib/firestore";
import { db } from "@/lib/db";

import styles from "./Team.module.css";
import { firestoreAPI, useFirestoreQuery, useFirestoreDoc } from "@/lib/firestore";
import { where } from "firebase/firestore";;

export default function TeamPage() {
  const teamData = useLiveQuery(async () => {
    const users = await db.users.toArray();
    const people = await db.people.toArray();
    const tasks = await db.tasks.toArray();
    
    const stats = {
      totalPeople: people.length,
      highPriority: people.filter(p => p.priorityScore > 10).length,
      pendingTasks: tasks.filter(t => t.status === 'PENDING').length
    };

    const userMetrics = users.map(user => {
      const assignedPeople = people.filter(p => p.assignedUserId === user.id);
      const assignedTasks = tasks.filter(t => t.assignedToUserId === user.id && t.status === 'PENDING');
      
      return {
        ...user,
        contactsCount: assignedPeople.length,
        tasksCount: assignedTasks.length
      };
    });

    return { stats, userMetrics };
  });

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Team Dashboard</h1>
      </header>

      {teamData ? (
        <>
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Total Contacts</span>
              <span className={styles.metricValue}>{teamData.stats.totalPeople}</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>High Priority</span>
              <span className={styles.metricValue}>{teamData.stats.highPriority}</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Pending Follow-ups</span>
              <span className={styles.metricValue}>{teamData.stats.pendingTasks}</span>
            </div>
          </div>

          <h2 className={styles.sectionTitle}>Member Activity</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Name</th>
                <th className={styles.th}>Role</th>
                <th className={styles.th}>Assigned Contacts</th>
                <th className={styles.th}>Pending Tasks</th>
              </tr>
            </thead>
            <tbody>
              {teamData.userMetrics.map(user => (
                <tr key={user.id} className={styles.tr}>
                  <td className={styles.td}>{user.name}</td>
                  <td className={styles.td}>{user.role}</td>
                  <td className={styles.td}>{user.contactsCount}</td>
                  <td className={styles.td}>{user.tasksCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}
