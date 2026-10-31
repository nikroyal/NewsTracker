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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-mono uppercase tracking-wider text-[#68665E] flex items-center space-x-1.5 font-semibold">
          <Terminal className="w-3.5 h-3.5 text-[#1C1B18]" />
          <span>Synthesis Prompt & Research Lens</span>
        </label>

        {/* Preset Selector */}
        <div className="flex items-center space-x-2">
          {prompt.trim() && (
            <button
              onClick={() => setShowSaveModal(true)}
              className="text-[11px] font-mono text-[#68665E] hover:text-[#1C1B18] flex items-center space-x-1 transition"
              title="Save this prompt as a preset in Firestore"
            >
              <Bookmark className="w-3 h-3" />
              <span>Save Preset</span>
            </button>
          )}

          {prompt && (
            <button
              onClick={() => onChange('')}
              className="text-[11px] font-mono text-[#9E9C92] hover:text-rose-600 transition"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Textarea Input */}
      <div className="relative">
        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Focus on recent earnings calls, GPU supply constraints, antitrust regulatory scrutiny, and cross-company customer agreements..."
          className="w-full bg-[#FAF9F5] border border-[#E6E5DE] focus:border-[#1C1B18] focus:bg-[#FFFFFF] rounded-xl p-3 text-xs text-[#1C1B18] placeholder-[#9E9C92] focus:outline-none transition-all leading-relaxed font-mono resize-y"
        />
      </div>

      {/* Presets Chips */}
      {presets.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-mono text-[#9E9C92] mr-1">Presets:</span>
          {presets.map((p) => (
            <div
              key={p.id}
              className="inline-flex items-center rounded-lg bg-[#FAF9F5] border border-[#E6E5DE] hover:border-[#1C1B18] text-[11px] font-mono text-[#1C1B18] transition group shadow-xs"
            >
              <button
                type="button"
                onClick={() => handleSelectPreset(p)}
                className="px-2.5 py-1 text-left hover:text-[#1C1B18]"
                title={p.content}
              >
                {p.name}
              </button>
              <button
                type="button"
                onClick={() => onDeletePreset(p.id)}
                className="pr-1.5 pl-0.5 py-1 text-[#9E9C92] hover:text-rose-600 transition"
                title="Delete preset"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Save Preset Inline Box */}
      {showSaveModal && (
        <div className="p-3 bg-[#FFFFFF] border border-[#D5D4CC] rounded-xl flex items-center space-x-2 animate-fadeIn text-xs shadow-sm">
          <input
            type="text"
            value={presetTitle}
            onChange={(e) => setPresetTitle(e.target.value)}
            placeholder="Preset Name (e.g. Earnings & Guidance Lens)"
            className="flex-1 bg-[#FAF9F5] border border-[#E6E5DE] rounded-lg px-3 py-1.5 text-[#1C1B18] font-mono focus:outline-none focus:border-[#1C1B18]"
            autoFocus
          />
          <button
            onClick={handleSave}
            disabled={!presetTitle.trim()}
            className="px-3.5 py-1.5 rounded-lg bg-[#1C1B18] hover:bg-[#2D2D2D] text-white font-medium flex items-center space-x-1 disabled:opacity-40"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save to Cloud</span>
          </button>
          <button
            onClick={() => setShowSaveModal(false)}
            className="px-2.5 py-1.5 rounded-lg text-[#68665E] hover:text-[#1C1B18]"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
