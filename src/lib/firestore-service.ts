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
import { TrackedStock, CopilotSession, OnboardingProgress, PortfolioHolding } from '../types/business-os';

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

export const INITIAL_AI_PROVIDERS: AIProviderConfig[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    protocol: 'gemini-v1',
    baseUrl: 'https://generativelanguage.googleapis.com',
    defaultModel: 'gemini-2.0-flash',
    enabled: true,
    isCustom: false,
  },
  {
    id: 'groq',
    name: 'Groq Cloud',
    protocol: 'openai-compatible',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    enabled: true,
    isCustom: false,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    protocol: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    enabled: true,
    isCustom: false,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    protocol: 'openai-compatible',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-3.5-sonnet',
    enabled: true,
    isCustom: false,
  },
];

// --- 4. DYNAMIC MODEL REGISTRY (Firestore Document: settings/custom_models) ---
export async function loadCustomModels(): Promise<AIProviderConfig[]> {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDoc(doc(db, 'settings', 'custom_models'));
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data?.models) && data.models.length > 0) {
          return data.models;
        }
      }
      // Initialize with default configurable models
      await setDoc(doc(db, 'settings', 'custom_models'), {
        models: INITIAL_AI_PROVIDERS,
        updatedAt: new Date().toISOString(),
      });
      return INITIAL_AI_PROVIDERS;
    } catch (e) {
      console.error('Failed to load models from Firestore:', e);
    }
  }
  return INITIAL_AI_PROVIDERS;
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

// --- 7. TRACKED STOCKS / WATCHLIST LEDGER (Firestore Collection: tracked_stocks) ---
export const INITIAL_TRACKED_STOCKS: TrackedStock[] = [
  { id: 'stock_aapl', ticker: 'AAPL', symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', country: 'US', currency: 'USD', addedAt: new Date().toISOString() },
  { id: 'stock_nvda', ticker: 'NVDA', symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', country: 'US', currency: 'USD', addedAt: new Date().toISOString() },
  { id: 'stock_msft', ticker: 'MSFT', symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', country: 'US', currency: 'USD', addedAt: new Date().toISOString() },
  { id: 'stock_reliance', ticker: 'RELIANCE', symbol: 'RELIANCE.NS', name: 'Reliance Industries Ltd.', exchange: 'NSE', country: 'India', currency: 'INR', addedAt: new Date().toISOString() },
  { id: 'stock_tcs', ticker: 'TCS', symbol: 'TCS.NS', name: 'Tata Consultancy Services', exchange: 'NSE', country: 'India', currency: 'INR', addedAt: new Date().toISOString() },
  { id: 'stock_hdfc', ticker: 'HDFCBANK', symbol: 'HDFCBANK.NS', name: 'HDFC Bank Limited', exchange: 'NSE', country: 'India', currency: 'INR', addedAt: new Date().toISOString() },
];

export async function loadTrackedStocks(): Promise<TrackedStock[]> {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, 'tracked_stocks'));
      if (!snap.empty) {
        const stocks: TrackedStock[] = [];
        snap.forEach(d => stocks.push(d.data() as TrackedStock));
        return stocks;
      }
      // Seed default stocks if collection is empty
      for (const s of INITIAL_TRACKED_STOCKS) {
        await setDoc(doc(db, 'tracked_stocks', s.id), s);
      }
      return INITIAL_TRACKED_STOCKS;
    } catch (e) {
      console.error('Failed to load tracked stocks from Firestore:', e);
    }
  }
  return INITIAL_TRACKED_STOCKS;
}

export async function saveTrackedStock(stock: TrackedStock): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'tracked_stocks', stock.id), stock);
    } catch (e) {
      console.error('Failed to save tracked stock to Firestore:', e);
      throw e;
    }
  }
}

export async function deleteTrackedStock(id: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, 'tracked_stocks', id));
    } catch (e) {
      console.error('Failed to delete tracked stock from Firestore:', e);
    }
  }
}

// --- 8. AI COPILOT CHAT SESSIONS (Firestore Collection: copilot_sessions) ---
export async function loadCopilotSessions(): Promise<CopilotSession[]> {
  if (isFirebaseConfigured && db) {
    try {
      const q = query(collection(db, 'copilot_sessions'), orderBy('updatedAt', 'desc'), limit(30));
      const snap = await getDocs(q);
      const sessions: CopilotSession[] = [];
      snap.forEach(d => sessions.push(d.data() as CopilotSession));
      return sessions;
    } catch {
      try {
        const snap = await getDocs(collection(db, 'copilot_sessions'));
        const sessions: CopilotSession[] = [];
        snap.forEach(d => sessions.push(d.data() as CopilotSession));
        sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        return sessions.slice(0, 30);
      } catch (inner) {
        console.error('Failed to load copilot sessions:', inner);
      }
    }
  }
  return [];
}

export async function saveCopilotSession(session: CopilotSession): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'copilot_sessions', session.id), session);
    } catch (e) {
      console.error('Failed to save copilot session to Firestore:', e);
    }
  }
}

export async function deleteCopilotSession(id: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, 'copilot_sessions', id));
    } catch (e) {
      console.error('Failed to delete copilot session:', e);
    }
  }
}

