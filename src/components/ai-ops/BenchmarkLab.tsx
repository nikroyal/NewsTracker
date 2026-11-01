import React, { useState } from 'react';
import { 
  Play, 
  Sparkles, 
  CheckCircle2, 
  CheckSquare, 
  Square, 
  Clock, 
  Coins, 
  Layers, 
  Terminal, 
  ShieldCheck, 
  Loader2,
  Copy,
  Check,
  Eye
} from 'lucide-react';
import { AIProviderConfig } from '../../types/ai';
import { BenchmarkRecord, ExecutionTrace } from '../../types/business-os';
import { runBenchmarkArena } from '../../lib/api-client';
import { AIRequestInspectorModal } from './AIRequestInspectorModal';

const PRESET_PROMPTS = [
  {
    label: 'Financial Executive Summary',
    prompt: 'Summarize key Q3 portfolio performance risk factors and suggest 3 defensive hedging actions in concise institutional bullet points.'
  },
  {
    label: 'Competitive Moat & Capital Allocation',
    prompt: 'Provide a structured competitive moat and defensibility assessment for a mid-market financial technology payment processor.'
  },
  {
    label: 'Macro Rate Commentary & Equity Multiples',
    prompt: 'Draft an authoritative executive commentary paragraph discussing interest rate volatility impact on high-duration software equity multiples.'
  }
];

interface BenchmarkLabProps {
  customModels: AIProviderConfig[];
  apiKeysDict: Record<string, string>;
}

