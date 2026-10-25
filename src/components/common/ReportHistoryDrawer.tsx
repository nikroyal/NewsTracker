import React from 'react';
import { X, History, Calendar, FileText, ChevronRight, Zap } from 'lucide-react';
import { SynthesisReport } from '../../types/ai';

interface ReportHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  snapshots: SynthesisReport[];
  onSelectSnapshot: (report: SynthesisReport) => void;
}

export const ReportHistoryDrawer: React.FC<ReportHistoryDrawerProps> = ({
  isOpen,
  onClose,
  snapshots,
  onSelectSnapshot,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#0f172a] border-l border-slate-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-900/50">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <History className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Report Snapshot History</h2>
                <p className="text-xs text-slate-400 font-mono">Zero-Token Offline Review</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* List */}
          <div className="p-6 overflow-y-auto space-y-3 flex-1">
            {snapshots.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs font-mono">
                No past reports saved yet. Completed news tracking runs will appear here for instant zero-token recall.
              </div>
            ) : (
              snapshots.map((snap) => {
                const companies = Object.keys(snap.companyAnalyses || {});
                const dateStr = new Date(snap.timestamp).toLocaleString();

                return (
                  <div
                    key={snap.id}
                    onClick={() => {
                      onSelectSnapshot(snap);
                      onClose();
                    }}
                    className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{dateStr}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {companies.map(c => (
                        <span key={c} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {c}
                        </span>
                      ))}
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 font-mono border-t border-slate-800/60 pt-2">
                      <span className="flex items-center space-x-1">
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span>{snap.modelUsed}</span>
                      </span>
                      <span>{companies.length} companies</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
