import React, { useState } from 'react';
import { 
  X, 
  AlertCircle, 
  Cpu, 
  Layers, 
  Terminal, 
  ArrowRight, 
  CheckCircle2, 
  Copy, 
  Check, 
  ShieldCheck, 
  Clock, 
  Coins, 
  Sparkles 
} from 'lucide-react';
import { ExecutionTrace } from '../../types/business-os';

interface AIRequestInspectorModalProps {
  trace: ExecutionTrace | null;
  onClose: () => void;
}

export const AIRequestInspectorModal: React.FC<AIRequestInspectorModalProps> = ({ trace, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'payload'>('pipeline');

  if (!trace) return null;

  const totalTokens = (trace.promptTokens || 0) + (trace.completionTokens || 0);
  const isCached = trace.cachedResponse;
  const isFailover = trace.fallbackModel && trace.fallbackModel !== trace.selectedModel;

  const handleCopyResponse = () => {
    navigator.clipboard.writeText(trace.responsePreview || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-2xl h-full bg-[#181614] text-[#FAF9F5] border-l border-[#3D362E] flex flex-col shadow-2xl overflow-hidden font-mono">
        {/* Header */}
        <div className="p-5 bg-[#221F1C] border-b border-[#3D362E] flex items-center justify-between sticky top-0 z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                isCached 
                  ? 'bg-purple-900/80 text-purple-200 border border-purple-700' 
                  : trace.success 
                  ? 'bg-emerald-900/80 text-emerald-200 border border-emerald-700' 
                  : 'bg-red-900/80 text-red-200 border border-red-700'
              }`}>
                {isCached ? '304 CACHED' : trace.success ? '200 OK' : '500 FAILED'}
              </span>
              <h3 className="text-sm font-serif font-bold text-white">
                {trace.feature}
              </h3>
            </div>
            <p className="text-[10px] text-[#A8A29E]">
              ID: {trace.id} • {new Date(trace.timestamp).toLocaleTimeString()}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#2D2822] text-[#A8A29E] hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center bg-[#1F1C19] border-b border-[#3D362E] px-4">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`py-2.5 px-3 text-xs border-b-2 transition font-bold flex items-center gap-1.5 ${
              activeTab === 'pipeline'
                ? 'border-emerald-500 text-white'
                : 'border-transparent text-[#A8A29E] hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Execution Pipeline Stages</span>
          </button>
          <button
            onClick={() => setActiveTab('payload')}
            className={`py-2.5 px-3 text-xs border-b-2 transition font-bold flex items-center gap-1.5 ${
              activeTab === 'payload'
                ? 'border-emerald-500 text-white'
                : 'border-transparent text-[#A8A29E] hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-sky-400" />
            <span>Raw Prompt & Payload</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* Quick Telemetry Chips */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2.5 bg-[#221F1C] border border-[#3D362E] rounded-xl">
              <span className="text-[10px] text-[#A8A29E] block">Round-Trip</span>
              <span className="font-bold text-white">{trace.latencyMs}ms</span>
            </div>
            <div className="p-2.5 bg-[#221F1C] border border-[#3D362E] rounded-xl">
              <span className="text-[10px] text-[#A8A29E] block">Prompt Tokens</span>
              <span className="font-bold text-white">{trace.promptTokens}</span>
            </div>
            <div className="p-2.5 bg-[#221F1C] border border-[#3D362E] rounded-xl">
              <span className="text-[10px] text-[#A8A29E] block">Comp. Tokens</span>
              <span className="font-bold text-white">{trace.completionTokens}</span>
            </div>
            <div className="p-2.5 bg-[#221F1C] border border-[#3D362E] rounded-xl">
              <span className="text-[10px] text-[#A8A29E] block">Incurred Cost</span>
              <span className="font-bold text-emerald-400">
                ${trace.costUsd < 0.0001 ? '<$0.0001' : trace.costUsd.toFixed(4)}
              </span>
            </div>
          </div>

          {activeTab === 'pipeline' && (
            <div className="space-y-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">
                Step-by-Step Orchestrator Execution Trace
              </div>

              {/* 5-Stage Trace Pipeline */}
              <div className="space-y-3">
                {trace.stages.map((stage, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-[#221F1C] border border-[#3D362E] rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#2D2822] border border-[#3D362E] flex items-center justify-center text-[10px] font-bold text-white">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-white">{stage.name}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold ${
                        stage.status === 'cached'
                          ? 'bg-purple-900/60 text-purple-300'
                          : stage.status === 'completed'
                          ? 'bg-emerald-900/60 text-emerald-300'
                          : 'bg-red-900/60 text-red-300'
                      }`}>
                        {stage.status} • {stage.durationMs}ms
                      </span>
                    </div>

                    {/* Stage Details Key/Values */}
                    <div className="bg-[#181614] border border-[#2D2822] rounded-lg p-2.5 text-[11px] text-[#A8A29E] space-y-1">
                      {Object.entries(stage.details).map(([k, v]) => (
                        <div key={k} className="flex justify-between">
                          <span className="text-[#78716C]">{k}:</span>
                          <span className="text-white font-mono">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'payload' && (
            <div className="space-y-4">
              {/* Prompt Input */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-[#A8A29E] uppercase font-bold block">
                  Prompt Dispatched
                </span>
                <div className="p-3 bg-[#221F1C] border border-[#3D362E] rounded-xl text-white font-sans text-xs leading-relaxed whitespace-pre-wrap">
                  {trace.promptPreview}
                </div>
              </div>

              {/* Response Output */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#A8A29E] uppercase font-bold block">
                    Synthesized Response
                  </span>
                  <button
                    onClick={handleCopyResponse}
                    className="text-[11px] text-[#A8A29E] hover:text-white flex items-center gap-1 transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="p-3 bg-[#221F1C] border border-[#3D362E] rounded-xl text-white font-sans text-xs leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
                  {trace.responsePreview}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#221F1C] border-t border-[#3D362E] flex items-center justify-between text-[11px] text-[#A8A29E]">
          <span>Provider: {trace.provider.toUpperCase()}</span>
          <span>Model: {trace.selectedModel}</span>
        </div>
      </div>
    </div>
  );
};
