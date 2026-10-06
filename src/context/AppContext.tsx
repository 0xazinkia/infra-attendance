import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { deleteUser, User } from 'firebase/auth';
import {
  Student,
  AttendanceRecord,
  GuardianCallLog,
  SubjectItem,
  Department,
  Semester,
  Section,
  DatabaseStatus,
} from '../types';
import {
  SEMESTERS,
  SECTIONS,
  BTEB_PRESET_SUBJECTS,
} from '../data/mockData';
import {
  initAuth,
  googleSignIn,
  authorizeGoogleSheets,
  getAccessToken,
  logout as authLogout,
  setAccessToken,
} from '../services/authService';
import {
  fetchStudentsFromSheet,
  fetchAttendanceFromSheet,
  fetchCallLogsFromSheet,
  fetchSubjectsFromSheet,
} from '../services/sheetsService';
import {
  fetchAdminEmails,
  fetchAttendanceRecords,
  fetchCollection,
  getAttendanceSessionId,
  removeDocument,
  removeDocuments,
  saveAdminEmails,
  saveAttendanceRecords,
  saveAttendanceSessionMetadata,
  saveDocument,
  saveDocuments,
  deleteAttendanceSessionDocuments,
  waitForPendingWrites,
} from '../services/firestoreService';

interface AttendanceFilter {
  department: Department;
  semester: Semester | '';
  section: Section;
  subject: string;
  date: string;
  timeSlot: string;
}

interface AppContextType {
  // Data
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  callLogs: GuardianCallLog[];
  subjects: SubjectItem[];
  departments: Department[];
  
  // Filter for Attendance & Rosters
  filter: AttendanceFilter;
  setFilter: React.Dispatch<React.SetStateAction<AttendanceFilter>>;
  
