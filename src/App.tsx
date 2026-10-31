import React, { useState, useEffect } from 'react';
import { subscribeToAuth, signOut, AuthState } from './lib/auth-service';
import { PasswordSignIn } from './components/auth/PasswordSignIn';
import { Navbar, NavigationTab } from './components/common/Navbar';
import { TrackerPage } from './pages/TrackerPage';
import { OrchestratorPage } from './pages/OrchestratorPage';
import { ApiKeysPage } from './pages/ApiKeysPage';
import { HistoryPage } from './pages/HistoryPage';

import {
  PromptPreset,
  Watchlist,
  loadPromptPresets,
  savePromptPreset,
  deletePromptPreset,
  loadWatchlists,
  saveWatchlist,
  loadUniversalApiKeys,
  saveUniversalApiKeys,
  loadApiKeys,
  loadCustomModels,
  saveCustomModels,
  loadReportSnapshots,
  saveReportSnapshot,
  deleteReportSnapshot,
  loadWorkspaceState,
  saveWorkspaceState,
} from './lib/firestore-service';

import { AIProviderConfig, ProviderQuotaTelemetry, SynthesisReport, UniversalApiKeyEntry } from './types/ai';
import { runFullPipeline } from './lib/api-client';
import { Loader2 } from 'lucide-react';

