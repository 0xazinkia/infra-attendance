import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromCache,
  getDocs,
  getDocsFromCache,
  writeBatch,
  setDoc,
  waitForPendingWrites as waitForFirebaseWrites,
} from 'firebase/firestore';
import { db } from './authService';

export type DataCollection =
  | 'students'
  | 'attendance'
  | 'guardianCallLogs'
  | 'subjects'
  | 'departments'

export async function fetchCollection<T extends { id: string }>(name: DataCollection): Promise<T[]> {
  const target = collection(db, name);
  const snapshot = await fetchWithCacheFallback(
    () => getDocs(target),
    () => getDocsFromCache(target)
  );
  return snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as T);
}

async function fetchWithCacheFallback<T>(
  fetchFromServer: () => Promise<T>,
  fetchFromCache: () => Promise<T>
): Promise<T> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return fetchFromCache();
  try {
    return await fetchFromServer();
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === 'unavailable' || code === 'deadline-exceeded') return fetchFromCache();
    throw error;
  }
}

export async function saveDocument<T extends { id: string }>(
  name: DataCollection,
  item: T
): Promise<void> {
  await setDoc(doc(db, name, item.id), item);
}

export async function removeDocument(name: DataCollection, id: string): Promise<void> {
  await deleteDoc(doc(db, name, id));
}

export async function removeDocuments(name: DataCollection, ids: string[]): Promise<void> {
  const commits: Promise<void>[] = [];
  for (let start = 0; start < ids.length; start += 450) {
    const batch = writeBatch(db);
    ids.slice(start, start + 450).forEach((id) => {
      batch.delete(doc(db, name, id));
    });
    commits.push(batch.commit());
  }
  await Promise.all(commits);
}

export async function fetchDocument<T>(name: DataCollection, id: string): Promise<T | null> {
  const target = doc(db, name, id);
  const snapshot = await fetchWithCacheFallback(
    () => getDoc(target),
    () => getDocFromCache(target)
  );
  return snapshot.exists() ? (snapshot.data() as T) : null;
}

export async function fetchAdminEmails(): Promise<string[]> {
  const target = doc(db, 'config', 'admins');
  const snapshot = await fetchWithCacheFallback(
    () => getDoc(target),
    () => getDocFromCache(target)
  );
  if (!snapshot.exists()) return [];
  const emails = snapshot.data().emails;
  return Array.isArray(emails) ? emails.filter((email): email is string => typeof email === 'string') : [];
}

export async function saveAdminEmails(emails: string[]): Promise<void> {
  await setDoc(doc(db, 'config', 'admins'), { emails });
}

export async function waitForPendingWrites(): Promise<void> {
  await waitForFirebaseWrites(db);
}

export async function saveDocuments<T extends { id: string }>(
  name: DataCollection,
  items: T[]
): Promise<void> {
  const commits: Promise<void>[] = [];
  for (let start = 0; start < items.length; start += 450) {
    const batch = writeBatch(db);
    items.slice(start, start + 450).forEach((item) => {
      batch.set(doc(db, name, item.id), item);
    });
    commits.push(batch.commit());
  }
  await Promise.all(commits);
}