  // CRUD Operations on Students
  addStudent: (student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Student>;
  updateStudent: (student: Student) => Promise<void>;
  deleteStudent: (studentId: string) => Promise<void>;
  deleteStudents: (studentIds: string[]) => Promise<void>;
  bulkImportStudents: (newStudents: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<number>;
  bulkUpdateStudents: (updatedStudents: Student[]) => Promise<void>;
  
  // Attendance & Calling
  saveAttendanceBatch: (records: AttendanceRecord[]) => Promise<void>;
  clearAttendanceRange: (startMonth: string, endMonth: string, department?: Department | 'all') => Promise<number>;
  deleteAttendanceSessions: (dates: string[], department: Department, semester: Semester, section: Section, subject: string) => Promise<number>;
  addCallLog: (log: Omit<GuardianCallLog, 'id' | 'callTime'>) => Promise<void>;
  
  // Subject Management
  addSubject: (code: string, name: string, department: Department, semester: Semester) => Promise<SubjectItem>;
  updateSubject: (subject: SubjectItem) => Promise<void>;
  deleteSubject: (subjectId: string) => Promise<void>;
  addDepartment: (name: string) => Promise<string>;
  updateDepartment: (currentName: string, name: string) => Promise<string>;
  deleteDepartment: (name: string) => Promise<void>;
  seedPresetSubjects: () => Promise<void>;
  clearAllSubjects: () => Promise<void>;
  
  // Firebase database and authentication
  user: User | null;
  databaseStatus: DatabaseStatus;
  loginWithGoogle: () => Promise<void>;
  logoutUser: () => Promise<void>;
  refreshDatabase: () => Promise<void>;
  importFromGoogleSheet: (idOrUrl: string) => Promise<void>;
  importLocalDataToFirebase: () => Promise<void>;

  // Admin Email Whitelist Management
  authorizedAdmins: string[];
  addAdminEmail: (email: string) => Promise<{ success: boolean; message: string }>;
  removeAdminEmail: (email: string) => Promise<{ success: boolean; message: string }>;
  isAuthorizedAdmin: (email?: string | null) => boolean;
}

const AppContext = createContext<AppContextType | null>(null);

const DEFAULT_ADMIN_EMAILS = ['0xayub.me@gmail.com'];

const isLegacyMockStudent = (student: Pick<Student, 'id' | 'name'>) =>
  student.id.startsWith('std_cst_') || student.name.trim().toLowerCase() === 'tanvir ahmed shanto';

const isLegacyMockAttendance = (record: Pick<AttendanceRecord, 'studentId' | 'studentName'>) =>
  record.studentId.startsWith('std_cst_') || record.studentName.trim().toLowerCase() === 'tanvir ahmed shanto';

const normalizeAttendanceRecord = (record: AttendanceRecord): AttendanceRecord => {
  const sessionId = record.sessionId || getAttendanceSessionId(record);
  const studentId = record.studentId || (record.roll ? `roll_${record.roll}` : `legacy_${record.id}`);
  return {
    ...record,
    studentId,
    id: `${sessionId}_${encodeURIComponent(studentId)}`,
    sessionId,
  };
};

const attendanceIdentity = (record: AttendanceRecord) =>
  `${record.sessionId || getAttendanceSessionId(record)}|${record.studentId || record.roll || record.id}`;

const mergeAttendanceRecords = (existing: AttendanceRecord[], incoming: AttendanceRecord[]) => {
  const merged = new Map(existing.map((record) => {
    const normalized = normalizeAttendanceRecord(record);
    return [attendanceIdentity(normalized), normalized];
  }));
  incoming.forEach((record) => {
    const normalized = normalizeAttendanceRecord(record);
    merged.set(attendanceIdentity(normalized), normalized);
  });
  return Array.from(merged.values());
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [callLogs, setCallLogs] = useState<GuardianCallLog[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentDocuments, setDepartmentDocuments] = useState<{ id: string; name: string }[]>([]);

  // Current session filter
  const todayDate = new Date().toISOString().split('T')[0];
  const [filter, setFilter] = useState<AttendanceFilter>({
    department: '',
    semester: '',
    section: 'A',
    subject: '',
    date: todayDate,
    timeSlot: '09:00 AM - 09:45 AM',
  });

  // Auth & Google Sheets State
  const [user, setUser] = useState<User | null>(null);
  const [authorizedAdmins, setAuthorizedAdmins] = useState<string[]>(DEFAULT_ADMIN_EMAILS);
  const [databaseStatus, setDatabaseStatus] = useState<DatabaseStatus>({
    isConnected: false,
    isLoading: false,
    isOnline: typeof navigator === 'undefined' || navigator.onLine,
    pendingWrites: 0,
    error: null,
  });

  const enqueueWrite = (write: Promise<void>) => {
    setDatabaseStatus((current) => ({ ...current, pendingWrites: current.pendingWrites + 1, error: null }));
    void write.then(
      () => setDatabaseStatus((current) => ({ ...current, pendingWrites: Math.max(0, current.pendingWrites - 1) })),
      (error: unknown) => {
        setDatabaseStatus((current) => ({
          ...current,
          pendingWrites: Math.max(0, current.pendingWrites - 1),
          error: error instanceof Error ? error.message : 'Could not sync a saved change to Firebase.',
        }));
        if (navigator.onLine && user) void loadDatabase(user).catch(() => undefined);
      }
    );
  };

  const trackExistingWrites = () => {
    setDatabaseStatus((current) => ({ ...current, pendingWrites: current.pendingWrites + 1 }));
    void waitForPendingWrites().then(
      () => setDatabaseStatus((current) => ({ ...current, pendingWrites: Math.max(0, current.pendingWrites - 1) })),
      (error: unknown) => setDatabaseStatus((current) => ({
        ...current,
        pendingWrites: Math.max(0, current.pendingWrites - 1),
        error: error instanceof Error ? error.message : 'Could not sync saved changes to Firebase.',
      }))
    );
  };

  // Admin Email Management Functions
  const isAuthorizedAdmin = useCallback((email?: string | null): boolean => {
    if (!email) return false;
    const clean = email.trim().toLowerCase();
    return authorizedAdmins.some((a) => a.toLowerCase() === clean);
  }, [authorizedAdmins]);

  const addAdminEmail = useCallback(async (email: string): Promise<{ success: boolean; message: string }> => {
    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes('@') || !clean.includes('.')) {
      return { success: false, message: 'Please enter a valid email address.' };
    }
    if (authorizedAdmins.some((a) => a.toLowerCase() === clean)) {
      return { success: false, message: 'This email is already an authorized administrator.' };
    }
    const updated = [...authorizedAdmins, clean];
    try {
      enqueueWrite(saveAdminEmails(updated));
      setAuthorizedAdmins(updated);
      return { success: true, message: `"${clean}" has been added as an authorized administrator.` };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Could not save admin access to Firebase.' };
    }
  }, [authorizedAdmins]);

  const removeAdminEmail = useCallback(async (email: string): Promise<{ success: boolean; message: string }> => {
    const clean = email.trim().toLowerCase();
    if (authorizedAdmins.length <= 1) {
      return { success: false, message: 'Cannot remove the last remaining admin. At least one admin email is required.' };
    }
    const updated = authorizedAdmins.filter((a) => a.toLowerCase() !== clean);
    try {
      enqueueWrite(saveAdminEmails(updated));
      setAuthorizedAdmins(updated);
      return { success: true, message: `"${clean}" has been removed from authorized administrators.` };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Could not update Firebase admin access.' };
    }
  }, [authorizedAdmins]);

  const mergeById = <T extends { id: string }>(existing: T[], incoming: T[]): T[] => {
    const merged = new Map(existing.map((item) => [item.id, item]));
    incoming.forEach((item) => merged.set(item.id, item));
    return Array.from(merged.values());
  };

  const loadDatabase = async (currentUser: User) => {
    setDatabaseStatus((current) => ({ ...current, isConnected: true, isLoading: true, isOnline: navigator.onLine, error: null }));
    try {
      const [adminEmails, loadedStudents, loadedAttendance, loadedCalls, loadedSubjects, loadedDepartments] = await Promise.all([
        fetchAdminEmails(),
        fetchCollection<Student>('students'),
        fetchAttendanceRecords(),
        fetchCollection<GuardianCallLog>('guardianCallLogs'),
        fetchCollection<SubjectItem>('subjects'),
        fetchCollection<{ id: string; name: string }>('departments'),
      ]);
      const normalizedAdmins = adminEmails.map((email) => email.trim().toLowerCase());
      if (!normalizedAdmins.length && currentUser.email?.toLowerCase() === DEFAULT_ADMIN_EMAILS[0]) {
        if (navigator.onLine) enqueueWrite(saveAdminEmails(DEFAULT_ADMIN_EMAILS));
      }
      setAuthorizedAdmins(normalizedAdmins.length ? normalizedAdmins : DEFAULT_ADMIN_EMAILS);
      const cleanStudents = loadedStudents.filter((student) => !isLegacyMockStudent(student));
      const cleanCalls = loadedCalls.filter((log) => !isLegacyMockAttendance(log));
      const legacyStudentIds = loadedStudents.filter(isLegacyMockStudent).map((student) => student.id);
      const legacyCallIds = loadedCalls.filter(isLegacyMockAttendance).map((log) => log.id);
      if (navigator.onLine && (legacyStudentIds.length || legacyCallIds.length)) {
        enqueueWrite(Promise.all([
          ...legacyStudentIds.map((id) => removeDocument('students', id)),
          ...legacyCallIds.map((id) => removeDocument('guardianCallLogs', id)),
        ]).then(() => undefined));
      }
      setStudents(cleanStudents);
      setAttendanceRecords(loadedAttendance);
      setCallLogs(cleanCalls);
      const cleanSubjects = loadedSubjects.filter((subject) =>
        subject.id !== 'bteb_cst_401' && subject.code !== '66641' && subject.name !== 'Object Oriented Programming (Java/Python)'
      );
      const removedSubjects = loadedSubjects.filter((subject) => !cleanSubjects.includes(subject));
      if (navigator.onLine) await Promise.all(removedSubjects.map((subject) => removeDocument('subjects', subject.id)));
      setSubjects(cleanSubjects);
      setDepartmentDocuments(loadedDepartments);
      setDepartments(loadedDepartments.map((department) => department.name).filter(Boolean));
      if (filter.subject === 'Object Oriented Programming (Java/Python)') {
        setFilter((current) => ({ ...current, subject: '' }));
      }
      setDatabaseStatus((current) => ({ ...current, isConnected: true, isLoading: false, isOnline: navigator.onLine, error: null }));
    } catch (error) {
      setDatabaseStatus((current) => ({
        ...current,
        isConnected: false,
        isLoading: false,
        isOnline: navigator.onLine,
        error: error instanceof Error ? error.message : 'Could not load Firebase data.',
      }));
      throw error;
    }
  };

  // Auth initialization
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        if (navigator.onLine) trackExistingWrites();
        void loadDatabase(currentUser).catch(() => undefined);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setStudents([]);
        setAttendanceRecords([]);
        setCallLogs([]);
        setSubjects([]);
        setDepartments([]);
        setDepartmentDocuments([]);
        setDatabaseStatus((current) => ({ ...current, isConnected: false, isLoading: false, error: null, pendingWrites: 0 }));
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleOffline = () => {
      setDatabaseStatus((current) => ({ ...current, isOnline: false }));
    };
    const handleOnline = () => {
      setDatabaseStatus((current) => ({ ...current, isOnline: true }));
      if (user) {
        trackExistingWrites();
        void loadDatabase(user).catch(() => undefined);
      }
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [user]);

  useEffect(() => {
    setFilter((current) => ({
      ...current,
      department: departments.includes(current.department) ? current.department : '',
    }));
  }, [departments]);

  // Update default subject whenever department or semester changes
  useEffect(() => {
    const matchingSubjects = subjects.filter(
      (s) => s.department === filter.department && s.semester === filter.semester
    );
    if (matchingSubjects.length > 0) {
      // If current subject is not in matching subjects, set to first one
      if (!matchingSubjects.some((s) => s.name === filter.subject)) {
        setFilter((prev) => ({ ...prev, subject: matchingSubjects[0].name }));
      }
    } else if (filter.subject) {
      setFilter((prev) => ({ ...prev, subject: '' }));
    }
  }, [filter.department, filter.semester, subjects, filter.subject]);

  // Google account authentication and Firestore data loading.
  const loginWithGoogle = async () => {
    const result = await googleSignIn();
    if (!result) return;
    const email = result.user.email?.trim().toLowerCase();
    const admins = await fetchAdminEmails();
    const allowedAdmins = admins.length ? admins : DEFAULT_ADMIN_EMAILS;
    if (!email || !allowedAdmins.includes(email)) {
      const accessDeniedMessage = `Access denied for ${email || 'unknown account'}. Ask an administrator to add this email.`;
      try {
        await deleteUser(result.user);
      } catch (error) {
        await authLogout();
        const reason = error instanceof Error ? error.message : 'Unknown Firebase error.';
        throw new Error(`${accessDeniedMessage} Could not remove the Firebase Authentication account: ${reason}`);
      }
      throw new Error(`${accessDeniedMessage} The Firebase Authentication account was removed.`);
    }
    setUser(result.user);
    setAccessToken(result.accessToken);
    await loadDatabase(result.user);
  };

  const logoutUser = async () => {
    await authLogout();
    setUser(null);
    setStudents([]);
    setAttendanceRecords([]);
    setCallLogs([]);
    setSubjects([]);
    setDepartments([]);
    setDepartmentDocuments([]);
    setDatabaseStatus((current) => ({ ...current, isConnected: false, isLoading: false, error: null, pendingWrites: 0 }));
  };

  const refreshDatabase = async () => {
    if (!user) throw new Error('Sign in before loading Firebase data.');
    await loadDatabase(user);
  };

  const importFromGoogleSheet = async (idOrUrl: string) => {
    requireDatabaseAccess();
    if (!navigator.onLine) throw new Error('Google Sheets import requires an internet connection.');
    let token = await getAccessToken();
    if (!token) token = await authorizeGoogleSheets();
    if (!token) throw new Error('Google Sheets access was not granted.');

    const match = idOrUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const spreadsheetId = match?.[1] || idOrUrl.trim();
    if (!spreadsheetId) throw new Error('Enter a valid Google Spreadsheet URL or ID.');

    setDatabaseStatus((current) => ({ ...current, isConnected: true, isLoading: true, isOnline: navigator.onLine, error: null }));
    try {
      const [importedStudents, importedAttendance, importedSubjects, importedCallLogs] = await Promise.all([
        fetchStudentsFromSheet(spreadsheetId, token),
        fetchAttendanceFromSheet(spreadsheetId, token),
        fetchSubjectsFromSheet(spreadsheetId, token),
        fetchCallLogsFromSheet(spreadsheetId, token),
      ]);
      const cleanStudents = importedStudents.filter((student) => !isLegacyMockStudent(student));
      const cleanAttendance = importedAttendance.filter((record) => !isLegacyMockAttendance(record));
      const cleanCallLogs = importedCallLogs.filter((log) => !isLegacyMockAttendance(log));
      const mergedStudents = mergeById(students, cleanStudents);
      const mergedAttendance = mergeAttendanceRecords(attendanceRecords, cleanAttendance);
      const mergedSubjects = mergeById(subjects, importedSubjects);
      const mergedCallLogs = mergeById(callLogs, cleanCallLogs);
      const writes = [
        saveDocuments('students', mergedStudents),
        saveAttendanceRecords(mergedAttendance),
        saveDocuments('subjects', mergedSubjects),
        saveDocuments('guardianCallLogs', mergedCallLogs),
      ];
      writes.forEach(enqueueWrite);
      setStudents(mergedStudents);
      setAttendanceRecords(mergedAttendance);
      setSubjects(mergedSubjects);
      setCallLogs(mergedCallLogs);
      setDatabaseStatus((current) => ({ ...current, isConnected: true, isLoading: false, isOnline: navigator.onLine, error: null }));
    } catch (error) {
      setDatabaseStatus((current) => ({
        ...current,
        isConnected: true,
        isLoading: false,
        isOnline: navigator.onLine,
        error: error instanceof Error ? error.message : 'Google Sheet import failed.',
      }));
      throw error;
    }
  };

  const importLocalDataToFirebase = async () => {
    requireDatabaseAccess();
    const readLocal = <T,>(key: string): T[] => {
      try {
        const parsed: unknown = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(parsed) ? parsed as T[] : [];
      } catch {
        return [];
      }
    };
    const localStudents = mergeById(students, readLocal<Student>('infra_polytechnic_students_v1').filter((student) => !isLegacyMockStudent(student)));
    const localCallLogs = mergeById(callLogs, readLocal<GuardianCallLog>('infra_polytechnic_call_logs_v1').filter((log) => !isLegacyMockAttendance(log)));
    const localSubjects = mergeById(subjects, readLocal<SubjectItem>('infra_polytechnic_subjects_v1'));
    const writes = [
      saveDocuments('students', localStudents),
      saveDocuments('guardianCallLogs', localCallLogs),
      saveDocuments('subjects', localSubjects),
    ];
    if (!navigator.onLine) {
      writes.forEach(enqueueWrite);
      setStudents(localStudents);
      setCallLogs(localCallLogs);
      setSubjects(localSubjects);
      return;
    }
    await Promise.all(writes);
    localStorage.removeItem('infra_polytechnic_students_v1');
    localStorage.removeItem('infra_polytechnic_call_logs_v1');
    localStorage.removeItem('infra_polytechnic_subjects_v1');
    await loadDatabase(user!);
  };

  const requireDatabaseAccess = () => {
    if (!user) throw new Error('Sign in to Firebase before changing institute data.');
    if (!databaseStatus.isConnected) throw new Error(databaseStatus.error || 'Firebase is not connected.');
  };

  // Student CRUD: Add
  const addStudent = async (studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<Student> => {
    requireDatabaseAccess();
    const now = new Date().toISOString();
    const newStudent: Student = {
      ...studentData,
      id: `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    };

    enqueueWrite(saveDocument('students', newStudent));
    setStudents((current) => [newStudent, ...current]);

    return newStudent;
  };

  // Student CRUD: Update
  const updateStudent = async (student: Student): Promise<void> => {
    requireDatabaseAccess();
    const now = new Date().toISOString();
    const updatedStudent: Student = {
      ...student,
      updatedAt: now,
    };

    enqueueWrite(saveDocument('students', updatedStudent));
    setStudents((current) => current.map((item) => item.id === student.id ? updatedStudent : item));
  };

  // Student CRUD: Delete (Destructive action - requires caller to show confirmation dialog)
  const deleteStudent = async (studentId: string): Promise<void> => {
    requireDatabaseAccess();
    enqueueWrite(removeDocument('students', studentId));
    const updatedList = students.filter((s) => s.id !== studentId);
    setStudents(updatedList);
  };

  const deleteStudents = async (studentIds: string[]): Promise<void> => {
    requireDatabaseAccess();
    const uniqueIds = [...new Set(studentIds)];
    if (uniqueIds.length === 0) return;
    enqueueWrite(removeDocuments('students', uniqueIds));
    const idsToDelete = new Set(uniqueIds);
    setStudents((current) => current.filter((student) => !idsToDelete.has(student.id)));
  };

  // Student CRUD: Bulk Import
  const bulkImportStudents = async (
    newStudents: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>[]
  ): Promise<number> => {
    requireDatabaseAccess();
    const now = new Date().toISOString();
    const formatted: Student[] = newStudents.map((s, idx) => ({
      ...s,
      id: `std_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    }));

    enqueueWrite(saveDocuments('students', formatted));
    const combined = [...formatted, ...students];
    setStudents(combined);

    return formatted.length;
  };

