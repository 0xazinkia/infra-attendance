import { Student, AttendanceRecord, GuardianCallLog, SubjectItem } from '../types';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3/files';

export const DEFAULT_SPREADSHEET_TITLE = 'Infra Polytechnic Institute - Attendance & Students Roster';

const STUDENT_HEADERS = [
  'ID',
  'Roll No',
  'Student Name',
  'Department',
  'Semester',
  'Section',
  'Student Phone',
  'Guardian Name',
  'Guardian Phone',
  'Guardian Relation',
  'Remarks',
  'Created At',
  'Updated At',
];

const ATTENDANCE_HEADERS = [
  'Attendance ID',
  'Date',
  'Department',
  'Semester',
  'Subject',
  'Section',
  'Student ID',
  'Roll No',
  'Student Name',
  'Status',
  'Guardian Phone',
  'Recorded At',
  'Recorded By',
];

const CALL_LOG_HEADERS = [
  'Log ID',
  'Student ID',
  'Student Name',
  'Roll No',
  'Guardian Name',
  'Guardian Phone',
  'Call Time',
  'Reason',
  'Call Status',
  'Note',
];

const SUBJECT_HEADERS = [
  'Subject Code',
  'Subject Name',
  'Department',
  'Semester',
];

/**
 * Creates a brand new Google Spreadsheet for Infra Polytechnic Institute
 * with preconfigured sheets and styled headers.
 */
export async function createInstituteSpreadsheet(token: string): Promise<{
  id: string;
  name: string;
  url: string;
}> {
  const response = await fetch(SHEETS_API_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: DEFAULT_SPREADSHEET_TITLE,
      },
      sheets: [
        { properties: { title: 'Students', gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: 'Attendance', gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: 'GuardianCallLogs', gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: 'Subjects', gridProperties: { frozenRowCount: 1 } } },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create spreadsheet in Google Sheets: ${errorText}`);
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;

  // Add header rows to each sheet
  await batchWriteValues(
    spreadsheetId,
    [
      { range: 'Students!A1:M1', values: [STUDENT_HEADERS] },
      { range: 'Attendance!A1:M1', values: [ATTENDANCE_HEADERS] },
      { range: 'GuardianCallLogs!A1:J1', values: [CALL_LOG_HEADERS] },
      { range: 'Subjects!A1:D1', values: [SUBJECT_HEADERS] },
    ],
    token
  );

  return {
    id: spreadsheetId,
    name: data.properties.title,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  };
}

/**
 * Finds if the spreadsheet already exists in the user's Google Drive.
 */
export async function findExistingSpreadsheet(token: string): Promise<{ id: string; name: string } | null> {
  try {
    const query = `name = '${DEFAULT_SPREADSHEET_TITLE}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`;
    const response = await fetch(`${DRIVE_API_BASE}?q=${encodeURIComponent(query)}&fields=files(id,name)`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) return null;
    const data = await response.json();
    if (data.files && data.files.length > 0) {
      return {
        id: data.files[0].id,
        name: data.files[0].name,
      };
    }
  } catch (err) {
    console.warn('Error querying Google Drive for existing sheet:', err);
  }
  return null;
}

/**
 * Verifies spreadsheet accessibility and checks if required sheets exist.
 */
