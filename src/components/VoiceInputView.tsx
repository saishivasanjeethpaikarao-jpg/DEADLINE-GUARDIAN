import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mic, Sparkles, Loader2, AlertCircle, ArrowLeft, Send } from 'lucide-react';
import { ParsedTask } from '../types';
import { VoiceConfirmation } from './VoiceConfirmation';

interface VoiceInputViewProps {
  onBack: () => void;
  onTaskAdded: () => void;
}

export const VoiceInputView: React.FC<VoiceInputViewProps> = ({ onBack, onTaskAdded }) => {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [manualText, setManualText] = useState('');
  const [parsedTask, setParsedTask] = useState<ParsedTask | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      stopTimer();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startTimer = () => {
    setRecordingSeconds(0);
    timerRef.current = setInterval(() => {
      setRecordingSeconds(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = () => {
    setErrorMsg('');
    setTranscript('');
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMsg('Voice recording is not supported in this browser. Please type your deadline manually below!');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        startTimer();
        setTranscript('Listening to your project timeline...');
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event);
        setErrorMsg(`Speech error: ${event.error || 'Connection timed out'}`);
        setIsRecording(false);
        stopTimer();
      };

      recognition.onend = () => {
        setIsRecording(false);
        stopTimer();
      };

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        if (text) {
          setTranscript(text);
          parseWithAI(text);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      console.error(e);
      setErrorMsg("Failed to connect microphone channel.");
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    stopTimer();
  };

  const parseWithAI = async (text: string) => {
    setIsProcessing(true);
    setErrorMsg('');
    try {
      const response = await fetch('/api/gemini/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          currentTime: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error("Gemini parser failed to respond");
      }

      const res = await response.json();
      if (res.success && res.data) {
        setParsedTask(res.data);
      } else {
        throw new Error(res.error || "Failed to structure timeline");
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(`AI Parsing failed: ${e.message || "Please check network connection and try again."}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    setTranscript(manualText);
    parseWithAI(manualText);
    setManualText('');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back to Dashboard */}
      <div className="flex items-start">
        <button
          onClick={onBack}
          className="flex items-center gap-2 bg-[#FAF8F5] hover:bg-[#FAF8F5]/80 border-2 border-[#292524] px-4 py-2 rounded-xl text-xs font-dm font-bold text-[#292524] shadow-[3px_3px_0px_#292524] active:translate-y-0.5 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
      </div>

      {parsedTask ? (
        <VoiceConfirmation
          parsedTask={parsedTask}
          onConfirm={() => {
            setParsedTask(null);
            setTranscript('');
            onTaskAdded();
          }}
          onCancel={() => {
            setParsedTask(null);
            setTranscript('');
          }}
        />
      ) : (
        <div className="bg-[#FAF8F5] border-2 border-[#292524] rounded-2xl p-6 md:p-10 shadow-[6px_6px_0px_#292524] space-y-8 text-center relative overflow-hidden">
          {/* Sparkle background details */}
          <div className="absolute top-4 right-4 text-[#5B6B43]/25 animate-pulse">
            <Sparkles className="h-8 w-8" />
          </div>

          <div className="max-w-xl mx-auto space-y-3">
            <h1 className="font-serif font-black text-2xl md:text-3xl text-[#292524]">Speak your natural rules & deadlines</h1>
            <p className="font-dm text-xs text-[#292524]/60">
              Tell Deadline Guardian what project is due and when. No rigid planners. Just talk, and Gemini will automatically extract milestones, set peak focus times, and generate study resources.
            </p>
          </div>

          {/* Big Mic Button & Animation */}
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="relative">
              {/* Outer pulsing rings */}
              {isRecording && (
                <>
                  <div className="absolute inset-0 rounded-full bg-[#C4705A]/20 animate-ping" />
                  <div className="absolute -inset-4 rounded-full border-2 border-dashed border-[#C4705A]/40 animate-spin" style={{ animationDuration: '20s' }} />
                </>
              )}

              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={`h-24 w-24 rounded-full flex items-center justify-center border-4 border-[#292524] shadow-[4px_4px_0px_#292524] transition-all relative z-10 active:translate-y-0.5 ${
                  isRecording
                    ? 'bg-[#C4705A] text-[#FAF8F5]'
                    : 'bg-[#5B6B43] text-[#FAF8F5] hover:scale-[1.03]'
                } disabled:opacity-50 cursor-pointer`}
              >
                {isProcessing ? (
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                ) : isRecording ? (
                  <div className="h-6 w-6 bg-[#FAF8F5] rounded-md animate-pulse" />
                ) : (
                  <Mic className="h-8 w-8 text-white" />
                )}
              </button>
            </div>

            <div className="space-y-1">
              <span className="font-serif font-black text-[#292524] uppercase tracking-widest text-xs block">
                {isRecording ? 'Recording is active' : isProcessing ? 'AI Agent is modeling...' : 'Tap Mic to Speak'}
              </span>
              
              {isRecording ? (
                <span className="font-mono text-sm font-black text-[#C4705A] block animate-pulse">
                  ⏱️ {formatTime(recordingSeconds)}
                </span>
              ) : (
                <span className="font-dm text-[11px] text-[#292524]/50 block">
                  "I have a physics report due next Friday by 4pm and need 3 study slots"
                </span>
              )}
            </div>
          </div>

          {/* Voice Wave Animation */}
          {isRecording && (
            <div className="flex items-center justify-center gap-1.5 h-12">
              <div className="w-1.5 bg-[#C4705A] rounded-full voice-wave" style={{ animationDelay: '0.1s' }} />
              <div className="w-1.5 bg-[#C4705A] rounded-full voice-wave" style={{ animationDelay: '0.3s' }} />
              <div className="w-1.5 bg-[#C4705A] rounded-full voice-wave" style={{ animationDelay: '0.5s' }} />
              <div className="w-1.5 bg-[#C4705A] rounded-full voice-wave" style={{ animationDelay: '0.2s' }} />
              <div className="w-1.5 bg-[#C4705A] rounded-full voice-wave" style={{ animationDelay: '0.4s' }} />
            </div>
          )}

          {/* Transcript / Result Info */}
          {transcript && (
            <div className="max-w-xl mx-auto p-4 bg-[#F5F1EB] border-2 border-[#292524]/10 rounded-xl text-left">
              <span className="font-mono text-[9px] uppercase text-[#292524]/50 font-black block mb-1">Live Voice Transcript:</span>
              <p className="font-dm text-xs text-[#292524] italic font-semibold">"{transcript}"</p>
            </div>
          )}

          {errorMsg && (
            <div className="max-w-xl mx-auto flex items-start gap-2.5 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-left">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <p className="font-dm text-xs text-red-700 leading-tight">{errorMsg}</p>
            </div>
          )}

          {/* Text Fallback Section */}
          <div className="max-w-xl mx-auto pt-4 border-t-2 border-[#292524]/5 text-left space-y-3">
            <span className="font-serif font-black text-xs text-[#292524] uppercase tracking-wider block">Or write instead:</span>
            
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Type here, e.g. Study exam tomorrow at 2 PM..."
                disabled={isRecording || isProcessing}
                className="flex-1 bg-[#FAF8F5] border-2 border-[#292524] rounded-xl px-4 py-3 text-xs text-[#292524] placeholder-[#292524]/40 font-dm focus:outline-none"
              />
              <button
                type="submit"
                disabled={isRecording || isProcessing || !manualText.trim()}
                className="bg-[#5B6B43] hover:bg-[#4a5836] disabled:opacity-50 text-white p-3 rounded-xl border-2 border-[#292524] shadow-[2px_2px_0px_#292524] cursor-pointer flex items-center justify-center shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>

        </div>
      )}
    </div>
  );
};
export default VoiceInputView;
