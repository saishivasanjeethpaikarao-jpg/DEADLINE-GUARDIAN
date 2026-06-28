import React, { useState, useRef } from 'react';
import { Mic, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { VoiceConfirmation } from './VoiceConfirmation';
import { ParsedTask } from '../types';

export const VoiceInputButton: React.FC<{ onTaskAdded: () => void }> = ({ onTaskAdded }) => {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsedTask, setParsedTask] = useState<ParsedTask | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const recognitionRef = useRef<any>(null);

  const startRecording = () => {
    setErrorMsg('');
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMsg('Voice input is not supported in this browser. Please type your task description instead.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        setTranscript('Listening for your project rules...');
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event);
        setErrorMsg(`Speech error occurred: ${event.error}`);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        if (text) {
          setTranscript(text);
          handleTranscription(text);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      console.error("Failed to start speech:", e);
      setErrorMsg("Failed to start recording channel.");
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleTranscription = async (text: string) => {
    setIsProcessing(true);
    setErrorMsg('');
    try {
      const response = await fetch('/api/gemini/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          currentTime: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error("Server failed to parse transcript");
      }

      const data = await response.json();
      if (data.success && data.data) {
        setParsedTask(data.data);
      } else {
        throw new Error(data.error || "Missing parsed details");
      }
    } catch (error: any) {
      console.error("Failed parsing with AI:", error);
      setErrorMsg(`AI Parsing failed: ${error.message || "Please try again."}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const [manualInput, setManualInput] = useState('');
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    setTranscript(manualInput);
    handleTranscription(manualInput);
    setManualInput('');
  };

  return (
    <div className="w-full">
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
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 md:p-8 border border-slate-200 dark:border-slate-700 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            <h2 className="font-sans font-extrabold text-lg text-slate-800 dark:text-slate-100">AI Task Parser & Quick Input</h2>
          </div>
          <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mb-6">
            Describe your deadline or project naturally. Either click the microphone to speak, or type your guidelines. Gemini will automatically extract your sequential subtasks, deadline calendar hours, and setup resources.
          </p>

          <div className="flex flex-col md:flex-row items-center gap-6 justify-between">
            {/* Left/Main portion: Input & Transcript */}
            <form onSubmit={handleManualSubmit} className="w-full flex-1 space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="e.g., I have an AI ethics presentation due Friday at 5 PM..."
                  title="AI Task Parser & Quick Input"
                  disabled={isRecording || isProcessing}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-4 pr-12 py-3.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={isRecording || isProcessing || !manualInput.trim()}
                  className="absolute right-2.5 top-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 font-sans font-bold text-[10px] uppercase px-3 py-1.5 rounded-lg tracking-wide transition-all cursor-pointer"
                >
                  Parse
                </button>
              </div>

              {transcript && (
                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-950/40 rounded-xl">
                  <span className="font-mono text-[10px] uppercase text-indigo-400 block font-bold mb-1">Live Transcript:</span>
                  <p className="font-sans text-xs text-indigo-900 dark:text-indigo-300 italic">"{transcript}"</p>
                </div>
              )}

              {errorMsg && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/10 border border-red-100 dark:border-red-950/30 rounded-xl">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="font-sans text-xs text-red-600 dark:text-red-400 leading-tight">{errorMsg}</p>
                </div>
              )}
            </form>

            {/* Right portion: Micro/Pulsing Recording Button */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={`h-16 w-16 rounded-full flex items-center justify-center shadow-lg transition-all relative ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                    : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
                } cursor-pointer disabled:opacity-50`}
              >
                {isProcessing ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : isRecording ? (
                  <>
                    <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20" />
                    <div className="h-4 w-4 bg-white rounded-sm" />
                  </>
                ) : (
                  <Mic className="h-6 w-6 text-white" />
                )}
              </button>
              <span className="font-sans text-[10px] text-slate-400 font-medium">
                {isRecording ? 'Tap to complete' : 'Speak task instructions'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default VoiceInputButton;