export async function verifySpreadsheet(spreadsheetId: string, token: string): Promise<{ name: string; sheets: string[] }> {
  const response = await fetch(`${SHEETS_API_BASE}/${spreadsheetId}?fields=properties.title,sheets.properties.title`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Unable to access spreadsheet (${response.status}): ${err}`);
  }

  const data = await response.json();
  const sheetTitles = (data.sheets || []).map((s: { properties: { title: string } }) => s.properties.title);

  // If missing Students or Attendance sheets, create them
  const missingSheets: string[] = [];
  if (!sheetTitles.includes('Students')) missingSheets.push('Students');
  if (!sheetTitles.includes('Attendance')) missingSheets.push('Attendance');
  if (!sheetTitles.includes('GuardianCallLogs')) missingSheets.push('GuardianCallLogs');

  if (missingSheets.length > 0) {
    const addSheetRequests = missingSheets.map((title) => ({
      addSheet: { properties: { title } },
    }));

    await fetch(`${SHEETS_API_BASE}/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests: addSheetRequests }),
    });

    // Populate headers for newly created sheets
    const updates = [];
    if (missingSheets.includes('Students')) updates.push({ range: 'Students!A1:O1', values: [STUDENT_HEADERS] });
    if (missingSheets.includes('Attendance')) updates.push({ range: 'Attendance!A1:N1', values: [ATTENDANCE_HEADERS] });
    if (missingSheets.includes('GuardianCallLogs')) updates.push({ range: 'GuardianCallLogs!A1:J1', values: [CALL_LOG_HEADERS] });

    if (updates.length > 0) {
      await batchWriteValues(spreadsheetId, updates, token);
    }
  }

  return {
    name: data.properties?.title || 'Spreadsheet',
    sheets: [...sheetTitles, ...missingSheets],
  };
}

/**
 * Fetch all students from the 'Students' sheet.
 */
export async function fetchStudentsFromSheet(spreadsheetId: string, token: string): Promise<Student[]> {
  const range = 'Students!A1:O';
  const response = await fetch(`${SHEETS_API_BASE}/${spreadsheetId}/values/${range}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch students from Google Sheet: ${response.statusText}`);
  }

  const data = await response.json();
  const rows: string[][] = data.values || [];
  if (rows.length === 0) return [];

  // Detect header row if present
  const firstRow = rows[0].map((c) => (c || '').toString().toLowerCase().trim());
  const isHeader =
    firstRow.some((c) => c.includes('roll') || c.includes('student') || c.includes('name'));
  const dataRows = isHeader ? rows.slice(1) : rows;

  let idIdx = 0;
  let rollIdx = 1;
  let nameIdx = 2;
  let deptIdx = 3;
  let semIdx = 4;
  let secIdx = 5;
  let phoneIdx = 6;
  let gNameIdx = 7;
  let gPhoneIdx = 8;
  let gRelIdx = 9;
  let remarksIdx = 10;
  let createdIdx = 11;
  let updatedIdx = 12;

  if (isHeader) {
    const findIdx = (keywords: string[]) =>
      firstRow.findIndex((col) => keywords.some((k) => col.includes(k)));

    const idFound = findIdx(['id']);
    if (idFound !== -1) idIdx = idFound;

    const rollFound = findIdx(['roll']);
    if (rollFound !== -1) rollIdx = rollFound;

    const nameFound = findIdx(['student name', 'name']);
    if (nameFound !== -1) nameIdx = nameFound;

    const deptFound = findIdx(['department', 'dept', 'technology']);
    if (deptFound !== -1) deptIdx = deptFound;

    const semFound = findIdx(['semester', 'sem']);
    if (semFound !== -1) semIdx = semFound;

    const secFound = findIdx(['section', 'sec']);
    if (secFound !== -1) secIdx = secFound;

    const gPhoneFound = findIdx(['guardian phone', 'guardian mobile', 'parent phone']);
    if (gPhoneFound !== -1) gPhoneIdx = gPhoneFound;

    const phoneFound = firstRow.findIndex(
      (col, i) =>
        i !== gPhoneFound &&
        (col.includes('student phone') || col.includes('mobile') || col.includes('phone'))
    );
    if (phoneFound !== -1) phoneIdx = phoneFound;

    const gNameFound = findIdx(['guardian name', 'parent name', 'guardian']);
    if (gNameFound !== -1) gNameIdx = gNameFound;

    const gRelFound = findIdx(['relation', 'relationship']);
    if (gRelFound !== -1) gRelIdx = gRelFound;

    const remFound = findIdx(['remark', 'note']);
    if (remFound !== -1) remarksIdx = remFound;

    const crFound = findIdx(['created']);
    if (crFound !== -1) createdIdx = crFound;

    const upFound = findIdx(['updated']);
    if (upFound !== -1) updatedIdx = upFound;
  }

  return dataRows
    .filter((row) => row.length > 0 && row[rollIdx])
    .map((row) => ({
      id: row[idIdx] || `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      roll: row[rollIdx] || '',
      name: row[nameIdx] || '',
      department: (row[deptIdx] as Student['department']) || '',
      semester: (row[semIdx] as Student['semester']) || '1st Semester',
      section: (row[secIdx] as Student['section']) || 'A',
      studentPhone: row[phoneIdx] || '',
      guardianName: row[gNameIdx] || '',
      guardianPhone: row[gPhoneIdx] || '',
      guardianRelation: (row[gRelIdx] as Student['guardianRelation']) || 'Father',
      remarks: row[remarksIdx] || '',
      createdAt: row[createdIdx] || new Date().toISOString(),
      updatedAt: row[updatedIdx] || new Date().toISOString(),
    }));
}

/**
 * Overwrite or sync the full student list to the 'Students' sheet.
 */
export async function saveAllStudentsToSheet(spreadsheetId: string, students: Student[], token: string): Promise<void> {
  // Clear existing student rows starting from row 2
  await fetch(`${SHEETS_API_BASE}/${spreadsheetId}/values/Students!A2:Z:clear`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (students.length === 0) return;

  const rows = students.map((s) => [
    s.id,
    s.roll,
    s.name,
    s.department,
    s.semester,
    s.section,
    s.studentPhone,
    s.guardianName,
    s.guardianPhone,
    s.guardianRelation,
    s.remarks || '',
    s.createdAt,
    s.updatedAt,
  ]);

  await fetch(`${SHEETS_API_BASE}/${spreadsheetId}/values/Students!A2:M?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: rows,
    }),
  });
}

