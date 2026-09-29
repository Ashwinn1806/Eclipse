import { useState, useEffect } from 'react';

export function useOfflineStore<T>(key: string, initialValue: T) {
  const [data, setData] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) setData(JSON.parse(item));
      setIsLoaded(true);
    } catch (error) {
      console.warn("Offline storage read error:", error);
    }
  }, [key]);

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(data) : value;
      setData(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn("Offline storage save error:", error);
    }
  };

  return [data, setValue, isLoaded] as const;
}
