import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  Student,
  AttendanceRecord,
  GuardianCallLog,
  SubjectItem,
  Department,
  Semester,
  Section,
  SheetSyncStatus,
} from '../types';
import {
  DEPARTMENTS,
  SEMESTERS,
  SECTIONS,
  DEFAULT_SUBJECTS,
  INITIAL_STUDENTS,
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
  createInstituteSpreadsheet,
  findExistingSpreadsheet,
  verifySpreadsheet,
  fetchStudentsFromSheet,
  saveAllStudentsToSheet,
  appendStudentToSheet,
  fetchAttendanceFromSheet,
  appendAttendanceRecordsToSheet,
  appendCallLogToSheet,
  fetchSubjectsFromSheet,
  saveAllSubjectsToSheet,
  appendSubjectToSheet,
} from '../services/sheetsService';

interface AttendanceFilter {
  department: Department;
  semester: Semester;
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
  
  // Filter for Attendance & Rosters
  filter: AttendanceFilter;
  setFilter: React.Dispatch<React.SetStateAction<AttendanceFilter>>;
  
  // CRUD Operations on Students
  addStudent: (student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Student>;
  updateStudent: (student: Student) => Promise<void>;
  deleteStudent: (studentId: string) => Promise<void>;
  bulkImportStudents: (newStudents: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<number>;
  
  // Attendance & Calling
  saveAttendanceBatch: (records: AttendanceRecord[]) => Promise<void>;
  addCallLog: (log: Omit<GuardianCallLog, 'id' | 'callTime'>) => Promise<void>;
  
  // Subject Management
  addSubject: (code: string, name: string, department: Department, semester: Semester) => Promise<SubjectItem>;
  updateSubject: (subject: SubjectItem) => Promise<void>;
  deleteSubject: (subjectId: string) => Promise<void>;
  seedPresetSubjects: () => Promise<void>;
  clearAllSubjects: () => Promise<void>;
  
  // Auth & Google Sheets Sync
  user: User | null;
  sheetStatus: SheetSyncStatus;
  loginWithGoogle: () => Promise<void>;
  logoutUser: () => Promise<void>;
  syncWithSheets: () => Promise<void>;
  setupNewSpreadsheet: () => Promise<void>;
  linkExistingSpreadsheet: (idOrUrl: string) => Promise<void>;
  clearSheetConnection: () => void;

  // Admin Email Whitelist Management
  authorizedAdmins: string[];
  addAdminEmail: (email: string) => { success: boolean; message: string };
  removeAdminEmail: (email: string) => { success: boolean; message: string };
  isAuthorizedAdmin: (email?: string | null) => boolean;
}

const AppContext = createContext<AppContextType | null>(null);

const DEFAULT_ADMIN_EMAILS = ['0xayub.me@gmail.com'];

const STORAGE_KEYS = {
  STUDENTS: 'infra_polytechnic_students_v1',
  ATTENDANCE: 'infra_polytechnic_attendance_v1',
  CALL_LOGS: 'infra_polytechnic_call_logs_v1',
  SUBJECTS: 'infra_polytechnic_subjects_v1',
  SHEET_ID: 'infra_polytechnic_sheet_id',
  SHEET_NAME: 'infra_polytechnic_sheet_name',
  LAST_SYNC: 'infra_polytechnic_last_sync',
  AUTHORIZED_ADMINS: 'infra_polytechnic_authorized_admins_v1',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Students state (cleaned of mock data)
  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter out legacy mock students if stored in browser
          const clean = parsed.filter(
            (s: Student) => !s.id?.startsWith('std_cst_') && s.name !== 'Tanvir Ahmed Shanto'
          );
          return clean;
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  // Attendance records state
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((r: AttendanceRecord) => !r.studentId?.startsWith('std_cst_'));
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  // Guardian call logs state
  const [callLogs, setCallLogs] = useState<GuardianCallLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CALL_LOGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((l: GuardianCallLog) => !l.studentId?.startsWith('std_cst_'));
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  // Subjects state (cleaned of hardcoded mock dummy subjects)
  const [subjects, setSubjects] = useState<SubjectItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const nonMock = parsed.filter(
            (s: SubjectItem) =>
              !['cst-401', 'cst-402', 'cst-403', 'cst-404', 'cst-405', 'cst-601', 'cst-602', 'cst-603', 'ct-401', 'ct-402', 'ct-403', 'et-401', 'et-402', 'et-403', 'mt-401', 'mt-402', 'mt-403'].includes(s.id)
          );
          return nonMock;
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  // Current session filter
  const todayDate = new Date().toISOString().split('T')[0];
  const [filter, setFilter] = useState<AttendanceFilter>({
    department: 'Computer Technology',
    semester: '4th Semester',
    section: 'A',
    subject: 'Object Oriented Programming (Java/Python)',
    date: todayDate,
    timeSlot: '09:00 AM - 09:45 AM',
  });

  // Auth & Google Sheets State
  const [user, setUser] = useState<User | null>(null);
  const [authorizedAdmins, setAuthorizedAdmins] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUTHORIZED_ADMINS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((e: string) => e.trim().toLowerCase());
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_ADMIN_EMAILS;
  });

