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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-mono uppercase tracking-wider text-[#68665E] flex items-center space-x-1.5 font-semibold">
          <Building2 className="w-3.5 h-3.5 text-[#1C1B18]" />
          <span>Tracked Entities & Tickers ({companies.length})</span>
        </label>

        {/* Watchlist Preset Selector */}
        <div className="flex items-center space-x-2">
          {watchlists.length > 0 && (
            <div className="flex items-center space-x-1 text-xs">
              <span className="text-[#9E9C92] text-[11px] font-mono">Watchlists:</span>
              {watchlists.slice(0, 4).map(wl => (
                <button
                  key={wl.id}
                  onClick={() => handleLoadWatchlist(wl)}
                  className="px-2 py-0.5 rounded-md bg-[#FAF9F5] border border-[#E6E5DE] text-[11px] text-[#1C1B18] hover:border-[#1C1B18] transition font-mono"
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
              className="text-[11px] font-mono text-[#68665E] hover:text-[#1C1B18] flex items-center space-x-1 transition ml-1"
              title="Save current companies as a watchlist in Firestore"
            >
              <Bookmark className="w-3 h-3" />
              <span>Save Watchlist</span>
            </button>
          )}

          {companies.length > 0 && (
            <button
              onClick={() => onChange([])}
              className="text-[11px] font-mono text-[#9E9C92] hover:text-rose-600 transition ml-2"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Tag Input Box */}
      <div className="min-h-[48px] p-2 bg-[#FAF9F5] border border-[#E6E5DE] focus-within:border-[#1C1B18] focus-within:bg-[#FFFFFF] rounded-xl flex flex-wrap items-center gap-1.5 transition-all">
        {companies.map((company) => (
          <span
            key={company}
            className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#FFFFFF] border border-[#E6E5DE] text-xs font-medium text-[#1C1B18] shadow-sm animate-fadeIn"
          >
            <span>{company}</span>
            <button
              type="button"
              onClick={() => removeCompany(company)}
              className="p-0.5 rounded hover:bg-[#FAF9F5] text-[#9E9C92] hover:text-[#1C1B18] transition"
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
          placeholder={companies.length === 0 ? "Type entity or ticker (e.g. Apple, TSMC, NVDA) and press Enter..." : "Add entity..."}
          className="flex-1 min-w-[140px] bg-transparent text-xs text-[#1C1B18] placeholder-[#9E9C92] focus:outline-none px-2 py-1 font-mono"
        />
      </div>

      {/* Save Watchlist Inline Modal */}
      {showSaveModal && (
        <div className="p-3 bg-[#FFFFFF] border border-[#D5D4CC] rounded-xl flex items-center space-x-2 animate-fadeIn text-xs shadow-sm">
          <input
            type="text"
            value={watchlistName}
            onChange={(e) => setWatchlistName(e.target.value)}
            placeholder="Watchlist Name (e.g. AI Hardware Giants)"
            className="flex-1 bg-[#FAF9F5] border border-[#E6E5DE] rounded-lg px-3 py-1.5 text-[#1C1B18] font-mono focus:outline-none focus:border-[#1C1B18]"
            autoFocus
          />
          <button
            onClick={handleSaveWatchlist}
            disabled={!watchlistName.trim()}
            className="px-3.5 py-1.5 rounded-lg bg-[#1C1B18] hover:bg-[#2D2D2D] text-white font-medium flex items-center space-x-1 disabled:opacity-40"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save to Cloud</span>
          </button>
          <button
            onClick={() => setShowSaveModal(false)}
            className="px-2.5 py-1.5 rounded-lg text-[#68665E] hover:text-[#1C1B18]"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
