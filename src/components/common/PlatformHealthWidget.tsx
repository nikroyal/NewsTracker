import React, { useState, useEffect } from 'react';
import { Activity, ShieldCheck, CheckCircle2, Clock, Zap } from 'lucide-react';

export const PlatformHealthWidget: React.FC = () => {
  const [latency, setLatency] = useState<number | null>(null);
  const [status, setStatus] = useState<'healthy' | 'checking' | 'degraded'>('checking');

  useEffect(() => {
    let isMounted = true;
    const checkHealth = async () => {
      const start = performance.now();
      try {
        const res = await fetch('/api/health');
        if (isMounted) {
          if (res.ok) {
            setLatency(Math.round(performance.now() - start));
            setStatus('healthy');
          } else {
            setStatus('degraded');
          }
        }
      } catch {
        if (isMounted) {
          setStatus('degraded');
        }
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div 
      className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#FFFFFF] border border-[#E6E5DE] text-xs font-mono text-[#68665E] shadow-2xs select-none"
      title="Master Edge Engine & Financial API Health Status"
    >
      <span className={`w-2 h-2 rounded-full ${status === 'healthy' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
      <span className="font-semibold text-[#1C1B18] text-[11px]">
        EDGE {status === 'healthy' ? 'ONLINE' : 'DEGRADED'}
      </span>
      {latency !== null && (
        <>
          <span className="text-[#D0CEBF]">|</span>
          <span className="text-[10px] text-[#68665E] flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5 text-[#9E9C92]" />
            {latency}ms
          </span>
        </>
      )}
    </div>
  );
};
