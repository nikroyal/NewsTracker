import React from 'react';
import { ShieldCheck, Key, Cpu, History, LogOut, LayoutGrid } from 'lucide-react';
import { LiveUsageMeter } from './LiveUsageMeter';
import { ProviderQuotaTelemetry } from '../../types/ai';

export type NavigationTab = 'tracker' | 'orchestrator' | 'apikeys' | 'history';

interface NavbarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  telemetry: ProviderQuotaTelemetry | null;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  telemetry,
  onSignOut,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E6E5DE] bg-[#FAF9F5]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div 
          onClick={() => onSelectTab('tracker')} 
          className="flex items-center space-x-3 cursor-pointer select-none"
        >
          <div className="w-9 h-9 rounded-xl bg-[#1C1B18] text-white flex items-center justify-center shadow-xs flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-[#1C1B18] tracking-tight font-['Geist',sans-serif]">
                NewsTracker
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#FFFFFF] text-[#68665E] border border-[#E6E5DE]">
                EDGE
              </span>
            </div>
            <p className="text-[10px] text-[#68665E] font-mono hidden sm:block">
              Cloudflare & Firebase Spark
            </p>
          </div>
        </div>

        {/* Tab Navigation (Full-page views, no popups) */}
        <nav className="flex items-center space-x-1 bg-[#FFFFFF] border border-[#E6E5DE] p-1 rounded-2xl shadow-xs">
          <button
            onClick={() => onSelectTab('tracker')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all flex items-center space-x-1.5 cursor-pointer ${
              currentTab === 'tracker'
                ? 'bg-[#1C1B18] text-white font-semibold shadow-xs'
                : 'text-[#68665E] hover:text-[#1C1B18] hover:bg-[#FAF9F5]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tracker</span>
          </button>

          <button
            onClick={() => onSelectTab('orchestrator')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all flex items-center space-x-1.5 cursor-pointer ${
              currentTab === 'orchestrator'
                ? 'bg-[#1C1B18] text-white font-semibold shadow-xs'
                : 'text-[#68665E] hover:text-[#1C1B18] hover:bg-[#FAF9F5]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Orchestrator</span>
          </button>

          <button
            onClick={() => onSelectTab('apikeys')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all flex items-center space-x-1.5 cursor-pointer ${
              currentTab === 'apikeys'
                ? 'bg-[#1C1B18] text-white font-semibold shadow-xs'
                : 'text-[#68665E] hover:text-[#1C1B18] hover:bg-[#FAF9F5]'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">API Keys & Sources</span>
          </button>

          <button
            onClick={() => onSelectTab('history')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all flex items-center space-x-1.5 cursor-pointer ${
              currentTab === 'history'
                ? 'bg-[#1C1B18] text-white font-semibold shadow-xs'
                : 'text-[#68665E] hover:text-[#1C1B18] hover:bg-[#FAF9F5]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Report Archive</span>
          </button>
        </nav>

        {/* Live Dynamic Usage Meter & Logout */}
        <div className="flex items-center space-x-3">
          <div className="hidden lg:flex items-center">
            <LiveUsageMeter
              telemetry={telemetry}
              onManageModelsClick={() => onSelectTab('orchestrator')}
            />
          </div>

          {/* Sign Out */}
          <button
            onClick={onSignOut}
            className="p-2 rounded-xl text-[#9E9C92] hover:text-rose-600 hover:bg-[#FFFFFF] border border-transparent hover:border-[#E6E5DE] transition cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
