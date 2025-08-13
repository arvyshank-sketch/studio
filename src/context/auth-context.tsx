'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, type User, updateProfile } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

const generateUsername = (email: string) => {
    const username = email.split('@')[0];
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${username}${randomSuffix}`;
};

export const AuthContextProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // User is signed in.
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          // New user, create user document in Firestore
          const newDisplayName = currentUser.displayName || generateUsername(currentUser.email!);
          
          try {
            // Update the user's profile in Firebase Auth first
            if (!currentUser.displayName) {
              await updateProfile(currentUser, { displayName: newDisplayName });
            }
            
            // Then create the document in Firestore
            await setDoc(userDocRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: newDisplayName,
              photoURL: currentUser.photoURL,
              createdAt: serverTimestamp(),
            });
            
            // Reload the user to get the updated profile information
            await currentUser.reload();
            setUser(auth.currentUser);

          } catch (error) {
             console.error("Error creating new user entry:", error);
             setUser(currentUser); // Set user even if profile update fails
          }

        } else {
           setUser(currentUser);
        }

      } else {
        // User is signed out
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading: loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthContextProvider');
  }
  return context;
};