  const [sheetStatus, setSheetStatus] = useState<SheetSyncStatus>({
    isConnected: false,
    spreadsheetId: localStorage.getItem(STORAGE_KEYS.SHEET_ID),
    spreadsheetName: localStorage.getItem(STORAGE_KEYS.SHEET_NAME) || 'Infra Polytechnic Institute Roster',
    spreadsheetUrl: localStorage.getItem(STORAGE_KEYS.SHEET_ID)
      ? `https://docs.google.com/spreadsheets/d/${localStorage.getItem(STORAGE_KEYS.SHEET_ID)}/edit`
      : null,
    lastSyncedAt: localStorage.getItem(STORAGE_KEYS.LAST_SYNC),
    isSyncing: false,
    error: null,
  });

  // Save authorized admins to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.AUTHORIZED_ADMINS, JSON.stringify(authorizedAdmins));
    } catch (e) {
      console.warn('Could not save authorized admin emails:', e);
    }
  }, [authorizedAdmins]);

  // Admin Email Management Functions
  const isAuthorizedAdmin = useCallback((email?: string | null): boolean => {
    if (!email) return false;
    const clean = email.trim().toLowerCase();
    return authorizedAdmins.some((a) => a.toLowerCase() === clean);
  }, [authorizedAdmins]);

  const addAdminEmail = useCallback((email: string): { success: boolean; message: string } => {
    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes('@') || !clean.includes('.')) {
      return { success: false, message: 'Please enter a valid email address.' };
    }
    if (authorizedAdmins.some((a) => a.toLowerCase() === clean)) {
      return { success: false, message: 'This email is already an authorized administrator.' };
    }
    setAuthorizedAdmins((prev) => [...prev, clean]);
    return { success: true, message: `"${clean}" has been added as an authorized administrator.` };
  }, [authorizedAdmins]);

  const removeAdminEmail = useCallback((email: string): { success: boolean; message: string } => {
    const clean = email.trim().toLowerCase();
    if (authorizedAdmins.length <= 1) {
      return { success: false, message: 'Cannot remove the last remaining admin. At least one admin email is required.' };
    }
    setAuthorizedAdmins((prev) => prev.filter((a) => a.toLowerCase() !== clean));
    return { success: true, message: `"${clean}" has been removed from authorized administrators.` };
  }, [authorizedAdmins]);

  // Persist locally
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    } catch (e) {
      console.warn('Could not save students locally:', e);
    }
  }, [students]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendanceRecords));
    } catch (e) {
      console.warn('Could not save attendance locally:', e);
    }
  }, [attendanceRecords]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CALL_LOGS, JSON.stringify(callLogs));
    } catch (e) {
      console.warn('Could not save call logs locally:', e);
    }
  }, [callLogs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
    } catch (e) {
      console.warn('Could not save subjects locally:', e);
    }
  }, [subjects]);

  // Auth initialization
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        setSheetStatus((prev) => ({ ...prev, isConnected: true }));
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setSheetStatus((prev) => ({ ...prev, isConnected: false }));
      }
    );

    return () => unsubscribe();
  }, []);

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
    }
  }, [filter.department, filter.semester, subjects, filter.subject]);

  // Google Sign In
  const loginWithGoogle = async () => {
    setSheetStatus((prev) => ({ ...prev, isSyncing: true, error: null }));
    try {
      const result = await googleSignIn();
      if (result) {
        const userEmail = result.user.email?.toLowerCase().trim();
        const isAllowed = userEmail && authorizedAdmins.some((a) => a.toLowerCase().trim() === userEmail);
        
        if (!isAllowed) {
          await authLogout();
          setUser(null);
          setAccessToken(null);
          setSheetStatus((prev) => ({ ...prev, isConnected: false, isSyncing: false, error: 'Unauthorized email' }));
          sessionStorage.removeItem('ipi_admin_session');
          throw new Error(
            `Access Denied: The Google account "${userEmail || 'Unknown'}" is not authorized as an administrator. Authorized account: ${authorizedAdmins.join(', ')}`
          );
        }

        setUser(result.user);
        setSheetStatus((prev) => ({ ...prev, isConnected: true }));
        
        // Check if there is an existing spreadsheet in Drive or localStorage
        let sheetId = localStorage.getItem(STORAGE_KEYS.SHEET_ID);
        let sheetName = localStorage.getItem(STORAGE_KEYS.SHEET_NAME);

        if (!sheetId && result.accessToken) {
          try {
            const found = await findExistingSpreadsheet(result.accessToken);
            if (found) {
              sheetId = found.id;
              sheetName = found.name;
            }
          } catch {
            // Sheets scope not yet authorized; user can connect later
          }
        }

        if (sheetId) {
          localStorage.setItem(STORAGE_KEYS.SHEET_ID, sheetId);
          if (sheetName) localStorage.setItem(STORAGE_KEYS.SHEET_NAME, sheetName);
          
          setSheetStatus((prev) => ({
            ...prev,
            spreadsheetId: sheetId,
            spreadsheetName: sheetName || 'Infra Polytechnic Institute Roster',
            spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
          }));

          // Trigger sync if token exists
          if (result.accessToken) {
            try {
              await pullDataFromSheets(sheetId, result.accessToken);
            } catch {
              // Ignore initial sync failure if sheets permission not yet granted
            }
          }
        }
      }
    } catch (err: unknown) {
      const errObj = err as { code?: string; message?: string };
      if (
        errObj?.code === 'auth/popup-closed-by-user' || 
        errObj?.code === 'auth/cancelled-popup-request' ||
        errObj?.message?.includes('popup-closed-by-user')
      ) {
        setSheetStatus((prev) => ({ ...prev, isSyncing: false, error: null }));
        return;
      }
      const message = err instanceof Error ? err.message : 'Login failed';
      setSheetStatus((prev) => ({ ...prev, error: message }));
      throw err;
    } finally {
      setSheetStatus((prev) => ({ ...prev, isSyncing: false }));
    }
  };

  const logoutUser = async () => {
    await authLogout();
    setUser(null);
    setSheetStatus((prev) => ({ ...prev, isConnected: false }));
  };

  // Pull data from Google Sheets into state
  const pullDataFromSheets = async (sheetId: string, token: string) => {
    try {
      await verifySpreadsheet(sheetId, token);
      const sheetStudents = await fetchStudentsFromSheet(sheetId, token);
      const sheetAttendance = await fetchAttendanceFromSheet(sheetId, token);
      const sheetSubjects = await fetchSubjectsFromSheet(sheetId, token);

      if (sheetStudents.length > 0) {
        setStudents(sheetStudents);
      } else if (students.length > 0) {
        await saveAllStudentsToSheet(sheetId, students, token);
      }

      if (sheetAttendance.length > 0) {
        setAttendanceRecords(sheetAttendance);
      }

      if (sheetSubjects.length > 0) {
        setSubjects(sheetSubjects);
      } else if (subjects.length > 0) {
        await saveAllSubjectsToSheet(sheetId, subjects, token);
      }

      const now = new Date().toLocaleString();
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, now);
      setSheetStatus((prev) => ({
        ...prev,
        lastSyncedAt: now,
        error: null,
      }));
    } catch (err: unknown) {
      console.error('Failed to pull from Google Sheets:', err);
      const message = err instanceof Error ? err.message : 'Error syncing sheet';
      setSheetStatus((prev) => ({ ...prev, error: message }));
    }
  };

  // Create brand new Google Sheet
  const setupNewSpreadsheet = async () => {
    let token = await getAccessToken();
    if (!token) {
      token = await authorizeGoogleSheets();
    }
    if (!token) {
      throw new Error('Google Sheets authorization required to create spreadsheet in Drive.');
    }

    setSheetStatus((prev) => ({ ...prev, isSyncing: true, error: null }));
    try {
      const created = await createInstituteSpreadsheet(token);
      localStorage.setItem(STORAGE_KEYS.SHEET_ID, created.id);
      localStorage.setItem(STORAGE_KEYS.SHEET_NAME, created.name);

      setSheetStatus((prev) => ({
        ...prev,
        spreadsheetId: created.id,
        spreadsheetName: created.name,
        spreadsheetUrl: created.url,
      }));

      // Seed newly created sheet with current students and subjects
      if (students.length > 0) {
        await saveAllStudentsToSheet(created.id, students, token);
      }
      if (subjects.length > 0) {
        await saveAllSubjectsToSheet(created.id, subjects, token);
      }

      const now = new Date().toLocaleString();
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, now);
      setSheetStatus((prev) => ({ ...prev, lastSyncedAt: now, error: null }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create spreadsheet';
      setSheetStatus((prev) => ({ ...prev, error: message }));
      throw err;
    } finally {
      setSheetStatus((prev) => ({ ...prev, isSyncing: false }));
    }
  };

  // Link existing Google Sheet by ID or URL
  const linkExistingSpreadsheet = async (idOrUrl: string) => {
    let token = await getAccessToken();
    if (!token) {
      token = await authorizeGoogleSheets();
    }
    if (!token) {
      throw new Error('Google Sheets authorization required to link spreadsheet.');
    }

    let sheetId = idOrUrl.trim();
    // Extract ID from full URL if provided
    const match = idOrUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      sheetId = match[1];
    }

    if (!sheetId) {
      throw new Error('Invalid Google Sheet ID or URL.');
    }

    setSheetStatus((prev) => ({ ...prev, isSyncing: true, error: null }));
    try {
      const info = await verifySpreadsheet(sheetId, token);
      localStorage.setItem(STORAGE_KEYS.SHEET_ID, sheetId);
      localStorage.setItem(STORAGE_KEYS.SHEET_NAME, info.name);

      setSheetStatus((prev) => ({
        ...prev,
        spreadsheetId: sheetId,
        spreadsheetName: info.name,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
      }));

      await pullDataFromSheets(sheetId, token);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to link spreadsheet';
      setSheetStatus((prev) => ({ ...prev, error: message }));
      throw err;
    } finally {
      setSheetStatus((prev) => ({ ...prev, isSyncing: false }));
    }
  };

  const clearSheetConnection = () => {
    localStorage.removeItem(STORAGE_KEYS.SHEET_ID);
    localStorage.removeItem(STORAGE_KEYS.SHEET_NAME);
    localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
    setSheetStatus((prev) => ({
      ...prev,
      spreadsheetId: null,
      spreadsheetName: null,
      spreadsheetUrl: null,
      lastSyncedAt: null,
      error: null,
    }));
  };

  // Manual Sync trigger
  const syncWithSheets = async () => {
    let token = await getAccessToken();
    if (!token) {
      token = await authorizeGoogleSheets();
      if (!token) return;
    }

    if (!sheetStatus.spreadsheetId) {
      await setupNewSpreadsheet();
      return;
    }

    setSheetStatus((prev) => ({ ...prev, isSyncing: true, error: null }));
    try {
      await pullDataFromSheets(sheetStatus.spreadsheetId, token);
    } finally {
      setSheetStatus((prev) => ({ ...prev, isSyncing: false }));
    }
  };

  // Student CRUD: Add
  const addStudent = async (studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<Student> => {
    const now = new Date().toISOString();
    const newStudent: Student = {
      ...studentData,
      id: `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    };

    const updatedList = [newStudent, ...students];
    setStudents(updatedList);

    // If Google Sheet is connected, append or push
    const token = await getAccessToken();
    if (token && sheetStatus.spreadsheetId) {
      try {
        await appendStudentToSheet(sheetStatus.spreadsheetId, newStudent, token);
        const nowStr = new Date().toLocaleString();
        localStorage.setItem(STORAGE_KEYS.LAST_SYNC, nowStr);
        setSheetStatus((prev) => ({ ...prev, lastSyncedAt: nowStr }));
      } catch (err) {
        console.warn('Could not append student to Google Sheet:', err);
      }
    }

    return newStudent;
  };

  // Student CRUD: Update
  const updateStudent = async (student: Student): Promise<void> => {
    const now = new Date().toISOString();
    const updatedStudent: Student = {
      ...student,
      updatedAt: now,
    };

    const updatedList = students.map((s) => (s.id === student.id ? updatedStudent : s));
    setStudents(updatedList);

    // Sync full list to Google Sheet if connected
    const token = await getAccessToken();
    if (token && sheetStatus.spreadsheetId) {
      try {
        await saveAllStudentsToSheet(sheetStatus.spreadsheetId, updatedList, token);
        const nowStr = new Date().toLocaleString();
        localStorage.setItem(STORAGE_KEYS.LAST_SYNC, nowStr);
        setSheetStatus((prev) => ({ ...prev, lastSyncedAt: nowStr }));
      } catch (err) {
        console.warn('Failed to update student in Google Sheet:', err);
      }
    }
  };

  // Student CRUD: Delete (Destructive action - requires caller to show confirmation dialog)
  const deleteStudent = async (studentId: string): Promise<void> => {
    const updatedList = students.filter((s) => s.id !== studentId);
    setStudents(updatedList);

    // Sync updated list to Google Sheets
    const token = await getAccessToken();
    if (token && sheetStatus.spreadsheetId) {
      try {
        await saveAllStudentsToSheet(sheetStatus.spreadsheetId, updatedList, token);
        const nowStr = new Date().toLocaleString();
        localStorage.setItem(STORAGE_KEYS.LAST_SYNC, nowStr);
        setSheetStatus((prev) => ({ ...prev, lastSyncedAt: nowStr }));
      } catch (err) {
        console.warn('Failed to delete student from Google Sheet:', err);
      }
    }
  };

  // Student CRUD: Bulk Import
  const bulkImportStudents = async (
    newStudents: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>[]
  ): Promise<number> => {
    const now = new Date().toISOString();
    const formatted: Student[] = newStudents.map((s, idx) => ({
      ...s,
      id: `std_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    }));

    const combined = [...formatted, ...students];
    setStudents(combined);

    // Sync to Google Sheet
    const token = await getAccessToken();
    if (token && sheetStatus.spreadsheetId) {
      try {
        await saveAllStudentsToSheet(sheetStatus.spreadsheetId, combined, token);
        const nowStr = new Date().toLocaleString();
        localStorage.setItem(STORAGE_KEYS.LAST_SYNC, nowStr);
        setSheetStatus((prev) => ({ ...prev, lastSyncedAt: nowStr }));
      } catch (err) {
        console.warn('Failed to bulk sync to Google Sheet:', err);
      }
    }

    return formatted.length;
  };

  // Save Attendance Batch to state and Google Sheets
  const saveAttendanceBatch = async (records: AttendanceRecord[]): Promise<void> => {
    // Merge or replace records for the same student on the same date + subject
    const existingFiltered = attendanceRecords.filter((r) => {
      const match = records.some(
        (newR) =>
          newR.studentId === r.studentId &&
          newR.date === r.date &&
          newR.subject === r.subject
      );
      return !match;
    });

    const updatedRecords = [...records, ...existingFiltered];
    setAttendanceRecords(updatedRecords);

    // Sync to Google Sheets
    const token = await getAccessToken();
    if (token && sheetStatus.spreadsheetId) {
      try {
        await appendAttendanceRecordsToSheet(sheetStatus.spreadsheetId, records, token);
        const nowStr = new Date().toLocaleString();
        localStorage.setItem(STORAGE_KEYS.LAST_SYNC, nowStr);
        setSheetStatus((prev) => ({ ...prev, lastSyncedAt: nowStr }));
      } catch (err) {
        console.error('Failed to append attendance to Google Sheet:', err);
        throw err;
      }
    }
  };

  // Log Guardian Call
  const addCallLog = async (logData: Omit<GuardianCallLog, 'id' | 'callTime'>): Promise<void> => {
    const newLog: GuardianCallLog = {
      ...logData,
      id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      callTime: new Date().toLocaleString(),
    };

    setCallLogs((prev) => [newLog, ...prev]);

    // Sync to Google Sheets
    const token = await getAccessToken();
    if (token && sheetStatus.spreadsheetId) {
      try {
        await appendCallLogToSheet(sheetStatus.spreadsheetId, newLog, token);
      } catch (err) {
        console.warn('Could not sync call log to Google Sheet:', err);
      }
    }
  };

  // Subject Management: Add
  const addSubject = async (
    code: string,
    name: string,
    department: Department,
    semester: Semester
  ): Promise<SubjectItem> => {
    const newSub: SubjectItem = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      code: code.trim(),
      name: name.trim(),
      department,
      semester,
    };
    const updated = [...subjects, newSub];
    setSubjects(updated);

    // Sync to Google Sheets if connected
    const token = await getAccessToken();
    if (token && sheetStatus.spreadsheetId) {
      try {
        await appendSubjectToSheet(sheetStatus.spreadsheetId, newSub, token);
      } catch (err) {
        console.warn('Could not sync new subject to Google Sheet:', err);
      }
    }

    return newSub;
  };

  // Subject Management: Update
  const updateSubject = async (updatedSubject: SubjectItem): Promise<void> => {
    const updatedList = subjects.map((s) =>
      s.id === updatedSubject.id
        ? {
            ...updatedSubject,
            code: updatedSubject.code.trim(),
            name: updatedSubject.name.trim(),
          }
        : s
    );
    setSubjects(updatedList);

    const token = await getAccessToken();
    if (token && sheetStatus.spreadsheetId) {
      try {
        await saveAllSubjectsToSheet(sheetStatus.spreadsheetId, updatedList, token);
      } catch (err) {
        console.warn('Could not update subject in Google Sheet:', err);
      }
    }
  };

  // Subject Management: Delete
  const deleteSubject = async (subjectId: string): Promise<void> => {
    const updatedList = subjects.filter((s) => s.id !== subjectId);
    setSubjects(updatedList);

    const token = await getAccessToken();
    if (token && sheetStatus.spreadsheetId) {
      try {
        await saveAllSubjectsToSheet(sheetStatus.spreadsheetId, updatedList, token);
      } catch (err) {
        console.warn('Could not delete subject in Google Sheet:', err);
      }
    }
  };

  // Subject Management: Seed preset BTEB subjects
  const seedPresetSubjects = async (): Promise<void> => {
    const combined = [...subjects];
    BTEB_PRESET_SUBJECTS.forEach((preset) => {
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
    setSubjects(combined);

    const token = await getAccessToken();
    if (token && sheetStatus.spreadsheetId) {
      try {
        await saveAllSubjectsToSheet(sheetStatus.spreadsheetId, combined, token);
      } catch (err) {
        console.warn('Could not sync seeded subjects to Google Sheet:', err);
      }
    }
  };

  // Subject Management: Clear all subjects
  const clearAllSubjects = async (): Promise<void> => {
    setSubjects([]);

    const token = await getAccessToken();
    if (token && sheetStatus.spreadsheetId) {
      try {
        await saveAllSubjectsToSheet(sheetStatus.spreadsheetId, [], token);
      } catch (err) {
        console.warn('Could not clear subjects in Google Sheet:', err);
      }
    }
  };

  return (
    <AppContext.Provider
      value={{
        students,
        attendanceRecords,
        callLogs,
        subjects,
        filter,
        setFilter,
        addStudent,
        updateStudent,
        deleteStudent,
        bulkImportStudents,
        saveAttendanceBatch,
        addCallLog,
        addSubject,
        updateSubject,
        deleteSubject,
        seedPresetSubjects,
        clearAllSubjects,
        user,
        sheetStatus,
        loginWithGoogle,
        logoutUser,
        syncWithSheets,
        setupNewSpreadsheet,
        linkExistingSpreadsheet,
        clearSheetConnection,
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
