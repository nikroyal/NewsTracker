import React, { useState } from 'react';
import { Terminal, Bookmark, Save, Trash2, Check, Sparkles } from 'lucide-react';
import { PromptPreset } from '../../lib/firestore-service';

interface PromptStudioProps {
  prompt: string;
  onChange: (prompt: string) => void;
  presets: PromptPreset[];
  onSavePreset: (preset: PromptPreset) => void;
  onDeletePreset: (id: string) => void;
}

export const PromptStudio: React.FC<PromptStudioProps> = ({
  prompt,
  onChange,
  presets,
  onSavePreset,
  onDeletePreset,
}) => {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [presetTitle, setPresetTitle] = useState('');

  const handleSelectPreset = (p: PromptPreset) => {
    onChange(p.content);
  };

  const handleSave = () => {
    if (!presetTitle.trim() || !prompt.trim()) return;
    const newPreset: PromptPreset = {
      id: 'preset_' + Date.now().toString(36),
      name: presetTitle.trim(),
      content: prompt.trim(),
      updatedAt: new Date().toISOString(),
    };
    onSavePreset(newPreset);
    setPresetTitle('');
    setShowSaveModal(false);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
          <span>Synthesis Prompt & Research Lens</span>
        </label>

        {/* Preset Selector */}
        <div className="flex items-center space-x-2">
          {prompt.trim() && (
            <button
              onClick={() => setShowSaveModal(true)}
              className="text-[11px] font-mono text-slate-400 hover:text-indigo-400 flex items-center space-x-1 transition"
              title="Save this prompt as a preset for future sessions"
            >
              <Bookmark className="w-3 h-3" />
              <span>Save as Preset</span>
            </button>
          )}

          {prompt && (
            <button
              onClick={() => onChange('')}
              className="text-[11px] font-mono text-slate-500 hover:text-rose-400 transition"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Preset Pills */}
      {presets.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] text-slate-500 font-mono flex items-center space-x-1 flex-shrink-0">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>Templates:</span>
          </span>
          {presets.map(p => (
            <div
              key={p.id}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 hover:border-slate-700 hover:text-white transition group flex-shrink-0 cursor-pointer"
              onClick={() => handleSelectPreset(p)}
            >
              <span className="font-mono truncate max-w-[150px]">{p.name}</span>
              {p.id.startsWith('preset_custom') && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePreset(p.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-0.5"
                  title="Delete preset"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Prompt Textarea */}
      <div className="relative">
        <textarea
          value={prompt}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder="E.g., Highlight Q3/Q4 earnings surprises, patent litigation, supply chain headwinds, and regulatory antitrust developments..."
          className="w-full bg-slate-900/60 border border-slate-800 focus:border-indigo-500/80 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none font-mono resize-none transition-all leading-relaxed"
        />
      </div>

      {/* Save Modal Inline */}
      {showSaveModal && (
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center space-x-2 animate-fadeIn text-xs">
          <input
            type="text"
            value={presetTitle}
            onChange={(e) => setPresetTitle(e.target.value)}
            placeholder="Preset Name (e.g. Risk & Antitrust Audit)"
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-indigo-500"
            autoFocus
          />
          <button
            onClick={handleSave}
            disabled={!presetTitle.trim()}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center space-x-1 disabled:opacity-40"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save Preset</span>
          </button>
          <button
            onClick={() => setShowSaveModal(false)}
            className="px-2 py-1.5 rounded-lg text-slate-400 hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
