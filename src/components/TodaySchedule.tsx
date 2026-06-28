import React from 'react';
import { Task, Subtask } from '../types';
import { Calendar, Clock, CheckCircle2, Circle, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface TodayScheduleProps {
  tasks: Task[];
}

export const TodaySchedule: React.FC<TodayScheduleProps> = ({ tasks }) => {
  // Calculate completion volume for each of the last 7 days
  const getWeeklyData = () => {
    const days = [];
    const now = new Date();
    
    // Generate the last 7 days (including today)
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const label = d.toLocaleDateString([], { weekday: 'short' }); // e.g., 'Mon'
      const keyStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
      days.push({
        label,
        keyStr,
        completions: 0
      });
    }

    // Populate completions count
    tasks.forEach(task => {
      if (task.status === 'completed' && task.completedAt) {
        const compDateStr = task.completedAt.split('T')[0];
        const dayMatch = days.find(day => day.keyStr === compDateStr);
        if (dayMatch) {
          dayMatch.completions++;
        }
      }
    });

    return days;
  };

  const chartData = getWeeklyData();

  // Collect all subtasks scheduled for today or close
  const allSubtasks: Array<{ subtask: Subtask; taskName: string; category?: string }> = [];

  tasks.forEach(task => {
    if (task.subtasks) {
      task.subtasks.forEach(st => {
        allSubtasks.push({
          subtask: st,
          taskName: task.name,
          category: task.category
        });
      });
    }
  });

  // Sort subtasks by scheduled start time
  const sortedSubtasks = allSubtasks
    .filter(item => item.subtask.scheduledStart)
    .sort((a, b) => new Date(a.subtask.scheduledStart!).getTime() - new Date(b.subtask.scheduledStart!).getTime());

  const getCategoryColor = (c = "work") => {
    const colors: Record<string, string> = {
      work: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      study: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      personal: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      health: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
      finance: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    };
    return colors[c] || 'bg-slate-500/10 text-slate-500 border-slate-500/20';
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-700/50">
        <Calendar className="h-4 w-4 text-indigo-500" />
        <h3 className="font-sans font-extrabold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-wider">Guardian Schedule Slots</h3>
      </div>

      <div className="space-y-4">
        {sortedSubtasks.length === 0 ? (
          <div className="py-8 text-center text-slate-600 font-semibold text-xs">
            No subtasks scheduled yet. Use voice or manual input to plan a project.
          </div>
        ) : (
          <div className="relative border-l border-indigo-100 dark:border-indigo-950/50 ml-2.5 pl-5 space-y-5">
            {sortedSubtasks.slice(0, 6).map((item, idx) => {
              const isDone = item.subtask.status === 'completed';
              const startTime = new Date(item.subtask.scheduledStart!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const dateLabel = new Date(item.subtask.scheduledStart!).toLocaleDateString([], { month: 'short', day: 'numeric' });

              return (
                <div key={item.subtask.id} className="relative group">
                  {/* Timeline Node Icon */}
                  <div className="absolute -left-[27px] top-0.5 shrink-0 bg-white dark:bg-slate-800">
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-50 dark:fill-slate-900" />
                    ) : (
                      <div className="h-3.5 w-3.5 rounded-full border-2 border-indigo-500 bg-white dark:bg-slate-850 group-hover:bg-indigo-500 transition-colors" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                        {dateLabel} @ {startTime}
                      </span>
                      <span className={`font-sans text-[9px] font-bold border px-1.5 py-0.5 rounded-full uppercase tracking-wider ${getCategoryColor(item.category)}`}>
                        {item.category || 'work'}
                      </span>
                    </div>

                    <h4 className={`font-sans text-xs font-extrabold leading-tight ${isDone ? 'line-through text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>
                      {item.subtask.name}
                    </h4>

                    <span className="font-sans text-[11px] text-slate-600 font-semibold block -mt-0.5 max-w-[220px] truncate">
                      Project: {item.taskName}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Weekly Productivity Section */}
      <div className="pt-5 border-t border-slate-100 dark:border-slate-700/50 space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[#5B6B43] dark:text-emerald-400" />
          <h3 className="font-sans font-extrabold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider">Weekly Productivity</h3>
        </div>
        <p className="font-sans text-[11px] text-slate-600 font-semibold">
          Your task completion volume over the last 7 days. Keep the momentum going!
        </p>

        <div className="h-32 w-full font-mono text-[10px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
              <XAxis dataKey="label" stroke="#64748b" tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" allowDecimals={false} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                labelStyle={{ fontWeight: 'bold', color: '#e2e8f0' }}
                itemStyle={{ color: '#10b981' }}
              />
              <Bar dataKey="completions" fill="#5B6B43" radius={[4, 4, 0, 0]} name="Completed Tasks" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
export default TodaySchedule;
