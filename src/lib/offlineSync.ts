// IndexedDB Helper for Offline Mutation Queue in Eclipse PWA

const DB_NAME = 'eclipse_pwa_db';
const DB_VERSION = 1;
const STORE_NAME = 'mutation_queue';

export interface OfflineMutation {
  id: string; // unique timestamp key
  type: 'UPDATE_SET' | 'DELETE_SET' | 'ADD_SET' | 'ADD_EXERCISE' | 'DELETE_EXERCISE';
  payload: any;
  createdAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject('IndexedDB not supported');
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueOfflineMutation(
  type: OfflineMutation['type'],
  payload: any
): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const item: OfflineMutation = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      payload,
      createdAt: Date.now(),
    };
    store.add(item);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[Offline Queue] Error saving item:', err);
  }
}

export async function getOfflineMutations(): Promise<OfflineMutation[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[Offline Queue] Error getting items:', err);
    return [];
  }
}

export async function removeOfflineMutation(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[Offline Queue] Error removing item:', err);
  }
}

export async function clearOfflineMutations(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[Offline Queue] Error clearing items:', err);
  }
}

let isSyncingInFlight = false;

export async function processOfflineQueue(
  processor: (item: OfflineMutation) => Promise<void>
): Promise<number> {
  if (isSyncingInFlight) return 0;
  isSyncingInFlight = true;
  let count = 0;
  try {
    const queue = await getOfflineMutations();
    if (!queue || queue.length === 0) return 0;
    queue.sort((a, b) => a.createdAt - b.createdAt);
    for (const item of queue) {
      try {
        await processor(item);
        await removeOfflineMutation(item.id);
        count++;
      } catch (err) {
        console.warn(`[Offline Sync] Error processing item ${item.id}:`, err);
        await removeOfflineMutation(item.id);
      }
    }
  } finally {
    isSyncingInFlight = false;
  }
  return count;
}
