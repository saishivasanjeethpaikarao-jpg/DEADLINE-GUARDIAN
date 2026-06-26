import React, { useState, useEffect } from 'react';
import { Task } from '../types';
import { Bell, AlertTriangle, CheckCircle, Volume2, X, Sparkles } from 'lucide-react';
import { saveTaskToDb } from '../lib/tasks';
import { playSuccessChime } from '../lib/audio';

interface DeadlineNotificationProps {
  tasks: Task[];
  onTaskUpdated: () => void;
}

export const DeadlineNotification: React.FC<DeadlineNotificationProps> = ({ tasks, onTaskUpdated }) => {
  const [approachingTasks, setApproachingTasks] = useState<Task[]>([]);
  const [dismissedTaskIds, setDismissedTaskIds] = useState<string[]>([]);

  useEffect(() => {
    const checkDeadlines = () => {
      const now = new Date();
      const upcoming = tasks.filter(task => {
        if (task.status === 'completed') return false;
        if (dismissedTaskIds.includes(task.id)) return false;

        const deadlineDate = new Date(task.deadline);
        const diffMs = deadlineDate.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        // Approach criteria: deadline is within next 24 hours OR is overdue
        return diffHours <= 24;
      });

      // Sort by urgency (overdue first, then closest deadline)
      upcoming.sort((a, b) => {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });

      setApproachingTasks(upcoming);
    };

    checkDeadlines();
    const interval = setInterval(checkDeadlines, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [tasks, dismissedTaskIds]);

  const handleDismiss = (taskId: string) => {
    setDismissedTaskIds(prev => [...prev, taskId]);
  };

  const handleComplete = async (task: Task) => {
    // Mark task and all its subtasks as completed
    const updatedSubtasks = task.subtasks?.map(sub => ({
      ...sub,
      status: 'completed' as const
    })) || [];

    const updatedTask: Task = {
      ...task,
      subtasks: updatedSubtasks,
      status: 'completed',
      completedAt: new Date().toISOString()
    };

    try {
      playSuccessChime();
      await saveTaskToDb(updatedTask);
      onTaskUpdated();
    } catch (error) {
      console.error("Error completing task from notification:", error);
    }
  };

  const speakMotivation = (task: Task) => {
    if (!('speechSynthesis' in window)) return;
    
    // Stop any current speaking
    window.speechSynthesis.cancel();

    const deadlineDate = new Date(task.deadline);
    const now = new Date();
    const diffMs = deadlineDate.getTime() - now.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));

    let speechText = "";
    if (diffHours < 0) {
      speechText = `Attention! The deadline for ${task.name} has passed. Don't worry, you can still finish this. Let's tackle it now!`;
    } else if (diffHours === 0) {
      speechText = `Urgent alert! ${task.name} is due within the hour. Focus up, shut out all distractions, and let's get it done!`;
    } else {
      speechText = `Proactive notification. Your task, ${task.name}, is due in ${diffHours} hours. Start checking off your subtasks now to stay on schedule.`;
    }

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    
    // Attempt to select a clear English voice if available
    const voices = window.speechSynthesis.getVoices();
    const primaryVoice = voices.find(v => v.lang.includes('en-US') && v.name.includes('Google')) || 
                        voices.find(v => v.lang.includes('en'));
    if (primaryVoice) utterance.voice = primaryVoice;

    window.speechSynthesis.speak(utterance);
  };

  if (approachingTasks.length === 0) return null;

  const currentTask = approachingTasks[0]; // Highlight the most urgent one
  const deadlineDate = new Date(currentTask.deadline);
  const now = new Date();
  const isOverdue = deadlineDate.getTime() < now.getTime();
  
  // Calculate display string
  let countdownText = "";
  if (isOverdue) {
    const diffMs = now.getTime() - deadlineDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      countdownText = "Overdue by less than an hour!";
    } else {
      countdownText = `Overdue by ${diffHours} hour${diffHours > 1 ? 's' : ''}!`;
    }
  } else {
    const diffMs = deadlineDate.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      countdownText = "Due in less than an hour!";
    } else {
      countdownText = `Due in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    }
  }

  const priorityColors = {
    critical: 'from-red-600/20 to-rose-600/20 border-red-500/40 text-red-400',
    high: 'from-amber-600/20 to-orange-600/20 border-amber-500/40 text-amber-400',
    medium: 'from-indigo-600/20 to-blue-600/20 border-indigo-500/40 text-indigo-400',
    low: 'from-slate-600/20 to-slate-700/20 border-slate-500/40 text-slate-400',
  };

  const ringColor = isOverdue ? 'text-red-500 bg-red-500/10' : 'text-amber-400 bg-amber-400/10';

  return (
    <div className={`w-full rounded-2xl bg-gradient-to-r ${priorityColors[currentTask.priority] || priorityColors.medium} border p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 transition-all duration-300 relative overflow-hidden`}>
      {/* Visual neon line at the bottom */}
      <div className={`absolute bottom-0 left-0 right-0 h-1 ${isOverdue ? 'bg-red-500' : 'bg-amber-400'} opacity-70`} />
      
      <div className="flex items-center gap-4 w-full md:w-auto">
        {/* Ringing Alarm Icon */}
        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${ringColor} border border-current/20 shrink-0 relative`}>
          <div className="absolute inset-0 rounded-xl bg-current/5 animate-ping" />
          <Bell className="h-6 w-6 animate-alarm-ring" />
        </div>
        
        <div className="space-y-1 w-full">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] uppercase tracking-wider bg-current/10 border border-current/20 px-2 py-0.5 rounded-full font-extrabold">
              {isOverdue ? 'CRITICAL ALERT' : 'APPROACHING DEADLINE'}
            </span>
            <span className="font-mono text-[9px] text-slate-400">
              Priority: {currentTask.priority.toUpperCase()}
            </span>
          </div>
          <h3 className="font-sans font-extrabold text-sm text-white leading-tight">
            {currentTask.name}
          </h3>
          <p className="font-sans text-xs text-slate-300 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-current" />
            <span className="font-bold text-white">{countdownText}</span>
            <span className="text-slate-400">•</span>
            <span>Target: {new Date(currentTask.deadline).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full md:w-auto justify-end">
        {/* Speak Motivation Coached Alarm Voice */}
        <button
          onClick={() => speakMotivation(currentTask)}
          title="Play voice coach audio reminder"
          className="flex items-center justify-center h-10 w-10 rounded-xl bg-slate-900/60 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
        >
          <Volume2 className="h-4 w-4" />
        </button>

        {/* Complete Task Direct Trigger */}
        <button
          onClick={() => handleComplete(currentTask)}
          className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-sans text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg transition-colors cursor-pointer"
        >
          <CheckCircle className="h-4 w-4" />
          Mark Complete
        </button>

        {/* Dismiss alert */}
        <button
          onClick={() => handleDismiss(currentTask.id)}
          className="flex items-center justify-center h-10 w-10 rounded-xl bg-slate-900/30 hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
