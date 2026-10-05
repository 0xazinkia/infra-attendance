import {
  collectionGroup,
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
import { AttendanceRecord, AttendanceSession } from '../types';

export type DataCollection =
  | 'students'
  | 'attendanceSessions'
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

export function getAttendanceSessionId(record: Pick<
  AttendanceRecord,
  'date' | 'department' | 'semester' | 'section' | 'subject' | 'timeSlot'
>): string {
  const key = JSON.stringify([
    record.date,
    record.department,
    record.semester,
    record.section,
    record.subject,
    record.timeSlot || '',
  ]);
  return `session_${encodeURIComponent(key)}`;
}

export async function fetchAttendanceRecords(): Promise<AttendanceRecord[]> {
  const sessionsRef = collection(db, 'attendanceSessions');
  const recordsRef = collectionGroup(db, 'records');
  const [sessionSnapshot, recordSnapshot] = await Promise.all([
    fetchWithCacheFallback(() => getDocs(sessionsRef), () => getDocsFromCache(sessionsRef)),
    fetchWithCacheFallback(() => getDocs(recordsRef), () => getDocsFromCache(recordsRef)),
  ]);
  const sessions = new Map(sessionSnapshot.docs.map((item) => [
    item.id,
    { ...item.data(), id: item.id } as AttendanceSession,
  ]));

  return recordSnapshot.docs.map((item) => {
    const sessionId = item.ref.parent.parent?.id;
    const session = sessionId ? sessions.get(sessionId) : undefined;
    if (!session) {
      throw new Error(`Attendance record "${item.id}" has no matching session.`);
    }
    const entry = item.data();
    return {
      ...entry,
      id: `${session.id}_${encodeURIComponent(String(entry.studentId))}`,
      sessionId: session.id,
      date: session.date,
      timeSlot: session.timeSlot,
      department: session.department,
      semester: session.semester,
      subject: session.subject,
      section: session.section,
    } as AttendanceRecord;
  });
}

export async function saveAttendanceRecords(records: AttendanceRecord[]): Promise<void> {
  const grouped = new Map<string, { session: AttendanceSession; records: AttendanceRecord[] }>();
  records.forEach((inputRecord) => {
    const record = {
      ...inputRecord,
      studentId: inputRecord.studentId || (inputRecord.roll ? `roll_${inputRecord.roll}` : `legacy_${inputRecord.id}`),
    };
    const sessionId = record.sessionId || getAttendanceSessionId(record);
    const group = grouped.get(sessionId) || {
      session: {
        id: sessionId,
        date: record.date,
        timeSlot: record.timeSlot || '',
        department: record.department,
        semester: record.semester,
        subject: record.subject,
        section: record.section,
      },
      records: [],
    };
    group.records.push(record);
    grouped.set(sessionId, group);
  });

  const commits: Promise<void>[] = [];
  grouped.forEach(({ session, records: sessionRecords }) => {
    for (let start = 0; start < sessionRecords.length; start += 450) {
      const batch = writeBatch(db);
      if (start === 0) {
        const { id, ...sessionData } = session;
        batch.set(doc(db, 'attendanceSessions', id), sessionData);
      }
      sessionRecords.slice(start, start + 450).forEach((record) => {
        const studentDocumentId = encodeURIComponent(record.studentId);
        batch.set(
          doc(db, 'attendanceSessions', session.id, 'records', studentDocumentId),
          {
            studentId: record.studentId,
            roll: record.roll,
            studentName: record.studentName,
            status: record.status,
            ...(record.remarks ? { remarks: record.remarks } : {}),
            ...(record.recordedBy ? { recordedBy: record.recordedBy } : {}),
            recordedAt: record.recordedAt,
          }
        );
      });
      commits.push(batch.commit());
    }
  });
  await Promise.all(commits);
}

export async function saveAttendanceSessionMetadata(records: AttendanceRecord[]): Promise<void> {
  const sessions = new Map<string, AttendanceSession>();
  records.forEach((record) => {
    const id = record.sessionId || getAttendanceSessionId(record);
    sessions.set(id, {
      id,
      date: record.date,
      timeSlot: record.timeSlot || '',
      department: record.department,
      semester: record.semester,
      subject: record.subject,
      section: record.section,
    });
  });
  const commits = Array.from(sessions.values()).map(({ id, ...session }) =>
    setDoc(doc(db, 'attendanceSessions', id), session)
  );
  await Promise.all(commits);
}

export async function deleteAttendanceSessionDocuments(
  sessionIds: string[],
  records: AttendanceRecord[]
): Promise<void> {
  const uniqueSessionIds = Array.from(new Set(sessionIds));
  const recordsBySession = new Map<string, AttendanceRecord[]>();
  records.forEach((record) => {
    const sessionId = record.sessionId || getAttendanceSessionId(record);
    const matching = recordsBySession.get(sessionId) || [];
    matching.push(record);
    recordsBySession.set(sessionId, matching);
  });

  const entryCommits: Promise<void>[] = [];
  uniqueSessionIds.forEach((sessionId) => {
    const sessionRecords = recordsBySession.get(sessionId) || [];
    for (let start = 0; start < sessionRecords.length; start += 450) {
      const batch = writeBatch(db);
      sessionRecords.slice(start, start + 450).forEach((record) => {
        batch.delete(doc(
          db,
          'attendanceSessions',
          sessionId,
          'records',
          encodeURIComponent(record.studentId)
        ));
      });
      entryCommits.push(batch.commit());
    }
  });
  await Promise.all(entryCommits);
  await removeDocuments('attendanceSessions', uniqueSessionIds);
}