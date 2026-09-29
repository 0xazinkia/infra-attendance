import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Calendar, 
  FileSpreadsheet, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  PhoneCall, 
  Phone, 
  Search, 
  GraduationCap, 
  Clock,
  BookOpen,
  Filter,
  Check,
  ChevronRight,
  Layers
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DEPARTMENTS, SEMESTERS, SECTIONS } from '../data/mockData';
import { Department, Semester, Section, Student, AttendanceRecord } from '../types';
import { GuardianCallModal } from './GuardianCallModal';

export const AttendanceReports: React.FC = () => {
  const { students, attendanceRecords, subjects, sheetStatus } = useApp();

  // Primary Filters
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    // Default to current month YYYY-MM
    return new Date().toISOString().substring(0, 7);
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Date state for date-wise attendance inspection
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dateFilterStatus, setDateFilterStatus] = useState<'all' | 'present' | 'absent'>('all');

  // Guardian call modal
  const [callStudent, setCallStudent] = useState<Student | null>(null);

  // Available months extracted from attendance records + current month
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    attendanceRecords.forEach((r) => {
      if (r.date && r.date.length >= 7) {
        monthSet.add(r.date.substring(0, 7));
      }
    });

    // Always include current month
    const currentM = new Date().toISOString().substring(0, 7);
    monthSet.add(currentM);

    return Array.from(monthSet).sort().reverse();
  }, [attendanceRecords]);

  // Format YYYY-MM into readable month name (e.g., "September 2026")
  const formatMonthName = (monthStr: string) => {
    if (monthStr === 'all') return 'All Months';
    const [year, month] = monthStr.split('-');
    if (!year || !month) return monthStr;
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  };

  // Available subjects for the current department & semester selection
  const availableSubjects = useMemo(() => {
    const map = new Map<string, string>(); // code or name -> label

    // 1. From configured subjects in system
    subjects.forEach((s) => {
      const matchDept = selectedDept === 'all' || s.department === selectedDept;
      const matchSem = selectedSemester === 'all' || s.semester === selectedSemester;
      if (matchDept && matchSem) {
        map.set(s.name, `[${s.code}] ${s.name}`);
      }
    });

    // 2. From historical attendance records
    attendanceRecords.forEach((r) => {
      const matchDept = selectedDept === 'all' || r.department === selectedDept;
      const matchSem = selectedSemester === 'all' || r.semester === selectedSemester;
      if (matchDept && matchSem && r.subject && !map.has(r.subject)) {
        map.set(r.subject, r.subject);
      }
    });

    return Array.from(map.entries()).map(([name, label]) => ({ name, label }));
  }, [subjects, attendanceRecords, selectedDept, selectedSemester]);

  // Class sessions held in the selected month matching dept, sem, sec, sub
  const classDatesInMonth = useMemo(() => {
    const map = new Map<
      string,
      {
        date: string;
        total: number;
        present: number;
        absent: number;
        subjects: Set<string>;
        sections: Set<string>;
        departments: Set<string>;
        semesters: Set<string>;
      }
    >();

    attendanceRecords.forEach((r) => {
      if (!r.date) return;
      const matchMonth = selectedMonth === 'all' || r.date.startsWith(selectedMonth);
      const matchDept = selectedDept === 'all' || r.department === selectedDept;
      const matchSem = selectedSemester === 'all' || r.semester === selectedSemester;
      const matchSec = selectedSection === 'all' || r.section === selectedSection;
      const matchSub = selectedSubject === 'all' || r.subject === selectedSubject;

      if (matchMonth && matchDept && matchSem && matchSec && matchSub) {
        if (!map.has(r.date)) {
          map.set(r.date, {
            date: r.date,
            total: 0,
            present: 0,
            absent: 0,
            subjects: new Set(),
            sections: new Set(),
            departments: new Set(),
            semesters: new Set(),
          });
        }
        const item = map.get(r.date)!;
        item.total++;
        if (r.status === 'present') item.present++;
        else if (r.status === 'absent') item.absent++;

        if (r.subject) item.subjects.add(r.subject);
        if (r.section) item.sections.add(r.section);
        if (r.department) item.departments.add(r.department);
        if (r.semester) item.semesters.add(r.semester);
      }
    });

    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [attendanceRecords, selectedMonth, selectedDept, selectedSemester, selectedSection, selectedSubject]);

  // Keep selectedDate synchronized: if current selectedDate is not in classDatesInMonth, pick the first or reset
  const activeSelectedDate = useMemo(() => {
    if (classDatesInMonth.length === 0) return null;
    if (selectedDate && classDatesInMonth.some((d) => d.date === selectedDate)) {
      return selectedDate;
    }
    return classDatesInMonth[0].date;
  }, [classDatesInMonth, selectedDate]);

  // Detailed attendance records for the active selected date
  const selectedDateAttendance = useMemo(() => {
    if (!activeSelectedDate) return [];

    return attendanceRecords
      .filter((r) => {
        const matchDate = r.date === activeSelectedDate;
        const matchDept = selectedDept === 'all' || r.department === selectedDept;
        const matchSem = selectedSemester === 'all' || r.semester === selectedSemester;
        const matchSec = selectedSection === 'all' || r.section === selectedSection;
        const matchSub = selectedSubject === 'all' || r.subject === selectedSubject;
        const matchStatus = dateFilterStatus === 'all' || r.status === dateFilterStatus;
        const matchSearch =
          searchQuery.trim() === '' ||
          r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.roll.includes(searchQuery);

        return matchDate && matchDept && matchSem && matchSec && matchSub && matchStatus && matchSearch;
      })
      .sort((a, b) => (Number(a.roll) || 0) - (Number(b.roll) || 0));
  }, [attendanceRecords, activeSelectedDate, selectedDept, selectedSemester, selectedSection, selectedSubject, dateFilterStatus, searchQuery]);

  // Stats for the active selected date
  const activeDateStats = useMemo(() => {
    if (!activeSelectedDate) return null;
    const allRecordsForDate = attendanceRecords.filter((r) => {
      const matchDate = r.date === activeSelectedDate;
      const matchDept = selectedDept === 'all' || r.department === selectedDept;
      const matchSem = selectedSemester === 'all' || r.semester === selectedSemester;
      const matchSec = selectedSection === 'all' || r.section === selectedSection;
      const matchSub = selectedSubject === 'all' || r.subject === selectedSubject;
      return matchDate && matchDept && matchSem && matchSec && matchSub;
    });

    const total = allRecordsForDate.length;
    const present = allRecordsForDate.filter((r) => r.status === 'present').length;
    const absent = allRecordsForDate.filter((r) => r.status === 'absent').length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    return { total, present, absent, percentage };
  }, [attendanceRecords, activeSelectedDate, selectedDept, selectedSemester, selectedSection, selectedSubject]);

  // Relevant Students for Cumulative Report
  const relevantStudents = useMemo(() => {
    return students.filter((s) => {
      const matchDept = selectedDept === 'all' || s.department === selectedDept;
      const matchSem = selectedSemester === 'all' || s.semester === selectedSemester;
      const matchSec = selectedSection === 'all' || s.section === selectedSection;
      const matchSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.roll.toLowerCase().includes(searchQuery.toLowerCase());
      return matchDept && matchSem && matchSec && matchSearch;
    });
  }, [students, selectedDept, selectedSemester, selectedSection, searchQuery]);

  // Calculate cumulative attendance metrics per student within selected filters & month
  const studentMetrics = useMemo(() => {
    return relevantStudents.map((student) => {
      const studentRecords = attendanceRecords.filter((r) => {
        const matchStudent = r.studentId === student.id || r.roll === student.roll;
        const matchMonth = selectedMonth === 'all' || r.date.startsWith(selectedMonth);
        const matchSub = selectedSubject === 'all' || r.subject === selectedSubject;
        return matchStudent && matchMonth && matchSub;
      });

      const totalClasses = studentRecords.length;
      const presentClasses = studentRecords.filter((r) => r.status === 'present').length;
      const absentClasses = studentRecords.filter((r) => r.status === 'absent').length;
      const percentage = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 100;

      let btebStatus: 'Collegiate' | 'Non-Collegiate' | 'Discollegiate' = 'Collegiate';
      if (totalClasses > 0) {
        if (percentage < 60) btebStatus = 'Discollegiate';
        else if (percentage < 75) btebStatus = 'Non-Collegiate';
      }

      return {
        student,
        totalClasses,
        presentClasses,
        absentClasses,
        percentage,
        btebStatus,
      };
    });
  }, [relevantStudents, attendanceRecords, selectedMonth, selectedSubject]);

  // Short-attendance students (< 75%)
  const shortAttendanceStudents = useMemo(() => {
    return studentMetrics.filter((m) => m.totalClasses > 0 && m.percentage < 75);
  }, [studentMetrics]);

  // Format single date to nice readable format (e.g., "28 Sep, 2026 (Monday)")
  const formatDateLabel = (isoDate: string) => {
    try {
      const d = new Date(isoDate + 'T00:00:00');
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoDate;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              <span>Academic Attendance Reports & BTEB Compliance</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Subject &amp; Month-wise attendance breakdown, class date drilldown, and student compliance roster
            </p>
          </div>

          {sheetStatus.spreadsheetUrl && (
            <a
              href={sheetStatus.spreadsheetUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs rounded-xl border border-emerald-200 transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Open Attendance in Google Sheets</span>
            </a>
          )}
        </div>

        {/* Filters Bar: Department -> Semester -> Section -> Subject -> Month -> Search Student */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-4">
          {/* 1. Department */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Department
            </label>
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setSelectedSubject('all');
              }}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="all">All Departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Semester */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Semester
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => {
                setSelectedSemester(e.target.value);
                setSelectedSubject('all');
              }}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="all">All Semesters</option>
              {SEMESTERS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Section */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Section
            </label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="all">All Sections</option>
              {SECTIONS.map((sec) => (
                <option key={sec} value={sec}>
                  Section {sec}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Subject Selection (Before Search Student as requested) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Subject / Course
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none truncate"
            >
              <option value="all">All Subjects</option>
              {availableSubjects.map((sub) => (
                <option key={sub.name} value={sub.name} title={sub.label}>
                  {sub.label}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Month Selection (as requested) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Month Selection
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="all">All Months</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthName(m)}
                </option>
              ))}
            </select>
          </div>

          {/* 6. Search Student */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Search Student
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name or roll..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Class Sessions in Selected Month */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase">
              Classes in {formatMonthName(selectedMonth)}
            </span>
            <p className="text-2xl font-bold text-slate-900 mt-1">{classDatesInMonth.length}</p>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              {attendanceRecords.filter(r => selectedMonth === 'all' || r.date.startsWith(selectedMonth)).length} student records logged
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* Enrolled Students Tracked */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase">
              Enrolled Students Tracked
            </span>
            <p className="text-2xl font-bold text-slate-900 mt-1">{relevantStudents.length}</p>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Infra Polytechnic Institute
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>

        {/* Short Attendance (< 75%) Warning */}
        <div className="bg-rose-50/80 p-4 rounded-xl border border-rose-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-rose-700 uppercase">
              Short Attendance (&lt; 75%)
            </span>
            <p className="text-2xl font-bold text-rose-800 mt-1">
              {shortAttendanceStudents.length} Students
            </p>
            <span className="text-[11px] text-rose-600 mt-0.5 block font-medium">
              Guardian alert / notice required
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* MONTH CLASS DATES SELECTOR (as requested) */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Class Sessions in {formatMonthName(selectedMonth)}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any class date below to view the roll-by-roll attendance sheet for that specific day
            </p>
          </div>

          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
            {classDatesInMonth.length} {classDatesInMonth.length === 1 ? 'Class Session' : 'Class Sessions'} Found
          </span>
        </div>

        {/* Class Date Chips / Buttons */}
        {classDatesInMonth.length === 0 ? (
          <div className="py-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">
              No class attendance recorded in {formatMonthName(selectedMonth)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Try choosing another month or adjust the Department, Semester, and Subject filters above.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {classDatesInMonth.map((session) => {
              const isSelected = activeSelectedDate === session.date;
              const rate = session.total > 0 ? Math.round((session.present / session.total) * 100) : 0;

              return (
                <button
                  key={session.date}
                  onClick={() => setSelectedDate(session.date)}
                  className={`flex flex-col text-left p-3 rounded-xl border transition-all text-xs ${
                    isSelected
                      ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm ring-2 ring-emerald-500/30'
                      : 'bg-slate-50 hover:bg-slate-100/80 text-slate-800 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className={`font-bold font-mono ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                      {formatDateLabel(session.date)}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-emerald-900 text-emerald-200'
                          : rate >= 75
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {rate}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1.5 text-[11px]">
                    <span className={isSelected ? 'text-emerald-200' : 'text-emerald-700 font-semibold'}>
                      ✓ {session.present} Present
                    </span>
                    <span className={isSelected ? 'text-rose-200' : 'text-rose-700 font-semibold'}>
                      ✗ {session.absent} Absent
                    </span>
                  </div>

                  {session.subjects.size > 0 && (
                    <div
                      className={`text-[10px] mt-1.5 truncate max-w-[220px] font-medium ${
                        isSelected ? 'text-emerald-100' : 'text-slate-500'
                      }`}
                    >
                      {Array.from(session.subjects).join(', ')}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* DATE-WISE DETAILED ATTENDANCE LEDGER (When a date is selected) */}
      {activeSelectedDate && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header of Date-wise session */}
          <div className="p-4 bg-slate-900 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  Attendance Details for {formatDateLabel(activeSelectedDate)}
                </h3>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {selectedDept !== 'all' ? selectedDept : 'All Departments'} •{' '}
                {selectedSemester !== 'all' ? selectedSemester : 'All Semesters'} •{' '}
                {selectedSection !== 'all' ? `Section ${selectedSection}` : 'All Sections'} •{' '}
                {selectedSubject !== 'all' ? selectedSubject : 'All Subjects'}
              </p>
            </div>

            {/* Quick Stats & Status Toggle for this specific date */}
            {activeDateStats && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-slate-800 rounded-lg p-1 text-[11px] font-semibold border border-slate-700">
                  <button
                    onClick={() => setDateFilterStatus('all')}
                    className={`px-2.5 py-1 rounded-md transition ${
                      dateFilterStatus === 'all'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    All ({activeDateStats.total})
                  </button>
                  <button
                    onClick={() => setDateFilterStatus('present')}
                    className={`px-2.5 py-1 rounded-md transition ${
                      dateFilterStatus === 'present'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Present ({activeDateStats.present})
                  </button>
                  <button
                    onClick={() => setDateFilterStatus('absent')}
                    className={`px-2.5 py-1 rounded-md transition ${
                      dateFilterStatus === 'absent'
                        ? 'bg-rose-600 text-white'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Absent ({activeDateStats.absent})
                  </button>
                </div>

                <div className="px-3 py-1 bg-emerald-950/80 border border-emerald-500/40 rounded-lg text-emerald-300 font-mono font-bold text-xs">
                  {activeDateStats.percentage}% Attended
                </div>
              </div>
            )}
          </div>

          {/* Table of students on selected date */}
          <div className="overflow-x-auto">
            {selectedDateAttendance.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No student records matching status filter &ldquo;{dateFilterStatus}&rdquo; for this date.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 w-28">Roll No</th>
                    <th className="py-3 px-4 min-w-[180px]">Student Name</th>
                    <th className="py-3 px-4 min-w-[150px]">Subject</th>
                    <th className="py-3 px-4 min-w-[140px]">Department / Sem</th>
                    <th className="py-3 px-4 w-24 text-center">Section</th>
                    <th className="py-3 px-4 w-28 text-center">Status</th>
                    <th className="py-3 px-4 min-w-[160px]">Guardian Contact</th>
                    <th className="py-3 px-4 w-28 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedDateAttendance.map((record) => {
                    const matchedStudent = students.find((s) => s.id === record.studentId || s.roll === record.roll);
                    const isPresent = record.status === 'present';

                    return (
                      <tr
                        key={record.id}
                        className={`hover:bg-slate-50/80 transition ${
                          !isPresent ? 'bg-rose-50/30' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {record.roll}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {record.studentName}
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {record.subject || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <div>{record.department}</div>
                          <div className="text-[10px] text-slate-400">{record.semester}</div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            Sec {record.section}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                              isPresent
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {isPresent ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>Present</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 text-rose-600" />
                                <span>Absent</span>
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800 text-[11px]">
                            {matchedStudent?.guardianName || 'Guardian'}
                          </div>
                          <div className="font-mono text-emerald-800 font-semibold text-[11px]">
                            {record.guardianPhone || matchedStudent?.guardianPhone || 'No Phone'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {matchedStudent ? (
                            <button
                              onClick={() => setCallStudent(matchedStudent)}
                              title={`Call ${matchedStudent.guardianName} (${matchedStudent.guardianPhone})`}
                              className={`p-1.5 rounded-lg transition inline-flex items-center gap-1 text-xs font-semibold ${
                                !isPresent
                                  ? 'bg-rose-100 hover:bg-rose-200 text-rose-800'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span className="text-[10px] hidden sm:inline">
                                {!isPresent ? 'Alert Guardian' : 'Call'}
                              </span>
                            </button>
                          ) : (
                            <a
                              href={`tel:${record.guardianPhone}`}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-700 transition inline-flex items-center"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* SHORT ATTENDANCE ALERT PANEL (< 75%) */}
      {shortAttendanceStudents.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-amber-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-950">
                  Short-Attendance Warning List (Non-Collegiate / Discollegiate)
                </h3>
                <p className="text-xs text-amber-800">
                  According to BTEB rules, students below 75% attendance risk disbarment from final semester board examinations.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {shortAttendanceStudents.map(({ student, percentage, totalClasses, presentClasses }) => (
              <div
                key={student.id}
                className="bg-white rounded-xl p-3.5 border border-amber-200 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-800">
                      Roll: {student.roll}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                      {percentage}% Attendance
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-1">{student.name}</h4>
                  <p className="text-xs text-slate-500">
                    {student.department} • {student.semester} • Sec {student.section}
                  </p>
                  <p className="text-xs text-slate-600 mt-1.5">
                    Attended: <strong>{presentClasses}</strong> of {totalClasses} classes
                  </p>
                  <p className="text-xs text-slate-700 mt-1 font-mono">
                    Guardian: {student.guardianName} ({student.guardianPhone})
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100">
                  <button
                    onClick={() => setCallStudent(student)}
                    className="w-full flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-1.5 px-3 rounded-lg text-xs transition"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Call Guardian for Notice</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CUMULATIVE STUDENT ATTENDANCE RATIOS TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
          <div>
            <span className="font-bold text-slate-800">
              Overall Student Attendance Ratios ({studentMetrics.length} Students)
            </span>
            <span className="text-slate-500 text-[11px] block sm:inline sm:ml-2">
              • Filter: {formatMonthName(selectedMonth)} • {selectedSubject !== 'all' ? selectedSubject : 'All Subjects'}
            </span>
          </div>
          <span className="text-slate-500 text-[11px]">
            Infra Polytechnic Institute
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-28">Roll No</th>
                <th className="py-3 px-4 min-w-[180px]">Student Name</th>
                <th className="py-3 px-4 min-w-[160px]">Department</th>
                <th className="py-3 px-4 w-20 text-center">Section</th>
                <th className="py-3 px-4 w-24 text-center">Classes</th>
                <th className="py-3 px-4 w-24 text-center">Present</th>
                <th className="py-3 px-4 w-24 text-center">Absent</th>
                <th className="py-3 px-4 w-28 text-center">Percentage</th>
                <th className="py-3 px-4 w-32 text-center">BTEB Status</th>
                <th className="py-3 px-4 w-28 text-center">Guardian Call</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {studentMetrics.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">
                    No students found matching current filters.
                  </td>
                </tr>
              ) : (
                studentMetrics.map(({ student, totalClasses, presentClasses, absentClasses, percentage, btebStatus }) => (
                  <tr key={student.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {student.roll}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{student.name}</td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>{student.department}</div>
                      <div className="text-[10px] text-slate-400">{student.semester}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {student.section}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-medium text-slate-700">
                      {totalClasses}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-emerald-700">
                      {presentClasses}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-rose-700">
                      {absentClasses}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`font-mono font-bold ${
                          percentage >= 75
                            ? 'text-emerald-700'
                            : percentage >= 60
                            ? 'text-amber-700'
                            : 'text-rose-700'
                        }`}
                      >
                        {totalClasses > 0 ? `${percentage}%` : 'N/A'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {totalClasses > 0 ? (
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            btebStatus === 'Collegiate'
                              ? 'bg-emerald-100 text-emerald-800'
                              : btebStatus === 'Non-Collegiate'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {btebStatus}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No classes yet</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setCallStudent(student)}
                        title={`Call ${student.guardianName} (${student.guardianPhone})`}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Guardian Call Dialog */}
      {callStudent && (
        <GuardianCallModal
          student={callStudent}
          onClose={() => setCallStudent(null)}
        />
      )}
    </div>
  );
};
