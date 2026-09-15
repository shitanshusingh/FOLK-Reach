"use client";

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

export default function TasksPage() {
  const [filter, setFilter] = useState<'PENDING' | 'OVERDUE' | 'COMPLETED'>('PENDING');
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const { currentUser } = useAuth();

  const tasksWithPeople = useLiveQuery(async () => {
    if (!currentUser?.id) return [];
    const allTasks = await db.tasks.toArray();
    
    // Join with people
    const joined = await Promise.all(allTasks.map(async task => {
      const person = await db.people.get(task.personId);
      return { 
        ...task, 
        personOwnerId: person?.ownerId,
        personName: person?.name || 'Unknown',
        personPhone: person?.phone || '',
        personPriority: person?.priorityScore || 0,
        personLastContacted: person?.lastInteractionDate 
          ? differenceInDays(new Date(), new Date(person.lastInteractionDate))
          : (person?.firstContactDate ? differenceInDays(new Date(), new Date(person.firstContactDate)) : null)
      };
    }));

    const now = startOfDay(new Date());

    return joined.filter(task => {
      if (task.personOwnerId !== currentUser.id) return false;
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
                      {task.title}
                    </div>
                    <div className={styles.taskMeta}>
                      <div className={styles.taskMetaRow}>
                        <span>For: <Link href={`/people/${task.personId}?from=/tasks`} className={styles.personLink}>{task.personName}</Link></span>
                        {task.personPriority > 0 && (
                          <span className={styles.priorityBadge}>⭐ {task.personPriority}</span>
                        )}
                        {task.personLastContacted !== null && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: 8 }}>
                            Last contact: {task.personLastContacted}d ago
                          </span>
                        )}
                      </div>
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
                    <a href={`tel:${task.personPhone}`} className={styles.callBtn} aria-label={`Call ${task.personName}`}>
                      <Phone size={18} />
                    </a>
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
    </div>
  );
}
