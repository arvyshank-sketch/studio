
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

const DEFAULT_AVATAR_URL = 'https://placehold.co/128x128.png?text=SJW';

export const AuthContextProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleUser = async (user: User) => {
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        const newDisplayName = user.displayName || generateUsername(user.email!);
        const photoURL = user.photoURL || DEFAULT_AVATAR_URL;
        try {
          if (!user.displayName || !user.photoURL) {
            await updateProfile(user, { displayName: newDisplayName, photoURL: photoURL });
          }
          await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            displayName: newDisplayName,
            photoURL: photoURL,
            createdAt: serverTimestamp(),
            level: 1,
            xp: 0,
            badges: [],
          });
          await user.reload();
          setUser(auth.currentUser);
        } catch (error) {
          console.error("Error creating new user entry:", error);
        }
      }
    };
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        handleUser(currentUser).finally(() => {
          setUser(currentUser);
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
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