/**
 * Append a single student to the 'Students' sheet.
 */
export async function appendStudentToSheet(spreadsheetId: string, student: Student, token: string): Promise<void> {
  const row = [
    student.id,
    student.roll,
    student.name,
    student.department,
    student.semester,
    student.section,
    student.studentPhone,
    student.guardianName,
    student.guardianPhone,
    student.guardianRelation,
    student.remarks || '',
    student.createdAt,
    student.updatedAt,
  ];

  const response = await fetch(`${SHEETS_API_BASE}/${spreadsheetId}/values/Students!A:M:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [row],
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to append student to Google Sheet');
  }
}

/**
 * Fetch all attendance records from the 'Attendance' sheet.
 */
export async function fetchAttendanceFromSheet(spreadsheetId: string, token: string): Promise<AttendanceRecord[]> {
  const range = 'Attendance!A1:O';
  const response = await fetch(`${SHEETS_API_BASE}/${spreadsheetId}/values/${range}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch attendance records: ${response.statusText}`);
  }

  const data = await response.json();
  const rows: string[][] = data.values || [];
  if (rows.length === 0) return [];

  const firstRow = rows[0].map((c) => (c || '').toString().toLowerCase().trim());
  const isHeader =
    firstRow.some((c) => c.includes('date') || c.includes('attendance') || c.includes('status'));
  const dataRows = isHeader ? rows.slice(1) : rows;

  let idIdx = 0;
  let dateIdx = 1;
  let deptIdx = 2;
  let semIdx = 3;
  let subIdx = 4;
  let secIdx = 5;
  let sIdIdx = 6;
  let rollIdx = 7;
  let sNameIdx = 8;
  let statusIdx = 9;
  let gPhoneIdx = 10;
  let recAtIdx = 11;
  let recByIdx = 12;

  if (isHeader) {
    const findIdx = (keywords: string[]) =>
      firstRow.findIndex((col) => keywords.some((k) => col.includes(k)));

    const aId = findIdx(['attendance id', 'log id', 'id']);
    if (aId !== -1) idIdx = aId;
    const dFound = findIdx(['date']);
    if (dFound !== -1) dateIdx = dFound;
    const dpFound = findIdx(['dept', 'department']);
    if (dpFound !== -1) deptIdx = dpFound;
    const smFound = findIdx(['semester', 'sem']);
    if (smFound !== -1) semIdx = smFound;
    const sbFound = findIdx(['subject', 'course']);
    if (sbFound !== -1) subIdx = sbFound;
    const scFound = findIdx(['section', 'sec']);
    if (scFound !== -1) secIdx = scFound;
    const siFound = findIdx(['student id']);
    if (siFound !== -1) sIdIdx = siFound;
    const rFound = findIdx(['roll']);
    if (rFound !== -1) rollIdx = rFound;
    const snFound = findIdx(['student name', 'name']);
    if (snFound !== -1) sNameIdx = snFound;
    const stFound = findIdx(['status']);
    if (stFound !== -1) statusIdx = stFound;
    const gpFound = findIdx(['guardian phone', 'phone', 'mobile']);
    if (gpFound !== -1) gPhoneIdx = gpFound;
    const raFound = findIdx(['recorded at', 'time']);
    if (raFound !== -1) recAtIdx = raFound;
    const rbFound = findIdx(['recorded by', 'teacher', 'faculty']);
    if (rbFound !== -1) recByIdx = rbFound;
  }

  return dataRows
    .filter((row) => row.length > 0 && row[dateIdx])
    .map((row) => ({
      id: row[idIdx] || `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date: row[dateIdx] || '',
      department: (row[deptIdx] as AttendanceRecord['department']) || '',
      semester: (row[semIdx] as AttendanceRecord['semester']) || '1st Semester',
      subject: row[subIdx] || '',
      section: (row[secIdx] as AttendanceRecord['section']) || 'A',
      studentId: row[sIdIdx] || '',
      roll: row[rollIdx] || '',
      studentName: row[sNameIdx] || '',
      status: (row[statusIdx] as AttendanceRecord['status']) || 'present',
      guardianPhone: row[gPhoneIdx] || '',
      recordedAt: row[recAtIdx] || new Date().toISOString(),
      recordedBy: row[recByIdx] || 'Teacher',
    }));
}

