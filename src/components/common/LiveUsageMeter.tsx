import React from 'react';
import { Activity, Zap, Coins, Clock } from 'lucide-react';
import { ProviderQuotaTelemetry } from '../../types/ai';

interface LiveUsageMeterProps {
  telemetry: ProviderQuotaTelemetry | null;
  onManageModelsClick: () => void;
}

export const LiveUsageMeter: React.FC<LiveUsageMeterProps> = ({ telemetry, onManageModelsClick }) => {
  if (!telemetry) {
    return (
      <div 
        onClick={onManageModelsClick}
        className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400 hover:border-slate-700 transition cursor-pointer"
        title="Configure AI Models & Quotas"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-mono">Orchestrator Ready</span>
      </div>
    );
  }

  const formatNumber = (num?: number) => {
    if (num === undefined || num === null) return 'Live';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  return (
    <div 
      onClick={onManageModelsClick}
      className="flex items-center space-x-3 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer shadow-sm group"
      title="Click to view Model Orchestrator and registered AI APIs"
    >
      {/* Active Model Indicator */}
      <div className="flex items-center space-x-1.5 border-r border-slate-800 pr-3">
        <Zap className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
        <span className="text-xs font-medium text-slate-200 font-mono truncate max-w-[120px]">
          {telemetry.model}
        </span>
      </div>

      {/* Remaining Tokens */}
      {telemetry.remainingTokens !== undefined && (
        <div className="flex items-center space-x-1 text-xs font-mono text-slate-400">
          <span className="text-slate-500">Tokens:</span>
          <span className="text-emerald-400 font-medium">
            {formatNumber(telemetry.remainingTokens)}
          </span>
        </div>
      )}

      {/* Remaining Requests */}
      {telemetry.remainingRequests !== undefined && (
        <div className="flex items-center space-x-1 text-xs font-mono text-slate-400">
          <span className="text-slate-500">Req:</span>
          <span className="text-sky-400 font-medium">
            {formatNumber(telemetry.remainingRequests)}
          </span>
        </div>
      )}

      {/* Dollar Balance (OpenRouter) */}
      {telemetry.creditBalanceUsd !== undefined && (
        <div className="flex items-center space-x-1 text-xs font-mono text-slate-400">
          <Coins className="w-3 h-3 text-amber-400" />
          <span className="text-amber-300 font-medium">
            ${telemetry.creditBalanceUsd.toFixed(2)}
          </span>
        </div>
      )}

      {/* Latency */}
      <div className="flex items-center space-x-1 text-xs font-mono text-slate-500 border-l border-slate-800 pl-2">
        <Clock className="w-3 h-3 text-slate-500" />
        <span>{telemetry.latencyMs}ms</span>
      </div>
    </div>
  );
};
