"use client";
// @ts-nocheck
import { db } from "@/lib/db";
import { useState, useEffect } from 'react';
import { db as firebaseDb } from '@/lib/firebase';
import { 
  collection, doc, onSnapshot, query, where, QueryConstraint, 
  DocumentData, getDocs, addDoc, updateDoc, deleteDoc, getDoc 
} from 'firebase/firestore';

function convertTimestamps(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (typeof obj.toDate === 'function') return obj.toDate().toISOString();
  if (Array.isArray(obj)) return obj.map(convertTimestamps);
  if (typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      newObj[key] = convertTimestamps(obj[key]);
    }
    return newObj;
  }
  return obj;
}

// Shared Hooks
export function useFirestoreQuery<T>(
  collectionName: string, 
  constraints: QueryConstraint[] = [],
  dependencies: any[] = []
): T[] | undefined {
  const [data, setData] = useState<T[] | undefined>(undefined);

  useEffect(() => {
    if (dependencies.some(dep => dep == null)) {
      setData(undefined);
      return;
    }

    const q = query(collection(firebaseDb, collectionName), ...constraints);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamps(doc.data())
      })) as T[];
      setData(results);
    }, (error) => {
      console.error("Firestore query error:", error);
      setData([]); 
    });

    return () => unsubscribe();
  }, dependencies); 

  return data;
}

export function useFirestoreDoc<T>(collectionName: string, docId?: string | number): T | undefined {
  const [data, setData] = useState<T | undefined>(undefined);

  useEffect(() => {
    if (!docId) {
      setData(undefined);
      return;
    }
    
    const unsubscribe = onSnapshot(doc(firebaseDb, collectionName, docId.toString()), (docSnap) => {
      if (docSnap.exists()) {
        setData({ id: docSnap.id, ...convertTimestamps(docSnap.data()) } as T);
      } else {
        setData(undefined);
      }
    }, (error) => {
      console.error("Firestore doc error:", error);
    });

    return () => unsubscribe();
  }, [collectionName, docId]);

  return data;
}

// Global mutation event for legacy Dexie mock
const mutationEvent = new EventTarget();
function notifyMutation() {
  mutationEvent.dispatchEvent(new Event('mutate'));
}

// MOCK FOR useLiveQuery to support legacy Dexie code that wasn't regex replaced
export function useLiveQuery<T>(querier: () => Promise<T> | T, dependencies: any[] = []): T | undefined {
  const [data, setData] = useState<T | undefined>(undefined);
  
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      try {
        const res = await querier();
        if (isMounted) setData(res);
      } catch (err) {
        console.error("useLiveQuery mock error:", err);
      }
    };
    
    fetchData();
    
    const onMutate = () => {
      fetchData();
    };
    
    mutationEvent.addEventListener('mutate', onMutate);
    
    return () => { 
      isMounted = false; 
      mutationEvent.removeEventListener('mutate', onMutate);
    };
  }, dependencies);
  
  return data;
}


// Utility functions to replace db.table.add(), etc.

// Firestore doesn't support undefined fields. We must strip them.
function cleanData(data: any) {
  if (!data) return data;
  return Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
}

export const firestoreAPI = {
  async add(collectionName: string, data: any) {
    const docRef = await addDoc(collection(firebaseDb, collectionName), cleanData(data));
    notifyMutation();
    return docRef.id;
  },
  
  async update(collectionName: string, id: string | number, data: any) {
    await updateDoc(doc(firebaseDb, collectionName, id.toString()), cleanData(data));
    notifyMutation();
  },
  
  async delete(collectionName: string, id: string | number) {
    await deleteDoc(doc(firebaseDb, collectionName, id.toString()));
    notifyMutation();
  },

  async get(collectionName: string, id: string | number) {
    const docSnap = await getDoc(doc(firebaseDb, collectionName, id.toString()));
    return docSnap.exists() ? { id: docSnap.id, ...convertTimestamps(docSnap.data()) } : undefined;
  },

  async query(collectionName: string, constraints: any[] = []) {
    // constraints here are passed from our db.ts as [{ field, op, value }]
    const firestoreConstraints = constraints.map(c => where(c.field, c.op, c.value));
    const q = query(collection(firebaseDb, collectionName), ...firestoreConstraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) }));
  }
};