  const bulkUpdateStudents = async (updatedStudents: Student[]): Promise<void> => {
    if (updatedStudents.length === 0) return;
    requireDatabaseAccess();

    const now = new Date().toISOString();
    const updated = updatedStudents.map((student) => ({ ...student, updatedAt: now }));
    await saveDocuments('students', updated);
    const updatesById = new Map(updated.map((student) => [student.id, student]));
    setStudents((current) => current.map((student) => updatesById.get(student.id) || student));
  };

  const saveAttendanceBatch = async (records: AttendanceRecord[]): Promise<void> => {
    requireDatabaseAccess();
    const normalizedRecords = records.map(normalizeAttendanceRecord);
    enqueueWrite(saveAttendanceRecords(normalizedRecords));
    setAttendanceRecords((current) => mergeAttendanceRecords(current, normalizedRecords));
  };

  const clearAttendanceRange = async (startMonth: string, endMonth: string, department: Department | 'all' = 'all'): Promise<number> => {
    requireDatabaseAccess();
    const fromMonth = startMonth <= endMonth ? startMonth : endMonth;
    const toMonth = startMonth <= endMonth ? endMonth : startMonth;

    const matching = attendanceRecords.filter((record) => {
      const recordMonth = record.date.substring(0, 7);
      const matchesMonth = recordMonth >= fromMonth && recordMonth <= toMonth;
      const matchesDepartment = department === 'all' || record.department === department;
      return matchesMonth && matchesDepartment;
    });

    if (matching.length === 0) return 0;

    const sessionIds = Array.from(new Set(matching.map((record) => record.sessionId || getAttendanceSessionId(record))));
    enqueueWrite(deleteAttendanceSessionDocuments(sessionIds, matching));
    const remaining = attendanceRecords.filter((record) => {
      const recordMonth = record.date.substring(0, 7);
      const matchesMonth = recordMonth >= fromMonth && recordMonth <= toMonth;
      const matchesDepartment = department === 'all' || record.department === department;
      return !(matchesMonth && matchesDepartment);
    });

    setAttendanceRecords(remaining);
    return matching.length;
  };

