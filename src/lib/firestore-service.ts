/**
 * Pure Firestore Persistence Layer (100% Cloud-Only, Zero LocalStorage)
 * All data (universal API keys, custom models, presets, watchlists, workspace state, and past reports) is stored exclusively in Cloud Firestore.
 */

import { db, isFirebaseConfigured } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { AIProviderConfig, SynthesisReport, UniversalApiKeyEntry } from '../types/ai';

// Clean any legacy localStorage keys to ensure zero local data storage
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear();
  }
} catch {
  // Ignore
}

export interface PromptPreset {
  id: string;
  name: string;
  content: string;
  updatedAt: string;
}

export interface Watchlist {
  id: string;
  name: string;
  companies: string[];
  updatedAt: string;
}

export interface WorkspaceState {
  companies: string[];
  userPrompt: string;
  activeModelId: string;
  timeframeDays: number;
  enableScraper: boolean;
}

// Initial default seed presets (seeded into Firestore if collection is empty)
const INITIAL_PRESETS: PromptPreset[] = [
  {
    id: 'preset_earnings',
    name: 'Earnings, Revenue & Growth Catalysts',
    content: 'Focus primarily on recent quarterly earnings, revenue beats/misses, operating margin trends, forward revenue guidance, and market catalysts.',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'preset_risk',
    name: 'Regulatory, Legal & Antitrust Audit',
    content: 'Emphasize any ongoing SEC probes, antitrust investigations, patent infringement lawsuits, compliance headwinds, and geopolitical risks.',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'preset_executive',
    name: 'Executive Leadership & M&A Digest',
    content: 'Highlight CEO/C-suite resignations or appointments, board room battles, merger and acquisition bids, and strategic divestitures.',
    updatedAt: new Date().toISOString(),
  },
];

const INITIAL_WATCHLISTS: Watchlist[] = [
  {
    id: 'wl_tech_giants',
    name: 'Mega-Cap Tech',
    companies: ['Apple', 'Microsoft', 'NVIDIA', 'Alphabet', 'Amazon'],
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'wl_semiconductors',
    name: 'Semiconductor Leaders',
    companies: ['NVIDIA', 'TSMC', 'ASML', 'Broadcom', 'AMD'],
    updatedAt: new Date().toISOString(),
  },
];

// --- 1. PROMPT PRESETS (Firestore Collection: presets) ---
export async function loadPromptPresets(): Promise<PromptPreset[]> {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, 'presets'));
      if (!snap.empty) {
        const presets: PromptPreset[] = [];
        snap.forEach(d => presets.push(d.data() as PromptPreset));
        return presets;
      }
      for (const p of INITIAL_PRESETS) {
        await setDoc(doc(db, 'presets', p.id), p);
      }
      return INITIAL_PRESETS;
    } catch (e) {
      console.error('Failed to load prompt presets from Firestore:', e);
    }
  }
  return INITIAL_PRESETS;
}

export async function savePromptPreset(preset: PromptPreset): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'presets', preset.id), preset);
    } catch (e) {
      console.error('Failed to save prompt preset to Firestore:', e);
      throw e;
    }
  }
}

export async function deletePromptPreset(id: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, 'presets', id));
    } catch (e) {
      console.error('Failed to delete prompt preset from Firestore:', e);
      throw e;
    }
  }
}

// --- 2. WATCHLISTS (Firestore Collection: watchlists) ---
export async function loadWatchlists(): Promise<Watchlist[]> {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, 'watchlists'));
      if (!snap.empty) {
        const lists: Watchlist[] = [];
        snap.forEach(d => lists.push(d.data() as Watchlist));
        return lists;
      }
      for (const wl of INITIAL_WATCHLISTS) {
        await setDoc(doc(db, 'watchlists', wl.id), wl);
      }
      return INITIAL_WATCHLISTS;
    } catch (e) {
      console.error('Failed to load watchlists from Firestore:', e);
    }
  }
  return INITIAL_WATCHLISTS;
}

export async function saveWatchlist(watchlist: Watchlist): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'watchlists', watchlist.id), watchlist);
    } catch (e) {
      console.error('Failed to save watchlist to Firestore:', e);
      throw e;
    }
  }
}

export async function deleteWatchlist(id: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, 'watchlists', id));
    } catch (e) {
      console.error('Failed to delete watchlist from Firestore:', e);
      throw e;
    }
  }
}

