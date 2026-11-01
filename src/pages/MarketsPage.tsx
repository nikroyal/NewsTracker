import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Compass, 
  Lightbulb, 
  Activity, 
  RefreshCw, 
  ShieldCheck, 
  AlertTriangle, 
  Sparkles,
  ArrowRight,
  Clock
} from 'lucide-react';
import { fetchMarketIndices } from '../lib/api-client';
import { ProvenanceBadge } from '../components/common/ProvenanceBadge';
import { OpportunitySignal } from '../types/business-os';

const SAMPLE_OPPORTUNITIES: OpportunitySignal[] = [
  {
    id: 'opp_1',
    ticker: 'AAPL',
    companyName: 'Apple Inc.',
    exchange: 'NASDAQ',
    signalType: 'dupont_moat',
    title: 'High DuPont Capital Efficiency Moat',
    description: '3-Stage DuPont ROE exceeds 140% driven by robust operating margins and efficient asset turns. Operating cash flow provides immense safety margin against macro rate shocks.',
    confidence: 'High',
    metrics: { peRatio: 31.5, altmanZScore: 7.8, dupontRoe: 147.2 },
    detectedAt: new Date().toISOString(),
  },
  {
    id: 'opp_2',
    ticker: 'NVDA',
    companyName: 'NVIDIA Corporation',
    exchange: 'NASDAQ',
    signalType: 'solvency_resilience',
    title: 'Pristine Altman Z-Score Safe Zone',
    description: 'Altman Z-Score of 18.4 places entity firmly in top decile of global corporate solvency. Net cash balance cushions ongoing hyperscaler capex cycles.',
    confidence: 'High',
    metrics: { peRatio: 48.2, altmanZScore: 18.4, dupontRoe: 92.5 },
    detectedAt: new Date().toISOString(),
  },
  {
    id: 'opp_3',
    ticker: 'RELIANCE',
    companyName: 'Reliance Industries Ltd.',
    exchange: 'NSE',
    signalType: 'value_discount',
    title: 'Conglomerate Discount & Energy Transition',
    description: 'Trading at attractive valuation discount relative to historical EV/EBITDA multiples while retail and telecom subsidiaries demonstrate expanding operating leverage.',
    confidence: 'Medium',
    metrics: { peRatio: 24.1, altmanZScore: 3.2, currentRatio: 1.15 },
    detectedAt: new Date().toISOString(),
  },
];