/**
 * Overwrite the attendance roster after removing legacy test records.
 */
export async function saveAllAttendanceRecordsToSheet(
  spreadsheetId: string,
  records: AttendanceRecord[],
  token: string
): Promise<void> {
  const clearResponse = await fetch(`${SHEETS_API_BASE}/${spreadsheetId}/values/Attendance!A2:Z:clear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!clearResponse.ok) {
    throw new Error(`Failed to clean attendance records in Google Sheet: ${clearResponse.statusText}`);
  }

  if (records.length === 0) return;

  const rows = records.map((record) => [
    record.id,
    record.date,
    record.department,
    record.semester,
    record.subject,
    record.section,
    record.studentId,
    record.roll,
    record.studentName,
    record.status,
    record.guardianPhone,
    record.recordedAt,
    record.recordedBy || 'Infra Faculty',
  ]);
  const writeResponse = await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}/values/Attendance!A2:M?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: rows }),
    }
  );
  if (!writeResponse.ok) {
    throw new Error(`Failed to save cleaned attendance records: ${writeResponse.statusText}`);
  }
}

/**
 * Append batch of attendance records to the 'Attendance' sheet.
 */
export async function appendAttendanceRecordsToSheet(
  spreadsheetId: string,
  records: AttendanceRecord[],
  token: string
): Promise<void> {
  if (records.length === 0) return;

  const rows = records.map((r) => [
    r.id,
    r.date,
    r.department,
    r.semester,
    r.subject,
    r.section,
    r.studentId,
    r.roll,
    r.studentName,
    r.status,
    r.guardianPhone,
    r.recordedAt,
    r.recordedBy || 'Infra Faculty',
  ]);

  const response = await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}/values/Attendance!A:M:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to record attendance in Google Sheet: ${err}`);
  }
}

/**
 * Append a guardian call log to the 'GuardianCallLogs' sheet.
 */
