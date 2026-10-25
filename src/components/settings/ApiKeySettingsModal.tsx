import React, { useState } from 'react';
import { X, Key, CheckCircle2, AlertTriangle, Loader2, ExternalLink, Shield } from 'lucide-react';
import { testEndpointConnection } from '../../lib/api-client';

interface ApiKeySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKeys: Record<string, string>;
  onSaveKeys: (keys: Record<string, string>) => void;
}

interface ProviderField {
  id: string;
  label: string;
  placeholder: string;
  docUrl: string;
  category: 'ai' | 'data';
}

const PROVIDERS: ProviderField[] = [
  {
    id: 'gemini',
    label: 'Google Gemini API Key',
    placeholder: 'AIzaSy...',
    docUrl: 'https://aistudio.google.com/app/apikey',
    category: 'ai',
  },
  {
    id: 'openai',
    label: 'OpenAI API Key',
    placeholder: 'sk-proj-...',
    docUrl: 'https://platform.openai.com/api-keys',
    category: 'ai',
  },
  {
    id: 'groq',
    label: 'Groq Cloud API Key',
    placeholder: 'gsk_...',
    docUrl: 'https://console.groq.com/keys',
    category: 'ai',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter API Key',
    placeholder: 'sk-or-v1-...',
    docUrl: 'https://openrouter.ai/keys',
    category: 'ai',
  },
  {
    id: 'finnhub',
    label: 'Finnhub Financial News Key',
    placeholder: 'c...',
    docUrl: 'https://finnhub.io/register',
    category: 'data',
  },
];

export const ApiKeySettingsModal: React.FC<ApiKeySettingsModalProps> = ({
  isOpen,
  onClose,
  apiKeys,
  onSaveKeys,
}) => {
  const [keys, setKeys] = useState<Record<string, string>>({ ...apiKeys });
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { valid: boolean; message: string; latency?: number }>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleChange = (id: string, value: string) => {
    setKeys(prev => ({ ...prev, [id]: value }));
    // Clear test result on change
    setTestResults(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const handleTestKey = async (providerId: string) => {
    const key = keys[providerId];
    if (!key || !key.trim()) {
      setTestResults(prev => ({
        ...prev,
        [providerId]: { valid: false, message: 'Please enter a key first' },
      }));
      return;
    }

    setTestingId(providerId);
    const res = await testEndpointConnection({ providerId, apiKey: key.trim() });
    setTestingId(null);

    setTestResults(prev => ({
      ...prev,
      [providerId]: {
        valid: res.valid,
        message: res.message || (res.valid ? 'Active & Verified' : 'Connection failed'),
        latency: res.latencyMs,
      },
    }));
  };

  const handleSave = () => {
    onSaveKeys(keys);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Key className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">In-UI API Key Manager</h2>
              <p className="text-xs text-slate-400">Configure keys directly with zero deployment redeployments</p>
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
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/80 flex items-start space-x-3 text-xs text-slate-400">
            <Shield className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-300 font-medium">Single-User Secure Architecture:</span> Keys entered here are sent directly to the Cloudflare Edge Worker for synthesis or stored in your authenticated Firestore record. No external party can access them.
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
              AI Providers & Data Keys
            </h3>

            {PROVIDERS.map((provider) => {
              const test = testResults[provider.id];
              const isTesting = testingId === provider.id;

              return (
                <div key={provider.id} className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-200 flex items-center space-x-1.5">
                      <span>{provider.label}</span>
                      <a
                        href={provider.docUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-500 hover:text-indigo-400 transition"
                        title="Get API key"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </label>

                    {test && (
                      <div className={`flex items-center space-x-1 text-xs font-mono ${test.valid ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {test.valid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                        <span>{test.message} {test.latency ? `(${test.latency}ms)` : ''}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="password"
                      value={keys[provider.id] || ''}
                      onChange={(e) => handleChange(provider.id, e.target.value)}
                      placeholder={provider.placeholder}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 font-mono focus:outline-none focus:border-indigo-500 transition"
                    />

                    <button
                      type="button"
                      onClick={() => handleTestKey(provider.id)}
                      disabled={isTesting || !keys[provider.id]}
                      className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-medium text-slate-300 flex items-center space-x-1 transition flex-shrink-0"
                    >
                      {isTesting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                          <span>Pinging...</span>
                        </>
                      ) : (
                        <span>Test Ping</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/50">
          <p className="text-xs text-slate-500 font-mono">
            {saveSuccess ? 'Saved successfully!' : 'Changes apply immediately to upcoming runs'}
          </p>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition flex items-center space-x-1.5"
            >
              {saveSuccess ? <CheckCircle2 className="w-4 h-4" /> : null}
              <span>{saveSuccess ? 'Saved!' : 'Save & Persist Keys'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