  const deleteAttendanceSessions = async (
    dates: string[],
    department: Department,
    semester: Semester,
    section: Section,
    subject: string
  ): Promise<number> => {
    requireDatabaseAccess();
    const selectedDates = new Set(dates);
    const matching = attendanceRecords.filter((record) =>
      selectedDates.has(record.date) &&
      record.department === department &&
      record.semester === semester &&
      record.section === section &&
      record.subject === subject
    );

    if (matching.length === 0) return 0;

    const sessionIds = Array.from(new Set(matching.map((record) => record.sessionId || getAttendanceSessionId(record))));
    enqueueWrite(deleteAttendanceSessionDocuments(sessionIds, matching));
    setAttendanceRecords(attendanceRecords.filter((record) => !sessionIds.includes(record.sessionId || getAttendanceSessionId(record))));
    return matching.length;
  };

  // Log Guardian Call
  const addCallLog = async (logData: Omit<GuardianCallLog, 'id' | 'callTime'>): Promise<void> => {
    requireDatabaseAccess();
    const newLog: GuardianCallLog = {
      ...logData,
      id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      callTime: new Date().toLocaleString(),
    };

    enqueueWrite(saveDocument('guardianCallLogs', newLog));
    setCallLogs((current) => [newLog, ...current]);
  };

