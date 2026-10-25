import React, { useState } from 'react';
import { X, FileDown, CheckSquare, Square, FileText } from 'lucide-react';
import { SynthesisReport } from '../../types/ai';
import { generateExecutivePdf, PdfCustomizerOptions } from '../../lib/pdf-generator';

interface PdfCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: SynthesisReport;
}

export const PdfCustomizerModal: React.FC<PdfCustomizerModalProps> = ({
  isOpen,
  onClose,
  report,
}) => {
  const [options, setOptions] = useState<PdfCustomizerOptions>({
    includeExecutiveSummary: true,
    includeImpactMatrix: true,
    includeCatalystsAndRisks: true,
    includeCriticalEvents: true,
    includeCitations: true,
  });
  const [generating, setGenerating] = useState(false);

  if (!isOpen) return null;

  const toggle = (key: keyof PdfCustomizerOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExport = () => {
    setGenerating(true);
    setTimeout(() => {
      generateExecutivePdf(report, options);
      setGenerating(false);
      onClose();
    }, 300);
  };

  const toggles: { key: keyof PdfCustomizerOptions; label: string; desc: string }[] = [
    { key: 'includeExecutiveSummary', label: 'Executive Global Overview', desc: 'Overall high-level synthesis across all entities' },
    { key: 'includeImpactMatrix', label: 'Cross-Company Ecosystem Matrix', desc: 'Secondary ripple effects and correlation analysis' },
    { key: 'includeCatalystsAndRisks', label: 'Growth Catalysts & Risk Factors', desc: 'Bulleted positive catalysts and regulatory/market risks' },
    { key: 'includeCriticalEvents', label: 'Critical Event Badges', desc: 'High-volatility event warnings (SEC, CEO, M&A)' },
    { key: 'includeCitations', label: 'Verified Citations Table', desc: 'Clickable article references with credibility scores' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <FileDown className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Customize PDF Report</h2>
              <p className="text-xs text-slate-400">Select which sections to include in your downloadable report</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="p-6 space-y-3">
          {toggles.map(({ key, label, desc }) => {
            const isChecked = options[key];
            return (
              <div
                key={key}
                onClick={() => toggle(key)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start space-x-3 ${
                  isChecked
                    ? 'bg-slate-900/80 border-slate-700 text-slate-200'
                    : 'bg-slate-900/30 border-slate-800 text-slate-500'
                }`}
              >
                <div className="mt-0.5 text-indigo-400">
                  {isChecked ? <CheckSquare className="w-4 h-4 text-indigo-400" /> : <Square className="w-4 h-4 text-slate-600" />}
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">{label}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/50">
          <span className="text-xs font-mono text-slate-500">Vector PDF • Instant Generation</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={generating}
              className="px-5 py-2 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition flex items-center space-x-1.5"
            >
              <FileDown className="w-4 h-4" />
              <span>{generating ? 'Generating PDF...' : 'Download PDF Report'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
