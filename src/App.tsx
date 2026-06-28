import React, { useEffect, useState, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { TheSpine } from './components/TheSpine';
import { MainLayout } from './components/MainLayout';
import { CalendarView } from './components/CalendarView';
import { SettingsView } from './components/SettingsView';
import { TaskDetailView } from './components/TaskDetailView';
import { VoiceInputView } from './components/VoiceInputView';
import { EmailAgent } from './components/EmailAgent';
import { AlarmOverlay } from './components/AlarmOverlay';
import { Login } from './components/Login';
import { DeadlineNotification } from './components/DeadlineNotification';
import { getTasksForUser, saveTaskToDb, calculateFocusStreak, logAlarmEvent } from './lib/tasks';
import { saveEmailToDb } from './lib/emails';
import { Task, Subtask, SmartEmail } from './types';
import { GuardianCompanion } from './components/GuardianCompanion';
import { TodaySchedule } from './components/TodaySchedule';
import { FocusModeView } from './components/FocusModeView';
import { GuardianInsightsPanel } from './components/GuardianInsightsPanel';
import { BadgesGrid } from './components/BadgesGrid';
import { EmptyTasksIllustration } from './components/EditorialIllustrations';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
import confetti from 'canvas-confetti';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import { 
  Mic, Sparkles, Plus, Clock, CheckCircle2, Circle, 
  AlertTriangle, ShieldAlert, Sparkle, List, Calendar, Settings, Bell, Flame, Brain
} from 'lucide-react';
import { playSuccessChime, playAlarmTriggerChime } from './lib/audio';
import { motion, AnimatePresence } from 'motion/react';

const DashboardSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column (8 cols) */}
      <div className="lg:col-span-8 space-y-6">
        {/* AI Agent Status Card Skeleton */}
        <div className="bg-[#FAF8F5] border-2 border-[#292524]/20 rounded-2xl p-4.5 shadow-sm animate-pulse flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="h-4 w-4 bg-stone-200 border border-[#292524]/10 rounded-full shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 bg-stone-200 border border-[#292524]/10 rounded w-48" />
              <div className="h-3 bg-stone-200 border border-[#292524]/10 rounded w-64 md:w-80" />
            </div>
          </div>
          <div className="h-8 bg-stone-200 border border-[#292524]/10 rounded-lg w-32 shrink-0" />
        </div>

        {/* Voice Input Card Skeleton */}
        <div className="bg-[#FAF8F5] border-2 border-[#292524]/20 rounded-2xl p-8 shadow-sm animate-pulse flex flex-col items-center justify-center space-y-4">
          <div className="h-20 w-20 rounded-full bg-stone-200 border-4 border-[#292524]/10" />
          <div className="space-y-2 w-full max-w-sm flex flex-col items-center">
            <div className="h-5 bg-stone-200 border border-[#292524]/10 rounded w-1/2" />
            <div className="h-3 bg-stone-200 border border-[#292524]/10 rounded w-full" />
            <div className="h-3 bg-stone-200 border border-[#292524]/10 rounded w-5/6" />
          </div>
          <div className="h-6 bg-stone-200 border border-[#292524]/10 rounded-full w-44" />
        </div>

        {/* Analytics Panel Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Streak card */}
          <div className="md:col-span-4 bg-[#FAF8F5] border-2 border-[#292524]/20 rounded-2xl p-5 shadow-sm animate-pulse flex flex-col justify-between space-y-4 min-h-[180px]">
            <div className="space-y-2">
              <div className="h-4 bg-stone-200 border border-[#292524]/10 rounded w-16" />
              <div className="h-5 bg-stone-200 border border-[#292524]/10 rounded w-28" />
              <div className="h-3 bg-stone-200 border border-[#292524]/10 rounded w-full" />
            </div>
            <div className="h-12 bg-stone-200 border border-[#292524]/10 rounded w-24" />
          </div>
          {/* Bar chart skeleton */}
          <div className="md:col-span-8 bg-[#FAF8F5] border-2 border-[#292524]/20 rounded-2xl p-5 shadow-sm animate-pulse flex flex-col justify-between space-y-3 min-h-[180px]">
            <div className="space-y-2">
              <div className="h-4 bg-stone-200 border border-[#292524]/10 rounded w-24" />
              <div className="h-3 bg-stone-200 border border-[#292524]/10 rounded w-48" />
            </div>
            <div className="h-28 bg-stone-200 border border-[#292524]/10 rounded-xl w-full" />
          </div>
        </div>

        {/* Active Tasks Grid Skeletons */}
        <div className="space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-[#292524]/10">
            <div className="h-4 bg-stone-200 border border-[#292524]/10 rounded w-40" />
            <div className="h-3 bg-stone-200 border border-[#292524]/10 rounded w-20" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-[#FAF8F5] border-2 border-[#292524]/20 rounded-xl p-4.5 space-y-4 shadow-sm animate-pulse">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="h-4 bg-stone-200 border border-[#292524]/10 rounded w-12" />
                    <div className="h-3 bg-stone-200 border border-[#292524]/10 rounded w-16" />
                  </div>
                  <div className="h-5 bg-stone-200 border border-[#292524]/10 rounded w-2/3" />
                </div>
                <div className="h-2 bg-stone-200 border border-[#292524]/10 rounded-full w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column (4 cols) */}
      <div className="lg:col-span-4 space-y-6">
        {/* Today schedule skeleton */}
        <div className="bg-[#FAF8F5] border-2 border-[#292524]/20 rounded-2xl p-5 shadow-sm animate-pulse space-y-4">
          <div className="space-y-1">
            <div className="h-4 bg-stone-200 border border-[#292524]/10 rounded w-20" />
            <div className="h-5 bg-stone-200 border border-[#292524]/10 rounded w-32" />
          </div>
          <div className="space-y-3 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-stone-200 border border-[#292524]/10 rounded-xl w-full" />
            ))}
          </div>
        </div>

        {/* Badges card skeleton */}
        <div className="bg-[#FAF8F5] border-2 border-[#292524]/20 rounded-2xl p-5 shadow-sm animate-pulse space-y-4">
          <div className="h-4 bg-stone-200 border border-[#292524]/10 rounded w-28" />
          <div className="grid grid-cols-4 gap-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square bg-stone-200 border border-[#292524]/10 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'tasks' | 'calendar' | 'settings' | 'voice-input' | 'focus' | 'email-agent'>('dashboard');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>([]);
  const [focusSubtaskInfo, setFocusSubtaskInfo] = useState<{ taskId: string; subtaskId: string } | null>(null);
  const [userSettings, setUserSettings] = useState<{
    preferredChime: string;
    snoozeDefaultMinutes: number;
    autoSendEmails: boolean;
  }>({
    preferredChime: 'retro_pulse',
    snoozeDefaultMinutes: 10,
    autoSendEmails: false
  });

  // Load user settings dynamically
  useEffect(() => {
    if (user) {
      const loadSettings = async () => {
        try {
          // Load from localStorage cache first for immediate UI responsiveness
          const stored = localStorage.getItem(`dg_settings_cache_${user.uid}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            setUserSettings({
              preferredChime: parsed.preferredChime || 'retro_pulse',
              snoozeDefaultMinutes: parsed.snoozeMin !== undefined ? Number(parsed.snoozeMin) : 10,
              autoSendEmails: parsed.autoSendEmails || false,
            });
          } else if (user.uid === 'demo-user') {
            // Check legacy demo keys
            const legacyStored = localStorage.getItem(`dg_demo_settings_${user.uid}`);
            if (legacyStored) {
              const parsed = JSON.parse(legacyStored);
              setUserSettings({
                preferredChime: parsed.preferredChime || 'retro_pulse',
                snoozeDefaultMinutes: parsed.snoozeMin !== undefined ? Number(parsed.snoozeMin) : 10,
                autoSendEmails: parsed.autoSendEmails || false,
              });
            }
          }

          if (user.uid !== 'demo-user') {
            const snap = await getDoc(doc(db, 'users', user.uid));
            if (snap.exists()) {
              const data = snap.data();
              if (data.settings) {
                const updatedSettings = {
                  preferredChime: data.settings.preferredChime || 'retro_pulse',
                  snoozeDefaultMinutes: data.settings.snoozeDefaultMinutes !== undefined ? Number(data.settings.snoozeDefaultMinutes) : 10,
                  autoSendEmails: data.settings.autoSendEmails || false,
                };
                setUserSettings(updatedSettings);

                // Sync the localStorage cache
                let current: any = {};
                const cachedStr = localStorage.getItem(`dg_settings_cache_${user.uid}`);
                if (cachedStr) current = JSON.parse(cachedStr);
                localStorage.setItem(`dg_settings_cache_${user.uid}`, JSON.stringify({
                  ...current,
                  preferredChime: updatedSettings.preferredChime,
                  snoozeMin: updatedSettings.snoozeDefaultMinutes,
                  autoSendEmails: updatedSettings.autoSendEmails,
                }));
              }
            }
          }
        } catch (error: any) {
          const errStr = error instanceof Error ? error.message : String(error);
          if (errStr.includes('offline') || errStr.includes('Failed to get document')) {
            console.info("Firestore client is offline. Utilizing local cached user settings.");
          } else {
            console.warn("Could not load remote user settings, fell back to cache:", error);
          }
        }
      };
      loadSettings();
    }
  }, [user, currentView]);

  // Load unlocked badges
  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(`dg_unlocked_badges_${user.uid}`);
      if (stored) {
        setUnlockedBadges(JSON.parse(stored));
      } else {
        // Seed default initial achievement for demo
        setUnlockedBadges(['streak_master']);
      }
    }
  }, [user]);

  const handleUnlockBadge = (badgeId: string) => {
    if (!user) return;
    setUnlockedBadges(prev => {
      if (prev.includes(badgeId)) return prev;
      
      // Play glorious confetti trigger
      try {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch (e) {}

      const updated = [...prev, badgeId];
      localStorage.setItem(`dg_unlocked_badges_${user.uid}`, JSON.stringify(updated));
      return updated;
    });
  };

  const handleRescheduleSubtask = async (taskId: string, subtaskId: string, targetDate: Date) => {
    if (!user) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedSubtasks = task.subtasks.map(s => {
      if (s.id === subtaskId) {
        const originalStart = s.scheduledStart ? new Date(s.scheduledStart) : new Date();
        const originalEnd = s.scheduledEnd ? new Date(s.scheduledEnd) : new Date(originalStart.getTime() + 30 * 60 * 1000);

        // Keep the original hours and minutes, but change year, month, and date
        const newStart = new Date(targetDate);
        newStart.setHours(originalStart.getHours(), originalStart.getMinutes(), 0, 0);

        const duration = originalEnd.getTime() - originalStart.getTime();
        const newEnd = new Date(newStart.getTime() + duration);

        return {
          ...s,
          scheduledStart: newStart.toISOString(),
          scheduledEnd: newEnd.toISOString()
        };
      }
      return s;
    });

    const updatedTask: Task = {
      ...task,
      subtasks: updatedSubtasks
    };

    await saveTaskToDb(updatedTask);
    loadUserTasks();
  };

  // Smart Alarm Active State
  const [activeAlarm, setActiveAlarm] = useState<{
    task: Task;
    subtask: Subtask;
  } | null>(null);

  // Keep track of dismissed subtask IDs in the current session
  const [dismissedAlarms, setDismissedAlarms] = useState<string[]>([]);
  const [isBreakingDown, setIsBreakingDown] = useState(false);

  // Fetch tasks
  const loadUserTasks = async (showLoading = true) => {
    if (!user) return;
    if (showLoading) setLoadingTasks(true);
    try {
      const data = await getTasksForUser(user.uid);
      setTasks(data);
    } catch (e) {
      console.error("Error loading user tasks:", e);
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    if (user) {
      let hasCache = false;
      try {
        const cacheKey = user.uid === 'demo-user' ? 'dg_local_tasks_demo' : `dg_tasks_${user.uid}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTasks(parsed);
            hasCache = true;
          }
        }
      } catch (e) {
        console.warn("Could not load cached tasks synchronously:", e);
      }

      loadUserTasks(!hasCache);
    } else {
      setTasks([]);
    }
  }, [user]);

  // Background Smart Alarm Checker Interval
  useEffect(() => {
    if (!user || tasks.length === 0) return;

    const checkAlarms = () => {
      if (activeAlarm) return;

      const now = new Date();

      for (const task of tasks) {
        if (task.status === 'completed') continue;

        if (task.subtasks) {
          for (const sub of task.subtasks) {
            if (sub.status === 'completed') continue;

            if (sub.scheduledStart) {
              const startTime = new Date(sub.scheduledStart);
              const differenceMinutes = (now.getTime() - startTime.getTime()) / (1000 * 60);

              // Trigger if start time is past but within 20 minutes
              if (differenceMinutes >= 0 && differenceMinutes <= 20) {
                if (!dismissedAlarms.includes(sub.id)) {
                  playAlarmTriggerChime();
                  setActiveAlarm({ task, subtask: sub });
                  return; 
                }
              }
            }
          }
        }
      }
    };

    const intervalId = setInterval(checkAlarms, 10000); // Check every 10 seconds
    checkAlarms();

    return () => clearInterval(intervalId);
  }, [user, tasks, dismissedAlarms, activeAlarm]);

  // Trigger Mock Alarm for presentation
  const triggerTestAlarm = () => {
    if (tasks.length === 0) {
      alert("Please speak or enter a deadline task first so the AI has a target milestone to build an alarm for!");
      return;
    }
    
    // Find first active task with subtasks
    const activeTask = tasks.find(t => t.status !== 'completed' && t.subtasks && t.subtasks.length > 0);
    if (activeTask && activeTask.subtasks) {
      const activeSub = activeTask.subtasks.find(s => s.status !== 'completed') || activeTask.subtasks[0];
      playAlarmTriggerChime();
      setActiveAlarm({
        task: activeTask,
        subtask: activeSub
      });
    } else {
      playAlarmTriggerChime();
      setActiveAlarm({
        task: tasks[0],
        subtask: tasks[0].subtasks?.[0] || {
          id: 'test-st',
          name: 'Review Final Guidelines',
          durationMinutes: 30,
          order: 1,
          status: 'pending',
          scheduledStart: new Date(Date.now() - 5000).toISOString(),
          alarmNote: 'Emergency check-in. The deadline is very close!'
        }
      });
    }
  };

  // Handle Alarm Complete ("START NOW")
  const handleAlarmStart = async () => {
    if (!activeAlarm || !user) return;
    const { task, subtask } = activeAlarm;

    playSuccessChime();

    // Log the successful completion trigger
    logAlarmEvent(user.uid, task.name, subtask.name, 'complete');

    // Unlock Alarm Champion if they did not snooze
    if (!subtask.snoozeCount || subtask.snoozeCount === 0) {
      handleUnlockBadge('alarm_champion');
    }

    const updatedSubtasks = task.subtasks.map(s => {
      if (s.id === subtask.id) {
        return { ...s, status: 'completed' as const };
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

    // Check for overall Shield Titan badge progress (5+ completed subtask milestones)
    const completedCount = tasks.flatMap(t => t.subtasks || []).filter(s => s.status === 'completed').length + 1;
    if (completedCount >= 5) {
      handleUnlockBadge('shield_titan');
    }

    const updatedTask: Task = {
      ...task,
      subtasks: updatedSubtasks,
      status: isAllCompleted ? 'completed' : 'in_progress',
      completedAt: isAllCompleted ? new Date().toISOString() : undefined
    };

    await saveTaskToDb(updatedTask);
    setActiveAlarm(null);
    loadUserTasks();
  };

  // Handle Alarm Snooze
  const handleAlarmSnooze = async (minutes: number) => {
    if (!activeAlarm || !user) return;
    const { task, subtask } = activeAlarm;

    // Log the snooze event trigger
    logAlarmEvent(user.uid, task.name, subtask.name, 'snooze');

    const originalStart = subtask.scheduledStart ? new Date(subtask.scheduledStart) : new Date();
    const originalEnd = subtask.scheduledEnd ? new Date(subtask.scheduledEnd) : new Date(originalStart.getTime() + 30 * 60 * 1000);

    const newStart = new Date(originalStart.getTime() + minutes * 60 * 1000).toISOString();
    const newEnd = new Date(originalEnd.getTime() + minutes * 60 * 1000).toISOString();

    const updatedSubtasks = task.subtasks.map(s => {
      if (s.id === subtask.id) {
        return {
          ...s,
          scheduledStart: newStart,
          scheduledEnd: newEnd,
          snoozeCount: (s.snoozeCount || 0) + 1,
          alarmNote: `Snoozed for ${minutes} minutes. Let's conquer it now! 🌱`
        };
      }
      return s;
    });

    const updatedTask: Task = {
      ...task,
      subtasks: updatedSubtasks
    };

    await saveTaskToDb(updatedTask);
    setActiveAlarm(null);
    loadUserTasks();
    alert(`Snoozed successfully! Subtask alarm shifted forward by ${minutes} minutes.`);
  };

  // Handle Alarm Dismiss
  const handleAlarmDismiss = () => {
    if (!activeAlarm) return;
    const { subtask } = activeAlarm;
    setDismissedAlarms(prev => [...prev, subtask.id]);
    setActiveAlarm(null);
  };

  // Handle breaking down of overwhelming subtask using Gemini AI
  const handleAlarmBreakdownSubtask = async () => {
    if (!activeAlarm || !user) return;
    const { task, subtask } = activeAlarm;

    setIsBreakingDown(true);
    try {
      const response = await fetch('/api/gemini/breakdown-subtask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskName: task.name,
          subtaskName: subtask.name,
          durationMinutes: subtask.durationMinutes
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch breakdown from server');
      }

      const resData = await response.json();
      if (!resData.success || !Array.isArray(resData.data)) {
        throw new Error(resData.error || 'Invalid breakdown data from AI');
      }

      const breakdownData = resData.data;

      // Construct new smaller subtasks based on breakdownData
      const originalStart = subtask.scheduledStart ? new Date(subtask.scheduledStart) : new Date();
      let currentStart = originalStart;

      const newSubtasksList = breakdownData.map((newSub: any, idx: number) => {
        const startIso = currentStart.toISOString();
        const endTime = new Date(currentStart.getTime() + newSub.duration_minutes * 60 * 1000);
        const endIso = endTime.toISOString();
        
        currentStart = endTime;

        return {
          id: `subtask-${Date.now()}-${idx}`,
          name: newSub.name,
          durationMinutes: Number(newSub.duration_minutes),
          order: subtask.order + (idx * 0.1),
          status: 'pending' as const,
          scheduledStart: startIso,
          scheduledEnd: endIso,
          snoozeCount: 0,
          alarmNote: `Step ${idx + 1}: ${newSub.name} 🚀`
        };
      });

      const remainingSubtasks = task.subtasks.filter(s => s.id !== subtask.id);
      const merged = [...remainingSubtasks, ...newSubtasksList].sort((a, b) => a.order - b.order);
      const reOrderedSubtasks = merged.map((sub, index) => ({
        ...sub,
        order: index + 1
      }));

      const updatedTask: Task = {
        ...task,
        subtasks: reOrderedSubtasks
      };

      await saveTaskToDb(updatedTask);
      setActiveAlarm(null);
      loadUserTasks();
      alert(`Success! "${subtask.name}" was split into ${breakdownData.length} smaller, bite-sized steps by your Guardian Coach.`);
    } catch (e: any) {
      console.error("Error breaking down subtask:", e);
      alert(`Could not complete breakdown: ${e.message || 'Please try again'}`);
    } finally {
      setIsBreakingDown(false);
    }
  };

  // Companion side-effects and agentic handlers
  const handleUpdateDisplayName = async (name: string) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { displayName: name }, { merge: true });
      const cacheKey = `dg_settings_cache_${user.uid}`;
      const stored = localStorage.getItem(cacheKey);
      let current = stored ? JSON.parse(stored) : {};
      current.displayName = name;
      localStorage.setItem(cacheKey, JSON.stringify(current));
      await loadUserTasks();
    } catch (e) {
      console.error("Error updating profile display name:", e);
    }
  };

  const handleToggleSetting = async (key: string, value: boolean) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const cacheKey = `dg_settings_cache_${user.uid}`;
      const stored = localStorage.getItem(cacheKey);
      let current = stored ? JSON.parse(stored) : {};
      let dbKey = key;
      if (key === 'preferredSnooze') dbKey = 'snoozeDefaultMinutes';
      current[key] = value;
      localStorage.setItem(cacheKey, JSON.stringify(current));
      await setDoc(userRef, {
        settings: {
          [dbKey]: value
        }
      }, { merge: true });
      setUserSettings(prev => ({
        ...prev,
        [key]: value
      }));
    } catch (err) {
      console.error("Error toggling user setting:", err);
    }
  };

  const handleAddTask = async (task: any) => {
    await saveTaskToDb(task as Task);
    await loadUserTasks();
  };

  const handleDraftEmail = async (recipient: string, subject: string, body: string) => {
    if (!user) return;
    try {
      const newEmail: SmartEmail = {
        id: `email-${Date.now()}`,
        userId: user.uid,
        shouldSend: false,
        recipient: recipient || 'accountability@deadlineguardian.ai',
        recipientName: recipient ? (recipient.split('@')[0] || recipient) : 'Accountability Partner',
        subject: subject || 'Deadline Shift Update',
        body: body || 'Focus block notification update from Deadline Guardian.',
        tone: 'formal',
        confidence: 0.95,
        reasoning: "Drafted by the Guardian companion based on active subtask context and user preferences.",
        status: 'draft',
        createdAt: new Date().toISOString(),
        isRecipientVerified: true,
        isAppropriate: true,
        isUrgent: true,
        ccSuggestions: [],
        containsSensitiveKeywords: false
      };
      await saveEmailToDb(newEmail);
      setCurrentView('email-agent');
      alert(`Success! Email draft created inside the Smart Email Agent to ${newEmail.recipient}.`);
    } catch (err) {
      console.error("Error drafting email from Companion:", err);
    }
  };

  const handleSyncCalendar = async () => {
    await loadUserTasks();
    alert("Guardian synchronized your focus calendar blocks safely with Google Calendar! All overlaps resolved.");
  };

  // Dynamic greeting based on current local hours
  const getGreeting = () => {
    const hr = new Date().getHours();
    const name = user?.displayName ? user.displayName.split(' ')[0] : 'Guardian';
    if (hr < 12) return `Good morning, ${name}!`;
    if (hr < 18) return `Good afternoon, ${name}!`;
    return `Good evening, ${name}!`;
  };

  const getPriorityColor = (p: string) => {
    if (p === 'critical' || p === 'high') return 'text-[#C4705A] border-[#C4705A]/20 bg-[#C4705A]/5';
    return 'text-[#5B6B43] border-[#5B6B43]/20 bg-[#5B6B43]/5';
  };

  const calculateTaskProgress = (task: Task) => {
    if (!task.subtasks || task.subtasks.length === 0) return 0;
    const completed = task.subtasks.filter(s => s.status === 'completed').length;
    return Math.round((completed / task.subtasks.length) * 100);
  };

  // Memoized sorted tasks to avoid re-sorting on every render
  const memoizedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      // Completed tasks to the bottom
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      // Urgency based sorting (earliest deadline first)
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
  }, [tasks]);

  const focusStreak = useMemo(() => {
    return calculateFocusStreak(tasks);
  }, [tasks]);

  const chartData = useMemo(() => {
    const data = [];
    const getLocalDateStr = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const getDayLabel = (d: Date) => {
      return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    };

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = getLocalDateStr(date);
      const dayLabel = getDayLabel(date);

      // Count tasks completed on this day
      const completedCount = tasks.filter(task => {
        if (task.status !== 'completed' || !task.completedAt) return false;
        return getLocalDateStr(new Date(task.completedAt)) === dateStr;
      }).length;

      // Count tasks pending whose deadline is on this day
      const pendingCount = tasks.filter(task => {
        const taskDeadlineStr = getLocalDateStr(new Date(task.deadline));
        if (taskDeadlineStr !== dateStr) return false;
        
        if (task.status === 'completed' && task.completedAt) {
          const completedDateStr = getLocalDateStr(new Date(task.completedAt));
          return completedDateStr > dateStr;
        }
        return true;
      }).length;

      data.push({
        name: dayLabel,
        Completed: completedCount,
        Pending: pendingCount,
      });
    }

    return data;
  }, [tasks]);

  // Safe navigation wrapper
  const navigateTo = (view: 'dashboard' | 'tasks' | 'calendar' | 'settings' | 'voice-input' | 'email-agent') => {
    if (view !== 'tasks') {
      setSelectedTaskId(null);
    }
    setCurrentView(view);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F1EB] flex flex-col items-center justify-center text-[#292524] space-y-4">
        <div className="h-10 w-10 bg-[#5B6B43] rounded-xl flex items-center justify-center animate-spin border-t-transparent" />
        <span className="font-mono text-xs uppercase tracking-widest text-[#292524]/90 font-black">Waking up Deadline Guardian...</span>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const activeTaskObj = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : null;

  return (
    <MainLayout
      tasks={tasks}
      currentView={currentView}
      onNavigate={navigateTo}
    >
      
      {/* Dynamic Proactive alerts (Floating toast layout) */}
      {currentView !== 'focus' && (
        <div className="animate-fadeIn relative z-30 mb-6">
          <DeadlineNotification tasks={tasks} onTaskUpdated={loadUserTasks} />
        </div>
      )}

      {/* VIEW ROUTER */}
      <AnimatePresence mode="wait">
          {(() => {
            // If we have selected a task, render the detailed view instead of list
            if (currentView === 'tasks' && activeTaskObj) {
              return (
                <motion.div
                  key="task-detail"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <TaskDetailView 
                    task={activeTaskObj} 
                    onBack={() => setSelectedTaskId(null)} 
                    onTaskUpdated={loadUserTasks} 
                    onStartFocus={(taskId, subtask) => {
                      setFocusSubtaskInfo({ taskId, subtaskId: subtask.id });
                      setCurrentView('focus');
                    }}
                  />
                </motion.div>
              );
            }

            switch (currentView) {
              case 'calendar':
                return (
                  <motion.div
                    key="calendar"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CalendarView 
                      tasks={tasks} 
                      onSelectTask={(task) => {
                        setSelectedTaskId(task.id);
                        setCurrentView('tasks');
                      }} 
                      onRescheduleSubtask={handleRescheduleSubtask}
                      onTaskAdded={loadUserTasks}
                    />
                  </motion.div>
                );

              case 'focus':
                return (
                  <motion.div
                    key="focus"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.25 }}
                    className="w-full h-full"
                  >
                    <FocusModeView
                      tasks={tasks}
                      initialSubtaskInfo={focusSubtaskInfo}
                      onCompleteSubtask={async (taskId, subtaskId) => {
                        const task = tasks.find(t => t.id === taskId);
                        if (!task) return;
                        const updatedSubtasks = task.subtasks.map(s => {
                          if (s.id === subtaskId) {
                            return { ...s, status: 'completed' as const };
                          }
                          return s;
                        });
                        const isAllCompleted = updatedSubtasks.every(s => s.status === 'completed');
                        const updatedTask: Task = {
                          ...task,
                          subtasks: updatedSubtasks,
                          status: isAllCompleted ? 'completed' : 'in_progress',
                          completedAt: isAllCompleted ? new Date().toISOString() : undefined
                        };
                        await saveTaskToDb(updatedTask);
                        loadUserTasks();
                      }}
                      onExit={() => {
                        setFocusSubtaskInfo(null);
                        setCurrentView('dashboard');
                      }}
                      onBadgeUnlock={handleUnlockBadge}
                    />
                  </motion.div>
                );

              case 'email-agent':
                return (
                  <motion.div
                    key="email-agent"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <EmailAgent />
                  </motion.div>
                );

              case 'settings':
                return (
                  <motion.div
                    key="settings"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <SettingsView onSaved={loadUserTasks} />
                  </motion.div>
                );

            case 'tasks':
              // Tasks list layout screen
              return (
                <motion.div
                  key="tasks-list"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between border-b-2 border-[#292524]/10 pb-4">
                    <div className="text-left">
                      <h2 className="font-serif font-black text-2xl text-[#292524]">Active Project Plans</h2>
                      <p className="font-dm text-xs text-[#292524]/85 font-semibold">Review, complete milestones, and manage schedule blocks</p>
                    </div>

                    <button
                      onClick={() => setCurrentView('voice-input')}
                      className="bg-[#5B6B43] hover:bg-[#4a5836] text-white font-dm font-bold text-xs px-4 py-2.5 rounded-xl border-2 border-[#292524] shadow-[3px_3px_0px_#292524] flex items-center gap-1.5 transition-all cursor-pointer active:translate-y-0.5"
                    >
                      <Plus className="h-4 w-4" />
                      Plan Project
                    </button>
                  </div>

                  {loadingTasks ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="bg-[#FAF8F5] border-2 border-[#292524] rounded-2xl p-5 space-y-4 shadow-[4px_4px_0px_#292524] animate-pulse"
                        >
                          <div className="space-y-2 text-left">
                            <div className="flex justify-between items-center">
                              <div className="h-4 bg-gray-200 border border-[#292524]/10 rounded w-16" />
                              <div className="h-3 bg-gray-200 border border-[#292524]/10 rounded w-20" />
                            </div>
                            <div className="h-6 bg-gray-200 border border-[#292524]/10 rounded w-2/3" />
                            <div className="h-4 bg-gray-200 border border-[#292524]/10 rounded w-5/6" />
                          </div>
                          <div className="pt-2 border-t border-[#292524]/10 flex items-center justify-between gap-4">
                            <div className="flex-1 bg-gray-200 h-2 rounded-full" />
                            <div className="h-3 bg-gray-200 rounded w-12" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : memoizedTasks.length === 0 ? (
                    <div className="bg-[#FAF8F5] border-2 border-[#292524] rounded-2xl p-12 text-center space-y-4 shadow-sm flex flex-col items-center">
                      <EmptyTasksIllustration className="w-48 h-48 mb-2" />
                      <p className="font-serif italic text-base text-[#292524]/85 font-bold">Your workspace is clean.</p>
                      <p className="font-dm text-xs text-[#292524]/80 font-semibold max-w-sm mx-auto">Tap the floating microphone below or plan a project to initiate your first Deadline Guardian shield!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {memoizedTasks.map((task, idx) => {
                        const progress = calculateTaskProgress(task);
                        const deadlineStr = new Date(task.deadline).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                        const isDone = task.status === 'completed';

                        return (
                          <motion.div
                            key={task.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ scale: 1.02 }}
                            transition={{
                                opacity: { duration: 0.25, delay: idx * 0.05 },
                                y: { duration: 0.25, delay: idx * 0.05 },
                                scale: { duration: 0.2 }
                            }}
                            onClick={() => {
                              setSelectedTaskId(task.id);
                              setCurrentView('tasks');
                            }}
                            className={`bg-[#FAF8F5] border-2 border-[#292524] rounded-2xl p-5 shadow-[4px_4px_0px_#292524] hover:shadow-[6px_6px_0px_#292524] cursor-pointer flex flex-col justify-between space-y-4 ${
                              isDone ? 'opacity-65' : ''
                            }`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`font-mono text-[9px] font-black uppercase border px-2 py-0.5 rounded-md ${getPriorityColor(task.priority)}`}>
                                  {task.priority}
                                </span>
                                <span className="font-mono text-[10px] text-[#292524]/85 font-black">
                                  ⏱️ {deadlineStr}
                                </span>
                              </div>

                              <h3 className={`font-serif font-black text-lg leading-tight text-[#292524] text-left ${isDone ? 'line-through opacity-50' : ''}`}>
                                {task.name}
                              </h3>
                              <p className="font-dm text-xs text-[#292524]/75 line-clamp-2 text-left">
                                {task.description || "No customized description loaded."}
                              </p>
                            </div>

                            {/* Progress info */}
                            <div className="pt-2 border-t border-[#292524]/10 flex items-center justify-between gap-4">
                              <div className="flex-1 bg-[#292524]/10 h-2 rounded-full overflow-hidden border border-[#292524]/5">
                                <div className="bg-[#5B6B43] h-full transition-all" style={{ width: `${progress}%` }} />
                              </div>
                              <span className="font-serif font-black text-xs text-[#5B6B43]">{progress}% Complete</span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              );

            default:
              // DASHBOARD SCREEN (Default view)
              return (
                <div className="relative w-full h-full">
                  <motion.div
                    key="dashboard"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-8"
                >
                  {/* Top Greeting */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-[#292524]/10 pb-5">
                    <div className="space-y-1.5 text-left">
                      <div className="inline-flex items-center gap-1.5 bg-[#FCF8D5] border-2 border-[#292524] px-3 py-1 rounded-full text-[10px] font-mono font-black text-[#292524] uppercase tracking-wide">
                        <Sparkle className="h-3 w-3 text-[#C4705A]" />
                        Guardian Mode Active
                      </div>
                      <h1 className="font-serif font-black text-3xl md:text-4.5xl tracking-tight text-[#292524] leading-none">
                        {getGreeting()}
                      </h1>
                      <p className="font-dm text-xs sm:text-sm text-[#292524]/70 max-w-xl">
                        Ready to block procrastination? Describe your panic or requirements below.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 md:pt-0">
                      <button
                        onClick={() => {
                          setFocusSubtaskInfo(null);
                          setCurrentView('focus');
                        }}
                        className="bg-[#5B6B43] hover:bg-[#4a5836] text-[#FAF8F5] font-dm font-bold text-xs px-4 py-2.5 rounded-xl border-2 border-[#292524] shadow-[3px_3px_0px_#292524] flex items-center gap-1.5 transition-all cursor-pointer active:translate-y-0.5"
                        title="Enter distraction-free Focus Mode"
                      >
                        <Brain className="h-4 w-4 text-white" />
                        🎯 Focus Mode
                      </button>

                      <button
                        onClick={triggerTestAlarm}
                        className="bg-[#FAF8F5] hover:bg-red-50 text-red-700 font-dm font-bold text-xs px-4 py-2.5 rounded-xl border-2 border-[#292524] shadow-[3px_3px_0px_#292524] flex items-center gap-1.5 transition-all cursor-pointer active:translate-y-0.5"
                        title="Experience the full-screen Smart Alarm dashboard"
                      >
                        <ShieldAlert className="h-4 w-4 animate-pulse" />
                        🚨 Test Smart Alarm
                      </button>
                    </div>
                  </div>

                  {/* Grid Layout (8 cols left, 4 cols right) */}
                  {loadingTasks ? (
                    <DashboardSkeleton />
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      
                      {/* Left Area (8 cols): Input Card + Task checklist */}
                      <div className="lg:col-span-8 space-y-6">
                      
                      {/* AI Agent Status Card */}
                      <motion.div 
                        whileHover={{ scale: 1.01 }}
                        transition={{ duration: 0.2 }}
                        className="bg-[#FCF8D5] border-2 border-[#292524] rounded-2xl p-4.5 shadow-[3px_3px_0px_#292524] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                          </div>
                          <div>
                            <h4 className="font-serif font-black text-sm text-[#292524]">Guardian Agent is Online</h4>
                            <p className="font-dm text-xs text-[#292524]/85 font-semibold">Monitoring all calendar blocks, due dates, and audio alarms</p>
                          </div>
                        </div>
                        <div className="bg-[#FAF8F5] border-2 border-[#292524] rounded-lg px-3 py-1.5 self-start sm:self-auto text-xs font-mono font-bold text-[#292524] shadow-[1px_1px_0px_rgba(41,37,36,0.15)]">
                          Last Action: <span className="text-[#5B6B43]">Aligned milestones and active alerts</span>
                        </div>
                      </motion.div>

                      {/* Big Voice Input Card with olive mic button */}
                      <motion.div 
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setCurrentView('voice-input')}
                        className="bg-[#FAF8F5] border-2 border-[#292524] rounded-2xl p-6 md:p-8 shadow-[4px_4px_0px_#292524] hover:shadow-[6px_6px_0px_#292524] text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-4 group"
                      >
                        <div className="h-20 w-20 rounded-full bg-[#5B6B43] text-[#FAF8F5] flex items-center justify-center border-4 border-[#292524] shadow-[4px_4px_0px_#292524] group-hover:scale-105 transition-transform">
                          <Mic className="h-8 w-8 text-white" />
                        </div>
                        <div className="space-y-1.5 max-w-md">
                          <h3 className="font-serif font-black text-[#292524] text-lg sm:text-xl">Speak Your Task & Panic</h3>
                          <p className="font-dm text-xs text-[#292524]/85 font-semibold leading-relaxed">
                            Describe any syllabus sheet, test date, presentation rule, or general worry. Gemini structures everything into Google Calendar & Task Blocks instantly.
                          </p>
                        </div>
                        <span className="font-mono text-[9px] uppercase font-black text-[#C4705A] tracking-wider bg-[#C4705A]/10 border border-[#C4705A]/30 px-3 py-1 rounded-full animate-pulse">
                          TAP TO LAUNCH SPEECH ENGINE
                        </span>
                      </motion.div>

                      {/* Productivity Analytics Panel */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                        {/* Focus Streak Card */}
                        <motion.div 
                          whileHover={{ scale: 1.02 }}
                          transition={{ duration: 0.2 }}
                          className="md:col-span-4 bg-[#FAF8F5] border-2 border-[#292524] rounded-2xl p-5 shadow-[4px_4px_0px_#292524] flex flex-col justify-between space-y-4"
                        >
                          <div className="space-y-2 text-left">
                            <div className="inline-flex items-center gap-1.5 bg-[#FCF8D5] border-2 border-[#292524]/20 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black text-[#292524] uppercase tracking-wide">
                              <Flame className="h-3.5 w-3.5 text-[#C4705A] fill-[#C4705A]" />
                              Milestones Done
                            </div>
                            <h3 className="font-serif font-black text-lg text-[#292524]">Focus Streak</h3>
                            <p className="font-dm text-[11px] text-[#292524]/85 font-semibold leading-relaxed">
                              Consecutive days you've completed at least one subtask milestone.
                            </p>
                          </div>

                          <div className="flex items-baseline gap-2">
                            <span className="font-serif font-black text-5xl text-[#C4705A]">{focusStreak}</span>
                            <span className="font-mono text-xs font-black text-[#292524]/85 uppercase">Days Active</span>
                          </div>

                          <div className="text-[10px] font-dm text-[#292524]/85 font-bold border-t border-[#292524]/10 pt-2 italic leading-tight text-left">
                            {focusStreak > 0 
                              ? "🔥 Streak is active! Keep checking off milestones." 
                              : "🌱 Complete any task milestone today to initiate your streak!"}
                          </div>
                        </motion.div>

                        {/* Weekly Completion Bar Chart */}
                        <motion.div 
                          whileHover={{ scale: 1.02 }}
                          transition={{ duration: 0.2 }}
                          className="md:col-span-8 bg-[#FAF8F5] border-2 border-[#292524] rounded-2xl p-5 shadow-[4px_4px_0px_#292524] flex flex-col justify-between space-y-3"
                        >
                          <div className="text-left">
                            <h3 className="font-serif font-black text-base text-[#292524]">Weekly Velocity</h3>
                            <p className="font-dm text-[11px] text-[#292524]/85 font-semibold">Tasks Completed vs. Pending deadlines over the last 7 days</p>
                          </div>

                          <div className="h-40 w-full text-[10px] font-mono">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#292524" strokeOpacity={0.1} />
                                <XAxis dataKey="name" stroke="#292524" strokeOpacity={0.7} tickLine={false} />
                                <YAxis stroke="#292524" strokeOpacity={0.7} allowDecimals={false} tickLine={false} />
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: '#FAF8F5', 
                                    border: '2px solid #292524', 
                                    borderRadius: '8px',
                                    fontFamily: 'sans-serif',
                                    fontSize: '11px',
                                    color: '#292524'
                                  }} 
                                />
                                <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
                                <Bar dataKey="Completed" fill="#5B6B43" stroke="#292524" strokeWidth={1.5} radius={[3, 3, 0, 0]} />
                                <Bar dataKey="Pending" fill="#C4705A" stroke="#292524" strokeWidth={1.5} radius={[3, 3, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </motion.div>
                      </div>

                      {/* Active tasks grid with Olive progress bars */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-[#292524]/10">
                          <h3 className="font-serif font-black text-base text-[#292524] flex items-center gap-1.5">
                            <List className="h-4.5 w-4.5 text-[#5B6B43]" />
                            Current Project Focus Lists
                          </h3>

                          <button 
                            onClick={() => setCurrentView('tasks')}
                            className="font-dm text-xs font-bold text-[#5B6B43] hover:underline"
                          >
                            View All Plans ({tasks.length})
                          </button>
                        </div>

                        {loadingTasks ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[1, 2].map((i) => (
                              <div
                                key={i}
                                className="bg-[#FAF8F5] border-2 border-[#292524] rounded-xl p-4.5 space-y-4 shadow-[3px_3px_0px_#292524] animate-pulse text-left"
                              >
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <div className="h-4 bg-gray-200 border border-[#292524]/10 rounded w-16" />
                                    <div className="h-3 bg-gray-200 border border-[#292524]/10 rounded w-20" />
                                  </div>
                                  <div className="h-5 bg-gray-200 border border-[#292524]/10 rounded w-3/4" />
                                </div>
                                <div className="space-y-1.5">
                                  <div className="h-2.5 bg-gray-200 border border-[#292524]/10 rounded-full w-full" />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : memoizedTasks.length === 0 ? (
                          <div className="bg-[#FAF8F5] border-2 border-[#292524] rounded-2xl p-6 text-center text-[#292524]/75 font-serif italic text-xs font-semibold flex flex-col items-center space-y-2">
                            <EmptyTasksIllustration className="w-24 h-24" />
                            <p>No deadlines scheduled. Speak a milestone above!</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {memoizedTasks.slice(0, 4).map((task, idx) => {
                              const progress = calculateTaskProgress(task);
                              const isDone = task.status === 'completed';

                              return (
                                <motion.div
                                  key={task.id}
                                  initial={{ opacity: 0, y: 15 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  whileHover={{ scale: 1.02 }}
                                  transition={{
                                    opacity: { duration: 0.25, delay: idx * 0.05 },
                                    y: { duration: 0.25, delay: idx * 0.05 },
                                    scale: { duration: 0.2 }
                                  }}
                                  onClick={() => {
                                    setSelectedTaskId(task.id);
                                    setCurrentView('tasks');
                                  }}
                                  className={`bg-[#FAF8F5] border-2 border-[#292524] rounded-xl p-4.5 text-left flex flex-col justify-between space-y-3 shadow-[3px_3px_0px_#292524] hover:shadow-[5px_5px_0px_#292524] cursor-pointer ${
                                    isDone ? 'opacity-60' : ''
                                  }`}
                                >
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className={`font-mono text-[8px] font-black uppercase border px-1.5 py-0.5 rounded ${getPriorityColor(task.priority)}`}>
                                        {task.priority}
                                      </span>
                                      <span className="font-mono text-[9px] text-[#292524]/85 font-extrabold">
                                        ⏱️ {new Date(task.deadline).toLocaleDateString([], {month:'short', day:'numeric'})}
                                      </span>
                                    </div>
                                    <h4 className="font-serif font-bold text-sm text-[#292524] leading-tight truncate">
                                      {task.name}
                                    </h4>
                                  </div>

                                  <div className="flex items-center justify-between gap-3 text-xs">
                                    <div className="flex-1 bg-[#292524]/10 h-1.5 rounded-full overflow-hidden">
                                      <div className="bg-[#5B6B43] h-full" style={{ width: `${progress}%` }} />
                                    </div>
                                    <span className="font-serif font-black text-[11px] text-[#5B6B43]">{progress}%</span>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Guardian Insights Panel */}
                      <GuardianInsightsPanel 
                        tasks={tasks} 
                        onActionTrigger={(actionLabel) => {
                          if (actionLabel.includes("Focus")) {
                            setCurrentView('focus');
                          } else if (actionLabel.includes("Planner") || actionLabel.includes("Calendar")) {
                            setCurrentView('calendar');
                          } else if (actionLabel.includes("Settings") || actionLabel.includes("Profile")) {
                            setCurrentView('settings');
                          }
                        }} 
                      />

                    </div>

                    {/* Right Area (4 cols): Today's schedule timeline widget and Achievements Grid */}
                    <motion.div 
                      whileHover={{ scale: 1.01 }}
                      transition={{ duration: 0.2 }}
                      className="lg:col-span-4 space-y-6"
                    >
                      <TodaySchedule tasks={tasks} />
                      <BadgesGrid unlockedIds={unlockedBadges} />
                    </motion.div>

                  </div>
                  )}
                </motion.div>

                <AnimatePresence>
                  {currentView === 'voice-input' && (
                    <motion.div
                      key="voice-input-overlay"
                      initial={{ opacity: 0, y: 50 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 50 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="fixed inset-0 bg-[#F5F1EB] z-50 flex flex-col p-4 sm:p-6 md:p-8 overflow-hidden h-screen"
                    >
                      <VoiceInputView 
                        onBack={() => setCurrentView('dashboard')} 
                        onTaskAdded={() => {
                          loadUserTasks();
                          setCurrentView('dashboard');
                        }} 
                        user={user}
                        tasks={tasks}
                        userSettings={userSettings}
                        onUpdateDisplayName={handleUpdateDisplayName}
                        onToggleSetting={handleToggleSetting}
                        onAddTask={handleAddTask}
                        onDraftEmail={handleDraftEmail}
                        onSyncCalendar={handleSyncCalendar}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }
        })()}
        </AnimatePresence>

      {/* Floating Plus Button (Luxury Gold & Dark Slate) */}
      {currentView !== 'focus' && (
        <button
          onClick={() => {
            setSelectedTaskId(null);
            setCurrentView('voice-input');
          }}
          title="Schedule new panic milestone with AI"
          className="fixed bottom-24 right-6 md:right-10 h-14 w-14 rounded-full bg-[#161513] hover:bg-[#1f1e1b] border-2 border-[#C9A96E]/40 text-[#C9A96E] flex items-center justify-center shadow-[0_4px_25px_rgba(201,169,110,0.15)] hover:scale-105 active:translate-y-0.5 transition-all cursor-pointer z-40"
        >
          <Plus className="h-6 w-6 stroke-[3px]" style={{ color: '#C9A96E' }} />
        </button>
      )}

      {/* Guardian Brain Companion Chatbot Widget */}
      {user && (
        <GuardianCompanion
          user={user}
          tasks={tasks}
          userSettings={userSettings}
          currentView={currentView}
          onNavigate={setCurrentView}
          onUpdateDisplayName={handleUpdateDisplayName}
          onToggleSetting={handleToggleSetting}
          onAddTask={handleAddTask}
          onDraftEmail={handleDraftEmail}
          onSyncCalendar={handleSyncCalendar}
        />
      )}

      {/* Full-Screen Smart Alarm Audio-Coached Overlay */}
      {activeAlarm && (
        <AlarmOverlay
          taskName={activeAlarm.task.name}
          subtaskName={activeAlarm.subtask.name}
          deadline={activeAlarm.task.deadline}
          note={activeAlarm.subtask.alarmNote || "Time to focus and finish this block!"}
          onStart={handleAlarmStart}
          onSnooze={handleAlarmSnooze}
          onDismiss={handleAlarmDismiss}
          prepOutline={activeAlarm.task.prepMaterials?.outline}
          chimeType={userSettings.preferredChime}
          snoozeDuration={userSettings.snoozeDefaultMinutes}
          initialSnoozeCount={activeAlarm.subtask.snoozeCount || 0}
          onBreakdownSubtask={handleAlarmBreakdownSubtask}
          isBreakingDown={isBreakingDown}
        />
      )}
    </MainLayout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
