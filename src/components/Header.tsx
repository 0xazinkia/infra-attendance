import React from 'react';
import { 
  Database,
  PhoneCall,
  ClipboardCheck,
  Users,
  BarChart3
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'attendance' | 'students' | 'reports' | 'callLogs' | 'sheets';
  setActiveTab: (tab: 'attendance' | 'students' | 'reports' | 'callLogs' | 'sheets') => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  activeTab, 
  setActiveTab
}) => {
  return (
    <header className="bg-slate-900 text-white shadow-xl border-b border-slate-800 sticky top-0 z-40">
      {/* Main Header Bar (MAIN NAV) */}
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center">
            <img src="/Infra-white.png" alt="Infra Polytechnic Institute logo" className="h-9 w-9 object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white font-serif">
                Infra Polytechnic Institute
              </h1>
              <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                IPI
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Student Attendance Portal</p>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="hidden items-center gap-1.5 overflow-x-auto pb-1 lg:flex lg:pb-0 scrollbar-none">
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
              <Database className="w-4 h-4" />
              <span>Firebase Data</span>
            </button>
        </nav>
      </div>

      <nav
        aria-label="Mobile primary navigation"
        className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 border-t border-slate-700 bg-slate-950/95 px-2 pt-2 shadow-[0_-8px_24px_rgba(2,6,23,0.18)] backdrop-blur lg:hidden"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}
      >
        {[
          { tab: 'attendance' as const, label: 'Attendance', Icon: ClipboardCheck },
          { tab: 'students' as const, label: 'Students', Icon: Users },
          { tab: 'reports' as const, label: 'Reports', Icon: BarChart3 },
          { tab: 'sheets' as const, label: 'Firebase', Icon: Database },
        ].map(({ tab, label, Icon }) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            aria-current={activeTab === tab ? 'page' : undefined}
            className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-semibold transition ${
              activeTab === tab
                ? 'bg-emerald-700 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="max-w-full truncate">{label}</span>
          </button>
        ))}
      </nav>
    </header>
  );
};
