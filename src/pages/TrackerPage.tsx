import React, { useState } from 'react';
import { CompanyTagger } from '../components/companies/CompanyTagger';
import { PromptStudio } from '../components/prompts/PromptStudio';
import { ExecutiveReportView } from '../components/results/ExecutiveReportView';
import { PdfCustomizerModal } from '../components/results/PdfCustomizerModal';
import { Watchlist, PromptPreset } from '../lib/firestore-service';
import { SynthesisReport, ProviderQuotaTelemetry, AIProviderConfig } from '../types/ai';
import { Play, Loader2, Calendar, Globe, AlertCircle, Zap, Cpu } from 'lucide-react';

interface TrackerPageProps {
  companies: string[];
  onChangeCompanies: (companies: string[]) => void;
  userPrompt: string;
  onChangePrompt: (prompt: string) => void;
  timeframeDays: number;
  onChangeTimeframe: (days: number) => void;
  enableScraper: boolean;
  onChangeScraper: (enable: boolean) => void;
  activeModelId: string;
  watchlists: Watchlist[];
  onSaveWatchlist: (name: string) => Promise<void>;
  presets: PromptPreset[];
  onSavePreset: (preset: PromptPreset) => Promise<void>;
  onDeletePreset: (id: string) => Promise<void>;
  isExecuting: boolean;
  onExecute: () => Promise<void>;
  executionError: string | null;
  currentReport: SynthesisReport | null;
  onNavigateToOrchestrator: () => void;
}

export const TrackerPage: React.FC<TrackerPageProps> = ({
  companies,
  onChangeCompanies,
  userPrompt,
  onChangePrompt,
  timeframeDays,
  onChangeTimeframe,
  enableScraper,
  onChangeScraper,
  activeModelId,
  watchlists,
  onSaveWatchlist,
  presets,
  onSavePreset,
  onDeletePreset,
  isExecuting,
  onExecute,
  executionError,
  currentReport,
  onNavigateToOrchestrator,
}) => {
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto">
      {/* Workspace Control Card */}
      <section className="p-6 bg-[#FFFFFF] border border-[#E6E5DE] rounded-2xl shadow-sm space-y-6">
        {/* Company Tagger */}
        <CompanyTagger
          companies={companies}
          onChange={onChangeCompanies}
          watchlists={watchlists}
          onSaveCurrentWatchlist={onSaveWatchlist}
        />

        {/* Prompt Studio */}
        <PromptStudio
          prompt={userPrompt}
          onChange={onChangePrompt}
          presets={presets}
          onSavePreset={onSavePreset}
          onDeletePreset={onDeletePreset}
        />

        {/* Configuration Parameters & Execution Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#E6E5DE]">
          {/* Options */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#68665E]">
            {/* Timeframe */}
            <div className="flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#1C1B18]" />
              <span>Timeframe:</span>
              <select
                value={timeframeDays}
                onChange={(e) => onChangeTimeframe(Number(e.target.value))}
                className="bg-[#FAF9F5] border border-[#E6E5DE] rounded-lg px-2.5 py-1 text-[#1C1B18] focus:outline-none focus:border-[#1C1B18] cursor-pointer"
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
                onChange={(e) => onChangeScraper(e.target.checked)}
                className="rounded border-[#E6E5DE] text-[#1C1B18] focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="flex items-center space-x-1">
                <Globe className="w-3.5 h-3.5 text-[#1C1B18]" />
                <span>Deep Web Scraper</span>
              </span>
            </label>

            {/* Active Model Indicator with quick switch */}
            <button
              type="button"
              onClick={onNavigateToOrchestrator}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#FAF9F5] border border-[#E6E5DE] hover:border-[#1C1B18] text-[#1C1B18] transition"
              title="Click to configure Model Orchestrator"
            >
              <Cpu className="w-3.5 h-3.5 text-amber-600" />
              <span>Model: <strong className="font-semibold">{activeModelId}</strong></span>
            </button>
          </div>

          {/* Execute Button */}
          <button
            onClick={onExecute}
            disabled={isExecuting || companies.length === 0}
            className="px-6 py-2.5 bg-[#1C1B18] hover:bg-[#2D2D2D] disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-xl text-xs flex items-center space-x-2 shadow-sm transition-all cursor-pointer"
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
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
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

      {/* PDF Customizer Modal */}
      {currentReport && (
        <PdfCustomizerModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          report={currentReport}
        />
      )}
    </div>
  );
};

export default TrackerPage;
