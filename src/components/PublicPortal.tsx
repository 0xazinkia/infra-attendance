import React, { useState, useMemo } from 'react';
import { 
  Search, 
  GraduationCap, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  BookOpen, 
  Phone, 
  ShieldCheck, 
  Mail,
  MapPin,
  Calendar,
  Award,
  Clock
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DEPARTMENTS } from '../data/mockData';
import { PublicTab } from './Header';

interface PublicPortalProps {
  activeTab?: PublicTab;
}

export const PublicPortal: React.FC<PublicPortalProps> = ({ activeTab = 'check' }) => {
  const { students, attendanceRecords } = useApp();

  // Student Roll Lookup state
  const [searchRoll, setSearchRoll] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // Filtered student search result
  const matchedStudent = useMemo(() => {
    if (!searchRoll.trim()) return null;
    const clean = searchRoll.trim().toLowerCase();
    return students.find((s) => s.roll.toLowerCase() === clean);
  }, [students, searchRoll]);

  // Attendance stats for searched student
  const studentAttendanceStats = useMemo(() => {
    if (!matchedStudent) return null;
    const records = attendanceRecords.filter(
      (r) => r.studentId === matchedStudent.id || r.roll === matchedStudent.roll
    );

    const total = records.length;
    const present = records.filter((r) => r.status === 'present').length;
    const absent = records.filter((r) => r.status === 'absent').length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 100;

    let btebCategory = 'Collegiate (Eligible for Board Exam)';
    let btebBadgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (total > 0) {
      if (percentage < 60) {
        btebCategory = 'Discollegiate (<60% Non-Eligible without Board Fine)';
        btebBadgeColor = 'bg-rose-100 text-rose-800 border-rose-300';
      } else if (percentage < 75) {
        btebCategory = 'Non-Collegiate (60%-74% Guardian Notice Required)';
        btebBadgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
      }
    }

    return {
      total,
      present,
      absent,
      percentage,
      btebCategory,
      btebBadgeColor,
      recentRecords: records.slice(-8).reverse(),
    };
  }, [matchedStudent, attendanceRecords]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
  };

  return (
    <div className="space-y-8 pb-8">
      {/* 1. HERO & ATTENDANCE VERIFICATION SECTION */}
      {(activeTab === 'check' || activeTab === undefined) && (
        <section className="space-y-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-850 to-emerald-950 p-6 sm:p-10 text-white shadow-xl border border-slate-800">
            <div className="relative z-10 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-4">
                <GraduationCap className="w-4 h-4" />
                <span>Infra Polytechnic Institute • Barishal (BTEB Code: 54049)</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-serif text-white">
                Student & Guardian Academic Attendance Portal
              </h1>

              <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed font-sans">
                Verify class presence, monitor semester attendance ratios, and stay informed on BTEB board examination eligibility.
              </p>

              {/* Quick Search Bar */}
              <form onSubmit={handleSearchSubmit} className="mt-6 flex flex-col sm:flex-row gap-2 max-w-xl">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchRoll}
                    onChange={(e) => {
                      setSearchRoll(e.target.value);
                      setHasSearched(false);
                    }}
                    placeholder="Enter BTEB Board Roll (e.g. 628401)..."
                    className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  <span>Check Attendance</span>
                </button>
              </form>
            </div>

            {/* Decorative circle glow */}
            <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          </div>

          {/* Search Result Card */}
          {hasSearched && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-300">
              {matchedStudent && studentAttendanceStats ? (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                        Student Attendance Verification Result
                      </span>
                      <h3 className="text-xl font-bold text-slate-900 mt-1">{matchedStudent.name}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <span className="font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-800">
                          Roll: {matchedStudent.roll}
                        </span>
                        <span>• {matchedStudent.department}</span>
                        <span>• {matchedStudent.semester} (Sec {matchedStudent.section})</span>
                      </div>
                    </div>

                    <div>
                      <span
                        className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold border ${studentAttendanceStats.btebBadgeColor}`}
                      >
                        {studentAttendanceStats.btebCategory}
                      </span>
                    </div>
                  </div>

                  {/* Attendance metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-xs font-semibold text-slate-500 block">Total Classes</span>
                      <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                        {studentAttendanceStats.total}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                      <span className="text-xs font-semibold text-emerald-700 block">Classes Present</span>
                      <p className="text-2xl font-bold text-emerald-800 mt-1 font-mono">
                        {studentAttendanceStats.present}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
                      <span className="text-xs font-semibold text-rose-700 block">Classes Absent</span>
                      <p className="text-2xl font-bold text-rose-800 mt-1 font-mono">
                        {studentAttendanceStats.absent}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-900 text-white">
                      <span className="text-xs font-semibold text-slate-400 block">Attendance Rate</span>
                      <p className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
                        {studentAttendanceStats.percentage}%
                      </p>
                    </div>
                  </div>

                  {/* Recent Attendance Sessions */}
                  {studentAttendanceStats.recentRecords.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-slate-100">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                        Recent Class Attendance Ledger
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase">
                            <tr>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Subject</th>
                              <th className="py-2.5 px-3">Status</th>
                              <th className="py-2.5 px-3">Remarks</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {studentAttendanceStats.recentRecords.map((r) => (
                              <tr key={r.id}>
                                <td className="py-2 px-3 font-mono text-slate-600">{r.date}</td>
                                <td className="py-2 px-3 font-medium text-slate-800">{r.subject}</td>
                                <td className="py-2 px-3">
                                  {r.status === 'present' ? (
                                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      Present
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded text-[11px]">
                                      <XCircle className="w-3 h-3 text-rose-600" />
                                      Absent
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-slate-500 italic">
                                  {r.remarks || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">
                    No Record Found for Roll &quot;{searchRoll}&quot;
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    Please check the roll number entered, or contact the Infra Polytechnic Institute academic office for assistance.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* 2. BTEB REGULATIONS SECTION */}
      {(activeTab === 'rules' || activeTab === 'check') && (
        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Bangladesh Technical Education Board (BTEB) Attendance Regulations
              </h2>
              <p className="text-xs text-slate-500">
                Official rules governing collegiate status and examination eligibility for Diploma in Engineering
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                1. Regular Collegiate Status
              </span>
              <p className="text-xl font-bold text-emerald-900 mt-1 font-mono">≥ 75% Attendance</p>
              <p className="text-xs text-emerald-700 mt-2 leading-relaxed">
                Students attending 75% or more classes throughout the semester are designated Regular Collegiate and unconditionally permitted to sit for BTEB Board Final Examinations.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
                2. Non-Collegiate Status
              </span>
              <p className="text-xl font-bold text-amber-900 mt-1 font-mono">60% - 74% Attendance</p>
              <p className="text-xs text-amber-700 mt-2 leading-relaxed">
                Attendance falling between 60% and 74% classifies a student as Non-Collegiate. Formal guardian consultation and BTEB non-collegiate fines are required for exam clearance.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block">
                3. Discollegiate Status
              </span>
              <p className="text-xl font-bold text-rose-900 mt-1 font-mono">&lt; 60% Attendance</p>
              <p className="text-xs text-rose-700 mt-2 leading-relaxed">
                Students with less than 60% class attendance are classified Discollegiate. According to BTEB regulations, discollegiate students are strictly barred from the semester final exams.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 3. DEPARTMENTS & DISCIPLINES SECTION */}
      {(activeTab === 'departments' || activeTab === 'check') && (
        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Diploma in Engineering Academic Departments
              </h2>
              <p className="text-xs text-slate-500">
                Four-year technical diploma curriculum accredited under the National Skill Standard
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {DEPARTMENTS.map((dept, idx) => (
              <div key={dept} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/70 transition">
                <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                  Dept 0{idx + 1}
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-2">{dept}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  8 Semesters • BTEB Curriculum
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. HELPLINE & CAMPUS INFORMATION */}
      {(activeTab === 'contact' || activeTab === 'check') && (
        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
              <Phone className="w-5 h-5 text-indigo-700" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Campus Location & Guardian Support Helpline
              </h2>
              <p className="text-xs text-slate-500">
                Get in touch with Infra Polytechnic Institute administrative and academic divisions
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 flex-shrink-0 mt-0.5">
                <MapPin className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Campus Address</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Infra Polytechnic Institute<br />
                  Rupatali, Barishal - 8200, Bangladesh
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 flex-shrink-0 mt-0.5">
                <Phone className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Helpline Contacts</h4>
                <p className="text-xs font-mono text-slate-800 mt-1 font-semibold">+880 1712-345678</p>
                <p className="text-xs font-mono text-slate-800 font-semibold">+880 1819-234500</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 flex-shrink-0 mt-0.5">
                <Clock className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Office Hours</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Saturday — Thursday: 09:00 AM – 05:00 PM<br />
                  Friday: Closed
                </p>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
