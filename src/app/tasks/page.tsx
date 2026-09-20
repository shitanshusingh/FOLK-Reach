"use client";
// @ts-nocheck
import { useLiveQuery } from "@/lib/firestore";
import { db } from "@/lib/db";

import { useState } from "react";
import Link from "next/link";
import { Check, Clock, Calendar as CalendarIcon, AlertCircle, Phone, Plus } from "lucide-react";
import styles from "./Tasks.module.css";
import { QuickAddTask } from "@/components/tasks/QuickAddTask";
import { firestoreAPI, useFirestoreQuery, useFirestoreDoc } from "@/lib/firestore";
import { where } from "firebase/firestore";;
import { format, isPast, isToday, isTomorrow, startOfDay, differenceInDays } from "date-fns";
import clsx from "clsx";
import { useAuth } from "@/contexts/AuthContext";

import { LogInteractionModal } from "@/components/dashboard/LogInteractionModal";

export default function TasksPage() {
  const [filter, setFilter] = useState<'PENDING' | 'OVERDUE' | 'COMPLETED'>('PENDING');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [activeCallPerson, setActiveCallPerson] = useState<any>(null);

  const { currentUser } = useAuth();

  const pendingTransfers = useLiveQuery(async () => {
    if (!currentUser?.id) return [];
    const allTransfers = await db.contactTransfers.where('fromUserId').equals(String(currentUser.id)).toArray();
    const pending = allTransfers.filter(t => t.status === 'PENDING');
    
    const joined = await Promise.all(pending.map(async (t: any) => {
      const person = await db.people.get(t.personId);
      const toUser = await db.users.get(t.toUserId);
      return { ...t, person, toUser };
    }));
    return joined;
  }, [currentUser?.id]);

  const handleAcceptTransfer = async (transfer: any) => {
    await firestoreAPI.update('contactTransfers', transfer.id, { status: 'ACCEPTED' });
    await firestoreAPI.update('people', transfer.personId, { 
      ownerId: String(transfer.toUserId),
      assignedUserId: String(transfer.toUserId)
    });
  };

  const handleDenyTransfer = async (transfer: any) => {
    await firestoreAPI.update('contactTransfers', transfer.id, { status: 'DENIED' });
  };

  const tasksWithPeople = useLiveQuery(async () => {
    if (!currentUser?.id) return [];
    const allTasks = await db.tasks.toArray();
    
    // Join with people
    const joined = await Promise.all(allTasks.map(async task => {
      const person = await db.people.get(task.personId);
      let referrerName = null;
      if (task.referredByUserId) {
         const refUser = await db.users.get(task.referredByUserId);
         referrerName = refUser?.name;
      }
      return { 
        ...task, 
        personOwnerId: person?.ownerId,
        personName: person?.name || 'Unknown',
        personPhone: person?.phone || '',
        personPriority: person?.priorityScore || 0,
        person: person, // Pass full person object for modal
        referrerName: referrerName,
        personLastContacted: person?.lastInteractionDate 
          ? differenceInDays(new Date(), new Date(person.lastInteractionDate))
          : (person?.firstContactDate ? differenceInDays(new Date(), new Date(person.firstContactDate)) : null),
        personLastInteractionType: person?.lastInteractionType || 'Added',
        personLastInteractionDateRaw: person?.lastInteractionDate || person?.firstContactDate || null
      };
    }));

    const now = startOfDay(new Date());

    return joined.filter(task => {
      const isOwner = String(task.personOwnerId) === String(currentUser.id);
      const isAssigned = String(task.assignedToUserId) === String(currentUser.id);
      if (!isOwner && !isAssigned) return false;
      
      const taskDate = startOfDay(new Date(task.dueDate));
      
      if (filter === 'COMPLETED') return task.status === 'COMPLETED';
      if (filter === 'OVERDUE') return task.status === 'PENDING' && taskDate < now;
      if (filter === 'PENDING') return task.status === 'PENDING' && taskDate >= now;
      return true;
    }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [filter, currentUser?.id]);

  const toggleTaskStatus = async (taskId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'PENDING' ? 'COMPLETED' : 'PENDING';
    await firestoreAPI.update('tasks', taskId, { status: newStatus });
  };

  const handleCallClick = (task: any) => {
    setActiveCallPerson(task.person);
    window.location.href = `tel:${task.personPhone}`;
  };

  const getDueDateLabel = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "MMM d, yyyy");
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Follow-ups & Tasks</h1>
      </header>

      {pendingTransfers === undefined ? (
         <div style={{ marginBottom: 24, padding: 16, background: 'var(--glass-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
           <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
             Loading transfer requests...
           </div>
         </div>
      ) : pendingTransfers && (
        <div style={{ marginBottom: 24, padding: 16, background: 'var(--glass-bg)', border: pendingTransfers.length > 0 ? '1px solid var(--color-warning)' : '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontSize: '1.1rem', color: pendingTransfers.length > 0 ? 'var(--color-warning)' : 'var(--color-text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={18} /> Transfer Requests ({pendingTransfers.length})
          </h2>
          {pendingTransfers.length === 0 ? (
            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              You have no pending transfer requests.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pendingTransfers.map((t: any) => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', color: 'white' }}>{t.person?.name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      Requested by <span style={{ color: 'var(--color-primary-light)' }}>{t.toUser?.name}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button 
                      onClick={() => handleAcceptTransfer(t)}
                      style={{ background: 'var(--color-success)', color: 'white', padding: '6px 12px', borderRadius: '4px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      Accept
                    </button>
                    <button 
                      onClick={() => handleDenyTransfer(t)}
                      style={{ background: 'var(--color-danger)', color: 'white', padding: '6px 12px', borderRadius: '4px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      Deny
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className={styles.filters}>
        <button 
          className={clsx(styles.filterBtn, filter === 'PENDING' && styles.filterBtnActive)}
          onClick={() => setFilter('PENDING')}
        >
          Upcoming
        </button>
        <button 
          className={clsx(styles.filterBtn, filter === 'OVERDUE' && styles.filterBtnActive)}
          onClick={() => setFilter('OVERDUE')}
        >
          Overdue
        </button>
        <button 
          className={clsx(styles.filterBtn, filter === 'COMPLETED' && styles.filterBtnActive)}
          onClick={() => setFilter('COMPLETED')}
        >
          Completed
        </button>
      </div>

      <div className={styles.list}>
        {tasksWithPeople === undefined ? (
          <p>Loading...</p>
        ) : tasksWithPeople.length === 0 ? (
          <div className={styles.emptyState}>
            No tasks found in this category.
          </div>
        ) : (
          tasksWithPeople.map(task => {
            const isTaskOverdue = isPast(startOfDay(new Date(task.dueDate))) && !isToday(new Date(task.dueDate));
            
            return (
              <div 
                key={task.id} 
                className={clsx(styles.taskCard, task.status === 'COMPLETED' && styles.taskCardCompleted)}
              >
                <div className={styles.taskInfo}>
                  <div 
                    className={clsx(styles.checkbox, task.status === 'COMPLETED' && styles.checkboxChecked)}
                    onClick={() => toggleTaskStatus(task.id as number, task.status)}
                  >
                    <Check size={16} />
                  </div>
                  <div className={styles.taskDetails}>
                    <div className={styles.taskTitle}>
                      <Link href={`/people/${task.personId}?from=/tasks`} style={{ color: 'inherit', textDecoration: 'none' }}>{task.personName}</Link>
                      {task.referrerName && (
                        <span style={{ marginLeft: 8, fontSize: '0.75rem', background: 'var(--color-primary-light)', color: 'var(--color-bg)', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                          Referred by {task.referrerName}
                        </span>
                      )}
                    </div>
                    <div className={styles.taskMeta}>
                      <div className={styles.taskMetaRow}>
                        <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{task.title}</span>
                        {task.personPriority > 0 && (
                          <span className={styles.priorityBadge}>⭐ {task.personPriority}</span>
                        )}
                        {task.personLastInteractionDateRaw && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: 8 }}>
                            {task.personLastInteractionType} • {format(new Date(task.personLastInteractionDateRaw), "MMM d, h:mm a")} ({task.personLastContacted}d ago)
                          </span>
                        )}
                      </div>
                      {task.notes && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: 4, marginBottom: 4, fontStyle: 'italic' }}>
                          "{task.notes}"
                        </div>
                      )}
                      <div className={styles.taskMetaRow}>
                        <span className={clsx(styles.badge, 
                          task.status === 'COMPLETED' ? styles.badgeCompleted :
                          isTaskOverdue ? styles.badgeOverdue : styles.badgeUpcoming
                        )}>
                          {isTaskOverdue && task.status === 'PENDING' && <AlertCircle size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }} />}
                          {getDueDateLabel(new Date(task.dueDate))}
                        </span>
                        <span className={styles.typeBadge}>{task.type}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className={styles.cardActions}>
                  {task.personPhone && (
                    <button 
                      onClick={() => handleCallClick(task)} 
                      className={styles.callBtn} 
                      aria-label={`Call ${task.personName}`}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 12 }}
                    >
                      <Phone size={18} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <button 
        className={styles.globalFab}
        onClick={() => setShowQuickAdd(true)}
        aria-label="Add Follow-up"
      >
        <Plus size={28} />
      </button>

      {showQuickAdd && (
        <QuickAddTask onClose={() => setShowQuickAdd(false)} defaultType="CALL" />
      )}

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
