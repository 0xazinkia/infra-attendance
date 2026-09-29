import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  ExternalLink, 
  RefreshCw, 
  Plus, 
  Link as LinkIcon, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  LogOut, 
  Layers, 
  Table, 
  Users, 
  ClipboardCheck, 
  PhoneCall,
  Unlink,
  UserPlus,
  Trash2,
  Mail,
  ShieldAlert,
  BookOpen
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SubjectManagerSection } from './SubjectManagerSection';

export const GoogleSheetsSettings: React.FC = () => {
  const { 
    user, 
    sheetStatus, 
    loginWithGoogle, 
    logoutUser, 
    syncWithSheets, 
    setupNewSpreadsheet, 
    linkExistingSpreadsheet,
    clearSheetConnection,
    students,
    attendanceRecords,
    callLogs,
    subjects,
    authorizedAdmins,
    addAdminEmail,
    removeAdminEmail
  } = useApp();

  const [customSheetInput, setCustomSheetInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // New admin email state
  const [newAdminInput, setNewAdminInput] = useState('');
  const [adminFeedback, setAdminFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminInput.trim()) return;
    const res = addAdminEmail(newAdminInput.trim());
    if (res.success) {
      setAdminFeedback({ text: res.message, type: 'success' });
      setNewAdminInput('');
    } else {
      setAdminFeedback({ text: res.message, type: 'error' });
    }
  };

  const handleRemoveAdmin = (email: string) => {
    if (window.confirm(`Are you sure you want to revoke admin access for "${email}"?`)) {
      const res = removeAdminEmail(email);
      if (res.success) {
        setAdminFeedback({ text: res.message, type: 'success' });
      } else {
        setAdminFeedback({ text: res.message, type: 'error' });
      }
    }
  };

  const handleCreateSheet = async () => {
    setIsCreating(true);
    setFeedbackMsg(null);
    try {
      if (!user) {
        await loginWithGoogle();
      }
      await setupNewSpreadsheet();
      setFeedbackMsg({
        text: 'New Google Spreadsheet successfully created in your Google Drive with all 3 worksheets!',
        type: 'success',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create spreadsheet';
      setFeedbackMsg({ text: msg, type: 'error' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleLinkSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSheetInput.trim()) return;

    setIsLinking(true);
    setFeedbackMsg(null);
    try {
      if (!user) {
        await loginWithGoogle();
      }
      await linkExistingSpreadsheet(customSheetInput);
      setFeedbackMsg({
        text: 'Existing Google Spreadsheet linked and synchronized successfully!',
        type: 'success',
      });
      setCustomSheetInput('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to link spreadsheet';
      setFeedbackMsg({ text: msg, type: 'error' });
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Google Sheets Live Cloud Integration
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Sync students roster, daily class attendance logs, and guardian call histories directly into your Google Sheets spreadsheet
            </p>
          </div>
        </div>

        {/* Feedback alert */}
        {feedbackMsg && (
          <div
            className={`mt-4 p-4 rounded-xl flex items-center gap-3 text-xs ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <p className="font-medium">{feedbackMsg.text}</p>
          </div>
        )}

        {/* Google Authentication Box */}
        <div className="mt-6 p-5 rounded-xl border border-slate-200 bg-slate-50/70">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Google Account Authorization
              </span>
              {user ? (
                <div className="flex items-center gap-3 mt-1.5">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Google Account'}
                      className="w-10 h-10 rounded-full border-2 border-emerald-500"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center">
                      {user.displayName?.[0] || 'U'}
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {user.displayName || 'Authorized Google User'}
                    </h4>
                    <p className="text-xs text-slate-500 font-mono">{user.email}</p>
                  </div>
                </div>
              ) : (
                <div className="mt-1">
                  <h4 className="text-sm font-bold text-slate-800">
                    Not Connected to Google Account
                  </h4>
                  <p className="text-xs text-slate-500">
                    Sign in with Google to grant access to your Google Sheets & Google Drive
                  </p>
                </div>
              )}
            </div>

            {/* Official Google Sign in or Sign out button */}
            <div>
              {user ? (
                <button
                  onClick={logoutUser}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out Google Account</span>
                </button>
              ) : (
                <button
                  onClick={loginWithGoogle}
                  className="flex items-center gap-3 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 shadow-sm transition hover:shadow"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                  <span>Sign in with Google</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Authorized Administrator Accounts Whitelist Management */}
        <div className="mt-6 p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Authorized Administrator Google Accounts
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Only Google accounts listed below can log into this administrative system via <code className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded font-mono">/admin-access</code>
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
              {authorizedAdmins.length} Authorized {authorizedAdmins.length === 1 ? 'Admin' : 'Admins'}
            </span>
          </div>

          {adminFeedback && (
            <div
              className={`mt-3 p-3 rounded-xl flex items-center gap-2.5 text-xs ${
                adminFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {adminFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              )}
              <span className="font-medium">{adminFeedback.text}</span>
            </div>
          )}

          {/* List of currently authorized admin accounts */}
          <div className="mt-4 space-y-2">
            {authorizedAdmins.map((email) => {
              const isCurrentUser = user?.email?.toLowerCase().trim() === email.toLowerCase().trim();
              const isOnlyAdmin = authorizedAdmins.length === 1;

              return (
                <div
                  key={email}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="font-mono text-xs font-bold text-slate-800 truncate">
                      {email}
                    </span>
                    {isCurrentUser && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Current Active Session
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleRemoveAdmin(email)}
                    disabled={isOnlyAdmin}
                    title={isOnlyAdmin ? 'Cannot remove the only remaining admin' : `Revoke admin access for ${email}`}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Form to add a new admin email */}
          <form onSubmit={handleAddAdmin} className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={newAdminInput}
              onChange={(e) => setNewAdminInput(e.target.value)}
              placeholder="Add new admin email (e.g. colleague@gmail.com)..."
              className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
            />
            <button
              type="submit"
              disabled={!newAdminInput.trim()}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Grant Admin Access</span>
            </button>
          </form>

          {/* Information box regarding Google Cloud Console Test Users */}
          <div className="mt-3 p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] text-blue-900 leading-relaxed">
            <span className="font-bold flex items-center gap-1 text-blue-800 mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Google OAuth Authorization Notice:</span>
            </span>
            <span>
              Any authorized email above can now log into the admin panel without being blocked. If an account other than the project owner ({authorizedAdmins[0]}) also needs to directly authorize personal Google Drive/Sheets sync, add their email under <strong>Google Cloud Console &gt; APIs &amp; Services &gt; OAuth consent screen &gt; Test users</strong>.
            </span>
          </div>
        </div>

        {/* Current Active Spreadsheet Card */}
        {sheetStatus.spreadsheetId ? (
          <div className="mt-6 p-5 rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-50/50 to-teal-50/30">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                    Active Google Spreadsheet
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {sheetStatus.spreadsheetName || 'Infra Polytechnic Institute Roster'}
                </h3>
                <p className="text-xs text-slate-600 font-mono mt-0.5">
                  ID: {sheetStatus.spreadsheetId}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Last Synced: <strong>{sheetStatus.lastSyncedAt || 'Never'}</strong>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {sheetStatus.spreadsheetUrl && (
                  <a
                    href={sheetStatus.spreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Open in Google Sheets</span>
                  </a>
                )}

                <button
                  onClick={() => syncWithSheets()}
                  disabled={sheetStatus.isSyncing}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 font-semibold text-xs rounded-xl border border-slate-300 shadow-xs transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${sheetStatus.isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
                  <span>{sheetStatus.isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                </button>

                <button
                  onClick={clearSheetConnection}
                  title="Unlink spreadsheet from app"
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition"
                >
                  <Unlink className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 p-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center">
            <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800">No Google Spreadsheet Linked</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Create a dedicated attendance spreadsheet in your Google Drive or link an existing Google Sheet ID.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handleCreateSheet}
                disabled={isCreating}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>{isCreating ? 'Creating Sheet...' : 'Create New Spreadsheet in Drive'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Link Existing Spreadsheet Form */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <LinkIcon className="w-4 h-4 text-teal-600" />
            <span>Link Existing Google Spreadsheet</span>
          </h4>
          <p className="text-xs text-slate-500 mb-3">
            Have an existing spreadsheet? Paste the full Google Sheet URL or Spreadsheet ID below:
          </p>

          <form onSubmit={handleLinkSheet} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={customSheetInput}
              onChange={(e) => setCustomSheetInput(e.target.value)}
              placeholder="e.g. https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
              className="flex-1 text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
            />
            <button
              type="submit"
              disabled={isLinking || !customSheetInput.trim()}
              className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>{isLinking ? 'Verifying...' : 'Link Spreadsheet'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Dynamic Academic Subjects Management Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <SubjectManagerSection />
      </div>

      {/* Structure & Architecture Specification */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
          <Layers className="w-4 h-4 text-emerald-600" />
          <span>Google Sheets Schema & Worksheet Architecture</span>
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          The app automatically manages and synchronizes four dedicated worksheets in your Google Sheet:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Sheet 1: Students */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>1. &quot;Students&quot; Worksheet</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Current student directory ({students.length} rows)
            </p>
            <div className="mt-3 text-[11px] text-slate-600 space-y-1 font-mono bg-white p-2 rounded border border-slate-200">
              <p>• ID, Roll No, Student Name</p>
              <p>• Department, Semester, Section</p>
              <p>• Student Phone, Guardian Name</p>
              <p>• Guardian Phone, Relation, Remarks</p>
            </div>
          </div>

          {/* Sheet 2: Attendance */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
              <ClipboardCheck className="w-4 h-4 text-teal-600" />
              <span>2. &quot;Attendance&quot; Worksheet</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Historical class attendance logs ({attendanceRecords.length} entries)
            </p>
            <div className="mt-3 text-[11px] text-slate-600 space-y-1 font-mono bg-white p-2 rounded border border-slate-200">
              <p>• Attendance ID, Date, Subject</p>
              <p>• Department, Semester, Section</p>
              <p>• Student ID, Roll No, Name</p>
              <p>• Status (Present, Absent)</p>
              <p>• Guardian Phone, Recorded By</p>
            </div>
          </div>

          {/* Sheet 3: Guardian Call Logs */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
              <PhoneCall className="w-4 h-4 text-rose-600" />
              <span>3. &quot;GuardianCallLogs&quot;</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Guardian calling record & notes ({callLogs.length} logs)
            </p>
            <div className="mt-3 text-[11px] text-slate-600 space-y-1 font-mono bg-white p-2 rounded border border-slate-200">
              <p>• Log ID, Student ID, Roll No</p>
              <p>• Student Name, Guardian Name</p>
              <p>• Guardian Phone, Call Time</p>
              <p>• Call Purpose, Call Status</p>
              <p>• Faculty Conversation Note</p>
            </div>
          </div>

          {/* Sheet 4: Subjects */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>4. &quot;Subjects&quot; Worksheet</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Curriculum catalog ({subjects.length} subjects)
            </p>
            <div className="mt-3 text-[11px] text-slate-600 space-y-1 font-mono bg-white p-2 rounded border border-slate-200">
              <p>• Subject Code</p>
              <p>• Subject Name / Title</p>
              <p>• Department / Technology</p>
              <p>• Semester (1st to 8th)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
