import { getApps, initializeApp, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

/**
 * Resolves a URL that might be a gs:// path into a public HTTPS URL.
 * @param url The URL to resolve.
 * @returns A public HTTPS URL or the original URL if it's not a gs:// path.
 */
export async function resolveStorageUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) {
    return null;
  }
  if (url.startsWith('gs://')) {
    try {
      const storageRef = ref(storage, url);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Error getting download URL:', error);
      return null; // Return null if the gs:// path is invalid or file doesn't exist
    }
  }
  return url;
}


export { app, auth, db, storage };
