
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
import { getRank } from '@/lib/gamification';

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

const DEFAULT_AVATAR_URL = 'https://i.pinimg.com/736x/a4/b4/3c/a4b43ce5f8b6f3d1b7a3e74e47190dce.jpg';

// This function runs in the background to create a user document in Firestore.
// It doesn't block the UI from rendering.
const createUserDocument = async (user: User) => {
  const userDocRef = doc(db, 'users', user.uid);
  const userDocSnap = await getDoc(userDocRef);

  if (!userDocSnap.exists()) {
    // If the document doesn't exist, create it.
    const newDisplayName = user.displayName || generateUsername(user.email!);
    const photoURL = user.photoURL || DEFAULT_AVATAR_URL;
    const initialLevel = 1;
    try {
      // We can update the Firebase Auth profile and Firestore doc in parallel.
      const profileUpdatePromise = updateProfile(user, { displayName: newDisplayName, photoURL: photoURL });
      const docCreatePromise = setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        displayName: newDisplayName,
        photoURL: photoURL,
        createdAt: serverTimestamp(),
        level: initialLevel,
        xp: 0,
        rank: getRank(initialLevel).name,
        badges: [],
      });
      await Promise.all([profileUpdatePromise, docCreatePromise]);
    } catch (error) {
      console.error("Error creating new user entry:", error);
    }
  }
};


export const AuthContextProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      // If a user is logged in, ensure their Firestore document exists.
      // This check runs in the background and does not delay app startup.
      if (currentUser) {
        createUserDocument(currentUser);
      }
    });

    return () => unsubscribe();
  }, []);

  // Show a loader only during the initial auth check.
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
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

    

    
