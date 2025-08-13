
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, type User, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthContextProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Check if user document exists in Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
          // Create user document if it doesn't exist
          await setDoc(userDocRef, {
            email: user.email,
            createdAt: new Date(),
          });
        }
        setUser(user);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    await firebaseSignOut(auth);
    router.push('/login');
  };
  
  const handleAuth = async (authAction: Promise<any>) => {
    try {
        const result = await authAction;
        const user = result.user;
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
          await setDoc(userDocRef, {
            email: user.email,
            provider: result.providerId,
            createdAt: new Date(),
          });
        }
    } catch (error: any) {
        console.error("Authentication error:", error);
        throw error;
    }
  }

  const signInWithGoogle = async () => {
      const provider = new GoogleAuthProvider();
      await handleAuth(signInWithPopup(auth, provider));
  };
  
  const signUpWithEmail = async (email: string, pass: string) => {
      await handleAuth(createUserWithEmailAndPassword(auth, email, pass));
  }
  
  const signInWithEmail = async (email: string, pass: string) => {
      await handleAuth(signInWithEmailAndPassword(auth, email, pass));
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, signOut, signInWithGoogle, signUpWithEmail, signInWithEmail }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthContextProvider');
  }
  return context;
}
