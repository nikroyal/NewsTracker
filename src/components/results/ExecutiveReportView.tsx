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
  Sparkles,
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

  if (companies.length === 0) return null;

  const currentAnalysis: CompanyAnalysis | undefined = report.companyAnalyses[selectedCompany];

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
    <div className="space-y-6 animate-fadeIn">
      {/* Top Controls / Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#FFFFFF] border border-[#E6E5DE] rounded-2xl shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono text-[#68665E]">
            INTELLIGENCE SYNTHESIS COMPLETE • {companies.length} ENTITIES ANALYZED
          </span>
        </div>

        <button
          onClick={onOpenPdfCustomizer}
          className="px-4 py-2 bg-[#1C1B18] hover:bg-[#2D2D2D] text-white rounded-xl text-xs font-medium flex items-center space-x-2 shadow-sm transition-all cursor-pointer"
        >
          <FileDown className="w-4 h-4" />
          <span>Export Executive Vector PDF</span>
        </button>
      </div>

      {/* Global Executive Summary */}
      <div className="p-6 bg-[#FFFFFF] border border-[#E6E5DE] rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-[#1C1B18]" />
          <h2 className="text-xs font-mono uppercase tracking-wider text-[#68665E] font-semibold">
            Cross-Entity Executive Overview
          </h2>
        </div>
        <p className="text-sm text-[#1C1B18] leading-relaxed font-serif">
          {report.globalSummary}
        </p>
      </div>

      {/* Cross-Company Impact Matrix */}
      {report.ecosystemImpactMatrix && report.ecosystemImpactMatrix.length > 0 && (
        <div className="p-6 bg-[#FFFFFF] border border-[#E6E5DE] rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-[#1C1B18]" />
            <h2 className="text-xs font-mono uppercase tracking-wider text-[#68665E] font-semibold">
              Ecosystem Ripple Effects & Dependencies
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {report.ecosystemImpactMatrix.map((row, idx) => (
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

      {/* Entity-Specific Deep Dives */}
      <div className="p-6 bg-[#FFFFFF] border border-[#E6E5DE] rounded-2xl shadow-sm space-y-6">
        {/* Company Navigation Tabs */}
        <div className="flex items-center space-x-2 border-b border-[#E6E5DE] pb-4 overflow-x-auto">
          {companies.map((company) => {
            const isSelected = selectedCompany === company;
            return (
              <button
                key={company}
                onClick={() => setSelectedCompany(company)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#1C1B18] text-white font-semibold shadow-sm'
                    : 'bg-[#FAF9F5] text-[#68665E] border border-[#E6E5DE] hover:border-[#1C1B18]'
                }`}
              >
                {company}
              </button>
            );
          })}
        </div>

        {/* Selected Entity Dossier */}
        {currentAnalysis && (
          <div className="space-y-6">
            {/* Header / Sentiment */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-[#FAF9F5] border border-[#E6E5DE] flex items-center justify-center text-[#1C1B18]">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1C1B18]">
                    {currentAnalysis.company}
                  </h3>
                  <p className="text-xs text-[#68665E] font-mono">Deduplicated Analysis & Verified Citations</p>
                </div>
              </div>

              {getSentimentBadge(currentAnalysis.sentimentLabel, currentAnalysis.sentimentScore)}
            </div>

            {/* Executive Summary */}
            <div className="p-4 rounded-xl bg-[#FAF9F5] border border-[#E6E5DE]">
              <p className="text-sm text-[#1C1B18] leading-relaxed font-serif">
                {currentAnalysis.executiveSummary}
              </p>
            </div>

            {/* Catalysts & Risks Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Catalysts */}
              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2">
                <div className="flex items-center space-x-1.5 text-emerald-900 font-mono text-xs font-semibold uppercase">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Key Growth Catalysts</span>
                </div>
                <ul className="text-xs text-emerald-950 space-y-1.5 list-disc pl-4 leading-relaxed">
                  {currentAnalysis.keyCatalysts?.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>

              {/* Risks */}
              <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-200 space-y-2">
                <div className="flex items-center space-x-1.5 text-rose-900 font-mono text-xs font-semibold uppercase">
                  <TrendingDown className="w-3.5 h-3.5 text-rose-700" />
                  <span>Headwinds & Critical Risks</span>
                </div>
                <ul className="text-xs text-rose-950 space-y-1.5 list-disc pl-4 leading-relaxed">
                  {currentAnalysis.keyRisks?.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Critical Events */}
            {currentAnalysis.criticalEvents && currentAnalysis.criticalEvents.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center space-x-1.5 text-[#68665E] font-mono text-xs uppercase font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>High-Volatility Corporate Events</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentAnalysis.criticalEvents.map((evt, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E6E5DE] space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#1C1B18]">{evt.title}</span>
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
                          {evt.severity}
                        </span>
                      </div>
                      <p className="text-xs text-[#68665E] leading-relaxed">{evt.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Verified Citations */}
            {currentAnalysis.verifiedSourceCitations && currentAnalysis.verifiedSourceCitations.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center space-x-1.5 text-[#68665E] font-mono text-xs uppercase font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#1C1B18]" />
                  <span>Verified Citations & Original Articles ({currentAnalysis.verifiedSourceCitations.length})</span>
                </div>

                <div className="divide-y divide-[#E6E5DE] border border-[#E6E5DE] rounded-xl overflow-hidden bg-[#FFFFFF]">
                  {currentAnalysis.verifiedSourceCitations.map((cite, idx) => (
                    <div
                      key={idx}
                      className="p-3 text-xs flex flex-wrap items-center justify-between gap-3 hover:bg-[#FAF9F5] transition"
                    >
                      <div className="space-y-1 max-w-2xl">
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

                      <span className="text-[10px] font-mono text-[#68665E] px-2 py-0.5 rounded bg-[#FAF9F5] border border-[#E6E5DE]">
                        {cite.sourceName} • {(cite.credibilityScore * 100).toFixed(0)}% Credibility
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
  );
};
