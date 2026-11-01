import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Eye, 
  Sparkles, 
  Activity, 
  ExternalLink, 
  RefreshCw,
  Info,
  ShieldCheck,
  ChevronRight,
  X
} from 'lucide-react';
import { TrackedStock } from '../types/business-os';
import { 
  loadTrackedStocks, 
  saveTrackedStock, 
  deleteTrackedStock, 
  INITIAL_TRACKED_STOCKS 
} from '../lib/firestore-service';
import { fetchBatchQuotes, fetchStockOverview, searchMarketSymbols } from '../lib/api-client';
import { ProvenanceBadge } from '../components/common/ProvenanceBadge';

export const WatchlistPage: React.FC = () => {
  const [stocks, setStocks] = useState<TrackedStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exchangeFilter, setExchangeFilter] = useState<'all' | 'us' | 'india'>('all');
  const [selectedStock, setSelectedStock] = useState<TrackedStock | null>(null);
  const [selectedStockOverview, setSelectedStockOverview] = useState<any | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);

  // Form State
  const [newTicker, setNewTicker] = useState('');
  const [newName, setNewName] = useState('');
  const [newExchange, setNewExchange] = useState('NASDAQ');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Load stocks on mount
  useEffect(() => {
    loadTrackedStocks().then(loaded => {
      setStocks(loaded);
      setLoading(false);
      refreshLiveQuotes(loaded);
    });
  }, []);

  // Refresh live prices from Master Market API
  const refreshLiveQuotes = async (currentStocks: TrackedStock[]) => {
    if (currentStocks.length === 0) return;
    setRefreshing(true);
    try {
      const symbols = currentStocks.map(s => s.symbol || s.ticker);
      const quotes = await fetchBatchQuotes(symbols);

      setStocks(prev => prev.map(stock => {
        const key = stock.symbol || stock.ticker;
        const q = quotes[key];
        if (q) {
          return {
            ...stock,
            livePrice: q.lastPrice,
            changePercent: q.percentChange,
            marketCap: q.marketCap,
            peRatio: q.peRatio,
            yearLow: q.yearLow,
            yearHigh: q.yearHigh,
            currency: q.currency || stock.currency,
            lastUpdated: new Date().toISOString(),
          };
        }
        return stock;
      }));
    } catch (err) {
      console.warn('Batch quote refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Search autocomplete
  useEffect(() => {
    if (!newTicker.trim() || newTicker.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchMarketSymbols(newTicker);
        setSearchResults(results.slice(0, 5));
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [newTicker]);

  const handleSelectSearchResult = (res: any) => {
    setNewTicker(res.symbol);
    setNewName(res.name);
    if (res.exch.includes('NSE') || res.symbol.endsWith('.NS')) {
      setNewExchange('NSE');
    } else if (res.exch.includes('BSE') || res.symbol.endsWith('.BO')) {
      setNewExchange('BSE');
    } else {
      setNewExchange('NASDAQ');
    }
    setSearchResults([]);
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicker.trim()) return;

    const tickerUpper = newTicker.trim().toUpperCase();
    const isIndia = newExchange === 'NSE' || newExchange === 'BSE';
    const symbol = isIndia && !tickerUpper.includes('.') ? `${tickerUpper}.NS` : tickerUpper;

    const newEntry: TrackedStock = {
      id: 'stock_' + Date.now().toString(36),
      ticker: tickerUpper,
      symbol,
      name: newName.trim() || tickerUpper,
      exchange: newExchange,
      country: isIndia ? 'India' : 'US',
      currency: isIndia ? 'INR' : 'USD',
      addedAt: new Date().toISOString(),
    };

    const updated = [newEntry, ...stocks];
    setStocks(updated);
    setNewTicker('');
    setNewName('');
    setSearchResults([]);
    await saveTrackedStock(newEntry);
    refreshLiveQuotes(updated);
  };

  const handleDelete = async (id: string) => {
    const updated = stocks.filter(s => s.id !== id);
    setStocks(updated);
    if (selectedStock?.id === id) {
      setSelectedStock(null);
      setSelectedStockOverview(null);
    }
    await deleteTrackedStock(id);
  };

  const handleLoadSample = async () => {
    setStocks(INITIAL_TRACKED_STOCKS);
    for (const s of INITIAL_TRACKED_STOCKS) {
      await saveTrackedStock(s);
    }
    refreshLiveQuotes(INITIAL_TRACKED_STOCKS);
  };

  const handleSelectStock = async (stock: TrackedStock) => {
    setSelectedStock(stock);
    setLoadingOverview(true);
    try {
      const overview = await fetchStockOverview(stock.symbol || stock.ticker);
      setSelectedStockOverview(overview);
    } catch {
      setSelectedStockOverview(null);
    } finally {
      setLoadingOverview(false);
    }
  };

  const filteredStocks = stocks.filter(s => {
    if (exchangeFilter === 'us') return s.country === 'US';
    if (exchangeFilter === 'india') return s.country === 'India';
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 bg-[#FFFFFF] border border-[#E6E5DE] rounded-3xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h1 className="text-xl font-serif font-bold text-[#1C1B18]">
              Stocks & Watchlist Ledger
            </h1>
          </div>
          <p className="text-xs font-mono text-[#68665E]">
            Surveillance ledger for US & Indian equities with live DuPont ROE & solvency tracking
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ProvenanceBadge
            category="Real Market Data"
            source="NSE & Yahoo Finance Wire"
            confidence="High"
          />
          <button
            onClick={() => refreshLiveQuotes(stocks)}
            disabled={refreshing}
            className="px-3 py-1.5 rounded-xl bg-[#FAF9F5] hover:bg-[#FFFFFF] border border-[#E6E5DE] text-xs font-mono text-[#1C1B18] flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            title="Refresh Quotes"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left = Add Form & Table, Right = Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={selectedStock ? 'lg:col-span-2 space-y-6' : 'lg:col-span-3 space-y-6'}>
          {/* Add Stock Card */}
          <div className="p-5 bg-[#FFFFFF] border border-[#E6E5DE] rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#68665E]">
                Track New Equity Target
              </h2>
              {stocks.length === 0 && (
                <button
                  onClick={handleLoadSample}
                  className="text-xs font-mono text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Load Sample Mega-Caps
                </button>
              )}
            </div>

            <form onSubmit={handleAddStock} className="flex flex-wrap items-end gap-3">
              <div className="min-w-[130px] flex-1">
                <label className="text-[11px] font-mono text-[#68665E] block mb-1">Exchange</label>
                <select
                  value={newExchange}
                  onChange={e => setNewExchange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF9F5] border border-[#E6E5DE] text-xs font-mono text-[#1C1B18] focus:outline-hidden"
                >
                  <option value="NASDAQ">NASDAQ (US)</option>
                  <option value="NYSE">NYSE (US)</option>
                  <option value="NSE">NSE (India)</option>
                  <option value="BSE">BSE (India)</option>
                </select>
              </div>

              <div className="relative min-w-[150px] flex-2">
                <label className="text-[11px] font-mono text-[#68665E] block mb-1">Ticker / Symbol</label>
                <input
                  type="text"
                  value={newTicker}
                  onChange={e => setNewTicker(e.target.value)}
                  placeholder="e.g. AAPL, NVDA, RELIANCE"
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF9F5] border border-[#E6E5DE] text-xs font-mono uppercase text-[#1C1B18] focus:outline-hidden"
                />

                {/* Autocomplete Dropdown */}
                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-[#FFFFFF] border border-[#E6E5DE] rounded-xl shadow-lg z-20 overflow-hidden divide-y divide-[#F2F0EB]">
                    {searchResults.map((res, i) => (
                      <div
                        key={i}
                        onClick={() => handleSelectSearchResult(res)}
                        className="p-2.5 hover:bg-[#FAF9F5] cursor-pointer text-xs font-mono flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#1C1B18]">{res.symbol}</span>
                          <span className="text-[#68665E] text-[11px] truncate max-w-[150px]">{res.name}</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FAF9F5] border border-[#E6E5DE] text-[#68665E]">
                          {res.exch}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="min-w-[180px] flex-2">
                <label className="text-[11px] font-mono text-[#68665E] block mb-1">Company Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Auto-detected or custom name"
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF9F5] border border-[#E6E5DE] text-xs font-mono text-[#1C1B18] focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                disabled={!newTicker.trim()}
                className="px-4 py-2 bg-[#1C1B18] hover:bg-[#2D2D2D] text-white rounded-xl text-xs font-mono transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Stock</span>
              </button>
            </form>
          </div>

          {/* Ledger Table Card */}
          <div className="p-5 bg-[#FFFFFF] border border-[#E6E5DE] rounded-2xl shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#E6E5DE]">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#68665E]" />
                <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#1C1B18]">
                  Active Holdings & Targets ({filteredStocks.length})
                </h2>
              </div>

              {/* Filter tabs */}
              <div className="flex items-center gap-1 p-1 bg-[#FAF9F5] border border-[#E6E5DE] rounded-xl text-xs font-mono">
                <button
                  onClick={() => setExchangeFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    exchangeFilter === 'all' ? 'bg-[#1C1B18] text-white font-medium' : 'text-[#68665E] hover:text-[#1C1B18]'
                  }`}
                >
                  All Markets
                </button>
                <button
                  onClick={() => setExchangeFilter('us')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    exchangeFilter === 'us' ? 'bg-[#1C1B18] text-white font-medium' : 'text-[#68665E] hover:text-[#1C1B18]'
                  }`}
                >
                  US Equities
                </button>
                <button
                  onClick={() => setExchangeFilter('india')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    exchangeFilter === 'india' ? 'bg-[#1C1B18] text-white font-medium' : 'text-[#68665E] hover:text-[#1C1B18]'
                  }`}
                >
                  India (NSE)
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs font-mono text-[#9E9C92]">
                Loading surveillance ledger...
              </div>
            ) : filteredStocks.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-[#E6E5DE] rounded-2xl bg-[#FAF9F5] space-y-3">
                <TrendingUp className="w-8 h-8 text-[#9E9C92] mx-auto" />
                <p className="text-sm font-serif italic text-[#1C1B18]">
                  No stocks currently in this surveillance filter.
                </p>
                <p className="text-xs text-[#68665E] max-w-sm mx-auto">
                  Use the form above to add any stock from US or Indian exchanges.
                </p>
                <button
                  onClick={handleLoadSample}
                  className="px-3.5 py-2 bg-[#1C1B18] text-white rounded-xl text-xs font-mono cursor-pointer transition hover:bg-[#2D2D2D] inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Load Sample Mega-Caps
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E6E5DE] text-[10px] font-mono uppercase tracking-wider text-[#68665E]">
                      <th className="py-2.5 px-3">Ticker</th>
                      <th className="py-2.5 px-3">Market</th>
                      <th className="py-2.5 px-3 text-right">Price</th>
                      <th className="py-2.5 px-3 text-right">24h Change</th>
                      <th className="py-2.5 px-3 text-right">Trailing P/E</th>
                      <th className="py-2.5 px-3 text-right">Market Cap</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2F0EB]">
                    {filteredStocks.map(stock => {
                      const isSelected = selectedStock?.id === stock.id;
                      const hasPrice = stock.livePrice !== undefined;
                      const isPositive = (stock.changePercent || 0) >= 0;

                      return (
                        <tr
                          key={stock.id}
                          onClick={() => handleSelectStock(stock)}
                          className={`transition cursor-pointer ${
                            isSelected ? 'bg-emerald-50/50' : 'hover:bg-[#FAF9F5]'
                          }`}
                        >
                          <td className="py-3 px-3">
                            <div className="flex flex-col">
                              <span className="font-mono font-bold text-[#1C1B18] text-sm">
                                {stock.ticker}
                              </span>
                              <span className="text-[11px] text-[#68665E] truncate max-w-[150px]">
                                {stock.name}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#FAF9F5] border border-[#E6E5DE] text-[#68665E]">
                              {stock.exchange}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-semibold text-[#1C1B18]">
                            {hasPrice ? `${stock.currency === 'INR' ? '₹' : '$'}${Number(stock.livePrice).toFixed(2)}` : '—'}
                          </td>

                          <td className="py-3 px-3 text-right">
                            {hasPrice ? (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                                  isPositive
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                                }`}
                              >
                                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                <span>{isPositive ? '+' : ''}{Number(stock.changePercent).toFixed(2)}%</span>
                              </span>
                            ) : (
                              <span className="text-[#9E9C92] font-mono">—</span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-right font-mono text-[#68665E]">
                            {stock.peRatio ? `${Number(stock.peRatio).toFixed(1)}x` : '—'}
                          </td>

                          <td className="py-3 px-3 text-right font-mono text-[#68665E]">
                            {stock.marketCap || '—'}
                          </td>

                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => handleSelectStock(stock)}
                                className="p-1 rounded-lg text-[#68665E] hover:text-[#1C1B18] hover:bg-[#FAF9F5] transition cursor-pointer"
                                title="Inspect Fundamentals"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(stock.id)}
                                className="p-1 rounded-lg text-[#9E9C92] hover:text-rose-600 hover:bg-[#FAF9F5] transition cursor-pointer"
                                title="Remove from Watchlist"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Interactive Fundamental Breakdown Drawer */}
        {selectedStock && (
          <div className="p-6 bg-[#FFFFFF] border border-[#E6E5DE] rounded-3xl shadow-sm space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E5DE]">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#68665E] block">
                  Fundamental Inspection
                </span>
                <h3 className="text-lg font-serif font-bold text-[#1C1B18]">
                  {selectedStock.name} ({selectedStock.ticker})
                </h3>
              </div>
              <button
                onClick={() => setSelectedStock(null)}
                className="p-1 rounded-xl text-[#9E9C92] hover:text-[#1C1B18] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingOverview ? (
              <div className="p-8 text-center text-xs font-mono text-[#9E9C92]">
                Computing DuPont & Altman Z metrics...
              </div>
            ) : selectedStockOverview ? (
              <div className="space-y-5">
                {/* Price & Valuation Summary */}
                <div className="grid grid-cols-2 gap-2 p-3 bg-[#FAF9F5] rounded-xl border border-[#E6E5DE] text-xs font-mono">
                  <div>
                    <span className="text-[#9E9C92] text-[10px] block">Price</span>
                    <span className="font-bold text-sm text-[#1C1B18]">
                      {selectedStockOverview.quote?.currency} {selectedStockOverview.quote?.lastPrice}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#9E9C92] text-[10px] block">52W Range</span>
                    <span className="text-[#1C1B18]">
                      {selectedStockOverview.quote?.yearLow} - {selectedStockOverview.quote?.yearHigh}
                    </span>
                  </div>
                </div>

                {/* 3-Stage DuPont Model */}
                {selectedStockOverview.dupont?.threeStage && (
                  <div className="p-3.5 bg-emerald-50/40 rounded-xl border border-emerald-200/60 space-y-2">
                    <span className="text-[10px] font-mono uppercase font-bold text-emerald-900 block">
                      3-Stage DuPont ROE Decomposition
                    </span>
                    <div className="text-xs font-mono text-emerald-950 space-y-1">
                      <div className="flex justify-between">
                        <span>Net Profit Margin:</span>
                        <span className="font-semibold">{selectedStockOverview.dupont.threeStage.netProfitMargin}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Asset Turnover:</span>
                        <span className="font-semibold">{selectedStockOverview.dupont.threeStage.assetTurnover}x</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Financial Leverage:</span>
                        <span className="font-semibold">{selectedStockOverview.dupont.threeStage.equityMultiplier}x</span>
                      </div>
                      <div className="pt-1 border-t border-emerald-200/80 flex justify-between font-bold text-sm text-emerald-900">
                        <span>Return on Equity:</span>
                        <span>{selectedStockOverview.dupont.threeStage.returnOnEquity}%</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Altman Z-Score & Solvency */}
                {selectedStockOverview.scores?.altmanZScore && (
                  <div className="p-3.5 bg-[#FAF9F5] rounded-xl border border-[#E6E5DE] space-y-2">
                    <span className="text-[10px] font-mono uppercase font-bold text-[#68665E] block">
                      Altman Z-Score Solvency Rating
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-[#1C1B18] font-bold text-sm">
                        Z-Score: {selectedStockOverview.scores.altmanZScore.score}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          selectedStockOverview.scores.altmanZScore.zone === 'Safe'
                            ? 'bg-emerald-100 text-emerald-800'
                            : selectedStockOverview.scores.altmanZScore.zone === 'Grey'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {selectedStockOverview.scores.altmanZScore.zone} Zone
                      </span>
                    </div>
                    <p className="text-[11px] text-[#68665E] leading-relaxed">
                      {selectedStockOverview.scores.altmanZScore.description}
                    </p>
                  </div>
                )}

                {/* Recent News Headlines */}
                {selectedStockOverview.recentNews && selectedStockOverview.recentNews.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono uppercase font-bold text-[#68665E] block">
                      Breaking Market Wire
                    </span>
                    <div className="space-y-1.5">
                      {selectedStockOverview.recentNews.slice(0, 3).map((item: any, idx: number) => (
                        <a
                          key={idx}
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-[#FAF9F5] hover:bg-[#FAF9F5]/80 border border-[#E6E5DE] block text-xs transition"
                        >
                          <div className="font-semibold text-[#1C1B18] line-clamp-1">{item.title}</div>
                          <div className="text-[10px] text-[#9E9C92] font-mono mt-0.5">{item.publisher}</div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-xs font-mono text-[#9E9C92]">
                Detailed statements not available for this ticker.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
