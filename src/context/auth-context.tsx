
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
    const handleUser = async (user: User) => {
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        const newDisplayName = user.displayName || generateUsername(user.email!);
        // Using a placeholder with a hint for a default cool Sung Jin Woo avatar
        const photoURL = user.photoURL || `https://placehold.co/128x128.png?text=SJW`;
        try {
          // We only update the profile if it's missing a display name or photo
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
          // After creating the profile, reload the user object to get the latest data
          await user.reload();
          setUser(auth.currentUser); // Update state with reloaded user
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

  // Initial loader remains for the very first check
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

    