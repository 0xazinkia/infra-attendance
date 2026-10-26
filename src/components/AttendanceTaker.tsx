import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Save, 
  Users, 
  FileSpreadsheet, 
  Calendar, 
  BookOpen, 
  Filter, 
  Phone, 
  MessageSquare, 
  CheckCheck 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { 
  Department, 
  Semester, 
  Section, 
  AttendanceStatus, 
  AttendanceRecord,
  Student 
} from '../types';
import { SEMESTERS, SECTIONS } from '../data/mockData';
import { GuardianCallModal } from './GuardianCallModal';

export const AttendanceTaker: React.FC = () => {
  const { 
    students, 
    attendanceRecords,
    departments,
    filter, 
    setFilter, 
    subjects, 
    saveAttendanceBatch, 
    databaseStatus,
    user, 
    loginWithGoogle 
  } = useApp();

  // Local state for current attendance sheet taking
  const [attendanceState, setAttendanceState] = useState<Record<string, { status?: AttendanceStatus; remarks?: string }>>({});
  const [classNotHeld, setClassNotHeld] = useState(false);
  const [sessionReasonType, setSessionReasonType] = useState<'student-absent' | 'holiday' | 'other'>('student-absent');
  const [customSessionReason, setCustomSessionReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [activeCallStudent, setActiveCallStudent] = useState<Student | null>(null);
  const attendanceSubmitRef = useRef(false);

  // Filter students based on selected Department, Semester, Section
  const enrolledStudents = useMemo(() => {
    return students
      .filter(
        (s) =>
          s.department === filter.department &&
          s.semester === filter.semester &&
          s.section === filter.section
      )
      .sort((a, b) => (Number(a.roll) || 0) - (Number(b.roll) || 0));
  }, [students, filter.department, filter.semester, filter.section]);

  // Available subjects for current dept and semester
  const availableSubjects = useMemo(() => {
    return subjects.filter(
      (s) => s.department === filter.department && s.semester === filter.semester
    );
  }, [subjects, filter.department, filter.semester]);

  const hasExistingAttendance = useMemo(
    () => attendanceRecords.some(
      (record) =>
        record.date === filter.date &&
        record.department === filter.department &&
        record.semester === filter.semester &&
        record.section === filter.section &&
        record.subject === filter.subject
    ),
    [attendanceRecords, filter.date, filter.department, filter.semester, filter.section, filter.subject]
  );

  // Keep filter.subject in sync when available subjects change
  useEffect(() => {
    if (availableSubjects.length > 0) {
      const match = availableSubjects.some((s) => s.name === filter.subject);
      if (!match) {
        setFilter((prev) => ({ ...prev, subject: availableSubjects[0].name }));
      }
    } else if (filter.subject) {
      setFilter((prev) => ({ ...prev, subject: '' }));
    }
  }, [availableSubjects, filter.subject, setFilter]);

  useEffect(() => {
    setClassNotHeld(false);
    setSessionReasonType('student-absent');
    setCustomSessionReason('');
  }, [filter.date, filter.department, filter.semester, filter.section, filter.subject]);

  // Attendance is present only when explicitly selected; an unselected row is absent.
  useEffect(() => {
    setAttendanceState((prev) => {
      const next: Record<string, { status?: AttendanceStatus; remarks?: string }> = {};
      enrolledStudents.forEach((student) => {
        next[student.id] = prev[student.id] || { remarks: '' };
      });
      return next;
    });
  }, [enrolledStudents]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = enrolledStudents.length;
    let present = 0;
    let absent = 0;

    enrolledStudents.forEach((student) => {
      const entry = attendanceState[student.id]?.status;
      if (entry === 'present') present++;
      else absent++;
    });

    if (classNotHeld) {
      present = 0;
      absent = 0;
    }
    const percentage = !classNotHeld && total > 0 ? Math.round((present / total) * 100) : 0;

    return { total, present, absent, percentage };
  }, [enrolledStudents, attendanceState, classNotHeld]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status: prev[studentId]?.status === status ? undefined : status,
      },
    }));
  };

  const handleRemarkChange = (studentId: string, remarks: string) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: {
        status: prev[studentId]?.status,
        remarks,
      },
    }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    const next: Record<string, { status: AttendanceStatus; remarks?: string }> = {};
    enrolledStudents.forEach((s) => {
      next[s.id] = {
        status,
        remarks: attendanceState[s.id]?.remarks || '',
      };
    });
    setAttendanceState(next);
  };

  // Submit attendance to Firebase
  const handleSaveAttendance = async () => {
    if (attendanceSubmitRef.current) return;
    if (enrolledStudents.length === 0) return;
    if (!filter.department || !filter.semester) return;
    const { department, semester } = filter;
    if (!filter.subject) {
      window.alert('Add a subject in Subject Management before taking attendance.');
      return;
    }
    if (classNotHeld && sessionReasonType !== 'student-absent' && !customSessionReason.trim()) {
      window.alert('Please specify why the class was not held.');
      return;
    }
    if (hasExistingAttendance) return;
    attendanceSubmitRef.current = true;
    setIsSaving(true);
    setSaveSuccessMsg(null);
    try {
      const timestamp = new Date().toISOString();
      const sessionReason = sessionReasonType === 'student-absent'
        ? 'Student Absent'
        : `${sessionReasonType === 'holiday' ? 'Holiday' : 'Other'}: ${customSessionReason.trim()}`;
      const recordsToSave: AttendanceRecord[] = enrolledStudents.map((student) => {
        const entry = attendanceState[student.id] || {};
        return {
          id: `att_${student.id}_${filter.date}_${Date.now()}`,
          sessionReason: classNotHeld ? sessionReason : undefined,
          date: filter.date,
          department,
          semester,
          subject: filter.subject,
          section: filter.section,
          studentId: student.id,
          roll: student.roll,
          studentName: student.name,
          status: entry.status === 'present' ? 'present' : 'absent',
          remarks: entry.remarks,
          recordedBy: user?.displayName || 'Faculty Member',
          recordedAt: timestamp,
        };
      });

      await saveAttendanceBatch(recordsToSave);

      setSaveSuccessMsg(classNotHeld
        ? `No-class reason for ${filter.date} saved to Firebase.`
        : `Attendance for ${recordsToSave.length} students saved to Firebase.`);
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving attendance';
      alert(`Save notice: ${msg}`);
    } finally {
      attendanceSubmitRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Control Card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Filter className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Class Session & Academic Section
              </h2>
              <p className="text-xs text-slate-500">
                Configure department, semester, subject and section for attendance record
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/70 px-3 py-1.5 rounded-lg border border-slate-200 transition cursor-pointer">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-slate-600">Class Date:</span>
              <input
                type="date"
                value={filter.date}
                onChange={(e) => setFilter((prev) => ({ ...prev, date: e.target.value }))}
                className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer text-xs"
              />
            </label>
          </div>
        </div>

        {/* Filters grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Department */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Department / Tech
            </label>
            <select
              value={filter.department}
              onChange={(e) => setFilter((prev) => ({ ...prev, department: e.target.value as Department }))}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="" disabled>
                Select Department
              </option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Semester */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Semester</label>
            <select
              value={filter.semester}
              onChange={(e) => setFilter((prev) => ({ ...prev, semester: e.target.value as Semester | '' }))}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="" disabled>
                Select Semester
              </option>
              {SEMESTERS.map((sem) => (
                <option key={sem} value={sem}>
                  {sem}
                </option>
              ))}
            </select>
          </div>

          {/* Section */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Section</label>
            <select
              value={filter.section}
              onChange={(e) => setFilter((prev) => ({ ...prev, section: e.target.value as Section }))}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {SECTIONS.map((sec) => (
                <option key={sec} value={sec}>
                  Section {sec}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Subject / Course
            </label>
            {availableSubjects.length > 0 ? (
              <select
                value={filter.subject}
                onChange={(e) => setFilter((prev) => ({ ...prev, subject: e.target.value }))}
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {availableSubjects.map((sub) => (
                  <option key={sub.id} value={sub.name}>
                    [{sub.code}] {sub.name}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value=""
                disabled
                aria-label="No subject configured"
                className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 p-2.5 text-xs font-medium text-slate-500 disabled:opacity-100"
              >
                <option value="">No subjects configured</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Live Statistics & Quick Action Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Students */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Enrolled</span>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{stats.total}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
            <Users className="w-4 h-4" />
          </div>
        </div>

        {/* Present */}
        <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-emerald-700 uppercase">Present</span>
            <p className="text-xl font-bold text-emerald-800 mt-0.5">{stats.present}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        {/* Absent */}
        <div className="bg-rose-50/60 p-3.5 rounded-xl border border-rose-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-rose-700 uppercase">Absent</span>
            <p className="text-xl font-bold text-rose-800 mt-0.5">{stats.absent}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
            <XCircle className="w-4 h-4" />
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Rate</span>
            <p className="text-xl font-bold text-emerald-400 mt-0.5">{classNotHeld ? 'N/A' : `${stats.percentage}%`}</p>
          </div>
          <div className="text-right">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                classNotHeld
                  ? 'bg-amber-500/20 text-amber-300'
                  : stats.percentage >= 75
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/20 text-rose-300'
              }`}
            >
              {classNotHeld ? 'No class held' : stats.percentage >= 75 ? 'Optimal' : '<75% Low'}
            </span>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {saveSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-4 rounded-xl flex items-center justify-between animate-in fade-in duration-300 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <p className="text-xs sm:text-sm font-medium">{saveSuccessMsg}</p>
          </div>
        </div>
      )}

      {hasExistingAttendance && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 shadow-xs"
        >
          <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-700" />
          <p className="text-xs font-medium sm:text-sm">
            Attendance has already been recorded for this class on this date.
          </p>
        </div>
      )}

      <div className={`rounded-xl border p-4 shadow-xs ${classNotHeld ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-800">
          <input
            type="checkbox"
            checked={classNotHeld}
            onChange={(event) => setClassNotHeld(event.target.checked)}
            className="h-4 w-4 accent-amber-600"
          />
          Class was not held today
        </label>
        {classNotHeld && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-semibold text-slate-700">Select a reason</p>
            {([
              { value: 'student-absent', label: 'Student Absent' },
              { value: 'holiday', label: 'Holiday' },
              { value: 'other', label: 'Other' },
            ] as const).map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                  sessionReasonType === option.value
                    ? 'border-amber-400 bg-amber-100 font-semibold text-amber-900'
                    : 'border-amber-200 bg-white text-slate-700 hover:bg-amber-50'
                }`}
              >
                <input
                  type="radio"
                  name="session-reason-type"
                  value={option.value}
                  checked={sessionReasonType === option.value}
                  onChange={() => setSessionReasonType(option.value)}
                  className="h-4 w-4 accent-amber-600"
                />
                {option.label}
              </label>
            ))}
            {sessionReasonType !== 'student-absent' && (
              <div>
                <label htmlFor="session-reason-detail" className="mb-1 block text-xs font-semibold text-slate-700">
                  {sessionReasonType === 'holiday' ? 'Holiday details (required)' : 'Please specify (required)'}
                </label>
                <textarea
                  id="session-reason-detail"
                  value={customSessionReason}
                  onChange={(event) => setCustomSessionReason(event.target.value)}
                  placeholder={sessionReasonType === 'holiday' ? 'e.g. Eid-ul-Fitr holiday' : 'Enter the reason the class was not held'}
                  rows={2}
                  className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}
            <p className="mt-1 text-[11px] text-amber-800">
              Student attendance will not be counted for this date.
            </p>
          </div>
        )}
      </div>

      {/* Main Attendance Sheet Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Table Top Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Student Attendance Roster ({enrolledStudents.length} Students)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {filter.department} • {filter.semester} • Section {filter.section}
            </p>
          </div>

          {/* Quick Mark All Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleMarkAll('present')}
              disabled={classNotHeld}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>All Present</span>
            </button>
            {/* Save to Firebase Button */}
            <button
              onClick={handleSaveAttendance}
              disabled={isSaving || hasExistingAttendance || databaseStatus.isLoading || enrolledStudents.length === 0 || !filter.department || !filter.semester || !filter.subject || (classNotHeld && sessionReasonType !== 'student-absent' && !customSessionReason.trim())}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-md transition disabled:cursor-not-allowed disabled:opacity-50 ml-auto"
            >
              <Save className="w-4 h-4 text-emerald-400" />
              <span>
                {isSaving
                  ? 'Saving to Firebase...'
                  : hasExistingAttendance
                    ? 'Already Submitted'
                    : classNotHeld
                      ? 'Save No-Class Reason'
                      : 'Save Attendance'}
              </span>
            </button>
          </div>
        </div>

        {/* Student Rows Table */}
        {enrolledStudents.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No Students Enrolled in this Section</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              There are no students listed for {filter.department} in {filter.semester}, Section {filter.section}. Switch department or add new students in the Students tab.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4 w-28">Roll No</th>
                  <th className="py-3 px-4 min-w-[180px]">Student Name</th>
                  <th className="py-3 px-4 min-w-[200px]">Guardian Contact (Call)</th>
                  <th className="py-3 px-4 min-w-[240px]">Attendance Status</th>
                  <th className="py-3 px-4 min-w-[140px]">Note / Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {enrolledStudents.map((student, idx) => {
                  const currentEntry = attendanceState[student.id] || {};
                  const isCurrentAbsent = currentEntry.status !== 'present';

                  return (
                    <tr
                      key={student.id}
                      className={`transition ${
                        !classNotHeld && isCurrentAbsent
                          ? 'bg-rose-50/40 hover:bg-rose-50/70'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Index */}
                      <td className="py-3 px-4 text-center font-mono text-slate-400 text-xs">
                        {idx + 1}
                      </td>

                      {/* Board Roll */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                          {student.roll}
                        </span>
                      </td>

                      {/* Student Name */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{student.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {student.studentPhone && (
                            <a
                              href={`callto:${student.studentPhone}`}
                              className="text-[11px] text-slate-500 hover:text-emerald-700 flex items-center gap-1"
                              title="Call student"
                            >
                              <Phone className="w-2.5 h-2.5" />
                              <span>{student.studentPhone}</span>
                            </a>
                          )}
                          {student.remarks && (
                            <span className="text-[10px] text-slate-500 italic bg-slate-100 px-1.5 py-0.5 rounded">
                              {student.remarks}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Guardian Contact with Direct Calling */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-medium text-slate-800 text-xs">
                              {student.guardianName || 'Guardian'}
                              <span className="text-[10px] text-slate-500 ml-1 font-normal">
                                ({student.guardianRelation})
                              </span>
                            </div>
                            <div className="font-mono font-semibold text-slate-900 text-xs mt-0.5">
                              {student.guardianPhone || 'N/A'}
                            </div>
                          </div>

                          {/* Quick Call Guardian Button */}
                          {student.guardianPhone ? (
                            <div className="flex items-center gap-1">
                              <a
                                href={`callto:${student.guardianPhone}`}
                                title={`Call Guardian (${student.guardianName})`}
                                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                              <button
                                onClick={() => setActiveCallStudent(student)}
                                title="Open Guardian Call Dialog & SMS Notice"
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-rose-500 italic">No phone</span>
                          )}
                        </div>
                      </td>

                      {/* Status Buttons */}
                      <td className="py-3 px-4">
                        {classNotHeld ? (
                          <span className="text-xs font-semibold text-amber-700">No class held</span>
                        ) : <div className="flex items-center gap-2">
                          {/* Present */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, 'present')}
                            className={`px-3.5 py-1.5 rounded-lg font-bold text-xs transition flex items-center gap-1.5 ${
                              currentEntry.status === 'present'
                                ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-500'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Present</span>
                          </button>

                        </div>}
                      </td>

                      {/* Note / Remarks */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={currentEntry.remarks || ''}
                          onChange={(e) => handleRemarkChange(student.id, e.target.value)}
                          disabled={classNotHeld}
                          placeholder="Optional note..."
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Bottom Save Action Footer */}
        {enrolledStudents.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-600">
              Session: <strong className="text-slate-800">{filter.subject}</strong> • Recorded for{' '}
              <strong className="text-slate-800">{filter.date}</strong>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveAttendance}
                disabled={isSaving || hasExistingAttendance || !filter.subject || (classNotHeld && sessionReasonType !== 'student-absent' && !customSessionReason.trim())}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-md transition disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-emerald-400" />
                <span>{isSaving ? 'Saving to Firebase...' : classNotHeld ? 'Save No-Class Reason' : 'Save Attendance'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Guardian Call / SMS Dialog */}
      {activeCallStudent && (
        <GuardianCallModal
          student={activeCallStudent}
          currentSubject={filter.subject}
          attendanceDate={filter.date}
          onClose={() => setActiveCallStudent(null)}
        />
      )}
    </div>
  );
};
