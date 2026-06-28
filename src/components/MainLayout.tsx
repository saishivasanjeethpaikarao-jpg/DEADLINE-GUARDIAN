import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Flame, Sparkles, Home, Calendar, List, Settings, LogOut, Mail, Cloud, RefreshCw, AlertCircle, Bot } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Task } from '../types';
import { TheSpine } from './TheSpine';
import { calculateStreak } from '../lib/tasks';

interface MainLayoutProps {
  children: React.ReactNode;
  tasks: Task[];
  currentView: 'dashboard' | 'tasks' | 'calendar' | 'settings' | 'voice-input' | 'focus' | 'email-agent' | 'companion';
  onNavigate: (view: 'dashboard' | 'tasks' | 'calendar' | 'settings' | 'voice-input' | 'email-agent' | 'companion') => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  tasks,
  currentView,
  onNavigate,
}) => {
  const { user, logout, isSyncing, syncError } = useAuth();
  const [isSpineExpanded, setIsSpineExpanded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const streak = calculateStreak(tasks);
  const goldColor = '#C9A96E';
  const [isDesktop, setIsDesktop] = useState(false);

  React.useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)');
    setIsDesktop(media.matches);
    const listener = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, description: 'Command Center' },
    { id: 'companion', label: 'Guardian Chat', icon: Bot, description: 'Autonomous Coach' },
    { id: 'email-agent', label: 'Email Agent', icon: Mail, description: 'Smart Email Copilot' },
    { id: 'calendar', label: 'Calendar', icon: Calendar, description: 'Weekly Blocks' },
    { id: 'voice-input', label: 'AI Agent', icon: Sparkles, description: 'Guardian Voice Coach' },
    { id: 'tasks', label: 'Tasks', icon: List, description: 'Milestones & Panic' },
    { id: 'settings', label: 'Settings', icon: Settings, description: 'Guardian Controls' },
  ] as const;

  if (currentView === 'focus') {
    return (
      <div className="min-h-screen bg-[#F5F1EB] text-[#292524] font-sans overflow-hidden relative flex flex-col w-full h-full">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1EB] text-[#292524] font-sans overflow-x-hidden relative flex flex-col">
      {/* Background Subtle Editorial Grid Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(41, 37, 36, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(41, 37, 36, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
          opacity: 0.85
        }}
      />

      {/* Decorative Soft Warm Overlay Glow */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#C9A96E]/[0.04] rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-10 right-1/4 w-[600px] h-[600px] bg-[#5B6B43]/[0.03] rounded-full blur-[150px] pointer-events-none z-0" />

      {/* MOBILE TOP NAVIGATION BAR */}
      <header className="md:hidden flex items-center justify-between px-5 py-4 bg-[#FAF8F5]/90 backdrop-blur-md border-b-2 border-[#292524]/10 sticky top-0 z-40">
        <div className="flex items-center gap-2" onClick={() => onNavigate('dashboard')}>
          <span className="font-serif text-xl font-bold tracking-tight text-[#292524]">
            D
          </span>
          <span className="font-serif text-xl font-black tracking-tight" style={{ color: '#5B6B43' }}>
            G
          </span>
          <span className="font-serif text-xs tracking-[0.2em] uppercase ml-1.5 text-stone-600 font-bold">
            Guardian
          </span>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-1 bg-[#5B6B43]/10 border-2 border-[#292524]/10 px-2.5 py-1 rounded-full">
              <Flame className="h-3.5 w-3.5" style={{ color: '#C4705A', fill: '#C4705A' }} />
              <span className="font-mono text-[10px] font-bold text-[#292524]">
                {streak}
              </span>
            </div>
          )}

          {user && (
            <div className="flex items-center gap-2">
              <AnimatePresence>
                {isSyncing && (
                  <motion.div
                    initial={{ opacity: 0, x: 5, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 5, scale: 0.95 }}
                    className="flex items-center gap-1 bg-amber-50/90 border border-amber-500/20 px-2 py-0.5 rounded-full text-[8px] font-mono font-black uppercase text-amber-700 tracking-wider shadow-sm animate-pulse"
                  >
                    <span className="h-1 w-1 bg-amber-500 rounded-full animate-ping" />
                    <span>Syncing...</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div 
                className={`h-7 w-7 rounded-xl flex items-center justify-center border-2 shadow-[1px_1px_0px_#292524] transition-all duration-300 ${
                  syncError 
                    ? 'bg-red-50 border-red-500 text-red-600' 
                    : isSyncing 
                      ? 'bg-amber-50 border-amber-500 text-amber-600' 
                      : 'bg-emerald-50 border-emerald-500 text-emerald-600'
                }`}
                title={syncError ? "Sync issue occurred" : isSyncing ? "Syncing..." : "All changes synced"}
              >
                {syncError ? (
                  <AlertCircle className="h-3.5 w-3.5 animate-pulse" />
                ) : isSyncing ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} />
                ) : (
                  <Cloud className="h-3.5 w-3.5" />
                )}
              </div>
            </div>
          )}
          
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 bg-[#FAF8F5] border-2 border-[#292524] rounded-xl text-[#292524] hover:bg-[#FAF8F5]/80 transition-colors shadow-[2px_2px_0px_rgba(41,37,36,0.15)] cursor-pointer"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER (Content resizes dynamically with Spine width on desktop) */}
      <div className="flex-1 flex relative w-full z-10">
        <motion.main
          className="flex-1 flex flex-col w-full min-h-screen transition-all"
          animate={{
            paddingLeft: isDesktop ? (isSpineExpanded ? 280 : 80) : 0,
            paddingRight: 0
          }}
          transition={{
            duration: 0.3,
            ease: [0.25, 1, 0.5, 1]
          }}
        >
          {/* Subtle mobile spacing adjustment */}
          <div className="flex-1 px-4 sm:px-6 md:px-8 py-6 md:py-8 w-full max-w-7xl mx-auto">
            {children}
          </div>
        </motion.main>

        {/* DESKTOP FIXED SPINE NAVIGATION */}
        <div className="hidden md:block">
          <TheSpine
            tasks={tasks}
            currentView={currentView}
            onNavigate={(view) => {
              onNavigate(view);
              setIsSpineExpanded(false);
            }}
            isExpanded={isSpineExpanded}
            onExpandedChange={setIsSpineExpanded}
          />
        </div>
      </div>

      {/* MOBILE BOTTOM SHEET / EXPANDABLE DRAWER */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black z-45 md:hidden"
            />

            {/* Bottom Drawer Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 max-h-[85vh] bg-[#FAF8F5] border-t-2 border-[#5B6B43]/40 rounded-t-[2.5rem] z-50 md:hidden p-6 overflow-y-auto shadow-[0_-15px_40px_rgba(41,37,36,0.12)] text-[#292524]"
            >
              {/* Decorative handle bar */}
              <div className="w-12 h-1 bg-stone-300 rounded-full mx-auto mb-6" />

              {/* Header inside Bottom Sheet */}
              <div className="text-center mb-6">
                <div className="flex justify-center items-center gap-1.5">
                  <span className="font-serif text-2xl font-bold text-[#292524]">D</span>
                  <span className="font-serif text-2xl font-black" style={{ color: '#5B6B43' }}>G</span>
                </div>
                <h3 className="font-serif text-xs tracking-[0.25em] text-[#5B6B43] font-black uppercase mt-1">
                  DEADLINE GUARDIAN
                </h3>
                <span className="font-mono text-[8px] text-stone-500 block tracking-widest mt-1">
                  Est. 2026 • AI CO-PILOT
                </span>
              </div>

              {/* Navigation Items list */}
              <div className="space-y-2.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full p-4 rounded-2xl flex items-center gap-4 transition-all duration-300 border-2 text-left"
                      style={{
                        backgroundColor: isActive ? 'rgba(91, 107, 67, 0.08)' : '#F5F1EB',
                        borderColor: isActive ? '#5B6B43' : 'rgba(41, 37, 36, 0.08)'
                      }}
                    >
                      <div 
                        className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border"
                        style={{
                          borderColor: isActive ? '#5B6B43' : 'rgba(41, 37, 36, 0.15)',
                          backgroundColor: isActive ? 'rgba(91, 107, 67, 0.1)' : 'transparent'
                        }}
                      >
                        <Icon className="h-5 w-5" style={{ color: isActive ? '#5B6B43' : '#78716C' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-serif text-sm font-extrabold text-[#292524] block">
                          {item.label}
                        </span>
                        <span className="font-mono text-[9px] text-stone-500 block mt-0.5 font-bold">
                          {item.description}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Streak Info inside Mobile Bottom Sheet */}
              <div className="mt-6 flex items-center justify-between p-4 bg-[#F5F1EB] border-2 border-[#292524]/10 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-amber-50/60 border border-[#C9A96E]/30 rounded-full flex items-center justify-center">
                    <Flame className="h-5 w-5" style={{ color: '#C4705A', fill: '#C4705A' }} />
                  </div>
                  <div className="text-left">
                    <span className="font-mono text-[9px] text-stone-500 uppercase tracking-widest block font-bold">Streak Record</span>
                    <span className="font-serif text-sm text-[#292524] block font-bold">{streak}-Day Active Streak</span>
                  </div>
                </div>
              </div>

              {/* User Profile avatar info inside mobile bottom sheet */}
              {user && (
                <div className="mt-4 flex items-center justify-between p-4 bg-[#F5F1EB] border-2 border-[#292524]/10 rounded-2xl">
                  <div className="flex items-center gap-3 min-w-0 text-left">
                    <div className="h-10 w-10 rounded-full border-2 border-[#5B6B43] flex items-center justify-center overflow-hidden shrink-0">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName || "Sai"} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="h-full w-full bg-[#EAE5DB] flex items-center justify-center font-serif text-sm font-bold text-[#292524]">S</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-serif text-sm font-black text-[#292524] truncate">{user.displayName || "Sai"}</h4>
                      <p className="font-mono text-[9px] text-[#5B6B43] uppercase font-bold truncate">{user.email}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="p-2.5 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer shrink-0"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MainLayout;
