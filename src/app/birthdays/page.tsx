"use client";
// @ts-nocheck

import { firestoreAPI, useFirestoreQuery, useFirestoreDoc } from "@/lib/firestore";
import { where } from "firebase/firestore";
import { Person } from "@/lib/db";;
import { useAuth } from "@/contexts/AuthContext";
import styles from "./Birthdays.module.css";
import { Gift, Phone, MessageCircle, Calendar } from "lucide-react";
import clsx from "clsx";

export default function BirthdaysPage() {
  const { currentUser } = useAuth();

  const allPeople = useFirestoreQuery('people', [where('ownerId', '==', currentUser?.id || -1)], [currentUser?.id]);

  if (!allPeople) {
    return <div className={styles.container}>Loading birthdays...</div>;
  }

  const peopleWithBirthdays = allPeople.filter(p => p.birthday != null);

  // Get current date stripped of time
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayMonth = today.getMonth();
  const todayDate = today.getDate();

  // Categorize
  const birthdaysToday: Person[] = [];
  const upcomingBirthdays: (Person & { daysUntil: number })[] = [];
  const pastBirthdays: (Person & { daysSince: number })[] = [];

  peopleWithBirthdays.forEach(person => {
    const bday = new Date(person.birthday!);
    const bMonth = bday.getMonth();
    const bDate = bday.getDate();

    if (bMonth === todayMonth && bDate === todayDate) {
      birthdaysToday.push(person);
      return;
    }

    // Create a Date object for this year's birthday
    const thisYearBday = new Date(today.getFullYear(), bMonth, bDate);
    
    // Calculate difference in days
    const diffTime = thisYearBday.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0 && diffDays <= 30) {
      // Upcoming in next 30 days
      upcomingBirthdays.push({ ...person, daysUntil: diffDays });
    } else if (diffDays < 0 && diffDays >= -30) {
      // Past in last 30 days
      pastBirthdays.push({ ...person, daysSince: Math.abs(diffDays) });
    } else if (diffDays < 0 && (diffDays + 365) <= 30) {
       // Handle edge case: birthday is next year but within 30 days (e.g. late Dec -> early Jan)
       upcomingBirthdays.push({ ...person, daysUntil: diffDays + 365 });
    }
  });

  // Sort
  upcomingBirthdays.sort((a, b) => a.daysUntil - b.daysUntil);
  pastBirthdays.sort((a, b) => a.daysSince - b.daysSince);

  const renderPersonCard = (person: Person, extraLabel?: string, isToday: boolean = false) => {
    const bdayStr = person.birthday ? new Date(person.birthday).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
    
    return (
      <div key={person.id} className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.personInfo}>
            <a href={`/people/${person.id}`} className={styles.name}>{person.name}</a>
            <span className={styles.phone}>{person.phone}</span>
          </div>
          <div className={clsx(styles.dateBadge, { [styles.todayBadge]: isToday })}>
            {isToday ? 'Today! 🎉' : bdayStr}
          </div>
        </div>
        
        {extraLabel && (
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 16 }}>
            {extraLabel}
          </div>
        )}

        <div className={styles.actions}>
          <a href={`tel:${person.phone}`} className={clsx(styles.actionBtn, styles.callBtn)}>
            <Phone size={16} /> Call
          </a>
          <a href={`https://wa.me/${person.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className={clsx(styles.actionBtn, styles.msgBtn)}>
            <MessageCircle size={16} /> Msg
          </a>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Birthdays</h1>
        <p className={styles.subtitle}>Track upcoming and past birthdays of your contacts</p>
      </header>

      {/* TODAY */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle} style={{ color: 'var(--color-primary)' }}>
          <Gift size={24} /> Today's Birthdays
        </h2>
        {birthdaysToday.length > 0 ? (
          <div className={styles.grid}>
            {birthdaysToday.map(p => renderPersonCard(p, undefined, true))}
          </div>
        ) : (
          <div className={styles.emptyState}>No birthdays today.</div>
        )}
      </section>

      {/* UPCOMING */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Calendar size={22} /> Upcoming (Next 30 Days)
        </h2>
        {upcomingBirthdays.length > 0 ? (
          <div className={styles.grid}>
            {upcomingBirthdays.map(p => 
              renderPersonCard(p, `In ${p.daysUntil} day${p.daysUntil > 1 ? 's' : ''}`)
            )}
          </div>
        ) : (
          <div className={styles.emptyState}>No upcoming birthdays in the next 30 days.</div>
        )}
      </section>

      {/* PAST */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Calendar size={22} style={{ opacity: 0.6 }} /> Past (Last 30 Days)
        </h2>
        {pastBirthdays.length > 0 ? (
          <div className={styles.grid}>
            {pastBirthdays.map(p => 
              renderPersonCard(p, `${p.daysSince} day${p.daysSince > 1 ? 's' : ''} ago`)
            )}
          </div>
        ) : (
          <div className={styles.emptyState}>No recent past birthdays.</div>
        )}
      </section>
    </div>
  );
}
