"use client";

import { useState } from "react";
import Link from "next/link";
import { Phone, CheckCircle, Calendar, Star, Clock, Zap, Flame, Snowflake, UserCheck } from "lucide-react";
import styles from "./Dashboard.module.css";
import { firestoreAPI, useFirestoreQuery, useFirestoreDoc } from "@/lib/firestore";
import { where } from "firebase/firestore";
import { Person, Task, Interaction } from "@/lib/db";;
import { differenceInDays, isPast, startOfDay, endOfDay, isToday } from "date-fns";
import { LogInteractionModal } from "@/components/dashboard/LogInteractionModal";
import { useAuth } from "@/contexts/AuthContext";

type ActionItem = {
  person: Person;
  reason: string;
  isOverdue: boolean;
  type: 'CALL' | 'MEETING';
  task?: Task;
  isDone?: boolean;
  outcome?: string;
};

export default function DashboardPage() {
  const [activeCallPerson, setActiveCallPerson] = useState<Person | null>(null);
  const [activeCallType, setActiveCallType] = useState<'CALL' | 'MEETING' | null>(null);

  const { currentUser } = useAuth();

  const allPeople = useLiveQuery(async () => {
    if (!currentUser?.id) return [];
    return await db.people.where('ownerId').equals(currentUser.id).toArray();
  }, [currentUser?.id]);
  
  const allTasks = useLiveQuery(async () => {
    if (!currentUser?.id) return [];
    const tasks = await db.tasks.where('status').equals('PENDING').toArray();
    // Filter tasks whose person belongs to the current user
    const userPersonIds = new Set((await db.people.where('ownerId').equals(currentUser.id).toArray()).map(p => p.id));
    return tasks.filter(t => userPersonIds.has(t.personId));
  }, [currentUser?.id]);
  
  const todayInteractions = useLiveQuery(async () => {
    if (!currentUser?.id) return [];
    const start = startOfDay(new Date());
    const interactions = await db.interactions.filter(i => new Date(i.date) >= start).toArray();
    const userPersonIds = new Set((await db.people.where('ownerId').equals(currentUser.id).toArray()).map(p => p.id));
    return interactions.filter(i => userPersonIds.has(i.personId));
  }, [currentUser?.id]);

  const now = new Date();
  const startOfToday = startOfDay(now);
  
  let actionPlanMeetings: ActionItem[] = [];
  let actionPlanCalls: ActionItem[] = [];
  
  const hotContacts: Person[] = [];
  const activeContacts: Person[] = []; // Warm
  const coldContacts: Person[] = [];
  const dormantContacts: Person[] = [];

  const inActionPlan = new Set<number>(); // To prevent duplicates
  
  // Mapping of personId to their interaction logged today
  const doneToday = new Map<number, Interaction>();

  if (allPeople && allTasks && todayInteractions) {
    // Populate doneToday map
    for (const interaction of todayInteractions) {
      if (interaction.type === 'CALL' || interaction.type === 'MEETING') {
        doneToday.set(interaction.personId, interaction);
      }
    }

    const sortedPeople = [...allPeople].sort((a, b) => b.priorityScore - a.priorityScore);
    const highPriorityPeople = sortedPeople.filter(p => p.priorityScore >= 20);
    const regularPeople = sortedPeople.filter(p => p.priorityScore < 20);

    const sortedTasks = [...allTasks].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    
    // We only count UNDONE items towards the limits (30 calls, 4 meetings)
    let undoneCallCount = 0;
    let undoneMeetingCount = 0;

    const addToActionPlan = (person: Person, reason: string, isOverdue: boolean, type: 'CALL' | 'MEETING', task?: Task) => {
      if (inActionPlan.has(person.id!)) return;

      const interaction = doneToday.get(person.id!);
      const isDone = !!interaction;
      const outcome = interaction?.outcome;

      const item: ActionItem = { person, reason, isOverdue, type, task, isDone, outcome };

      if (type === 'MEETING') {
        if (!isDone) {
          if (undoneMeetingCount >= 4) return;
          undoneMeetingCount++;
        }
        actionPlanMeetings.push(item);
        inActionPlan.add(person.id!);
      } else {
        if (!isDone) {
          if (undoneCallCount >= 30) return;
          undoneCallCount++;
        }
        actionPlanCalls.push(item);
        inActionPlan.add(person.id!);
      }
    };

    // First: Populate calls with High Priority contacts
    for (const person of highPriorityPeople) {
      addToActionPlan(person, "High Priority Person", false, 'CALL');
    }

    // Second: Populate Action Plan with Tasks (Overdue & Today)
    for (const task of sortedTasks) {
      const person = allPeople.find(p => p.id === task.personId);
      if (!person) continue;

      const dueDate = new Date(task.dueDate);
      const isOverdue = dueDate < startOfToday;
      if (dueDate > endOfDay(now)) continue; // Future tasks not included here

      addToActionPlan(
        person,
        isOverdue ? `Overdue: ${task.title}` : `Today: ${task.title}`,
        isOverdue,
        task.type === 'MEETING' ? 'MEETING' : 'CALL',
        task
      );
    }

    // Third: Fill remaining Meetings (up to 4 undone) with regular contacts
    for (const person of regularPeople) {
      if (undoneMeetingCount >= 4) break;
      addToActionPlan(person, "New / Catch-up", false, 'MEETING');
    }

    // Fourth: Fill remaining Calls (up to 30 undone)
    for (const person of regularPeople) {
      if (undoneCallCount >= 30) break;
      if (inActionPlan.has(person.id!)) continue;

      // Check birthdays
      let isBirthday = false;
      if (person.birthday) {
        const bdayDate = new Date(person.birthday);
        const nextBday = new Date(now.getFullYear(), bdayDate.getMonth(), bdayDate.getDate());
        if (nextBday < now) nextBday.setFullYear(now.getFullYear() + 1); 
        if (differenceInDays(nextBday, now) <= 3) isBirthday = true;
      }

      if (isBirthday) {
        addToActionPlan(person, "Birthday Coming Up!", true, 'CALL');
      } else {
        addToActionPlan(person, "Follow-up Call", false, 'CALL');
      }
    }

    // 5. Put remainder in Pipelines
    for (const person of allPeople) {
      if (!inActionPlan.has(person.id!)) {
        if (person.priorityScore >= 20) {
          hotContacts.push(person);
        } else if (person.priorityScore >= 10) {
          activeContacts.push(person);
        } else if (person.priorityScore > 0) {
          coldContacts.push(person);
        } else {
          dormantContacts.push(person);
        }
      }
    }

    // Sort action plans: undone first, done last
    actionPlanMeetings.sort((a, b) => (a.isDone === b.isDone) ? 0 : a.isDone ? 1 : -1);
    actionPlanCalls.sort((a, b) => (a.isDone === b.isDone) ? 0 : a.isDone ? 1 : -1);
  }

  const handleActionClick = (person: Person, type: 'CALL' | 'MEETING') => {
    setActiveCallPerson(person);
    setActiveCallType(type);
    
    // Automatically trigger tel: link for CALLs
    if (type === 'CALL') {
      window.location.href = `tel:${person.phone}`;
    }
  };

  const renderDoneAvatar = (item: ActionItem, index: number) => {
    const isSuccess = item.outcome?.includes("Success") || item.outcome?.includes("Good Interaction") || item.outcome?.includes("Meeting - Done");
    const firstName = item.person.name.split(' ')[0];
    const initial = firstName.charAt(0).toUpperCase();

    return (
      <Link 
        key={`done-${item.person.id}-${index}`} 
        href={`/people/${item.person.id}?from=/`} 
        className={styles.doneAvatarWrapper}
        title={`${item.person.name} - ${item.outcome}`}
      >
        <div className={`${styles.doneAvatar} ${isSuccess ? styles.doneAvatarSuccess : styles.doneAvatarUnsuccessful}`}>
          {initial}
        </div>
        <div className={styles.doneName}>{firstName}</div>
      </Link>
    );
  };

  const renderActionCard = (item: ActionItem, index: number) => (
    <div key={item.task?.id ? `task-${item.task.id}` : `person-${item.person.id}-${index}`} className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardNameRow}>
          <Link href={`/people/${item.person.id}?from=/`} className={styles.cardName}>
            {item.person.name}
          </Link>
          {item.person.priorityScore > 0 && (
            <span className={styles.priorityBadge}>⭐ {item.person.priorityScore}</span>
          )}
          <span className={`${styles.reasonBadge} ${item.isOverdue ? styles.badgeOverdue : styles.reasonMedium}`} title={item.reason}>
            {item.reason}
          </span>
        </div>
        <div className={styles.cardMeta}>
          {item.person.phone} {item.person.college ? `• ${item.person.college}` : ''}
          <div style={{ marginTop: 4, color: 'var(--color-text-muted)' }}>
            Last Contacted: {
              item.person.lastInteractionDate 
                ? `${differenceInDays(now, new Date(item.person.lastInteractionDate))} days ago` 
                : 'Never'
            }
          </div>
        </div>
      </div>
      <div className={styles.cardActions}>
        {item.type === 'MEETING' && (
          <button 
            className={`${styles.actionBtn} ${styles.btnCall}`} 
            aria-label="Call"
            onClick={() => handleActionClick(item.person, 'CALL')}
          >
            <Phone size={18} />
          </button>
        )}
        <button 
          className={`${styles.actionBtn} ${item.type === 'CALL' ? styles.btnCall : styles.btnSecondary}`} 
          aria-label="Action"
          onClick={() => handleActionClick(item.person, item.type)}
        >
          {item.type === 'CALL' ? <Phone size={18} /> : <Calendar size={18} />}
        </button>
      </div>
    </div>
  );

  const renderPipelineCard = (person: Person, icon: React.ReactNode, type: 'HOT' | 'WARM' | 'COLD' | 'DORMANT') => {
    let daysSince = person.lastInteractionDate 
      ? differenceInDays(now, new Date(person.lastInteractionDate))
      : differenceInDays(now, new Date(person.firstContactDate));
      
    return (
      <div key={person.id} className={`${styles.card} ${styles.pipelineCard}`}>
        <div className={styles.cardHeader} style={{ width: '100%', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Link href={`/people/${person.id}?from=/`} className={styles.cardName} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {person.name}
              {person.priorityScore > 0 && (
                <span className={styles.priorityBadge}>⭐ {person.priorityScore}</span>
              )}
            </Link>
            <span style={{ color: type === 'HOT' ? 'var(--color-danger)' : type === 'WARM' ? 'var(--color-warning)' : type === 'COLD' ? 'var(--color-text-muted)' : 'var(--color-text-muted)' }}>
              {icon}
            </span>
          </div>
          
          <div className={styles.cardMeta} style={{ marginTop: 4 }}>{person.phone}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
            Last Contacted: {daysSince} days ago
          </div>
          
          <div style={{ display: 'flex', gap: 8, marginTop: 12, width: '100%' }}>
            <button 
              onClick={() => handleActionClick(person, 'CALL')}
              className={`${styles.actionBtn} ${styles.btnCall}`} 
              style={{ flex: 1, justifyContent: 'center' }} 
              aria-label="Call"
            >
              <Phone size={14} /> Call
            </button>
            <Link href={`/people/${person.id}?from=/`} className={`${styles.actionBtn} ${styles.btnSecondary}`} style={{ flex: 1, justifyContent: 'center' }} aria-label="View Profile">
              <UserCheck size={14} /> View
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.greeting}>Daily Action Plan</h1>
        <p className={styles.subtitle}>Strictly prioritized. Continously refills. Uncompleted items stay at the top.</p>
      </header>

      {/* MEETINGS PLAN */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle} style={{ color: 'var(--color-primary)' }}>
          <Calendar size={24} /> 
          Top Meetings Today ({actionPlanMeetings.filter(m => m.isDone).length} / {actionPlanMeetings.length} completed)
        </h2>
        <div className={styles.priorityList}>
          {actionPlanMeetings.filter(m => !m.isDone).length === 0 ? (
            <div className={styles.emptyState}>No meetings left to do today.</div>
          ) : (
            actionPlanMeetings.filter(m => !m.isDone).map(renderActionCard)
          )}
        </div>
        {actionPlanMeetings.filter(m => m.isDone).length > 0 && (
          <div className={styles.doneScrollArea}>
            {actionPlanMeetings.filter(m => m.isDone).map(renderDoneAvatar)}
          </div>
        )}
      </section>

      {/* CALLS PLAN */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle} style={{ color: 'var(--color-primary)' }}>
          <Phone size={24} /> 
          Top Calls Today ({actionPlanCalls.filter(c => c.isDone).length} / {actionPlanCalls.length} completed)
        </h2>
        <div className={styles.priorityList}>
          {actionPlanCalls.filter(c => !c.isDone).length === 0 ? (
            <div className={styles.emptyState}>No calls left to do today.</div>
          ) : (
            actionPlanCalls.filter(c => !c.isDone).map(renderActionCard)
          )}
        </div>
        {actionPlanCalls.filter(c => c.isDone).length > 0 && (
          <div className={styles.doneScrollArea}>
            {actionPlanCalls.filter(c => c.isDone).map(renderDoneAvatar)}
          </div>
        )}
      </section>

      {/* RELATIONSHIP PIPELINES */}
      <div style={{ marginTop: 48, marginBottom: 24 }}>
        <h1 className={styles.greeting}>Relationship Pipelines</h1>
        <p className={styles.subtitle}>All other contacts strictly categorized.</p>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Flame size={20} color="var(--color-danger)" /> Very Good (Hot)
        </h2>
        <div className={styles.pipelineScroll}>
          {hotContacts.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>No hot contacts not already in Action Plan.</p>
          ) : (
            hotContacts.map(p => renderPipelineCard(p, <Flame size={20} />, 'HOT'))
          )}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <UserCheck size={20} color="var(--color-warning)" /> Warm
        </h2>
        <div className={styles.pipelineScroll}>
          {activeContacts.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>No warm contacts not already in Action Plan.</p>
          ) : (
            activeContacts.map(p => renderPipelineCard(p, <UserCheck size={20} />, 'WARM'))
          )}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Snowflake size={20} color="var(--color-text-muted)" /> Cold (Interested)
        </h2>
        <div className={styles.pipelineScroll}>
          {coldContacts.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>No cold contacts.</p>
          ) : (
            coldContacts.map(p => renderPipelineCard(p, <Snowflake size={20} />, 'COLD'))
          )}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Clock size={20} color="var(--color-text-muted)" /> Dormant
        </h2>
        <div className={styles.pipelineScroll}>
          {dormantContacts.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>No dormant contacts. Great job!</p>
          ) : (
            dormantContacts.map(p => renderPipelineCard(p, <Clock size={20} />, 'DORMANT'))
          )}
        </div>
      </section>

      {/* Modal */}
      {activeCallPerson && activeCallType && (
        <LogInteractionModal 
          person={activeCallPerson}
          type={activeCallType}
          onClose={() => {
            setActiveCallPerson(null);
            setActiveCallType(null);
          }}
          onSuccess={(outcome) => {
            // Close modal, re-render is automatic due to useLiveQuery
            setActiveCallPerson(null);
            setActiveCallType(null);
          }}
        />
      )}
    </div>
  );
}