export const BenchmarkLab: React.FC<BenchmarkLabProps> = ({ customModels, apiKeysDict }) => {
  // Available models from custom models + defaults
  const availableModels = customModels.length > 0 ? customModels : [
    { id: 'gemini', name: 'Google Gemini 2.0 Flash', defaultModel: 'gemini-2.0-flash', protocol: 'gemini-v1' as const, baseUrl: '', enabled: true },
    { id: 'groq', name: 'Groq Llama 3.3 70B', defaultModel: 'llama-3.3-70b-versatile', protocol: 'openai-compatible' as const, baseUrl: '', enabled: true },
    { id: 'anthropic', name: 'Anthropic Claude 3.5 Sonnet', defaultModel: 'claude-3-5-sonnet', protocol: 'anthropic-messages' as const, baseUrl: '', enabled: true },
  ];

  const [selectedModelIds, setSelectedModelIds] = useState<string[]>(
    availableModels.slice(0, 3).map(m => m.id)
  );

  const [promptText, setPromptText] = useState(PRESET_PROMPTS[0].prompt);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Array<{ record: BenchmarkRecord; trace: ExecutionTrace }>>([]);
  const [activeInspectorTrace, setActiveInspectorTrace] = useState<ExecutionTrace | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleModel = (id: string) => {
    setSelectedModelIds(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleRunBenchmark = async () => {
    if (selectedModelIds.length === 0 || !promptText.trim()) return;
    setRunning(true);
    setResults([]);

    const promises = selectedModelIds.map(async (modelId) => {
      const modelCfg = availableModels.find(m => m.id === modelId);
      try {
        const res = await runBenchmarkArena({
          prompt: promptText,
          providerId: modelId,
          model: modelCfg?.defaultModel,
          apiKeys: apiKeysDict,
          customProviders: customModels,
        });
        return res;
      } catch (err: any) {
        return {
          record: {
            id: `err_${modelId}_${Date.now()}`,
            provider: modelId,
            modelId: modelCfg?.defaultModel || modelId,
            prompt: promptText,
            response: `Error: ${err.message}`,
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            latencyMs: 0,
            costUsd: 0,
            finishReason: 'error',
            cacheHit: false,
            timestamp: new Date().toISOString(),
            error: err.message,
          },
          trace: {
            id: `trace_err_${Date.now()}`,
            timestamp: new Date().toISOString(),
            feature: 'Benchmark Run (Failed)',
            selectedModel: modelCfg?.defaultModel || modelId,
            provider: modelId,
            success: false,
            cachedResponse: false,
            latencyMs: 0,
            promptTokens: 0,
            completionTokens: 0,
            costUsd: 0,
            promptPreview: promptText,
            responsePreview: err.message,
            stages: [],
          },
        };
      }
    });

    const finished = await Promise.all(promises);
    setResults(finished);
    setRunning(false);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Control Box: Preset Prompts + Model Selector */}
      <div className="p-6 bg-[#FFFFFF] border border-[#E6E5DE] rounded-3xl shadow-sm space-y-5">
        <div>
          <h2 className="text-base font-serif font-bold text-[#1C1B18]">
            AI-Ops Multi-Model Benchmark Arena
          </h2>
          <p className="text-xs font-mono text-[#68665E]">
            Execute side-by-side prompt tournaments to compare latency, token economics, and model reasoning quality
          </p>
        </div>

        {/* Preset Prompt Pills */}
        <div className="space-y-2">
          <span className="text-[11px] font-mono font-bold text-[#68665E] uppercase tracking-wider block">
            Preset Evaluation Prompts
          </span>
          <div className="flex flex-wrap gap-2">
            {PRESET_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setPromptText(p.prompt)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition cursor-pointer ${
                  promptText === p.prompt
                    ? 'bg-[#1C1B18] text-white font-bold shadow-xs'
                    : 'bg-[#FAF9F5] hover:bg-[#FAF9F5]/80 text-[#68665E] border border-[#E6E5DE]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Prompt Input */}
        <div>
          <label className="text-[11px] font-mono font-bold text-[#68665E] uppercase tracking-wider block mb-1">
            Prompt Under Tournament Test
          </label>
          <textarea
            value={promptText}
            onChange={e => setPromptText(e.target.value)}
            rows={3}
            className="w-full p-3 bg-[#FAF9F5] border border-[#E6E5DE] rounded-2xl text-xs font-sans text-[#1C1B18] focus:outline-hidden focus:border-[#1C1B18] transition resize-y"
            placeholder="Enter benchmark prompt..."
          />
        </div>

        {/* Model Selection Checkboxes */}
        <div className="space-y-2">
          <span className="text-[11px] font-mono font-bold text-[#68665E] uppercase tracking-wider block">
            Select Competing Providers ({selectedModelIds.length} chosen)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {availableModels.map(m => {
              const isSelected = selectedModelIds.includes(m.id);
              return (
                <div
                  key={m.id}
                  onClick={() => toggleModel(m.id)}
                  className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between text-xs font-mono select-none ${
                    isSelected
                      ? 'bg-amber-50/60 border-amber-300 text-[#1C1B18] font-bold shadow-2xs'
                      : 'bg-[#FAF9F5] border-[#E6E5DE] text-[#68665E] hover:border-[#1C1B18]'
                  }`}
                >
                  <div className="truncate mr-2">
                    <div className="truncate">{m.name}</div>
                    <div className="text-[10px] text-[#9E9C92] truncate">{m.defaultModel}</div>
                  </div>
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-[#9E9C92] flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between pt-2 border-t border-[#E6E5DE]">
          <span className="text-xs font-mono text-[#68665E]">
            Runs concurrently via asynchronous Promise dispatcher
          </span>

          <button
            onClick={handleRunBenchmark}
            disabled={running || selectedModelIds.length === 0 || !promptText.trim()}
            className="px-5 py-2.5 rounded-xl bg-[#1C1B18] hover:bg-[#33312B] text-white text-xs font-mono font-bold flex items-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
          >
            {running ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Running Parallel Inference...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-emerald-400 fill-current" />
                <span>Launch Tournament Arena</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Benchmark Arena Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#68665E]">
              Tournament Results Matrix ({results.length} Models Executed)
            </h3>
            <span className="text-xs font-mono text-emerald-700 font-bold">
              Parallel Execution Complete
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map(({ record, trace }, idx) => (
              <div
                key={record.id}
                className="p-5 bg-[#FFFFFF] border border-[#E6E5DE] rounded-3xl shadow-xs space-y-4 flex flex-col justify-between"
              >
                {/* Header */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#1C1B18] text-white">
                      {record.provider.toUpperCase()}
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      record.cacheHit
                        ? 'bg-purple-100 text-purple-800'
                        : record.finishReason === 'error'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {record.cacheHit ? 'CACHE HIT' : record.finishReason === 'error' ? 'ERROR' : '200 OK'}
                    </span>
                  </div>
                  <div className="text-sm font-serif font-bold text-[#1C1B18] truncate">
                    {record.modelId}
                  </div>
                </div>

                {/* Scoreboard Metrics */}
                <div className="grid grid-cols-3 gap-2 p-2.5 bg-[#FAF9F5] border border-[#E6E5DE] rounded-xl text-center text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-[#68665E] block">Latency</span>
                    <span className="font-bold text-[#1C1B18]">{record.latencyMs}ms</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#68665E] block">Tokens</span>
                    <span className="font-bold text-[#1C1B18]">{record.totalTokens}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#68665E] block">Cost</span>
                    <span className="font-bold text-emerald-700">
                      ${record.costUsd < 0.0001 ? '<$0.0001' : record.costUsd.toFixed(4)}
                    </span>
                  </div>
                </div>

                {/* Response Body */}
                <div className="p-3 bg-[#FCFAF6] border border-[#E6E5DE] rounded-xl text-xs font-sans text-[#1C1B18] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {record.response}
                </div>

                {/* Card Actions */}
                <div className="pt-2 border-t border-[#E6E5DE] flex items-center justify-between">
                  <button
                    onClick={() => setActiveInspectorTrace(trace)}
                    className="px-3 py-1.5 rounded-xl bg-[#1C1B18] hover:bg-[#33312B] text-white text-[11px] font-mono font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Inspect Step Trace</span>
                  </button>

                  <button
                    onClick={() => handleCopy(record.id, record.response)}
                    className="p-1.5 rounded-lg text-[#68665E] hover:text-[#1C1B18] hover:bg-[#FAF9F5] transition"
                    title="Copy Response"
                  >
                    {copiedId === record.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trace Inspector Modal */}
      {activeInspectorTrace && (
        <AIRequestInspectorModal
          trace={activeInspectorTrace}
          onClose={() => setActiveInspectorTrace(null)}
        />
      )}
    </div>
  );
};
