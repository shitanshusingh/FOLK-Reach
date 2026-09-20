// @ts-nocheck

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
  role: 'SUPER_ADMIN' | 'FOLK_GUIDE' | 'FOLK_LEADER' | 'RESIDENT' | 'ADMIN' | 'LEADER' | 'MEMBER'; // Keeping old roles temporarily for backwards compatibility during migration
  teamId?: string | number; // This acts as Folk Residence ID
  guideId?: string | number; // The Folk Guide this user is under
}

export interface Team {
  id?: string | number;
  name: string;
  inviteCode?: string;
  leaderId?: string | number; // Folk Leader ID
  guideId?: string | number; // Folk Guide ID who created this residency
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
  hostel?: string;
  
  
  company?: string;
  jobRole?: string;
  profession?: string;
  
  introducedBy?: string;
  notes?: string;
  tags: string[];
  
  priorityScore: number;
  lastInteractionDate?: Date | string;
  lastInteractionType?: string;
  
  chantingRounds?: number;
  ashrayaLevel?: 'None' | 'Sevak' | 'Sadhaka' | 'Upasaka' | 'Charan Ashraya';
  
  assignedUserId?: string | number; 
  ownerId?: string | number; 
  customFields?: Record<string, any>;
}

export interface Interaction {
  id?: string | number;
  personId: string | number;
  type: 'CALL' | 'MEETING' | 'MESSAGE' | 'SESSION' | 'OTHER';
  date: Date | string;
  notes: string;
  durationMinutes?: number; 
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
  status: 'PENDING_CALL' | 'INVITED' | 'CONFIRMED' | 'MAYBE' | 'DECLINED' | 'ATTENDED' | 'MISSED' | 'DID_NOT_ANSWER' | 'NOT_COMING' | 'JOINING_NEXT_SESSION';
  assignedUserId?: string | number; 
  checkedInAt?: Date | string;
  callCount?: number;
  callOutcome?: string;
  previousStatus?: string;
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

export interface ContactTransfer {
  id?: string | number;
  personId: string | number;
  fromUserId: string | number;
  toUserId: string | number;
  status: 'PENDING' | 'ACCEPTED' | 'DENIED';
  requestDate: Date;
}

// --- FIREBASE MOCK --- //
// This allows legacy code doing `db.people.add()` to route to `firestoreAPI.add('people')`

function createCollectionProxy(collectionName: string) {
  const buildQueryChain = (constraints: any[], ops: any[]) => {
    return {
      equals: (value: any) => {
        const lastWhere = [...ops].reverse().find(o => o.type === 'where');
        const newConstraints = lastWhere ? [...constraints, { field: lastWhere.field, op: "==", value }] : constraints;
        return buildQueryChain(newConstraints, ops);
      },
      where: (field: string) => {
        return buildQueryChain(constraints, [...ops, { type: 'where', field }]);
      },
      filter: (predicate: any) => {
        return buildQueryChain(constraints, [...ops, { type: 'filter', predicate }]);
      },
      reverse: () => {
        return buildQueryChain(constraints, [...ops, { type: 'reverse' }]);
      },
      sortBy: async (field: string) => {
        const chain = buildQueryChain(constraints, [...ops, { type: 'sortBy', field }]);
        return chain.toArray();
      },
      orderBy: (field: string) => {
        return buildQueryChain(constraints, [...ops, { type: 'sortBy', field }]);
      },
      toArray: async () => {
        let res = await firestoreAPI.query(collectionName, constraints);
        for (const op of ops) {
          if (op.type === 'filter') res = res.filter(op.predicate);
          if (op.type === 'sortBy') res = res.sort((a, b) => {
            if (a[op.field] == null) return 1;
            if (b[op.field] == null) return -1;
            return a[op.field] > b[op.field] ? 1 : -1;
          });
          if (op.type === 'reverse') res = res.reverse();
        }
        return res;
      },
      first: async () => {
        let res = await firestoreAPI.query(collectionName, constraints);
        for (const op of ops) {
          if (op.type === 'filter') res = res.filter(op.predicate);
          if (op.type === 'sortBy') res = res.sort((a, b) => {
            if (a[op.field] == null) return 1;
            if (b[op.field] == null) return -1;
            return a[op.field] > b[op.field] ? 1 : -1;
          });
          if (op.type === 'reverse') res = res.reverse();
        }
        return res.length > 0 ? res[0] : undefined;
      },
      count: async () => {
        let res = await firestoreAPI.query(collectionName, constraints);
        for (const op of ops) {
          if (op.type === 'filter') res = res.filter(op.predicate);
          if (op.type === 'sortBy') res = res.sort((a, b) => {
            if (a[op.field] == null) return 1;
            if (b[op.field] == null) return -1;
            return a[op.field] > b[op.field] ? 1 : -1;
          });
          if (op.type === 'reverse') res = res.reverse();
        }
        return res.length;
      }
    };
  };

  const baseChain = buildQueryChain([], []);

  return {
    add: (data: any) => firestoreAPI.add(collectionName, data),
    update: (id: string | number, data: any) => firestoreAPI.update(collectionName, id, data),
    delete: (id: string | number) => firestoreAPI.delete(collectionName, id),
    get: (id: string | number) => firestoreAPI.get(collectionName, id),
    bulkAdd: async (dataArr: any[]) => {
      for (const data of dataArr) await firestoreAPI.add(collectionName, data);
    },
    where: baseChain.where,
    filter: baseChain.filter,
    reverse: baseChain.reverse,
    sortBy: baseChain.sortBy,
    orderBy: baseChain.orderBy,
    toArray: baseChain.toArray,
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
  groups: createCollectionProxy('groups'),
  contactTransfers: createCollectionProxy('contactTransfers'),
  notifications: createCollectionProxy('notifications'),
  customFields: createCollectionProxy('customFields'),
  customGroups: createCollectionProxy('customGroups'),
};

// Remove dummy data seeding logic! It's Firebase now.
export const DEFAULT_TOPICS = [];
export async function seedTopicsIfEmpty() {}
export async function seedUsersIfEmpty() {}
