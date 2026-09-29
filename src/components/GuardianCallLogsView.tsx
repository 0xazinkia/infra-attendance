import React, { useState, useMemo } from 'react';
import { PhoneCall, Phone, Search, Clock, CheckCircle2, AlertCircle, MessageSquare, User } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const GuardianCallLogsView: React.FC = () => {
  const { callLogs, students } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredLogs = useMemo(() => {
    return callLogs.filter((log) => {
      const rollStr = log.roll || log.studentRoll || '';
      const noteStr = log.note || log.conversationNote || '';
      const statusStr = log.status || log.callStatus || '';

      const matchSearch =
        log.studentName.toLowerCase().includes(search.toLowerCase()) ||
        rollStr.includes(search) ||
        log.guardianPhone.includes(search) ||
        log.guardianName.toLowerCase().includes(search.toLowerCase()) ||
        noteStr.toLowerCase().includes(search.toLowerCase());

      const matchStatus = statusFilter === 'all' || statusStr === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [callLogs, search, statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'answered':
        return <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full">✅ Answered</span>;
      case 'promised_attendance':
        return <span className="bg-teal-100 text-teal-800 text-[11px] font-bold px-2 py-0.5 rounded-full">🤝 Promised Next Class</span>;
      case 'left_message':
        return <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-full">💬 Left SMS/WhatsApp</span>;
      case 'unreachable':
        return <span className="bg-amber-100 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded-full">⚠️ Unreachable / Busy</span>;
      case 'switched_off':
        return <span className="bg-rose-100 text-rose-800 text-[11px] font-bold px-2 py-0.5 rounded-full">❌ Switched Off</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-[11px] font-bold px-2 py-0.5 rounded-full">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-emerald-600" />
              <span>Guardian Helpline & Absentee Communication Logs</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              History of outbound calls, SMS notices, and parental remarks regarding student attendance
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              Total Recorded Calls: <strong className="text-slate-900">{callLogs.length}</strong>
            </span>
          </div>
        </div>

        {/* Filter & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search call logs by student, roll, guardian name, or phone..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-700 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="all">All Call Outcomes</option>
              <option value="answered">Answered - Spoke with Guardian</option>
              <option value="promised_attendance">Promised to Attend</option>
              <option value="left_message">Left Message</option>
              <option value="unreachable">Unreachable / Busy</option>
              <option value="switched_off">Switched Off</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800">
            Recorded Calls ({filteredLogs.length})
          </span>
          <span className="text-slate-500 text-[11px]">
            Infra Polytechnic Institute • Barishal
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
              <PhoneCall className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No Guardian Calls Recorded Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              When students are marked absent, clicking &quot;Call Guardian&quot; or &quot;Notice / Log&quot; allows you to record the conversation outcome directly into this log and Google Sheets.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-32">Call Time</th>
                  <th className="py-3 px-4 w-28">Roll No</th>
                  <th className="py-3 px-4 min-w-[160px]">Student Name</th>
                  <th className="py-3 px-4 min-w-[180px]">Guardian Contact</th>
                  <th className="py-3 px-4 w-36">Call Purpose</th>
                  <th className="py-3 px-4 w-36">Outcome</th>
                  <th className="py-3 px-4 min-w-[200px]">Faculty Notes</th>
                  <th className="py-3 px-4 w-20 text-center">Dial</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                      {log.callTime}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {log.roll || log.studentRoll}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {log.studentName}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{log.guardianName}</div>
                      <div className="font-mono text-emerald-800 font-semibold text-[11px]">
                        {log.guardianPhone}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {log.reason || log.callPurpose}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(log.status || log.callStatus || '')}
                    </td>
                    <td className="py-3 px-4 text-slate-600 italic">
                      {log.note || log.conversationNote || 'No notes added'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <a
                        href={`tel:${log.guardianPhone}`}
                        title="Call again"
                        className="p-1.5 inline-flex items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
