import React from 'react';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

export interface ProvenanceBadgeProps {
  category: 'Real Market Data' | 'Derived Analytics' | 'Regulatory Filings' | 'News Intelligence' | 'Macro Data' | 'AI Commentary' | 'User Data' | string;
  source: string;
  timestamp?: string;
  confidence?: 'High' | 'Medium' | 'Low';
  className?: string;
}

export const ProvenanceBadge: React.FC<ProvenanceBadgeProps> = ({
  category,
  source,
  timestamp = new Date().toISOString(),
  confidence = 'High',
  className = '',
}) => {
  const getConfidenceIcon = () => {
    switch (confidence) {
      case 'High':
        return <ShieldCheck className="w-3 h-3 text-emerald-600" />;
      case 'Medium':
        return <Shield className="w-3 h-3 text-amber-500" />;
      case 'Low':
        return <ShieldAlert className="w-3 h-3 text-rose-500" />;
      default:
        return <Shield className="w-3 h-3 text-[#68665E]" />;
    }
  };

  const formattedTime = () => {
    try {
      const date = new Date(timestamp);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return 'recent';
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-[#FAF9F5] border border-[#E6E5DE] text-[#68665E] shadow-2xs ${className}`}
      title={`Verified source audit: ${category} provided by ${source} (${confidence} confidence)`}
    >
      <div className="flex items-center gap-1 font-semibold text-[#1C1B18]">
        {getConfidenceIcon()}
        <span>{category}</span>
      </div>
      <span className="text-[#D0CEBF]">|</span>
      <span className="truncate max-w-[130px]">{source}</span>
      <span className="text-[#D0CEBF]">|</span>
      <span>{formattedTime()}</span>
    </div>
  );
};

export default ProvenanceBadge;