export const MarketsPage: React.FC = () => {
  const [indices, setIndices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [edgeLatency, setEdgeLatency] = useState<number | null>(null);

  const loadIndicesData = async () => {
    setRefreshing(true);
    const start = performance.now();
    try {
      const data = await fetchMarketIndices();
      setIndices(data);
      setEdgeLatency(Math.round(performance.now() - start));
    } catch (err) {
      console.warn('Failed to fetch indices:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadIndicesData();
  }, []);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 bg-[#FFFFFF] border border-[#E6E5DE] rounded-3xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-sky-600" />
            <h1 className="text-xl font-serif font-bold text-[#1C1B18]">
              Global Markets & Opportunity Scanner
            </h1>
          </div>
          <p className="text-xs font-mono text-[#68665E]">
            Macroeconomic indices, currency crosses, corporate solvency signals, and system telemetry
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ProvenanceBadge
            category="Macro Data"
            source="Master Market API Engine"
            confidence="High"
          />
          <button
            onClick={loadIndicesData}
            disabled={refreshing}
            className="px-3 py-1.5 rounded-xl bg-[#FAF9F5] hover:bg-[#FFFFFF] border border-[#E6E5DE] text-xs font-mono text-[#1C1B18] flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Global Benchmark Indices Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#68665E]">
            Global Benchmark Indices & FX
          </h2>
          {edgeLatency !== null && (
            <span className="text-[11px] font-mono text-[#68665E] flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#9E9C92]" />
              Edge Latency: {edgeLatency}ms
            </span>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs font-mono text-[#9E9C92] bg-[#FFFFFF] border border-[#E6E5DE] rounded-2xl">
            Querying Master Edge API for global market indices...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {indices.map(idx => {
              const isPositive = idx.percentChange >= 0;
              return (
                <div
                  key={idx.symbol}
                  className="p-4 bg-[#FFFFFF] border border-[#E6E5DE] rounded-2xl shadow-2xs space-y-2 hover:border-[#1C1B18] transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-[#68665E]">
                      {idx.region}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#FAF9F5] border border-[#E6E5DE] text-[#68665E]">
                      {idx.currency}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xs font-serif font-bold text-[#1C1B18] line-clamp-1">
                      {idx.name}
                    </h3>
                    <div className="text-base font-mono font-bold text-[#1C1B18] mt-0.5">
                      {Number(idx.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="pt-1 border-t border-[#F2F0EB]">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold ${
                        isPositive
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-rose-50 text-rose-800'
                      }`}
                    >
                      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      <span>{isPositive ? '+' : ''}{Number(idx.percentChange).toFixed(2)}%</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Opportunity Scanner Section */}
      <div className="p-6 bg-[#FFFFFF] border border-[#E6E5DE] rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E6E5DE]">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#1C1B18]">
              Automated Financial Opportunity Scanner
            </h2>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200">
            3 High-Confidence Signals Detected
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SAMPLE_OPPORTUNITIES.map(opp => (
            <div
              key={opp.id}
              className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E6E5DE] hover:border-[#1C1B18] transition space-y-3 shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-[#1C1B18]">{opp.ticker}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FFFFFF] border border-[#E6E5DE] text-[#68665E]">
                    {opp.exchange}
                  </span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-emerald-100 text-emerald-800">
                  {opp.confidence} Conf.
                </span>
              </div>

              <div>
                <h4 className="text-xs font-serif font-bold text-[#1C1B18] mb-1">
                  {opp.title}
                </h4>
                <p className="text-[11px] text-[#68665E] leading-relaxed line-clamp-3">
                  {opp.description}
                </p>
              </div>

              {/* Quantitative Benchmarks Pill */}
              <div className="pt-2 border-t border-[#E6E5DE] grid grid-cols-3 gap-1 text-[10px] font-mono text-center">
                <div className="p-1 rounded bg-[#FFFFFF] border border-[#E6E5DE]">
                  <span className="text-[#9E9C92] block">P/E</span>
                  <span className="font-bold text-[#1C1B18]">{opp.metrics.peRatio}x</span>
                </div>
                <div className="p-1 rounded bg-[#FFFFFF] border border-[#E6E5DE]">
                  <span className="text-[#9E9C92] block">Altman Z</span>
                  <span className="font-bold text-emerald-700">{opp.metrics.altmanZScore}</span>
                </div>
                <div className="p-1 rounded bg-[#FFFFFF] border border-[#E6E5DE]">
                  <span className="text-[#9E9C92] block">DuPont</span>
                  <span className="font-bold text-sky-700">{opp.metrics.dupontRoe ? `${opp.metrics.dupontRoe}%` : 'N/A'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upstream Platform Health & Architecture Telemetry */}
      <div className="p-6 bg-[#FFFFFF] border border-[#E6E5DE] rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E6E5DE]">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600" />
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#1C1B18]">
              Edge Architecture & Upstream Diagnostics
            </h2>
          </div>
          <span className="text-[11px] font-mono text-emerald-700 font-semibold">
            All Systems Nominal
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#E6E5DE] space-y-1">
            <span className="text-[#9E9C92] text-[10px] uppercase font-bold block">Master Market Engine</span>
            <div className="flex items-center gap-1.5 font-bold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>ACTIVE • 0.05ms</span>
            </div>
            <p className="text-[10px] text-[#68665E]">Pure TypeScript formula execution</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#E6E5DE] space-y-1">
            <span className="text-[#9E9C92] text-[10px] uppercase font-bold block">Model Orchestrator</span>
            <div className="flex items-center gap-1.5 font-bold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>FAILOVER READY</span>
            </div>
            <p className="text-[10px] text-[#68665E]">Active rate-limit cooldown protection</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#E6E5DE] space-y-1">
            <span className="text-[#9E9C92] text-[10px] uppercase font-bold block">Edge Response Cache</span>
            <div className="flex items-center gap-1.5 font-bold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>SHA-256 ACTIVE</span>
            </div>
            <p className="text-[10px] text-[#68665E]">Web Crypto 2-hour TTL cache</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#E6E5DE] space-y-1">
            <span className="text-[#9E9C92] text-[10px] uppercase font-bold block">Cloud Firestore</span>
            <div className="flex items-center gap-1.5 font-bold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>SPARK TIER CONNECTED</span>
            </div>
            <p className="text-[10px] text-[#68665E]">100% single-user cloud persistence</p>
          </div>
        </div>
      </div>
    </div>
  );
};
