import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = (() => {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch (error) {
    console.warn('Persistent Firestore cache is unavailable; using the default cache.', error);
    return getFirestore(app);
  }
})();

// Scopes required for Google Sheets and Google Drive integration
export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

// 1. Standard Identity Login Provider (profile & email only).
// This NEVER triggers Google's 403 "Developer-approved testers only" block,
// so any authorized institutional email (e.g. zenonoaz@gmail.com) can log in as Admin.
const loginProvider = new GoogleAuthProvider();
loginProvider.setCustomParameters({
  prompt: 'select_account',
});

// 2. Google Sheets & Drive Provider (requires sensitive scopes)
const sheetsProvider = new GoogleAuthProvider();
SCOPES.forEach((scope) => {
  sheetsProvider.addScope(scope);
});
sheetsProvider.setCustomParameters({
  prompt: 'consent',
});

// In-memory token storage (MANDATORY: never store access tokens in localStorage/sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;
let hasSheetsScope = false;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      hasSheetsScope = false;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Standard Admin Google Sign-in.
 * Uses standard OAuth profile/email to ensure any authorized admin can sign in
 * without being blocked by Google's unverified app / testing mode restrictions.
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string | null } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, loginProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || null;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (
      err?.code === 'auth/popup-closed-by-user' || 
      err?.code === 'auth/cancelled-popup-request' ||
      err?.message?.includes('popup-closed-by-user')
    ) {
      return null;
    }
    console.error('Google Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Requests Google Sheets & Drive OAuth authorization when connecting or syncing spreadsheets.
 */
export const authorizeGoogleSheets = async (): Promise<string | null> => {
  try {
    const result = await signInWithPopup(auth, sheetsProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
      hasSheetsScope = true;
      return cachedAccessToken;
    }
    return null;
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (
      err?.code === 'auth/popup-closed-by-user' || 
      err?.code === 'auth/cancelled-popup-request' ||
      err?.message?.includes('popup-closed-by-user')
    ) {
      return null;
    }
    console.error('Google Sheets authorization error:', error);
    throw error;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  hasSheetsScope = false;
};
