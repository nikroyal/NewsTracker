import React from 'react';
import { 
  ShieldCheck, 
  Key, 
  Cpu, 
  History, 
  LogOut, 
  LayoutGrid, 
  Activity, 
  TrendingUp, 
  MessageSquare, 
  Compass, 
  Search, 
  Sparkles,
  Command
} from 'lucide-react';
import { LiveUsageMeter } from './LiveUsageMeter';
import { PlatformHealthWidget } from './PlatformHealthWidget';
import { ProviderQuotaTelemetry } from '../../types/ai';

export type NavigationTab = 
  | 'tracker' 
  | 'stocks' 
  | 'copilot' 
  | 'markets' 
  | 'orchestrator' 
  | 'masterapi' 
  | 'apikeys' 
  | 'history';

interface NavbarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  telemetry: ProviderQuotaTelemetry | null;
  onSignOut: () => void;
  onOpenCommandPalette?: () => void;
  onOpenTour?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  telemetry,
  onSignOut,
  onOpenCommandPalette,
  onOpenTour,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E6E5DE] bg-[#FAF9F5]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Brand */}
        <div 
          onClick={() => onSelectTab('tracker')} 
          className="flex items-center space-x-2.5 cursor-pointer select-none flex-shrink-0"
        >
          <div className="w-8 h-8 rounded-xl bg-[#1C1B18] text-white flex items-center justify-center shadow-xs flex-shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-sm font-bold text-[#1C1B18] tracking-tight font-['Geist',sans-serif]">
                NewsTracker
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#1C1B18] text-white">
                OS
              </span>
            </div>
            <p className="text-[10px] text-[#68665E] font-mono hidden xl:block">
              Single-User Financial Intelligence
            </p>
          </div>
        </div>

        {/* Tab Navigation (Full-page views, no popups) */}
        <nav className="flex items-center space-x-1 bg-[#FFFFFF] border border-[#E6E5DE] p-1 rounded-2xl shadow-xs overflow-x-auto max-w-[650px] scrollbar-none">
          <button
            onClick={() => onSelectTab('tracker')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-mono transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              currentTab === 'tracker'
                ? 'bg-[#1C1B18] text-white font-semibold shadow-xs'
                : 'text-[#68665E] hover:text-[#1C1B18] hover:bg-[#FAF9F5]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Tracker</span>
          </button>

          <button
            onClick={() => onSelectTab('stocks')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-mono transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              currentTab === 'stocks'
                ? 'bg-[#1C1B18] text-white font-semibold shadow-xs'
                : 'text-[#68665E] hover:text-[#1C1B18] hover:bg-[#FAF9F5]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>Stocks</span>
          </button>

          <button
            onClick={() => onSelectTab('copilot')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-mono transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              currentTab === 'copilot'
                ? 'bg-[#1C1B18] text-white font-semibold shadow-xs'
                : 'text-[#68665E] hover:text-[#1C1B18] hover:bg-[#FAF9F5]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
            <span>Copilot</span>
          </button>

          <button
            onClick={() => onSelectTab('markets')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-mono transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              currentTab === 'markets'
                ? 'bg-[#1C1B18] text-white font-semibold shadow-xs'
                : 'text-[#68665E] hover:text-[#1C1B18] hover:bg-[#FAF9F5]'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-sky-600" />
            <span>Markets</span>
          </button>

          <button
            onClick={() => onSelectTab('orchestrator')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-mono transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              currentTab === 'orchestrator'
                ? 'bg-[#1C1B18] text-white font-semibold shadow-xs'
                : 'text-[#68665E] hover:text-[#1C1B18] hover:bg-[#FAF9F5]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Orchestrator</span>
          </button>

          <button
            onClick={() => onSelectTab('masterapi')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-mono transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              currentTab === 'masterapi'
                ? 'bg-[#1C1B18] text-white font-semibold shadow-xs'
                : 'text-[#68665E] hover:text-[#1C1B18] hover:bg-[#FAF9F5]'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden md:inline">Master API</span>
          </button>

          <button
            onClick={() => onSelectTab('apikeys')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-mono transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              currentTab === 'apikeys'
                ? 'bg-[#1C1B18] text-white font-semibold shadow-xs'
                : 'text-[#68665E] hover:text-[#1C1B18] hover:bg-[#FAF9F5]'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Keys</span>
          </button>

          <button
            onClick={() => onSelectTab('history')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-mono transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              currentTab === 'history'
                ? 'bg-[#1C1B18] text-white font-semibold shadow-xs'
                : 'text-[#68665E] hover:text-[#1C1B18] hover:bg-[#FAF9F5]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Archive</span>
          </button>
        </nav>

        {/* Right Actions: Command Palette, Health, Meter, Tour, Logout */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {/* Quick Command Palette Button */}
          {onOpenCommandPalette && (
            <button
              onClick={onOpenCommandPalette}
              className="px-2.5 py-1.5 rounded-xl bg-[#FFFFFF] hover:bg-[#FAF9F5] border border-[#E6E5DE] text-xs font-mono text-[#68665E] hover:text-[#1C1B18] transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
              title="Open Command Palette (Ctrl+K or Cmd+K)"
            >
              <Command className="w-3.5 h-3.5 text-[#1C1B18]" />
              <span className="hidden sm:inline text-[11px]">Cmd+K</span>
            </button>
          )}

          {/* Onboarding Tour Button */}
          {onOpenTour && (
            <button
              onClick={onOpenTour}
              className="p-2 rounded-xl bg-[#FFFFFF] hover:bg-[#FAF9F5] border border-[#E6E5DE] text-[#68665E] hover:text-amber-600 transition cursor-pointer shadow-2xs"
              title="Launch Guided Setup Tour"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Platform Health Monitor */}
          <PlatformHealthWidget />

          {/* Live Dynamic Usage Meter */}
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
