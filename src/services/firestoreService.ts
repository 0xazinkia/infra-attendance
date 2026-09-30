import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  setDoc,
} from 'firebase/firestore';
import { db } from './authService';

export type DataCollection =
  | 'students'
  | 'attendance'
  | 'guardianCallLogs'
  | 'subjects'
  | 'departments'

export async function fetchCollection<T extends { id: string }>(name: DataCollection): Promise<T[]> {
  const snapshot = await getDocs(collection(db, name));
  return snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as T);
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
  for (let start = 0; start < ids.length; start += 450) {
    const batch = writeBatch(db);
    ids.slice(start, start + 450).forEach((id) => {
      batch.delete(doc(db, name, id));
    });
    await batch.commit();
  }
}

export async function fetchDocument<T>(name: DataCollection, id: string): Promise<T | null> {
  const snapshot = await getDoc(doc(db, name, id));
  return snapshot.exists() ? (snapshot.data() as T) : null;
}

export async function fetchAdminEmails(): Promise<string[]> {
  const snapshot = await getDoc(doc(db, 'config', 'admins'));
  if (!snapshot.exists()) return [];
  const emails = snapshot.data().emails;
  return Array.isArray(emails) ? emails.filter((email): email is string => typeof email === 'string') : [];
}

export async function saveAdminEmails(emails: string[]): Promise<void> {
  await setDoc(doc(db, 'config', 'admins'), { emails });
}

export async function saveDocuments<T extends { id: string }>(
  name: DataCollection,
  items: T[]
): Promise<void> {
  for (let start = 0; start < items.length; start += 450) {
    const batch = writeBatch(db);
    items.slice(start, start + 450).forEach((item) => {
      batch.set(doc(db, name, item.id), item);
    });
    await batch.commit();
  }
}