"use client";
// @ts-nocheck

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export interface User {
  id: string; // Firebase UID
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'FOLK_GUIDE' | 'FOLK_LEADER' | 'RESIDENT' | 'ADMIN' | 'LEADER' | 'MEMBER';
  teamId?: string;
  guideId?: string;
}

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password?: string) => Promise<void>;
  signup: (email: string, password: string, name: string, role: 'FOLK_LEADER' | 'RESIDENT', teamId: string, guideId: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch custom user data from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            let data = userDoc.data();
            
            // Auto-elevate admin@folk.in to SUPER_ADMIN
            if (data.email === 'admin@folk.in' && data.role !== 'SUPER_ADMIN') {
              data.role = 'SUPER_ADMIN';
              await setDoc(doc(db, 'users', firebaseUser.uid), { role: 'SUPER_ADMIN' }, { merge: true });
            }
            
            setCurrentUser({ id: firebaseUser.uid, ...data } as User);
          } else {
            console.error("User document not found in Firestore!");
            // Check if it's the admin trying to log in for the first time
            if (firebaseUser.email === 'admin@folk.in') {
              const adminData = {
                name: 'Super Admin',
                email: 'admin@folk.in',
                role: 'SUPER_ADMIN'
              };
              await setDoc(doc(db, 'users', firebaseUser.uid), adminData);
              setCurrentUser({ id: firebaseUser.uid, ...adminData } as User);
            } else {
              setCurrentUser(null);
            }
          }
        } catch (err) {
          console.error("Error fetching user data:", err);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password?: string) => {
    if (!password) throw new Error("Password is required for Firebase auth");
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      
      if (email === 'admin@folk.in') {
        router.push('/admin');
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', userCred.user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const role = data.role;
        
        setCurrentUser({ id: userCred.user.uid, ...data } as User);

        if (role === 'SUPER_ADMIN') {
          router.push('/admin');
        } else if (role === 'FOLK_GUIDE') {
          router.push('/guide');
        } else {
          router.push('/');
        }
      } else {
        await signOut(auth);
        throw new Error("Your account was found, but your profile is missing from the database. This happens if the account was created manually in the Firebase Console instead of through the app. Please ask the Super Admin to delete the account from Firebase and sign up properly through the app.");
      }
    } catch (error: any) {
      if (email === 'admin@folk.in') {
        try {
          const userCred = await createUserWithEmailAndPassword(auth, email, password);
          const adminData = { name: 'Super Admin', email: 'admin@folk.in', role: 'SUPER_ADMIN' };
          await setDoc(doc(db, 'users', userCred.user.uid), adminData);
          setCurrentUser({ id: userCred.user.uid, ...adminData } as User);
          router.push('/admin');
          return;
        } catch (createErr: any) {
          if (createErr.code === 'auth/weak-password') {
            throw new Error("For security, please use a password of at least 6 characters.");
          }
          console.error("Failed to auto-create admin:", createErr);
        }
      }
      console.error(error);
      throw new Error("Invalid credentials");
    }
  };

  const signup = async (email: string, password: string, name: string, role: 'FOLK_LEADER' | 'RESIDENT', teamId: string, guideId: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const userData = {
        name,
        email,
        role,
        teamId,
        guideId
      };
      
      // Save additional user info to Firestore
      await setDoc(doc(db, 'users', user.uid), userData);
      
      setCurrentUser({ id: user.uid, ...userData } as User);
      router.push('/');
    } catch (error: any) {
      console.error(error);
      throw new Error(error.message || "Failed to sign up");
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, signup, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
