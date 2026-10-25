import React from 'react';
import { ShieldCheck, Key, Cpu, History, LogOut } from 'lucide-react';
import { LiveUsageMeter } from './LiveUsageMeter';
import { ProviderQuotaTelemetry } from '../../types/ai';

interface NavbarProps {
  telemetry: ProviderQuotaTelemetry | null;
  onOpenKeysModal: () => void;
  onOpenModelsModal: () => void;
  onOpenHistoryDrawer: () => void;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  telemetry,
  onOpenKeysModal,
  onOpenModelsModal,
  onOpenHistoryDrawer,
  onSignOut,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-[#0b0f17]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-white tracking-tight">NewsTracker</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                EDGE
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono hidden sm:block">Cloudflare & Firebase Spark</p>
          </div>
        </div>

        {/* Live Dynamic AI Usage Meter HUD */}
        <div className="hidden md:flex items-center">
          <LiveUsageMeter
            telemetry={telemetry}
            onManageModelsClick={onOpenModelsModal}
          />
        </div>

        {/* Actions / Navigation */}
        <div className="flex items-center space-x-2">
          {/* Models Modal */}
          <button
            onClick={onOpenModelsModal}
            className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition flex items-center space-x-1.5 text-xs font-mono"
            title="Model Orchestrator"
          >
            <Cpu className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Orchestrator</span>
          </button>

          {/* API Keys */}
          <button
            onClick={onOpenKeysModal}
            className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition flex items-center space-x-1.5 text-xs font-mono"
            title="In-UI API Key Manager"
          >
            <Key className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">API Keys</span>
          </button>

          {/* History */}
          <button
            onClick={onOpenHistoryDrawer}
            className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition flex items-center space-x-1.5 text-xs font-mono"
            title="Report Snapshots History"
          >
            <History className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">History</span>
          </button>

          {/* Sign Out */}
          <button
            onClick={onSignOut}
            className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-900/60 transition"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
