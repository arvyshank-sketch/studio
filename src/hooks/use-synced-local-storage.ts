import { useState, useEffect, useCallback } from 'react';

// Custom hook to keep state in sync with localStorage and across tabs/windows.
export function useSyncedLocalStorage<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    // This part runs only on the initial render on the client.
    if (typeof window === 'undefined') {
      return defaultValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading localStorage key “${key}”:`, error);
      return defaultValue;
    }
  });

  // This effect updates localStorage when the state changes.
  useEffect(() => {
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error(`Error setting localStorage key “${key}”:`, error);
        }
    }
  }, [key, value]);
  
  // This effect listens for changes in other tabs.
  const handleStorageChange = useCallback((event: StorageEvent) => {
      if (event.key === key && event.newValue) {
          try {
              setValue(JSON.parse(event.newValue));
          } catch(e) {
              console.error(e)
          }
      }
  }, [key]);

  useEffect(() => {
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [handleStorageChange]);


  return [value, setValue];
}
