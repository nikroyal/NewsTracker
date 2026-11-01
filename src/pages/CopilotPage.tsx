import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Sparkles, 
  MessageSquare, 
  Trash2, 
  Download, 
  TrendingUp, 
  ShieldCheck, 
  Cpu, 
  Coins, 
  Clock, 
  ExternalLink,
  Zap,
  CornerDownLeft
} from 'lucide-react';
import { CopilotMessage, TrackedStock } from '../types/business-os';
import { queryCopilotChat } from '../lib/api-client';
import { loadTrackedStocks, loadCopilotSessions, saveCopilotSession } from '../lib/firestore-service';
import { ProvenanceBadge } from '../components/common/ProvenanceBadge';

const PROMPT_SUGGESTIONS = [
  {
    title: 'Assess Valuation & Moat',
    prompt: 'Evaluate the current valuation multiples and competitive moat for Apple and Microsoft. Walk me through the bull vs bear thesis.',
    icon: '🏛️',
  },
  {
    title: 'Altman Z & Solvency Audit',
    prompt: 'Examine the balance sheet solvency, debt-to-equity ratios, and Altman Z-Score distress zones across my tracked portfolio equities.',
    icon: '🛡️',
  },
  {
    title: 'DuPont ROE Comparison',
    prompt: 'Compare the 3-Stage DuPont Return on Equity (Net Margin × Asset Turnover × Leverage) for Nvidia vs TSMC. Which company is allocating capital more efficiently?',
    icon: '⚡',
  },
  {
    title: 'Macro Regime & Fed Outlook',
    prompt: 'What are the key macroeconomic cross-currents right now between US interest rates, inflation indicators, and international Indian equity flows?',
    icon: '🌐',
  },
];

