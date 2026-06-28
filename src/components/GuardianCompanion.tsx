import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Mic, MicOff, Send, X, Paperclip, Bot, User, Trash2, 
  Volume2, VolumeX, Mail, Calendar, Settings, Bell, Flame, RefreshCw, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Task } from '../types';

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

interface GuardianCompanionProps {
  user: any;
  tasks: Task[];
  userSettings: any;
  currentView: string;
  onNavigate: (view: any) => void;
  onUpdateDisplayName: (name: string) => Promise<void>;
  onToggleSetting: (key: string, value: boolean) => Promise<void>;
  onAddTask: (task: any) => Promise<void>;
  onDraftEmail: (recipient: string, subject: string, body: string) => void;
  onSyncCalendar: () => Promise<void>;
}

export const GuardianCompanion: React.FC<GuardianCompanionProps> = ({
  user,
  tasks,
  userSettings,
  currentView,
  onNavigate,
  onUpdateDisplayName,
  onToggleSetting,
  onAddTask,
  onDraftEmail,
  onSyncCalendar
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => {
    // Persistent chat memory in localStorage
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

  const [inputMessage, setInputMessage] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  // Voice states
  const [voiceMode, setVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(true);
  
  // Command palette state
  const [showPalette, setShowPalette] = useState(false);
  const paletteRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Web Speech API refs
  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef<boolean>(false);

  // Sync message history to localStorage
  useEffect(() => {
    localStorage.setItem(`dg_companion_history_${user?.uid || 'demo'}`, JSON.stringify(messages));
  }, [messages, user]);

  // Scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, isReading]);

  // Handle outside click for command palette
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        setShowPalette(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsRecording(true);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(prev => {
          const space = prev && !prev.endsWith(' ') ? ' ' : '';
          return prev + space + transcript;
        });
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error:", e);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  // Speak text using Web Speech API
  const speakText = (text: string) => {
    if (!voiceOutputEnabled || !('speechSynthesis' in window)) return;
    
    // Stop any active synthesis
    window.speechSynthesis.cancel();

    // Strip markdown tags for clean vocal pronunciation
    const cleanText = text
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/#+\s/g, '')
      .replace(/`([^`]+)`/g, '$1');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.1; // Slightly higher pitching for a warm coach accent
    
    // Attempt to pick a premium sounding English voice
    const voices = window.speechSynthesis.getVoices();
    const premiumVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Natural')) || voices[0];
    if (premiumVoice) {
      utterance.voice = premiumVoice;
    }

    utterance.onstart = () => {
      isSpeakingRef.current = true;
    };
    utterance.onend = () => {
      isSpeakingRef.current = false;
    };

    window.speechSynthesis.speak(utterance);
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  // Process / Execution of Agentic Actions returned from Gemini
  const executeAgenticActions = async (actions: any[]) => {
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
                await onAddTask(updated); // App.tsx save handler
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
          case 'NAVIGATE':
            if (action.navigate?.view) {
              onNavigate(action.navigate.view);
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
            console.warn("Unknown agentic action type:", action.type);
        }
      } catch (err) {
        console.error("Failed to execute agentic action:", action, err);
      }
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const finalMsg = (textToSend || inputMessage).trim();
    if (!finalMsg && attachments.length === 0) return;

    setInputMessage('');
    const userMsgId = `msg-${Date.now()}`;
    const newUserMessage: Message = {
      id: userMsgId,
      role: 'user',
      text: finalMsg,
      attachments: attachments.length > 0 ? [...attachments] : undefined,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, newUserMessage]);
    setAttachments([]);
    setIsLoading(true);
    setIsReading(true);

    // Formulate context state for Gemini
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
      currentView,
      currentTime: new Date().toISOString(),
      userEmail: user?.email || 'sai@deadlineguardian.ai'
    };

    // Format chat history for endpoint
    const endpointHistory = messages.slice(-10).map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    // Start loading transition states
    setTimeout(() => {
      setIsReading(false);
      setIsTyping(true);
    }, 1200);

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

      if (!response.ok) {
        throw new Error('Brain interface timed out.');
      }

      const resData = await response.json();
      if (!resData.success || !resData.data) {
        throw new Error('Invalid neural packet returned.');
      }

      const companionReply = resData.data;

      // Update messages list
      setMessages(prev => [
        ...prev,
        {
          id: `reply-${Date.now()}`,
          role: 'model',
          text: companionReply.textResponse || "I am processing your pipeline now.",
          timestamp: new Date().toISOString(),
          suggestions: companionReply.suggestions || []
        }
      ]);

      // Execute companion speech output
      speakText(companionReply.textResponse);

      // Trigger actual app side effects
      if (companionReply.actions && companionReply.actions.length > 0) {
        await executeAgenticActions(companionReply.actions);
      }

    } catch (e: any) {
      console.error("Guardian companion error:", e);
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'model',
          text: `Apologies Sai, my cognitive processor hit an issue: **${e.message || 'connection glitch'}**. Let me re-sync my dashboard and help you focus!`,
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsLoading(false);
      setIsReading(false);
      setIsTyping(false);
    }
  };

  // Drag and Drop files handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  };

  const processFiles = (files: FileList) => {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        const newAttachment: Attachment = {
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          data: base64String,
          size: file.size
        };
        setAttachments(prev => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Handle Command Palette
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputMessage(val);

    if (val.startsWith('/')) {
      setShowPalette(true);
    } else {
      setShowPalette(false);
    }
  };

  const selectPaletteCommand = (command: string) => {
    if (command === '/email') {
      setInputMessage("Send email to boss about my presentation delay");
    } else if (command === '/alarm') {
      setInputMessage("Set alarm for 3 PM today to study");
    } else if (command === '/calendar') {
      setInputMessage("Show me Friday's scheduled tasks");
    } else if (command === '/settings') {
      setInputMessage("Turn on my auto-email settings");
    }
    setShowPalette(false);
  };

  // Suggested actions
  const actionCommands = [
    { label: "🔔 Set 3 PM Alarm", text: "Set alarm for 3 PM today to complete my tasks" },
    { label: "📨 Turn on Auto-Email", text: "Turn on my auto-email setting in my dashboard" },
    { label: "📅 Show Friday's Tasks", text: "Show me Friday's tasks on my calendar" },
    { label: "🔄 Sync Calendar Blocks", text: "Sync my Google Calendar blocks" }
  ];

  return (
    <>
      {/* FLOATING ACTION TRIGGER BUTTON */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
        {/* Help label on hover */}
        <div className="hidden sm:block bg-[#FAF8F5] border-2 border-[#292524] px-3 py-1.5 rounded-xl shadow-[2px_2px_0px_#292524] text-stone-700 font-mono text-[10px] tracking-widest uppercase font-black">
          🛡️ Ask Guardian
        </div>
        <button
          id="guardian-companion-floating-trigger"
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full bg-[#5B6B43] hover:bg-[#4a5836] border-4 border-[#292524] flex items-center justify-center shadow-[6px_6px_0px_#292524] cursor-pointer hover:scale-105 transition-all text-white relative group active:translate-y-1"
          title="Open AI Companion"
        >
          <Bot className="h-6 w-6 animate-pulse" />
          <span className="absolute -top-1 -right-1 bg-[#C4705A] border-2 border-[#292524] rounded-full h-4 w-4 flex items-center justify-center">
            <span className="h-1.5 w-1.5 bg-white rounded-full animate-ping" />
          </span>
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <div 
            id="guardian-chat-drawer-overlay"
            className="fixed inset-0 z-50 flex justify-center bg-stone-900/80 backdrop-blur-md p-0 sm:p-4 md:p-6 lg:p-8 animate-fade-in"
          >
            {/* Main Full-Screen Panel */}
            <motion.div
              id="guardian-companion-panel"
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-full max-w-7xl bg-[#FAF8F5] border-none sm:border-4 border-[#292524] rounded-none sm:rounded-2xl h-full flex flex-col shadow-2xl relative overflow-hidden"
            >
              {/* Header */}
              <div className="bg-[#EAE5DB] border-b-2 border-[#292524] p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                  {/* Dashboard Back Button */}
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onNavigate('dashboard');
                    }}
                    className="h-9 px-3 gap-1.5 rounded-lg border-2 border-[#292524] bg-white hover:bg-[#F5F1EB] flex items-center justify-center cursor-pointer text-[#292524] font-mono text-[10px] font-black uppercase active:translate-y-0.5 shadow-[2px_2px_0px_#292524] transition-all shrink-0"
                    title="Back to Dashboard"
                  >
                    <span>← Dashboard</span>
                  </button>

                  <div className="flex items-center gap-2.5 sm:hidden">
                    {/* Compact Voice Output Toggle for Mobile */}
                    <button
                      onClick={() => setVoiceOutputEnabled(!voiceOutputEnabled)}
                      className={`h-8 w-8 rounded-lg border-2 border-[#292524] flex items-center justify-center transition-colors cursor-pointer ${
                        voiceOutputEnabled ? 'bg-[#FCF8D5] text-[#5B6B43]' : 'bg-white text-stone-400'
                      }`}
                    >
                      {voiceOutputEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    </button>

                    {/* Compact Voice Mode Trigger for Mobile */}
                    <button
                      onClick={() => setVoiceMode(true)}
                      className="h-8 px-2 rounded-lg border-2 border-[#292524] bg-[#FCF8D5] hover:bg-[#eae0b0] text-[#5B6B43] flex items-center justify-center"
                    >
                      <Mic className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Central Identity / Branding */}
                <div className="hidden md:flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#5B6B43] border-2 border-[#292524] flex items-center justify-center text-[#FAF8F5] shadow-[2px_2px_0px_#292524]">
                    <Sparkles className="h-5 w-5 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="font-serif font-black text-sm text-[#292524] tracking-tight">
                      Guardian Coach Brain 🛡️
                    </h2>
                    <span className="font-mono text-[8px] text-[#5B6B43] font-black uppercase tracking-widest block">
                      Autonomous Neural Brain
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3">
                  {/* Navigation tabs inside header */}
                  <div className="flex items-center gap-1 bg-[#FAF8F5]/60 border-2 border-[#292524] p-1 rounded-xl shadow-[2px_2px_0px_#292524] shrink-0">
                    <button
                      className="px-3 py-1.5 rounded-lg text-[10px] font-mono font-black uppercase bg-[#5B6B43] text-white flex items-center gap-1.5 cursor-default"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span className="hidden xs:inline">Guardian Chat</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        onNavigate('voice-input');
                      }}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-mono font-black uppercase text-stone-600 hover:text-[#292524] hover:bg-[#FAF8F5]/80 flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Mic className="h-3 w-3" />
                      <span className="hidden xs:inline">Voice Planner</span>
                    </button>
                  </div>

                  {/* Desktop Voice Control & Minimize Group */}
                  <div className="hidden sm:flex items-center gap-2">
                    {/* Voice Output Toggle */}
                    <button
                      onClick={() => setVoiceOutputEnabled(!voiceOutputEnabled)}
                      className={`h-9 w-9 rounded-lg border-2 border-[#292524] flex items-center justify-center transition-colors cursor-pointer shadow-[2px_2px_0px_#292524] active:translate-y-0.5 ${
                        voiceOutputEnabled ? 'bg-[#FCF8D5] text-[#5B6B43]' : 'bg-white text-stone-400'
                      }`}
                      title={voiceOutputEnabled ? "Mute Voice Output" : "Enable Voice Output"}
                    >
                      {voiceOutputEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    </button>

                    {/* Voice mode trigger button */}
                    <button
                      onClick={() => setVoiceMode(true)}
                      className="h-9 px-3 rounded-lg border-2 border-[#292524] bg-[#FCF8D5] hover:bg-[#eae0b0] text-[#5B6B43] font-mono text-[9px] font-black uppercase flex items-center gap-1 cursor-pointer shadow-[2px_2px_0px_#292524] active:translate-y-0.5"
                      title="Enter Immersive Voice Mode"
                    >
                      <Mic className="h-3.5 w-3.5" />
                      <span>Voice Mode</span>
                    </button>

                    {/* Close panel button */}
                    <button
                      onClick={() => setIsOpen(false)}
                      className="h-9 w-9 rounded-lg border-2 border-[#292524] bg-white hover:bg-[#F5F1EB] flex items-center justify-center cursor-pointer text-[#292524] active:translate-y-0.5 shadow-[2px_2px_0px_#292524] transition-all"
                      title="Minimize Companion"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Chat messages viewport */}
              <div 
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FCFAF7] relative scrollbar-none"
                style={{ scrollbarWidth: 'none' }}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {/* Drag and drop overlay hint */}
                <div className="absolute top-2 right-2 text-[9px] font-mono text-stone-400 pointer-events-none uppercase">
                  Drag & Drop Files Anywhere
                </div>

                {messages.map((msg, index) => (
                  <div
                    key={msg.id || index}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                  >
                    <div className="max-w-[85%] flex gap-2">
                      {msg.role === 'model' && (
                        <div className="h-7 w-7 rounded-full bg-[#5B6B43] border-2 border-[#292524] flex items-center justify-center text-white text-[10px] font-serif font-black shrink-0 shadow-[1px_1px_0px_#292524]">
                          G
                        </div>
                      )}
                      
                      <div className="space-y-1">
                        <div
                          className={`border-2 border-[#292524] p-3 rounded-2xl shadow-[3px_3px_0px_#292524] text-xs leading-relaxed font-dm ${
                            msg.role === 'user'
                              ? 'bg-[#EAE5DB] text-[#292524]'
                              : 'bg-[#FAF8F5] text-[#292524]'
                          }`}
                        >
                          {/* Markdown renderer parser logic inline */}
                          <div className="space-y-2 whitespace-pre-wrap">
                            {msg.text.split('\n\n').map((para, pIdx) => {
                              // basic format bold **
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

                          {/* Render files sent with message */}
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
                                      alt={attach.name}
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
                                      Parsed AI Data
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Rendering suggested followup pills */}
                        {msg.role === 'model' && msg.suggestions && msg.suggestions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1.5">
                            {msg.suggestions.map((sug, sugIdx) => (
                              <button
                                key={sugIdx}
                                onClick={() => handleSendMessage(sug)}
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

                {/* Tracking States Indicators */}
                {isReading && (
                  <div className="flex justify-start items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-[#5B6B43] border-2 border-[#292524] flex items-center justify-center text-white text-[10px] font-serif font-bold shrink-0">
                      G
                    </div>
                    <div className="bg-[#FCF8D5] border-2 border-[#292524] py-1.5 px-3 rounded-full shadow-[2px_2px_0px_#292524] text-[9px] font-mono font-black text-[#5B6B43] flex items-center gap-1.5">
                      <span className="h-2 w-2 bg-[#5B6B43] rounded-full animate-ping" />
                      <span>GUARDIAN IS READING FILE & METADATA...</span>
                    </div>
                  </div>
                )}

                {isTyping && (
                  <div className="flex justify-start items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-[#5B6B43] border-2 border-[#292524] flex items-center justify-center text-white text-[10px] font-serif font-bold shrink-0">
                      G
                    </div>
                    <div className="bg-[#FAF8F5] border-2 border-[#292524] p-2.5 rounded-2xl shadow-[2px_2px_0px_#292524] flex items-center gap-1.5">
                      <span className="text-stone-400 font-bold animate-pulse">Guardian is typing</span>
                      <div className="flex gap-1">
                        <span className="h-1.5 w-1.5 bg-stone-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="h-1.5 w-1.5 bg-stone-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="h-1.5 w-1.5 bg-stone-500 rounded-full animate-bounce" />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Suggestions shortcuts footer */}
              <div className="px-4 py-2 bg-[#FAF8F5] border-t border-[#292524]/10 overflow-x-auto scrollbar-none flex gap-2">
                {actionCommands.map((act, actIdx) => (
                  <button
                    key={actIdx}
                    onClick={() => handleSendMessage(act.text)}
                    className="shrink-0 bg-[#F5F1EB] hover:bg-[#eae5db] border border-[#292524]/20 hover:border-[#292524] rounded-lg px-2.5 py-1 text-[9px] font-mono font-black uppercase text-stone-700 tracking-wider transition-all shadow-[1px_1px_0px_rgba(41,37,36,0.1)] cursor-pointer"
                  >
                    {act.label}
                  </button>
                ))}
              </div>

              {/* Command Palette Menu overlay */}
              {showPalette && (
                <div 
                  ref={paletteRef}
                  className="absolute bottom-20 left-4 right-4 bg-white border-2 border-[#292524] rounded-xl shadow-[4px_4px_0px_#292524] z-50 overflow-hidden divide-y divide-[#292524]/10"
                >
                  <div className="bg-[#FCF8D5] px-3 py-1.5 font-mono text-[9px] font-black text-[#5B6B43] uppercase tracking-wider">
                    ⚡ QUICK GUARDIAN COMMANDS
                  </div>
                  <button 
                    onClick={() => selectPaletteCommand('/email')}
                    className="w-full text-left px-3 py-2 text-xs font-dm hover:bg-stone-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Mail className="h-3.5 w-3.5 text-[#5B6B43]" />
                    <div>
                      <span className="font-bold text-[#292524]">/email</span>
                      <span className="text-stone-400 ml-1.5">— Draft accountability email response to contact</span>
                    </div>
                  </button>
                  <button 
                    onClick={() => selectPaletteCommand('/alarm')}
                    className="w-full text-left px-3 py-2 text-xs font-dm hover:bg-stone-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Bell className="h-3.5 w-3.5 text-[#5B6B43]" />
                    <div>
                      <span className="font-bold text-[#292524]">/alarm</span>
                      <span className="text-stone-400 ml-1.5">— Set automatic scheduled panic alarm for a subtask</span>
                    </div>
                  </button>
                  <button 
                    onClick={() => selectPaletteCommand('/calendar')}
                    className="w-full text-left px-3 py-2 text-xs font-dm hover:bg-stone-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Calendar className="h-3.5 w-3.5 text-[#5B6B43]" />
                    <div>
                      <span className="font-bold text-[#292524]">/calendar</span>
                      <span className="text-stone-400 ml-1.5">— Filter and schedule focus blocks</span>
                    </div>
                  </button>
                  <button 
                    onClick={() => selectPaletteCommand('/settings')}
                    className="w-full text-left px-3 py-2 text-xs font-dm hover:bg-stone-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Settings className="h-3.5 w-3.5 text-[#5B6B43]" />
                    <div>
                      <span className="font-bold text-[#292524]">/settings</span>
                      <span className="text-stone-400 ml-1.5">— View controls and tweak preferences</span>
                    </div>
                  </button>
                </div>
              )}

              {/* Attachments preview tray */}
              {attachments.length > 0 && (
                <div className="px-4 py-2 bg-stone-50 border-t border-[#292524]/10 flex flex-wrap gap-2">
                  {attachments.map((file, idx) => (
                    <div 
                      key={idx}
                      className="bg-white border-2 border-[#292524] rounded-lg p-1 flex items-center gap-2 pr-2 relative shadow-[1px_1px_0px_#292524]"
                    >
                      {file.mimeType.startsWith('image/') ? (
                        <img 
                          src={`data:${file.mimeType};base64,${file.data}`} 
                          alt="preview"
                          className="h-8 w-8 object-cover rounded"
                        />
                      ) : (
                        <div className="h-8 w-8 bg-[#FCF8D5] border border-[#292524]/20 rounded flex items-center justify-center">
                          <FileText className="h-4 w-4 text-[#5B6B43]" />
                        </div>
                      )}
                      <div className="max-w-[120px] min-w-0">
                        <p className="font-mono text-[8px] font-black truncate text-[#292524]">
                          {file.name}
                        </p>
                        <span className="font-mono text-[6px] text-stone-400 uppercase block">
                          {(file.size ? file.size / 1024 : 12).toFixed(1)} KB
                        </span>
                      </div>
                      <button
                        onClick={() => removeAttachment(idx)}
                        className="text-stone-400 hover:text-red-500 cursor-pointer ml-1"
                        title="Remove"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Chat Input form footer */}
              <div className="p-4 bg-[#EAE5DB] border-t-2 border-[#292524] flex items-center gap-2">
                {/* File picker */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="h-10 w-10 bg-white border-2 border-[#292524] rounded-xl flex items-center justify-center hover:bg-[#F5F1EB] cursor-pointer shadow-[2px_2px_0px_#292524] active:translate-y-0.5 text-[#292524]"
                  title="Attach Files"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  multiple
                  className="hidden"
                />

                {/* Microphone trigger voice typing inside input */}
                <button
                  onClick={toggleRecording}
                  className={`h-10 w-10 border-2 border-[#292524] rounded-xl flex items-center justify-center cursor-pointer shadow-[2px_2px_0px_#292524] active:translate-y-0.5 transition-colors ${
                    isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-[#292524] hover:bg-[#F5F1EB]'
                  }`}
                  title={isRecording ? "Listening... Click to Stop" : "Dictate Voice Typing"}
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>

                {/* Chat text box */}
                <input
                  type="text"
                  value={inputMessage}
                  onChange={handleInputChange}
                  placeholder="Ask me anything... (try /email, /alarm)"
                  className="flex-1 bg-white border-2 border-[#292524] p-2 rounded-xl text-xs font-dm shadow-[2px_2px_0px_#292524] text-[#292524] focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendMessage();
                  }}
                />

                {/* Send Button */}
                <button
                  onClick={() => handleSendMessage()}
                  disabled={isLoading}
                  className="h-10 px-4 bg-[#5B6B43] hover:bg-[#4a5836] disabled:bg-[#5B6B43]/50 text-white font-dm font-black tracking-wide text-xs border-2 border-[#292524] rounded-xl flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#292524] cursor-pointer active:translate-y-0.5"
                >
                  <span>SEND</span>
                  <Send className="h-3 w-3" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FULL SCREEN IMMERSIVE VOICE CONVERSATION MODE OVERLAY */}
      <AnimatePresence>
        {voiceMode && (
          <div 
            id="guardian-immersive-voice-overlay"
            className="fixed inset-0 bg-[#292524] z-[100] flex flex-col justify-between p-6 text-white text-center"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#C9A96E]" />
                <span className="font-mono text-[9px] font-black tracking-widest text-[#EAE5DB]/60 uppercase">
                  Guardian Voice Space • Active
                </span>
              </div>
              <button
                onClick={() => {
                  setVoiceMode(false);
                  if (recognitionRef.current) recognitionRef.current.stop();
                }}
                className="h-10 px-4 bg-white/10 hover:bg-white/20 rounded-xl border border-white/25 text-xs font-dm cursor-pointer"
              >
                Exit Voice Space
              </button>
            </div>

            {/* Pulsing Visual Wave / Interaction Space */}
            <div className="flex flex-col items-center justify-center space-y-6 flex-1">
              {/* Large pulsing circle with concentric rings */}
              <div className="relative flex items-center justify-center">
                {/* Ping rings */}
                {isRecording && (
                  <>
                    <span className="absolute inline-flex h-36 w-36 rounded-full bg-[#5B6B43]/30 animate-ping" />
                    <span className="absolute inline-flex h-44 w-44 rounded-full bg-[#5B6B43]/15 animate-ping [animation-delay:0.5s]" />
                  </>
                )}
                
                {/* Main center button */}
                <button
                  onClick={toggleRecording}
                  className={`h-28 w-28 rounded-full border-4 border-[#EAE5DB] flex items-center justify-center shadow-2xl transition-all ${
                    isRecording 
                      ? 'bg-red-500 scale-105' 
                      : 'bg-[#5B6B43] hover:scale-105 hover:bg-[#4a5836]'
                  }`}
                >
                  {isRecording ? (
                    <MicOff className="h-10 w-10 text-white" />
                  ) : (
                    <Mic className="h-10 w-10 text-white" />
                  )}
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="font-serif font-black text-2xl tracking-wide">
                  {isRecording ? "Guardian is listening..." : "Tap the sphere to talk"}
                </h3>
                <p className="font-mono text-[10px] text-[#EAE5DB]/60 max-w-sm uppercase tracking-widest leading-relaxed">
                  {isRecording 
                    ? "Speak naturally. I understand tasks, calendar shifts, accountability mail, and direct profile adjustments."
                    : "Tell me to create tasks, toggle settings, or navigate views."}
                </p>
              </div>

              {/* Dynamic waveform visualization lines */}
              {isRecording && (
                <div className="flex items-center gap-1 h-6 pt-2">
                  <div className="w-1 bg-[#C9A96E] rounded animate-[bounce_1s_infinite] h-4" />
                  <div className="w-1 bg-[#C9A96E] rounded animate-[bounce_0.8s_infinite] h-6" />
                  <div className="w-1 bg-[#C9A96E] rounded animate-[bounce_1.2s_infinite] h-3" />
                  <div className="w-1 bg-[#C9A96E] rounded animate-[bounce_0.7s_infinite] h-5" />
                  <div className="w-1 bg-[#C9A96E] rounded animate-[bounce_1s_infinite] h-4" />
                </div>
              )}
            </div>

            {/* Footer with hint prompts */}
            <div className="space-y-3 pb-4">
              <span className="font-mono text-[8px] text-stone-500 uppercase tracking-widest">
                Try Dictating Actionable Commands
              </span>
              <div className="flex flex-wrap justify-center gap-2">
                {actionCommands.map((act, actIdx) => (
                  <button
                    key={actIdx}
                    onClick={() => {
                      setInputMessage(act.text);
                      handleSendMessage(act.text);
                    }}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-3 py-1.5 text-[9px] font-mono uppercase text-stone-300 tracking-wider transition-all"
                  >
                    {act.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
