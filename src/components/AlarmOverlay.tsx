import React, { useState, useEffect } from 'react';
import { Play, Clock, X, BookOpen, Volume2, ShieldAlert, Sparkles, AlertOctagon } from 'lucide-react';
import confetti from 'canvas-confetti';

interface AlarmOverlayProps {
  taskName: string;
  subtaskName: string;
  deadline: string; // ISO string
  note: string;
  onStart: () => void;
  onSnooze: (minutes: number) => void;
  onDismiss: () => void;
  prepOutline?: string;
}

export const AlarmOverlay: React.FC<AlarmOverlayProps> = ({
  taskName,
  subtaskName,
  deadline,
  note,
  onStart,
  onSnooze,
  onDismiss,
  prepOutline
}) => {
  const [snoozeCount, setSnoozeCount] = useState(0);
  const [speakActive, setSpeakActive] = useState(false);
  const [showPrepPreview, setShowPrepPreview] = useState(false);

  const hoursLeft = Math.max(0, (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60));

  const triggerVoiceSynthesis = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    
    const speech = new SpeechSynthesisUtterance();
    speech.text = `Attention! Time to act! Your deadline guardian is calling you for ${subtaskName}. Coaching note: ${note}`;
    speech.volume = 1;
    speech.rate = 0.95;
    speech.pitch = 1.05;
    
    speech.onstart = () => setSpeakActive(true);
    speech.onend = () => setSpeakActive(false);
    speech.onerror = () => setSpeakActive(false);

    window.speechSynthesis.speak(speech);
  };

  useEffect(() => {
    triggerVoiceSynthesis();
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playBeep = () => {
      try {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, audioContext.currentTime);
        gain.gain.setValueAtTime(0.04, audioContext.currentTime);
        osc.start();
        osc.stop(audioContext.currentTime + 0.18);
      } catch (err) {}
    };

    const beepInterval = setInterval(playBeep, 4500);
    playBeep();

    return () => {
      clearInterval(beepInterval);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [note]);

  const handleSnooze = () => {
    const minutes = snoozeCount >= 2 ? 5 : 10;
    setSnoozeCount(c => c + 1);
    onSnooze(minutes);
  };

  const handleStartWork = () => {
    try {
      confetti({
        particleCount: 140,
        spread: 75,
        origin: { y: 0.5 }
      });
    } catch (e) {}
    onStart();
  };

  const getUrgencyText = () => {
    if (hoursLeft < 4) return 'URGENT CRITICAL WARNING';
    if (hoursLeft < 12) return 'TIME FRAME SQUEEZE WARNING';
    return 'SCHEDULED ACTION BLOCK';
  };

  const formatRemainingTime = (hours: number) => {
    if (hours === 0) return 'Deadline imminent!';
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m remaining until final deadline`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F5F1EB] p-4 sm:p-6 overflow-y-auto">
      {/* Outer container */}
      <div className="w-full max-w-2xl bg-[#FAF8F5] border-4 border-[#292524] rounded-3xl p-6 sm:p-10 shadow-[12px_12px_0px_#292524] text-center space-y-6 relative">
        
        {/* Urgent Terracotta Banner strip */}
        <div className="absolute top-0 left-0 right-0 h-4 bg-[#C4705A] rounded-t-[1.4rem] border-b-2 border-[#292524]" />

        {/* Pulsing Alarm Icon */}
        <div className="flex justify-center pt-2">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[#C4705A]/15 animate-ping" />
            <div className="h-20 w-20 bg-[#FAF8F5] border-4 border-[#292524] rounded-2xl flex items-center justify-center shadow-[4px_4px_0px_#292524] animate-alarm-ring">
              <ShieldAlert className="h-10 w-10 text-[#C4705A]" />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1.5 max-w-lg mx-auto">
          <span className="font-mono text-[10px] font-black tracking-widest text-[#C4705A] uppercase block">
            🚨 {getUrgencyText()} 🚨
          </span>
          <h1 className="font-serif font-black text-2xl sm:text-3.5xl text-[#292524] leading-none">
            SMART ALARM ACTIVE
          </h1>
          <p className="font-dm text-xs text-[#292524]/60">
            Your Deadline Guardian Coach has determined you must act now to secure your project milestone.
          </p>
        </div>

        {/* Details card */}
        <div className="bg-[#FAF8F5] border-2 border-[#292524] rounded-xl p-4 sm:p-5 text-left space-y-2.5 shadow-[4px_4px_0px_#292524]/10 max-w-lg mx-auto">
          <div className="flex justify-between items-center border-b border-[#292524]/10 pb-2">
            <span className="font-mono text-[10px] uppercase text-[#292524]/50 font-black">Project Target:</span>
            <span className="font-serif font-black text-xs text-[#292524] text-right max-w-[200px] truncate">{taskName}</span>
          </div>

          <div className="flex justify-between items-center border-b border-[#292524]/10 pb-2">
            <span className="font-mono text-[10px] uppercase text-[#292524]/50 font-black">Subtask Step:</span>
            <span className="font-dm font-bold text-xs text-[#5B6B43] text-right max-w-[200px] truncate">{subtaskName}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="font-mono text-[10px] uppercase text-[#292524]/50 font-black">Time Left:</span>
            <span className="font-mono text-[10px] text-[#C4705A] font-black">{formatRemainingTime(hoursLeft)}</span>
          </div>
        </div>

        {/* Coach Speech Note (warm background card) */}
        <div className="bg-[#FCF8D5] border-2 border-[#292524] rounded-xl p-5 text-left space-y-2 max-w-lg mx-auto shadow-[4px_4px_0px_#292524]/10 relative">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-wider text-[#292524]/50 font-black flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-[#C4705A] fill-[#C4705A]/10" />
              Your AI Coach Says:
            </span>

            <button
              onClick={triggerVoiceSynthesis}
              className={`p-1.5 rounded-lg border-2 border-[#292524]/10 hover:bg-[#FAF8F5] text-[#292524] transition-all cursor-pointer ${speakActive ? 'bg-[#5B6B43] text-white border-[#5B6B43]' : ''}`}
              title="Read aloud"
            >
              <Volume2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="font-serif italic font-bold text-sm text-[#292524] leading-relaxed">
            "{note}"
          </p>
        </div>

        {/* Collapsible prep view */}
        {showPrepPreview && prepOutline && (
          <div className="bg-[#FAF8F5] border-2 border-[#292524]/20 p-4 rounded-xl text-left font-dm text-xs text-[#292524]/80 whitespace-pre-line leading-relaxed max-h-32 overflow-y-auto max-w-lg mx-auto">
            <span className="font-mono text-[9px] uppercase text-[#292524]/50 font-black block mb-1">Pre-generated outline concept:</span>
            {prepOutline}
          </div>
        )}

        {/* Primary Buttons */}
        <div className="space-y-4 max-w-lg mx-auto pt-2">
          {/* Olive START NOW button */}
          <button
            onClick={handleStartWork}
            className="w-full bg-[#5B6B43] hover:bg-[#4a5836] text-[#FAF8F5] font-dm font-black text-sm tracking-wide py-4.5 rounded-xl border-2 border-[#292524] shadow-[4px_4px_0px_#292524] flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.01] active:translate-y-0.5"
          >
            <Play className="h-4.5 w-4.5 fill-white text-white" />
            START BLOCK NOW
          </button>

          {/* Sub actions block */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={handleSnooze}
              className="bg-[#FAF8F5] hover:bg-[#F5F1EB] text-[#292524] border-2 border-[#292524] text-xs font-dm font-bold py-3.5 rounded-xl shadow-[2px_2px_0px_#292524] transition-all active:translate-y-0.5 cursor-pointer"
            >
              <Clock className="h-4 w-4 mx-auto mb-1" />
              Snooze {snoozeCount >= 2 ? '5m' : '10m'}
            </button>

            <button
              onClick={() => setShowPrepPreview(!showPrepPreview)}
              disabled={!prepOutline}
              className="bg-[#FAF8F5] hover:bg-[#F5F1EB] disabled:opacity-30 text-[#292524] border-2 border-[#292524] text-xs font-dm font-bold py-3.5 rounded-xl shadow-[2px_2px_0px_#292524] transition-all active:translate-y-0.5 cursor-pointer"
            >
              <BookOpen className="h-4 w-4 mx-auto mb-1" />
              Prep Guide
            </button>

            <button
              onClick={onDismiss}
              className="bg-[#FAF8F5] hover:bg-[#F5F1EB] text-[#292524] border-2 border-[#292524] text-xs font-dm font-bold py-3.5 rounded-xl shadow-[2px_2px_0px_#292524] transition-all active:translate-y-0.5 cursor-pointer"
            >
              <X className="h-4 w-4 mx-auto mb-1" />
              Dismiss
            </button>
          </div>
        </div>

        {snoozeCount > 0 && (
          <p className="font-mono text-[10px] text-[#292524]/40">
            Snoozed {snoozeCount} times. Loving pressure makes diamonds! 🌿
          </p>
        )}

      </div>
    </div>
  );
};
export default AlarmOverlay;
