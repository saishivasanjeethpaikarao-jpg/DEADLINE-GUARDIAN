import React, { useState, useEffect, useRef } from 'react';
import { Task, Subtask } from '../types';
import { 
  Play, Pause, RotateCcw, Volume2, VolumeX, ArrowLeft, CheckCircle2, Award, Sparkles, Brain, Wind 
} from 'lucide-react';
import { playSuccessChime, playAmbientFocusHum, stopAmbientFocusHum } from '../lib/audio';
import confetti from 'canvas-confetti';

interface FocusModeViewProps {
  tasks: Task[];
  initialSubtaskInfo?: { taskId: string; subtaskId: string } | null;
  onCompleteSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  onExit: () => void;
  onBadgeUnlock?: (badgeId: string) => void;
}

export const FocusModeView: React.FC<FocusModeViewProps> = ({ 
  tasks, 
  initialSubtaskInfo,
  onCompleteSubtask, 
  onExit,
  onBadgeUnlock 
}) => {
  // Find initial subtask if preselected
  const getPreselectedSubtask = () => {
    if (!initialSubtaskInfo) return null;
    const task = tasks.find(t => t.id === initialSubtaskInfo.taskId);
    if (!task) return null;
    const subtask = task.subtasks.find(s => s.id === initialSubtaskInfo.subtaskId);
    if (!subtask) return null;
    return { task, subtask };
  };

  const preselected = getPreselectedSubtask();

  // Selected subtask state
  const [selectedTask, setSelectedTask] = useState<Task | null>(preselected?.task || null);
  const [selectedSubtask, setSelectedSubtask] = useState<Subtask | null>(preselected?.subtask || null);

  // Focus duration options
  const [isDemoMode, setIsDemoMode] = useState(true); // default to 1 min demo sprint for quick hackathon review
  const [duration, setDuration] = useState(60); // seconds
  const [timeLeft, setTimeLeft] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Sound focus hum state
  const [soundOn, setSoundOn] = useState(false);

  // Breathing state: 'inhale' | 'hold' | 'exhale' | 'rest'
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale' | 'rest'>('inhale');
  const [breathCounter, setBreathCounter] = useState(4);

  // Timer Ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const breathTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Flatten all pending subtasks for dropdown selector
  const allPendingSubtasks = tasks.flatMap(task => 
    (task.subtasks || [])
      .filter(st => st.status !== 'completed')
      .map(st => ({ task, subtask: st }))
  );

  // Update duration when changing demo vs pomodoro
  useEffect(() => {
    const secs = isDemoMode ? 60 : 25 * 60;
    setDuration(secs);
    setTimeLeft(secs);
    setIsTimerRunning(false);
  }, [isDemoMode]);

  // Handle ambient hum side-effects
  useEffect(() => {
    if (soundOn && isTimerRunning) {
      playAmbientFocusHum();
    } else {
      stopAmbientFocusHum();
    }
    return () => {
      stopAmbientFocusHum();
    };
  }, [soundOn, isTimerRunning]);

  // Main countdown timer effect
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleFocusSuccess();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  // Rhythmic breathing visualizer effect
  useEffect(() => {
    if (isTimerRunning) {
      breathTimerRef.current = setInterval(() => {
        setBreathCounter(prev => {
          if (prev <= 1) {
            // transition phase
            setBreathPhase(current => {
              switch (current) {
                case 'inhale': return 'hold';
                case 'hold': return 'exhale';
                case 'exhale': return 'rest';
                default: return 'inhale';
              }
            });
            return 4; // 4s box breathing interval
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (breathTimerRef.current) clearInterval(breathTimerRef.current);
    }

    return () => {
      if (breathTimerRef.current) clearInterval(breathTimerRef.current);
    };
  }, [isTimerRunning]);

  const handleFocusSuccess = async () => {
    setIsTimerRunning(false);
    stopAmbientFocusHum();
    setSoundOn(false);

    // Audio chime & Confetti spray
    playSuccessChime();
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.55 },
      colors: ['#5B6B43', '#C4705A', '#ffffff', '#292524']
    });

    if (selectedTask && selectedSubtask) {
      await onCompleteSubtask(selectedTask.id, selectedSubtask.id);
    }

    // Trigger Focus Master and Early Bird milestone badges
    if (onBadgeUnlock) {
      onBadgeUnlock('focus_master');
      
      const hour = new Date().getHours();
      if (hour < 9) {
        onBadgeUnlock('early_bird');
      }
    }

    alert("✨ SPLENDID EFFORT! You completed your focus sprint block without distractions! The Milestone is checked off.");
    onExit();
  };

  const handleSubtaskSelect = (val: string) => {
    if (!val) {
      setSelectedTask(null);
      setSelectedSubtask(null);
      return;
    }
    const [taskId, subtaskId] = val.split('|');
    const matched = allPendingSubtasks.find(x => x.task.id === taskId && x.subtask.id === subtaskId);
    if (matched) {
      setSelectedTask(matched.task);
      setSelectedSubtask(matched.subtask);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  const getBreathInstructions = () => {
    switch (breathPhase) {
      case 'inhale': return { text: 'Breathe In... 🌬️', sizeClass: 'scale-130 bg-teal-500/20 shadow-[0_0_50px_rgba(20,184,166,0.3)]' };
      case 'hold': return { text: 'Hold... ⚓', sizeClass: 'scale-130 bg-indigo-500/20 shadow-[0_0_50px_rgba(99,102,241,0.3)]' };
      case 'exhale': return { text: 'Breathe Out... 🍃', sizeClass: 'scale-90 bg-[#C4705A]/20 shadow-[0_0_50px_rgba(196,112,90,0.3)]' };
      default: return { text: 'Pause... 🧘', sizeClass: 'scale-100 bg-[#5B6B43]/20 shadow-[0_0_30px_rgba(91,107,67,0.3)]' };
    }
  };

  const breathGuide = getBreathInstructions();
  const progressPercent = ((duration - timeLeft) / duration) * 100;

  return (
    <div className="fixed inset-0 bg-[#0c0a09] text-stone-100 z-50 flex flex-col p-6 overflow-y-auto text-center font-sans">
      
      {/* Top action header */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between py-2 border-b border-stone-800">
        <button
          onClick={() => {
            stopAmbientFocusHum();
            onExit();
          }}
          className="flex items-center gap-2 text-stone-400 hover:text-stone-100 font-mono text-xs uppercase tracking-wider transition-all cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Abandon Focus
        </button>

        <div className="flex items-center gap-1 bg-stone-900 border border-stone-800 rounded-full px-3 py-1 font-mono text-[10px] text-stone-400 font-bold uppercase tracking-wider">
          <Brain className="h-3.5 w-3.5 text-teal-400 animate-pulse" />
          Shield Active
        </div>
      </div>

      {/* Main Focus Centerpiece */}
      <div className="max-w-xl mx-auto w-full flex-1 flex flex-col items-center justify-center py-8 space-y-8">
        
        {/* Selector Header or active header info */}
        <div className="space-y-3.5 w-full">
          {selectedSubtask ? (
            <div className="space-y-1.5">
              <span className="font-mono text-[10px] text-teal-400 font-black uppercase tracking-widest block">
                🎯 CURRENT FOCUS MILESTONE
              </span>
              <h2 className="font-serif font-black text-2xl tracking-tight text-white leading-tight">
                {selectedSubtask.name}
              </h2>
              <span className="font-dm text-xs text-stone-400 block">
                Associated plan: <strong className="text-stone-200">{selectedTask?.name}</strong>
              </span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1">
                <h2 className="font-serif font-black text-xl text-white">Select a task to initiate Focus Mode</h2>
                <p className="font-dm text-xs text-stone-400">Zero distractions, offline ambient sounds, auto-checks on completion</p>
              </div>

              <select
                onChange={(e) => handleSubtaskSelect(e.target.value)}
                defaultValue=""
                className="w-full bg-stone-900 border-2 border-stone-800 rounded-xl px-4 py-3 text-xs text-stone-200 focus:outline-none focus:border-teal-500 font-dm shadow-sm"
              >
                <option value="">-- Choose an active subtask milestone --</option>
                {allPendingSubtasks.map(({ task, subtask }) => (
                  <option key={subtask.id} value={`${task.id}|${subtask.id}`}>
                    [{task.priority.toUpperCase()}] {subtask.name} ({task.name})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Breathing Circle and Timer Layout Side by Side or Stacked */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-10 md:gap-16 py-4 w-full">
          
          {/* Circular Countdown Timer */}
          <div className="relative h-44 w-44 flex items-center justify-center select-none">
            {/* SVG Progress Circle Background */}
            <svg className="absolute inset-0 w-full h-full transform -rotate-90">
              <circle
                cx="88"
                cy="88"
                r="80"
                stroke="#1c1917"
                strokeWidth="6"
                fill="transparent"
              />
              <circle
                cx="88"
                cy="88"
                r="80"
                stroke="#0d9488"
                strokeWidth="6"
                fill="transparent"
                strokeDasharray={502.6}
                strokeDashoffset={502.6 - (502.6 * progressPercent) / 100}
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
            <div className="z-10 space-y-1">
              <span className="font-serif font-black text-4xl text-white tracking-tighter block">
                {formatTime(timeLeft)}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-wider text-stone-400 block font-bold">
                {isTimerRunning ? "Sprinting" : "Paused"}
              </span>
            </div>
          </div>

          {/* Breathing Visualizer Ring */}
          <div className="flex flex-col items-center space-y-3.5">
            <div 
              className={`h-28 w-28 rounded-full border-2 border-stone-800 flex items-center justify-center transition-all duration-1000 ease-in-out ${breathGuide.sizeClass}`}
            >
              <div className="space-y-0.5 text-center px-2">
                <span className="font-mono text-[10px] text-white block font-black leading-tight">
                  {breathGuide.text}
                </span>
                {isTimerRunning && (
                  <span className="font-mono text-[9px] text-stone-400 block font-bold">
                    {breathCounter}s
                  </span>
                )}
              </div>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-wider text-stone-500 flex items-center gap-1 font-bold">
              <Wind className="h-3 w-3 text-teal-400 shrink-0" />
              Box Breathing Guide
            </span>
          </div>

        </div>

        {/* Controls Console */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 w-full space-y-4">
          <div className="flex items-center justify-between gap-4">
            
            {/* Play/Pause Button */}
            <button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              disabled={!selectedSubtask}
              className={`flex-1 font-mono text-[11px] font-black uppercase tracking-wider py-3 px-4 rounded-xl border-2 cursor-pointer transition-all active:translate-y-0.5 flex items-center justify-center gap-2 ${
                !selectedSubtask 
                  ? 'opacity-40 border-stone-800 text-stone-500 bg-transparent'
                  : isTimerRunning
                  ? 'bg-stone-900 hover:bg-stone-800 border-[#C4705A] text-[#C4705A] shadow-[4px_4px_0px_#C4705A]'
                  : 'bg-teal-600 hover:bg-teal-500 border-stone-950 text-white shadow-[4px_4px_0px_rgba(0,0,0,0.6)]'
              }`}
            >
              {isTimerRunning ? (
                <>
                  <Pause className="h-4 w-4 fill-[#C4705A]" />
                  Pause Focus
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-white" />
                  Initiate Focus
                </>
              )}
            </button>

            {/* Stop/Reset Timer */}
            <button
              onClick={() => {
                setIsTimerRunning(false);
                setTimeLeft(duration);
              }}
              disabled={!selectedSubtask}
              className="h-11 w-11 bg-stone-900 border-2 border-stone-800 hover:bg-stone-800 rounded-xl flex items-center justify-center text-stone-400 hover:text-white transition-all cursor-pointer active:translate-y-0.5"
              title="Reset timer"
            >
              <RotateCcw className="h-4.5 w-4.5" />
            </button>

            {/* Ambient Focus Sound Toggle */}
            <button
              onClick={() => setSoundOn(!soundOn)}
              disabled={!selectedSubtask}
              className={`h-11 px-3.5 border-2 rounded-xl flex items-center justify-center gap-1.5 font-mono text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer active:translate-y-0.5 ${
                soundOn 
                  ? 'bg-teal-950/40 border-teal-500 text-teal-400' 
                  : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-white'
              }`}
              title="Ambient Sound Switch"
            >
              {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              Ambient Hum
            </button>
          </div>

          {/* Time mode selection */}
          <div className="flex items-center justify-between border-t border-stone-800 pt-3.5 text-xs text-stone-400 font-dm">
            <span>Interval selection:</span>
            <div className="flex bg-stone-950 rounded-lg p-0.5 border border-stone-800">
              <button
                onClick={() => setIsDemoMode(true)}
                className={`px-3 py-1 rounded-md font-mono text-[9px] uppercase font-black tracking-wider transition-all cursor-pointer ${
                  isDemoMode ? 'bg-stone-800 text-white' : 'text-stone-500 hover:text-stone-300'
                }`}
              >
                1-Min Demo Sprint
              </button>
              <button
                onClick={() => setIsDemoMode(false)}
                className={`px-3 py-1 rounded-md font-mono text-[9px] uppercase font-black tracking-wider transition-all cursor-pointer ${
                  !isDemoMode ? 'bg-stone-800 text-white' : 'text-stone-500 hover:text-stone-300'
                }`}
              >
                25-Min Pomodoro
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Encouragement quotes */}
        <p className="font-serif italic text-stone-500 text-xs text-center max-w-sm leading-relaxed">
          "The secret of getting ahead is getting started. The secret of getting started is breaking your complex overwhelming tasks into small manageable tasks, and starting on the first one."
        </p>
      </div>
    </div>
  );
};
export default FocusModeView;
