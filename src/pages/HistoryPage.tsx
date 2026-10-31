import React, { useState } from 'react';
import {
  History,
  Calendar,
  FileDown,
  Trash2,
  Building2,
  Search,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import { SynthesisReport, CompanyAnalysis } from '../types/ai';
import { generateExecutivePdf, PdfCustomizerOptions } from '../lib/pdf-generator';

interface HistoryPageProps {
  snapshots: SynthesisReport[];
  onDeleteSnapshot: (id: string) => Promise<void>;
  onSelectForWorkspace?: (report: SynthesisReport) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  snapshots,
  onDeleteSnapshot,
  onSelectForWorkspace,
}) => {
  const [selectedId, setSelectedId] = useState<string>(snapshots[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  // Filter snapshots
  const filteredSnapshots = snapshots.filter(snap => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const companies = Object.keys(snap.companyAnalyses || {}).join(' ').toLowerCase();
    const prompt = (snap.userPrompt || '').toLowerCase();
    const model = (snap.modelUsed || '').toLowerCase();
    return companies.includes(q) || prompt.includes(q) || model.includes(q);
  });

  // Current active report
  const activeReport = snapshots.find(s => s.id === selectedId) || filteredSnapshots[0] || null;

  // Companies in current active report
  const companies = activeReport ? Object.keys(activeReport.companyAnalyses || {}) : [];
  const currentAnalysis: CompanyAnalysis | undefined = activeReport && selectedCompany
    ? activeReport.companyAnalyses[selectedCompany]
    : activeReport && companies.length > 0
    ? activeReport.companyAnalyses[companies[0]]
    : undefined;

  const handleExportPdf = () => {
    if (!activeReport) return;
    setIsExporting(true);
    const options: PdfCustomizerOptions = {
      includeExecutiveSummary: true,
      includeImpactMatrix: true,
      includeCatalystsAndRisks: true,
      includeCriticalEvents: true,
      includeCitations: true,
    };
    setTimeout(() => {
      generateExecutivePdf(activeReport, options);
      setIsExporting(false);
    }, 200);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this historical dossier from Firestore?')) {
      await onDeleteSnapshot(id);
      if (selectedId === id) {
        const remaining = snapshots.filter(s => s.id !== id);
        setSelectedId(remaining[0]?.id || '');
      }
    }
  };

  const getSentimentBadge = (label: string, score: number) => {
    let color = 'bg-[#FAF9F5] text-[#68665E] border-[#E6E5DE]';
    let Icon = Minus;

    if (score >= 0.25) {
      color = 'bg-emerald-50 text-emerald-800 border-emerald-200';
      Icon = TrendingUp;
    } else if (score <= -0.25) {
      color = 'bg-rose-50 text-rose-800 border-rose-200';
      Icon = TrendingDown;
    }

    return (
      <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-mono border ${color}`}>
        <Icon className="w-3.5 h-3.5" />
        <span className="capitalize">{label.replace('_', ' ')}</span>
        <span className="font-semibold">({score > 0 ? '+' : ''}{score.toFixed(2)})</span>
      </span>
    );
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E5DE] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1C1B18] font-['Geist',sans-serif] flex items-center space-x-2.5">
            <History className="w-6 h-6 text-[#1C1B18]" />
            <span>Intelligence Dossier Archive</span>
          </h1>
          <p className="text-sm text-[#68665E] mt-1 font-['Geist',sans-serif]">
            Review all past aggregated tracking runs saved in Firestore. Instant zero-token recall and offline vector PDF export.
          </p>
        </div>

        <div className="text-xs font-mono text-[#68665E] px-3 py-1.5 rounded-xl bg-[#FFFFFF] border border-[#E6E5DE]">
          Total Saved Dossiers: <span className="font-bold text-[#1C1B18]">{snapshots.length}</span>
        </div>
      </div>

      {snapshots.length === 0 ? (
        <div className="p-16 text-center bg-[#FFFFFF] border border-[#E6E5DE] rounded-2xl space-y-3">
          <History className="w-10 h-10 text-[#9E9C92] mx-auto" />
          <h3 className="text-base font-semibold text-[#1C1B18]">No Historical Dossiers Found</h3>
          <p className="text-xs text-[#68665E] max-w-md mx-auto">
            Once you execute tracking and synthesis in the Tracker workspace, full intelligence snapshots will appear here automatically for permanent zero-token recall.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Dossier Selector List */}
          <div className="lg:col-span-4 space-y-4">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by company or lens..."
                className="w-full bg-[#FFFFFF] border border-[#E6E5DE] focus:border-[#1C1B18] rounded-xl px-3.5 py-2 pl-9 text-xs text-[#1C1B18] placeholder-[#9E9C92] outline-none font-mono"
              />
              <Search className="w-4 h-4 text-[#9E9C92] absolute left-3 top-2.5" />
            </div>

            {/* Snapshot Cards */}
            <div className="space-y-3 max-h-[750px] overflow-y-auto pr-1">
              {filteredSnapshots.map(snap => {
                const snapCompanies = Object.keys(snap.companyAnalyses || {});
                const isSelected = activeReport?.id === snap.id;
                const dateStr = new Date(snap.timestamp).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={snap.id}
                    onClick={() => {
                      setSelectedId(snap.id);
                      setSelectedCompany(snapCompanies[0] || '');
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-[#FFFFFF] border-[#1C1B18] shadow-md ring-1 ring-[#1C1B18]'
                        : 'bg-[#FFFFFF] border-[#E6E5DE] hover:border-[#D5D4CC] hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-xs text-[#68665E] font-mono">
                        <Calendar className="w-3.5 h-3.5 text-[#1C1B18]" />
                        <span>{dateStr}</span>
                      </div>

                      <button
                        onClick={e => handleDelete(snap.id, e)}
                        className="p-1 rounded-md text-[#9E9C92] hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Delete snapshot from Firestore"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {snapCompanies.map(c => (
                        <span
                          key={c}
                          className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#FAF9F5] border border-[#E6E5DE] text-[#1C1B18] font-medium"
                        >
                          {c}
                        </span>
                      ))}
                    </div>

                    <p className="mt-2 text-xs text-[#68665E] line-clamp-2">
                      {snap.globalSummary || snap.userPrompt}
                    </p>

                    <div className="mt-3 pt-2.5 border-t border-[#E6E5DE] flex items-center justify-between text-[11px] font-mono text-[#9E9C92]">
                      <span className="flex items-center space-x-1">
                        <Zap className="w-3 h-3 text-amber-600" />
                        <span>{snap.modelUsed}</span>
                      </span>
                      <span>{snapCompanies.length} entities</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Detailed Dossier Viewer */}
          <div className="lg:col-span-8 space-y-6">
            {activeReport ? (
              <div className="space-y-6 animate-fadeIn">
                {/* Dossier Action Bar */}
                <div className="p-5 bg-[#FFFFFF] border border-[#E6E5DE] rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#68665E] block">
                      ARCHIVED DOSSIER
                    </span>
                    <h2 className="text-base font-bold text-[#1C1B18]">
                      {companies.join(' • ')}
                    </h2>
                    <p className="text-xs text-[#68665E] font-mono mt-0.5">
                      Synthesized on {new Date(activeReport.timestamp).toLocaleString()} using {activeReport.modelUsed}
                    </p>
                  </div>

                  <div className="flex items-center space-x-3">
                    {onSelectForWorkspace && (
                      <button
                        onClick={() => onSelectForWorkspace(activeReport)}
                        className="px-3.5 py-2 rounded-xl bg-[#FAF9F5] border border-[#E6E5DE] hover:border-[#1C1B18] text-xs font-medium text-[#1C1B18] transition"
                      >
                        Open in Workspace
                      </button>
                    )}

                    <button
                      onClick={handleExportPdf}
                      disabled={isExporting}
                      className="px-4 py-2 rounded-xl bg-[#1C1B18] hover:bg-[#2D2D2D] text-white text-xs font-medium flex items-center space-x-2 transition shadow-sm cursor-pointer"
                    >
                      <FileDown className="w-4 h-4" />
                      <span>{isExporting ? 'Generating PDF...' : 'Download Vector PDF'}</span>
                    </button>
                  </div>
                </div>

                {/* Global Executive Overview */}
                <div className="p-6 bg-[#FFFFFF] border border-[#E6E5DE] rounded-2xl shadow-sm space-y-3">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-[#68665E] flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#1C1B18]" />
                    <span>Executive Macro Synthesis</span>
                  </h3>
                  <p className="text-sm text-[#1C1B18] leading-relaxed font-serif">
                    {activeReport.globalSummary}
                  </p>
                  <div className="pt-2 text-[11px] font-mono text-[#68665E] border-t border-[#E6E5DE]">
                    <span className="font-semibold text-[#1C1B18]">Synthesis Lens:</span> {activeReport.userPrompt}
                  </div>
                </div>

                {/* Cross-Company Impact Matrix */}
                {activeReport.ecosystemImpactMatrix && activeReport.ecosystemImpactMatrix.length > 0 && (
                  <div className="p-6 bg-[#FFFFFF] border border-[#E6E5DE] rounded-2xl shadow-sm space-y-4">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-[#68665E] flex items-center space-x-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#1C1B18]" />
                      <span>Cross-Entity Correlation Matrix</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {activeReport.ecosystemImpactMatrix.map((row, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E6E5DE] text-xs space-y-2"
                        >
                          <div className="flex items-center justify-between font-mono">
                            <span className="font-semibold text-[#1C1B18]">{row.driverCompany}</span>
                            <ArrowRight className="w-3 h-3 text-[#9E9C92]" />
                            <span className="font-semibold text-[#1C1B18]">{row.impactedCompany}</span>
                            <span
                              className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                row.impactType === 'catalyst'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : row.impactType === 'headwind'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {row.impactType}
                            </span>
                          </div>
                          <p className="text-xs text-[#68665E] leading-relaxed">{row.summary}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Entity Deep-Dive Tabs */}
                <div className="p-6 bg-[#FFFFFF] border border-[#E6E5DE] rounded-2xl shadow-sm space-y-6">
                  {/* Entity Selector Pills */}
                  <div className="flex items-center space-x-2 border-b border-[#E6E5DE] pb-4 overflow-x-auto">
                    {companies.map(c => {
                      const isSel = (selectedCompany || companies[0]) === c;
                      return (
                        <button
                          key={c}
                          onClick={() => setSelectedCompany(c)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                            isSel
                              ? 'bg-[#1C1B18] text-white font-semibold shadow-sm'
                              : 'bg-[#FAF9F5] text-[#68665E] border border-[#E6E5DE] hover:border-[#1C1B18]'
                          }`}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>

                  {/* Company Detail View */}
                  {currentAnalysis && (
                    <div className="space-y-6">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center space-x-3">
                          <Building2 className="w-5 h-5 text-[#1C1B18]" />
                          <h4 className="text-lg font-bold text-[#1C1B18]">
                            {currentAnalysis.company}
                          </h4>
                        </div>
                        {getSentimentBadge(currentAnalysis.sentimentLabel, currentAnalysis.sentimentScore)}
                      </div>

                      <p className="text-sm text-[#1C1B18] leading-relaxed font-serif">
                        {currentAnalysis.executiveSummary}
                      </p>

                      {/* Catalysts & Risks */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2">
                          <h5 className="text-xs font-mono font-semibold uppercase text-emerald-900 flex items-center space-x-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Growth Catalysts</span>
                          </h5>
                          <ul className="text-xs text-emerald-950 space-y-1.5 list-disc pl-4">
                            {currentAnalysis.keyCatalysts?.map((cat, i) => (
                              <li key={i}>{cat}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-200 space-y-2">
                          <h5 className="text-xs font-mono font-semibold uppercase text-rose-900 flex items-center space-x-1.5">
                            <TrendingDown className="w-3.5 h-3.5 text-rose-700" />
                            <span>Risk Factors</span>
                          </h5>
                          <ul className="text-xs text-rose-950 space-y-1.5 list-disc pl-4">
                            {currentAnalysis.keyRisks?.map((risk, i) => (
                              <li key={i}>{risk}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Critical Events */}
                      {currentAnalysis.criticalEvents && currentAnalysis.criticalEvents.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="text-xs font-mono font-semibold uppercase text-[#68665E] flex items-center space-x-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Critical High-Volatility Events</span>
                          </h5>
                          <div className="space-y-2">
                            {currentAnalysis.criticalEvents.map((evt, idx) => (
                              <div
                                key={idx}
                                className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E6E5DE] text-xs flex items-start justify-between gap-3"
                              >
                                <div>
                                  <div className="font-semibold text-[#1C1B18]">{evt.title}</div>
                                  <div className="text-[#68665E] mt-0.5">{evt.description}</div>
                                </div>
                                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold flex-shrink-0">
                                  {evt.type} • {evt.severity}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Source Citations */}
                      {currentAnalysis.verifiedSourceCitations && currentAnalysis.verifiedSourceCitations.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="text-xs font-mono font-semibold uppercase text-[#68665E] flex items-center space-x-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-[#1C1B18]" />
                            <span>Verified Source Citations</span>
                          </h5>
                          <div className="divide-y divide-[#E6E5DE] border border-[#E6E5DE] rounded-xl overflow-hidden bg-[#FFFFFF]">
                            {currentAnalysis.verifiedSourceCitations.map((cite, idx) => (
                              <div key={idx} className="p-3 text-xs flex items-center justify-between gap-3 hover:bg-[#FAF9F5] transition">
                                <div className="space-y-1">
                                  <a
                                    href={cite.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium text-[#1C1B18] hover:underline flex items-center space-x-1.5"
                                  >
                                    <span>{cite.title}</span>
                                    <ExternalLink className="w-3 h-3 text-[#9E9C92]" />
                                  </a>
                                  {cite.relevanceQuote && (
                                    <p className="text-[11px] text-[#68665E] italic">
                                      "{cite.relevanceQuote}"
                                    </p>
                                  )}
                                </div>
                                <span className="text-[10px] font-mono text-[#68665E] px-2 py-0.5 rounded bg-[#FAF9F5] border border-[#E6E5DE] flex-shrink-0">
                                  {cite.sourceName} • {(cite.credibilityScore * 100).toFixed(0)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
