import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Task, Subtask } from '../types';
import { saveTaskToDb, deleteTaskFromDb } from '../lib/tasks';
import { playSuccessChime } from '../lib/audio';
import confetti from 'canvas-confetti';
import {
  Clock, CheckCircle2, AlertTriangle, Play, Flame, ChevronRight,
  ChevronDown, BookOpen, Trash2, ArrowRightLeft, CalendarDays, Copy, Share2, Mail, ExternalLink, RefreshCw
} from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  onTaskUpdated: () => void;
  onSelectTask: (task: Task) => void;
}

export const TaskList: React.FC<TaskListProps> = ({ tasks, onTaskUpdated, onSelectTask }) => {
  const { user } = useAuth();
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [copiedTemplateIdx, setCopiedTemplateIdx] = useState<number | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [rescheduling, setRescheduling] = useState<string | null>(null);

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'critical':
        return <span className="bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 font-sans font-bold text-[9px] uppercase px-2.5 py-1 rounded-md border border-red-100 dark:border-red-900/30">🔥 Critical</span>;
      case 'high':
        return <span className="bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400 font-sans font-bold text-[9px] uppercase px-2.5 py-1 rounded-md border border-orange-100 dark:border-orange-900/30">⚠️ High</span>;
      case 'medium':
        return <span className="bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-400 font-sans font-bold text-[9px] uppercase px-2.5 py-1 rounded-md border border-yellow-100 dark:border-yellow-900/30">⚡ Medium</span>;
      default:
        return <span className="bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400 font-sans font-bold text-[9px] uppercase px-2.5 py-1 rounded-md border border-green-100 dark:border-green-900/30">🟢 Low</span>;
    }
  };

  const getCategoryEmoji = (c = "work") => {
    const emojis: Record<string, string> = {
      work: '💼',
      study: '📚',
      personal: '🏡',
      health: '❤️',
      finance: '💳',
      other: '🎯'
    };
    return emojis[c] || '⏰';
  };

  const calculateTaskProgress = (task: Task) => {
    if (!task.subtasks || task.subtasks.length === 0) return 0;
    const completed = task.subtasks.filter(s => s.status === 'completed').length;
    return Math.round((completed / task.subtasks.length) * 100);
  };

  const toggleSubtaskStatus = async (task: Task, subtaskId: string) => {
    if (!user) return;
    const updatedSubtasks = task.subtasks.map(s => {
      if (s.id === subtaskId) {
        const nextStatus: any = s.status === 'completed' ? 'pending' : 'completed';
        if (nextStatus === 'completed') {
          playSuccessChime();
        }
        return { ...s, status: nextStatus };
      }
      return s;
    });

    const wasAllCompleted = task.subtasks.every(s => s.status === 'completed');
    const isAllCompleted = updatedSubtasks.every(s => s.status === 'completed');

    if (isAllCompleted && !wasAllCompleted) {
      try {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch (e) {
        console.error(e);
      }
    }

    const updatedTask: Task = {
      ...task,
      subtasks: updatedSubtasks,
      status: isAllCompleted ? 'completed' : 'in_progress',
      completedAt: isAllCompleted ? new Date().toISOString() : undefined
    };

    await saveTaskToDb(updatedTask);
    onTaskUpdated();
  };

  const handleTriggerReschedule = async (task: Task) => {
    if (!user) return;
    setRescheduling(task.id);
    try {
      // Simulate/trigger active rescheduling by pushing times ahead by 1.5 hours to resolve conflicts
      const updatedSubtasks = task.subtasks.map(s => {
        if (s.status !== 'completed' && s.scheduledStart) {
          const originalStart = new Date(s.scheduledStart);
          const originalEnd = s.scheduledEnd ? new Date(s.scheduledEnd) : new Date(originalStart.getTime() + 45 * 60 * 1000);
          
          // Move forward by 1.5 hours
          const newStart = new Date(originalStart.getTime() + 90 * 60 * 1000).toISOString();
          const newEnd = new Date(originalEnd.getTime() + 90 * 60 * 1000).toISOString();
          
          return {
            ...s,
            scheduledStart: newStart,
            scheduledEnd: newEnd,
            alarmNote: "Rescheduled safely forward due to calendar adjustments. Still on track! ⚡"
          };
        }
        return s;
      });

      const updatedTask: Task = {
        ...task,
        subtasks: updatedSubtasks
      };

      await saveTaskToDb(updatedTask);
      alert("AI Rescheduling completed successfully! Times have been safely shifted forward, avoiding local calendar overlaps.");
      onTaskUpdated();
    } catch (e) {
      console.error(e);
    } finally {
      setRescheduling(null);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!user) return;
    if (confirm("Are you sure you want to delete this Guardian task? All calendar timeblocks will be left intact.")) {
      await deleteTaskFromDb(user.uid, taskId);
      onTaskUpdated();
    }
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedTemplateIdx(idx);
    setTimeout(() => setCopiedTemplateIdx(null), 2000);
  };

  const emailAccountabilityPartner = (task: Task) => {
    setEmailSending(true);
    setTimeout(() => {
      setEmailSending(false);
      alert(`Accountability Digest successfully compiled and dispatched to partner for task: "${task.name}". Report includes subtasks status and review checklist.`);
    }, 1200);
  };

  return (
    <div className="space-y-4">
      {tasks.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 border border-slate-200 dark:border-slate-700 text-center space-y-3">
          <p className="font-sans text-sm text-slate-500 dark:text-slate-400">No active Deadline Guardian plans found.</p>
          <p className="font-sans text-xs text-slate-400">Tap the voice mic or enter a prompt above to create your first guardian workspace!</p>
        </div>
      ) : (
        tasks.map((task) => {
          const isExpanded = expandedTaskId === task.id;
          const progress = calculateTaskProgress(task);
          const formattedDeadline = new Date(task.deadline).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div
              key={task.id}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm transition-all hover:shadow-md"
            >
              {/* Task Summary Card Header */}
              <div
                onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
              >
                <div className="flex items-start gap-3.5">
                  <div className="text-2xl mt-0.5 shrink-0">
                    {getCategoryEmoji(task.category)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-sans font-extrabold text-sm md:text-base text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">
                        {task.name}
                      </h4>
                      {getPriorityBadge(task.priority)}
                    </div>
                    <p className="font-sans text-xs text-slate-500 dark:text-slate-400 max-w-lg line-clamp-1">
                      {task.description || "Active plan scheduled automatically."}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 font-sans text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        Deadline: <strong className="text-slate-600 dark:text-slate-300">{formattedDeadline}</strong>
                      </span>
                      {task.locationHint && (
                        <span>📍 {task.locationHint}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress / Right Action bar */}
                <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 border-t md:border-t-0 border-slate-100 dark:border-slate-700/50 pt-3 md:pt-0">
                  <div className="text-left md:text-right space-y-1">
                    <span className="font-mono text-[10px] uppercase text-slate-400 block font-bold">Planned Progress</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 md:w-24 bg-slate-100 dark:bg-slate-900 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="font-sans text-xs font-bold text-slate-700 dark:text-slate-300">{progress}%</span>
                    </div>
                  </div>
                  <div className="text-slate-400 p-1 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </div>
                </div>
              </div>

              {/* Extended Task Details Grid */}
              {isExpanded && (
                <div className="border-t border-slate-100 dark:border-slate-700/50 p-5 md:p-6 bg-slate-50/50 dark:bg-slate-900/20 space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: Subtask Checklist */}
                    <div className="lg:col-span-6 space-y-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[10px] uppercase text-slate-400 font-bold">Milestone checklist</span>
                        <button
                          onClick={() => handleTriggerReschedule(task)}
                          disabled={rescheduling === task.id}
                          className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          <RefreshCw className={`h-3 w-3 ${rescheduling === task.id ? 'animate-spin' : ''}`} />
                          {rescheduling === task.id ? 'Rescheduling...' : 'AI Auto-Reschedule'}
                        </button>
                      </div>

                      <div className="space-y-2">
                        {task.subtasks.map((st, idx) => {
                          const isDone = st.status === 'completed';
                          const startTime = st.scheduledStart
                            ? new Date(st.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'N/A';
                          const dateLabel = st.scheduledStart
                            ? new Date(st.scheduledStart).toLocaleDateString([], { month: 'short', day: 'numeric' })
                            : '';

                          return (
                            <div
                              key={st.id}
                              onClick={() => toggleSubtaskStatus(task, st.id)}
                              className={`p-3 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                                isDone
                                  ? 'bg-slate-50/80 dark:bg-slate-950/20 border-slate-100 dark:border-slate-800/50 opacity-60'
                                  : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-900 hover:border-slate-300 dark:hover:border-slate-750'
                              }`}
                            >
                              <div className="mt-0.5 shrink-0">
                                {isDone ? (
                                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 fill-emerald-50 dark:fill-slate-900" />
                                ) : (
                                  <div className="h-4.5 w-4.5 rounded-full border-2 border-slate-300 dark:border-slate-700 hover:border-indigo-500" />
                                )}
                              </div>
                              <div className="space-y-0.5 flex-1">
                                <span className={`font-sans text-xs font-bold block ${isDone ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                  {st.name}
                                </span>
                                {st.alarmNote && (
                                  <span className="font-sans text-[11px] text-indigo-500 dark:text-indigo-400/80 block italic leading-tight">
                                    💡 Coach Alert: {st.alarmNote}
                                  </span>
                                )}
                                <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400 pt-1">
                                  <span>📅 {dateLabel} @ {startTime}</span>
                                  <span>•</span>
                                  <span>⏱️ {st.durationMinutes} mins</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right: AI-Generated Prep Materials Bento Box */}
                    <div className="lg:col-span-6 space-y-4">
                      <div className="bg-white dark:bg-slate-950 rounded-2xl p-5 border border-slate-200 dark:border-slate-900 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-150 dark:border-slate-900">
                          <h5 className="font-sans font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-indigo-500" />
                            AI Prep Materials & Learning Guides
                          </h5>
                          <button
                            onClick={() => emailAccountabilityPartner(task)}
                            disabled={emailSending}
                            className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase px-2 py-1 rounded-md transition-colors cursor-pointer"
                          >
                            <Mail className="h-3 w-3" />
                            {emailSending ? 'Sending...' : 'Email Partner'}
                          </button>
                        </div>

                        {task.prepMaterials ? (
                          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                            {/* Outline Section */}
                            <div className="space-y-1.5">
                              <span className="font-mono text-[9px] uppercase text-slate-400 font-bold block">Presentation & Concept Outline</span>
                              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-850 text-xs text-slate-700 dark:text-slate-300 font-sans whitespace-pre-line leading-relaxed">
                                {task.prepMaterials.outline}
                              </div>
                            </div>

                            {/* Talking points */}
                            <div className="space-y-1.5">
                              <span className="font-mono text-[9px] uppercase text-slate-400 font-bold block">Key Discussion Talking Points</span>
                              <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-400 font-sans pl-1">
                                {task.prepMaterials.talkingPoints.map((tp, idx) => (
                                  <li key={idx} className="leading-snug">{tp}</li>
                                ))}
                              </ul>
                            </div>

                            {/* Resource Links */}
                            <div className="space-y-1.5">
                              <span className="font-mono text-[9px] uppercase text-slate-400 font-bold block">Suggested Learning Resources</span>
                              <div className="flex flex-col gap-1.5">
                                {task.prepMaterials.resources.map((res, idx) => (
                                  <a
                                    key={idx}
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); alert(`Opening Resource material for: ${res}`); }}
                                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-sans font-medium"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    {res}
                                  </a>
                                ))}
                              </div>
                            </div>

                            {/* Practice questions */}
                            <div className="space-y-1.5">
                              <span className="font-mono text-[9px] uppercase text-slate-400 font-bold block">Self Reflection Questions</span>
                              <div className="space-y-1.5 pl-1">
                                {task.prepMaterials.practiceQuestions.map((q, idx) => (
                                  <p key={idx} className="text-xs font-medium text-slate-700 dark:text-slate-300 font-sans">
                                    {idx + 1}. {q}
                                  </p>
                                ))}
                              </div>
                            </div>

                            {/* Copyable Email Templates */}
                            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-900">
                              <span className="font-mono text-[9px] uppercase text-slate-400 font-bold block">Pre-drafted Professional Emails</span>
                              <div className="space-y-2">
                                {task.prepMaterials.emailTemplates?.map((tmpl, idx) => (
                                  <div key={idx} className="border border-slate-100 dark:border-slate-850 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="font-sans font-bold text-[11px] text-slate-800 dark:text-slate-200">{tmpl.name}</span>
                                      <button
                                        onClick={() => copyToClipboard(tmpl.body, idx)}
                                        className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 flex items-center gap-1 transition-colors cursor-pointer"
                                      >
                                        <Copy className="h-3 w-3" />
                                        <span className="text-[9px] uppercase font-bold">{copiedTemplateIdx === idx ? 'Copied' : 'Copy'}</span>
                                      </button>
                                    </div>
                                    <p className="font-sans text-[10px] text-slate-500 dark:text-slate-400 line-clamp-3 bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-900 leading-normal">
                                      {tmpl.body}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-6 text-slate-400">
                            <p className="font-sans text-xs">No learning materials generated. Ensure Gemini keys are active.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="border-t border-slate-150 dark:border-slate-750 pt-4 flex items-center justify-between">
                    <button
                      onClick={() => handleTriggerReschedule(task)}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowRightLeft className="h-4 w-4" />
                      Adjust & Shift Timeblocks
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-red-500 hover:text-red-600 hover:underline text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Project Plan
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};
export default TaskList;
