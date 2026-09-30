import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Cloud, Database, Download, Edit3, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SubjectManagerSection } from './SubjectManagerSection';

export const GoogleSheetsSettings: React.FC = () => {
  const {
    user,
    databaseStatus,
    loginWithGoogle,
    logoutUser,
    refreshDatabase,
    importFromGoogleSheet,
    importLocalDataToFirebase,
    authorizedAdmins,
    addAdminEmail,
    removeAdminEmail,
    students,
    attendanceRecords,
    callLogs,
    subjects,
    departments,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    clearAttendanceRange,
  } = useApp();
  const [activeTab, setActiveTab] = useState<'departments' | 'subjects'>('departments');
  const [newDepartment, setNewDepartment] = useState('');
  const [sheetInput, setSheetInput] = useState('');
  const [adminInput, setAdminInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [showClearControls, setShowClearControls] = useState(false);
  const [clearDepartment, setClearDepartment] = useState<string>('all');
  const [clearStartMonth, setClearStartMonth] = useState(() => new Date().toISOString().substring(0, 7));
  const [clearEndMonth, setClearEndMonth] = useState(() => new Date().toISOString().substring(0, 7));
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    attendanceRecords.forEach((record) => {
      if (record.date && record.date.length >= 7) {
        monthSet.add(record.date.substring(0, 7));
      }
    });
    monthSet.add(new Date().toISOString().substring(0, 7));
    return Array.from(monthSet).sort().reverse();
  }, [attendanceRecords]);

  const formatMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    if (!year || !month) return monthStr;
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  };

  const runAction = async (action: () => Promise<void>, successText: string) => {
    setBusy(true);
    setFeedback(null);
    try {
      await action();
      setFeedback({ kind: 'success', text: successText });
    } catch (error) {
      setFeedback({ kind: 'error', text: error instanceof Error ? error.message : 'Action failed.' });
    } finally {
      setBusy(false);
    }
  };

  const handleAddAdmin = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await addAdminEmail(adminInput);
    setFeedback({ kind: result.success ? 'success' : 'error', text: result.message });
    if (result.success) setAdminInput('');
  };

  const handleAddDepartment = async () => {
    const cleanName = newDepartment.trim();
    if (!cleanName) {
      setFeedback({ kind: 'error', text: 'Department name is required.' });
      return;
    }
    try {
      const added = await addDepartment(cleanName);
      setNewDepartment('');
      setFeedback({ kind: 'success', text: `Department "${added}" added successfully.` });
    } catch (error) {
      setFeedback({ kind: 'error', text: error instanceof Error ? error.message : 'Could not add department.' });
    }
  };

  const handleEditDepartment = async (department: string) => {
    const name = window.prompt('Update department name', department);
    if (name === null || !name.trim() || name.trim() === department) return;
    try {
      const updated = await updateDepartment(department, name);
      setFeedback({ kind: 'success', text: `Department renamed to "${updated}".` });
    } catch (error) {
      setFeedback({ kind: 'error', text: error instanceof Error ? error.message : 'Could not update department.' });
    }
  };

  const handleDeleteDepartment = async (department: string) => {
    if (!window.confirm(`Delete "${department}" from the department list? Existing student and attendance records will be kept.`)) return;
    try {
      await deleteDepartment(department);
      setFeedback({ kind: 'success', text: `Department "${department}" deleted.` });
    } catch (error) {
      setFeedback({ kind: 'error', text: error instanceof Error ? error.message : 'Could not delete department.' });
    }
  };

  const handleClearAttendanceRange = async () => {
    const fromMonth = clearStartMonth <= clearEndMonth ? clearStartMonth : clearEndMonth;
    const toMonth = clearStartMonth <= clearEndMonth ? clearEndMonth : clearStartMonth;
    const departmentFilter = clearDepartment === 'all' ? 'all' : clearDepartment;
    const matches = attendanceRecords.filter((record) => {
      const recordMonth = record.date.substring(0, 7);
      const matchesMonth = recordMonth >= fromMonth && recordMonth <= toMonth;
      const matchesDepartment = departmentFilter === 'all' || record.department === departmentFilter;
      return matchesMonth && matchesDepartment;
    });

    if (matches.length === 0) {
      setFeedback({ kind: 'error', text: 'No attendance records were found for the selected department and month range.' });
      return;
    }

    const departmentLabel = departmentFilter === 'all' ? 'all departments' : departmentFilter;
    const confirmed = window.confirm(
      `Delete ${matches.length} attendance record(s) for ${departmentLabel} from ${formatMonthName(fromMonth)} to ${formatMonthName(toMonth)}? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const removedCount = await clearAttendanceRange(fromMonth, toMonth, departmentFilter);
      setShowClearControls(false);
      setFeedback({ kind: 'success', text: `Deleted ${removedCount} attendance record(s) successfully.` });
    } catch (error) {
      setFeedback({ kind: 'error', text: error instanceof Error ? error.message : 'Could not clear attendance for the selected department and month range.' });
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Firebase Database</h2>
              <p className="mt-0.5 text-xs text-slate-500">Institute records are stored in Cloud Firestore.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <button onClick={logoutUser} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                Sign out
              </button>
            ) : (
              <button onClick={() => void runAction(loginWithGoogle, 'Signed in and loaded Firebase data.')} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800">
                Sign in with Google
              </button>
            )}
            <button
              onClick={() => void runAction(refreshDatabase, 'Firebase data refreshed.')}
              disabled={!user || busy || databaseStatus.isLoading}
              title="Refresh Firebase data"
              className="rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <RefreshCw className={`h-4 w-4 ${databaseStatus.isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs">
          <span className={`h-2.5 w-2.5 rounded-full ${databaseStatus.isConnected && databaseStatus.isOnline ? 'bg-emerald-500' : databaseStatus.isConnected ? 'bg-amber-500' : 'bg-slate-300'}`} />
          <span className="font-semibold text-slate-800">
            {databaseStatus.isLoading ? 'Loading Firebase data...' : databaseStatus.isConnected ? databaseStatus.isOnline ? 'Connected to Firebase' : 'Offline · using saved data' : user ? 'Firebase unavailable' : 'Sign in to connect'}
          </span>
          {databaseStatus.pendingWrites > 0 && <span className="text-sky-700">{databaseStatus.pendingWrites} change(s) syncing</span>}
          {user?.email && <span className="text-slate-500">({user.email})</span>}
        </div>
        {databaseStatus.error && <p className="mt-2 text-xs text-rose-700">{databaseStatus.error}</p>}

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {([
            ['Students', students.length, null],
            ['Attendance', attendanceRecords.length, () => setShowClearControls((value) => !value)],
            ['Guardian calls', callLogs.length, null],
            ['Subjects', subjects.length, null],
          ] as [string, number, (() => void) | null][]).map(([label, count, onClearClick]) => (
            <div key={label as string} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase text-slate-500">{label}</p>
                {label === 'Attendance' && onClearClick && (
                  <button
                    type="button"
                    onClick={onClearClick}
                    className="rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="mt-1 text-xl font-bold text-slate-900">{count}</p>
            </div>
          ))}
        </div>

        {showClearControls && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="flex-1">
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-600">Department</label>
                <select
                  value={clearDepartment}
                  onChange={(event) => setClearDepartment(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="all">All departments</option>
                  {departments.map((department) => (
                    <option key={department} value={department}>{department}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1">
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-600">From month</label>
                <select
                  value={clearStartMonth}
                  onChange={(event) => setClearStartMonth(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  {availableMonths.map((month) => (
                    <option key={month} value={month}>{formatMonthName(month)}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1">
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-600">To month</label>
                <select
                  value={clearEndMonth}
                  onChange={(event) => setClearEndMonth(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  {availableMonths.map((month) => (
                    <option key={month} value={month}>{formatMonthName(month)}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => void handleClearAttendanceRange()}
                className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
              >
                Delete Attendance
              </button>
            </div>
          </div>
        )}

        {feedback && (
          <div className={`mt-4 flex items-center gap-2 rounded-lg border p-3 text-xs ${feedback.kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
            {feedback.kind === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span>{feedback.text}</span>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Cloud className="h-5 w-5 text-sky-700" />
          <h3 className="text-sm font-bold text-slate-900">One-time Google Sheets Import</h3>
        </div>
        <p className="mt-1 text-xs text-slate-500">Import existing Students, Attendance, Guardian Call Logs, and Subjects into Firestore. Future changes are saved only to Firebase.</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void runAction(() => importFromGoogleSheet(sheetInput), 'Google Sheets data imported into Firebase.');
          }}
          className="mt-4 flex flex-col gap-2 sm:flex-row"
        >
          <input
            value={sheetInput}
            onChange={(event) => setSheetInput(event.target.value)}
            placeholder="Google Sheet URL or spreadsheet ID"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
          <button disabled={!user || busy || !sheetInput.trim()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40">
            <Download className="h-4 w-4" />
            {busy ? 'Working...' : 'Import to Firebase'}
          </button>
        </form>
        <button
          onClick={() => void runAction(importLocalDataToFirebase, 'Browser data imported to Firebase and removed from local storage.')}
          disabled={!user || busy}
          className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          Import this browser&apos;s saved data
        </button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <ShieldCheck className="h-5 w-5 text-emerald-700" />
          <h3 className="text-sm font-bold text-slate-900">Manage Institute Data</h3>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('departments')}
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${activeTab === 'departments' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            Departments
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('subjects')}
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${activeTab === 'subjects' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            Subjects
          </button>
        </div>

        {activeTab === 'departments' ? (
          <div className="mt-4 space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={newDepartment}
                onChange={(event) => setNewDepartment(event.target.value)}
                placeholder="Add department name"
                disabled={!user || !databaseStatus.isConnected || busy}
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
              <button
                type="button"
                onClick={() => void handleAddDepartment()}
                disabled={!user || !databaseStatus.isConnected || busy || !newDepartment.trim()}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                Add Department
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {departments.map((department) => (
                <div key={department} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-700">
                  <span>{department}</span>
                  <button
                    type="button"
                    onClick={() => void handleEditDepartment(department)}
                    disabled={!user || !databaseStatus.isConnected || busy}
                    title={`Edit ${department}`}
                    aria-label={`Edit ${department}`}
                    className="text-emerald-700 hover:text-emerald-900 disabled:opacity-40"
                  ><Edit3 className="h-3.5 w-3.5" /></button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteDepartment(department)}
                    disabled={!user || !databaseStatus.isConnected || busy}
                    title={`Delete ${department}`}
                    aria-label={`Delete ${department}`}
                    className="text-rose-700 hover:text-rose-900 disabled:opacity-40"
                  ><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
              {departments.length === 0 && <p className="text-xs text-slate-500">No departments yet. Add one above.</p>}
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <SubjectManagerSection />
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <ShieldCheck className="h-5 w-5 text-emerald-700" />
          <h3 className="text-sm font-bold text-slate-900">Authorized Administrators</h3>
        </div>
        <div className="mt-3 space-y-2">
          {authorizedAdmins.map((email) => (
            <div key={email} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
              <span className="font-mono text-slate-800">{email}</span>
              <button
                disabled={!user || authorizedAdmins.length <= 1}
                onClick={async () => {
                  const result = await removeAdminEmail(email);
                  setFeedback({ kind: result.success ? 'success' : 'error', text: result.message });
                }}
                className="text-rose-700 disabled:opacity-40"
              >Remove</button>
            </div>
          ))}
        </div>
        <form onSubmit={handleAddAdmin} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input value={adminInput} onChange={(event) => setAdminInput(event.target.value)} type="email" placeholder="Administrator email" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs" />
          <button disabled={!user || !adminInput.trim()} className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">Add administrator</button>
        </form>
      </section>

    </div>
  );
};
