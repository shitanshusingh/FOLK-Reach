// @ts-nocheck
import { useLiveQuery } from "@/lib/firestore";
import { db } from "@/lib/db";
"use client";

import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import styles from "./NotificationsTray.module.css";
import { firestoreAPI, useFirestoreQuery, useFirestoreDoc } from "@/lib/firestore";
import { where } from "firebase/firestore";;
import { formatDistanceToNow } from "date-fns";
import clsx from "clsx";

export function NotificationsTray() {
  const [isOpen, setIsOpen] = useState(false);
  const trayRef = useRef<HTMLDivElement>(null);

  // In a real app we'd filter by the logged-in user's ID
  const notifications = useLiveQuery(() => 
    db.notifications.reverse().sortBy('createdAt')
  );

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (trayRef.current && !trayRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    if (!notifications) return;
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id as number);
    await Promise.all(unreadIds.map(id => firestoreAPI.update('notifications', id, { isRead: true })));
  };

  const handleNotificationClick = async (id: number) => {
    await firestoreAPI.update('notifications', id, { isRead: true });
    setIsOpen(false);
  };

  return (
    <div className={styles.trayContainer} ref={trayRef}>
      <button 
        className={styles.iconBtn} 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <span className={styles.title}>Notifications</span>
            {unreadCount > 0 && (
              <button className={styles.markAll} onClick={handleMarkAllRead}>
                Mark all as read
              </button>
            )}
          </div>
          
          <div className={styles.list}>
            {notifications === undefined ? (
              <div className={styles.emptyState}>Loading...</div>
            ) : notifications.length === 0 ? (
              <div className={styles.emptyState}>No notifications yet.</div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification.id} 
                  className={clsx(styles.notificationItem, !notification.isRead && styles.unread)}
                  onClick={() => handleNotificationClick(notification.id as number)}
                >
                  <div className={styles.message}>{notification.message}</div>
                  <div className={styles.time}>
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