export async function appendCallLogToSheet(
  spreadsheetId: string,
  log: GuardianCallLog,
  token: string
): Promise<void> {
  const row = [
    log.id,
    log.studentId,
    log.studentName,
    log.roll || log.studentRoll || '',
    log.guardianName,
    log.guardianPhone,
    log.callTime,
    log.reason || log.callPurpose || '',
    log.status || log.callStatus || '',
    log.note || log.conversationNote || '',
  ];

  await fetch(`${SHEETS_API_BASE}/${spreadsheetId}/values/GuardianCallLogs!A:J:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [row] }),
  });
}

export async function fetchCallLogsFromSheet(
  spreadsheetId: string,
  token: string
): Promise<GuardianCallLog[]> {
  const response = await fetch(`${SHEETS_API_BASE}/${spreadsheetId}/values/GuardianCallLogs!A1:J`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Failed to fetch guardian call logs: ${response.statusText}`);
  const data = await response.json();
  const rows: string[][] = data.values || [];
  if (!rows.length) return [];
  const first = rows[0].map((cell) => (cell || '').toLowerCase().trim());
  const hasHeader = first.some((cell) => cell.includes('log') || cell.includes('student'));
  const dataRows = hasHeader ? rows.slice(1) : rows;
  return dataRows.filter((row) => row.length > 0 && row[0]).map((row) => ({
    id: row[0],
    studentId: row[1] || '',
    studentName: row[2] || '',
    roll: row[3] || '',
    guardianName: row[4] || '',
    guardianPhone: row[5] || '',
    callTime: row[6] || '',
    reason: row[7] || '',
    status: row[8] || '',
    note: row[9] || '',
  }));
}

/**
 * Fetch all subjects from the 'Subjects' sheet.
 */
export async function fetchSubjectsFromSheet(spreadsheetId: string, token: string): Promise<SubjectItem[]> {
  try {
    const range = 'Subjects!A1:D';
    const response = await fetch(`${SHEETS_API_BASE}/${spreadsheetId}/values/${range}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) return [];

    const data = await response.json();
    const rows: string[][] = data.values || [];
    if (rows.length === 0) return [];

    const firstRow = rows[0].map((c) => (c || '').toString().toLowerCase().trim());
    const isHeader = firstRow.some((c) => c.includes('code') || c.includes('subject') || c.includes('name'));
    const dataRows = isHeader ? rows.slice(1) : rows;

    return dataRows
      .filter((row) => row.length > 0 && (row[0] || row[1]))
      .map((row) => ({
        id: `sub_${row[0] || ''}_${row[2] || ''}_${row[3] || ''}`.replace(/[^a-zA-Z0-9_]/g, '_'),
        code: row[0] || '',
        name: row[1] || '',
        department: (row[2] as SubjectItem['department']) || '',
        semester: (row[3] as SubjectItem['semester']) || '1st Semester',
      }));
  } catch (err) {
    console.warn('Could not fetch subjects from Google Sheet:', err);
    return [];
  }
}

/**
 * Overwrite or sync the full subjects roster to the 'Subjects' sheet.
 */
export async function saveAllSubjectsToSheet(
  spreadsheetId: string,
  subjects: SubjectItem[],
  token: string
): Promise<void> {
  const clearResponse = await fetch(`${SHEETS_API_BASE}/${spreadsheetId}/values/Subjects!A2:D:clear`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!clearResponse.ok) {
    throw new Error(`Could not clear subjects in Google Sheet: ${clearResponse.statusText}`);
  }

  if (subjects.length === 0) return;

  const rows = subjects.map((s) => [s.code, s.name, s.department, s.semester]);
  const writeResponse = await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}/values/Subjects!A2:D?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: rows }),
    }
  );
  if (!writeResponse.ok) {
    throw new Error(`Could not save subjects to Google Sheet: ${writeResponse.statusText}`);
  }
}

/**
 * Append a single subject to the 'Subjects' sheet.
 */
export async function appendSubjectToSheet(
  spreadsheetId: string,
  subject: SubjectItem,
  token: string
): Promise<void> {
  const row = [subject.code, subject.name, subject.department, subject.semester];
  const response = await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}/values/Subjects!A:D:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [row] }),
    }
  );
  if (!response.ok) {
    throw new Error(`Could not append subject to Google Sheet: ${response.statusText}`);
  }
}

/**
 * Helper to write multiple ranges at once.
 */
async function batchWriteValues(
  spreadsheetId: string,
  data: { range: string; values: string[][] }[],
  token: string
): Promise<void> {
  const response = await fetch(`${SHEETS_API_BASE}/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('Batch write failed:', err);
  }
}
