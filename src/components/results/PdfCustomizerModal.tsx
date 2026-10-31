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
    }, 250);
  };

  const toggles: { key: keyof PdfCustomizerOptions; label: string; desc: string }[] = [
    { key: 'includeExecutiveSummary', label: 'Executive Macro Overview', desc: 'Overall high-level cross-entity synthesis' },
    { key: 'includeImpactMatrix', label: 'Cross-Entity Ripple Effect Matrix', desc: 'Dependencies and secondary ecosystem correlations' },
    { key: 'includeCatalystsAndRisks', label: 'Catalysts & Risk Factors', desc: 'Bulleted positive drivers and market/regulatory risks' },
    { key: 'includeCriticalEvents', label: 'Critical High-Volatility Events', desc: 'Leadership, earnings, regulatory, and litigation alerts' },
    { key: 'includeCitations', label: 'Verified Citations & URLs', desc: 'Original article sources with credibility scores' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-lg bg-[#FFFFFF] border border-[#D5D4CC] rounded-2xl shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E6E5DE] bg-[#FAF9F5]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FFFFFF] border border-[#E6E5DE] flex items-center justify-center text-[#1C1B18]">
              <FileDown className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#1C1B18]">Customize Executive PDF</h2>
              <p className="text-xs text-[#68665E]">Select sections to render into vector PDF</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9E9C92] hover:text-[#1C1B18] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Checkboxes */}
        <div className="p-6 space-y-3">
          {toggles.map(({ key, label, desc }) => {
            const isChecked = options[key];
            return (
              <div
                key={key}
                onClick={() => toggle(key)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start space-x-3 ${
                  isChecked
                    ? 'bg-[#FAF9F5] border-[#1C1B18]/40'
                    : 'bg-[#FFFFFF] border-[#E6E5DE] hover:border-[#D5D4CC]'
                }`}
              >
                <div className="mt-0.5 text-[#1C1B18]">
                  {isChecked ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4 text-[#9E9C92]" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#1C1B18]">{label}</div>
                  <div className="text-[11px] text-[#68665E]">{desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#FAF9F5] border-t border-[#E6E5DE] flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-[#68665E] hover:text-[#1C1B18] transition"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={generating}
            className="px-5 py-2 rounded-xl bg-[#1C1B18] hover:bg-[#2D2D2D] text-white text-xs font-medium flex items-center space-x-2 transition shadow-sm cursor-pointer disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" />
            <span>{generating ? 'Generating...' : 'Download PDF'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
