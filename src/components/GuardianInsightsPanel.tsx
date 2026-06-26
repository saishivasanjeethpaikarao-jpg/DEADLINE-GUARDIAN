import React, { useState, useEffect } from 'react';
import { Task } from '../types';
import { 
  Sparkles, RefreshCw, AlertTriangle, ArrowRight, CheckCircle2, Flame, HelpCircle 
} from 'lucide-react';

interface Insight {
  id: string;
  type: 'motivation' | 'schedule_alert' | 'praise';
  urgency: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  actionLabel: string;
}

interface GuardianInsightsPanelProps {
  tasks: Task[];
  onActionTrigger: (action: string) => void;
}

export const GuardianInsightsPanel: React.FC<GuardianInsightsPanelProps> = ({ tasks, onActionTrigger }) => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/gemini/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: tasks.map(t => ({
            name: t.name,
            description: t.description,
            priority: t.priority,
            status: t.status,
            deadline: t.deadline,
            subtasks: t.subtasks?.map(s => ({ name: s.name, status: s.status, start: s.scheduledStart }))
          })),
          currentTime: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error("Failed to reach insights intelligence server");
      }

      const resData = await response.json();
      if (resData.success && resData.data && resData.data.insights) {
        setInsights(resData.data.insights);
      } else {
        throw new Error("Invalid intelligence response structure");
      }
    } catch (err: any) {
      console.warn("Could not load dynamic insights, loading offline coaching system:", err);
      // Premium offline fallback rules
      setInsights([
        {
          id: 'offline_1',
          type: 'motivation',
          urgency: 'medium',
          title: 'Immediate Momentum Booster',
          message: 'Procrastination loops trigger most often when milestones feel massive. Open Focus Mode on your highest-priority item right now.',
          actionLabel: 'Launch Focus'
        },
        {
          id: 'offline_2',
          type: 'schedule_alert',
          urgency: 'low',
          title: 'Adaptive Energy Align',
          message: 'You have important blocks scheduled. Reorder items in the Weekly Planner to matching your morning cognitive focus peak hours.',
          actionLabel: 'Check Planner'
        },
        {
          id: 'offline_3',
          type: 'praise',
          urgency: 'low',
          title: 'Accountability Secure',
          message: 'Your accountability partner receives status emails automatically. Keep updating milestones to verify continuous progress.',
          actionLabel: 'Review Settings'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch insights on mount (if tasks exist) or when task lengths change
  useEffect(() => {
    fetchInsights();
  }, [tasks.length]);

  const getUrgencyStyles = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-900 dark:text-red-300';
      case 'medium':
        return 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-300';
      default:
        return 'bg-indigo-50 border-indigo-100 text-indigo-800 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-indigo-300';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'schedule_alert':
        return <AlertTriangle className="h-5 w-5 text-[#C4705A]" />;
      case 'praise':
        return <Flame className="h-5 w-5 text-[#5B6B43]" />;
      default:
        return <Sparkles className="h-5 w-5 text-indigo-500" />;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 border-2 border-[#292524] rounded-2xl p-6 shadow-[6px_6px_0px_#292524] space-y-5 text-left text-[#292524]" id="guardian-insights-panel">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-[#292524]/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 bg-indigo-50 border-2 border-indigo-500 rounded-lg flex items-center justify-center text-indigo-500">
            <Sparkles className="h-4.5 w-4.5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-serif font-black text-base">Guardian AI Insights</h3>
            <p className="font-dm text-xs text-[#292524]/50">Dynamic progress intelligence by Gemini 3.5 Flash</p>
          </div>
        </div>

        <button
          onClick={fetchInsights}
          disabled={loading}
          className="h-8 w-8 border-2 border-[#292524] bg-[#FAF8F5] hover:bg-[#FAF8F5]/80 text-[#292524] rounded-lg flex items-center justify-center transition-all cursor-pointer active:translate-y-0.5 disabled:opacity-50"
          title="Refresh AI Analysis"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="space-y-3.5">
        {loading ? (
          <div className="py-8 space-y-4">
            <div className="flex items-center justify-center gap-2 font-dm text-xs text-stone-500 italic">
              <RefreshCw className="h-4 w-4 animate-spin text-[#5B6B43]" />
              Analyzing active deadlines and snooze triggers...
            </div>
            {/* Loading skeletons */}
            <div className="space-y-2.5">
              {[1, 2].map(i => (
                <div key={i} className="animate-pulse bg-stone-100 dark:bg-slate-700 h-16 rounded-xl border border-stone-200 dark:border-slate-600 w-full" />
              ))}
            </div>
          </div>
        ) : insights.length === 0 ? (
          <div className="py-8 text-center text-stone-400 font-dm text-xs italic">
            Gathering data. Create some tasks to feed the Guardian AI engine!
          </div>
        ) : (
          <div className="space-y-3">
            {insights.slice(0, 3).map(insight => (
              <div 
                key={insight.id}
                className={`p-4 border-2 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:translate-x-1 ${getUrgencyStyles(insight.urgency)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-white dark:bg-slate-900 rounded-lg border border-[#292524]/10 shrink-0 mt-0.5 shadow-sm">
                    {getInsightIcon(insight.type)}
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-serif font-black text-sm text-[#292524]">
                      {insight.title}
                    </h4>
                    <p className="font-dm text-xs text-stone-600 dark:text-stone-300 leading-relaxed max-w-xl">
                      {insight.message}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onActionTrigger(insight.actionLabel)}
                  className="bg-[#292524] text-white hover:bg-[#1C1917] font-mono text-[9px] font-black uppercase tracking-wider px-3.5 py-2 rounded-lg transition-all cursor-pointer shadow-[2px_2px_0px_rgba(41,37,36,0.3)] active:translate-y-0.5 flex items-center gap-1 self-start sm:self-auto"
                >
                  {insight.actionLabel}
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default GuardianInsightsPanel;
