import React, { useState } from 'react';
import { X, Cpu, Plus, CheckCircle2, AlertCircle, Loader2, Trash2, Globe, ShieldAlert } from 'lucide-react';
import { AIProviderConfig } from '../../types/ai';
import { testEndpointConnection } from '../../lib/api-client';

interface ModelOrchestratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeModelId: string;
  onSelectActiveModel: (id: string) => void;
  customModels: AIProviderConfig[];
  onSaveCustomModels: (models: AIProviderConfig[]) => void;
}

export const ModelOrchestratorModal: React.FC<ModelOrchestratorModalProps> = ({
  isOpen,
  onClose,
  activeModelId,
  onSelectActiveModel,
  customModels,
  onSaveCustomModels,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [defaultModel, setDefaultModel] = useState('');
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<{ valid: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const standardModels = [
    { id: 'gemini', name: 'Google Gemini', model: 'gemini-2.0-flash', desc: 'Ultra-fast, deep multimodal context, 15 RPM free tier' },
    { id: 'openai', name: 'OpenAI', model: 'gpt-4o-mini', desc: 'Industry-standard structured output engine' },
    { id: 'groq', name: 'Groq Cloud', model: 'llama-3.3-70b-versatile', desc: 'High-speed 500+ tokens/sec LPUs' },
    { id: 'openrouter', name: 'OpenRouter', model: 'anthropic/claude-3.5-sonnet', desc: 'Universal access to 100+ state-of-the-art models' },
  ];

  const handleTestNewEndpoint = async () => {
    if (!baseUrl.trim() || !defaultModel.trim()) {
      setTestStatus({ valid: false, message: 'Base URL and Model ID are required.' });
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
      message: res.message || (res.valid ? `Endpoint Verified (${res.latencyMs}ms)` : 'Connection failed'),
    });
  };

  const handleCreateNewApi = () => {
    if (!name.trim() || !baseUrl.trim() || !defaultModel.trim()) return;

    const newProvider: AIProviderConfig = {
      id: 'custom_' + Date.now().toString(36),
      name: name.trim(),
      protocol: 'openai-compatible',
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim() || undefined,
      defaultModel: defaultModel.trim(),
      enabled: true,
      isCustom: true,
    };

    const updated = [...customModels, newProvider];
    onSaveCustomModels(updated);
    onSelectActiveModel(newProvider.id);

    // Reset form
    setName('');
    setBaseUrl('');
    setApiKey('');
    setDefaultModel('');
    setTestStatus(null);
    setShowAddForm(false);
  };

  const handleDeleteCustom = (id: string) => {
    const updated = customModels.filter(m => m.id !== id);
    onSaveCustomModels(updated);
    if (activeModelId === id) {
      onSelectActiveModel('gemini');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Model Orchestrator</h2>
              <p className="text-xs text-slate-400">Dynamic routing, failover, and custom AI API ingestion</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Active Model Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Primary Model Engine
              </h3>
              <button
                onClick={() => setShowAddForm(prev => !prev)}
                className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom AI API</span>
              </button>
            </div>

            {/* Standard Models */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {standardModels.map(m => {
                const isActive = activeModelId === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => onSelectActiveModel(m.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isActive
                        ? 'bg-indigo-600/10 border-indigo-500/80 shadow-md shadow-indigo-500/5'
                        : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-semibold text-white">{m.name}</span>
                        <p className="text-[11px] font-mono text-indigo-400 mt-0.5">{m.model}</p>
                      </div>
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        isActive ? 'border-indigo-400 bg-indigo-500' : 'border-slate-700'
                      }`}>
                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">{m.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* Custom Models List */}
            {customModels.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider">Custom Registered APIs</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {customModels.map(cm => {
                    const isActive = activeModelId === cm.id;
                    return (
                      <div
                        key={cm.id}
                        onClick={() => onSelectActiveModel(cm.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isActive
                            ? 'bg-amber-500/10 border-amber-500/80 shadow-md shadow-amber-500/5'
                            : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs font-semibold text-white">{cm.name}</span>
                            <p className="text-[11px] font-mono text-amber-400 mt-0.5">{cm.defaultModel}</p>
                            <p className="text-[10px] text-slate-500 truncate max-w-[200px] mt-1">{cm.baseUrl}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCustom(cm.id);
                              }}
                              className="text-slate-500 hover:text-rose-400 transition"
                              title="Delete API"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                              isActive ? 'border-amber-400 bg-amber-500' : 'border-slate-700'
                            }`}>
                              {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Add New Custom Model Drawer / Form */}
          {showAddForm && (
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-white flex items-center space-x-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Register Any New AI API Endpoint</span>
                </h4>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Provider Label</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. DeepSeek-V3 or Local Ollama"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Model Identifier</label>
                  <input
                    type="text"
                    value={defaultModel}
                    onChange={(e) => setDefaultModel(e.target.value)}
                    placeholder="e.g. deepseek-chat or llama3.3"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[11px] text-slate-400 block mb-1">API Base URL</label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="e.g. https://api.deepseek.com/v1 or http://localhost:11434/v1"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[11px] text-slate-400 block mb-1">API Key / Token (Optional for local)</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {testStatus && (
                <div className={`p-2.5 rounded-lg text-xs font-mono flex items-center space-x-1.5 ${
                  testStatus.valid ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  {testStatus.valid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  <span>{testStatus.message}</span>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={handleTestNewEndpoint}
                  disabled={testing || !baseUrl}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 flex items-center space-x-1"
                >
                  {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Test Connection</span>
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewApi}
                  disabled={!name || !baseUrl || !defaultModel}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-medium text-white transition"
                >
                  Register API
                </button>
              </div>
            </div>
          )}

          {/* Failover Policy Info */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-start space-x-2.5 text-xs text-slate-400">
            <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-300 font-medium">Automatic Failover Active:</span> If your selected primary model hits rate limits (HTTP 429), timeouts, or quota exhaustion, the Model Orchestrator automatically cascades to the next configured provider without interrupting your session.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-800 bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
