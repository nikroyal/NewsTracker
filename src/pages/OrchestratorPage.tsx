import React, { useState } from 'react';
import {
  Cpu,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Globe,
  Zap,
  ArrowRight,
  Shield,
  Activity,
  Layers,
  Sparkles,
  Server,
  Check,
} from 'lucide-react';
import { AIProviderConfig, ProviderQuotaTelemetry } from '../types/ai';
import { testEndpointConnection } from '../lib/api-client';

interface OrchestratorPageProps {
  activeModelId: string;
  onSelectActiveModel: (id: string) => void;
  customModels: AIProviderConfig[];
  onSaveCustomModels: (models: AIProviderConfig[]) => Promise<void>;
  telemetry: ProviderQuotaTelemetry | null;
}

export const OrchestratorPage: React.FC<OrchestratorPageProps> = ({
  activeModelId,
  onSelectActiveModel,
  customModels,
  onSaveCustomModels,
  telemetry,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [defaultModel, setDefaultModel] = useState('');
  const [protocol, setProtocol] = useState<AIProviderConfig['protocol']>('openai-compatible');
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<{ valid: boolean; message: string; latency?: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Standard built-in production models
  const standardModels = [
    {
      id: 'gemini',
      name: 'Google Gemini',
      model: 'gemini-2.0-flash',
      provider: 'Google AI Studio',
      desc: 'High-speed multimodal reasoning with massive context window. Zero cost on standard tier.',
      badge: 'Recommended',
    },
    {
      id: 'openai',
      name: 'OpenAI',
      model: 'gpt-4o-mini',
      provider: 'OpenAI Platform',
      desc: 'Industry standard for structured JSON corporate analysis and deterministic entity extraction.',
      badge: 'Precision',
    },
    {
      id: 'groq',
      name: 'Groq Cloud',
      model: 'llama-3.3-70b-versatile',
      provider: 'Groq LPUs',
      desc: 'Ultra-fast inference (500+ tokens/sec) for near-instant executive report generation.',
      badge: 'Ultra Fast',
    },
    {
      id: 'openrouter',
      name: 'OpenRouter',
      model: 'anthropic/claude-3.5-sonnet',
      provider: 'OpenRouter Gateway',
      desc: 'Universal routing layer giving access to Claude 3.5, DeepSeek, and 100+ specialized models.',
      badge: 'Universal',
    },
  ];

  const handleTestNewEndpoint = async () => {
    if (!baseUrl.trim() || !defaultModel.trim()) {
      setTestStatus({ valid: false, message: 'Base URL and Model ID are required for verification.' });
      return;
    }

    setTesting(true);
    setTestStatus(null);

    const res = await testEndpointConnection({
      providerId: 'custom',
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      model: defaultModel.trim(),
    });

    setTesting(false);
    setTestStatus({
      valid: res.valid,
      message: res.message || (res.valid ? `Endpoint verified successfully` : 'Connection ping failed'),
      latency: res.latencyMs,
    });
  };

  const handleCreateNewApi = async () => {
    if (!name.trim() || !baseUrl.trim() || !defaultModel.trim()) return;

    const newProvider: AIProviderConfig = {
      id: 'custom_' + Date.now().toString(36),
      name: name.trim(),
      protocol,
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim() || undefined,
      defaultModel: defaultModel.trim(),
      enabled: true,
      isCustom: true,
    };

    const updated = [...customModels, newProvider];
    setIsSaving(true);
    await onSaveCustomModels(updated);
    setIsSaving(false);
    onSelectActiveModel(newProvider.id);

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);

    // Reset form
    setName('');
    setBaseUrl('');
    setApiKey('');
    setDefaultModel('');
    setTestStatus(null);
    setShowAddForm(false);
  };

  const handleDeleteCustom = async (id: string) => {
    const updated = customModels.filter(m => m.id !== id);
    setIsSaving(true);
    await onSaveCustomModels(updated);
    setIsSaving(false);
    if (activeModelId === id) {
      onSelectActiveModel('gemini');
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E5DE] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1C1B18] font-['Geist',sans-serif] flex items-center space-x-2.5">
            <Cpu className="w-6 h-6 text-[#1C1B18]" />
            <span>AI Model Orchestrator & Dynamic Routing</span>
          </h1>
          <p className="text-sm text-[#68665E] mt-1 font-['Geist',sans-serif]">
            Select your active reasoning model, review live telemetry, or register any custom AI inference endpoint.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(prev => !prev)}
          className="px-4 py-2.5 rounded-xl bg-[#1C1B18] hover:bg-[#2D2D2D] text-white text-xs font-medium flex items-center space-x-2 transition-all shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{showAddForm ? 'Close Builder' : 'Register Custom AI Endpoint'}</span>
        </button>
      </div>

      {/* Live Quota & Telemetry Card */}
      <section className="p-5 bg-[#FFFFFF] border border-[#E6E5DE] rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#E6E5DE] pb-3">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-[#1C1B18]" />
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#1C1B18]">
              Live Active Telemetry HUD
            </h2>
          </div>
          <span className="text-[11px] font-mono text-[#68665E] flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active: {telemetry?.model || activeModelId}</span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E6E5DE]">
            <span className="text-[11px] font-mono text-[#68665E] uppercase block">Provider</span>
            <span className="text-sm font-semibold text-[#1C1B18] mt-0.5 block truncate">
              {telemetry?.providerName || activeModelId.toUpperCase()}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E6E5DE]">
            <span className="text-[11px] font-mono text-[#68665E] uppercase block">Last Latency</span>
            <span className="text-sm font-semibold text-[#1C1B18] mt-0.5 block">
              {telemetry?.latencyMs ? `${telemetry.latencyMs} ms` : 'Standby'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E6E5DE]">
            <span className="text-[11px] font-mono text-[#68665E] uppercase block">Remaining Tokens</span>
            <span className="text-sm font-semibold text-[#1C1B18] mt-0.5 block">
              {telemetry?.remainingTokens !== undefined
                ? telemetry.remainingTokens.toLocaleString()
                : 'Unlimited / Free'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E6E5DE]">
            <span className="text-[11px] font-mono text-[#68665E] uppercase block">Last Query Usage</span>
            <span className="text-sm font-semibold text-[#1C1B18] mt-0.5 block">
              {telemetry?.tokensConsumedLastQuery
                ? `${telemetry.tokensConsumedLastQuery.totalTokens} tokens`
                : 'None yet'}
            </span>
          </div>
        </div>
      </section>

      {/* Add Custom AI Endpoint Section */}
      {showAddForm && (
        <section className="p-6 bg-[#FFFFFF] border border-[#D5D4CC] rounded-2xl shadow-sm space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-[#E6E5DE] pb-4">
            <div>
              <h2 className="text-base font-semibold text-[#1C1B18]">Register Universal AI Endpoint</h2>
              <p className="text-xs text-[#68665E]">
                Ingest any OpenAI-compatible, Claude, or local Ollama / vLLM API into NewsTracker
              </p>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#FAF9F5] border border-[#E6E5DE] text-[#68665E]">
              Zero Hardcoding
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#68665E] mb-1.5">
                Friendly Display Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Perplexity Sonar Pro, Ollama Llama 3"
                className="w-full bg-[#FAF9F5] border border-[#E6E5DE] focus:border-[#1C1B18] focus:bg-[#FFFFFF] rounded-xl px-3.5 py-2.5 text-xs text-[#1C1B18] placeholder-[#9E9C92] transition-all outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#68665E] mb-1.5">
                Protocol Standard
              </label>
              <select
                value={protocol}
                onChange={e => setProtocol(e.target.value as any)}
                className="w-full bg-[#FAF9F5] border border-[#E6E5DE] focus:border-[#1C1B18] focus:bg-[#FFFFFF] rounded-xl px-3.5 py-2.5 text-xs text-[#1C1B18] transition-all outline-none font-mono cursor-pointer"
              >
                <option value="openai-compatible">OpenAI Compatible (v1/chat/completions)</option>
                <option value="gemini-v1">Google Gemini API (v1beta/models)</option>
                <option value="anthropic-messages">Anthropic Messages (v1/messages)</option>
                <option value="generic-rest">Generic Custom REST Endpoint</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#68665E] mb-1.5">
                Base URL / Endpoint *
              </label>
              <input
                type="url"
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
                placeholder="https://api.perplexity.ai or http://localhost:11434/v1"
                className="w-full bg-[#FAF9F5] border border-[#E6E5DE] focus:border-[#1C1B18] focus:bg-[#FFFFFF] rounded-xl px-3.5 py-2.5 text-xs text-[#1C1B18] placeholder-[#9E9C92] transition-all outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#68665E] mb-1.5">
                Default Model Identifier *
              </label>
              <input
                type="text"
                value={defaultModel}
                onChange={e => setDefaultModel(e.target.value)}
                placeholder="e.g. sonar-pro, mistral-large-latest, llama3.2"
                className="w-full bg-[#FAF9F5] border border-[#E6E5DE] focus:border-[#1C1B18] focus:bg-[#FFFFFF] rounded-xl px-3.5 py-2.5 text-xs text-[#1C1B18] placeholder-[#9E9C92] transition-all outline-none font-mono"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-mono uppercase tracking-wider text-[#68665E] mb-1.5">
                API Key / Auth Token (Optional for local models)
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-••••••••••••••••"
                className="w-full bg-[#FAF9F5] border border-[#E6E5DE] focus:border-[#1C1B18] focus:bg-[#FFFFFF] rounded-xl px-3.5 py-2.5 text-xs text-[#1C1B18] placeholder-[#9E9C92] transition-all outline-none font-mono"
              />
            </div>
          </div>

          {/* Test Status Banner */}
          {testStatus && (
            <div
              className={`p-3.5 rounded-xl border flex items-center space-x-2 text-xs font-mono ${
                testStatus.valid
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {testStatus.valid ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              )}
              <span>
                {testStatus.message} {testStatus.latency ? `(${testStatus.latency}ms)` : ''}
              </span>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#E6E5DE]">
            <button
              type="button"
              onClick={handleTestNewEndpoint}
              disabled={testing || !baseUrl.trim() || !defaultModel.trim()}
              className="px-4 py-2 rounded-xl bg-[#FAF9F5] border border-[#E6E5DE] hover:border-[#1C1B18] disabled:opacity-40 text-xs font-medium text-[#1C1B18] flex items-center space-x-2 transition cursor-pointer"
            >
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
              <span>Ping & Benchmark</span>
            </button>

            <button
              type="button"
              onClick={handleCreateNewApi}
              disabled={isSaving || !name.trim() || !baseUrl.trim() || !defaultModel.trim()}
              className="px-5 py-2 rounded-xl bg-[#1C1B18] hover:bg-[#2D2D2D] disabled:opacity-40 text-white text-xs font-medium flex items-center space-x-2 transition shadow-sm cursor-pointer"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Save to Firestore</span>
            </button>
          </div>
        </section>
      )}

      {/* Model Selection Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#1C1B18] font-['Geist',sans-serif]">
            Select Primary Reasoning Model
          </h2>
          <span className="text-xs text-[#68665E] font-mono">
            {standardModels.length + customModels.length} models available
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Standard Models */}
          {standardModels.map(item => {
            const isSelected = activeModelId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => onSelectActiveModel(item.id)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer relative bg-[#FFFFFF] ${
                  isSelected
                    ? 'border-[#1C1B18] shadow-md ring-1 ring-[#1C1B18]'
                    : 'border-[#E6E5DE] hover:border-[#D5D4CC] hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                        isSelected
                          ? 'bg-[#1C1B18] text-white border-[#1C1B18]'
                          : 'bg-[#FAF9F5] text-[#1C1B18] border-[#E6E5DE]'
                      }`}
                    >
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[#1C1B18]">{item.name}</h3>
                      <p className="text-[11px] font-mono text-[#68665E]">{item.model}</p>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#FAF9F5] border border-[#E6E5DE] text-[#68665E]">
                    {item.badge}
                  </span>
                </div>

                <p className="text-xs text-[#68665E] mt-3 line-clamp-2 leading-relaxed">
                  {item.desc}
                </p>

                <div className="mt-4 pt-3 border-t border-[#E6E5DE] flex items-center justify-between text-xs">
                  <span className="text-[11px] font-mono text-[#9E9C92]">{item.provider}</span>
                  {isSelected ? (
                    <span className="text-xs font-semibold text-[#1C1B18] flex items-center space-x-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Active Model</span>
                    </span>
                  ) : (
                    <span className="text-xs text-[#68665E] hover:text-[#1C1B18]">Select</span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Custom User Models */}
          {customModels.map(custom => {
            const isSelected = activeModelId === custom.id;
            return (
              <div
                key={custom.id}
                onClick={() => onSelectActiveModel(custom.id)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer relative bg-[#FFFFFF] ${
                  isSelected
                    ? 'border-[#1C1B18] shadow-md ring-1 ring-[#1C1B18]'
                    : 'border-[#E6E5DE] hover:border-[#D5D4CC] hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                        isSelected
                          ? 'bg-[#1C1B18] text-white border-[#1C1B18]'
                          : 'bg-[#FAF9F5] text-[#1C1B18] border-[#E6E5DE]'
                      }`}
                    >
                      <Server className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[#1C1B18]">{custom.name}</h3>
                      <p className="text-[11px] font-mono text-[#68665E]">{custom.defaultModel}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800">
                      CUSTOM
                    </span>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteCustom(custom.id);
                      }}
                      className="p-1 rounded-lg text-[#9E9C92] hover:text-rose-600 transition"
                      title="Delete custom model"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 text-xs font-mono text-[#68665E] truncate">
                  Endpoint: {custom.baseUrl}
                </div>

                <div className="mt-4 pt-3 border-t border-[#E6E5DE] flex items-center justify-between text-xs">
                  <span className="text-[11px] font-mono text-[#9E9C92]">{custom.protocol}</span>
                  {isSelected ? (
                    <span className="text-xs font-semibold text-[#1C1B18] flex items-center space-x-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Active Model</span>
                    </span>
                  ) : (
                    <span className="text-xs text-[#68665E] hover:text-[#1C1B18]">Select</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Auto-Failover Hierarchy Card */}
      <section className="p-5 bg-[#FFFFFF] border border-[#E6E5DE] rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-[#1C1B18]" />
          <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#1C1B18]">
            Automated Pipeline Failover Order
          </h2>
        </div>
        <p className="text-xs text-[#68665E] leading-relaxed">
          If your active primary model hits rate limits (HTTP 429), quota depletion (HTTP 402), or network drops,
          NewsTracker will gracefully fail over to the next tier without terminating your report aggregation:
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
          <span className="px-3 py-1 rounded-lg bg-[#FAF9F5] border border-[#E6E5DE] text-[#1C1B18] font-semibold">
            1. Active Primary ({activeModelId})
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-[#9E9C92]" />
          <span className="px-3 py-1 rounded-lg bg-[#FAF9F5] border border-[#E6E5DE] text-[#68665E]">
            2. Google Gemini 2.0 Flash
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-[#9E9C92]" />
          <span className="px-3 py-1 rounded-lg bg-[#FAF9F5] border border-[#E6E5DE] text-[#68665E]">
            3. Groq Llama 3.3
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-[#9E9C92]" />
          <span className="px-3 py-1 rounded-lg bg-[#FAF9F5] border border-[#E6E5DE] text-[#68665E]">
            4. OpenRouter Claude 3.5
          </span>
        </div>
      </section>
    </div>
  );
};

export default OrchestratorPage;
