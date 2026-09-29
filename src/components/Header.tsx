import React from 'react';
import { 
  GraduationCap, 
  FileSpreadsheet, 
  RefreshCw, 
  ExternalLink, 
  AlertCircle,
  LogOut,
  PhoneCall,
  User as UserIcon,
  ClipboardCheck,
  Users,
  BarChart3,
  ShieldCheck,
  Search,
  BookOpen,
  Phone
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export type PublicTab = 'check' | 'rules' | 'departments' | 'contact';

interface HeaderProps {
  isAdminMode: boolean;
  activeTab: 'attendance' | 'students' | 'reports' | 'callLogs' | 'sheets';
  setActiveTab: (tab: 'attendance' | 'students' | 'reports' | 'callLogs' | 'sheets') => void;
  publicTab?: PublicTab;
  setPublicTab?: (tab: PublicTab) => void;
  onExitAdmin: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  isAdminMode, 
  activeTab, 
  setActiveTab,
  publicTab = 'check',
  setPublicTab,
  onExitAdmin 
}) => {
  const { user, sheetStatus, loginWithGoogle, logoutUser, syncWithSheets } = useApp();

  return (
    <header className="bg-slate-900 text-white shadow-xl border-b border-slate-800 sticky top-0 z-40">
      {/* Top institutional ribbon: ONLY shown in Admin Mode, completely removed from Public Panel */}
      {isAdminMode && (
        <div className="border-b border-slate-800/80 bg-slate-950/70 px-4 py-2 sm:px-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Faculty & Admin Workspace</span>
              </span>
              <span className="text-slate-400 hidden sm:inline">
                Infra Polytechnic Institute • College Code: 54049
              </span>
            </div>

            {/* Ribbon Controls: Admin Google Sheets & Account */}
            <div className="flex items-center gap-2">
              {sheetStatus.spreadsheetId ? (
                <div className="flex items-center gap-1.5 bg-slate-800/90 border border-emerald-500/40 text-emerald-300 px-2.5 py-1 rounded-full text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-medium truncate max-w-[150px]">
                    {sheetStatus.spreadsheetName || 'Sheets Connected'}
                  </span>
                  {sheetStatus.spreadsheetUrl && (
                    <a
                      href={sheetStatus.spreadsheetUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="Open Spreadsheet in new tab"
                      className="text-slate-400 hover:text-white ml-0.5"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  <button
                    onClick={() => syncWithSheets()}
                    disabled={sheetStatus.isSyncing}
                    title="Sync with Google Sheets"
                    className="ml-1 p-0.5 hover:text-white transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${sheetStatus.isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setActiveTab('sheets')}
                  className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 px-2.5 py-1 rounded-full text-xs transition"
                >
                  <AlertCircle className="w-3 h-3" />
                  <span>Connect Sheets</span>
                </button>
              )}

              {/* Admin Google Account & Sign Out */}
              {user ? (
                <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Faculty'}
                      className="w-5 h-5 rounded-full border border-slate-600"
                    />
                  ) : (
                    <UserIcon className="w-4 h-4 text-slate-400" />
                  )}
                  <span className="text-slate-300 font-medium hidden md:inline truncate max-w-[110px]">
                    {user.displayName?.split(' ')[0] || 'Faculty'}
                  </span>
                  <button
                    onClick={logoutUser}
                    title="Sign out Google Account"
                    className="text-slate-400 hover:text-rose-400 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={loginWithGoogle}
                  className="flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-800 font-medium px-2.5 py-1 rounded-full text-xs transition shadow-sm"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                  <span>Google Sign-In</span>
                </button>
              )}

              {/* Exit Admin Mode button */}
              <button
                onClick={onExitAdmin}
                className="ml-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 transition flex items-center gap-1"
                title="Exit Admin Panel and Return to Public View"
              >
                <span>Exit Admin</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Header Bar (MAIN NAV) */}
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-400/30">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white font-serif">
                Infra Polytechnic Institute
              </h1>
              <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                IPI
              </span>
              {isAdminMode && (
                <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Admin Panel
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-medium">
              {isAdminMode 
                ? 'Faculty Attendance & Departmental Management Workspace' 
                : 'Student Attendance & Guardian Academic Inquiry Portal'}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        {isAdminMode ? (
          /* Admin Navigation Tabs */
          <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveTab('attendance')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                activeTab === 'attendance'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>Take Attendance</span>
            </button>

            <button
              onClick={() => setActiveTab('students')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                activeTab === 'students'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Students (CRUD)</span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                activeTab === 'reports'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Attendance Reports</span>
            </button>

            <button
              onClick={() => setActiveTab('callLogs')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                activeTab === 'callLogs'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <PhoneCall className="w-4 h-4" />
              <span>Guardian Call Logs</span>
            </button>

            <button
              onClick={() => setActiveTab('sheets')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                activeTab === 'sheets'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Google Sheets</span>
            </button>
          </nav>
        ) : (
          /* Public Main Navigation Tabs - Purely institutional and student/guardian focused, NO admin links */
          <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setPublicTab && setPublicTab('check')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                publicTab === 'check'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Check Attendance</span>
            </button>

            <button
              onClick={() => setPublicTab && setPublicTab('rules')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                publicTab === 'rules'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>BTEB Regulations</span>
            </button>

            <button
              onClick={() => setPublicTab && setPublicTab('departments')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                publicTab === 'departments'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Departments</span>
            </button>

            <button
              onClick={() => setPublicTab && setPublicTab('contact')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                publicTab === 'contact'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Phone className="w-4 h-4" />
              <span>Helpline & Info</span>
            </button>
          </nav>
        )}
      </div>
    </header>
  );
};
