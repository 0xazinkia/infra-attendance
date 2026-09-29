import { Student, SubjectItem, Department, Semester, Section } from '../types';

export const DEPARTMENTS: Department[] = [
  'Computer Technology',
  'Civil Technology',
  'Electrical Technology',
  'Mechanical Technology',
  'Electronics Technology',
  'Automobile Technology',
  'Telecommunication Technology',
  'Architecture Technology',
];

export const SEMESTERS: Semester[] = [
  '1st Semester',
  '2nd Semester',
  '3rd Semester',
  '4th Semester',
  '5th Semester',
  '6th Semester',
  '7th Semester',
  '8th Semester',
];

export const SECTIONS: Section[] = ['A', 'B', 'C'];

// Clean default subjects list (starts empty as requested)
export const DEFAULT_SUBJECTS: SubjectItem[] = [];

// Clean initial students list (starts empty as requested)
export const INITIAL_STUDENTS: Student[] = [];

// Optional quick-starter BTEB subjects preset for one-click setup
export const BTEB_PRESET_SUBJECTS: SubjectItem[] = [
  // Computer Technology
  { id: 'bteb_cst_401', code: '66641', name: 'Object Oriented Programming (Java/Python)', department: 'Computer Technology', semester: '4th Semester' },
  { id: 'bteb_cst_402', code: '66642', name: 'Data Communication', department: 'Computer Technology', semester: '4th Semester' },
  { id: 'bteb_cst_403', code: '66643', name: 'Web Development & Design', department: 'Computer Technology', semester: '4th Semester' },
  { id: 'bteb_cst_404', code: '66644', name: 'Microprocessor & Interfacing', department: 'Computer Technology', semester: '4th Semester' },
  { id: 'bteb_cst_405', code: '66645', name: 'Database Management Systems', department: 'Computer Technology', semester: '4th Semester' },
  { id: 'bteb_cst_601', code: '66661', name: 'System Analysis and Design', department: 'Computer Technology', semester: '6th Semester' },
  { id: 'bteb_cst_602', code: '66662', name: 'Network Administration', department: 'Computer Technology', semester: '6th Semester' },
  { id: 'bteb_cst_603', code: '66663', name: 'Mobile Application Development', department: 'Computer Technology', semester: '6th Semester' },

  // Civil Technology
  { id: 'bteb_ct_401', code: '66441', name: 'Structural Mechanics', department: 'Civil Technology', semester: '4th Semester' },
  { id: 'bteb_ct_402', code: '66442', name: 'Surveying - II', department: 'Civil Technology', semester: '4th Semester' },
  { id: 'bteb_ct_403', code: '66443', name: 'Estimating & Costing - I', department: 'Civil Technology', semester: '4th Semester' },

  // Electrical Technology
  { id: 'bteb_et_401', code: '66741', name: 'Electrical Circuits - II', department: 'Electrical Technology', semester: '4th Semester' },
  { id: 'bteb_et_402', code: '66742', name: 'Electrical & Electronic Measurements', department: 'Electrical Technology', semester: '4th Semester' },
  { id: 'bteb_et_403', code: '66743', name: 'DC Machines', department: 'Electrical Technology', semester: '4th Semester' },

  // Mechanical Technology
  { id: 'bteb_mt_401', code: '67041', name: 'Mechanics of Structures', department: 'Mechanical Technology', semester: '4th Semester' },
  { id: 'bteb_mt_402', code: '67042', name: 'Foundry & Pattern Making', department: 'Mechanical Technology', semester: '4th Semester' },
  { id: 'bteb_mt_403', code: '67043', name: 'Thermodynamics', department: 'Mechanical Technology', semester: '4th Semester' },
];
