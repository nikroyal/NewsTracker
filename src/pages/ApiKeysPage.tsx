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
  Zap,
  Sparkles,
  Layers,
  Activity,
  Server,
  Terminal,
  HelpCircle,
  Cpu,
} from 'lucide-react';
import { UniversalApiKeyEntry } from '../types/ai';
import { testEndpointConnection } from '../lib/api-client';
import {
  detectApiKeysOrEndpoints,
  detectSingleApiKeyOrEndpoint,
  maskApiKey,
  DetectedApiEntry,
} from '../lib/api-detector';

interface ApiKeysPageProps {
  keys: UniversalApiKeyEntry[];
  onSaveKeys: (keys: UniversalApiKeyEntry[]) => Promise<void>;
}

export const ApiKeysPage: React.FC<ApiKeysPageProps> = ({ keys, onSaveKeys }) => {
  const [entries, setEntries] = useState<UniversalApiKeyEntry[]>(keys);
  const [showKeyMap, setShowKeyMap] = useState<Record<string, boolean>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, {
    valid: boolean;
    message: string;
    latency?: number;
    healthStatus?: string;
    models?: string[];
  }>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // --- Smart Universal Ingestion / Detection Input State ---
  const [smartInput, setSmartInput] = useState('');
  const [detectedList, setDetectedList] = useState<DetectedApiEntry[]>([]);
  const [activeDetected, setActiveDetected] = useState<DetectedApiEntry | null>(null);
  const [isProbingDetected, setIsProbingDetected] = useState(false);
  const [probeResult, setProbeResult] = useState<{
    valid: boolean;
    status: number;
    latencyMs: number;
    message: string;
    healthStatus: string;
    availableModels?: string[];
    telemetry?: {
      remainingTokens?: number;
      remainingRequests?: number;
      limitTokens?: number;
      limitRequests?: number;
      resetTime?: string;
    };
  } | null>(null);

  // Editable fields for active detected key
  const [editedName, setEditedName] = useState('');
  const [editedBaseUrl, setEditedBaseUrl] = useState('');
  const [editedModelId, setEditedModelId] = useState('');
  const [editedCategory, setEditedCategory] = useState<'ai' | 'data' | 'other'>('ai');
  const [editedHeaderName, setEditedHeaderName] = useState('Authorization');
  const [editedHeaderPrefix, setEditedHeaderPrefix] = useState('Bearer');
  const [editedQueryParam, setEditedQueryParam] = useState('');

  // Handle Smart Input Change (Real-Time Detection)
  const handleSmartInputChange = (val: string) => {
    setSmartInput(val);
    setProbeResult(null);

    if (!val.trim()) {
      setDetectedList([]);
      setActiveDetected(null);
      return;
    }

    const detected = detectApiKeysOrEndpoints(val);
    setDetectedList(detected);

    if (detected.length > 0) {
      const primary = detected[0];
      setActiveDetected(primary);
      setEditedName(primary.name);
      setEditedBaseUrl(primary.baseUrl);
      setEditedModelId(primary.modelId);
      setEditedCategory(primary.category);
      setEditedHeaderName(primary.headerName);
      setEditedHeaderPrefix(primary.headerPrefix);
      setEditedQueryParam(primary.queryParamName || '');
    } else {
      setActiveDetected(null);
    }
  };

  // Live Probe for Detected Key
  const handleProbeDetected = async () => {
    if (!activeDetected) return;
    setIsProbingDetected(true);
    setProbeResult(null);

    const res = await testEndpointConnection({
      providerId: activeDetected.providerId,
      name: editedName || activeDetected.name,
      apiKey: activeDetected.sanitizedKey,
      baseUrl: editedBaseUrl || activeDetected.baseUrl,
      headerName: editedHeaderName,
      headerPrefix: editedHeaderPrefix,
      queryParamName: editedQueryParam,
      model: editedModelId || activeDetected.modelId,
    });

    setIsProbingDetected(false);
    setProbeResult(res);

    // If probe discovered live models, auto-select the first one
    if (res.availableModels && res.availableModels.length > 0 && !editedModelId) {
      setEditedModelId(res.availableModels[0]);
    }
  };

  // Record Single Detected Key to Cloud Firestore
  const handleRecordDetected = async () => {
    if (!activeDetected || !activeDetected.sanitizedKey) return;

    const newEntry: UniversalApiKeyEntry = {
      id: 'key_' + Date.now().toString(36),
      name: (editedName || activeDetected.name).trim(),
      category: editedCategory,
      providerType: activeDetected.providerType,
      baseUrl: (editedBaseUrl || activeDetected.baseUrl).trim() || undefined,
      apiKey: activeDetected.sanitizedKey.trim(),
      headerName: (editedHeaderName || 'Authorization').trim(),
      headerPrefix: editedHeaderPrefix.trim(),
      queryParamName: editedQueryParam.trim() || undefined,
      modelId: (editedModelId || activeDetected.modelId).trim() || undefined,
      enabled: true,
      updatedAt: new Date().toISOString(),

      // Advanced Recorder Metadata
      detectedProvider: activeDetected.providerId,
      maskedKey: maskApiKey(activeDetected.sanitizedKey),
      healthStatus: (probeResult?.healthStatus as any) || 'healthy',
      lastPingLatencyMs: probeResult?.latencyMs,
      availableModels: probeResult?.availableModels,
      discoveredQuota: probeResult?.telemetry,
      tags: [activeDetected.category, activeDetected.isIdentified ? 'verified_provider' : 'custom_endpoint'],
    };

    const updated = [newEntry, ...entries.filter(e => e.apiKey !== newEntry.apiKey)];
    setEntries(updated);
    setIsSaving(true);
    await onSaveKeys(updated);
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);

    // Clear input
    setSmartInput('');
    setDetectedList([]);
    setActiveDetected(null);
    setProbeResult(null);
  };

  // Record All Batch Detected Keys
  const handleRecordAllBatch = async () => {
    if (detectedList.length === 0) return;

    const newEntries: UniversalApiKeyEntry[] = detectedList.map(item => ({
      id: 'key_' + Math.random().toString(36).substring(2, 9),
      name: item.name,
      category: item.category,
      providerType: item.providerType,
      baseUrl: item.baseUrl || undefined,
      apiKey: item.sanitizedKey,
      headerName: item.headerName,
      headerPrefix: item.headerPrefix,
      queryParamName: item.queryParamName,
      modelId: item.modelId || undefined,
      enabled: true,
      updatedAt: new Date().toISOString(),
      detectedProvider: item.providerId,
      maskedKey: maskApiKey(item.sanitizedKey),
      healthStatus: 'untested',
      tags: [item.category, item.isIdentified ? 'verified_provider' : 'custom_endpoint'],
    }));

    const updated = [...newEntries, ...entries];
    setEntries(updated);
    setIsSaving(true);
    await onSaveKeys(updated);
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);

    setSmartInput('');
    setDetectedList([]);
    setActiveDetected(null);
    setProbeResult(null);
  };

  // Re-probe an existing recorded key in Vault
  const handleReProbeVaultKey = async (entry: UniversalApiKeyEntry) => {
    setTestingId(entry.id);
    const res = await testEndpointConnection({
      providerId: entry.detectedProvider || entry.id,
      name: entry.name,
      apiKey: entry.apiKey,
      baseUrl: entry.baseUrl,
      headerName: entry.headerName,
      headerPrefix: entry.headerPrefix,
      queryParamName: entry.queryParamName,
      model: entry.modelId,
    });
    setTestingId(null);

    setTestResults(prev => ({
      ...prev,
      [entry.id]: {
        valid: res.valid,
        message: res.message,
        latency: res.latencyMs,
        healthStatus: res.healthStatus,
        models: res.availableModels,
      },
    }));

    // Update in state and Firestore
    const updated = entries.map(e => {
      if (e.id === entry.id) {
        return {
          ...e,
          healthStatus: res.healthStatus,
          lastPingLatencyMs: res.latencyMs,
          availableModels: res.availableModels || e.availableModels,
          discoveredQuota: res.telemetry || e.discoveredQuota,
          updatedAt: new Date().toISOString(),
        };
      }
      return e;
    });

    setEntries(updated);
    await onSaveKeys(updated);
  };

  // Select Model for Recorded Key
  const handleSelectModel = async (id: string, modelId: string) => {
    const updated = entries.map(e => (e.id === id ? { ...e, modelId } : e));
    setEntries(updated);
    await onSaveKeys(updated);
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
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E5DE] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1C1B18] font-['Geist',sans-serif] flex items-center space-x-2.5">
            <Key className="w-6 h-6 text-[#1C1B18]" />
            <span>Universal API Detector & Recorder Vault</span>
          </h1>
          <p className="text-sm text-[#68665E] mt-1 font-['Geist',sans-serif]">
            Paste literally any API key, cURL command, or .env file. Automatically identifies providers, benchmarks latency, discovers live models, and records 100% in Cloud Firestore.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-[#FFFFFF] border border-[#E6E5DE] text-[#68665E]">
            Vault Keys: <strong className="text-[#1C1B18]">{entries.length}</strong>
          </span>
        </div>
      </div>

      {/* --- SMART DETECTION & INGESTION COMMAND BOX --- */}
      <section className="p-6 bg-[#FFFFFF] border border-[#D5D4CC] rounded-3xl shadow-sm space-y-5 animate-fadeIn">
        <div className="flex items-center justify-between border-b border-[#E6E5DE] pb-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-[#1C1B18]" />
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#1C1B18]">
              Intelligent Universal Ingestion Bar
            </h2>
          </div>
          <span className="text-[11px] font-mono text-[#68665E]">
            AI & News Feeds • cURL • .env • Unidentified Models
          </span>
        </div>

        {/* Input Textarea */}
        <div className="relative">
          <textarea
            rows={smartInput.includes('\n') ? 4 : 2}
            value={smartInput}
            onChange={(e) => handleSmartInputChange(e.target.value)}
            placeholder="Paste raw key (e.g. sk-..., AIzaSy..., gsk_...), full cURL command, or .env snippet..."
            className="w-full bg-[#FAF9F5] border border-[#E6E5DE] focus:border-[#1C1B18] focus:bg-[#FFFFFF] rounded-2xl p-4 text-xs text-[#1C1B18] placeholder-[#9E9C92] outline-none font-mono transition-all leading-relaxed"
          />

          {smartInput && (
            <button
              onClick={() => handleSmartInputChange('')}
              className="absolute right-3.5 top-3.5 text-[11px] font-mono text-[#9E9C92] hover:text-[#1C1B18] transition"
            >
              Clear
            </button>
          )}
        </div>

        {/* --- SINGLE KEY DETECTION CARD --- */}
        {activeDetected && detectedList.length === 1 && (
          <div className="p-5 rounded-2xl bg-[#FAF9F5] border border-[#E6E5DE] space-y-4 animate-fadeIn">
            {/* Detection Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                  activeDetected.isIdentified
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  {activeDetected.isIdentified ? <Shield className="w-4 h-4" /> : <Server className="w-4 h-4" />}
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-[#1C1B18]">
                      {activeDetected.name}
                    </h3>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase border ${
                      activeDetected.isIdentified
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                        : 'bg-amber-100 text-amber-900 border-amber-200'
                    }`}>
                      {activeDetected.isIdentified ? `${(activeDetected.confidence * 100).toFixed(0)}% Identified` : 'Universal / Custom'}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-[#68665E] mt-0.5">
                    {activeDetected.notes}
                  </p>
                </div>
              </div>

              {/* Masked Key Pill */}
              <div className="text-xs font-mono bg-[#FFFFFF] px-3 py-1.5 rounded-xl border border-[#E6E5DE] text-[#1C1B18]">
                Key: <span className="font-semibold">{activeDetected.maskedKey}</span>
              </div>
            </div>

            {/* Inferred Parameters Grid (Editable Overrides) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#68665E] mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#E6E5DE] rounded-xl px-3 py-2 text-xs text-[#1C1B18] font-mono outline-none focus:border-[#1C1B18]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#68665E] mb-1">
                  Base URL / Endpoint
                </label>
                <input
                  type="text"
                  value={editedBaseUrl}
                  onChange={(e) => setEditedBaseUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-[#FFFFFF] border border-[#E6E5DE] rounded-xl px-3 py-2 text-xs text-[#1C1B18] font-mono outline-none focus:border-[#1C1B18]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#68665E] mb-1">
                  Default Model
                </label>
                <input
                  type="text"
                  value={editedModelId}
                  onChange={(e) => setEditedModelId(e.target.value)}
                  placeholder="e.g. gpt-4o, llama-3.3"
                  className="w-full bg-[#FFFFFF] border border-[#E6E5DE] rounded-xl px-3 py-2 text-xs text-[#1C1B18] font-mono outline-none focus:border-[#1C1B18]"
                />
              </div>
            </div>

            {/* Live Probe Result Banner */}
            {probeResult && (
              <div className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs font-mono ${
                probeResult.valid
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                <div className="flex items-center space-x-2">
                  {probeResult.valid ? <CheckCircle2 className="w-4 h-4 text-emerald-700" /> : <AlertCircle className="w-4 h-4 text-rose-700" />}
                  <span>{probeResult.message} ({probeResult.latencyMs}ms)</span>
                </div>

                {probeResult.availableModels && probeResult.availableModels.length > 0 && (
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[11px] text-[#68665E]">Discovered:</span>
                    <select
                      value={editedModelId}
                      onChange={(e) => setEditedModelId(e.target.value)}
                      className="bg-[#FFFFFF] border border-[#E6E5DE] rounded-lg px-2 py-1 text-xs text-[#1C1B18] font-mono outline-none cursor-pointer"
                    >
                      {probeResult.availableModels.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={handleProbeDetected}
                disabled={isProbingDetected}
                className="px-4 py-2 rounded-xl bg-[#FFFFFF] border border-[#E6E5DE] hover:border-[#1C1B18] disabled:opacity-50 text-xs font-medium text-[#1C1B18] flex items-center space-x-2 transition cursor-pointer"
              >
                {isProbingDetected ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                <span>Probe & Benchmark</span>
              </button>

              <button
                type="button"
                onClick={handleRecordDetected}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-[#1C1B18] hover:bg-[#2D2D2D] disabled:opacity-50 text-white text-xs font-medium flex items-center space-x-2 transition shadow-sm cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Record to Vault</span>
              </button>
            </div>
          </div>
        )}

        {/* --- BATCH MULTI-KEY DETECTION REVIEW --- */}
        {detectedList.length > 1 && (
          <div className="p-5 rounded-2xl bg-[#FAF9F5] border border-[#E6E5DE] space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#E6E5DE] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#1C1B18]">
                  Batch Detection: {detectedList.length} Keys Identified
                </h3>
                <p className="text-xs text-[#68665E]">
                  Multi-line config detected. Review parsed entries below.
                </p>
              </div>

              <button
                type="button"
                onClick={handleRecordAllBatch}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-[#1C1B18] hover:bg-[#2D2D2D] disabled:opacity-50 text-white text-xs font-medium flex items-center space-x-2 transition shadow-sm cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Record All ({detectedList.length} Keys)</span>
              </button>
            </div>

            <div className="divide-y divide-[#E6E5DE] bg-[#FFFFFF] border border-[#E6E5DE] rounded-xl overflow-hidden">
              {detectedList.map((item, idx) => (
                <div key={idx} className="p-3 text-xs flex items-center justify-between font-mono">
                  <div className="flex items-center space-x-3">
                    <span className="font-semibold text-[#1C1B18]">{item.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#FAF9F5] border border-[#E6E5DE] text-[#68665E]">
                      {item.category.toUpperCase()}
                    </span>
                  </div>

                  <span className="text-[#68665E]">{item.maskedKey}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* --- RECORDED KEY VAULT --- */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#1C1B18]">
              Recorded Credentials & Endpoint Vault
            </h2>
            <p className="text-xs text-[#68665E]">
              100% persisted in Cloud Firestore. Masked for zero screen leakage.
            </p>
          </div>

          {saveSuccess && (
            <span className="text-xs font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl flex items-center space-x-1.5 animate-fadeIn">
              <Check className="w-3.5 h-3.5" />
              <span>Saved to Firestore</span>
            </span>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="p-12 text-center bg-[#FFFFFF] border border-[#E6E5DE] rounded-2xl space-y-3">
            <Key className="w-8 h-8 text-[#9E9C92] mx-auto" />
            <h3 className="text-sm font-semibold text-[#1C1B18]">Vault Empty</h3>
            <p className="text-xs text-[#68665E] max-w-sm mx-auto">
              Paste any API key, cURL snippet, or .env line in the smart ingestion bar above to automatically detect, probe, and record credentials.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const isRevealed = showKeyMap[entry.id];
              const isTesting = testingId === entry.id;
              const testRes = testResults[entry.id];
              const health = testRes?.healthStatus || entry.healthStatus || 'untested';

              return (
                <div
                  key={entry.id}
                  className={`p-5 rounded-2xl border transition-all bg-[#FFFFFF] ${
                    entry.enabled ? 'border-[#E6E5DE] shadow-xs' : 'border-[#E6E5DE] opacity-60 bg-[#FAF9F5]'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* Left: Info & Health */}
                    <div className="flex items-start space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-[#FAF9F5] border border-[#E6E5DE] flex items-center justify-center text-[#1C1B18] mt-0.5">
                        {entry.category === 'ai' ? <Cpu className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-bold text-[#1C1B18]">{entry.name}</h3>
                          <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                            health === 'healthy'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : health === 'rate_limited'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : health === 'unauthorized' || health === 'degraded'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-[#FAF9F5] text-[#68665E] border-[#E6E5DE]'
                          }`}>
                            {health === 'healthy' && entry.lastPingLatencyMs
                              ? `HEALTHY (${entry.lastPingLatencyMs}ms)`
                              : health.replace('_', ' ')}
                          </span>

                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FAF9F5] border border-[#E6E5DE] text-[#68665E]">
                            {entry.category.toUpperCase()}
                          </span>
                        </div>

                        {entry.baseUrl && (
                          <p className="text-[11px] font-mono text-[#68665E] mt-0.5 truncate max-w-md">
                            {entry.baseUrl}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center space-x-2">
                      {/* Re-probe Button */}
                      <button
                        onClick={() => handleReProbeVaultKey(entry)}
                        disabled={isTesting}
                        className="px-3 py-1.5 rounded-xl bg-[#FAF9F5] border border-[#E6E5DE] hover:border-[#1C1B18] text-xs font-mono text-[#1C1B18] flex items-center space-x-1.5 transition cursor-pointer"
                        title="Re-probe endpoint & test health"
                      >
                        {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                        <span>{isTesting ? 'Pinging...' : 'Probe'}</span>
                      </button>

                      {/* Enable/Disable Toggle */}
                      <button
                        onClick={() => handleToggleEnable(entry.id)}
                        className={`text-xs font-mono px-2.5 py-1.5 rounded-xl border transition ${
                          entry.enabled
                            ? 'bg-[#1C1B18] text-white border-[#1C1B18]'
                            : 'bg-[#FAF9F5] text-[#68665E] border-[#E6E5DE]'
                        }`}
                      >
                        {entry.enabled ? 'Enabled' : 'Disabled'}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="p-2 rounded-xl text-[#9E9C92] hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Delete from Firestore Vault"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Masked Key Display & Model Selection Bar */}
                  <div className="mt-4 pt-3 border-t border-[#E6E5DE] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                    <div className="flex items-center space-x-2">
                      <span className="text-[#9E9C92]">Key:</span>
                      <span className="font-semibold text-[#1C1B18]">
                        {isRevealed ? entry.apiKey : (entry.maskedKey || maskApiKey(entry.apiKey))}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleShowKey(entry.id)}
                        className="p-1 text-[#9E9C92] hover:text-[#1C1B18] transition"
                        title={isRevealed ? "Mask secret" : "Reveal secret"}
                      >
                        {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Discovered / Selected Model */}
                    <div className="flex items-center space-x-2">
                      <span className="text-[#9E9C92]">Model:</span>
                      {entry.availableModels && entry.availableModels.length > 0 ? (
                        <select
                          value={entry.modelId || entry.availableModels[0]}
                          onChange={(e) => handleSelectModel(entry.id, e.target.value)}
                          className="bg-[#FAF9F5] border border-[#E6E5DE] rounded-lg px-2 py-1 text-xs text-[#1C1B18] outline-none cursor-pointer"
                        >
                          {entry.availableModels.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-[#1C1B18] font-semibold">
                          {entry.modelId || 'default'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Test Result Feedback */}
                  {testRes && (
                    <div className={`mt-3 p-2.5 rounded-xl border text-[11px] font-mono flex items-center space-x-2 ${
                      testRes.valid ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}>
                      {testRes.valid ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-700" />}
                      <span>{testRes.message} {testRes.latency ? `(${testRes.latency}ms)` : ''}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default ApiKeysPage;
