import { useState, useEffect, useCallback } from 'react';

export function useSyncedLocalStorage<T>(key: string, defaultValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
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

  useEffect(() => {
    try {
      const item = JSON.stringify(value);
      window.localStorage.setItem(key, item);
      window.dispatchEvent(new StorageEvent('storage', { key, newValue: item }));
    } catch (error) {
      console.error(`Error setting localStorage key “${key}”:`, error);
    }
  }, [key, value]);

  const handleStorageChange = useCallback((event: StorageEvent) => {
    if (event.key === key && event.newValue) {
      try {
        setValue(JSON.parse(event.newValue));
      } catch (error) {
        console.error(`Error parsing storage event for key “${key}”:`, error);
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
