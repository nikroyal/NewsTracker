import React, { useState } from 'react';
import { Building2, X, Plus, Bookmark, Check } from 'lucide-react';
import { Watchlist } from '../../lib/firestore-service';

interface CompanyTaggerProps {
  companies: string[];
  onChange: (companies: string[]) => void;
  watchlists: Watchlist[];
  onSaveCurrentWatchlist: (name: string) => void;
}

export const CompanyTagger: React.FC<CompanyTaggerProps> = ({
  companies,
  onChange,
  watchlists,
  onSaveCurrentWatchlist,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [watchlistName, setWatchlistName] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addCompany(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && companies.length > 0) {
      removeCompany(companies[companies.length - 1]);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text');
    const parts = paste.split(/[,\n\t]+/).map(s => s.trim()).filter(Boolean);
    const newSet = Array.from(new Set([...companies, ...parts]));
    onChange(newSet);
    setInputValue('');
  };

  const addCompany = (raw: string) => {
    const trimmed = raw.trim().replace(/^,+|,+$/g, '');
    if (!trimmed) return;
    if (!companies.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      onChange([...companies, trimmed]);
    }
    setInputValue('');
  };

  const removeCompany = (target: string) => {
    onChange(companies.filter(c => c !== target));
  };

  const handleLoadWatchlist = (wl: Watchlist) => {
    onChange(wl.companies);
  };

  const handleSaveWatchlist = () => {
    if (!watchlistName.trim() || companies.length === 0) return;
    onSaveCurrentWatchlist(watchlistName.trim());
    setWatchlistName('');
    setShowSaveModal(false);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
          <Building2 className="w-3.5 h-3.5 text-indigo-400" />
          <span>Tracked Companies & Tickers ({companies.length})</span>
        </label>

        {/* Watchlist Preset Selector */}
        <div className="flex items-center space-x-2">
          {watchlists.length > 0 && (
            <div className="flex items-center space-x-1 text-xs">
              <span className="text-slate-500 text-[11px]">Watchlists:</span>
              {watchlists.slice(0, 3).map(wl => (
                <button
                  key={wl.id}
                  onClick={() => handleLoadWatchlist(wl)}
                  className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] text-slate-400 hover:text-white hover:border-slate-700 transition font-mono"
                  title={`Load ${wl.name} (${wl.companies.join(', ')})`}
                >
                  {wl.name}
                </button>
              ))}
            </div>
          )}

          {companies.length > 0 && (
            <button
              onClick={() => setShowSaveModal(true)}
              className="text-[11px] font-mono text-slate-400 hover:text-indigo-400 flex items-center space-x-1 transition ml-1"
              title="Save current companies as a watchlist"
            >
              <Bookmark className="w-3 h-3" />
              <span>Save Set</span>
            </button>
          )}

          {companies.length > 0 && (
            <button
              onClick={() => onChange([])}
              className="text-[11px] font-mono text-slate-500 hover:text-rose-400 transition ml-2"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Tag Input Box */}
      <div className="min-h-[46px] p-2 bg-slate-900/60 border border-slate-800 focus-within:border-indigo-500/80 rounded-xl flex flex-wrap items-center gap-1.5 transition-all">
        {companies.map((company) => (
          <span
            key={company}
            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs font-medium text-indigo-200 group hover:border-indigo-500/40 transition-all animate-fadeIn"
          >
            <span>{company}</span>
            <button
              type="button"
              onClick={() => removeCompany(company)}
              className="p-0.5 rounded-full hover:bg-indigo-500/20 text-indigo-400 hover:text-white transition"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => addCompany(inputValue)}
          placeholder={companies.length === 0 ? "Type company name or ticker (e.g. Apple, TSMC, NVDA) and press Enter..." : "Add another..."}
          className="flex-1 min-w-[140px] bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none px-2 py-1 font-mono"
        />
      </div>

      {/* Save Watchlist Inline Modal */}
      {showSaveModal && (
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center space-x-2 animate-fadeIn text-xs">
          <input
            type="text"
            value={watchlistName}
            onChange={(e) => setWatchlistName(e.target.value)}
            placeholder="Watchlist Name (e.g. AI Hardware)"
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-indigo-500"
            autoFocus
          />
          <button
            onClick={handleSaveWatchlist}
            disabled={!watchlistName.trim()}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center space-x-1 disabled:opacity-40"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>
          <button
            onClick={() => setShowSaveModal(false)}
            className="px-2 py-1.5 rounded-lg text-slate-400 hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
