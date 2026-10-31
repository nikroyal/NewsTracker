/**
 * Password-Only Authentication Service (Pure Firebase Auth Session, Zero LocalStorage)
 * Exposes a strict single-password sign-in flow (no email input, no public signup)
 */

import { auth, isFirebaseConfigured } from './firebase';
import { signInWithEmailAndPassword, signOut as fbSignOut, onAuthStateChanged, User } from 'firebase/auth';

const ADMIN_EMAIL = import.meta.env.VITE_FIREBASE_ADMIN_EMAIL || 'admin@newstracker.internal';

// Clean any legacy localStorage keys to ensure zero local data storage
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear();
  }
} catch {
  // Ignore
}

// In-memory fallback session strictly for offline local dev mode (never persisted to disk)
let inMemorySession: { email: string; uid: string } | null = null;

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
      await signInWithEmailAndPassword(auth, ADMIN_EMAIL, password.trim());
      return { success: true };
    } catch (error: any) {
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        return { success: false, error: 'Invalid access password.' };
      }
      if (error.code === 'auth/user-not-found') {
        return { success: false, error: `Admin user (${ADMIN_EMAIL}) not found in Firebase. Please create it in Firebase Auth console.` };
      }
      if (error.code === 'auth/unauthorized-domain') {
        return { success: false, error: 'This Cloudflare domain is not authorized in Firebase. Add it to Firebase Console -> Auth -> Settings -> Authorized Domains.' };
      }
      return { success: false, error: error.message || 'Authentication failed.' };
    }
  }

  // Local / Standalone Mode (In-memory only, no localStorage)
  const validLocalPasswords = ['newstracker', 'newstracker2026', 'admin', 'password'];
  const customLocalPassword = import.meta.env.VITE_LOCAL_ACCESS_PASSWORD;
  if (customLocalPassword) {
    validLocalPasswords.push(customLocalPassword);
  }

  if (validLocalPasswords.includes(password.trim())) {
    inMemorySession = {
      email: ADMIN_EMAIL,
      uid: 'admin_local_session',
    };
    return { success: true };
  }

  return { success: false, error: 'Invalid access password. (Default for local mode: "newstracker")' };
}

export async function signOut(): Promise<void> {
  inMemorySession = null;
  if (isFirebaseConfigured && auth) {
    try {
      await fbSignOut(auth);
    } catch {
      // Ignore
    }
  }
}

export function subscribeToAuth(callback: (state: AuthState) => void): () => void {
  if (isFirebaseConfigured && auth) {
    return onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        callback({
          isAuthenticated: true,
          user: { email: user.email || ADMIN_EMAIL, uid: user.uid },
          loading: false,
        });
      } else {
        callback({
          isAuthenticated: false,
          user: null,
          loading: false,
        });
      }
    });
  }

  // Local offline fallback
  callback({
    isAuthenticated: inMemorySession !== null,
    user: inMemorySession,
    loading: false,
  });

  return () => {};
}
