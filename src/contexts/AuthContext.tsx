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
  role: 'ADMIN' | 'LEADER' | 'MEMBER';
  teamId?: string;
}

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password?: string) => Promise<void>;
  signup: (email: string, password: string,name: string, role: 'LEADER' | 'MEMBER', teamId: string) => Promise<void>;
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
            setCurrentUser({ id: firebaseUser.uid, ...userDoc.data() } as User);
          } else {
            console.error("User document not found in Firestore!");
            setCurrentUser(null);
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
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/');
    } catch (error: any) {
      console.error(error);
      throw new Error("Invalid credentials");
    }
  };

  const signup = async (email: string, password: string, name: string, role: 'LEADER' | 'MEMBER', teamId: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Save additional user info to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        name,
        email,
        role,
        teamId
      });
      
      // Auto login happens via onAuthStateChanged
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