export const CopilotPage: React.FC = () => {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Welcome to your **Financial Research Copilot**. I am directly wired into your Master Market API and Model Orchestrator. Ask me anything about stock valuations, DuPont ROE decompositions, Altman Z solvency ratings, or strategic company developments.',
      timestamp: new Date().toISOString(),
      modelUsed: 'gemini-2.0-flash',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [trackedStocks, setTrackedStocks] = useState<TrackedStock[]>([]);
  const [selectedContextStocks, setSelectedContextStocks] = useState<string[]>(['AAPL', 'NVDA', 'MSFT']);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTrackedStocks().then(stocks => {
      setTrackedStocks(stocks);
      if (stocks.length > 0) {
        setSelectedContextStocks(stocks.slice(0, 4).map(s => s.ticker));
      }
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const queryText = (textToSend || input).trim();
    if (!queryText || loading) return;

    const userMsg: CopilotMessage = {
      id: 'msg_' + Date.now().toString(36),
      role: 'user',
      content: queryText,
      timestamp: new Date().toISOString(),
    };

    const newThread = [...messages, userMsg];
    setMessages(newThread);
    setInput('');
    setLoading(true);

    try {
      const history = newThread.slice(-6).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const contextStocksList = trackedStocks.filter(s => selectedContextStocks.includes(s.ticker));

      const res = await queryCopilotChat({
        message: queryText,
        history,
        contextStocks: contextStocksList,
      });

      const assistantMsg: CopilotMessage = {
        id: 'msg_' + (Date.now() + 1).toString(36),
        role: 'assistant',
        content: res.content,
        timestamp: res.timestamp,
        modelUsed: res.modelUsed,
        cached: res.cached,
        costSavedUsd: res.costSavedUsd,
        financialMetricsSnapshot: res.financialMetricsSnapshot,
      };

      setMessages([...newThread, assistantMsg]);
    } catch (err: any) {
      const errorMsg: CopilotMessage = {
        id: 'msg_err_' + Date.now().toString(36),
        role: 'assistant',
        content: `**Error:** ${err.message || 'Failed to complete financial copilot analysis.'} Please check your AI API keys or connection settings.`,
        timestamp: new Date().toISOString(),
      };
      setMessages([...newThread, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const toggleStockContext = (ticker: string) => {
    if (selectedContextStocks.includes(ticker)) {
      setSelectedContextStocks(selectedContextStocks.filter(t => t !== ticker));
    } else {
      setSelectedContextStocks([...selectedContextStocks, ticker]);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Conversation history reset. What financial analysis would you like to investigate next?',
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const handleExportChat = () => {
    const transcript = messages
      .map(m => `[${m.role.toUpperCase()} - ${new Date(m.timestamp).toLocaleTimeString()}]\n${m.content}\n`)
      .join('\n---\n\n');

    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `copilot_transcript_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Inline formatting helper
  const renderFormattedContent = (content: string) => {
    // Basic markdown formatting
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="font-serif font-bold text-base text-[#1C1B18] mt-3 mb-1">{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={idx} className="font-serif font-bold text-lg text-[#1C1B18] mt-4 mb-2">{line.replace('## ', '')}</h2>;
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const itemText = line.substring(2);
        return (
          <li key={idx} className="ml-4 list-disc text-xs text-[#2D2C28] leading-relaxed my-0.5">
            {formatBold(itemText)}
          </li>
        );
      }
      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }
      return <p key={idx} className="text-xs text-[#2D2C28] leading-relaxed">{formatBold(line)}</p>;
    });
  };

  const formatBold = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-[#1C1B18]">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 bg-[#FFFFFF] border border-[#E6E5DE] rounded-3xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-amber-600" />
            <h1 className="text-xl font-serif font-bold text-[#1C1B18]">
              AI Financial Research Copilot
            </h1>
          </div>
          <p className="text-xs font-mono text-[#68665E]">
            Interactive strategist injected with real-time Master Market API fundamentals & balance sheets
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ProvenanceBadge
            category="AI Commentary"
            source="Master Market Model Orchestrator"
            confidence="High"
          />
          <button
            onClick={handleExportChat}
            className="px-3 py-1.5 rounded-xl bg-[#FAF9F5] hover:bg-[#FFFFFF] border border-[#E6E5DE] text-xs font-mono text-[#1C1B18] flex items-center gap-1.5 transition cursor-pointer"
            title="Download Transcript"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
          <button
            onClick={handleClear}
            className="p-1.5 rounded-xl text-[#9E9C92] hover:text-rose-600 hover:bg-[#FAF9F5] transition cursor-pointer"
            title="Clear Chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grounding Context Selector */}
      {trackedStocks.length > 0 && (
        <div className="p-3.5 bg-[#FFFFFF] border border-[#E6E5DE] rounded-2xl shadow-xs flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="text-[#9E9C92] text-[11px] uppercase tracking-wider font-semibold">
            Injected Equities:
          </span>
          {trackedStocks.map(s => {
            const isSelected = selectedContextStocks.includes(s.ticker);
            return (
              <button
                key={s.id}
                onClick={() => toggleStockContext(s.ticker)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-mono transition cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#1C1B18] text-white font-medium shadow-2xs'
                    : 'bg-[#FAF9F5] text-[#68665E] border border-[#E6E5DE] hover:border-[#1C1B18]'
                }`}
              >
                <span>{s.ticker}</span>
                {s.livePrice && <span className="opacity-70 text-[10px]">${s.livePrice}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Chat Thread Panel */}
      <div className="bg-[#FFFFFF] border border-[#E6E5DE] rounded-3xl shadow-sm p-6 min-h-[450px] max-h-[600px] overflow-y-auto space-y-4">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} space-y-1.5 animate-fadeIn`}
          >
            <div className="flex items-center gap-2 text-[10px] font-mono text-[#9E9C92]">
              <span>{msg.role === 'user' ? 'You' : 'Copilot'}</span>
              <span>•</span>
              <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              {msg.cached && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                  <Zap className="w-2.5 h-2.5" /> Edge Cache {msg.costSavedUsd ? `(Saved $${msg.costSavedUsd.toFixed(4)})` : ''}
                </span>
              )}
              {msg.modelUsed && (
                <span className="text-[#9E9C92]">[{msg.modelUsed}]</span>
              )}
            </div>

            <div
              className={`max-w-2xl p-4 rounded-2xl ${
                msg.role === 'user'
                  ? 'bg-[#1C1B18] text-white rounded-br-xs text-xs font-sans leading-relaxed'
                  : 'bg-[#FAF9F5] border border-[#E6E5DE] text-[#1C1B18] rounded-bl-xs shadow-2xs space-y-2'
              }`}
            >
              {msg.role === 'user' ? (
                <p>{msg.content}</p>
              ) : (
                renderFormattedContent(msg.content)
              )}

              {/* Financial Snapshot Badges if present */}
              {msg.financialMetricsSnapshot && msg.financialMetricsSnapshot.length > 0 && (
                <div className="pt-2 border-t border-[#E6E5DE] flex flex-wrap gap-2">
                  {msg.financialMetricsSnapshot.map((s, idx) => (
                    <div
                      key={idx}
                      className="px-2 py-1 rounded bg-[#FFFFFF] border border-[#E6E5DE] text-[10px] font-mono flex items-center gap-1.5"
                    >
                      <span className="font-bold text-[#1C1B18]">{s.ticker}:</span>
                      <span className="text-emerald-700">{s.price}</span>
                      {s.peRatio && <span className="text-[#68665E]">(P/E {s.peRatio})</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 p-4 rounded-2xl bg-[#FAF9F5] border border-[#E6E5DE] text-xs font-mono text-[#68665E] w-fit animate-pulse">
            <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
            <span>Formulating financial analysis with live Master API data...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Prompt Suggestions Carousel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
        {PROMPT_SUGGESTIONS.map((item, i) => (
          <button
            key={i}
            onClick={() => handleSend(item.prompt)}
            className="p-3 rounded-2xl bg-[#FFFFFF] hover:bg-[#FAF9F5] border border-[#E6E5DE] hover:border-[#1C1B18] transition text-left space-y-1 cursor-pointer shadow-2xs group"
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#1C1B18]">
              <span>{item.icon}</span>
              <span>{item.title}</span>
            </div>
            <p className="text-[11px] text-[#68665E] line-clamp-2 leading-tight">
              {item.prompt}
            </p>
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-3 bg-[#FFFFFF] border border-[#E6E5DE] rounded-3xl shadow-sm flex items-center gap-2">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask Copilot about valuations, debt ratios, earnings, or market catalysts... (Enter to send)"
          rows={1}
          className="flex-1 bg-transparent px-3 py-2 text-xs font-sans text-[#1C1B18] placeholder-[#9E9C92] resize-none focus:outline-hidden"
        />

        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          className="px-4 py-2.5 bg-[#1C1B18] hover:bg-[#2D2D2D] text-white rounded-2xl text-xs font-mono transition cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shadow-xs"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