  // Subject Management: Add
  const addDepartment = async (name: string): Promise<string> => {
    requireDatabaseAccess();
    const cleanName = name.trim();
    if (!cleanName) throw new Error('Department name is required.');
    if (departments.some((department) => department.trim().toLowerCase() === cleanName.toLowerCase())) {
      throw new Error('This department already exists.');
    }
    const departmentDocument = {
      id: `dept_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: cleanName,
    };
    enqueueWrite(saveDocument('departments', departmentDocument));
    setDepartmentDocuments((current) => [...current, departmentDocument]);
    setDepartments((current) => [...current, cleanName]);
    return cleanName;
  };

  const updateDepartment = async (currentName: string, name: string): Promise<string> => {
    requireDatabaseAccess();
    const cleanName = name.trim();
    if (!cleanName) throw new Error('Department name is required.');
    if (departments.some((department) => department !== currentName && department.trim().toLowerCase() === cleanName.toLowerCase())) {
      throw new Error('This department already exists.');
    }
    const departmentDocument = departmentDocuments.find((department) => department.name === currentName);
    if (!departmentDocument) throw new Error('Department not found. Refresh the database and try again.');
    const updatedDocument = { ...departmentDocument, name: cleanName };
    const updatedStudents = students.map((student) => student.department === currentName ? { ...student, department: cleanName } : student);
    const updatedAttendance = attendanceRecords.map((record) => record.department === currentName ? { ...record, department: cleanName } : record);
    const updatedSubjects = subjects.map((subject) => subject.department === currentName ? { ...subject, department: cleanName } : subject);
    const writes = [
      saveDocument('departments', updatedDocument),
      saveDocuments('students', updatedStudents.filter((student, index) => students[index].department === currentName)),
      saveAttendanceSessionMetadata(updatedAttendance.filter((record, index) => attendanceRecords[index].department === currentName)),
      saveDocuments('subjects', updatedSubjects.filter((subject, index) => subjects[index].department === currentName)),
    ];
    writes.forEach(enqueueWrite);
    setDepartments((current) => current.map((department) => department === currentName ? cleanName : department));
    setDepartmentDocuments((current) => current.map((department) => department.id === departmentDocument.id ? updatedDocument : department));
    setStudents(updatedStudents);
    setAttendanceRecords(updatedAttendance);
    setSubjects(updatedSubjects);
    return cleanName;
  };

  const deleteDepartment = async (name: string): Promise<void> => {
    requireDatabaseAccess();
    const departmentDocument = departmentDocuments.find((department) => department.name === name);
    if (!departmentDocument) throw new Error('Department not found. Refresh the database and try again.');
    enqueueWrite(removeDocument('departments', departmentDocument.id));
    setDepartmentDocuments((current) => current.filter((department) => department.id !== departmentDocument.id));
    setDepartments((current) => current.filter((department) => department !== name));
  };

  const addSubject = async (
    code: string,
    name: string,
    department: Department,
    semester: Semester
  ): Promise<SubjectItem> => {
    requireDatabaseAccess();
    const newSub: SubjectItem = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      code: code.trim(),
      name: name.trim(),
      department,
      semester,
    };
    enqueueWrite(saveDocument('subjects', newSub));
    setSubjects((current) => [...current, newSub]);

    return newSub;
  };

  // Subject Management: Update
  const updateSubject = async (updatedSubject: SubjectItem): Promise<void> => {
    requireDatabaseAccess();
    const updatedList = subjects.map((s) =>
      s.id === updatedSubject.id
        ? {
            ...updatedSubject,
            code: updatedSubject.code.trim(),
            name: updatedSubject.name.trim(),
          }
        : s
    );
    enqueueWrite(saveDocument('subjects', updatedList.find((item) => item.id === updatedSubject.id)!));
    setSubjects(updatedList);
  };

  // Subject Management: Delete
  const deleteSubject = async (subjectId: string): Promise<void> => {
    requireDatabaseAccess();
    enqueueWrite(removeDocument('subjects', subjectId));
    const updatedList = subjects.filter((s) => s.id !== subjectId);
    setSubjects(updatedList);
  };

  // Subject Management: Seed preset BTEB subjects
  const seedPresetSubjects = async (): Promise<void> => {
    requireDatabaseAccess();
    const combined = [...subjects];
    BTEB_PRESET_SUBJECTS.filter((preset) => departments.includes(preset.department)).forEach((preset) => {
      const exists = combined.some(
        (s) =>
          s.code === preset.code &&
          s.department === preset.department &&
          s.semester === preset.semester
      );
      if (!exists) {
        combined.push(preset);
      }
    });
    enqueueWrite(saveDocuments('subjects', combined));
    setSubjects(combined);
  };

  // Subject Management: Clear all subjects
  const clearAllSubjects = async (): Promise<void> => {
    requireDatabaseAccess();
    enqueueWrite(removeDocuments('subjects', subjects.map((subject) => subject.id)));
    setSubjects([]);
  };

  return (
    <AppContext.Provider
      value={{
        students,
        attendanceRecords,
        callLogs,
        subjects,
        departments,
        filter,
        setFilter,
        addStudent,
        updateStudent,
        deleteStudent,
        deleteStudents,
        bulkImportStudents,
        bulkUpdateStudents,
        saveAttendanceBatch,
        clearAttendanceRange,
        deleteAttendanceSessions,
        addCallLog,
        addSubject,
        updateSubject,
        deleteSubject,
        addDepartment,
        updateDepartment,
        deleteDepartment,
        seedPresetSubjects,
        clearAllSubjects,
        user,
        databaseStatus,
        loginWithGoogle,
        logoutUser,
        refreshDatabase,
        importFromGoogleSheet,
        importLocalDataToFirebase,
        authorizedAdmins,
        addAdminEmail,
        removeAdminEmail,
        isAuthorizedAdmin,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
