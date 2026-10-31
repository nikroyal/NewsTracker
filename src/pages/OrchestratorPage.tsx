import React, { useState } from 'react';
import {
  Cpu,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Zap,
  ArrowRight,
  Shield,
  Activity,
  Layers,
  Sparkles,
  Server,
  Check,
  ChevronUp,
  ChevronDown,
  Edit2,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import { AIProviderConfig, ProviderQuotaTelemetry } from '../types/ai';
import { testEndpointConnection } from '../lib/api-client';
import { INITIAL_AI_PROVIDERS } from '../lib/firestore-service';

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
  // Use customModels directly as the dynamic, single source of truth
  const [models, setModels] = useState<AIProviderConfig[]>(
    customModels.length > 0 ? customModels : INITIAL_AI_PROVIDERS
  );

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [defaultModel, setDefaultModel] = useState('');
  const [protocol, setProtocol] = useState<AIProviderConfig['protocol']>('openai-compatible');
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<{ valid: boolean; message: string; latency?: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Keep local state in sync when prop changes
  React.useEffect(() => {
    if (customModels && customModels.length > 0) {
      setModels(customModels);
    }
  }, [customModels]);

  // Quick preset templates for rapid configuration
  const applyPreset = (preset: string) => {
    if (preset === 'anthropic') {
      setName('Anthropic Claude');
      setProtocol('anthropic-messages');
      setBaseUrl('https://api.anthropic.com/v1');
      setDefaultModel('claude-3-5-sonnet-20241022');
    } else if (preset === 'gemini') {
      setName('Google Gemini');
      setProtocol('gemini-v1');
      setBaseUrl('https://generativelanguage.googleapis.com');
      setDefaultModel('gemini-2.0-flash');
    } else if (preset === 'groq') {
      setName('Groq Cloud');
      setProtocol('openai-compatible');
      setBaseUrl('https://api.groq.com/openai/v1');
      setDefaultModel('llama-3.3-70b-versatile');
    } else if (preset === 'openai') {
      setName('OpenAI');
      setProtocol('openai-compatible');
      setBaseUrl('https://api.openai.com/v1');
      setDefaultModel('gpt-4o-mini');
    } else if (preset === 'deepseek') {
      setName('DeepSeek AI');
      setProtocol('openai-compatible');
      setBaseUrl('https://api.deepseek.com/v1');
      setDefaultModel('deepseek-chat');
    } else if (preset === 'mistral') {
      setName('Mistral AI');
      setProtocol('openai-compatible');
      setBaseUrl('https://api.mistral.ai/v1');
      setDefaultModel('mistral-large-latest');
    } else if (preset === 'perplexity') {
      setName('Perplexity AI');
      setProtocol('openai-compatible');
      setBaseUrl('https://api.perplexity.ai');
      setDefaultModel('sonar-pro');
    } else if (preset === 'openrouter') {
      setName('OpenRouter');
      setProtocol('openai-compatible');
      setBaseUrl('https://openrouter.ai/api/v1');
      setDefaultModel('anthropic/claude-3.5-sonnet');
    } else if (preset === 'ollama') {
      setName('Local Ollama');
      setProtocol('openai-compatible');
      setBaseUrl('http://localhost:11434/v1');
      setDefaultModel('llama3.2');
    }
  };

  // --- REARRANGE FAILOVER SEQUENCE ---
  const moveModel = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= models.length) return;

    const reordered = [...models];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    setModels(reordered);
    setIsSaving(true);
    await onSaveCustomModels(reordered);
    setIsSaving(false);
  };

  const handleToggleEnable = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = models.map(m => (m.id === id ? { ...m, enabled: !m.enabled } : m));
    setModels(updated);
    await onSaveCustomModels(updated);
  };

  const handleTestNewEndpoint = async () => {
    if (!baseUrl.trim() || !defaultModel.trim()) {
      setTestStatus({ valid: false, message: 'Base URL and Model ID are required.' });
      return;
    }

    setTesting(true);
    setTestStatus(null);

    const res = await testEndpointConnection({
      providerId: editingModelId || 'custom',
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

  const handleSaveModel = async () => {
    if (!name.trim() || !baseUrl.trim() || !defaultModel.trim()) return;

    let updated: AIProviderConfig[];

    if (editingModelId) {
      // Edit existing model
      updated = models.map(m => {
        if (m.id === editingModelId) {
          return {
            ...m,
            name: name.trim(),
            protocol,
            baseUrl: baseUrl.trim(),
            apiKey: apiKey.trim() || m.apiKey,
            defaultModel: defaultModel.trim(),
          };
        }
        return m;
      });
    } else {
      // Add new model
      const newProvider: AIProviderConfig = {
        id: 'model_' + Date.now().toString(36),
        name: name.trim(),
        protocol,
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim() || undefined,
        defaultModel: defaultModel.trim(),
        enabled: true,
        isCustom: true,
      };
      updated = [...models, newProvider];
      onSelectActiveModel(newProvider.id);
    }

    setModels(updated);
    setIsSaving(true);
    await onSaveCustomModels(updated);
    setIsSaving(false);

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);

    // Reset Form
    setName('');
    setBaseUrl('');
    setApiKey('');
    setDefaultModel('');
    setEditingModelId(null);
    setShowAddForm(false);
    setTestStatus(null);
  };

  const handleEditClick = (model: AIProviderConfig, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingModelId(model.id);
    setName(model.name);
    setBaseUrl(model.baseUrl);
    setApiKey(model.apiKey || '');
    setDefaultModel(model.defaultModel);
    setProtocol(model.protocol);
    setShowAddForm(true);
    setTestStatus(null);
  };

  const handleDeleteModel = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this AI model from the orchestrator?')) {
      const updated = models.filter(m => m.id !== id);
      setModels(updated);
      setIsSaving(true);
      await onSaveCustomModels(updated);
      setIsSaving(false);

      if (activeModelId === id && updated.length > 0) {
        onSelectActiveModel(updated[0].id);
      }
    }
  };

  const handleResetToDefaults = async () => {
    if (confirm('Reset orchestrator to default recommended failover sequence?')) {
      setModels(INITIAL_AI_PROVIDERS);
      setIsSaving(true);
      await onSaveCustomModels(INITIAL_AI_PROVIDERS);
      setIsSaving(false);
      onSelectActiveModel(INITIAL_AI_PROVIDERS[0].id);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E5DE] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1C1B18] font-['Geist',sans-serif] flex items-center space-x-2.5">
            <Cpu className="w-6 h-6 text-[#1C1B18]" />
            <span>AI Model Orchestrator & Dynamic Failover</span>
          </h1>
          <p className="text-sm text-[#68665E] mt-1 font-['Geist',sans-serif]">
            Zero hardcoded providers. Re-order failover priority, configure any proprietary model, and manage live telemetry.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleResetToDefaults}
            className="px-3 py-2 rounded-xl bg-[#FAF9F5] border border-[#E6E5DE] hover:border-[#1C1B18] text-xs font-mono text-[#68665E] hover:text-[#1C1B18] flex items-center space-x-1.5 transition"
            title="Reset to recommended default sequence"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={() => {
              if (showAddForm) {
                setShowAddForm(false);
                setEditingModelId(null);
              } else {
                setName('');
                setBaseUrl('');
                setApiKey('');
                setDefaultModel('');
                setEditingModelId(null);
                setShowAddForm(true);
              }
            }}
            className="px-4 py-2.5 rounded-xl bg-[#1C1B18] hover:bg-[#2D2D2D] text-white text-xs font-medium flex items-center space-x-2 transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddForm ? 'Close Builder' : 'Add Any AI Model'}</span>
          </button>
        </div>
      </div>

      {/* Live Telemetry Card */}
      <section className="p-5 bg-[#FFFFFF] border border-[#E6E5DE] rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#E6E5DE] pb-3">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-[#1C1B18]" />
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#1C1B18]">
              Active Reasoning Telemetry HUD
            </h2>
          </div>
          <span className="text-[11px] font-mono text-[#68665E] flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active Model: <strong>{telemetry?.model || activeModelId}</strong></span>
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
            <span className="text-[11px] font-mono text-[#68665E] uppercase block">Latency Benchmark</span>
            <span className="text-sm font-semibold text-[#1C1B18] mt-0.5 block">
              {telemetry?.latencyMs ? `${telemetry.latencyMs} ms` : 'Standby'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E6E5DE]">
            <span className="text-[11px] font-mono text-[#68665E] uppercase block">Remaining Tokens</span>
            <span className="text-sm font-semibold text-[#1C1B18] mt-0.5 block">
              {telemetry?.remainingTokens !== undefined
                ? telemetry.remainingTokens.toLocaleString()
                : 'Free / Uncapped'}
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

      {/* --- ADD / EDIT MODEL BUILDER --- */}
      {showAddForm && (
        <section className="p-6 bg-[#FFFFFF] border border-[#D5D4CC] rounded-2xl shadow-sm space-y-6 animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E6E5DE] pb-4">
            <div>
              <h2 className="text-base font-semibold text-[#1C1B18]">
                {editingModelId ? 'Edit Model Configuration' : 'Register Custom AI Reasoning Model'}
              </h2>
              <p className="text-xs text-[#68665E]">
                Configure any OpenAI-compatible, Anthropic Claude, or local Ollama endpoint
              </p>
            </div>

            {/* Quick Fill Presets */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[#9E9C92] text-[11px] font-mono mr-1">Presets:</span>
              {['anthropic', 'deepseek', 'groq', 'gemini', 'openai', 'mistral', 'perplexity', 'ollama'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="px-2 py-0.5 rounded bg-[#FAF9F5] border border-[#E6E5DE] hover:border-[#1C1B18] text-[11px] font-mono text-[#1C1B18] capitalize transition"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#68665E] mb-1.5">
                Model / Provider Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. DeepSeek V3, Claude 3.5 Sonnet, Ollama Llama"
                className="w-full bg-[#FAF9F5] border border-[#E6E5DE] focus:border-[#1C1B18] focus:bg-[#FFFFFF] rounded-xl px-3.5 py-2.5 text-xs text-[#1C1B18] placeholder-[#9E9C92] transition outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#68665E] mb-1.5">
                Protocol Architecture
              </label>
              <select
                value={protocol}
                onChange={e => setProtocol(e.target.value as any)}
                className="w-full bg-[#FAF9F5] border border-[#E6E5DE] focus:border-[#1C1B18] focus:bg-[#FFFFFF] rounded-xl px-3.5 py-2.5 text-xs text-[#1C1B18] transition outline-none font-mono cursor-pointer"
              >
                <option value="openai-compatible">OpenAI Compatible (v1/chat/completions)</option>
                <option value="anthropic-messages">Anthropic Messages Protocol (v1/messages)</option>
                <option value="gemini-v1">Google Gemini API (v1beta/models)</option>
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
                placeholder="https://api.deepseek.com/v1 or http://localhost:11434/v1"
                className="w-full bg-[#FAF9F5] border border-[#E6E5DE] focus:border-[#1C1B18] focus:bg-[#FFFFFF] rounded-xl px-3.5 py-2.5 text-xs text-[#1C1B18] placeholder-[#9E9C92] transition outline-none font-mono"
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
                placeholder="e.g. deepseek-chat, claude-3-5-sonnet-20241022, llama3.2"
                className="w-full bg-[#FAF9F5] border border-[#E6E5DE] focus:border-[#1C1B18] focus:bg-[#FFFFFF] rounded-xl px-3.5 py-2.5 text-xs text-[#1C1B18] placeholder-[#9E9C92] transition outline-none font-mono"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-mono uppercase tracking-wider text-[#68665E] mb-1.5">
                API Key (Optional if already configured in API Keys Vault)
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-••••••••••••••••"
                className="w-full bg-[#FAF9F5] border border-[#E6E5DE] focus:border-[#1C1B18] focus:bg-[#FFFFFF] rounded-xl px-3.5 py-2.5 text-xs text-[#1C1B18] placeholder-[#9E9C92] transition outline-none font-mono"
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
              onClick={handleSaveModel}
              disabled={isSaving || !name.trim() || !baseUrl.trim() || !defaultModel.trim()}
              className="px-5 py-2 rounded-xl bg-[#1C1B18] hover:bg-[#2D2D2D] disabled:opacity-40 text-white text-xs font-medium flex items-center space-x-2 transition shadow-sm cursor-pointer"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>{editingModelId ? 'Update in Firestore' : 'Add to Failover Pipeline'}</span>
            </button>
          </div>
        </section>
      )}

      {/* --- DYNAMIC REARRANGEABLE FAILOVER HIERARCHY --- */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-[#1C1B18] flex items-center space-x-2">
              <Shield className="w-4 h-4 text-[#1C1B18]" />
              <span>Rearrangeable Failover Pipeline ({models.length} Models)</span>
            </h2>
            <p className="text-xs text-[#68665E] mt-0.5">
              Click Move Up (▲) / Move Down (▼) to customize the exact failover execution sequence.
            </p>
          </div>

          {saveSuccess && (
            <span className="text-xs font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl flex items-center space-x-1.5 animate-fadeIn">
              <Check className="w-3.5 h-3.5" />
              <span>Order Saved in Firestore</span>
            </span>
          )}
        </div>

        {/* Rearrangeable Model List */}
        <div className="space-y-3">
          {models.map((item, index) => {
            const isPrimary = activeModelId === item.id;
            const rankLabel = isPrimary
              ? 'PRIMARY (#1)'
              : index === 0
              ? 'STANDBY PRIMARY'
              : `FAILOVER TIER #${index + 1}`;

            return (
              <div
                key={item.id}
                onClick={() => onSelectActiveModel(item.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer bg-[#FFFFFF] ${
                  isPrimary
                    ? 'border-[#1C1B18] shadow-md ring-1 ring-[#1C1B18]'
                    : item.enabled
                    ? 'border-[#E6E5DE] hover:border-[#D5D4CC]'
                    : 'border-[#E6E5DE] opacity-50 bg-[#FAF9F5]'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {/* Left: Reorder Controls & Model Info */}
                  <div className="flex items-center space-x-3">
                    {/* Up / Down Move Buttons */}
                    <div className="flex flex-col space-y-1" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => moveModel(index, 'up')}
                        disabled={index === 0}
                        className="p-1 rounded bg-[#FAF9F5] border border-[#E6E5DE] hover:border-[#1C1B18] disabled:opacity-20 text-[#1C1B18] transition"
                        title="Move Up in Failover Order"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveModel(index, 'down')}
                        disabled={index === models.length - 1}
                        className="p-1 rounded bg-[#FAF9F5] border border-[#E6E5DE] hover:border-[#1C1B18] disabled:opacity-20 text-[#1C1B18] transition"
                        title="Move Down in Failover Order"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Rank Badge */}
                    <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-xl border ${
                      isPrimary
                        ? 'bg-[#1C1B18] text-white border-[#1C1B18]'
                        : 'bg-[#FAF9F5] text-[#68665E] border-[#E6E5DE]'
                    }`}>
                      {rankLabel}
                    </span>

                    {/* Model Icon & Titles */}
                    <div className="flex items-center space-x-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                        isPrimary
                          ? 'bg-[#1C1B18] text-white border-[#1C1B18]'
                          : 'bg-[#FAF9F5] text-[#1C1B18] border-[#E6E5DE]'
                      }`}>
                        <Zap className="w-4 h-4" />
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-bold text-[#1C1B18]">{item.name}</h3>
                          <span className="text-[11px] font-mono text-[#68665E]">
                            ({item.defaultModel})
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-[#9E9C92] truncate max-w-sm">
                          {item.baseUrl}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center space-x-2" onClick={e => e.stopPropagation()}>
                    {/* Primary Button */}
                    <button
                      type="button"
                      onClick={() => onSelectActiveModel(item.id)}
                      className={`text-xs font-mono px-3 py-1.5 rounded-xl border transition ${
                        isPrimary
                          ? 'bg-[#1C1B18] text-white border-[#1C1B18] font-semibold'
                          : 'bg-[#FAF9F5] text-[#68665E] border-[#E6E5DE] hover:border-[#1C1B18] hover:text-[#1C1B18]'
                      }`}
                    >
                      {isPrimary ? 'Active Primary' : 'Make Primary'}
                    </button>

                    {/* Enable / Disable */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleEnable(item.id, e)}
                      className={`text-xs font-mono px-2.5 py-1.5 rounded-xl border transition ${
                        item.enabled
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-[#FAF9F5] text-[#9E9C92] border-[#E6E5DE]'
                      }`}
                    >
                      {item.enabled ? 'Enabled' : 'Disabled'}
                    </button>

                    {/* Edit */}
                    <button
                      type="button"
                      onClick={(e) => handleEditClick(item, e)}
                      className="p-1.5 rounded-xl text-[#68665E] hover:text-[#1C1B18] hover:bg-[#FAF9F5] transition"
                      title="Edit Model"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteModel(item.id, e)}
                      className="p-1.5 rounded-xl text-[#9E9C92] hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Delete Model from Pipeline"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Visual Live Failover Pipeline Overview */}
      <section className="p-5 bg-[#FFFFFF] border border-[#E6E5DE] rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-[#1C1B18]" />
          <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#1C1B18]">
            Current Automated Cascading Chain
          </h2>
        </div>
        <p className="text-xs text-[#68665E] leading-relaxed">
          When executing news synthesis, NewsTracker calls the <strong>Active Primary</strong> model first. If it encounters a rate limit (HTTP 429), quota depletion, or timeout, it automatically cascades through the enabled pipeline in this exact order:
        </p>

        <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
          {models.filter(m => m.enabled).map((m, idx, arr) => {
            const isPrim = activeModelId === m.id;
            return (
              <React.Fragment key={m.id}>
                <span className={`px-3 py-1.5 rounded-xl border flex items-center space-x-1.5 ${
                  isPrim
                    ? 'bg-[#1C1B18] text-white border-[#1C1B18] font-bold shadow-xs'
                    : 'bg-[#FAF9F5] text-[#1C1B18] border-[#E6E5DE]'
                }`}>
                  <span>{idx + 1}. {m.name}</span>
                  <span className="text-[10px] opacity-70">({m.defaultModel})</span>
                </span>
                {idx < arr.length - 1 && (
                  <ArrowRight className="w-3.5 h-3.5 text-[#9E9C92]" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default OrchestratorPage;