// --- 9. ONBOARDING & SETUP PROGRESS (Firestore Document: settings/onboarding) ---
export async function loadOnboardingProgress(): Promise<OnboardingProgress> {
  const defaultProgress: OnboardingProgress = {
    hasCompletedTour: false,
    checklistDismissed: false,
    completedTasks: [],
  };

  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDoc(doc(db, 'settings', 'onboarding'));
      if (snap.exists()) {
        return snap.data() as OnboardingProgress;
      }
    } catch (e) {
      console.error('Failed to load onboarding progress:', e);
    }
  }
  return defaultProgress;
}

export async function saveOnboardingProgress(progress: OnboardingProgress): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'settings', 'onboarding'), progress);
    } catch (e) {
      console.error('Failed to save onboarding progress:', e);
    }
  }
}

// --- 10. PORTFOLIO HOLDINGS & COST-BASIS LEDGER (Firestore Collection: portfolio_holdings) ---
export const INITIAL_PORTFOLIO_HOLDINGS: PortfolioHolding[] = [
  {
    id: 'hold_aapl',
    ticker: 'AAPL',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    exchange: 'NASDAQ',
    currency: 'USD',
    assetClass: 'Equity',
    quantity: 50,
    purchasePrice: 185.50,
    purchaseDate: '2024-01-15',
    currentPrice: 224.23,
    totalCost: 50 * 185.50,
    currentValue: 50 * 224.23,
    unrealizedPnL: 50 * 224.23 - 50 * 185.50,
    unrealizedPnLPercent: ((224.23 - 185.50) / 185.50) * 100,
    notes: 'Core consumer ecosystem anchor',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'hold_nvda',
    ticker: 'NVDA',
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    exchange: 'NASDAQ',
    currency: 'USD',
    assetClass: 'Equity',
    quantity: 40,
    purchasePrice: 118.20,
    purchaseDate: '2024-03-20',
    currentPrice: 138.25,
    totalCost: 40 * 118.20,
    currentValue: 40 * 138.25,
    unrealizedPnL: 40 * 138.25 - 40 * 118.20,
    unrealizedPnLPercent: ((138.25 - 118.20) / 118.20) * 100,
    notes: 'Accelerated compute infrastructure',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'hold_msft',
    ticker: 'MSFT',
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    exchange: 'NASDAQ',
    currency: 'USD',
    assetClass: 'Equity',
    quantity: 25,
    purchasePrice: 412.00,
    purchaseDate: '2024-02-10',
    currentPrice: 428.15,
    totalCost: 25 * 412.00,
    currentValue: 25 * 428.15,
    unrealizedPnL: 25 * 428.15 - 25 * 412.00,
    unrealizedPnLPercent: ((428.15 - 412.00) / 412.00) * 100,
    notes: 'Enterprise cloud and OpenAI partnership',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'hold_reliance',
    ticker: 'RELIANCE',
    symbol: 'RELIANCE.NS',
    name: 'Reliance Industries Ltd.',
    exchange: 'NSE',
    currency: 'INR',
    assetClass: 'Equity',
    quantity: 100,
    purchasePrice: 2850.00,
    purchaseDate: '2024-04-05',
    currentPrice: 2985.40,
    totalCost: 100 * 2850.00,
    currentValue: 100 * 2985.40,
    unrealizedPnL: 100 * 2985.40 - 100 * 2850.00,
    unrealizedPnLPercent: ((2985.40 - 2850.00) / 2850.00) * 100,
    notes: 'India digital telecom & retail conglomerate',
    lastUpdated: new Date().toISOString(),
  },
];

export async function loadPortfolioHoldings(): Promise<PortfolioHolding[]> {
  if (isFirebaseConfigured && db) {
    try {
      const q = query(collection(db, 'portfolio_holdings'), orderBy('ticker', 'asc'));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map(d => d.data() as PortfolioHolding);
      }
      // Populate defaults if collection is empty
      await saveBatchPortfolioHoldings(INITIAL_PORTFOLIO_HOLDINGS);
      return INITIAL_PORTFOLIO_HOLDINGS;
    } catch (e) {
      console.error('Failed to load portfolio holdings from Firestore:', e);
    }
  }
  return INITIAL_PORTFOLIO_HOLDINGS;
}

export async function savePortfolioHolding(holding: PortfolioHolding): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'portfolio_holdings', holding.id), holding);
    } catch (e) {
      console.error('Failed to save portfolio holding:', e);
    }
  }
}

export async function saveBatchPortfolioHoldings(holdings: PortfolioHolding[]): Promise<void> {
  if (isFirebaseConfigured && db) {
    const firestore = db;
    try {
      await Promise.all(
        holdings.map(h => setDoc(doc(firestore, 'portfolio_holdings', h.id), h))
      );
    } catch (e) {
      console.error('Failed to save batch portfolio holdings:', e);
    }
  }
}

export async function deletePortfolioHolding(id: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, 'portfolio_holdings', id));
    } catch (e) {
      console.error('Failed to delete portfolio holding:', e);
    }
  }
}

