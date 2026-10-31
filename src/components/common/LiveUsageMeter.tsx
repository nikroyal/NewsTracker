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
        className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#FAF9F5] border border-[#E6E5DE] text-xs text-[#68665E] hover:border-[#1C1B18] transition cursor-pointer"
        title="View Model Orchestrator and registered AI APIs"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-mono text-[11px]">Orchestrator Standby</span>
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
      className="flex items-center space-x-3 px-3 py-1.5 rounded-xl bg-[#FAF9F5] border border-[#E6E5DE] hover:border-[#1C1B18] transition-all cursor-pointer shadow-xs group"
      title="Click to open Model Orchestrator"
    >
      {/* Active Model Indicator */}
      <div className="flex items-center space-x-1.5 border-r border-[#E6E5DE] pr-3">
        <Zap className="w-3.5 h-3.5 text-amber-600 group-hover:scale-110 transition-transform" />
        <span className="text-xs font-semibold text-[#1C1B18] font-mono truncate max-w-[120px]">
          {telemetry.model}
        </span>
      </div>

      {/* Remaining Tokens */}
      {telemetry.remainingTokens !== undefined && (
        <div className="flex items-center space-x-1 text-xs font-mono text-[#68665E]">
          <span className="text-[#9E9C92]">Tokens:</span>
          <span className="text-emerald-700 font-medium">
            {formatNumber(telemetry.remainingTokens)}
          </span>
        </div>
      )}

      {/* Remaining Requests */}
      {telemetry.remainingRequests !== undefined && (
        <div className="flex items-center space-x-1 text-xs font-mono text-[#68665E]">
          <span className="text-[#9E9C92]">Req:</span>
          <span className="text-sky-700 font-medium">
            {formatNumber(telemetry.remainingRequests)}
          </span>
        </div>
      )}

      {/* Latency */}
      <div className="flex items-center space-x-1 text-xs font-mono text-[#68665E]">
        <Clock className="w-3 h-3 text-[#9E9C92]" />
        <span>{telemetry.latencyMs}ms</span>
      </div>
    </div>
  );
};
