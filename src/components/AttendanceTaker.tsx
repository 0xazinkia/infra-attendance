import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Save, 
  Users, 
  PhoneCall, 
  FileSpreadsheet, 
  Calendar, 
  BookOpen, 
  Filter, 
  Sparkles, 
  Phone, 
  MessageSquare, 
  AlertTriangle, 
  RotateCcw, 
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
import { DEPARTMENTS, SEMESTERS, SECTIONS } from '../data/mockData';
import { GuardianCallModal } from './GuardianCallModal';

export const AttendanceTaker: React.FC = () => {
  const { 
    students, 
    filter, 
    setFilter, 
    subjects, 
    saveAttendanceBatch, 
    sheetStatus, 
    syncWithSheets, 
    user, 
    loginWithGoogle 
  } = useApp();

  // Local state for current attendance sheet taking
  const [attendanceState, setAttendanceState] = useState<Record<string, { status: AttendanceStatus; remarks?: string }>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [activeCallStudent, setActiveCallStudent] = useState<Student | null>(null);

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

  // Keep filter.subject in sync when available subjects change
  useEffect(() => {
    if (availableSubjects.length > 0) {
      const match = availableSubjects.some((s) => s.name === filter.subject);
      if (!match) {
        setFilter((prev) => ({ ...prev, subject: availableSubjects[0].name }));
      }
    }
  }, [availableSubjects, filter.subject, setFilter]);

  // Initialize attendance statuses to 'present' by default whenever enrolled students change
  useEffect(() => {
    setAttendanceState((prev) => {
      const next: Record<string, { status: AttendanceStatus; remarks?: string }> = {};
      enrolledStudents.forEach((student) => {
        next[student.id] = prev[student.id] || { status: 'present', remarks: '' };
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
      const entry = attendanceState[student.id]?.status || 'present';
      if (entry === 'present') present++;
      else if (entry === 'absent') absent++;
    });

    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    return { total, present, absent, percentage };
  }, [enrolledStudents, attendanceState]);

  // Absentees who require guardian attention
  const absentStudents = useMemo(() => {
    return enrolledStudents.filter((s) => attendanceState[s.id]?.status === 'absent');
  }, [enrolledStudents, attendanceState]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const handleRemarkChange = (studentId: string, remarks: string) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: {
        status: prev[studentId]?.status || 'present',
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

  // Submit attendance to Google Sheets
  const handleSaveAttendance = async () => {
    if (enrolledStudents.length === 0) return;

    setIsSaving(true);
    setSaveSuccessMsg(null);
    try {
      const timestamp = new Date().toISOString();
      const recordsToSave: AttendanceRecord[] = enrolledStudents.map((student) => {
        const entry = attendanceState[student.id] || { status: 'present' };
        return {
          id: `att_${student.id}_${filter.date}_${Date.now()}`,
          date: filter.date,
          timeSlot: filter.timeSlot,
          department: filter.department,
          semester: filter.semester,
          subject: filter.subject,
          section: filter.section,
          studentId: student.id,
          roll: student.roll,
          studentName: student.name,
          status: entry.status,
          guardianPhone: student.guardianPhone,
          remarks: entry.remarks,
          recordedBy: user?.displayName || 'Faculty Member',
          recordedAt: timestamp,
        };
      });

      await saveAttendanceBatch(recordsToSave);

      const targetDestination = sheetStatus.spreadsheetId
        ? `and synced with Google Sheets (${sheetStatus.spreadsheetName})`
        : '(Stored in local memory; connect Google Sheets to sync)';

      setSaveSuccessMsg(`Attendance for ${recordsToSave.length} students recorded successfully ${targetDestination}!`);
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving attendance';
      alert(`Save notice: ${msg}`);
    } finally {
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
              {DEPARTMENTS.map((dept) => (
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
              onChange={(e) => setFilter((prev) => ({ ...prev, semester: e.target.value as Semester }))}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
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
              <input
                type="text"
                value={filter.subject}
                onChange={(e) => setFilter((prev) => ({ ...prev, subject: e.target.value }))}
                placeholder="Enter Subject Name"
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
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
            <p className="text-xl font-bold text-emerald-400 mt-0.5">{stats.percentage}%</p>
          </div>
          <div className="text-right">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                stats.percentage >= 75
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/20 text-rose-300'
              }`}
            >
              {stats.percentage >= 75 ? 'Optimal' : '<75% Low'}
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
          {sheetStatus.spreadsheetUrl && (
            <a
              href={sheetStatus.spreadsheetUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-emerald-700 underline hover:text-emerald-900 ml-4 flex-shrink-0"
            >
              Open in Sheets
            </a>
          )}
        </div>
      )}

      {/* GUARDIAN ABSENTEE CALLING TRAY (CRITICAL REQUIREMENT) */}
      {absentStudents.length > 0 && (
        <div className="bg-rose-50/90 border-2 border-rose-300/80 rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-rose-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/30">
                <PhoneCall className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-950 flex items-center gap-2">
                  <span>Guardian Contact Required for Absentees</span>
                  <span className="bg-rose-600 text-white text-[11px] font-mono px-2 py-0.2 rounded-full">
                    {absentStudents.length} Absent
                  </span>
                </h3>
                <p className="text-xs text-rose-700">
                  Infra Polytechnic policy recommends immediate guardian follow-up on class absence
                </p>
              </div>
            </div>

            <span className="text-xs font-semibold text-rose-800 bg-white/80 px-3 py-1 rounded-lg border border-rose-200">
              One-Click Calling & Notice Dispatch
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {absentStudents.map((absentee) => (
              <div
                key={absentee.id}
                className="bg-white rounded-xl p-3.5 border border-rose-200 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                      Roll: {absentee.roll}
                    </span>
                    <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                      Absent Today
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-1.5">{absentee.name}</h4>
                  <div className="text-xs text-slate-600 mt-1">
                    <p>
                      Guardian:{' '}
                      <strong className="text-slate-800">
                        {absentee.guardianName} ({absentee.guardianRelation})
                      </strong>
                    </p>
                    <p className="font-mono font-medium text-slate-700 mt-0.5">
                      📞 {absentee.guardianPhone || 'No guardian number'}
                    </p>
                  </div>
                </div>

                {/* Call & Notice buttons */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2">
                  <a
                    href={`tel:${absentee.guardianPhone}`}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-1.5 px-2.5 rounded-lg text-xs transition shadow-xs"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Guardian</span>
                  </a>
                  <button
                    onClick={() => setActiveCallStudent(absentee)}
                    className="flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-1.5 px-2.5 rounded-lg text-xs transition"
                    title="SMS Notice & Log Call Outcome"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                    <span>Notice / Log</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>All Present</span>
            </button>
            <button
              onClick={() => handleMarkAll('absent')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-100 hover:bg-rose-200 text-rose-800 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>All Absent</span>
            </button>

            {/* Save to Google Sheets Button */}
            <button
              onClick={handleSaveAttendance}
              disabled={isSaving || enrolledStudents.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-md transition disabled:opacity-50 ml-auto"
            >
              <Save className="w-4 h-4 text-emerald-400" />
              <span>{isSaving ? 'Saving to Sheets...' : 'Save Attendance to Google Sheets'}</span>
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
            <button
              onClick={() => {
                setFilter((prev) => ({
                  ...prev,
                  department: 'Computer Technology',
                  semester: '4th Semester',
                  section: 'A',
                }));
              }}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-2 rounded-lg transition border border-emerald-200"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Switch to Demo Class (Computer 4th Sem)</span>
            </button>
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
                  const currentEntry = attendanceState[student.id] || { status: 'present' };
                  const isCurrentAbsent = currentEntry.status === 'absent';

                  return (
                    <tr
                      key={student.id}
                      className={`transition ${
                        isCurrentAbsent
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
                              href={`tel:${student.studentPhone}`}
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
                                href={`tel:${student.guardianPhone}`}
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
                        <div className="flex items-center gap-2">
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

                          {/* Absent */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, 'absent')}
                            className={`px-3.5 py-1.5 rounded-lg font-bold text-xs transition flex items-center gap-1.5 ${
                              currentEntry.status === 'absent'
                                ? 'bg-rose-600 text-white shadow-xs ring-1 ring-rose-500'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Absent</span>
                          </button>
                        </div>
                      </td>

                      {/* Note / Remarks */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={currentEntry.remarks || ''}
                          onChange={(e) => handleRemarkChange(student.id, e.target.value)}
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
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-md transition disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-emerald-400" />
                <span>{isSaving ? 'Submitting to Sheets...' : 'Save Attendance to Google Sheets'}</span>
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
