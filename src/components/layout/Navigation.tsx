"use client";
// @ts-nocheck

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Navigation.module.css';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Clock, 
  Settings,
  CheckSquare,
  Coffee,
  BookOpen,
  FolderOpen,
  BarChart,
  Menu,
  Plus,
  Sun,
  Moon,
  LogOut,
  User as UserIcon,
  Gift,
  ShieldCheck,
  Compass
} from 'lucide-react';
import { clsx } from 'clsx';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

import { NotificationsTray } from '../notifications/NotificationsTray';
import { BirthdayChecker } from '../notifications/BirthdayChecker';
import { QuickAddContact } from '../people/QuickAddContact';

const baseNavItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'People', href: '/people', icon: Users },
  { name: 'Sessions', href: '/sessions', icon: Calendar },
  { name: 'Follow-ups', href: '/tasks', icon: CheckSquare },
  { name: '1-to-1s', href: '/meetings', icon: Coffee },
  { name: 'Birthdays', href: '/birthdays', icon: Gift },
  { name: 'Groups', href: '/groups', icon: FolderOpen },
  { name: 'Topics', href: '/topics', icon: BookOpen },
  { name: 'Residence', href: '/team', icon: Users, roles: ['FOLK_LEADER', 'RESIDENT', 'ADMIN', 'LEADER', 'MEMBER'] },
  { name: 'Timeline', href: '/timeline', icon: Clock },
  { name: 'Analytics', href: '/analytics', icon: BarChart },
  { name: 'Super Admin', href: '/admin', icon: ShieldCheck, roles: ['SUPER_ADMIN'] },
  { name: 'Folk Guide', href: '/guide', icon: Compass, roles: ['FOLK_GUIDE'] },
  { name: 'Profile', href: '/profile', icon: UserIcon },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Navigation({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout, currentUser } = useAuth();
  const [showGlobalQuickAdd, setShowGlobalQuickAdd] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Load theme on mount
  useEffect(() => {
    const saved = localStorage.getItem('app-theme') as 'light' | 'dark' | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('app-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Filter nav items based on user role
  const currentUserRole = currentUser?.role || 'RESIDENT';
  const navItems = baseNavItems.filter(item => {
    if (item.roles) {
      return item.roles.includes(currentUserRole);
    }
    return true;
  });

  // Top 4 for mobile
  const mobileNavTop = navItems.slice(0, 4);
  // Remaining for bottom sheet
  const mobileNavMore = navItems.slice(4);

  return (
    <div className={styles.navContainer}>
      {/* Sidebar for Desktop */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span style={{ color: 'var(--color-text)' }}>FOLKReach</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={toggleTheme} className={styles.actionBtn} aria-label="Toggle Theme">
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <NotificationsTray />
          </div>
        </div>
        <nav className={styles.sidebarNav}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(styles.sidebarItem, {
                  [styles.activeSidebarItem]: isActive,
                })}
              >
                <Icon className={styles.icon} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        <div style={{ marginTop: 'auto', padding: '16px 12px' }}>
          <button 
            className={styles.sidebarItem} 
            onClick={logout}
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
          >
            <LogOut className={styles.icon} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        {children}
      </main>

      {/* Bottom Nav for Mobile */}
      <nav className={styles.bottomNav}>
        {mobileNavTop.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(styles.navItem, {
                [styles.activeNavItem]: isActive,
              })}
            >
              <Icon className={styles.icon} />
              <span>{item.name}</span>
            </Link>
          );
        })}
        
        {/* Mobile "More" Menu Trigger */}
        <button 
          className={styles.navItem} 
          onClick={() => setShowMoreMenu(true)}
        >
          <Menu className={styles.icon} />
          <span>More</span>
        </button>
      </nav>

      {/* Mobile "More" Bottom Sheet */}
      {showMoreMenu && (
        <div className={styles.bottomSheetOverlay} onClick={() => setShowMoreMenu(false)}>
          <div className={styles.bottomSheet} onClick={e => e.stopPropagation()}>
            {mobileNavMore.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={styles.sheetItem}
                  onClick={() => setShowMoreMenu(false)}
                >
                  <Icon className={styles.icon} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
            {/* Theme Toggle in Mobile More Menu */}
            <button 
              className={styles.sheetItem}
              onClick={() => {
                toggleTheme();
                setShowMoreMenu(false);
              }}
              style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {theme === 'dark' ? <Sun className={styles.icon} /> : <Moon className={styles.icon} />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
            
            {/* Sign Out in Mobile More Menu */}
            <button 
              className={styles.sheetItem}
              onClick={() => {
                logout();
                setShowMoreMenu(false);
              }}
              style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--color-danger)' }}
            >
              <LogOut className={styles.icon} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Global Floating Action Button for Quick Add (Only on Dashboard & People) */}
      {(pathname === '/' || pathname === '/people') && (
        <button 
          className={styles.globalFab}
          onClick={() => setShowGlobalQuickAdd(true)}
          aria-label="Quick Add Contact"
        >
          <Plus size={28} />
        </button>
      )}

      {showGlobalQuickAdd && (
        <QuickAddContact onClose={() => setShowGlobalQuickAdd(false)} />
      )}
      
      {/* Invisible Background Checkers */}
      <BirthdayChecker />
    </div>
  );
}
