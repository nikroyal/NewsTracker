import React, { useState } from 'react';
import { 
  CheckSquare, 
  Square, 
  Sparkles, 
  ArrowRight, 
  Briefcase, 
  TrendingUp, 
  MessageSquare, 
  FileDown, 
  ChevronDown, 
  ChevronUp, 
  X,
  Building2 
} from 'lucide-react';
import { OnboardingProgress } from '../../types/business-os';

interface OnboardingChecklistWidgetProps {
  progress: OnboardingProgress;
  onUpdateProgress: (updated: OnboardingProgress) => void;
  onNavigateToTab: (tab: any) => void;
  onOpenTour: () => void;
  stocksCount: number;
  hasRunSynthesis: boolean;
}

export const OnboardingChecklistWidget: React.FC<OnboardingChecklistWidgetProps> = ({
  progress,
  onUpdateProgress,
  onNavigateToTab,
  onOpenTour,
  stocksCount,
  hasRunSynthesis,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (progress.checklistDismissed) {
    return null;
  }

  const tasks = [
    {
      id: 'step_stock',
      label: 'Track equities on the Stocks & Watchlist Ledger',
      completed: stocksCount > 0,
      actionText: 'View Stocks',
      tab: 'stocks',
      icon: <TrendingUp className="w-3.5 h-3.5" />,
    },
    {
      id: 'step_intelligence',
      label: 'Inspect multi-year financial statements & SEC filings',
      completed: progress.completedTasks.includes('step_intelligence'),
      actionText: 'Open Intel Hub',
      tab: 'intelligence',
      icon: <Building2 className="w-3.5 h-3.5" />,
    },
    {
      id: 'step_master_api',
      label: 'Inspect live telemetry on the Master Market API page',
      completed: progress.completedTasks.includes('step_master_api'),
      actionText: 'Inspect API',
      tab: 'masterapi',
      icon: <Sparkles className="w-3.5 h-3.5" />,
    },
    {
      id: 'step_copilot',
      label: 'Ask a financial question to the AI Copilot',
      completed: progress.completedTasks.includes('step_copilot'),
      actionText: 'Launch Copilot',
      tab: 'copilot',
      icon: <MessageSquare className="w-3.5 h-3.5" />,
    },
    {
      id: 'step_synthesis',
      label: 'Run a company news & financial health synthesis',
      completed: hasRunSynthesis || progress.completedTasks.includes('step_synthesis'),
      actionText: 'Run Tracker',
      tab: 'tracker',
      icon: <Briefcase className="w-3.5 h-3.5" />,
    },
  ];

  const completedCount = tasks.filter(t => t.completed).length;
  const percentComplete = Math.round((completedCount / tasks.length) * 100);

  const handleDismiss = () => {
    onUpdateProgress({
      ...progress,
      checklistDismissed: true,
      lastDismissedAt: new Date().toISOString(),
    });
  };

  const handleActionClick = (task: typeof tasks[number]) => {
    if (!progress.completedTasks.includes(task.id)) {
      onUpdateProgress({
        ...progress,
        completedTasks: [...progress.completedTasks, task.id],
      });
    }
    onNavigateToTab(task.tab);
  };

  return (
    <div className="mb-6 bg-[#FFFFFF] border border-[#E6E5DE] rounded-2xl shadow-xs overflow-hidden transition-all animate-fadeIn">
      {/* Header Bar */}
      <div className="px-5 py-3.5 flex items-center justify-between bg-[#FAF9F5] border-b border-[#E6E5DE]">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-xl bg-[#1C1B18] text-white flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#1C1B18] font-serif">
                Getting Started Checklist
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200">
                {completedCount}/{tasks.length} Completed ({percentComplete}%)
              </span>
            </div>
            <p className="text-[11px] text-[#68665E] font-mono hidden sm:block">
              Set up your single-user command center for maximum financial insight
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenTour}
            className="text-[11px] font-mono text-[#68665E] hover:text-[#1C1B18] underline cursor-pointer hidden md:inline"
          >
            Launch Tour
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-lg text-[#9E9C92] hover:text-[#1C1B18] hover:bg-[#E6E5DE]/40 transition cursor-pointer"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg text-[#9E9C92] hover:text-rose-600 hover:bg-[#E6E5DE]/40 transition cursor-pointer"
            title="Dismiss Checklist"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[#E6E5DE] h-1">
        <div
          className="bg-emerald-600 h-1 transition-all duration-500"
          style={{ width: `${percentComplete}%` }}
        />
      </div>

      {/* Checklist Items */}
      {!isCollapsed && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2 bg-[#FFFFFF]">
          {tasks.map(task => (
            <div
              key={task.id}
              onClick={() => handleActionClick(task)}
              className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                task.completed
                  ? 'bg-emerald-50/40 border-emerald-200/60 text-[#68665E]'
                  : 'bg-[#FAF9F5] border-[#E6E5DE] hover:border-[#1C1B18] text-[#1C1B18]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {task.completed ? (
                  <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-[#9E9C92] flex-shrink-0" />
                )}
                <span className={`text-xs font-mono line-clamp-1 ${task.completed ? 'line-through text-[#9E9C92]' : 'font-medium'}`}>
                  {task.label}
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-700 font-semibold flex items-center gap-1 flex-shrink-0 ml-2">
                {task.actionText}
                <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