export function App() {
  // Navigation State (Full-page views, no popups)
  const [activeTab, setActiveTab] = useState<NavigationTab>('tracker');

  // Authentication State
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true,
  });

  // App Configuration & Persistence (All in Cloud Firestore, Zero in LocalStorage)
  const [presets, setPresets] = useState<PromptPreset[]>([]);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [universalKeys, setUniversalKeys] = useState<UniversalApiKeyEntry[]>([]);
  const [apiKeysDict, setApiKeysDict] = useState<Record<string, string>>({});
  const [customModels, setCustomModels] = useState<AIProviderConfig[]>([]);
  const [snapshots, setSnapshots] = useState<SynthesisReport[]>([]);

  // Workspace Inputs
  const [companies, setCompanies] = useState<string[]>(['Apple', 'NVIDIA', 'Microsoft']);
  const [userPrompt, setUserPrompt] = useState<string>(
    'Focus on recent earnings, strategic expansion, supply chain headwinds, and regulatory antitrust developments.'
  );
  const [timeframeDays, setTimeframeDays] = useState<number>(7);
  const [enableScraper, setEnableScraper] = useState<boolean>(true);
  const [activeModelId, setActiveModelId] = useState<string>('gemini');

  // Execution & Results State
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [currentReport, setCurrentReport] = useState<SynthesisReport | null>(null);
  const [currentTelemetry, setCurrentTelemetry] = useState<ProviderQuotaTelemetry | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  // 1. Subscribe to Password Auth (Firebase Auth)
  useEffect(() => {
    const unsubscribe = subscribeToAuth((state) => {
      setAuth(state);
    });
    return () => unsubscribe();
  }, []);

  // 2. Load 100% of data directly from Cloud Firestore
  useEffect(() => {
    if (auth.isAuthenticated) {
      loadPromptPresets().then(setPresets);
      loadWatchlists().then(setWatchlists);
      
      // Load universal keys and sync to state
      loadUniversalApiKeys().then(keys => {
        setUniversalKeys(keys);
        const dict: Record<string, string> = {};
        keys.forEach(k => {
          if (k.apiKey && k.enabled) {
            dict[k.id] = k.apiKey;
            const cleanName = k.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
            dict[cleanName] = k.apiKey;
          }
        });
        setApiKeysDict(dict);
      });

      // Also load legacy dictionary for fallback
      loadApiKeys().then(dict => {
        setApiKeysDict(prev => ({ ...dict, ...prev }));
      });

      loadCustomModels().then(setCustomModels);

      // Load active workspace state from Firestore
      loadWorkspaceState().then((ws) => {
        if (ws) {
          if (ws.companies && ws.companies.length > 0) setCompanies(ws.companies);
          if (ws.userPrompt) setUserPrompt(ws.userPrompt);
          if (ws.activeModelId) setActiveModelId(ws.activeModelId);
          if (ws.timeframeDays) setTimeframeDays(ws.timeframeDays);
          if (ws.enableScraper !== undefined) setEnableScraper(ws.enableScraper);
        }
      });

      // Load past reports / history from Firestore
      loadReportSnapshots().then((snaps) => {
        setSnapshots(snaps);
        if (snaps.length > 0 && !currentReport) {
          setCurrentReport(snaps[0]);
          setCurrentTelemetry(snaps[0].quotaTelemetry);
        }
      });
    }
  }, [auth.isAuthenticated]);

  // Sync workspace state to Firestore
  const updateCompanies = (newCompanies: string[]) => {
    setCompanies(newCompanies);
    saveWorkspaceState({
      companies: newCompanies,
      userPrompt,
      activeModelId,
      timeframeDays,
      enableScraper,
    });
  };

  const updateUserPrompt = (newPrompt: string) => {
    setUserPrompt(newPrompt);
    saveWorkspaceState({
      companies,
      userPrompt: newPrompt,
      activeModelId,
      timeframeDays,
      enableScraper,
    });
  };

  const updateActiveModel = (modelId: string) => {
    setActiveModelId(modelId);
    saveWorkspaceState({
      companies,
      userPrompt,
      activeModelId: modelId,
      timeframeDays,
      enableScraper,
    });
  };

  const updateTimeframe = (days: number) => {
    setTimeframeDays(days);
    saveWorkspaceState({
      companies,
      userPrompt,
      activeModelId,
      timeframeDays: days,
      enableScraper,
    });
  };

  const updateScraper = (enabled: boolean) => {
    setEnableScraper(enabled);
    saveWorkspaceState({
      companies,
      userPrompt,
      activeModelId,
      timeframeDays,
      enableScraper: enabled,
    });
  };

  // Handle Pipeline Execution
  const handleExecute = async () => {
    if (companies.length === 0) {
      setExecutionError('Please input at least one company or ticker to track.');
      return;
    }

    setIsExecuting(true);
    setExecutionError(null);

    try {
      const response = await runFullPipeline({
        companies,
        userPrompt,
        activeProviderId: activeModelId,
        customProviders: customModels,
        apiKeys: apiKeysDict,
        timeframeDays,
        enableScraper,
      });

      setCurrentReport(response.report);
      setCurrentTelemetry(response.telemetry);

      // Save report snapshot directly to Firestore collection: reports
      await saveReportSnapshot(response.report);
      setSnapshots((prev) => [response.report, ...prev.filter((r) => r.id !== response.report.id)]);
    } catch (err: any) {
      setExecutionError(err.message || 'Execution failed. Please check your network and API keys.');
    } finally {
      setIsExecuting(false);
    }
  };

  // Auth Guard
  if (auth.loading) {
    return (
      <div className="min-h-screen bg-[#F4F3EE] flex items-center justify-center text-[#68665E] font-mono text-xs">
        <Loader2 className="w-5 h-5 animate-spin text-[#1C1B18] mr-2.5" />
        <span>Initializing Platform...</span>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <PasswordSignIn
        onSuccess={() => {
          setAuth({
            isAuthenticated: true,
            user: { email: 'admin@newstracker.internal', uid: 'admin' },
            loading: false,
          });
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F3EE] text-[#1C1B18] flex flex-col font-['Geist',sans-serif]">
      {/* Top Navbar with Tab Navigation */}
      <Navbar
        currentTab={activeTab}
        onSelectTab={setActiveTab}
        telemetry={currentTelemetry}
        onSignOut={() => signOut()}
      />

      {/* Main Container for Full-Page Views */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'tracker' && (
          <TrackerPage
            companies={companies}
            onChangeCompanies={updateCompanies}
            userPrompt={userPrompt}
            onChangePrompt={updateUserPrompt}
            timeframeDays={timeframeDays}
            onChangeTimeframe={updateTimeframe}
            enableScraper={enableScraper}
            onChangeScraper={updateScraper}
            activeModelId={activeModelId}
            watchlists={watchlists}
            onSaveWatchlist={async (name) => {
              const newWl: Watchlist = {
                id: 'wl_' + Date.now().toString(36),
                name,
                companies,
                updatedAt: new Date().toISOString(),
              };
              await saveWatchlist(newWl);
              setWatchlists((prev) => [...prev, newWl]);
            }}
            presets={presets}
            onSavePreset={async (p) => {
              await savePromptPreset(p);
              setPresets((prev) => [...prev, p]);
            }}
            onDeletePreset={async (id) => {
              await deletePromptPreset(id);
              setPresets((prev) => prev.filter((p) => p.id !== id));
            }}
            isExecuting={isExecuting}
            onExecute={handleExecute}
            executionError={executionError}
            currentReport={currentReport}
            onNavigateToOrchestrator={() => setActiveTab('orchestrator')}
          />
        )}

        {activeTab === 'orchestrator' && (
          <OrchestratorPage
            activeModelId={activeModelId}
            onSelectActiveModel={updateActiveModel}
            customModels={customModels}
            onSaveCustomModels={async (models) => {
              setCustomModels(models);
              await saveCustomModels(models);
            }}
            telemetry={currentTelemetry}
          />
        )}

        {activeTab === 'apikeys' && (
          <ApiKeysPage
            keys={universalKeys}
            onSaveKeys={async (updatedKeys) => {
              setUniversalKeys(updatedKeys);
              await saveUniversalApiKeys(updatedKeys);

              // Update dictionary for pipeline
              const dict: Record<string, string> = {};
              updatedKeys.forEach(k => {
                if (k.apiKey && k.enabled) {
                  dict[k.id] = k.apiKey;
                  const cleanName = k.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
                  dict[cleanName] = k.apiKey;
                }
              });
              setApiKeysDict(dict);
            }}
          />
        )}

        {activeTab === 'history' && (
          <HistoryPage
            snapshots={snapshots}
            onDeleteSnapshot={async (id) => {
              await deleteReportSnapshot(id);
              setSnapshots((prev) => prev.filter((s) => s.id !== id));
              if (currentReport?.id === id) {
                const remaining = snapshots.filter((s) => s.id !== id);
                setCurrentReport(remaining[0] || null);
              }
            }}
            onSelectForWorkspace={(report) => {
              setCurrentReport(report);
              setCurrentTelemetry(report.quotaTelemetry);
              const compList = Object.keys(report.companyAnalyses || {});
              if (compList.length > 0) updateCompanies(compList);
              if (report.userPrompt) updateUserPrompt(report.userPrompt);
              setActiveTab('tracker');
            }}
          />
        )}
      </main>
    </div>
  );
}

export default App;
