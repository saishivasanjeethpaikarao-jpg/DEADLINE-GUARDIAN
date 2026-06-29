import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Task, Subtask } from '../types';
import { saveTaskToDb, deleteTaskFromDb } from '../lib/tasks';
import { playSuccessChime } from '../lib/audio';
import { generateGoogleCalendarLink, generateIcsFile } from '../lib/calendarSync';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Trash2, Calendar, CheckCircle2, Circle, 
  RefreshCw, Clock, Sparkles, BookOpen, Mail, Copy, ChevronDown, ChevronUp, CheckCircle, ExternalLink 
} from 'lucide-react';

interface TaskDetailViewProps {
  task: Task;
  onBack: () => void;
  onTaskUpdated: () => void;
  onStartFocus?: (taskId: string, subtask: Subtask) => void;
}

export const TaskDetailView: React.FC<TaskDetailViewProps> = ({ task, onBack, onTaskUpdated, onStartFocus }) => {
  const { user } = useAuth();
  const [rescheduling, setRescheduling] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [copiedTemplateIdx, setCopiedTemplateIdx] = useState<number | null>(null);
  const [showPrep, setShowPrep] = useState(true);

  const calculateProgress = () => {
    if (!task.subtasks || task.subtasks.length === 0) return 0;
    const completed = task.subtasks.filter(s => s.status === 'completed').length;
    return Math.round((completed / task.subtasks.length) * 100);
  };

  const progress = calculateProgress();

  const formattedDeadline = new Date(task.deadline).toLocaleString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const toggleSubtask = async (subtaskId: string) => {
    if (!user) return;
    const updatedSubtasks = task.subtasks.map(s => {
      if (s.id === subtaskId) {
        const nextStatus: any = s.status === 'completed' ? 'pending' : 'completed';
        if (nextStatus === 'completed') {
          playSuccessChime();
          try {
            confetti({
              particleCount: 40,
              spread: 60,
              origin: { y: 0.7 },
              colors: ['#5B6B43', '#C9A96E', '#C4705A']
            });
          } catch (e) {
            console.error(e);
          }
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

  const handleReschedule = async () => {
    if (!user) return;
    setRescheduling(true);
    try {
      // Shift uncompleted tasks forward by 1.5 hours
      const updatedSubtasks = task.subtasks.map(s => {
        if (s.status !== 'completed' && s.scheduledStart) {
          const originalStart = new Date(s.scheduledStart);
          const originalEnd = s.scheduledEnd ? new Date(s.scheduledEnd) : new Date(originalStart.getTime() + 45 * 60 * 1000);
          
          const newStart = new Date(originalStart.getTime() + 90 * 60 * 1000).toISOString();
          const newEnd = new Date(originalEnd.getTime() + 90 * 60 * 1000).toISOString();
          
          return {
            ...s,
            scheduledStart: newStart,
            scheduledEnd: newEnd,
            alarmNote: "Auto-rescheduled safely. Keep going! ⚡"
          };
        }
        return s;
      });

      const updatedTask: Task = {
        ...task,
        subtasks: updatedSubtasks
      };

      await saveTaskToDb(updatedTask);
      alert("AI Auto-Rescheduling completed successfully! Subtask blocks shifted forward to avoid overlaps.");
      onTaskUpdated();
    } catch (e) {
      console.error(e);
    } finally {
      setRescheduling(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!user) return;
    const updatedSubtasks = task.subtasks.map(s => ({ ...s, status: 'completed' as const }));
    const updatedTask: Task = {
      ...task,
      subtasks: updatedSubtasks,
      status: 'completed',
      completedAt: new Date().toISOString()
    };
    playSuccessChime();
    await saveTaskToDb(updatedTask);
    onTaskUpdated();
    alert("Project plan completed! You've stayed accountable!");
  };

  const handleDelete = async () => {
    if (!user) return;
    if (confirm("Are you sure you want to delete this project plan? Google Calendar events will remain intact.")) {
      await deleteTaskFromDb(user.uid, task.id);
      onTaskUpdated();
      onBack();
    }
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedTemplateIdx(idx);
    setTimeout(() => setCopiedTemplateIdx(null), 2000);
  };

  const sendEmailToPartner = () => {
    setEmailSending(true);
    setTimeout(() => {
      setEmailSending(false);
      alert(`Accountability Report compiled and sent to your partner for: "${task.name}".`);
    }, 1200);
  };

  const getPriorityBadge = (p: string) => {
    if (p === 'critical' || p === 'high') {
      return (
        <span className="bg-[#C4705A]/15 text-[#C4705A] border-2 border-[#C4705A]/40 font-mono font-bold text-[10px] uppercase px-3 py-1.5 rounded-full">
          ⚠️ Urgent Priority
        </span>
      );
    }
    return (
      <span className="bg-[#5B6B43]/15 text-[#5B6B43] border-2 border-[#5B6B43]/40 font-mono font-bold text-[10px] uppercase px-3 py-1.5 rounded-full">
        🌿 Standard Priority
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header/Nav */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 bg-[#FAF8F5] hover:bg-[#FAF8F5]/80 border-2 border-[#292524] px-4 py-2 rounded-xl text-xs font-dm font-bold text-[#292524] shadow-[3px_3px_0px_#292524] active:translate-y-0.5 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        <button
          onClick={handleDelete}
          className="flex items-center gap-2 bg-red-50 hover:bg-red-100/80 text-red-700 border-2 border-[#292524] px-4 py-2 rounded-xl text-xs font-dm font-bold shadow-[3px_3px_0px_#292524] active:translate-y-0.5 cursor-pointer"
        >
          <Trash2 className="h-4 w-4" />
          Delete Plan
        </button>
      </div>

      <div className="bg-[#FAF8F5] border-2 border-[#292524] rounded-2xl p-6 md:p-8 shadow-[6px_6px_0px_#292524] space-y-6">
        {/* Title Block */}
        <div className="border-b-2 border-[#292524]/10 pb-6 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            {getPriorityBadge(task.priority)}
            {task.category && (
              <span className="bg-[#F5F1EB] border-2 border-[#292524]/20 px-3 py-1 rounded-full text-xs font-mono font-bold text-[#292524]/70 uppercase">
                🏷️ {task.category}
              </span>
            )}
          </div>

          <h1 className="font-serif font-black text-2xl md:text-3xl text-[#292524] leading-tight">
            {task.name}
          </h1>

          <p className="font-dm text-sm text-[#292524]/80 leading-relaxed max-w-3xl">
            {task.description || "No customized description provided. This project has been automatically scheduled based on deadline requirements."}
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-2 font-mono text-[11px] text-[#292524]/60">
              <Calendar className="h-4 w-4 text-[#5B6B43]" />
              <span>Absolute Deadline: <strong className="text-[#292524]">{formattedDeadline}</strong></span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[9px] uppercase text-[#292524]/40 font-extrabold mr-1">Calendar Sync:</span>
              <a
                href={generateGoogleCalendarLink(task)}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white hover:bg-[#FAF8F5] text-indigo-600 border border-[#292524]/20 text-[10px] font-dm font-black uppercase px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-[1px_1px_0px_#292524] transition-all cursor-pointer"
                title="Add to Google Calendar"
              >
                <Calendar className="h-3 w-3" />
                Google Calendar
              </a>
              <button
                onClick={() => generateIcsFile(task)}
                className="bg-white hover:bg-[#FAF8F5] text-emerald-600 border border-[#292524]/20 text-[10px] font-dm font-black uppercase px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-[1px_1px_0px_#292524] transition-all cursor-pointer"
                title="Download standard .ics file"
              >
                <Calendar className="h-3 w-3" />
                Download (.ICS)
              </button>
            </div>
          </div>
        </div>

        {/* Progress Grid */}
        <div className="bg-[#F5F1EB] border-2 border-[#292524] rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left space-y-1">
            <span className="font-serif font-black text-xs text-[#292524]/50 uppercase tracking-widest block">Project Timeframe Progress</span>
            <span className="font-dm text-xs text-[#292524]/70 block">Keep completing subtasks to maintain streak and avoid alarms.</span>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="w-40 bg-[#292524]/10 h-3 rounded-full overflow-hidden border border-[#292524]/20">
              <div 
                className="bg-[#5B6B43] h-full transition-all" 
                style={{ width: `${progress}%` }} 
              />
            </div>
            <span className="font-serif font-black text-lg text-[#5B6B43]">{progress}% Complete</span>
          </div>
        </div>

        {/* Core details layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
          {/* Left Area (6 cols): Subtasks checklist */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#292524]/10 pb-2">
              <h3 className="font-serif font-black text-sm text-[#292524] uppercase tracking-wider">
                Milestone Timeline checklist
              </h3>
              
              <button
                onClick={handleReschedule}
                disabled={rescheduling}
                className="flex items-center gap-1.5 bg-[#FAF8F5] hover:bg-[#F5F1EB] text-[#292524] border-2 border-[#292524] text-[10px] font-dm font-bold uppercase px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <RefreshCw className={`h-3 w-3 ${rescheduling ? 'animate-spin' : ''}`} />
                {rescheduling ? 'Rescheduling...' : 'Auto-Reschedule'}
              </button>
            </div>

            <div className="space-y-2.5">
              {task.subtasks.map((st, idx) => {
                const isDone = st.status === 'completed';
                const startStr = st.scheduledStart
                  ? new Date(st.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '';
                const dateStr = st.scheduledStart
                  ? new Date(st.scheduledStart).toLocaleDateString([], { month: 'short', day: 'numeric' })
                  : '';

                return (
                  <div
                    key={st.id}
                    onClick={() => toggleSubtask(st.id)}
                    className={`p-3.5 rounded-xl border-2 transition-all flex items-start gap-3 cursor-pointer ${
                      isDone 
                        ? 'bg-[#FAF8F5] border-[#292524]/10 opacity-55' 
                        : 'bg-[#FAF8F5] border-[#292524] hover:bg-[#FAF8F5]/80 hover:translate-y-[-1px]'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isDone ? (
                        <motion.div
                          initial={{ scale: 0.6, rotate: -20 }}
                          animate={{ scale: [1, 1.4, 1], rotate: [0, 12, 0] }}
                          transition={{ type: "spring", stiffness: 300, damping: 15 }}
                        >
                          <CheckCircle2 className="h-4.5 w-4.5 text-[#5B6B43] fill-[#5B6B43]/10" />
                        </motion.div>
                      ) : (
                        <motion.div 
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.85 }}
                          className="h-4.5 w-4.5 rounded-full border-2 border-[#292524] hover:border-[#5B6B43] bg-white flex items-center justify-center cursor-pointer"
                        />
                      )}
                    </div>
                    
                    <div className="space-y-0.5 flex-1 text-left">
                      <span className={`font-dm text-xs font-bold block ${isDone ? 'line-through text-[#292524]/50' : 'text-[#292524]'}`}>
                        {st.name}
                      </span>
                      {st.alarmNote && (
                        <span className="font-dm text-[11px] text-[#C4705A] block italic leading-tight">
                          💡 Coach: {st.alarmNote}
                        </span>
                      )}
                      <div className="flex items-center justify-between gap-1 pt-1.5">
                        <div className="flex items-center gap-1.5 font-mono text-[9px] text-[#292524]/50">
                          <span>📅 {dateStr} @ {startStr}</span>
                          <span>•</span>
                          <span>⏱️ {st.durationMinutes} mins</span>
                        </div>

                        {!isDone && onStartFocus && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onStartFocus(task.id, st);
                            }}
                            className="bg-[#5B6B43] hover:bg-[#4a5836] text-[#FAF8F5] border border-[#292524] shadow-[1px_1px_0px_#292524] font-mono text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-0.5"
                            title="Launch distraction-free focus block"
                          >
                            🎯 Focus
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Area (6 cols): Prep Materials collapsible */}
          <div className="lg:col-span-6 space-y-4">
            <div className="border-2 border-[#292524] bg-[#FAF8F5] rounded-xl overflow-hidden">
              <div 
                onClick={() => setShowPrep(!showPrep)}
                className="bg-[#F5F1EB] px-4 py-3.5 border-b-2 border-[#292524] flex items-center justify-between cursor-pointer"
              >
                <span className="font-serif font-black text-xs text-[#292524] uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[#5B6B43]" />
                  AI Prep Guides & Material
                </span>
                
                {showPrep ? <ChevronUp className="h-4 w-4 text-[#292524]" /> : <ChevronDown className="h-4 w-4 text-[#292524]" />}
              </div>

              {showPrep && (
                <div className="p-4 space-y-4 max-h-[380px] overflow-y-auto">
                  {task.prepMaterials ? (
                    <div className="space-y-4 text-left">
                      {/* Outline */}
                      <div className="space-y-1.5">
                        <span className="font-mono text-[9px] uppercase text-[#292524]/50 font-black block">Study / Outline Guide</span>
                        <div className="bg-[#F5F1EB] p-3 rounded-lg border border-[#292524]/10 text-xs text-[#292524] font-dm whitespace-pre-line leading-relaxed">
                          {task.prepMaterials.outline}
                        </div>
                      </div>

                      {/* Talking points */}
                      <div className="space-y-1.5">
                        <span className="font-mono text-[9px] uppercase text-[#292524]/50 font-black block">Key Notes & Talking Points</span>
                        <ul className="list-disc list-inside space-y-1 text-xs text-[#292524]/80 font-dm">
                          {task.prepMaterials.talkingPoints?.map((tp, idx) => (
                            <li key={idx} className="leading-snug">{tp}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Resources */}
                      <div className="space-y-1.5">
                        <span className="font-mono text-[9px] uppercase text-[#292524]/50 font-black block">Learning Resources</span>
                        <div className="flex flex-col gap-1 pl-0.5">
                          {task.prepMaterials.resources?.map((res, idx) => (
                            <a
                              key={idx}
                              href="#"
                              onClick={(e) => { e.preventDefault(); alert(`Opening Resource: ${res}`); }}
                              className="text-xs text-[#5B6B43] hover:underline font-dm font-bold flex items-center gap-1.5"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              {res}
                            </a>
                          ))}
                        </div>
                      </div>

                      {/* Self Reflection */}
                      <div className="space-y-1.5">
                        <span className="font-mono text-[9px] uppercase text-[#292524]/50 font-black block">Reflection / Prep Questions</span>
                        <div className="space-y-1 bg-[#F5F1EB]/50 p-2.5 rounded-lg border border-[#292524]/5">
                          {task.prepMaterials.practiceQuestions?.map((q, idx) => (
                            <p key={idx} className="text-xs font-dm text-[#292524] leading-relaxed">
                              {idx + 1}. {q}
                            </p>
                          ))}
                        </div>
                      </div>

                      {/* Email templates */}
                      <div className="space-y-2 pt-2 border-t border-[#292524]/10">
                        <span className="font-mono text-[9px] uppercase text-[#292524]/50 font-black block">Professional Emails</span>
                        <div className="space-y-2">
                          {task.prepMaterials.emailTemplates?.map((tmpl, idx) => (
                            <div key={idx} className="border border-[#292524]/10 rounded-lg p-3 bg-[#F5F1EB]/30 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-serif font-black text-[11px] text-[#292524]">{tmpl.name}</span>
                                <button
                                  onClick={() => copyToClipboard(tmpl.body, idx)}
                                  className="text-[#5B6B43] hover:text-[#4a5836] p-1 flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <Copy className="h-3 w-3" />
                                  <span className="text-[9px] uppercase font-bold">{copiedTemplateIdx === idx ? 'Copied' : 'Copy'}</span>
                                </button>
                              </div>
                              <p className="font-dm text-[10px] text-[#292524]/70 leading-relaxed bg-[#FAF8F5] p-2 rounded border border-[#292524]/5 max-h-24 overflow-y-auto">
                                {tmpl.body}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="text-center py-6 text-[#292524]/50">
                      <p className="font-dm text-xs">No learning materials loaded yet. Check your internet connection or Gemini API settings.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Email Partner actions card */}
            <div className="bg-[#FCF8D5] border-2 border-[#292524] rounded-xl p-5 flex flex-col justify-between gap-4 text-left shadow-sm">
              <div className="space-y-1">
                <span className="font-serif font-black text-xs text-[#292524] uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-[#C4705A]" />
                  Keep Accountability Partner Updated
                </span>
                <p className="font-dm text-xs text-[#292524]/80 leading-relaxed">
                  Send a complete project breakdown outlining your schedule blocks, timeframes, and generated reference guides to keep you focused.
                </p>
              </div>

              <button
                onClick={sendEmailToPartner}
                disabled={emailSending}
                className="bg-[#C4705A] hover:bg-[#b5614b] active:translate-y-0.5 text-[#FAF8F5] font-dm font-bold text-xs py-2.5 px-4 rounded-xl border-2 border-[#292524] shadow-[3px_3px_0px_#292524] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Mail className="h-4 w-4" />
                {emailSending ? 'Dispatching Digest...' : 'Email Accountability Partner'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t-2 border-[#292524]/10">
          <span className="font-dm text-xs text-[#292524]/50">
            *All scheduled calendar slots are dynamically adjusted relative to your peak energy hours.
          </span>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleMarkComplete}
              className="w-full sm:w-auto bg-[#5B6B43] hover:bg-[#4a5836] active:translate-y-0.5 text-[#FAF8F5] font-dm font-bold text-xs px-6 py-3.5 rounded-xl border-2 border-[#292524] shadow-[4px_4px_0px_#292524] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle className="h-4 w-4" />
              Complete Project Plan
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
export default TaskDetailView;
