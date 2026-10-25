import React, { useState } from 'react';
import {
  FileDown,
  Building2,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Zap,
  ArrowRight,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SynthesisReport, CompanyAnalysis } from '../../types/ai';

interface ExecutiveReportViewProps {
  report: SynthesisReport;
  onOpenPdfCustomizer: () => void;
}

export const ExecutiveReportView: React.FC<ExecutiveReportViewProps> = ({
  report,
  onOpenPdfCustomizer,
}) => {
  const companies = Object.keys(report.companyAnalyses || {});
  const [selectedCompany, setSelectedCompany] = useState<string>(companies[0] || '');
  const [showMatrix, setShowMatrix] = useState(true);

  if (companies.length === 0) return null;

  const currentAnalysis: CompanyAnalysis | undefined = report.companyAnalyses[selectedCompany];

  const getSentimentBadge = (label: string, score: number) => {
    let color = 'bg-slate-800 text-slate-300 border-slate-700';
    let Icon = Minus;

    if (score >= 0.25) {
      color = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      Icon = TrendingUp;
    } else if (score <= -0.25) {
      color = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
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
    <div className="space-y-6 animate-fadeIn">
      {/* Top Controls / Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono text-slate-400">
            INTELLIGENCE SYNTHESIS READY • {companies.length} ENTITIES ANALYZED
          </span>
        </div>

        <button
          onClick={onOpenPdfCustomizer}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium flex items-center space-x-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
        >
          <FileDown className="w-4 h-4" />
          <span>Download PDF Report</span>
        </button>
      </div>

      {/* 1. Global Executive Overview */}
      {report.globalSummary && (
        <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl relative overflow-hidden">
          <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-indigo-400 mb-2">
            <Layers className="w-3.5 h-3.5" />
            <span>Executive Global Briefing</span>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed font-['Geist',sans-serif]">
            {report.globalSummary}
          </p>
        </div>
      )}

      {/* 2. Cross-Company Ecosystem Impact Matrix */}
      {report.ecosystemImpactMatrix && report.ecosystemImpactMatrix.length > 0 && (
        <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/30">
          <div
            onClick={() => setShowMatrix(prev => !prev)}
            className="flex items-center justify-between px-6 py-3.5 bg-slate-900/60 border-b border-slate-800 cursor-pointer hover:bg-slate-900/80 transition"
          >
            <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-slate-300">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Cross-Company Ecosystem Impact Matrix</span>
              <span className="text-slate-500 text-[11px]">({report.ecosystemImpactMatrix.length} Correlations)</span>
            </div>
            {showMatrix ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>

          {showMatrix && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400">
                    <th className="py-2.5 px-4 font-medium">Driver Entity</th>
                    <th className="py-2.5 px-4 font-medium">Impacted Entity</th>
                    <th className="py-2.5 px-4 font-medium">Type</th>
                    <th className="py-2.5 px-4 font-medium font-['Geist',sans-serif]">Strategic Ripple Effect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {report.ecosystemImpactMatrix.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4 font-semibold text-white">{row.driverCompany}</td>
                      <td className="py-3 px-4 text-slate-300 font-semibold">{row.impactedCompany}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase font-semibold ${
                          row.impactType === 'catalyst'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {row.impactType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-['Geist',sans-serif] leading-normal">{row.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. Company Navigation Tabs (Strict Non-Overlapping Isolation) */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 overflow-x-auto scrollbar-none">
          {companies.map(company => {
            const isSelected = selectedCompany === company;
            const analysis = report.companyAnalyses[company];
            return (
              <button
                key={company}
                onClick={() => setSelectedCompany(company)}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center space-x-2 flex-shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>{company}</span>
                {analysis?.criticalEvents && analysis.criticalEvents.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                )}
              </button>
            );
          })}
        </div>

        {/* Active Company Profile Card */}
        {currentAnalysis && (
          <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-6 animate-fadeIn">
            {/* Header of Active Company */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
                  <span>{currentAnalysis.company}</span>
                  <span className="text-xs font-mono font-normal text-slate-500">ISOLATED DOSSIER</span>
                </h3>
              </div>
              <div>
                {getSentimentBadge(currentAnalysis.sentimentLabel, currentAnalysis.sentimentScore)}
              </div>
            </div>

            {/* Critical Events (if any) */}
            {currentAnalysis.criticalEvents && currentAnalysis.criticalEvents.length > 0 && (
              <div className="space-y-2">
                {currentAnalysis.criticalEvents.map((evt, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start space-x-3 text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-rose-300 uppercase tracking-wider text-[11px]">
                          [{evt.type}] {evt.title}
                        </span>
                      </div>
                      <p className="text-rose-200/80 mt-1 leading-relaxed">{evt.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Executive Summary */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider">Executive Synthesis</h4>
              <p className="text-sm text-slate-200 leading-relaxed font-['Geist',sans-serif]">
                {currentAnalysis.executiveSummary}
              </p>
            </div>

            {/* Catalysts & Risks Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Catalysts */}
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                <h5 className="text-xs font-semibold text-emerald-400 flex items-center space-x-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Growth Catalysts & Tailwinds</span>
                </h5>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {currentAnalysis.keyCatalysts.map((cat, idx) => (
                    <li key={idx} className="flex items-start space-x-1.5 leading-relaxed">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>{cat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Risks */}
              <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-2">
                <h5 className="text-xs font-semibold text-rose-400 flex items-center space-x-1.5">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>Strategic & Regulatory Risks</span>
                </h5>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {currentAnalysis.keyRisks.map((risk, idx) => (
                    <li key={idx} className="flex items-start space-x-1.5 leading-relaxed">
                      <span className="text-rose-500 font-bold">•</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Verified Source Citations */}
            {currentAnalysis.verifiedSourceCitations && currentAnalysis.verifiedSourceCitations.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-slate-800/60">
                <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Verified Source Citations & Provenance</span>
                </h4>

                <div className="grid grid-cols-1 gap-2">
                  {currentAnalysis.verifiedSourceCitations.map((cite, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-white">{cite.sourceName}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            {(cite.credibilityScore * 100).toFixed(0)}% Veracity
                          </span>
                        </div>
                        <p className="text-slate-300 text-xs italic">"{cite.relevanceQuote || cite.title}"</p>
                      </div>

                      <a
                        href={cite.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 font-mono text-xs flex-shrink-0"
                      >
                        <span>View Source</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
