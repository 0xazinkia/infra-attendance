export type Department = string;

export type Semester = 
  | '1st Semester'
  | '2nd Semester'
  | '3rd Semester'
  | '4th Semester'
  | '5th Semester'
  | '6th Semester'
  | '7th Semester'
  | '8th Semester';

export type Section = 'A' | 'B' | 'C';

export type AttendanceStatus = 'present' | 'absent';

export interface Student {
  id: string;
  roll: string; // Board Roll / Class Roll (e.g. 628401)
  name: string;
  department: Department;
  semester: Semester;
  section: Section;
  studentPhone: string;
  guardianName: string;
  guardianPhone: string;
  guardianRelation: 'Father' | 'Mother' | 'Brother' | 'Sister' | 'Uncle' | 'Guardian';
  address?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId?: string;
  date: string; // YYYY-MM-DD
  timeSlot?: string;
  department: Department;
  semester: Semester;
  subject: string;
  section: Section;
  studentId: string;
  roll: string;
  studentName: string;
  status: AttendanceStatus;
  guardianPhone?: string;
  remarks?: string;
  recordedBy?: string;
  recordedAt: string;
}

export interface AttendanceSession {
  id: string;
  date: string;
  timeSlot?: string;
  department: Department;
  semester: Semester;
  subject: string;
  section: Section;
}

export interface SubjectItem {
  id: string;
  code: string;
  name: string;
  department: Department;
  semester: Semester;
}

export interface GuardianCallLog {
  id: string;
  studentId: string;
  studentRoll?: string;
  roll?: string;
  studentName: string;
  guardianName: string;
  guardianPhone: string;
  callTime: string;
  callStatus?: 'Connected' | 'Not Answered' | 'Busy / Switched Off' | 'Wrong Number' | string;
  callPurpose?: 'Absentee Notice' | 'Academic Warning' | 'Board Form Fill-up' | 'General Query' | string;
  conversationNote?: string;
  recordedBy?: string;
  reason?: string;
  status?: string;
  note?: string;
}

export interface DatabaseStatus {
  isConnected: boolean;
  isLoading: boolean;
  isOnline: boolean;
  pendingWrites: number;
  error: string | null;
}
