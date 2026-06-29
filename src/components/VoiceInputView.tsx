import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Mic, MicOff, Sparkles, Loader2, AlertCircle, ArrowLeft, Send, 
  Bot, Paperclip, FileText, X, Volume2, VolumeX, Mail, Calendar, Settings, Bell, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, Subtask, ParsedTask, SmartEmail } from '../types';
import { VoiceConfirmation } from './VoiceConfirmation';

interface Attachment {
  name: string;
  mimeType: string;
  data: string; // Base64 data (without data URL prefix)
  size?: number;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  attachments?: Attachment[];
  status?: 'sent' | 'reading' | 'typing' | 'done';
  timestamp: string;
  suggestions?: string[];
}

interface VoiceInputViewProps {
  onBack: () => void;
  onTaskAdded: () => void;
  user: any;
  tasks: Task[];
  userSettings: any;
  onUpdateDisplayName: (name: string) => Promise<void>;
  onToggleSetting: (key: string, value: boolean) => Promise<void>;
  onAddTask: (task: any) => Promise<void>;
  onDraftEmail: (recipient: string, subject: string, body: string) => void;
  onSyncCalendar: () => Promise<void>;
}

export const VoiceInputView: React.FC<VoiceInputViewProps> = ({ 
  onBack, 
  onTaskAdded,
  user,
  tasks,
  userSettings,
  onUpdateDisplayName,
  onToggleSetting,
  onAddTask,
  onDraftEmail,
  onSyncCalendar
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'parser'>('chat');
  const [showCheatSheet, setShowCheatSheet] = useState(true);
  
  // ==================== STATE FOR VOICE PLANNER (TAB 2) ====================
  const [isRecordingParser, setIsRecordingParser] = useState(false);
  const [parserTranscript, setParserTranscript] = useState('');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [manualText, setManualText] = useState('');
  const [parsedTask, setParsedTask] = useState<ParsedTask | null>(null);
  const [isProcessingParser, setIsProcessingParser] = useState(false);
  const [parserErrorMsg, setParserErrorMsg] = useState('');
  const parserRecognitionRef = useRef<any>(null);
  const parserTimerRef = useRef<any>(null);

  // ==================== STATE FOR CHAT COMPANION (TAB 1) ====================
  const [chatMessages, setChatMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem(`dg_companion_history_${user?.uid || 'demo'}`);
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'welcome',
        role: 'model',
        text: `Hello, Sai! I am **Guardian**, your AI coach and emotional shield. 🛡️\n\nI have scanned your project pipeline. You have some tight deadlines coming up, but don't worry—we can break them down together. \n\nHow can I help you focus today?`,
        timestamp: new Date().toISOString(),
        suggestions: ["Sync my calendar", "Turn on auto-email", "Show me Friday's tasks"]
      }
    ];
  });
  const [chatInputMessage, setChatInputMessage] = useState('');
  const [chatAttachments, setChatAttachments] = useState<Attachment[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isChatReading, setIsChatReading] = useState(false);
  const [isChatTyping, setIsChatTyping] = useState(false);
  const [chatVoiceOutputEnabled, setChatVoiceOutputEnabled] = useState(true);
  const [isRecordingChat, setIsRecordingChat] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);
  const chatRecognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef<boolean>(false);

  // Sync chat memory to localStorage
  useEffect(() => {
    localStorage.setItem(`dg_companion_history_${user?.uid || 'demo'}`, JSON.stringify(chatMessages));
  }, [chatMessages, user]);

  // Scroll chat viewport
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatTyping, isChatReading]);

  // Cleanup synthesis and voice on unmount
  useEffect(() => {
    return () => {
      stopParserTimer();
      if (parserRecognitionRef.current) parserRecognitionRef.current.stop();
      if (chatRecognitionRef.current) chatRecognitionRef.current.stop();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  // Handle outside click for command palette
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        setShowCommandPalette(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize Speech Recognition for parser and chat
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      // Parser recognition
      const pRec = new SpeechRecognition();
      pRec.continuous = false;
      pRec.interimResults = false;
      pRec.lang = 'en-US';
      pRec.onstart = () => {
        setIsRecordingParser(true);
        startParserTimer();
        setParserTranscript('Listening to your project timeline...');
      };
      pRec.onerror = (event: any) => {
        console.error("Parser Speech error:", event);
        setParserErrorMsg(`Speech error: ${event.error || 'Connection timed out'}`);
        setIsRecordingParser(false);
        stopParserTimer();
      };
      pRec.onend = () => {
        setIsRecordingParser(false);
        stopParserTimer();
      };
      pRec.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        if (text) {
          setParserTranscript(text);
          parseWithAI(text);
        }
      };
      parserRecognitionRef.current = pRec;

      // Chat recognition
      const cRec = new SpeechRecognition();
      cRec.continuous = false;
      cRec.interimResults = false;
      cRec.lang = 'en-US';
      cRec.onstart = () => {
        setIsRecordingChat(true);
      };
      cRec.onresult = (event: any) => {
        const transcriptText = event.results[0][0].transcript;
        setChatInputMessage(prev => {
          const space = prev && !prev.endsWith(' ') ? ' ' : '';
          return prev + space + transcriptText;
        });
      };
      cRec.onerror = (e: any) => {
        console.error("Chat Speech error:", e);
        setIsRecordingChat(false);
      };
      cRec.onend = () => {
        setIsRecordingChat(false);
      };
      chatRecognitionRef.current = cRec;
    }
  }, []);

  // ==================== VOICE PLANNER TIMERS ====================
  const startParserTimer = () => {
    setRecordingSeconds(0);
    parserTimerRef.current = setInterval(() => {
      setRecordingSeconds(prev => prev + 1);
    }, 1000);
  };

  const stopParserTimer = () => {
    if (parserTimerRef.current) {
      clearInterval(parserTimerRef.current);
      parserTimerRef.current = null;
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ==================== VOICE PLANNER LOGIC ====================
  const startParserRecording = () => {
    setParserErrorMsg('');
    setParserTranscript('');
    if (!parserRecognitionRef.current) {
      setParserErrorMsg('Voice recording is not supported in this browser. Please type your deadline manually below!');
      return;
    }
    parserRecognitionRef.current.start();
  };

  const stopParserRecording = () => {
    if (parserRecognitionRef.current) {
      parserRecognitionRef.current.stop();
    }
    setIsRecordingParser(false);
    stopParserTimer();
  };

  const parseWithAI = async (text: string) => {
    setIsProcessingParser(true);
    setParserErrorMsg('');
    try {
      const response = await fetch('/api/gemini/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          currentTime: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error("Gemini parser failed to respond");

      const res = await response.json();
      if (res.success && res.data) {
        setParsedTask(res.data);
      } else {
        throw new Error(res.error || "Failed to structure timeline");
      }
    } catch (e: any) {
      console.error(e);
      setParserErrorMsg(`AI Parsing failed: ${e.message || "Please check connection and try again."}`);
    } finally {
      setIsProcessingParser(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    setParserTranscript(manualText);
    parseWithAI(manualText);
    setManualText('');
  };

  // ==================== CHAT COMPANION LOGIC ====================
  const toggleChatRecording = () => {
    if (!chatRecognitionRef.current) {
      alert("Voice transcription is not supported in this browser.");
      return;
    }
    if (isRecordingChat) {
      chatRecognitionRef.current.stop();
    } else {
      chatRecognitionRef.current.start();
    }
  };

  const speakText = (text: string) => {
    if (!chatVoiceOutputEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const cleanText = text
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/#+\s/g, '')
      .replace(/`([^`]+)`/g, '$1');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    
    const voices = window.speechSynthesis.getVoices();
    const premiumVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Natural')) || voices[0];
    if (premiumVoice) {
      utterance.voice = premiumVoice;
    }
    window.speechSynthesis.speak(utterance);
  };

  const executeChatAgenticActions = async (actions: any[]) => {
    if (!actions || actions.length === 0) return;
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'TOGGLE_SETTING':
            if (action.toggleSetting) {
              await onToggleSetting(action.toggleSetting.key, action.toggleSetting.value);
            }
            break;
          case 'UPDATE_PROFILE':
            if (action.updateProfile?.displayName) {
              await onUpdateDisplayName(action.updateProfile.displayName);
            }
            break;
          case 'UPDATE_TASK':
            if (action.updateTask?.taskId) {
              const target = tasks.find(t => t.id === action.updateTask.taskId);
              if (target) {
                const updated = {
                  ...target,
                  name: action.updateTask.name || target.name,
                  priority: action.updateTask.priority || target.priority,
                  status: action.updateTask.status || target.status,
                  deadline: action.updateTask.deadline || target.deadline
                };
                await onAddTask(updated);
              }
            }
            break;
          case 'CREATE_TASK':
            if (action.createTask?.name) {
              const newTask: Partial<Task> = {
                id: `task-${Date.now()}`,
                userId: user?.uid || 'demo-user',
                name: action.createTask.name,
                priority: action.createTask.priority || 'medium',
                status: 'pending',
                deadline: action.createTask.deadline || new Date(Date.now() + 3*24*60*60*1000).toISOString(),
                estimatedDurationMinutes: 60,
                subtasks: action.createTask.subtasks?.map((sub: any, i: number) => ({
                  id: `subtask-${Date.now()}-${i}`,
                  name: sub.name,
                  durationMinutes: sub.durationMinutes || 20,
                  order: i + 1,
                  status: 'pending',
                  scheduledStart: sub.scheduledStart || undefined,
                  alarmNote: `Subtask: ${sub.name} 🛡️`
                })) || []
              };
              await onAddTask(newTask);
            }
            break;
          case 'SYNC_CALENDAR':
            await onSyncCalendar();
            break;
          case 'DRAFT_EMAIL':
            if (action.draftEmail) {
              onDraftEmail(
                action.draftEmail.recipient || '',
                action.draftEmail.subject || 'Milestone Update',
                action.draftEmail.body || ''
              );
            }
            break;
          default:
            console.warn("Unknown companion action type:", action.type);
        }
      } catch (err) {
        console.error("Failed executing action:", action, err);
      }
    }
  };

  const handleSendChatMessage = async (textToSend?: string) => {
    const finalMsg = (textToSend || chatInputMessage).trim();
    if (!finalMsg && chatAttachments.length === 0) return;

    setChatInputMessage('');
    const userMsgId = `msg-${Date.now()}`;
    const newUserMessage: Message = {
      id: userMsgId,
      role: 'user',
      text: finalMsg,
      attachments: chatAttachments.length > 0 ? [...chatAttachments] : undefined,
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, newUserMessage]);
    setChatAttachments([]);
    setIsChatLoading(true);
    setIsChatReading(true);

    const companionAppState = {
      tasks: tasks.map(t => ({
        id: t.id,
        name: t.name,
        deadline: t.deadline,
        priority: t.priority,
        status: t.status,
        subtasks: t.subtasks.map(s => ({
          id: s.id,
          name: s.name,
          durationMinutes: s.durationMinutes,
          status: s.status,
          scheduledStart: s.scheduledStart
        }))
      })),
      settings: {
        preferredSnooze: userSettings?.preferredSnooze || 10,
        preferredChime: userSettings?.preferredChime || 'retro_pulse',
        autoSendEmails: userSettings?.autoSendEmails || false,
        notifications: userSettings?.notifications !== undefined ? userSettings.notifications : true,
      },
      currentView: 'voice-input',
      currentTime: new Date().toISOString(),
      userEmail: user?.email || 'sai@deadlineguardian.ai'
    };

    const endpointHistory = chatMessages.slice(-10).map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    setTimeout(() => {
      setIsChatReading(false);
      setIsChatTyping(true);
    }, 1000);

    try {
      const response = await fetch('/api/gemini/guardian-companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: finalMsg,
          history: endpointHistory,
          appState: companionAppState,
          attachments: newUserMessage.attachments
        })
      });

      if (!response.ok) throw new Error('Companion brain interface timed out.');

      const resData = await response.json();
      if (!resData.success || !resData.data) throw new Error('Invalid neural response.');

      const companionReply = resData.data;

      setChatMessages(prev => [
        ...prev,
        {
          id: `reply-${Date.now()}`,
          role: 'model',
          text: companionReply.textResponse || "Parsed your request.",
          timestamp: new Date().toISOString(),
          suggestions: companionReply.suggestions || []
        }
      ]);

      speakText(companionReply.textResponse);

      if (companionReply.actions && companionReply.actions.length > 0) {
        await executeChatAgenticActions(companionReply.actions);
      }

    } catch (e: any) {
      console.error(e);
      setChatMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'model',
          text: `Apologies, I hit a slight wrinkle: **${e.message || 'connection issue'}**. Let's keep focusing!`,
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsChatLoading(false);
      setIsChatReading(false);
      setIsChatTyping(false);
    }
  };

  const handleChatFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          const newAttachment: Attachment = {
            name: file.name,
            mimeType: file.type || 'application/octet-stream',
            data: base64String,
            size: file.size
          };
          setChatAttachments(prev => [...prev, newAttachment]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const selectPaletteCommand = (command: string) => {
    if (command === '/email') {
      setChatInputMessage("Send email to boss about my presentation delay");
    } else if (command === '/alarm') {
      setChatInputMessage("Set alarm for 3 PM today to study");
    } else if (command === '/calendar') {
      setChatInputMessage("Show me Friday's scheduled tasks");
    } else if (command === '/settings') {
      setChatInputMessage("Turn on my auto-email settings");
    }
    setShowCommandPalette(false);
  };

  const actionCommands = [
    { label: "🔔 Set 3 PM Alarm", text: "Set alarm for 3 PM today to complete my tasks" },
    { label: "📨 Turn on Auto-Email", text: "Turn on my auto-email setting in my dashboard" },
    { label: "📅 Show Friday's Tasks", text: "Show me Friday's tasks on my calendar" },
    { label: "🔄 Sync Calendar Blocks", text: "Sync my Google Calendar blocks" }
  ];

  return (
    <div className="space-y-6 flex-1 min-h-0 flex flex-col w-full h-full max-w-7xl mx-auto">
      {/* Back to Dashboard and Dual-Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2 self-start">
          <button
            onClick={onBack}
            className="flex items-center gap-2 bg-[#FAF8F5] hover:bg-[#FAF8F5]/80 border-2 border-[#292524] px-4 py-2 rounded-xl text-xs font-dm font-bold text-[#292524] shadow-[3px_3px_0px_#292524] active:translate-y-0.5 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
          
          <button
            onClick={() => setShowCheatSheet(true)}
            className="flex items-center gap-1.5 bg-[#FCF8D5] hover:bg-[#FCF8D5]/80 border-2 border-[#292524] px-4 py-2 rounded-xl text-xs font-mono font-black text-[#5B6B43] shadow-[3px_3px_0px_#292524] active:translate-y-0.5 cursor-pointer"
          >
            💡 Dictation Manual
          </button>
        </div>

        {/* Tab switch bar */}
        <div className="bg-[#EAE5DB] border-2 border-[#292524] p-1 rounded-xl flex shadow-[3px_3px_0px_#292524]">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-1.5 rounded-lg text-xs font-dm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-[#5B6B43] text-white border border-[#292524]'
                : 'text-stone-700 hover:bg-stone-200/50'
            }`}
          >
            <Bot className="h-4 w-4" />
            Guardian Chat
          </button>
          <button
            onClick={() => setActiveTab('parser')}
            className={`px-4 py-1.5 rounded-lg text-xs font-dm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'parser'
                ? 'bg-[#5B6B43] text-white border border-[#292524]'
                : 'text-stone-700 hover:bg-stone-200/50'
            }`}
          >
            <Mic className="h-4 w-4" />
            Voice Planner
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {activeTab === 'chat' ? (
          /* ==================== TAB 1: GUARDIAN COACH CHAT ==================== */
          <div className="bg-[#FAF8F5] border-2 border-[#292524] rounded-2xl shadow-[6px_6px_0px_#292524] flex flex-col h-full overflow-hidden relative">
            
            {/* Embedded Chat Header info */}
            <div className="bg-[#EAE5DB] border-b-2 border-[#292524] p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#5B6B43]" />
                <span className="font-mono text-[9px] font-black uppercase text-[#5B6B43] tracking-widest">
                  Sai's Companion Coach Brain
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setChatVoiceOutputEnabled(!chatVoiceOutputEnabled)}
                  className={`h-7 w-7 rounded-lg border border-[#292524] flex items-center justify-center transition-colors cursor-pointer ${
                    chatVoiceOutputEnabled ? 'bg-[#FCF8D5]' : 'bg-white text-stone-400'
                  }`}
                  title="Speech voice reader"
                >
                  {chatVoiceOutputEnabled ? <Volume2 className="h-3.5 w-3.5 text-[#5B6B43]" /> : <VolumeX className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => {
                    if (confirm("Reset chat log?")) {
                      setChatMessages([
                        {
                          id: 'welcome',
                          role: 'model',
                          text: "Hello again! Your focus cache has been reinitialized. How can I protect your timeline?",
                          timestamp: new Date().toISOString()
                        }
                      ]);
                    }
                  }}
                  className="h-7 px-2 rounded-lg border border-[#292524] bg-white text-xs font-mono font-black text-stone-600 hover:bg-stone-50 cursor-pointer"
                  title="Reset conversation log"
                >
                  RESET
                </button>
              </div>
            </div>

            {/* Chat Messages Log */}
            <div 
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FCFAF7] scrollbar-none"
              style={{ scrollbarWidth: 'none' }}
            >
              {chatMessages.map((msg, idx) => (
                <div
                  key={msg.id || idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  <div className="max-w-[85%] flex gap-2">
                    {msg.role === 'model' && (
                      <div className="h-7 w-7 rounded-full bg-[#5B6B43] border-2 border-[#292524] flex items-center justify-center text-white text-[10px] font-serif font-black shrink-0">
                        G
                      </div>
                    )}
                    <div className="space-y-1">
                      <div
                        className={`border-2 border-[#292524] p-3 rounded-2xl shadow-[3px_3px_0px_#292524] text-xs leading-relaxed font-dm ${
                          msg.role === 'user'
                            ? 'bg-[#EAE5DB] text-[#292524]'
                            : 'bg-white text-[#292524]'
                        }`}
                      >
                        <div className="space-y-2 whitespace-pre-wrap">
                          {msg.text.split('\n\n').map((para, pIdx) => {
                            let content = para;
                            return (
                              <p key={pIdx}>
                                {content.split(' ').map((word, wIdx) => {
                                  if (word.startsWith('**') && word.endsWith('**')) {
                                    return <strong key={wIdx} className="font-bold text-[#5B6B43]">{word.replace(/\*\*/g, '')} </strong>;
                                  }
                                  if (word.startsWith('*') && word.endsWith('*')) {
                                    return <em key={wIdx} className="italic">{word.replace(/\*/g, '')} </em>;
                                  }
                                  return word + ' ';
                                })}
                              </p>
                            );
                          })}
                        </div>

                        {/* Rendering attached files */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-[#292524]/15 grid grid-cols-2 gap-2">
                            {msg.attachments.map((attach, fileIdx) => (
                              <div 
                                key={fileIdx}
                                className="bg-white border border-[#292524]/20 rounded-lg p-1.5 flex items-center gap-2 max-w-full"
                              >
                                {attach.mimeType.startsWith('image/') ? (
                                  <img 
                                    src={`data:${attach.mimeType};base64,${attach.data}`} 
                                    alt="Uploaded Attachment"
                                    className="h-8 w-8 object-cover rounded"
                                  />
                                ) : (
                                  <div className="h-8 w-8 bg-[#FCF8D5] border border-[#292524]/20 rounded flex items-center justify-center shrink-0">
                                    <FileText className="h-4 w-4 text-[#5B6B43]" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="font-mono text-[9px] font-black truncate text-[#292524]">
                                    {attach.name}
                                  </p>
                                  <span className="font-mono text-[7px] text-stone-400 block uppercase">
                                    Parsed attachment
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {msg.role === 'model' && msg.suggestions && msg.suggestions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1.5">
                          {msg.suggestions.map((sug, sugIdx) => (
                            <button
                              key={sugIdx}
                              onClick={() => handleSendChatMessage(sug)}
                              className="bg-[#FCF8D5] hover:bg-[#eae0b0] border border-[#292524]/25 hover:border-[#292524] text-[#5B6B43] font-dm text-[9px] font-bold py-1 px-2.5 rounded-full shadow-[1px_1px_0px_rgba(41,37,36,0.15)] transition-all cursor-pointer"
                            >
                              {sug}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {msg.role === 'user' && (
                      <div className="h-7 w-7 rounded-full bg-[#EAE5DB] border-2 border-[#292524] flex items-center justify-center text-stone-700 text-[10px] font-serif font-black shrink-0">
                        S
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isChatReading && (
                <div className="flex justify-start items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-[#5B6B43] border-2 border-[#292524] flex items-center justify-center text-white text-[10px] font-serif font-bold shrink-0">
                    G
                  </div>
                  <div className="bg-[#FCF8D5] border-2 border-[#292524] py-1 px-2.5 rounded-full shadow-[2px_2px_0px_#292524] text-[9px] font-mono font-black text-[#5B6B43] flex items-center gap-1.5">
                    <span className="h-2 w-2 bg-[#5B6B43] rounded-full animate-ping" />
                    <span>SCANNING ATTACHMENT DETAILS...</span>
                  </div>
                </div>
              )}

              {isChatTyping && (
                <div className="flex justify-start items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-[#5B6B43] border-2 border-[#292524] flex items-center justify-center text-white text-[10px] font-serif font-bold shrink-0">
                    G
                  </div>
                  <div className="bg-white border-2 border-[#292524] p-2.5 rounded-2xl shadow-[2px_2px_0px_#292524] flex items-center gap-1.5 text-xs">
                    <span className="text-stone-400 font-bold animate-pulse">Guardian is typing</span>
                    <div className="flex gap-1">
                      <span className="h-1.5 w-1.5 bg-stone-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 bg-stone-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 bg-stone-400 rounded-full animate-bounce" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Quick Suggested Queries Chips */}
            <div className="px-4 py-2 bg-[#FAF8F5] border-t border-[#292524]/10 flex gap-2 overflow-x-auto scrollbar-none">
              {actionCommands.map((act, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendChatMessage(act.text)}
                  className="shrink-0 bg-[#F5F1EB] hover:bg-[#eae5db] border border-[#292524]/20 hover:border-[#292524] rounded-lg px-2.5 py-1 text-[9px] font-mono font-black uppercase text-stone-700 tracking-wider transition-all cursor-pointer"
                >
                  {act.label}
                </button>
              ))}
            </div>

            {/* Interactive Commands Palette Overlay */}
            {showCommandPalette && (
              <div 
                ref={paletteRef}
                className="absolute bottom-20 left-4 right-4 bg-white border-2 border-[#292524] rounded-xl shadow-[4px_4px_0px_#292524] z-50 overflow-hidden divide-y divide-[#292524]/10"
              >
                <div className="bg-[#FCF8D5] px-3 py-1.5 font-mono text-[9px] font-black text-[#5B6B43] uppercase tracking-wider">
                  ⚡ QUICK COMMAND DICTATIONS
                </div>
                <button 
                  onClick={() => selectPaletteCommand('/email')}
                  className="w-full text-left px-3 py-2 text-xs font-dm hover:bg-stone-50 flex items-center gap-2 cursor-pointer"
                >
                  <Mail className="h-3.5 w-3.5 text-[#5B6B43]" />
                  <div>
                    <span className="font-bold text-[#292524]">/email</span>
                    <span className="text-stone-400 ml-1.5">— Draft accountability partner email</span>
                  </div>
                </button>
                <button 
                  onClick={() => selectPaletteCommand('/alarm')}
                  className="w-full text-left px-3 py-2 text-xs font-dm hover:bg-stone-50 flex items-center gap-2 cursor-pointer"
                >
                  <Bell className="h-3.5 w-3.5 text-[#5B6B43]" />
                  <div>
                    <span className="font-bold text-[#292524]">/alarm</span>
                    <span className="text-stone-400 ml-1.5">— Schedule micro-session alarm today</span>
                  </div>
                </button>
                <button 
                  onClick={() => selectPaletteCommand('/calendar')}
                  className="w-full text-left px-3 py-2 text-xs font-dm hover:bg-stone-50 flex items-center gap-2 cursor-pointer"
                >
                  <Calendar className="h-3.5 w-3.5 text-[#5B6B43]" />
                  <div>
                    <span className="font-bold text-[#292524]">/calendar</span>
                    <span className="text-stone-400 ml-1.5">— Filter and inspect scheduled blocks</span>
                  </div>
                </button>
              </div>
            )}

            {/* Attachments preview tray */}
            {chatAttachments.length > 0 && (
              <div className="px-4 py-2 bg-stone-50 border-t border-[#292524]/10 flex flex-wrap gap-2">
                {chatAttachments.map((file, idx) => (
                  <div 
                    key={idx}
                    className="bg-white border-2 border-[#292524] rounded-lg p-1 flex items-center gap-2 pr-2 relative shadow-[1px_1px_0px_#292524]"
                  >
                    {file.mimeType.startsWith('image/') ? (
                      <img 
                        src={`data:${file.mimeType};base64,${file.data}`} 
                        alt="attachment"
                        className="h-8 w-8 object-cover rounded"
                      />
                    ) : (
                      <div className="h-8 w-8 bg-[#FCF8D5] border border-[#292524]/20 rounded flex items-center justify-center">
                        <FileText className="h-4 w-4 text-[#5B6B43]" />
                      </div>
                    )}
                    <span className="font-mono text-[8px] font-black truncate text-[#292524] max-w-[100px]">
                      {file.name}
                    </span>
                    <button
                      onClick={() => setChatAttachments(prev => prev.filter((_, i) => i !== idx))}
                      className="text-stone-400 hover:text-red-500 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input Bar Form */}
            <div className="p-3 bg-[#EAE5DB] border-t-2 border-[#292524] flex items-center gap-2 shrink-0">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="h-10 w-10 bg-white border-2 border-[#292524] rounded-xl flex items-center justify-center hover:bg-[#F5F1EB] cursor-pointer shadow-[2px_2px_0px_#292524] active:translate-y-0.5 text-[#292524]"
                title="Attach files (syllabus, calendar, guidelines)"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleChatFileSelect} 
                title="Attach Syllabus or Calendar"
                className="hidden" 
                multiple 
              />

              <button
                onClick={toggleChatRecording}
                className={`h-10 w-10 border-2 border-[#292524] rounded-xl flex items-center justify-center cursor-pointer shadow-[2px_2px_0px_#292524] active:translate-y-0.5 transition-colors ${
                  isRecordingChat ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-[#292524] hover:bg-[#F5F1EB]'
                }`}
                title="Speak to Guardian"
              >
                {isRecordingChat ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>

              <input
                type="text"
                value={chatInputMessage}
                onChange={(e) => {
                  const val = e.target.value;
                  setChatInputMessage(val);
                  if (val.startsWith('/')) setShowCommandPalette(true);
                  else setShowCommandPalette(false);
                }}
                placeholder="Talk to Guardian... (try /email or /alarm)"
                title="Talk to Guardian"
                className="flex-1 bg-white border-2 border-[#292524] p-2.5 rounded-xl text-xs font-dm shadow-[2px_2px_0px_#292524] focus:outline-none text-[#292524]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendChatMessage();
                }}
              />

              <button
                onClick={() => handleSendChatMessage()}
                disabled={isChatLoading}
                className="h-10 px-4 bg-[#5B6B43] hover:bg-[#4a5836] disabled:bg-[#5B6B43]/50 text-white font-dm font-black text-xs border-2 border-[#292524] rounded-xl flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#292524] cursor-pointer"
              >
                <span>SEND</span>
                <Send className="h-3 w-3" />
              </button>
            </div>
          </div>
        ) : (
          /* ==================== TAB 2: ORIGINAL VOICE TIMELINE PLANNER ==================== */
          parsedTask ? (
            <VoiceConfirmation
              parsedTask={parsedTask}
              onConfirm={() => {
                setParsedTask(null);
                setParserTranscript('');
                onTaskAdded();
              }}
              onCancel={() => {
                setParsedTask(null);
                setParserTranscript('');
              }}
            />
          ) : (
            <div className="bg-[#FAF8F5] border-2 border-[#292524] rounded-2xl p-6 md:p-10 shadow-[6px_6px_0px_#292524] space-y-8 text-center relative overflow-hidden h-full flex flex-col justify-between">
              
              <div className="absolute top-4 right-4 text-[#5B6B43]/25 animate-pulse">
                <Sparkles className="h-8 w-8" />
              </div>

              <div className="max-w-xl mx-auto space-y-2">
                <h1 className="font-serif font-black text-xl md:text-2xl text-[#292524]">Analyze Syllabus & Timeline</h1>
                <p className="font-dm text-xs text-[#292524]/60">
                  Dictate or paste your raw milestones. Gemini will build complete nested task segments and map them perfectly around your calendar hours.
                </p>
              </div>

              <div className="flex flex-col items-center justify-center py-4 space-y-4">
                <div className="relative">
                  {isRecordingParser && (
                    <>
                      <div className="absolute inset-0 rounded-full bg-[#C4705A]/20 animate-ping" />
                      <div className="absolute -inset-4 rounded-full border-2 border-dashed border-[#C4705A]/40 animate-spin" style={{ animationDuration: '20s' }} />
                    </>
                  )}

                  <button
                    type="button"
                    onClick={isRecordingParser ? stopParserRecording : startParserRecording}
                    disabled={isProcessingParser}
                    className={`h-20 w-20 rounded-full flex items-center justify-center border-4 border-[#292524] shadow-[4px_4px_0px_#292524] transition-all relative z-10 active:translate-y-0.5 ${
                      isRecordingParser
                        ? 'bg-[#C4705A] text-[#FAF8F5]'
                        : 'bg-[#5B6B43] text-[#FAF8F5] hover:scale-[1.03]'
                    } disabled:opacity-50 cursor-pointer`}
                  >
                    {isProcessingParser ? (
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    ) : isRecordingParser ? (
                      <div className="h-5 w-5 bg-[#FAF8F5] rounded-md animate-pulse" />
                    ) : (
                      <Mic className="h-7 w-7 text-white" />
                    )}
                  </button>
                </div>

                <div className="space-y-1">
                  <span className="font-serif font-black text-[#292524] uppercase tracking-widest text-[10px] block">
                    {isRecordingParser ? 'Listening to guidelines' : isProcessingParser ? 'Generating sequence blocks...' : 'Tap to Record Project Info'}
                  </span>
                  {isRecordingParser ? (
                    <span className="font-mono text-xs font-black text-[#C4705A] block">
                      ⏱️ {formatTime(recordingSeconds)}
                    </span>
                  ) : (
                    <span className="font-dm text-[11px] text-[#292524]/50 block">
                      "Economics review project due by Wednesday noon, break it into 4 pomodoros"
                    </span>
                  )}
                </div>
              </div>

              {parserTranscript && (
                <div className="max-w-xl mx-auto p-3.5 bg-[#F5F1EB] border border-[#292524]/10 rounded-xl text-left w-full">
                  <span className="font-mono text-[8px] uppercase text-[#292524]/50 font-black block mb-0.5">Parser transcript:</span>
                  <p className="font-dm text-xs text-[#292524] italic font-semibold">"{parserTranscript}"</p>
                </div>
              )}

              {parserErrorMsg && (
                <div className="max-w-xl mx-auto flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-left w-full">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="font-dm text-xs text-red-700 leading-tight">{parserErrorMsg}</p>
                </div>
              )}

              {/* Text fallback input */}
              <div className="max-w-xl mx-auto pt-4 border-t-2 border-[#292524]/5 text-left space-y-2 w-full shrink-0">
                <span className="font-serif font-black text-[10px] text-[#292524] uppercase tracking-wider block">Or submit text pipeline rules:</span>
                <form onSubmit={handleManualSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder="E.g. History essay due tomorrow morning..."
                    title="Manual text prompt"
                    disabled={isRecordingParser || isProcessingParser}
                    className="flex-1 bg-[#FAF8F5] border-2 border-[#292524] rounded-xl px-3 py-2 text-xs text-[#292524] placeholder-[#292524]/40 font-dm focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isRecordingParser || isProcessingParser || !manualText.trim()}
                    className="bg-[#5B6B43] hover:bg-[#4a5836] disabled:opacity-50 text-white p-2.5 rounded-xl border-2 border-[#292524] shadow-[2px_2px_0px_#292524] cursor-pointer flex items-center justify-center shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          )
        )}
      </div>

      {/* Voice Command Cheat Sheet Modal */}
      <AnimatePresence>
        {showCheatSheet && (
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#FAF8F5] border-4 border-[#292524] rounded-2xl max-w-2xl w-full p-6 shadow-[8px_8px_0px_#292524] relative overflow-hidden"
            >
              {/* Header */}
              <div className="flex justify-between items-start border-b-2 border-[#292524]/10 pb-4 mb-4">
                <div className="space-y-1.5 text-left">
                  <span className="font-mono text-[9px] font-black uppercase text-[#C4705A] tracking-wider bg-[#C4705A]/10 border border-[#C4705A]/30 px-2 py-0.5 rounded-md">
                    COACH MANUAL
                  </span>
                  <h3 className="font-serif font-black text-[#292524] text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-[#5B6B43]" />
                    Guardian Dictation Command Sheet
                  </h3>
                  <p className="font-dm text-xs text-[#292524]/70">
                    Use these speech patterns in Guardian Chat or Voice Planner to automate your calendar armor.
                  </p>
                </div>
                <button
                  onClick={() => setShowCheatSheet(false)}
                  className="h-8 w-8 rounded-lg border-2 border-[#292524] bg-white flex items-center justify-center hover:bg-stone-50 cursor-pointer shadow-[2px_2px_0px_#292524] active:translate-y-0.5 shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Cheat Sheet Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin text-left">
                {/* Section 1 */}
                <div className="border-2 border-[#292524]/10 rounded-xl p-3 bg-[#EAE5DB]/25 space-y-2">
                  <h4 className="font-serif font-black text-xs text-[#5B6B43] uppercase tracking-wide">
                    📅 Task & Milestone Planning
                  </h4>
                  <ul className="space-y-1.5 font-mono text-[10px] text-[#292524]/85">
                    <li className="font-semibold text-stone-600">"Create a 4-hour study task for final exam next Friday"</li>
                    <li className="font-semibold text-stone-600">"Add biology report due by tomorrow 3 PM with 3 subtasks"</li>
                  </ul>
                </div>

                {/* Section 2 */}
                <div className="border-2 border-[#292524]/10 rounded-xl p-3 bg-[#EAE5DB]/25 space-y-2">
                  <h4 className="font-serif font-black text-xs text-[#5B6B43] uppercase tracking-wide">
                    ⏰ Alarms & Micro-Alarms
                  </h4>
                  <ul className="space-y-1.5 font-mono text-[10px] text-[#292524]/85">
                    <li className="font-semibold text-stone-600">"Set focus alarm for 4 PM today to read lecture notes"</li>
                    <li className="font-semibold text-stone-600">"Set study alert for economics tomorrow noon"</li>
                  </ul>
                </div>

                {/* Section 3 */}
                <div className="border-2 border-[#292524]/10 rounded-xl p-3 bg-[#EAE5DB]/25 space-y-2">
                  <h4 className="font-serif font-black text-xs text-[#5B6B43] uppercase tracking-wide">
                    📨 Accountability Partners
                  </h4>
                  <ul className="space-y-1.5 font-mono text-[10px] text-[#292524]/85">
                    <li className="font-semibold text-stone-600">"Draft an update email to study buddy about my progress"</li>
                    <li className="font-semibold text-stone-600">"Draft warning email to partner regarding presentation"</li>
                  </ul>
                </div>

                {/* Section 4 */}
                <div className="border-2 border-[#292524]/10 rounded-xl p-3 bg-[#EAE5DB]/25 space-y-2">
                  <h4 className="font-serif font-black text-xs text-[#5B6B43] uppercase tracking-wide">
                    ⚙️ App Customization
                  </h4>
                  <ul className="space-y-1.5 font-mono text-[10px] text-[#292524]/85">
                    <li className="font-semibold text-stone-600">"Change my profile display name to Captain Sai"</li>
                    <li className="font-semibold text-stone-600">"Turn on automatic emails in my setup"</li>
                  </ul>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-5 border-t-2 border-[#292524]/10 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-left">
                <div className="font-mono text-[9px] text-[#5B6B43]/80">
                  ⚡ Use <strong className="font-black text-[#5B6B43]">/ (slash)</strong> keys to access quick command snippets instantly in the input bar.
                </div>
                <button
                  onClick={() => setShowCheatSheet(false)}
                  className="bg-[#5B6B43] hover:bg-[#4a5836] text-[#FAF8F5] border-2 border-[#292524] px-4 py-2 rounded-xl text-xs font-mono font-black tracking-wider uppercase shadow-[3px_3px_0px_#292524] active:translate-y-0.5 transition-all self-end"
                >
                  Understood, Coach!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VoiceInputView;
