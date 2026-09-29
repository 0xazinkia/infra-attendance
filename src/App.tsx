import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header, PublicTab } from './components/Header';
import { PublicPortal } from './components/PublicPortal';
import { AdminAccessGate } from './components/AdminAccessGate';
import { AttendanceTaker } from './components/AttendanceTaker';
import { StudentManager } from './components/StudentManager';
import { AttendanceReports } from './components/AttendanceReports';
import { GuardianCallLogsView } from './components/GuardianCallLogsView';
import { GoogleSheetsSettings } from './components/GoogleSheetsSettings';
import { 
  GraduationCap, 
  MapPin, 
  Phone, 
  Mail 
} from 'lucide-react';

function AppContent() {
  const { user, isAuthorizedAdmin, logoutUser } = useApp();
  const [activeTab, setActiveTab] = useState<'attendance' | 'students' | 'reports' | 'callLogs' | 'sheets'>('attendance');
  const [publicTab, setPublicTab] = useState<PublicTab>('check');

  // Track if current URL is the secret /admin-access route
  const [isAdminUrl, setIsAdminUrl] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.location.pathname.includes('admin-access') || window.location.hash.includes('admin-access');
  });

  // Keep isAdminUrl in sync with browser navigation
  useEffect(() => {
    const handleUrlChange = () => {
      const match = window.location.pathname.includes('admin-access') || window.location.hash.includes('admin-access');
      setIsAdminUrl(match);
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  // Strict Security Rule: Admin Dashboard is ONLY unlocked if:
  // 1. Current URL is /admin-access
  // 2. A verified Google user is logged in
  // 3. That Google user's email is in the authorized admin list
  const isAuthorizedUser = user && isAuthorizedAdmin(user.email);
  const showAdminDashboard = isAdminUrl && isAuthorizedUser;
  const showAdminGate = isAdminUrl && !isAuthorizedUser;

  const handleExitAdmin = async () => {
    await logoutUser();
    sessionStorage.removeItem('ipi_admin_session');
    window.history.pushState(null, '', '/');
    setIsAdminUrl(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdminAuthSuccess = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Navigation & Institutional Header */}
      <Header 
        isAdminMode={Boolean(showAdminDashboard)} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        publicTab={publicTab}
        setPublicTab={setPublicTab}
        onExitAdmin={handleExitAdmin}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:px-6">
        {/* Case 1: Public User View */}
        {!isAdminUrl && (
          <PublicPortal activeTab={publicTab} />
        )}

        {/* Case 2: User accessed /admin-access but is NOT signed in or not authorized */}
        {showAdminGate && (
          <AdminAccessGate 
            onSuccess={handleAdminAuthSuccess} 
            onCancel={handleExitAdmin} 
          />
        )}

        {/* Case 3: User accessed /admin-access AND is strictly authenticated with authorized email */}
        {showAdminDashboard && (
          <div>
            {activeTab === 'attendance' && <AttendanceTaker />}
            {activeTab === 'students' && <StudentManager />}
            {activeTab === 'reports' && <AttendanceReports />}
            {activeTab === 'callLogs' && <GuardianCallLogsView />}
            {activeTab === 'sheets' && <GoogleSheetsSettings />}
          </div>
        )}
      </main>

      {/* Footer (Institutional & Public, no visible admin links) */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-slate-800">
            {/* Col 1: Institutional Identity */}
            <div>
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <GraduationCap className="w-4 h-4 text-emerald-400" />
                <span>Infra Polytechnic Institute</span>
              </div>
              <p className="mt-1 text-slate-400 leading-relaxed text-[11px]">
                Approved by Bangladesh Technical Education Board (BTEB). Committed to excellence in polytechnic engineering education and student academic monitoring.
              </p>
              <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Rupatali, Barishal - 8200, Bangladesh</span>
              </div>
            </div>

            {/* Col 2: Academic Technologies */}
            <div>
              <span className="text-white font-semibold text-xs block mb-2">
                Diploma in Engineering Departments
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Computer Technology • Civil Technology • Electrical Technology • Mechanical Technology • Electronics Technology • Automobile Technology • Architecture
              </p>
            </div>

            {/* Col 3: Academic Office Contact & Helpline */}
            <div>
              <span className="text-white font-semibold text-xs block mb-2">
                Academic Office & Helpline
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                For roll inquiry, semester admission, and guardian counseling:
              </p>
              <div className="mt-2 space-y-1 text-[11px] text-slate-400">
                <p className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>+880 1712-345678, +880 1819-234500</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-400" />
                  <span>info@infrapolytechnic.edu.bd</span>
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
            <p>© {new Date().getFullYear()} Infra Polytechnic Institute • Academic Attendance Management System</p>
            <p>Affiliated with Bangladesh Technical Education Board (BTEB College Code: 54049)</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
