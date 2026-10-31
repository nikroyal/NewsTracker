import React, { useState } from 'react';
import {
  Key,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Globe,
  Shield,
  Eye,
  EyeOff,
  Radio,
  ExternalLink,
  Check,
} from 'lucide-react';
import { UniversalApiKeyEntry } from '../types/ai';
import { testEndpointConnection } from '../lib/api-client';

interface ApiKeysPageProps {
  keys: UniversalApiKeyEntry[];
  onSaveKeys: (keys: UniversalApiKeyEntry[]) => Promise<void>;
}

export const ApiKeysPage: React.FC<ApiKeysPageProps> = ({ keys, onSaveKeys }) => {
  const [entries, setEntries] = useState<UniversalApiKeyEntry[]>(keys);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showKeyMap, setShowKeyMap] = useState<Record<string, boolean>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { valid: boolean; message: string; latency?: number }>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New Key Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'ai' | 'data' | 'other'>('ai');
  const [providerType, setProviderType] = useState<UniversalApiKeyEntry['providerType']>('openai-compatible');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [headerName, setHeaderName] = useState('Authorization');
  const [headerPrefix, setHeaderPrefix] = useState('Bearer');
  const [queryParamName, setQueryParamName] = useState('');
  const [modelId, setModelId] = useState('');
  const [notes, setNotes] = useState('');

  // Quick preset template fills
  const applyPreset = (presetType: string) => {
    if (presetType === 'gemini') {
      setName('Google Gemini');
      setCategory('ai');
      setProviderType('gemini-v1');
      setBaseUrl('https://generativelanguage.googleapis.com');
      setModelId('gemini-2.0-flash');
      setHeaderName('queryParam');
      setQueryParamName('key');
    } else if (presetType === 'groq') {
      setName('Groq Cloud');
      setCategory('ai');
      setProviderType('openai-compatible');
      setBaseUrl('https://api.groq.com/openai/v1');
      setModelId('llama-3.3-70b-versatile');
      setHeaderName('Authorization');
      setHeaderPrefix('Bearer');
    } else if (presetType === 'openai') {
      setName('OpenAI');
      setCategory('ai');
      setProviderType('openai-compatible');
      setBaseUrl('https://api.openai.com/v1');
      setModelId('gpt-4o-mini');
      setHeaderName('Authorization');
      setHeaderPrefix('Bearer');
    } else if (presetType === 'finnhub') {
      setName('Finnhub Financial News');
      setCategory('data');
      setProviderType('header-auth');
      setBaseUrl('https://finnhub.io/api/v1');
      setHeaderName('X-Finnhub-Token');
      setHeaderPrefix('');
    } else if (presetType === 'openrouter') {
      setName('OpenRouter');
      setCategory('ai');
      setProviderType('openai-compatible');
      setBaseUrl('https://openrouter.ai/api/v1');
      setModelId('anthropic/claude-3.5-sonnet');
      setHeaderName('Authorization');
      setHeaderPrefix('Bearer');
    } else if (presetType === 'custom') {
      setName('');
      setCategory('ai');
      setProviderType('openai-compatible');
      setBaseUrl('');
      setModelId('');
      setHeaderName('Authorization');
      setHeaderPrefix('Bearer');
    }
  };

  const handleTestKey = async (entry: UniversalApiKeyEntry) => {
    setTestingId(entry.id);
    const res = await testEndpointConnection({
      providerId: entry.id,
      apiKey: entry.apiKey,
      baseUrl: entry.baseUrl,
      model: entry.modelId,
    });
    setTestingId(null);
    setTestResults(prev => ({
      ...prev,
      [entry.id]: {
        valid: res.valid,
        message: res.message || (res.valid ? 'Verified Connected' : 'Failed to connect'),
        latency: res.latencyMs,
      },
    }));
  };

  const handleAddNewKey = async () => {
    if (!name.trim() || !apiKey.trim()) return;

    const newEntry: UniversalApiKeyEntry = {
      id: 'key_' + Date.now().toString(36),
      name: name.trim(),
      category,
      providerType,
      baseUrl: baseUrl.trim() || undefined,
      apiKey: apiKey.trim(),
      headerName: headerName.trim() || 'Authorization',
      headerPrefix: headerPrefix.trim(),
      queryParamName: queryParamName.trim() || undefined,
      modelId: modelId.trim() || undefined,
      notes: notes.trim() || undefined,
      enabled: true,
      updatedAt: new Date().toISOString(),
    };

    const updated = [newEntry, ...entries];
    setEntries(updated);
    setIsSaving(true);
    await onSaveKeys(updated);
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);

    // Reset Form
    setName('');
    setApiKey('');
    setBaseUrl('');
    setModelId('');
    setNotes('');
    setShowAddForm(false);
  };

  const handleDelete = async (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    setIsSaving(true);
    await onSaveKeys(updated);
    setIsSaving(false);
  };

  const handleToggleEnable = async (id: string) => {
    const updated = entries.map(e => (e.id === id ? { ...e, enabled: !e.enabled } : e));
    setEntries(updated);
    await onSaveKeys(updated);
  };

  const toggleShowKey = (id: string) => {
    setShowKeyMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* Page Title & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E5DE] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1C1B18] font-['Geist',sans-serif] flex items-center space-x-2.5">
            <Key className="w-6 h-6 text-[#1C1B18]" />
            <span>Universal API Keys & Endpoints</span>
          </h1>
          <p className="text-sm text-[#68665E] mt-1 font-['Geist',sans-serif]">
            Add and manage literally any API key, custom REST news feed, or AI model endpoint. Stored 100% in Cloud Firestore.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(prev => !prev)}
          className="px-4 py-2.5 rounded-xl bg-[#1C1B18] hover:bg-[#2D2D2D] text-white text-xs font-medium flex items-center space-x-2 transition-all shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{showAddForm ? 'Close Builder' : 'Add Any API Key'}</span>
        </button>
      </div>

      {/* Security & Firestore Note */}
      <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#E6E5DE] flex items-start space-x-3 text-xs text-[#68665E] shadow-sm">
        <Shield className="w-4 h-4 text-[#1C1B18] flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-[#1C1B18]">Universal Compatibility & Cloud Storage:</span> You are not restricted to any fixed set of providers. Connect any API key, bearer token, or custom header authentication for news feeds, market APIs, or LLMs. Everything is stored directly in your private Cloud Firestore document (`settings/universal_keys`), with zero keys on your local machine.
        </div>
      </div>

      {/* Add New API Form (Dedicated Section) */}
      {showAddForm && (
        <section className="p-6 bg-[#FFFFFF] border border-[#D5D4CC] rounded-2xl shadow-sm space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-[#E6E5DE] pb-4">
            <div>
              <h2 className="text-base font-semibold text-[#1C1B18]">Universal API Configuration Builder</h2>
              <p className="text-xs text-[#68665E]">Configure custom headers, base URLs, or query param tokens</p>
            </div>
            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-[#68665E] text-[11px] font-mono mr-1">Quick Fill:</span>
              <button
                type="button"
                onClick={() => applyPreset('gemini')}
                className="px-2 py-1 rounded-md bg-[#FAF9F5] border border-[#E6E5DE] hover:border-[#1C1B18] text-[11px] text-[#1C1B18] font-mono transition"
              >
                Gemini
              </button>
              <button
                type="button"
                onClick={() => applyPreset('groq')}
                className="px-2 py-1 rounded-md bg-[#FAF9F5] border border-[#E6E5DE] hover:border-[#1C1B18] text-[11px] text-[#1C1B18] font-mono transition"
              >
                Groq
              </button>
              <button
                type="button"
                onClick={() => applyPreset('openai')}
                className="px-2 py-1 rounded-md bg-[#FAF9F5] border border-[#E6E5DE] hover:border-[#1C1B18] text-[11px] text-[#1C1B18] font-mono transition"
              >
                OpenAI
              </button>
              <button
                type="button"
                onClick={() => applyPreset('finnhub')}
                className="px-2 py-1 rounded-md bg-[#FAF9F5] border border-[#E6E5DE] hover:border-[#1C1B18] text-[11px] text-[#1C1B18] font-mono transition"
              >
                Finnhub
              </button>
              <button
                type="button"
                onClick={() => applyPreset('openrouter')}
                className="px-2 py-1 rounded-md bg-[#FAF9F5] border border-[#E6E5DE] hover:border-[#1C1B18] text-[11px] text-[#1C1B18] font-mono transition"
              >
                OpenRouter
              </button>
              <button
                type="button"
                onClick={() => applyPreset('custom')}
                className="px-2 py-1 rounded-md bg-[#FAF9F5] border border-[#E6E5DE] hover:border-[#1C1B18] text-[11px] text-[#1C1B18] font-mono transition"
              >
                Custom
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-['Geist',sans-serif]">
            {/* Name */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[#68665E] mb-1.5">
                Provider / Feed Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. DeepSeek-V3, AlphaVantage, Finnhub"
                className="w-full bg-[#FAF9F5] border border-[#E6E5DE] rounded-xl px-3.5 py-2.5 text-[#1C1B18] focus:outline-none focus:border-[#1C1B18] font-mono transition"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[#68665E] mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className="w-full bg-[#FAF9F5] border border-[#E6E5DE] rounded-xl px-3.5 py-2.5 text-[#1C1B18] focus:outline-none focus:border-[#1C1B18] font-mono transition cursor-pointer"
              >
                <option value="ai">AI Model Provider</option>
                <option value="data">Data / News API Feed</option>
                <option value="other">Webhook / Other Service</option>
              </select>
            </div>

            {/* Protocol */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[#68665E] mb-1.5">
                Protocol / Format
              </label>
              <select
                value={providerType}
                onChange={e => setProviderType(e.target.value as any)}
                className="w-full bg-[#FAF9F5] border border-[#E6E5DE] rounded-xl px-3.5 py-2.5 text-[#1C1B18] focus:outline-none focus:border-[#1C1B18] font-mono transition cursor-pointer"
              >
                <option value="openai-compatible">OpenAI-Compatible (Bearer Token)</option>
                <option value="gemini-v1">Google Gemini (Query Param Key)</option>
                <option value="anthropic-messages">Anthropic Messages Protocol</option>
                <option value="header-auth">Custom Header Auth (X-Api-Key, etc.)</option>
                <option value="generic-rest">Universal REST JSON</option>
              </select>
            </div>

            {/* Base URL */}
            <div className="md:col-span-2">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[#68665E] mb-1.5">
                Base URL / Endpoint
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
                placeholder="e.g. https://api.deepseek.com/v1 or https://api.polygon.io"
                className="w-full bg-[#FAF9F5] border border-[#E6E5DE] rounded-xl px-3.5 py-2.5 text-[#1C1B18] focus:outline-none focus:border-[#1C1B18] font-mono transition"
              />
            </div>

            {/* Model ID */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[#68665E] mb-1.5">
                Model Identifier (Optional)
              </label>
              <input
                type="text"
                value={modelId}
                onChange={e => setModelId(e.target.value)}
                placeholder="e.g. deepseek-chat, llama-3.3"
                className="w-full bg-[#FAF9F5] border border-[#E6E5DE] rounded-xl px-3.5 py-2.5 text-[#1C1B18] focus:outline-none focus:border-[#1C1B18] font-mono transition"
              />
            </div>

            {/* Secret API Key */}
            <div className="md:col-span-2">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[#68665E] mb-1.5">
                API Key / Secret Token *
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-..., AIzaSy..., or custom auth token"
                className="w-full bg-[#FAF9F5] border border-[#E6E5DE] rounded-xl px-3.5 py-2.5 text-[#1C1B18] focus:outline-none focus:border-[#1C1B18] font-mono transition"
              />
            </div>

            {/* Custom Header Name */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[#68665E] mb-1.5">
                Auth Header Name
              </label>
              <input
                type="text"
                value={headerName}
                onChange={e => setHeaderName(e.target.value)}
                placeholder="Authorization (or X-Api-Key)"
                className="w-full bg-[#FAF9F5] border border-[#E6E5DE] rounded-xl px-3.5 py-2.5 text-[#1C1B18] focus:outline-none focus:border-[#1C1B18] font-mono transition"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#E6E5DE]">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-xs font-medium text-[#68665E] hover:text-[#1C1B18] transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddNewKey}
              disabled={!name.trim() || !apiKey.trim() || isSaving}
              className="px-5 py-2.5 rounded-xl bg-[#1C1B18] hover:bg-[#2D2D2D] disabled:opacity-40 text-white text-xs font-medium transition shadow-sm flex items-center space-x-1.5"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Save to Firestore</span>
            </button>
          </div>
        </section>
      )}

      {/* List of Registered API Keys */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-wider text-[#68665E]">
            Registered APIs ({entries.length})
          </h2>
          {saveSuccess && (
            <span className="text-xs font-mono text-emerald-700 flex items-center space-x-1 animate-fadeIn">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Synced to Cloud Firestore</span>
            </span>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="p-12 text-center bg-[#FFFFFF] border border-[#E6E5DE] rounded-2xl space-y-3">
            <Key className="w-8 h-8 text-[#9E9C92] mx-auto" />
            <h3 className="text-sm font-semibold text-[#1C1B18]">No API Keys Registered Yet</h3>
            <p className="text-xs text-[#68665E] max-w-md mx-auto">
              Add your Google Gemini, Groq, Finnhub, OpenAI, or any custom API endpoint above. All keys are encrypted and stored in Cloud Firestore.
            </p>
            <button
              onClick={() => {
                setShowAddForm(true);
                applyPreset('gemini');
              }}
              className="mt-2 px-4 py-2 rounded-xl bg-[#1C1B18] text-white text-xs font-medium inline-flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Key (e.g. Gemini)</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {entries.map(entry => {
              const isShowing = showKeyMap[entry.id];
              const isTesting = testingId === entry.id;
              const test = testResults[entry.id];

              return (
                <div
                  key={entry.id}
                  className={`p-4 rounded-2xl bg-[#FFFFFF] border transition-all ${
                    entry.enabled ? 'border-[#E6E5DE]' : 'border-[#E6E5DE] opacity-60'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-[#1C1B18]">{entry.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FAF9F5] border border-[#E6E5DE] text-[#68665E] uppercase">
                          {entry.category}
                        </span>
                        {entry.modelId && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-900 border border-amber-500/20">
                            {entry.modelId}
                          </span>
                        )}
                      </div>

                      {entry.baseUrl && (
                        <p className="text-[11px] font-mono text-[#68665E] truncate max-w-md">
                          {entry.baseUrl}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Test Connection Button */}
                      <button
                        onClick={() => handleTestKey(entry)}
                        disabled={isTesting}
                        className="px-3 py-1.5 rounded-xl bg-[#FAF9F5] border border-[#E6E5DE] hover:border-[#1C1B18] text-xs font-medium text-[#1C1B18] flex items-center space-x-1.5 transition cursor-pointer"
                        title="Ping endpoint to verify connectivity and latency"
                      >
                        {isTesting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1C1B18]" />
                            <span className="font-mono text-[11px]">Testing...</span>
                          </>
                        ) : (
                          <>
                            <Radio className="w-3 h-3 text-[#1C1B18]" />
                            <span className="font-mono text-[11px]">Test Ping</span>
                          </>
                        )}
                      </button>

                      {/* Enable/Disable Toggle */}
                      <button
                        onClick={() => handleToggleEnable(entry.id)}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-mono transition cursor-pointer ${
                          entry.enabled
                            ? 'bg-emerald-500/10 text-emerald-800 border border-emerald-500/20'
                            : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                        }`}
                      >
                        {entry.enabled ? 'Active' : 'Disabled'}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="p-1.5 rounded-lg text-[#9E9C92] hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Delete Key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Masked Key Display */}
                  <div className="mt-3 pt-3 border-t border-[#F4F3EE] flex items-center justify-between text-xs font-mono text-[#68665E]">
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] uppercase tracking-wider text-[#9E9C92]">Key:</span>
                      <span className="text-[#1C1B18]">
                        {isShowing ? entry.apiKey : `${entry.apiKey.slice(0, 4)}••••••••••••••••${entry.apiKey.slice(-4)}`}
                      </span>
                      <button
                        onClick={() => toggleShowKey(entry.id)}
                        className="text-[#9E9C92] hover:text-[#1C1B18] transition p-0.5"
                      >
                        {isShowing ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {test && (
                      <div className={`flex items-center space-x-1.5 text-[11px] ${test.valid ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {test.valid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        <span>{test.message} {test.latency ? `(${test.latency}ms)` : ''}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
