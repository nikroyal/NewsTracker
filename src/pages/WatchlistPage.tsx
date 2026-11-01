import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  Sparkles, 
  RefreshCw,
  X,
  FileSpreadsheet,
  PieChart,
  DollarSign,
  Wallet,
  Briefcase,
  Edit2
} from 'lucide-react';
import { TrackedStock, PortfolioHolding } from '../types/business-os';
import { 
  loadTrackedStocks, 
  saveTrackedStock, 
  deleteTrackedStock, 
  INITIAL_TRACKED_STOCKS,
  loadPortfolioHoldings,
  savePortfolioHolding,
  deletePortfolioHolding
} from '../lib/firestore-service';
import { fetchBatchQuotes, fetchStockOverview, searchMarketSymbols } from '../lib/api-client';
import { ProvenanceBadge } from '../components/common/ProvenanceBadge';
import { PortfolioCSVImporter } from '../components/portfolio/PortfolioCSVImporter';

export const WatchlistPage: React.FC = () => {
  // Page mode: 'holdings' = Portfolio Ledger, 'watchlist' = Market Watchlist
  const [activeView, setActiveView] = useState<'holdings' | 'watchlist'>('holdings');

  // Holdings & Portfolio State
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [loadingHoldings, setLoadingHoldings] = useState(true);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isAddHoldingModalOpen, setIsAddHoldingModalOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<PortfolioHolding | null>(null);

  // Add / Edit Holding Form State
  const [holdTicker, setHoldTicker] = useState('');
  const [holdName, setHoldName] = useState('');
  const [holdExchange, setHoldExchange] = useState('NASDAQ');
  const [holdCurrency, setHoldCurrency] = useState('USD');
  const [holdAssetClass, setHoldAssetClass] = useState('Equity');
  const [holdQty, setHoldQty] = useState('');
  const [holdBuyPrice, setHoldBuyPrice] = useState('');
  const [holdDate, setHoldDate] = useState(new Date().toISOString().split('T')[0]);

  // Watchlist State
  const [stocks, setStocks] = useState<TrackedStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exchangeFilter, setExchangeFilter] = useState<'all' | 'us' | 'india'>('all');
  const [selectedStock, setSelectedStock] = useState<TrackedStock | null>(null);
  const [selectedStockOverview, setSelectedStockOverview] = useState<any | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);

  // Watchlist Form State
  const [newTicker, setNewTicker] = useState('');
  const [newName, setNewName] = useState('');
  const [newExchange, setNewExchange] = useState('NASDAQ');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Load stocks and holdings on mount
  useEffect(() => {
    loadTrackedStocks().then(loaded => {
      setStocks(loaded);
      setLoading(false);
      refreshLiveQuotes(loaded);
    });

    loadPortfolioHoldings().then(loadedHoldings => {
      setHoldings(loadedHoldings);
      setLoadingHoldings(false);
      refreshHoldingsQuotes(loadedHoldings);
    });
  }, []);

  // Refresh live prices for holdings
  const refreshHoldingsQuotes = async (currentHoldings: PortfolioHolding[]) => {
    if (currentHoldings.length === 0) return;
    setRefreshing(true);
    try {
      const symbols = currentHoldings.map(h => h.symbol || h.ticker);
      const quotes = await fetchBatchQuotes(symbols);

      setHoldings(prev => prev.map(h => {
        const key = h.symbol || h.ticker;
        const q = quotes[key];
        if (q && q.lastPrice !== undefined) {
          const currentPrice = q.lastPrice;
          const currentValue = h.quantity * currentPrice;
          const unrealizedPnL = currentValue - h.totalCost;
          const unrealizedPnLPercent = h.totalCost > 0 ? (unrealizedPnL / h.totalCost) * 100 : 0;
          return {
            ...h,
            currentPrice,
            currentValue,
            unrealizedPnL,
            unrealizedPnLPercent,
            currency: q.currency || h.currency,
            lastUpdated: new Date().toISOString(),
          };
        }
        return h;
      }));
    } catch (err) {
      console.warn('Holdings quote refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Refresh live prices for watchlist
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
      try {
        const results = await searchMarketSymbols(newTicker);
        setSearchResults(results.slice(0, 5));
      } catch {
        setSearchResults([]);
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

  // Holdings Actions
  const handleSaveHoldingForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holdTicker.trim() || !holdQty || !holdBuyPrice) return;

    const qty = parseFloat(holdQty);
    const price = parseFloat(holdBuyPrice);
    if (isNaN(qty) || isNaN(price) || qty <= 0 || price < 0) return;

    const tickerUpper = holdTicker.trim().toUpperCase();
    const isIndia = holdExchange === 'NSE' || holdExchange === 'BSE';
    const symbol = isIndia && !tickerUpper.includes('.') ? `${tickerUpper}.NS` : tickerUpper;
    const totalCost = qty * price;

    const holdingItem: PortfolioHolding = {
      id: editingHolding ? editingHolding.id : `hold_${tickerUpper.toLowerCase()}_${Date.now()}`,
      ticker: tickerUpper,
      symbol,
      name: holdName.trim() || tickerUpper,
      exchange: holdExchange,
      currency: holdCurrency,
      assetClass: holdAssetClass,
      quantity: qty,
      purchasePrice: price,
      purchaseDate: holdDate,
      currentPrice: editingHolding?.currentPrice || price,
      totalCost,
      currentValue: editingHolding?.currentPrice ? qty * editingHolding.currentPrice : totalCost,
      unrealizedPnL: editingHolding?.currentPrice ? (qty * editingHolding.currentPrice) - totalCost : 0,
      unrealizedPnLPercent: editingHolding?.currentPrice ? (((editingHolding.currentPrice - price) / price) * 100) : 0,
      notes: editingHolding?.notes || 'Direct Position Entry',
      lastUpdated: new Date().toISOString(),
    };

    let updated: PortfolioHolding[];
    if (editingHolding) {
      updated = holdings.map(h => h.id === editingHolding.id ? holdingItem : h);
    } else {
      updated = [holdingItem, ...holdings];
    }

    setHoldings(updated);
    await savePortfolioHolding(holdingItem);
    refreshHoldingsQuotes(updated);

    // Reset Form
    setHoldTicker('');
    setHoldName('');
    setHoldQty('');
    setHoldBuyPrice('');
    setEditingHolding(null);
    setIsAddHoldingModalOpen(false);
  };

  const handleEditHolding = (holding: PortfolioHolding) => {
    setEditingHolding(holding);
    setHoldTicker(holding.ticker);
    setHoldName(holding.name);
    setHoldExchange(holding.exchange);
    setHoldCurrency(holding.currency);
    setHoldAssetClass(holding.assetClass);
    setHoldQty(holding.quantity.toString());
    setHoldBuyPrice(holding.purchasePrice.toString());
    setHoldDate(holding.purchaseDate || new Date().toISOString().split('T')[0]);
    setIsAddHoldingModalOpen(true);
  };

  const handleDeleteHolding = async (id: string) => {
    if (confirm('Delete this position from your portfolio ledger?')) {
      const updated = holdings.filter(h => h.id !== id);
      setHoldings(updated);
      await deletePortfolioHolding(id);
    }
  };

  // Watchlist Actions
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

  // Computed Portfolio Metrics
  const totalCostUsd = holdings
    .filter(h => h.currency === 'USD')
    .reduce((acc, h) => acc + (h.totalCost || 0), 0);

  const currentValueUsd = holdings
    .filter(h => h.currency === 'USD')
    .reduce((acc, h) => acc + (h.currentValue ?? h.totalCost), 0);

  const unrealizedPnLUsd = currentValueUsd - totalCostUsd;
  const unrealizedPnLPercentUsd = totalCostUsd > 0 ? (unrealizedPnLUsd / totalCostUsd) * 100 : 0;

  // HHI Concentration Formula
  const hhiIndex = (() => {
    if (currentValueUsd === 0) return 0;
    const usdHoldings = holdings.filter(h => h.currency === 'USD');
    let sumSquares = 0;
    for (const h of usdHoldings) {
      const weight = ((h.currentValue ?? h.totalCost) / currentValueUsd) * 100;
      sumSquares += weight * weight;
    }
    return Math.round(sumSquares);
  })();

  const concentrationLabel = hhiIndex < 1500 ? 'Broadly Diversified' : hhiIndex < 2500 ? 'Moderately Concentrated' : 'Highly Concentrated';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 bg-[#FFFFFF] border border-[#E6E5DE] rounded-3xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h1 className="text-xl font-serif font-bold text-[#1C1B18]">
              Portfolio Holdings & Watchlist Ledger
            </h1>
          </div>
          <p className="text-xs font-mono text-[#68665E]">
            Cost-basis ledger, unrealized P&L, brokerage CSV imports, and fundamental ratio surveillance
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#FAF9F5] p-1 rounded-2xl border border-[#E6E5DE]">
            <button
              onClick={() => setActiveView('holdings')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono transition cursor-pointer flex items-center gap-1.5 ${
                activeView === 'holdings'
                  ? 'bg-[#1C1B18] text-white font-bold shadow-xs'
                  : 'text-[#68665E] hover:text-[#1C1B18]'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Holdings Ledger</span>
            </button>
            <button
              onClick={() => setActiveView('watchlist')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono transition cursor-pointer flex items-center gap-1.5 ${
                activeView === 'watchlist'
                  ? 'bg-[#1C1B18] text-white font-bold shadow-xs'
                  : 'text-[#68665E] hover:text-[#1C1B18]'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Watchlist</span>
            </button>
          </div>

          <ProvenanceBadge
            category="Real Market Data"
            source="NSE & Yahoo Finance Wire"
            confidence="High"
          />

          <button
            onClick={() => {
              if (activeView === 'holdings') {
                refreshHoldingsQuotes(holdings);
              } else {
                refreshLiveQuotes(stocks);
              }
            }}
            disabled={refreshing}
            className="px-3 py-1.5 rounded-xl bg-[#FAF9F5] hover:bg-[#FFFFFF] border border-[#E6E5DE] text-xs font-mono text-[#1C1B18] flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            title="Refresh Live Market Quotes"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: PORTFOLIO HOLDINGS & COST-BASIS LEDGER */}
      {activeView === 'holdings' && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-[#FFFFFF] border border-[#E6E5DE] rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs font-mono text-[#68665E]">
                <span>Total Invested Capital</span>
                <Wallet className="w-4 h-4 text-[#1C1B18]" />
              </div>
              <div className="text-2xl font-serif font-bold text-[#1C1B18]">
                ${totalCostUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] font-mono text-[#68665E]">
                Across {holdings.length} tracked positions
              </div>
            </div>

            <div className="p-5 bg-[#FFFFFF] border border-[#E6E5DE] rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs font-mono text-[#68665E]">
                <span>Current Valuation</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-serif font-bold text-[#1C1B18]">
                ${currentValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] font-mono text-emerald-700 font-semibold">
                Live edge quote synchronization
              </div>
            </div>

            <div className="p-5 bg-[#FFFFFF] border border-[#E6E5DE] rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs font-mono text-[#68665E]">
                <span>Unrealized P&L</span>
                {unrealizedPnLUsd >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
              </div>
              <div className={`text-2xl font-serif font-bold ${unrealizedPnLUsd >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {unrealizedPnLUsd >= 0 ? '+' : ''}${unrealizedPnLUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className={`text-[11px] font-mono font-bold ${unrealizedPnLPercentUsd >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {unrealizedPnLPercentUsd >= 0 ? '+' : ''}{unrealizedPnLPercentUsd.toFixed(2)}% net return
              </div>
            </div>

            <div className="p-5 bg-[#FFFFFF] border border-[#E6E5DE] rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs font-mono text-[#68665E]">
                <span>HHI Concentration</span>
                <PieChart className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl font-serif font-bold text-[#1C1B18]">
                {hhiIndex} <span className="text-xs font-mono text-[#68665E] font-normal">pts</span>
              </div>
              <div className="text-[11px] font-mono text-purple-700 font-semibold">
                {concentrationLabel}
              </div>
            </div>
          </div>

          {/* Holdings Actions & Table */}
          <div className="p-6 bg-[#FFFFFF] border border-[#E6E5DE] rounded-3xl shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-serif font-bold text-[#1C1B18]">
                  Portfolio Positions & Cost-Basis Ledger
                </h2>
                <p className="text-xs font-mono text-[#68665E]">
                  Exact share quantities, cost per share, current quotes, and calculated returns
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCsvModalOpen(true)}
                  className="px-3 py-2 rounded-xl bg-[#FAF9F5] hover:bg-[#FFFFFF] border border-[#E6E5DE] text-xs font-mono text-[#1C1B18] font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Import Brokerage CSV</span>
                </button>

                <button
                  onClick={() => {
                    setEditingHolding(null);
                    setHoldTicker('');
                    setHoldName('');
                    setHoldQty('');
                    setHoldBuyPrice('');
                    setIsAddHoldingModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#1C1B18] hover:bg-[#33312B] text-white text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Add Position</span>
                </button>
              </div>
            </div>

            {/* Table */}
            {loadingHoldings ? (
              <div className="p-12 text-center text-xs font-mono text-[#68665E]">
                Loading portfolio ledger from Cloud Firestore...
              </div>
            ) : holdings.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-[#E6E5DE] rounded-2xl space-y-3">
                <Briefcase className="w-8 h-8 text-[#68665E] mx-auto opacity-50" />
                <p className="text-sm font-serif text-[#1C1B18]">No holdings registered in your ledger.</p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setIsCsvModalOpen(true)}
                    className="px-4 py-2 bg-[#1C1B18] text-white text-xs font-mono rounded-xl font-bold hover:bg-[#33312B] transition"
                  >
                    Import CSV Trade Log
                  </button>
                </div>
              </div>
            ) : (
              <div className="border border-[#E6E5DE] rounded-2xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#FAF9F5] border-b border-[#E6E5DE] text-[#68665E]">
                    <tr>
                      <th className="py-3 px-4">Position</th>
                      <th className="py-3 px-4">Exchange</th>
                      <th className="py-3 px-4 text-right">Shares</th>
                      <th className="py-3 px-4 text-right">Purchase Price</th>
                      <th className="py-3 px-4 text-right">Live Price</th>
                      <th className="py-3 px-4 text-right">Total Cost</th>
                      <th className="py-3 px-4 text-right">Current Value</th>
                      <th className="py-3 px-4 text-right">Unrealized P&L</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E5DE]">
                    {holdings.map(h => {
                      const curSym = h.currency === 'INR' ? '₹' : '$';
                      const pnl = h.unrealizedPnL ?? 0;
                      const pnlPct = h.unrealizedPnLPercent ?? 0;
                      return (
                        <tr key={h.id} className="hover:bg-[#FCFAF6] transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-[#1C1B18]">{h.ticker}</div>
                            <div className="text-[11px] text-[#68665E] truncate max-w-[140px]">{h.name}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#FAF9F5] border border-[#E6E5DE] text-[#1C1B18]">
                              {h.exchange}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-[#1C1B18]">
                            {h.quantity.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right text-[#68665E]">
                            {curSym}{h.purchasePrice.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-[#1C1B18]">
                            {curSym}{(h.currentPrice ?? h.purchasePrice).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right text-[#68665E]">
                            {curSym}{h.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-[#1C1B18]">
                            {curSym}{(h.currentValue ?? h.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-bold">
                            <div className={pnl >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                              {pnl >= 0 ? '+' : ''}{curSym}{pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className={`text-[10px] ${pnlPct >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                              ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleEditHolding(h)}
                                className="p-1.5 rounded-lg text-[#68665E] hover:text-[#1C1B18] hover:bg-[#FAF9F5] transition"
                                title="Edit Position"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteHolding(h.id)}
                                className="p-1.5 rounded-lg text-[#68665E] hover:text-red-600 hover:bg-red-50 transition"
                                title="Delete Position"
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
      )}

      {/* VIEW 2: EQUITIES WATCHLIST & RATIOS */}
      {activeView === 'watchlist' && (
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

                <div className="min-w-[150px] flex-2 relative">
                  <label className="text-[11px] font-mono text-[#68665E] block mb-1">Ticker / Symbol</label>
                  <input
                    type="text"
                    value={newTicker}
                    onChange={e => setNewTicker(e.target.value)}
                    placeholder="e.g. AAPL, NVDA, RELIANCE"
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF9F5] border border-[#E6E5DE] text-xs font-mono text-[#1C1B18] focus:outline-hidden"
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-[#FFFFFF] border border-[#E6E5DE] rounded-xl shadow-lg z-20 overflow-hidden divide-y divide-[#E6E5DE]">
                      {searchResults.map(res => (
                        <div
                          key={res.symbol}
                          onClick={() => handleSelectSearchResult(res)}
                          className="px-3 py-2 text-xs font-mono hover:bg-[#FAF9F5] cursor-pointer flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold text-[#1C1B18]">{res.symbol}</span>
                            <span className="text-[#68665E] ml-2 text-[11px] truncate">{res.name}</span>
                          </div>
                          <span className="text-[10px] text-[#68665E] uppercase">{res.exch}</span>
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
                    placeholder="e.g. Apple Inc."
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF9F5] border border-[#E6E5DE] text-xs font-mono text-[#1C1B18] focus:outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#1C1B18] hover:bg-[#33312B] text-white text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Add</span>
                </button>
              </form>
            </div>

            {/* Table */}
            <div className="p-6 bg-[#FFFFFF] border border-[#E6E5DE] rounded-3xl shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold text-[#1C1B18]">Filter:</span>
                  <div className="flex items-center bg-[#FAF9F5] p-1 rounded-xl border border-[#E6E5DE] text-xs font-mono">
                    <button
                      onClick={() => setExchangeFilter('all')}
                      className={`px-2.5 py-1 rounded-lg transition ${exchangeFilter === 'all' ? 'bg-[#1C1B18] text-white font-bold' : 'text-[#68665E]'}`}
                    >
                      All ({stocks.length})
                    </button>
                    <button
                      onClick={() => setExchangeFilter('us')}
                      className={`px-2.5 py-1 rounded-lg transition ${exchangeFilter === 'us' ? 'bg-[#1C1B18] text-white font-bold' : 'text-[#68665E]'}`}
                    >
                      US ({stocks.filter(s => s.country === 'US').length})
                    </button>
                    <button
                      onClick={() => setExchangeFilter('india')}
                      className={`px-2.5 py-1 rounded-lg transition ${exchangeFilter === 'india' ? 'bg-[#1C1B18] text-white font-bold' : 'text-[#68665E]'}`}
                    >
                      India ({stocks.filter(s => s.country === 'India').length})
                    </button>
                  </div>
                </div>

                <span className="text-xs font-mono text-[#68665E]">
                  Click any row to open institutional Altman & DuPont drawer
                </span>
              </div>

              {loading ? (
                <div className="p-12 text-center text-xs font-mono text-[#68665E]">
                  Loading watchlist from Cloud Firestore...
                </div>
              ) : stocks.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-[#E6E5DE] rounded-2xl space-y-3">
                  <p className="text-sm font-serif text-[#1C1B18]">No tracked stocks in your watchlist.</p>
                  <button
                    onClick={handleLoadSample}
                    className="px-4 py-2 bg-[#1C1B18] text-white text-xs font-mono rounded-xl font-bold hover:bg-[#33312B] transition"
                  >
                    Load Default Mega-Caps
                  </button>
                </div>
              ) : (
                <div className="border border-[#E6E5DE] rounded-2xl overflow-hidden overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#FAF9F5] border-b border-[#E6E5DE] text-[#68665E]">
                      <tr>
                        <th className="py-3 px-4">Symbol</th>
                        <th className="py-3 px-4">Company</th>
                        <th className="py-3 px-4">Market</th>
                        <th className="py-3 px-4 text-right">Live Price</th>
                        <th className="py-3 px-4 text-right">24h Change</th>
                        <th className="py-3 px-4 text-right">P/E</th>
                        <th className="py-3 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E5DE]">
                      {stocks.filter(s => {
                        if (exchangeFilter === 'us') return s.country === 'US';
                        if (exchangeFilter === 'india') return s.country === 'India';
                        return true;
                      }).map(stock => {
                        const isSelected = selectedStock?.id === stock.id;
                        return (
                          <tr
                            key={stock.id}
                            onClick={() => handleSelectStock(stock)}
                            className={`cursor-pointer transition ${isSelected ? 'bg-amber-50/60 font-semibold' : 'hover:bg-[#FCFAF6]'}`}
                          >
                            <td className="py-3 px-4 font-bold text-[#1C1B18]">
                              {stock.ticker}
                            </td>
                            <td className="py-3 px-4 text-[#68665E] truncate max-w-[180px]">
                              {stock.name}
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#FAF9F5] border border-[#E6E5DE] text-[#1C1B18]">
                                {stock.exchange}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-[#1C1B18]">
                              {stock.livePrice ? `${stock.currency === 'INR' ? '₹' : '$'}${stock.livePrice.toFixed(2)}` : '—'}
                            </td>
                            <td className="py-3 px-4 text-right font-bold">
                              {stock.changePercent !== undefined ? (
                                <span className={`flex items-center justify-end gap-1 ${stock.changePercent >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                  {stock.changePercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                  {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                                </span>
                              ) : '—'}
                            </td>
                            <td className="py-3 px-4 text-right text-[#68665E]">
                              {stock.peRatio ? `${stock.peRatio.toFixed(1)}x` : '—'}
                            </td>
                            <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => handleDelete(stock.id)}
                                className="p-1.5 rounded-lg text-[#68665E] hover:text-red-600 hover:bg-red-50 transition"
                                title="Remove Stock"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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

          {/* Right Drawer: Selected Stock DuPont & Altman Z Overview */}
          {selectedStock && (
            <div className="p-6 bg-[#FFFFFF] border border-[#E6E5DE] rounded-3xl shadow-sm space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between pb-4 border-b border-[#E6E5DE]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-serif font-bold text-[#1C1B18]">{selectedStock.ticker}</span>
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#1C1B18] text-white rounded">
                      {selectedStock.exchange}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-[#68665E] truncate">{selectedStock.name}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedStock(null);
                    setSelectedStockOverview(null);
                  }}
                  className="p-1 text-[#68665E] hover:text-[#1C1B18] rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {loadingOverview ? (
                <div className="p-8 text-center text-xs font-mono text-[#68665E]">
                  Resolving DuPont 3-stage ROE and Altman Z distress rating...
                </div>
              ) : selectedStockOverview ? (
                <div className="space-y-4">
                  {/* Basic Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-[#FAF9F5] p-3 rounded-xl border border-[#E6E5DE]">
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
      )}

      {/* CSV IMPORTER MODAL */}
      {isCsvModalOpen && (
        <PortfolioCSVImporter
          onClose={() => setIsCsvModalOpen(false)}
          onImportComplete={() => {
            loadPortfolioHoldings().then(loaded => {
              setHoldings(loaded);
              refreshHoldingsQuotes(loaded);
            });
          }}
        />
      )}

      {/* ADD / EDIT POSITION MODAL */}
      {isAddHoldingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-[#FFFFFF] border border-[#E6E5DE] rounded-3xl max-w-lg w-full shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E5DE]">
              <h2 className="text-base font-serif font-bold text-[#1C1B18]">
                {editingHolding ? 'Edit Portfolio Position' : 'Add Position to Ledger'}
              </h2>
              <button
                onClick={() => setIsAddHoldingModalOpen(false)}
                className="p-1 text-[#68665E] hover:text-[#1C1B18]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHoldingForm} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-[#68665E] block mb-1">Ticker</label>
                  <input
                    type="text"
                    value={holdTicker}
                    onChange={e => setHoldTicker(e.target.value)}
                    placeholder="e.g. AAPL"
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF9F5] border border-[#E6E5DE] text-xs font-mono text-[#1C1B18]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-[#68665E] block mb-1">Exchange</label>
                  <select
                    value={holdExchange}
                    onChange={e => setHoldExchange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF9F5] border border-[#E6E5DE] text-xs font-mono text-[#1C1B18]"
                  >
                    <option value="NASDAQ">NASDAQ (US)</option>
                    <option value="NYSE">NYSE (US)</option>
                    <option value="NSE">NSE (India)</option>
                    <option value="BSE">BSE (India)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-[#68665E] block mb-1">Company / Asset Name</label>
                <input
                  type="text"
                  value={holdName}
                  onChange={e => setHoldName(e.target.value)}
                  placeholder="e.g. Apple Inc."
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF9F5] border border-[#E6E5DE] text-xs font-mono text-[#1C1B18]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-[#68665E] block mb-1">Quantity (Shares)</label>
                  <input
                    type="number"
                    step="any"
                    value={holdQty}
                    onChange={e => setHoldQty(e.target.value)}
                    placeholder="e.g. 50"
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF9F5] border border-[#E6E5DE] text-xs font-mono text-[#1C1B18]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-[#68665E] block mb-1">Cost Per Share</label>
                  <input
                    type="number"
                    step="any"
                    value={holdBuyPrice}
                    onChange={e => setHoldBuyPrice(e.target.value)}
                    placeholder="e.g. 185.50"
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF9F5] border border-[#E6E5DE] text-xs font-mono text-[#1C1B18]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-[#68665E] block mb-1">Currency</label>
                  <select
                    value={holdCurrency}
                    onChange={e => setHoldCurrency(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF9F5] border border-[#E6E5DE] text-xs font-mono text-[#1C1B18]"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="INR">INR (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-mono text-[#68665E] block mb-1">Asset Class</label>
                  <select
                    value={holdAssetClass}
                    onChange={e => setHoldAssetClass(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF9F5] border border-[#E6E5DE] text-xs font-mono text-[#1C1B18]"
                  >
                    <option value="Equity">Equity</option>
                    <option value="ETF">ETF</option>
                    <option value="Crypto">Crypto</option>
                    <option value="Commodity">Commodity</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddHoldingModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono text-[#68665E] hover:text-[#1C1B18]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#1C1B18] text-white text-xs font-mono font-bold hover:bg-[#33312B]"
                >
                  {editingHolding ? 'Update Position' : 'Save Position'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
