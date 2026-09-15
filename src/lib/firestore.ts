"use client";
// @ts-nocheck
import { db } from "@/lib/db";
import { useState, useEffect } from 'react';
import { db as firebaseDb } from '@/lib/firebase';
import { 
  collection, doc, onSnapshot, query, where, QueryConstraint, 
  DocumentData, getDocs, addDoc, updateDoc, deleteDoc, getDoc 
} from 'firebase/firestore';

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
        ...doc.data()
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
        setData({ id: docSnap.id, ...docSnap.data() } as T);
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
    
    // To mimic "live" updates for complex queries, we just poll every 5 seconds as a dirty fallback
    // Since this is only for queries our regex missed, it's acceptable for now.
    const interval = setInterval(fetchData, 5000);
    
    return () => { 
      isMounted = false; 
      clearInterval(interval);
    };
  }, dependencies);
  
  return data;
}


// Utility functions to replace db.table.add(), etc.
export const firestoreAPI = {
  async add(collectionName: string, data: any) {
    const docRef = await addDoc(collection(firebaseDb, collectionName), data);
    return docRef.id;
  },
  
  async update(collectionName: string, id: string | number, data: any) {
    await updateDoc(doc(firebaseDb, collectionName, id.toString()), data);
  },
  
  async delete(collectionName: string, id: string | number) {
    await deleteDoc(doc(firebaseDb, collectionName, id.toString()));
  },

  async get(collectionName: string, id: string | number) {
    const docSnap = await getDoc(doc(firebaseDb, collectionName, id.toString()));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : undefined;
  },

  async query(collectionName: string, constraints: QueryConstraint[] = []) {
    const q = query(collection(firebaseDb, collectionName), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
};
