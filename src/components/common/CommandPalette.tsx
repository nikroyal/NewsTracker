import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  LayoutGrid, 
  TrendingUp, 
  MessageSquare, 
  Cpu, 
  Activity, 
  Key, 
  History, 
  Sparkles, 
  ArrowRight,
  X,
  Compass,
  FileDown
} from 'lucide-react';
import { NavigationTab } from './Navbar';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: NavigationTab) => void;
  onQuickSearchStock?: (query: string) => void;
  onOpenPdfModal?: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'Navigation' | 'Actions' | 'Tools';
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenPdfModal,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const items: CommandItem[] = [
    {
      id: 'nav-tracker',
      title: 'News Intelligence & Synthesis Tracker',
      subtitle: 'Monitor news feeds, aggregate company articles, and generate digests',
      category: 'Navigation',
      icon: <LayoutGrid className="w-4 h-4 text-[#1C1B18]" />,
      action: () => { onNavigate('tracker'); onClose(); },
      keywords: ['news', 'feed', 'articles', 'synthesis', 'tracker'],
    },
    {
      id: 'nav-stocks',
      title: 'Stocks & Watchlist Ledger',
      subtitle: 'Real-time equity quotes for US (NASDAQ, NYSE) and Indian (NSE, BSE) markets',
      category: 'Navigation',
      icon: <TrendingUp className="w-4 h-4 text-emerald-600" />,
      action: () => { onNavigate('stocks' as any); onClose(); },
      keywords: ['stocks', 'equities', 'watchlist', 'market', 'nse', 'nasdaq'],
    },
    {
      id: 'nav-copilot',
      title: 'AI Financial Copilot',
      subtitle: 'Interactive Wall Street analyst chat grounded in balance sheets and DuPont metrics',
      category: 'Navigation',
      icon: <MessageSquare className="w-4 h-4 text-amber-600" />,
      action: () => { onNavigate('copilot' as any); onClose(); },
      keywords: ['copilot', 'chat', 'ai', 'analyst', 'conversation'],
    },
    {
      id: 'nav-markets',
      title: 'Global Markets & Opportunity Scanner',
      subtitle: 'Macro indices, currency conversions, value signals, and system health',
      category: 'Navigation',
      icon: <Compass className="w-4 h-4 text-sky-600" />,
      action: () => { onNavigate('markets' as any); onClose(); },
      keywords: ['markets', 'macro', 'nifty', 'sp500', 'opportunities', 'signals'],
    },
    {
      id: 'nav-orchestrator',
      title: 'Model Orchestrator & Edge Gateway',
      subtitle: 'Multi-provider failover chains, cooldowns, and prompt cache metrics',
      category: 'Navigation',
      icon: <Cpu className="w-4 h-4 text-purple-600" />,
      action: () => { onNavigate('orchestrator'); onClose(); },
      keywords: ['orchestrator', 'models', 'gemini', 'openrouter', 'groq', 'failover'],
    },
    {
      id: 'nav-masterapi',
      title: 'Master Financial API Engine',
      subtitle: 'Telemetry playground, zero-hardcoded latency benchmarks, and API key vault',
      category: 'Navigation',
      icon: <Activity className="w-4 h-4 text-emerald-500" />,
      action: () => { onNavigate('masterapi'); onClose(); },
      keywords: ['master', 'api', 'benchmarks', 'playground', 'token'],
    },
    {
      id: 'nav-apikeys',
      title: 'API Keys & Upstream Quotas',
      subtitle: 'Manage universal provider keys and inspect dynamic rate limits',
      category: 'Navigation',
      icon: <Key className="w-4 h-4 text-indigo-500" />,
      action: () => { onNavigate('apikeys'); onClose(); },
      keywords: ['keys', 'secrets', 'settings', 'limits', 'quota'],
    },
    {
      id: 'nav-history',
      title: 'Report Archive',
      subtitle: 'Historical vector intelligence syntheses stored in Cloud Firestore',
      category: 'Navigation',
      icon: <History className="w-4 h-4 text-[#68665E]" />,
      action: () => { onNavigate('history'); onClose(); },
      keywords: ['history', 'archive', 'past', 'snapshots', 'saved'],
    },
    {
      id: 'act-export-pdf',
      title: 'Export Vector Executive PDF',
      subtitle: 'Download professional Wall-Street grade PDF report with DuPont tables',
      category: 'Actions',
      icon: <FileDown className="w-4 h-4 text-rose-600" />,
      action: () => { if (onOpenPdfModal) onOpenPdfModal(); onClose(); },
      keywords: ['pdf', 'export', 'download', 'vector', 'report'],
    },
  ];

  const filtered = items.filter(item => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      (item.keywords && item.keywords.some(k => k.includes(q)))
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + (filtered.length || 1)) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-[#1C1B18]/40 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-[#FFFFFF] border border-[#E6E5DE] rounded-2xl shadow-2xl overflow-hidden animate-scaleUp"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-[#E6E5DE] gap-3 bg-[#FAF9F5]">
          <Search className="w-4 h-4 text-[#9E9C92] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="Type a command, stock symbol, or jump to page..."
            className="w-full bg-transparent text-sm text-[#1C1B18] placeholder-[#9E9C92] focus:outline-hidden font-mono"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-[#68665E] bg-[#FFFFFF] border border-[#E6E5DE] rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-[#F2F0EB]">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs font-mono text-[#9E9C92]">
              No commands found matching "{query}"
            </div>
          ) : (
            filtered.map((item, idx) => (
              <div
                key={item.id}
                onClick={item.action}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex items-center justify-between p-2.5 rounded-xl transition cursor-pointer ${
                  selectedIndex === idx
                    ? 'bg-[#FAF9F5] border border-[#E6E5DE]'
                    : 'hover:bg-[#FAF9F5]/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#FAF9F5] border border-[#E6E5DE]">
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#1C1B18]">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-[#68665E] line-clamp-1">
                      {item.subtitle}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#9E9C92]" />
              </div>
            ))
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-[#E6E5DE] bg-[#FAF9F5] flex items-center justify-between text-[10px] font-mono text-[#68665E]">
          <div className="flex items-center gap-2">
            <span>↑↓ Navigate</span>
            <span>•</span>
            <span>↵ Select</span>
            <span>•</span>
            <span>esc Dismiss</span>
          </div>
          <span className="font-semibold text-[#1C1B18]">NewsTracker OS</span>
        </div>
      </div>
    </div>
  );
};
