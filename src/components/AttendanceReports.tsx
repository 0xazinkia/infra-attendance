import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart3, 
  Calendar, 
  FileSpreadsheet, 
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
  Layers,
  Pencil,
  Save,
  X,
  Trash2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SEMESTERS, SECTIONS } from '../data/mockData';
import { Department, Semester, Section, Student, AttendanceRecord } from '../types';
import { GuardianCallModal } from './GuardianCallModal';

export const AttendanceReports: React.FC = () => {
  const { students, attendanceRecords, subjects, departments, saveAttendanceBatch, deleteAttendanceSessions } = useApp();

  // Primary Filters
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>(SEMESTERS[0]);
  const [selectedSection, setSelectedSection] = useState<string>(SECTIONS[0]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    // Default to current month YYYY-MM
    return new Date().toISOString().substring(0, 7);
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [reportTab, setReportTab] = useState<'daily' | 'monthly' | 'overall'>('daily');
  const [overallStartMonth, setOverallStartMonth] = useState(() => new Date().toISOString().substring(0, 7));
  const [expandedStatusDates, setExpandedStatusDates] = useState<{ studentId: string; status: 'present' | 'absent' } | null>(null);

  // Selected Date state for date-wise attendance inspection
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isSelectingSessionDates, setIsSelectingSessionDates] = useState(false);
  const [selectedSessionDates, setSelectedSessionDates] = useState<string[]>([]);
  const [isDeletingSessions, setIsDeletingSessions] = useState(false);
  const [dateFilterStatus, setDateFilterStatus] = useState<'all' | 'present' | 'absent'>('all');
  const [editingStatusRecordId, setEditingStatusRecordId] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<AttendanceRecord['status']>('present');
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  // Guardian call modal
  const [callStudent, setCallStudent] = useState<Student | null>(null);

  useEffect(() => {
    if (!departments.includes(selectedDept)) setSelectedDept(departments[0] || '');
  }, [departments, selectedDept]);

  const handleSaveStatus = async (record: AttendanceRecord) => {
    setIsSavingStatus(true);
    try {
      await saveAttendanceBatch([{ ...record, status: pendingStatus, recordedAt: new Date().toISOString() }]);
      setEditingStatusRecordId(null);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not update attendance status.');
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleSessionDelete = async () => {
    if (!isSelectingSessionDates) {
      setIsSelectingSessionDates(true);
      setSelectedSessionDates([]);
      return;
    }
    if (selectedSessionDates.length === 0) {
      setIsSelectingSessionDates(false);
      return;
    }

    setIsDeletingSessions(true);
    try {
      await deleteAttendanceSessions(selectedSessionDates, selectedDept, selectedSemester as Semester, selectedSection as Section, selectedSubject);
      setSelectedSessionDates([]);
      setIsSelectingSessionDates(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not delete selected attendance sessions.');
    } finally {
      setIsDeletingSessions(false);
    }
  };

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
      const matchDept = s.department === selectedDept;
      const matchSem = s.semester === selectedSemester;
      if (matchDept && matchSem) {
        map.set(s.name, `[${s.code}] ${s.name}`);
      }
    });

    // 2. From historical attendance records
    attendanceRecords.forEach((r) => {
      const matchDept = r.department === selectedDept;
      const matchSem = r.semester === selectedSemester;
      if (matchDept && matchSem && r.subject && !map.has(r.subject)) {
        map.set(r.subject, r.subject);
      }
    });

    return Array.from(map.entries()).map(([name, label]) => ({ name, label }));
  }, [subjects, attendanceRecords, selectedDept, selectedSemester]);

  useEffect(() => {
    if (availableSubjects.length > 0 && !availableSubjects.some((subject) => subject.name === selectedSubject)) {
      setSelectedSubject(availableSubjects[0].name);
    }
  }, [availableSubjects, selectedSubject]);

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
      const matchMonth = r.date.startsWith(selectedMonth);
      const matchDept = r.department === selectedDept;
      const matchSem = r.semester === selectedSemester;
      const matchSec = r.section === selectedSection;
      const matchSub = r.subject === selectedSubject;

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

  // Include current roster members without a saved record as absent for this session.
  const activeDateRecords = useMemo(() => {
    if (!activeSelectedDate) return [];

    const recordsForDate = attendanceRecords.filter((record) =>
      record.date === activeSelectedDate &&
      record.department === selectedDept &&
      record.semester === selectedSemester &&
      record.section === selectedSection &&
      record.subject === selectedSubject
    );
    const missingStudentRecords: AttendanceRecord[] = students
      .filter((student) =>
        student.department === selectedDept &&
        student.semester === selectedSemester &&
        student.section === selectedSection &&
        !recordsForDate.some((record) => record.studentId === student.id || record.roll === student.roll)
      )
      .map((student) => ({
        id: `missing_${student.id}_${activeSelectedDate}_${selectedSubject}`,
        date: activeSelectedDate,
        department: student.department,
        semester: student.semester,
        subject: selectedSubject,
        section: student.section,
        studentId: student.id,
        roll: student.roll,
        studentName: student.name,
        status: 'absent',
        guardianPhone: student.guardianPhone,
        recordedAt: student.createdAt,
      }));

    return [...recordsForDate, ...missingStudentRecords]
      .sort((a, b) => (Number(a.roll) || 0) - (Number(b.roll) || 0));
  }, [attendanceRecords, students, activeSelectedDate, selectedDept, selectedSemester, selectedSection, selectedSubject]);

  const selectedDateAttendance = useMemo(() => activeDateRecords.filter((record) => {
    const matchStatus = dateFilterStatus === 'all' || record.status === dateFilterStatus;
    const matchSearch =
      searchQuery.trim() === '' ||
      record.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.roll.includes(searchQuery);
    return matchStatus && matchSearch;
  }), [activeDateRecords, dateFilterStatus, searchQuery]);

  // Stats for the active selected date
  const activeDateStats = useMemo(() => {
    if (!activeSelectedDate) return null;

    const total = activeDateRecords.length;
    const present = activeDateRecords.filter((record) => record.status === 'present').length;
    const absent = activeDateRecords.filter((record) => record.status === 'absent').length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    return { total, present, absent, percentage };
  }, [activeDateRecords, activeSelectedDate]);

  // Relevant Students for Cumulative Report
  const relevantStudents = useMemo(() => {
    return students.filter((s) => {
      const matchDept = s.department === selectedDept;
      const matchSem = s.semester === selectedSemester;
      const matchSec = s.section === selectedSection;
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
        const matchMonth = r.date.startsWith(selectedMonth);
        const matchSub = r.subject === selectedSubject;
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

  const monthlyStudentRows = useMemo(() => relevantStudents.map((student) => {
    const records = attendanceRecords.filter((record) => {
      const sameStudent = record.studentId === student.id || record.roll === student.roll;
      const matchesMonth = record.date.startsWith(selectedMonth);
      const matchesDept = record.department === selectedDept;
      const matchesSemester = record.semester === selectedSemester;
      const matchesSection = record.section === selectedSection;
      const matchesSubject = record.subject === selectedSubject;
      return sameStudent && matchesMonth && matchesDept && matchesSemester && matchesSection && matchesSubject;
    });
    const present = records.filter((record) => record.status === 'present').length;
    const absent = records.filter((record) => record.status === 'absent').length;
    const presentDates = Array.from(new Set(records.filter((record) => record.status === 'present').map((record) => record.date))).sort();
    const absentDates = Array.from(new Set(records.filter((record) => record.status === 'absent').map((record) => record.date))).sort();
    const total = present + absent;
    return { student, present, absent, presentDates, absentDates, total, percentage: total ? Math.round((present / total) * 100) : null };
  }), [relevantStudents, attendanceRecords, selectedMonth, selectedDept, selectedSemester, selectedSection, selectedSubject]);

  const monthlyClassCount = useMemo(() => {
    const sessions = new Set<string>();
    attendanceRecords.forEach((record) => {
      const matchesMonth = record.date.startsWith(selectedMonth);
      const matchesDept = record.department === selectedDept;
      const matchesSemester = record.semester === selectedSemester;
      const matchesSection = record.section === selectedSection;
      const matchesSubject = record.subject === selectedSubject;
      if (matchesMonth && matchesDept && matchesSemester && matchesSection && matchesSubject) {
        sessions.add(`${record.date}|${record.subject}|${record.timeSlot || ''}`);
      }
    });
    return sessions.size;
  }, [attendanceRecords, selectedMonth, selectedDept, selectedSemester, selectedSection, selectedSubject]);

  const overallAttendanceRows = useMemo(() => {
    const currentMonth = new Date().toISOString().substring(0, 7);
    return relevantStudents.map((student) => {
      const records = attendanceRecords.filter((record) =>
        (record.studentId === student.id || record.roll === student.roll) &&
        record.date.substring(0, 7) >= overallStartMonth &&
        record.date.substring(0, 7) <= currentMonth &&
        record.department === selectedDept &&
        record.semester === selectedSemester &&
        record.section === selectedSection &&
        record.subject === selectedSubject
      );
      const monthStats = new Map<string, { present: number; total: number }>();
      records.forEach((record) => {
        const month = record.date.substring(0, 7);
        const stats = monthStats.get(month) || { present: 0, total: 0 };
        stats.total += 1;
        if (record.status === 'present') stats.present += 1;
        monthStats.set(month, stats);
      });
      const monthlyRates = Array.from(monthStats.values()).map((stats) => (stats.present / stats.total) * 100);
      const present = records.filter((record) => record.status === 'present').length;
      const absent = records.filter((record) => record.status === 'absent').length;
      return {
        student,
        total: present + absent,
        present,
        absent,
        averagePercentage: monthlyRates.length
          ? Math.round(monthlyRates.reduce((sum, rate) => sum + rate, 0) / monthlyRates.length)
          : null,
        monthsCounted: monthlyRates.length,
      };
    });
  }, [relevantStudents, attendanceRecords, overallStartMonth, selectedDept, selectedSemester, selectedSection, selectedSubject]);

  const overallAveragePercentage = useMemo(() => {
    const rowsWithAttendance = overallAttendanceRows.filter((row) => row.averagePercentage !== null);
    if (!rowsWithAttendance.length) return null;
    return Math.round(rowsWithAttendance.reduce((sum, row) => sum + (row.averagePercentage || 0), 0) / rowsWithAttendance.length);
  }, [overallAttendanceRows]);

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
                setSelectedSubject('');
              }}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
              {departments.length === 0 && <option value="">No departments configured</option>}
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
                setSelectedSubject('');
              }}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
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

      <div className="flex items-center gap-1 border-b border-slate-200" role="tablist" aria-label="Attendance report view">
        <button
          type="button"
          role="tab"
          aria-selected={reportTab === 'daily'}
          onClick={() => setReportTab('daily')}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${reportTab === 'daily' ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Calendar className="h-4 w-4" /> Daily Attendance
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={reportTab === 'monthly'}
          onClick={() => setReportTab('monthly')}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${reportTab === 'monthly' ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Layers className="h-4 w-4" /> Monthly Detailed Attendance
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={reportTab === 'overall'}
          onClick={() => setReportTab('overall')}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${reportTab === 'overall' ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <BarChart3 className="h-4 w-4" /> Overall Attendance
        </button>
      </div>

      {reportTab === 'daily' && <div className="space-y-6">
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

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => void handleSessionDelete()}
              disabled={isDeletingSessions}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                selectedSessionDates.length > 0
                  ? 'bg-rose-600 text-white hover:bg-rose-700'
                  : isSelectingSessionDates
                    ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
              }`}
            >
              {selectedSessionDates.length > 0 ? <Trash2 className="h-3.5 w-3.5" /> : null}
              {isDeletingSessions ? 'Deleting...' : selectedSessionDates.length > 0 ? 'Delete now' : isSelectingSessionDates ? 'Cancel' : 'Clear'}
            </button>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
              {classDatesInMonth.length} {classDatesInMonth.length === 1 ? 'Class Session' : 'Class Sessions'} Found
            </span>
          </div>
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
              const isMarkedForDeletion = selectedSessionDates.includes(session.date);
              const rate = session.total > 0 ? Math.round((session.present / session.total) * 100) : 0;

              return (
                <div key={session.date} className="flex items-center gap-2">
                  {isSelectingSessionDates && (
                    <input
                      type="checkbox"
                      checked={isMarkedForDeletion}
                      onChange={(event) => setSelectedSessionDates((dates) =>
                        event.target.checked
                          ? [...dates, session.date]
                          : dates.filter((date) => date !== session.date)
                      )}
                      aria-label={`Select attendance for ${formatDateLabel(session.date)} to delete`}
                      className="h-4 w-4 accent-rose-600"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedDate(session.date)}
                    className={`flex flex-col text-left p-3 rounded-xl border transition-all text-xs ${
                      isMarkedForDeletion
                        ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-200'
                        : isSelected
                          ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm ring-2 ring-emerald-500/30'
                          : 'bg-slate-50 hover:bg-slate-100/80 text-slate-800 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className={`font-bold font-mono ${isSelected && !isMarkedForDeletion ? 'text-white' : 'text-slate-900'}`}>
                        {formatDateLabel(session.date)}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isSelected && !isMarkedForDeletion
                            ? 'bg-emerald-900 text-emerald-200'
                            : rate >= 75
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {rate}%
                      </span>
                    </div>
                  </button>
                </div>
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
                {selectedDept} • {selectedSemester} • Section {selectedSection} • {selectedSubject || 'No subject selected'}
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
                    <th className="py-3 px-3 w-14 text-center">S/N</th>
                    <th className="py-3 px-4 w-28">Roll No</th>
                    <th className="py-3 px-4 min-w-[180px]">Student Name</th>
                    <th className="py-3 px-4 min-w-[150px]">Subject</th>
                    <th className="py-3 px-4 w-24 text-center">Section</th>
                    <th className="py-3 px-4 w-28 text-center">Status</th>
                    <th className="py-3 px-4 min-w-[160px]">Guardian Contact</th>
                    <th className="py-3 px-4 w-28 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedDateAttendance.map((record, index) => {
                    const matchedStudent = students.find((s) => s.id === record.studentId || s.roll === record.roll);
                    const isPresent = record.status === 'present';

                    return (
                      <tr
                        key={record.id}
                        className={`hover:bg-slate-50/80 transition ${
                          !isPresent ? 'bg-rose-50/30' : ''
                        }`}
                      >
                        <td className="py-3 px-3 text-center font-mono text-slate-500">{index + 1}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {record.roll}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {record.studentName}
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {record.subject || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            Sec {record.section}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {editingStatusRecordId === record.id ? (
                            <select
                              value={pendingStatus}
                              onChange={(event) => setPendingStatus(event.target.value as AttendanceRecord['status'])}
                              aria-label={`Attendance status for ${record.studentName}`}
                              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                              <option value="present">Present</option>
                              <option value="absent">Absent</option>
                            </select>
                          ) : (
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
                          )}
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
                          {editingStatusRecordId === record.id ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => void handleSaveStatus(record)}
                                disabled={isSavingStatus}
                                title="Save attendance status"
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-1.5 text-emerald-800 hover:bg-emerald-200 disabled:opacity-50"
                              >
                                <Save className="h-3.5 w-3.5" />
                                <span>Save</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingStatusRecordId(null)}
                                disabled={isSavingStatus}
                                title="Cancel status edit"
                                className="rounded-lg bg-slate-100 p-1.5 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingStatusRecordId(record.id);
                                  setPendingStatus(record.status);
                                }}
                                title="Edit attendance status"
                                className="rounded-lg bg-slate-100 p-1.5 text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
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
                                    {!isPresent ? 'Alert' : 'Call'}
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
                            </div>
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
      </div>}

      {reportTab === 'monthly' && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Layers className="h-4 w-4 text-emerald-700" />
                {formatMonthName(selectedMonth)} Detailed Attendance
              </h3>
              <p className="mt-1 text-[11px] text-slate-500">Each date and subject session is shown separately for every filtered student.</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-semibold">
              <span className="text-emerald-800">P Present</span>
              <span className="text-rose-700">A Absent</span>
              <span className="rounded-md bg-white px-2.5 py-1.5 text-slate-600 shadow-sm">
                {monthlyClassCount} {monthlyClassCount === 1 ? 'class' : 'classes'}
              </span>
            </div>
          </div>

          {monthlyStudentRows.length === 0 ? (
            <div className="p-10 text-center">
              <Calendar className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="text-xs font-semibold text-slate-700">No monthly attendance details found</p>
              <p className="mt-1 text-[11px] text-slate-500">Adjust the filters or add students to view monthly attendance.</p>
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full min-w-max border-separate border-spacing-0 text-left text-xs">
                <thead className="sticky top-0 z-20 bg-slate-100 text-[10px] uppercase text-slate-700">
                  <tr>
                    <th className="sticky left-0 z-30 w-12 min-w-12 border-b border-r border-slate-200 bg-slate-100 px-2 py-3 text-center">S/N</th>
                    <th className="sticky left-12 z-30 w-24 min-w-24 border-b border-r border-slate-200 bg-slate-100 px-3 py-3">Roll</th>
                    <th className="sticky left-36 z-30 min-w-40 border-b border-r border-slate-200 bg-slate-100 px-3 py-3">Student Name</th>
                    <th className="min-w-20 border-b border-r border-slate-200 bg-slate-100 px-2 py-3 text-center">Present</th>
                    <th className="min-w-20 border-b border-r border-slate-200 bg-slate-100 px-2 py-3 text-center">Absent</th>
                    <th className="min-w-20 border-b border-r border-slate-200 bg-slate-100 px-2 py-3 text-center">Rate</th>
                    <th className="sticky right-0 z-30 min-w-28 border-b border-slate-200 bg-slate-100 px-2 py-3 text-center">Guardian Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyStudentRows.map(({ student, total, present, absent, presentDates, absentDates, percentage }, index) => {
                    const isExpanded = expandedStatusDates?.studentId === student.id;
                    const expandedDates = isExpanded
                      ? expandedStatusDates.status === 'present' ? presentDates : absentDates
                      : [];
                    return (
                      <React.Fragment key={student.id}>
                        <tr className="hover:bg-slate-50">
                          <td className="sticky left-0 z-10 border-b border-r border-slate-100 bg-white px-2 py-3 text-center font-mono text-slate-500">{index + 1}</td>
                          <td className="sticky left-12 z-10 border-b border-r border-slate-100 bg-white px-3 py-3 font-mono font-bold text-slate-800">{student.roll}</td>
                          <td className="sticky left-36 z-10 border-b border-r border-slate-100 bg-white px-3 py-3 font-semibold text-slate-800">{student.name}</td>
                          <td className="border-b border-r border-slate-100 px-2 py-3 text-center">
                            <button
                              type="button"
                              disabled={presentDates.length === 0}
                              aria-expanded={isExpanded && expandedStatusDates?.status === 'present'}
                              onClick={() => setExpandedStatusDates(isExpanded && expandedStatusDates?.status === 'present' ? null : { studentId: student.id, status: 'present' })}
                              title="Show present dates"
                              className="rounded-md bg-emerald-50 px-2.5 py-1 font-mono font-bold text-emerald-800 hover:bg-emerald-100 disabled:cursor-default disabled:bg-transparent disabled:text-emerald-700"
                            >{present}</button>
                          </td>
                          <td className="border-b border-r border-slate-100 px-2 py-3 text-center">
                            <button
                              type="button"
                              disabled={absentDates.length === 0}
                              aria-expanded={isExpanded && expandedStatusDates?.status === 'absent'}
                              onClick={() => setExpandedStatusDates(isExpanded && expandedStatusDates?.status === 'absent' ? null : { studentId: student.id, status: 'absent' })}
                              title="Show absent dates"
                              className="rounded-md bg-rose-50 px-2.5 py-1 font-mono font-bold text-rose-800 hover:bg-rose-100 disabled:cursor-default disabled:bg-transparent disabled:text-rose-700"
                            >{absent}</button>
                          </td>
                          <td className="border-b border-r border-slate-100 px-2 py-3 text-center font-mono font-bold text-slate-800">{percentage === null ? 'N/A' : `${percentage}%`}</td>
                          <td className="sticky right-0 z-10 border-b border-slate-100 bg-white px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => setCallStudent(student)}
                              title={`Contact guardian ${student.guardianName} at ${student.guardianPhone}`}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 font-semibold text-emerald-800 hover:bg-emerald-100"
                            >
                              <PhoneCall className="h-3.5 w-3.5" />
                              <span>Contact</span>
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={7} className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`text-[11px] font-semibold ${expandedStatusDates.status === 'present' ? 'text-emerald-800' : 'text-rose-800'}`}>
                                  {expandedStatusDates.status === 'present' ? 'Present dates:' : 'Absent dates:'}
                                </span>
                                {expandedDates.map((date) => (
                                  <span key={date} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700">{formatDateLabel(date)}</span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {reportTab === 'overall' && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <BarChart3 className="h-4 w-4 text-emerald-700" /> Overall Attendance
              </h3>
              <p className="mt-1 text-[11px] text-slate-500">
                Average of each student&apos;s monthly attendance rates through {formatMonthName(new Date().toISOString().substring(0, 7))}.
              </p>
            </div>
            <label className="block w-full sm:w-56">
              <span className="mb-1 block text-[10px] font-bold uppercase text-slate-600">Count attendance from</span>
              <select
                value={overallStartMonth}
                onChange={(event) => setOverallStartMonth(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              >
                {availableMonths
                  .filter((month) => month <= new Date().toISOString().substring(0, 7))
                  .sort()
                  .map((month) => <option key={month} value={month}>{formatMonthName(month)}</option>)}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-slate-100 px-4 py-3 text-[11px] text-slate-600">
            <span>Period: <strong>{formatMonthName(overallStartMonth)} to {formatMonthName(new Date().toISOString().substring(0, 7))}</strong></span>
            <span>Average across students: <strong className="text-emerald-800">{overallAveragePercentage === null ? 'N/A' : `${overallAveragePercentage}%`}</strong></span>
            <span>{overallAttendanceRows.length} students</span>
          </div>

          {overallAttendanceRows.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">No students match the selected filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-slate-100 text-[10px] uppercase text-slate-700">
                  <tr>
                    <th className="w-14 px-3 py-3 text-center">S/N</th>
                    <th className="w-28 px-3 py-3">Roll</th>
                    <th className="min-w-40 px-3 py-3">Student Name</th>
                    <th className="w-24 px-3 py-3 text-center">Classes</th>
                    <th className="w-24 px-3 py-3 text-center">Present</th>
                    <th className="w-24 px-3 py-3 text-center">Absent</th>
                    <th className="w-36 px-3 py-3 text-center">Average Rate</th>
                    <th className="w-32 px-3 py-3 text-center">Guardian Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overallAttendanceRows.map(({ student, total, present, absent, averagePercentage, monthsCounted }, index) => (
                    <tr key={student.id} className="hover:bg-slate-50">
                      <td className="px-3 py-3 text-center font-mono text-slate-500">{index + 1}</td>
                      <td className="px-3 py-3 font-mono font-bold text-slate-800">{student.roll}</td>
                      <td className="px-3 py-3 font-semibold text-slate-800">{student.name}</td>
                      <td className="px-3 py-3 text-center font-mono text-slate-700">{total}</td>
                      <td className="px-3 py-3 text-center font-mono font-bold text-emerald-700">{present}</td>
                      <td className="px-3 py-3 text-center font-mono font-bold text-rose-700">{absent}</td>
                      <td className="px-3 py-3 text-center">
                        <span title={`${monthsCounted} month${monthsCounted === 1 ? '' : 's'} with attendance`} className={`rounded-md px-2.5 py-1 font-mono font-bold ${averagePercentage === null ? 'text-slate-400' : averagePercentage >= 75 ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                          {averagePercentage === null ? 'N/A' : `${averagePercentage}%`}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => setCallStudent(student)}
                          title={`Contact guardian ${student.guardianName} at ${student.guardianPhone}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 font-semibold text-emerald-800 hover:bg-emerald-100"
                        >
                          <PhoneCall className="h-3.5 w-3.5" /><span>Contact</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

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
