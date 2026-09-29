import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  ArrowLeft, 
  AlertCircle, 
  GraduationCap 
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface AdminAccessGateProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const AdminAccessGate: React.FC<AdminAccessGateProps> = ({ onSuccess, onCancel }) => {
  const { loginWithGoogle, authorizedAdmins } = useApp();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleAdminLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await loginWithGoogle();
      onSuccess();
    } catch (err: unknown) {
      const errObj = err as { code?: string; message?: string };
      if (
        errObj?.code === 'auth/popup-closed-by-user' ||
        errObj?.code === 'auth/cancelled-popup-request' ||
        errObj?.message?.includes('popup-closed-by-user')
      ) {
        // User simply closed the popup - no error needed
        return;
      }
      const msg = err instanceof Error ? err.message : 'Google authentication failed';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-6 text-white text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 mx-auto mb-3">
            <Lock className="w-7 h-7" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-1">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Infra Polytechnic Institute</span>
          </div>

          <h3 className="text-lg font-bold text-white">
            Administrative Access Portal
          </h3>

          <p className="text-xs text-slate-300 mt-1">
            Restricted to authorized faculty & administration staff
          </p>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">
              Sign in with your Google Account
            </h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Sign in with your authorized Google Account to manage attendance rosters, students, and Google Sheets cloud integration.
            </p>
          </div>

          {/* Primary Google Login Button */}
          <button
            onClick={handleGoogleAdminLogin}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs rounded-xl border border-slate-300 shadow-sm hover:shadow transition flex items-center justify-center gap-3 disabled:opacity-50 ring-1 ring-slate-200"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>
            <span className="text-sm">{isLoading ? 'Signing in with Google...' : 'Continue with Google'}</span>
          </button>

          {/* Authorized Admin Notice */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="text-[11px] text-slate-500 block">Default Authorized Admin:</span>
            <span className="text-xs font-mono font-bold text-slate-800">
              {authorizedAdmins.join(', ')}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between text-xs">
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-semibold transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Public Portal</span>
          </button>
          <span className="text-[11px] text-slate-400">Infra Polytechnic</span>
        </div>
      </div>
    </div>
  );
};
