import React, { useState } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  MessageSquare, 
  Cpu, 
  FileDown, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  X,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface OnboardingTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFinishTour: () => void;
  onNavigateToTab: (tab: any) => void;
}

export const OnboardingTourModal: React.FC<OnboardingTourModalProps> = ({
  isOpen,
  onClose,
  onFinishTour,
  onNavigateToTab,
}) => {
  const [slide, setSlide] = useState(0);

  if (!isOpen) return null;

  const slides = [
    {
      title: 'Welcome to NewsTracker Financial OS',
      subtitle: 'Your Personal Wall-Street Grade Intelligence Command Center',
      icon: <Sparkles className="w-8 h-8 text-amber-600" />,
      desc: 'NewsTracker is an institutional-grade single-user platform combining real-time global equities, automated company news scraping, quantitative financial ratio modeling (DuPont, Altman Z), and multi-provider AI synthesis.',
      highlights: [
        'Pure edge architecture running on Cloudflare Workers and Google Firebase Spark.',
        'Zero hardcoded data: all market quotes, ratios, and quotas are dynamically measured.',
        'Universal custom AI support: connect Gemini, OpenRouter, Anthropic, or local Ollama/vLLM.',
        'Deterministic SHA-256 edge response caching cuts redundant LLM calls and API spend.',
      ],
      tabTarget: 'tracker',
      ctaLabel: 'Get Started',
    },
    {
      title: 'Real-Time Stocks & Watchlist Ledger',
      subtitle: 'Track US (NASDAQ, NYSE) and Indian (NSE, BSE) Equities',
      icon: <TrendingUp className="w-8 h-8 text-emerald-600" />,
      desc: 'Monitor your portfolio holdings and target equities with live tick prices, directional movement pills, market caps, trailing P/E multiples, and 52-week trading ranges powered by our Master Market API.',
      highlights: [
        'Instant symbol autocompletion across US & Indian exchanges.',
        'Click any stock to inspect its 3-Stage DuPont ROE decomposition and Altman Z distress rating.',
        'Pre-loaded sample mega-caps (Apple, NVIDIA, Microsoft, Reliance, TCS, HDFC Bank).',
      ],
      tabTarget: 'stocks',
      ctaLabel: 'Explore Watchlist',
    },
    {
      title: 'Interactive AI Financial Copilot',
      subtitle: 'Conversational Research Analyst Grounded in Live Fundamentals',
      icon: <MessageSquare className="w-8 h-8 text-sky-600" />,
      desc: 'Chat with an elite Wall Street research copilot. Unlike generic chat assistants, our Copilot is injected with real-time balance sheet metrics and financial ratios for your tracked stocks.',
      highlights: [
        'One-click starter prompt chips (investability analysis, bull/bear cases, debt audits).',
        'Built-in markdown rendering for financial tables and bullet breakdowns.',
        'Export full conversation transcripts to text or executive PDF reports.',
      ],
      tabTarget: 'copilot',
      ctaLabel: 'Try Copilot',
    },
    {
      title: 'Model Orchestrator & Edge Gateway',
      subtitle: 'Resilient Multi-Provider Failover & Telemetry',
      icon: <Cpu className="w-8 h-8 text-purple-600" />,
      desc: 'Never get blocked by rate limits or upstream provider outages. Our Model Orchestrator provides automatic failover cascades, active cooldown protection, and sub-cent financial cost tracking.',
      highlights: [
        'Dynamic provider registration with zero code edits required.',
        'Resilient JSON sanitization and truncation auto-repair.',
        'Live usage meter tracking remaining token quotas and cost savings.',
      ],
      tabTarget: 'orchestrator',
      ctaLabel: 'View Orchestrator',
    },
  ];

  const current = slides[slide];

  const handleNext = () => {
    if (slide < slides.length - 1) {
      setSlide(slide + 1);
    } else {
      onFinishTour();
      onClose();
    }
  };

  const handlePrev = () => {
    if (slide > 0) {
      setSlide(slide - 1);
    }
  };

  const handleJumpToTab = (tab: string) => {
    onNavigateToTab(tab);
    onFinishTour();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1B18]/50 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-2xl bg-[#FFFFFF] border border-[#E6E5DE] rounded-3xl shadow-2xl overflow-hidden animate-scaleUp">
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E6E5DE] bg-[#FAF9F5]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#68665E]">
              Guided Tour • Step {slide + 1} of {slides.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-[#9E9C92] hover:text-[#1C1B18] hover:bg-[#E6E5DE]/40 transition cursor-pointer"
            title="Dismiss Tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#E6E5DE] flex-shrink-0">
              {current.icon}
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-serif font-bold text-[#1C1B18]">
                {current.title}
              </h2>
              <p className="text-xs font-mono text-[#68665E]">
                {current.subtitle}
              </p>
            </div>
          </div>

          <p className="text-sm text-[#383733] leading-relaxed font-sans">
            {current.desc}
          </p>

          <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E6E5DE] space-y-2.5">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#68665E] block">
              Key Capabilities:
            </span>
            <ul className="space-y-2">
              {current.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[#1C1B18]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between px-8 py-5 border-t border-[#E6E5DE] bg-[#FAF9F5]">
          <div className="flex items-center gap-1.5">
            {slides.map((_, i) => (
              <span
                key={i}
                onClick={() => setSlide(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                  slide === i ? 'bg-[#1C1B18] w-6' : 'bg-[#E6E5DE] hover:bg-[#9E9C92]'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            {slide > 0 && (
              <button
                onClick={handlePrev}
                className="px-4 py-2 rounded-xl text-xs font-mono text-[#68665E] hover:text-[#1C1B18] hover:bg-[#FFFFFF] border border-[#E6E5DE] transition cursor-pointer flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Previous
              </button>
            )}

            <button
              onClick={() => handleJumpToTab(current.tabTarget)}
              className="px-4 py-2 rounded-xl text-xs font-mono text-[#68665E] hover:text-[#1C1B18] hover:bg-[#FFFFFF] border border-[#E6E5DE] transition cursor-pointer"
            >
              {current.ctaLabel}
            </button>

            <button
              onClick={handleNext}
              className="px-5 py-2 rounded-xl text-xs font-mono font-medium text-white bg-[#1C1B18] hover:bg-[#2D2D2D] transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <span>{slide === slides.length - 1 ? 'Finish Tour' : 'Next'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
