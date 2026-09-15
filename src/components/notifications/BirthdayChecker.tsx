"use client";

import { useEffect, useRef } from "react";
import { firestoreAPI, useFirestoreQuery, useFirestoreDoc } from "@/lib/firestore";
import { where } from "firebase/firestore";;
import { useAuth } from "@/contexts/AuthContext";

export function BirthdayChecker() {
  const { currentUser } = useAuth();
  const checkedToday = useRef(false);

  useEffect(() => {
    if (!currentUser || checkedToday.current) return;

    const checkBirthdays = async () => {
      checkedToday.current = true;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];
      
      const lastCheck = localStorage.getItem(`bday_check_${currentUser.id}`);
      if (lastCheck === todayStr) {
        // Already checked today
        return;
      }

      // We need to check
      const people = await db.people.where('ownerId').equals(currentUser.id!).toArray();
      const peopleWithBirthdays = people.filter(p => p.birthday != null);

      const todayMonth = today.getMonth();
      const todayDate = today.getDate();

      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const tomorrowMonth = tomorrow.getMonth();
      const tomorrowDate = tomorrow.getDate();

      let notificationsAdded = 0;

      for (const person of peopleWithBirthdays) {
        const bday = new Date(person.birthday!);
        const bMonth = bday.getMonth();
        const bDate = bday.getDate();

        if (bMonth === todayMonth && bDate === todayDate) {
          await db.notifications.add({
            userId: currentUser.id!,
            message: `🎉 Today is ${person.name}'s birthday! Wish them a great day.`,
            isRead: false,
            createdAt: new Date()
          });
          notificationsAdded++;
        } else if (bMonth === tomorrowMonth && bDate === tomorrowDate) {
          await db.notifications.add({
            userId: currentUser.id!,
            message: `📅 Reminder: Tomorrow is ${person.name}'s birthday!`,
            isRead: false,
            createdAt: new Date()
          });
          notificationsAdded++;
        }
      }

      // Mark as checked today
      localStorage.setItem(`bday_check_${currentUser.id}`, todayStr);
    };

    checkBirthdays();
  }, [currentUser]);

  return null; // Invisible component
}
