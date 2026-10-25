import React, { useState, useEffect } from 'react';
import { subscribeToAuth, signOut, AuthState } from './lib/auth-service';
import { PasswordSignIn } from './components/auth/PasswordSignIn';
import { Navbar } from './components/common/Navbar';
import { CompanyTagger } from './components/companies/CompanyTagger';
import { PromptStudio } from './components/prompts/PromptStudio';
import { ExecutiveReportView } from './components/results/ExecutiveReportView';
import { ApiKeySettingsModal } from './components/settings/ApiKeySettingsModal';
import { ModelOrchestratorModal } from './components/settings/ModelOrchestratorModal';
import { ReportHistoryDrawer } from './components/common/ReportHistoryDrawer';
import { PdfCustomizerModal } from './components/results/PdfCustomizerModal';

import {
  PromptPreset,
  Watchlist,
  loadPromptPresets,
  savePromptPreset,
  deletePromptPreset,
  loadWatchlists,
  saveWatchlist,
  loadApiKeys,
  saveApiKeys,
  loadCustomModels,
  saveCustomModels,
  loadReportSnapshots,
  saveReportSnapshot,
} from './lib/firestore-service';

import { AIProviderConfig, ProviderQuotaTelemetry, SynthesisReport } from './types/ai';
import { runFullPipeline } from './lib/api-client';
import { Play, Loader2, Calendar, Globe, AlertCircle, RefreshCw } from 'lucide-react';

export function App() {
  // Authentication State
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true,
  });

  // App Configuration & Persistence
  const [presets, setPresets] = useState<PromptPreset[]>([]);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
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

  // Modals & Drawers
  const [isKeysModalOpen, setIsKeysModalOpen] = useState(false);
  const [isModelsModalOpen, setIsModelsModalOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // 1. Subscribe to Password Auth
  useEffect(() => {
    const unsubscribe = subscribeToAuth((state) => {
      setAuth(state);
    });
    return () => unsubscribe();
  }, []);

  // 2. Load Persisted Presets, Watchlists, API Keys, and Snapshots
  useEffect(() => {
    if (auth.isAuthenticated) {
      loadPromptPresets().then(setPresets);
      loadWatchlists().then(setWatchlists);
      loadApiKeys().then(setApiKeys);
      loadCustomModels().then(setCustomModels);
      loadReportSnapshots().then((snaps) => {
        setSnapshots(snaps);
        if (snaps.length > 0 && !currentReport) {
          // Pre-populate with latest saved run
          setCurrentReport(snaps[0]);
          setCurrentTelemetry(snaps[0].quotaTelemetry);
        }
      });
    }
  }, [auth.isAuthenticated]);

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
        apiKeys,
        timeframeDays,
        enableScraper,
      });

      setCurrentReport(response.report);
      setCurrentTelemetry(response.telemetry);

      // Persist snapshot to Firestore and local history
      await saveReportSnapshot(response.report);
      setSnapshots((prev) => [response.report, ...prev.filter((r) => r.id !== response.report.id)]);
    } catch (err: any) {
      setExecutionError(err.message || 'Execution failed. Please check your network and settings.');
    } finally {
      setIsExecuting(false);
    }
  };

  // Auth Guard
  if (auth.loading) {
    return (
      <div className="min-h-screen bg-[#080b11] flex items-center justify-center text-slate-500 font-mono text-xs">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-400 mr-2" />
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
    <div className="min-h-screen bg-[#080b11] text-slate-100 flex flex-col font-['Geist',sans-serif]">
      {/* Top Navbar */}
      <Navbar
        telemetry={currentTelemetry}
        onOpenKeysModal={() => setIsKeysModalOpen(true)}
        onOpenModelsModal={() => setIsModelsModalOpen(true)}
        onOpenHistoryDrawer={() => setIsHistoryDrawerOpen(true)}
        onSignOut={() => signOut()}
      />

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Workspace Control Card */}
        <section className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl shadow-xl space-y-6">
          {/* Company Tagger */}
          <CompanyTagger
            companies={companies}
            onChange={setCompanies}
            watchlists={watchlists}
            onSaveCurrentWatchlist={async (name) => {
              const newWl: Watchlist = {
                id: 'wl_' + Date.now().toString(36),
                name,
                companies,
                updatedAt: new Date().toISOString(),
              };
              await saveWatchlist(newWl);
              setWatchlists((prev) => [...prev, newWl]);
            }}
          />

          {/* Prompt Studio */}
          <PromptStudio
            prompt={userPrompt}
            onChange={setUserPrompt}
            presets={presets}
            onSavePreset={async (p) => {
              await savePromptPreset(p);
              setPresets((prev) => [...prev, p]);
            }}
            onDeletePreset={async (id) => {
              await deletePromptPreset(id);
              setPresets((prev) => prev.filter((p) => p.id !== id));
            }}
          />

          {/* Configuration Parameters & Execution Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800/80">
            {/* Options */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
              {/* Timeframe */}
              <div className="flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>Timeframe:</span>
                <select
                  value={timeframeDays}
                  onChange={(e) => setTimeframeDays(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value={3}>Past 3 Days</option>
                  <option value={7}>Past 7 Days</option>
                  <option value={14}>Past 14 Days</option>
                  <option value={30}>Past 30 Days</option>
                </select>
              </div>

              {/* Scraper Switch */}
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={enableScraper}
                  onChange={(e) => setEnableScraper(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                />
                <span className="flex items-center space-x-1">
                  <Globe className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Full-Text Web Scraper</span>
                </span>
              </label>
            </div>

            {/* Execute Button */}
            <button
              onClick={handleExecute}
              disabled={isExecuting || companies.length === 0}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl text-xs flex items-center space-x-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Aggregating & Synthesizing...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Execute Tracking & Synthesis</span>
                </>
              )}
            </button>
          </div>

          {/* Error Message */}
          {executionError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{executionError}</span>
            </div>
          )}
        </section>

        {/* Results Section */}
        {currentReport && (
          <ExecutiveReportView
            report={currentReport}
            onOpenPdfCustomizer={() => setIsPdfModalOpen(true)}
          />
        )}
      </main>

      {/* Modals & Slide-out Drawers */}
      <ApiKeySettingsModal
        isOpen={isKeysModalOpen}
        onClose={() => setIsKeysModalOpen(false)}
        apiKeys={apiKeys}
        onSaveKeys={async (updated) => {
          setApiKeys(updated);
          await saveApiKeys(updated);
        }}
      />

      <ModelOrchestratorModal
        isOpen={isModelsModalOpen}
        onClose={() => setIsModelsModalOpen(false)}
        activeModelId={activeModelId}
        onSelectActiveModel={setActiveModelId}
        customModels={customModels}
        onSaveCustomModels={async (models) => {
          setCustomModels(models);
          await saveCustomModels(models);
        }}
      />

      <ReportHistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        snapshots={snapshots}
        onSelectSnapshot={(report) => {
          setCurrentReport(report);
          setCurrentTelemetry(report.quotaTelemetry);
        }}
      />

      {currentReport && (
        <PdfCustomizerModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          report={currentReport}
        />
      )}
    </div>
  );
}

export default App;
