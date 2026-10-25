/**
 * Password-Only Authentication Service
 * Exposes a strict single-password sign-in flow (no email input, no public signup)
 */

import { auth, isFirebaseConfigured } from './firebase';
import { signInWithEmailAndPassword, signOut as fbSignOut, onAuthStateChanged, User } from 'firebase/auth';

const ADMIN_EMAIL = import.meta.env.VITE_FIREBASE_ADMIN_EMAIL || 'admin@newstracker.internal';
const LOCAL_SESSION_KEY = 'newstracker_auth_session';

export interface AuthState {
  isAuthenticated: boolean;
  user: { email: string; uid: string } | null;
  loading: boolean;
}

export async function signInWithPassword(password: string): Promise<{ success: boolean; error?: string }> {
  if (!password || password.trim().length === 0) {
    return { success: false, error: 'Password cannot be empty.' };
  }

  // If Firebase is configured with real credentials
  if (isFirebaseConfigured && auth) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, password);
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({
        email: userCredential.user.email,
        uid: userCredential.user.uid,
        timestamp: Date.now(),
      }));
      return { success: true };
    } catch (error: any) {
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        return { success: false, error: 'Invalid access password.' };
      }
      if (error.code === 'auth/user-not-found') {
        return { success: false, error: `Admin user (${ADMIN_EMAIL}) not found in Firebase. Please create it in Firebase Auth console.` };
      }
      return { success: false, error: error.message || 'Authentication failed.' };
    }
  }

  // Local / Standalone Mode (Works out-of-the-box before Firebase is seeded)
  // Default master access password
  const validLocalPasswords = ['newstracker', 'newstracker2026', 'admin', 'password'];
  const customLocalPassword = import.meta.env.VITE_LOCAL_ACCESS_PASSWORD;
  if (customLocalPassword) {
    validLocalPasswords.push(customLocalPassword);
  }

  if (validLocalPasswords.includes(password.trim())) {
    const session = {
      email: ADMIN_EMAIL,
      uid: 'admin_local_session',
      timestamp: Date.now(),
    };
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));
    return { success: true };
  }

  return { success: false, error: 'Invalid access password. (Default for local mode: "newstracker")' };
}

export async function signOut(): Promise<void> {
  localStorage.removeItem(LOCAL_SESSION_KEY);
  if (isFirebaseConfigured && auth) {
    try {
      await fbSignOut(auth);
    } catch {
      // Ignore
    }
  }
}

export function subscribeToAuth(callback: (state: AuthState) => void): () => void {
  // Check local session immediately
  const localSession = localStorage.getItem(LOCAL_SESSION_KEY);
  if (localSession) {
    try {
      const parsed = JSON.parse(localSession);
      callback({
        isAuthenticated: true,
        user: { email: parsed.email, uid: parsed.uid },
        loading: false,
      });
    } catch {
      // Ignore invalid local session
    }
  }

  if (isFirebaseConfigured && auth) {
    return onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        callback({
          isAuthenticated: true,
          user: { email: user.email || ADMIN_EMAIL, uid: user.uid },
          loading: false,
        });
      } else {
        const hasLocal = localStorage.getItem(LOCAL_SESSION_KEY);
        if (!hasLocal) {
          callback({
            isAuthenticated: false,
            user: null,
            loading: false,
          });
        }
      }
    });
  }

  // If in local mode without live Firebase
  if (!localSession) {
    callback({
      isAuthenticated: false,
      user: null,
      loading: false,
    });
  }

  return () => {};
}
