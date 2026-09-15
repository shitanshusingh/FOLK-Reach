import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
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
    // If any dependency is undefined/null that means we shouldn't query yet
    if (dependencies.some(dep => dep == null)) {
      setData(undefined);
      return;
    }

    const q = query(collection(db, collectionName), ...constraints);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map(doc => ({
        id: doc.id, // Firestore uses string IDs natively, we map it to id
        ...doc.data()
      })) as T[];
      setData(results);
    }, (error) => {
      console.error("Firestore query error:", error);
      setData([]); // fallback
    });

    return () => unsubscribe();
  }, dependencies); // Re-run if dependencies change

  return data;
}

export function useFirestoreDoc<T>(collectionName: string, docId?: string | number): T | undefined {
  const [data, setData] = useState<T | undefined>(undefined);

  useEffect(() => {
    if (!docId) {
      setData(undefined);
      return;
    }
    
    const unsubscribe = onSnapshot(doc(db, collectionName, docId.toString()), (docSnap) => {
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

// Utility functions to replace db.table.add(), etc.
export const firestoreAPI = {
  async add(collectionName: string, data: any) {
    const docRef = await addDoc(collection(db, collectionName), data);
    return docRef.id;
  },
  
  async update(collectionName: string, id: string | number, data: any) {
    await updateDoc(doc(db, collectionName, id.toString()), data);
  },
  
  async delete(collectionName: string, id: string | number) {
    await deleteDoc(doc(db, collectionName, id.toString()));
  },

  async get(collectionName: string, id: string | number) {
    const docSnap = await getDoc(doc(db, collectionName, id.toString()));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : undefined;
  },

  async query(collectionName: string, constraints: QueryConstraint[]) {
    const q = query(collection(db, collectionName), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
};
