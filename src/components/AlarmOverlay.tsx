import React, { useState, useEffect } from 'react';
import { Play, Clock, X, BookOpen, Volume2, ShieldAlert, Sparkles, AlertOctagon } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playChime } from '../lib/audio';

interface AlarmOverlayProps {
  taskName: string;
  subtaskName: string;
  deadline: string; // ISO string
  note: string;
  onStart: () => void;
  onSnooze: (minutes: number) => void;
  onDismiss: (reason?: string) => void;
  prepOutline?: string;
  chimeType?: string;
  snoozeDuration?: number;
  initialSnoozeCount?: number;
  onBreakdownSubtask?: () => void;
  isBreakingDown?: boolean;
  taskDescription?: string;
}

export const AlarmOverlay: React.FC<AlarmOverlayProps> = ({
  taskName,
  subtaskName,
  deadline,
  note,
  onStart,
  onSnooze,
  onDismiss,
  prepOutline,
  chimeType,
  snoozeDuration,
  initialSnoozeCount = 0,
  onBreakdownSubtask,
  isBreakingDown = false,
  taskDescription
}) => {
  const [snoozeCount, setSnoozeCount] = useState(initialSnoozeCount);
  const [showGuardianTipModal, setShowGuardianTipModal] = useState(initialSnoozeCount > 3);
  const [speakActive, setSpeakActive] = useState(false);
  const [showPrepPreview, setShowPrepPreview] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

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
    
    const playAlarmChime = () => {
      try {
        playChime(chimeType || 'retro_pulse');
      } catch (err) {}
    };

    const chimeInterval = setInterval(playAlarmChime, 4500);
    playAlarmChime();

    return () => {
      clearInterval(chimeInterval);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [note, chimeType]);

  const handleSnooze = () => {
    const nextCount = snoozeCount + 1;
    if (nextCount > 3) {
      setShowGuardianTipModal(true);
      setSnoozeCount(nextCount);
    } else {
      const minutes = snoozeDuration || 10;
      setSnoozeCount(nextCount);
      onSnooze(minutes);
    }
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

        {/* Context Card */}
        {taskDescription && (
          <div className="bg-[#FCF8D5]/30 border border-[#292524]/20 rounded-xl p-4 text-left space-y-2.5 shadow-sm max-w-lg mx-auto">
             <div className="flex items-center justify-between">
               <span className="font-mono text-[9px] uppercase tracking-wider text-[#292524]/50 font-black flex items-center gap-1">
                 <BookOpen className="h-3 w-3" />
                 Context Overview
               </span>
               <span className="font-mono text-[8px] bg-[#5B6B43]/10 text-[#5B6B43] px-2 py-0.5 rounded-full font-black uppercase">
                 {hoursLeft < 24 ? 'High Proximity' : 'Low Proximity'}
               </span>
             </div>
            <p className="font-dm text-xs text-[#292524]/80 leading-relaxed italic border-l-2 border-[#5B6B43]/30 pl-2">
              "{taskDescription}"
            </p>
          </div>
        )}

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
              onClick={() => setShowFeedbackModal(true)}
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

      {showGuardianTipModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#292524]/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#FAF8F5] border-4 border-[#292524] rounded-2xl p-6 sm:p-8 shadow-[8px_8px_0px_#292524] relative text-center space-y-4">
            
            {/* Close modal button */}
            <button
              onClick={() => setShowGuardianTipModal(false)}
              className="absolute top-4 right-4 text-[#292524]/50 hover:text-[#292524] transition-colors"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Icon header */}
            <div className="mx-auto h-16 w-16 bg-[#FCF8D5] border-2 border-[#292524] rounded-full flex items-center justify-center shadow-[2px_2px_0px_#292524]">
              <Sparkles className="h-8 w-8 text-[#5B6B43] animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <span className="font-mono text-[9px] font-black tracking-widest text-[#5B6B43] uppercase block">
                🛡️ GUARDIAN COACH TIP
              </span>
              <h2 className="font-serif font-black text-xl text-[#292524]">
                Feeling stuck on this step?
              </h2>
              <p className="font-dm text-xs text-[#292524]/75 leading-relaxed">
                You've snoozed <strong>"{subtaskName}"</strong> more than 3 times ({snoozeCount} times). It's totally normal to procrastinate when a milestone feels too large or unclear.
              </p>
            </div>

            <div className="bg-[#FCF8D5]/60 border border-[#292524]/20 rounded-xl p-3">
              <p className="font-serif italic font-bold text-xs text-[#292524]/80 leading-relaxed text-center">
                "The secret to getting ahead is getting started. The secret to getting started is breaking your complex overwhelming tasks into small manageable tasks."
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={onBreakdownSubtask}
                disabled={isBreakingDown}
                className="w-full bg-[#5B6B43] hover:bg-[#4a5836] disabled:bg-[#5B6B43]/70 text-[#FAF8F5] font-dm font-black text-xs tracking-wide py-3 rounded-xl border-2 border-[#292524] shadow-[3px_3px_0px_#292524] flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.01] active:translate-y-0.5"
              >
                {isBreakingDown ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>COACH IS GENERATING BITES...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 fill-white text-white" />
                    <span>YES, BREAK IT DOWN FOR ME!</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setShowGuardianTipModal(false);
                  const minutes = snoozeDuration || 10;
                  onSnooze(minutes);
                }}
                disabled={isBreakingDown}
                className="w-full bg-white hover:bg-[#F5F1EB] text-[#292524] border-2 border-[#292524] text-xs font-dm font-bold py-2.5 rounded-xl shadow-[2px_2px_0px_#292524] transition-all active:translate-y-0.5 cursor-pointer block"
              >
                No, just snooze it for now
              </button>
            </div>
          </div>
        </div>
      )}

      {showFeedbackModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#292524]/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-[#FAF8F5] border-4 border-[#292524] rounded-2xl p-6 text-center shadow-[8px_8px_0px_#292524] relative">
            <h2 className="font-serif font-black text-xl text-[#292524] mb-2">Dismissal Feedback</h2>
            <p className="font-dm text-xs text-[#292524]/70 mb-4">
              Help your AI coach learn. Why are you dismissing this block?
            </p>
            
            <div className="space-y-2">
              {['Not urgent right now', 'Already finished', 'Doing later today', 'Needs rethinking'].map(reason => (
                <button
                  key={reason}
                  onClick={() => onDismiss(reason)}
                  className="w-full bg-white hover:bg-[#F5F1EB] text-[#292524] border-2 border-[#292524] text-xs font-dm font-bold py-2.5 rounded-xl shadow-[2px_2px_0px_#292524] transition-all active:translate-y-0.5 cursor-pointer block"
                >
                  {reason}
                </button>
              ))}
              <button
                onClick={() => onDismiss('Other')}
                className="w-full mt-2 bg-transparent text-[#292524]/60 hover:text-[#292524] text-xs font-dm font-bold py-2 transition-colors cursor-pointer"
              >
                Skip / Other
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default AlarmOverlay;
