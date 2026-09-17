"use client";
// @ts-nocheck
import { useLiveQuery } from "@/lib/firestore";
import { db } from "@/lib/db";

import styles from "./Team.module.css";
import { firestoreAPI, useFirestoreQuery, useFirestoreDoc } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { where } from "firebase/firestore";

export default function TeamPage() {
  const { currentUser } = useAuth();

  const teamData = useLiveQuery(async () => {
    if (!currentUser?.teamId) return null;

    const allUsers = await db.users.where('teamId').equals(currentUser.teamId).toArray();
    
    // We only want contacts owned by users in this residence
    const userIds = new Set(allUsers.map(u => u.id));
    const allPeople = await db.people.toArray();
    const people = allPeople.filter(p => userIds.has(String(p.ownerId)));
    
    const tasks = await db.tasks.toArray();
    
    const stats = {
      totalPeople: people.length,
      highPriority: people.filter(p => p.priorityScore > 10).length,
      pendingTasks: tasks.filter(t => t.status === 'PENDING' && userIds.has(String(t.assignedToUserId))).length
    };

    const userMetrics = allUsers.map(user => {
      // In the current schema, person.ownerId determines who it belongs to.
      const assignedPeople = people.filter(p => String(p.ownerId) === String(user.id));
      const assignedTasks = tasks.filter(t => String(t.assignedToUserId) === String(user.id) && t.status === 'PENDING');
      
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
        <h1 className={styles.title}>Folk Residence Dashboard</h1>
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
