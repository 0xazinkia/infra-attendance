import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  AlertCircle, 
  ArrowRight,
  LoaderCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface AdminAccessGateProps {
  onSuccess: () => void;
}

export const AdminAccessGate: React.FC<AdminAccessGateProps> = ({ onSuccess }) => {
  const { loginWithGoogle } = useApp();
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
    <div className="relative isolate flex min-h-[calc(100vh-3rem)] items-center justify-center overflow-hidden rounded-2xl bg-slate-100 p-4 sm:p-8">
      <img
        src="/hero-bg.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-slate-950/55" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-950/60 via-emerald-950/35 to-slate-900/65" />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/15">
        <div className="h-1.5 bg-gradient-to-r from-emerald-700 via-teal-500 to-amber-400" />

        <div className="px-6 pb-5 pt-8 text-center sm:px-9 sm:pt-9">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-800 shadow-lg shadow-emerald-900/20 ring-4 ring-emerald-50">
            <img src="/Infra-white.png" alt="Infra Polytechnic Institute logo" className="h-12 w-12 object-contain" />
          </div>

          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-800">
            <Lock className="h-3 w-3" />
            <span>Staff access</span>
          </div>

          <h1 className="text-xl font-bold text-slate-950 sm:text-2xl">
            Administrative Access
          </h1>

          <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-600">
            Infra Polytechnic Institute
          </p>
        </div>

        {/* Body */}
        <div className="space-y-5 px-6 pb-7 sm:px-9 sm:pb-9">
          {errorMsg && (
            <div role="alert" className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white text-emerald-800 shadow-sm ring-1 ring-slate-200">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <p className="text-left text-xs leading-5 text-slate-600">
              Sign in with an authorized institute Google account.
            </p>
          </div>

          {/* Primary Google Login Button */}
          <button
            onClick={handleGoogleAdminLogin}
            disabled={isLoading}
            className="group flex w-full items-center justify-center gap-3 rounded-lg bg-emerald-800 px-4 py-3.5 text-sm font-semibold text-white shadow-md shadow-emerald-900/15 transition hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
          >
            {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <svg className="h-4 w-4 rounded-full bg-white p-0.5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>}
            <span>{isLoading ? 'Signing in...' : 'Continue with Google'}</span>
            {!isLoading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
          </button>

          <p className="text-center text-[11px] text-slate-400">Access is limited to approved faculty and administrators.</p>
        </div>
      </div>
    </div>
  );
};
