import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { AdminAccessGate } from './components/AdminAccessGate';
import { AttendanceTaker } from './components/AttendanceTaker';
import { StudentManager } from './components/StudentManager';
import { AttendanceReports } from './components/AttendanceReports';
import { GuardianCallLogsView } from './components/GuardianCallLogsView';
import { GoogleSheetsSettings } from './components/GoogleSheetsSettings';

function AppContent() {
  const { user, isAuthorizedAdmin, databaseStatus } = useApp();
  const [activeTab, setActiveTab] = useState<'attendance' | 'students' | 'reports' | 'callLogs' | 'sheets'>('attendance');

  // The root URL and /admin-access both open the admin access portal.
  const [isAdminUrl, setIsAdminUrl] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.location.pathname === '/' || window.location.pathname.includes('admin-access') || window.location.hash.includes('admin-access');
  });

  // Keep isAdminUrl in sync with browser navigation
  useEffect(() => {
    const handleUrlChange = () => {
      const match = window.location.pathname === '/' || window.location.pathname.includes('admin-access') || window.location.hash.includes('admin-access');
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
  // 1. Current URL is / or /admin-access
  // 2. A verified Google user is logged in
  // 3. That Google user's email is in the authorized admin list
  const isAuthorizedUser = user && isAuthorizedAdmin(user.email);
  const showAdminDashboard = isAdminUrl && isAuthorizedUser;
  const showAdminGate = isAdminUrl && !isAuthorizedUser;

  const handleAdminAuthSuccess = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={`min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-emerald-500 selection:text-white ${showAdminDashboard ? 'pb-24 lg:pb-0' : ''}`}>
      {showAdminDashboard && (
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      )}

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:px-6">
        {showAdminDashboard && (!databaseStatus.isOnline || databaseStatus.pendingWrites > 0 || databaseStatus.error) && (
          <div
            role="status"
            className={`mb-4 rounded-lg border px-4 py-3 text-xs font-medium ${databaseStatus.error ? 'border-rose-200 bg-rose-50 text-rose-900' : databaseStatus.isOnline ? 'border-sky-200 bg-sky-50 text-sky-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}
          >
            {databaseStatus.error
              ? `A saved change could not sync: ${databaseStatus.error}`
              : databaseStatus.isOnline
              ? `Syncing ${databaseStatus.pendingWrites} saved change${databaseStatus.pendingWrites === 1 ? '' : 's'} to Firebase...`
              : 'Offline mode: changes are saved on this device and will sync automatically when internet returns.'}
          </div>
        )}

        {/* Case 2: User is NOT signed in or not authorized */}
        {showAdminGate && (
          <AdminAccessGate onSuccess={handleAdminAuthSuccess} />
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

      <footer className="mt-auto border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs font-medium text-slate-500">
            © {new Date().getFullYear()} Infra Polytechnic Institute
          </p>
          <div className="text-xs text-slate-600 sm:text-right">
            <p className="font-semibold text-slate-800">Developed by Md. Ayub Islam Prince</p>
            <p className="mt-0.5">Jr. Instructor, Computer Science &amp; Technology</p>
            <p className="mt-0.5 text-slate-500">Infra Polytechnic Institute</p>
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
