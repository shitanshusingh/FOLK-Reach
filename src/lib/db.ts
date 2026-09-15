// @ts-nocheck
import { db } from "@/lib/db";
// In our massive migration to Firebase, we've replaced Dexie with Firestore!
// This file used to be the Dexie configuration. Now, it just exports our TypeScript interfaces
// and re-exports our Firestore API to keep the rest of the application imports working smoothly!

import { firestoreAPI } from './firestore';

// --- INTERFACES --- //

export interface User {
  id?: string | number;
  name: string;
  email: string;
  password?: string;
  role: 'ADMIN' | 'LEADER' | 'MEMBER';
  teamId?: string | number;
}

export interface Team {
  id?: string | number;
  name: string;
  inviteCode?: string;
  leaderId?: string | number;
}

export interface Person {
  id?: string | number;
  name: string;
  phone: string;
  alternatePhone?: string;
  whatsapp?: string;
  email?: string;
  
  gender?: string;
  birthday?: Date | string; // Firebase sometimes sends string dates
  nativePlace?: string;
  currentCity?: string;
  address?: string;
  
  college?: string;
  university?: string;
  branch?: string;
  year?: string;
  
  company?: string;
  jobRole?: string;
  profession?: string;
  
  introducedBy?: string;
  notes?: string;
  tags: string[];
  
  priorityScore: number;
  lastInteractionDate?: Date | string;
  
  assignedUserId?: string | number; 
  ownerId?: string | number; 
}

export interface Interaction {
  id?: string | number;
  personId: string | number;
  type: 'CALL' | 'MEETING' | 'MESSAGE' | 'SESSION' | 'OTHER';
  date: Date | string;
  notes: string;
  duration?: number; 
}

export interface Session {
  id?: string | number;
  title: string;
  date: Date | string;
  topic?: string;
  speaker?: string;
  location?: string;
  notes?: string;
}

export interface SessionAttendance {
  id?: string | number;
  sessionId: string | number;
  personId: string | number;
  status: 'ATTENDED' | 'ABSENT' | 'EXCUSED';
  assignedUserId?: string | number; 
}

export interface Topic {
  id?: string | number;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface PersonTopic {
  id?: string | number;
  personId: string | number;
  topicId: string | number;
  status?: 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED';
  completionDate?: Date | string;
}

export interface Task {
  id?: string | number;
  title: string;
  description?: string;
  personId?: string | number;
  assignedToUserId: string | number;
  dueDate: Date | string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  type: 'CALL' | 'MEETING' | 'FOLLOW_UP' | 'OTHER';
}

export interface Notification {
  id?: string | number;
  userId: string | number;
  message: string;
  isRead: boolean;
  createdAt: Date | string;
}

export interface CustomField {
  id?: string | number;
  name: string;
  type: 'text' | 'date' | 'select' | 'boolean';
  options?: string[]; // for select
  required?: boolean;
}

export interface CustomGroup {
  id?: string | number;
  name: string;
  ownerId: string | number; 
  description?: string;
}

// --- FIREBASE MOCK --- //
// This allows legacy code doing `db.people.add()` to route to `firestoreAPI.add('people')`

function createCollectionProxy(collectionName: string) {
  return {
    add: (data: any) => firestoreAPI.add(collectionName, data),
    update: (id: string | number, data: any) => firestoreAPI.update(collectionName, id, data),
    delete: (id: string | number) => firestoreAPI.delete(collectionName, id),
    get: (id: string | number) => firestoreAPI.get(collectionName, id),
    // For manual queries that survived the regex:
    where: (field: string) => ({
      equals: (value: any) => ({
        toArray: () => firestoreAPI.query(collectionName, []), // naive fallback
        first: async () => {
          const res = await firestoreAPI.query(collectionName, []); // naive fallback for now
          return res.find((r: any) => r[field] === value);
        }
      })
    }),
    toArray: () => firestoreAPI.query(collectionName, []),
    count: async () => {
        const docs = await firestoreAPI.query(collectionName, []);
        return docs.length;
    }
  }
}

export const db = {
  people: createCollectionProxy('people'),
  interactions: createCollectionProxy('interactions'),
  sessions: createCollectionProxy('sessions'),
  sessionAttendance: createCollectionProxy('sessionAttendance'),
  topics: createCollectionProxy('topics'),
  personTopics: createCollectionProxy('personTopics'),
  tasks: createCollectionProxy('tasks'),
  users: createCollectionProxy('users'),
  teams: createCollectionProxy('teams'),
  notifications: createCollectionProxy('notifications'),
  customFields: createCollectionProxy('customFields'),
  customGroups: createCollectionProxy('customGroups'),
};

// Remove dummy data seeding logic! It's Firebase now.
export const DEFAULT_TOPICS = [];
export async function seedTopicsIfEmpty() {}
export async function seedUsersIfEmpty() {}