// --- 3. UNIVERSAL DYNAMIC API KEYS (Firestore Document: settings/universal_keys) ---
export async function loadUniversalApiKeys(): Promise<UniversalApiKeyEntry[]> {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDoc(doc(db, 'settings', 'universal_keys'));
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data?.entries)) {
          return data.entries;
        }
      }
    } catch (e) {
      console.error('Failed to load universal API keys from Firestore:', e);
    }
  }
  return [];
}

export async function saveUniversalApiKeys(entries: UniversalApiKeyEntry[]): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'settings', 'universal_keys'), {
        entries,
        updatedAt: new Date().toISOString(),
      });

      // Synchronize key dictionary to settings/api_keys for pipeline adapters
      const dictionary: Record<string, string> = {};
      entries.forEach(e => {
        if (e.apiKey && e.enabled) {
          dictionary[e.id] = e.apiKey;
          const cleanName = e.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
          dictionary[cleanName] = e.apiKey;
        }
      });

      await setDoc(doc(db, 'settings', 'api_keys'), {
        keys: dictionary,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Failed to save universal API keys to Firestore:', e);
      throw e;
    }
  }
}

// Legacy dictionary loader for compatibility
export async function loadApiKeys(): Promise<Record<string, string>> {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDoc(doc(db, 'settings', 'api_keys'));
      if (snap.exists()) {
        const data = snap.data();
        return data?.keys || {};
      }
    } catch (e) {
      console.error('Failed to load API keys from Firestore:', e);
    }
  }
  return {};
}

export async function saveApiKeys(keys: Record<string, string>): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'settings', 'api_keys'), {
        keys,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Failed to save API keys to Firestore:', e);
      throw e;
    }
  }
}

// --- 4. CUSTOM MODEL REGISTRY (Firestore Document: settings/custom_models) ---
export async function loadCustomModels(): Promise<AIProviderConfig[]> {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDoc(doc(db, 'settings', 'custom_models'));
      if (snap.exists()) {
        const data = snap.data();
        return data?.models || [];
      }
    } catch (e) {
      console.error('Failed to load custom models from Firestore:', e);
    }
  }
  return [];
}

export async function saveCustomModels(models: AIProviderConfig[]): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'settings', 'custom_models'), {
        models,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Failed to save custom models to Firestore:', e);
      throw e;
    }
  }
}

// --- 5. WORKSPACE ACTIVE STATE (Firestore Document: settings/workspace_state) ---
export async function loadWorkspaceState(): Promise<WorkspaceState | null> {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDoc(doc(db, 'settings', 'workspace_state'));
      if (snap.exists()) {
        return snap.data() as WorkspaceState;
      }
    } catch (e) {
      console.error('Failed to load workspace state from Firestore:', e);
    }
  }
  return null;
}

export async function saveWorkspaceState(state: WorkspaceState): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'settings', 'workspace_state'), {
        ...state,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Failed to save workspace state to Firestore:', e);
    }
  }
}

// --- 6. REPORT SNAPSHOTS / HISTORY / PAST CHATS (Firestore Collection: reports) ---
export async function loadReportSnapshots(): Promise<SynthesisReport[]> {
  if (isFirebaseConfigured && db) {
    try {
      const q = query(collection(db, 'reports'), orderBy('timestamp', 'desc'), limit(50));
      const snap = await getDocs(q);
      const reports: SynthesisReport[] = [];
      snap.forEach(d => reports.push(d.data() as SynthesisReport));
      return reports;
    } catch {
      try {
        const snap = await getDocs(collection(db, 'reports'));
        const reports: SynthesisReport[] = [];
        snap.forEach(d => reports.push(d.data() as SynthesisReport));
        reports.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return reports.slice(0, 50);
      } catch (inner) {
        console.error('Failed to load reports from Firestore:', inner);
      }
    }
  }
  return [];
}

export async function saveReportSnapshot(report: SynthesisReport): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'reports', report.id), report);
    } catch (e) {
      console.error('Failed to save report snapshot to Firestore:', e);
      throw e;
    }
  }
}

export async function deleteReportSnapshot(id: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, 'reports', id));
    } catch (e) {
      console.error('Failed to delete report snapshot from Firestore:', e);
    }
  }
}
