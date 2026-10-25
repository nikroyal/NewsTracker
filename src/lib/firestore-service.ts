/**
 * Persistence Layer (Firestore + Local Mirror)
 * Stores saved prompts, watchlists, API keys, custom model configs, and historical report snapshots
 */

import { db, isFirebaseConfigured } from './firebase';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { AIProviderConfig, SynthesisReport } from '../types/ai';

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

// Default initial prompt presets
const DEFAULT_PRESETS: PromptPreset[] = [
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

const DEFAULT_WATCHLISTS: Watchlist[] = [
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

// --- 1. PROMPT PRESETS ---
export async function loadPromptPresets(): Promise<PromptPreset[]> {
  const local = localStorage.getItem('newstracker_presets');
  if (local) {
    try {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
  }

  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, 'presets'));
      if (!snap.empty) {
        const presets: PromptPreset[] = [];
        snap.forEach(d => presets.push(d.data() as PromptPreset));
        localStorage.setItem('newstracker_presets', JSON.stringify(presets));
        return presets;
      }
    } catch {}
  }

  localStorage.setItem('newstracker_presets', JSON.stringify(DEFAULT_PRESETS));
  return DEFAULT_PRESETS;
}

export async function savePromptPreset(preset: PromptPreset): Promise<void> {
  const current = await loadPromptPresets();
  const index = current.findIndex(p => p.id === preset.id);
  if (index >= 0) {
    current[index] = preset;
  } else {
    current.push(preset);
  }
  localStorage.setItem('newstracker_presets', JSON.stringify(current));

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'presets', preset.id), preset);
    } catch {}
  }
}

export async function deletePromptPreset(id: string): Promise<void> {
  const current = await loadPromptPresets();
  const filtered = current.filter(p => p.id !== id);
  localStorage.setItem('newstracker_presets', JSON.stringify(filtered));

  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, 'presets', id));
    } catch {}
  }
}

// --- 2. WATCHLISTS ---
export async function loadWatchlists(): Promise<Watchlist[]> {
  const local = localStorage.getItem('newstracker_watchlists');
  if (local) {
    try {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
  }

  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, 'watchlists'));
      if (!snap.empty) {
        const lists: Watchlist[] = [];
        snap.forEach(d => lists.push(d.data() as Watchlist));
        localStorage.setItem('newstracker_watchlists', JSON.stringify(lists));
        return lists;
      }
    } catch {}
  }

  localStorage.setItem('newstracker_watchlists', JSON.stringify(DEFAULT_WATCHLISTS));
  return DEFAULT_WATCHLISTS;
}

export async function saveWatchlist(watchlist: Watchlist): Promise<void> {
  const current = await loadWatchlists();
  const index = current.findIndex(w => w.id === watchlist.id);
  if (index >= 0) {
    current[index] = watchlist;
  } else {
    current.push(watchlist);
  }
  localStorage.setItem('newstracker_watchlists', JSON.stringify(current));

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'watchlists', watchlist.id), watchlist);
    } catch {}
  }
}

// --- 3. API KEYS & CUSTOM MODELS ---
export async function loadApiKeys(): Promise<Record<string, string>> {
  const local = localStorage.getItem('newstracker_api_keys');
  if (local) {
    try {
      return JSON.parse(local);
    } catch {}
  }
  return {};
}

export async function saveApiKeys(keys: Record<string, string>): Promise<void> {
  localStorage.setItem('newstracker_api_keys', JSON.stringify(keys));
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'settings', 'api_keys'), { keys, updatedAt: new Date().toISOString() });
    } catch {}
  }
}

export async function loadCustomModels(): Promise<AIProviderConfig[]> {
  const local = localStorage.getItem('newstracker_custom_models');
  if (local) {
    try {
      return JSON.parse(local);
    } catch {}
  }
  return [];
}

export async function saveCustomModels(models: AIProviderConfig[]): Promise<void> {
  localStorage.setItem('newstracker_custom_models', JSON.stringify(models));
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'settings', 'custom_models'), { models, updatedAt: new Date().toISOString() });
    } catch {}
  }
}

// --- 4. REPORT SNAPSHOTS (Zero Token Waste) ---
export async function loadReportSnapshots(): Promise<SynthesisReport[]> {
  const local = localStorage.getItem('newstracker_snapshots');
  if (local) {
    try {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [];
}

export async function saveReportSnapshot(report: SynthesisReport): Promise<void> {
  const current = await loadReportSnapshots();
  // Keep max 20 latest reports
  const updated = [report, ...current.filter(r => r.id !== report.id)].slice(0, 20);
  localStorage.setItem('newstracker_snapshots', JSON.stringify(updated));

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'reports', report.id), report);
    } catch {}
  }
}
