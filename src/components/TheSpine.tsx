import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Home, Calendar, Sparkles, List, Settings, LogOut, Flame, ShieldAlert, Sparkle, Mail, Cloud, RefreshCw, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Task } from '../types';
import { calculateStreak } from '../lib/tasks';

interface TheSpineProps {
  tasks?: Task[];
  currentView: 'dashboard' | 'tasks' | 'calendar' | 'settings' | 'voice-input' | 'email-agent';
  onNavigate: (view: 'dashboard' | 'tasks' | 'calendar' | 'settings' | 'voice-input' | 'email-agent') => void;
  isExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export const TheSpine: React.FC<TheSpineProps> = ({
  tasks = [],
  currentView,
  onNavigate,
  isExpanded: controlledIsExpanded,
  onExpandedChange
}) => {
  const { user, logout, isSyncing, syncError } = useAuth();
  const [internalIsExpanded, setInternalIsExpanded] = useState(false);
  
  const isExpanded = controlledIsExpanded !== undefined ? controlledIsExpanded : internalIsExpanded;
  const setIsExpanded = (expanded: boolean) => {
    if (onExpandedChange) {
      onExpandedChange(expanded);
    } else {
      setInternalIsExpanded(expanded);
    }
  };
  
  const streak = calculateStreak(tasks);
  
  // Custom navigation items configuration matching specs
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, description: 'Command Center' },
    { id: 'email-agent', label: 'Email Agent', icon: Mail, description: 'Smart Email Copilot' },
    { id: 'calendar', label: 'Calendar', icon: Calendar, description: 'Weekly Blocks' },
    { id: 'voice-input', label: 'AI Agent', icon: Sparkles, description: 'Guardian Voice Coach' },
    { id: 'tasks', label: 'Tasks', icon: List, description: 'Milestones & Panic' },
    { id: 'settings', label: 'Settings', icon: Settings, description: 'Guardian Controls' },
  ] as const;

  // Gold/bronze luxury color palette constants
  const goldColor = '#C9A96E';
  const oliveColor = '#5B6B43';

  return (
    <motion.aside
      id="the-spine-navigation"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      className="fixed left-0 top-0 bottom-0 h-full z-50 flex flex-col justify-between border-r-2 border-[#5B6B43]/20 text-[#292524] select-none shadow-[10px_0_35px_rgba(41,37,36,0.06)] overflow-y-auto scrollbar-none"
      style={{
        background: 'linear-gradient(180deg, #F0ECE3 0%, #EAE5DB 100%)',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}
      animate={{
        width: isExpanded ? 280 : 80
      }}
      transition={{
        duration: 0.3,
        ease: [0.25, 1, 0.5, 1] // Custom premium ease-out
      }}
    >
      {/* Decorative vertical binding grooves (luxury book-spine aesthetic) */}
      <div className="absolute top-0 bottom-0 left-1 w-[1px] bg-gradient-to-b from-transparent via-[#5B6B43]/10 to-transparent pointer-events-none" />
      <div className="absolute top-0 bottom-0 left-2 w-[1px] bg-gradient-to-b from-transparent via-white/20 to-transparent pointer-events-none" />

      {/* TOP SECTION: MONOGRAM & LOGO */}
      <div className="pt-8 flex flex-col items-center">
        {/* Animated DG Logo */}
        <motion.div
          className="relative cursor-pointer flex items-center justify-center h-12 w-12"
          animate={{
            rotate: isExpanded ? 0 : 90,
            scale: isExpanded ? 1.05 : 0.95
          }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          onClick={() => onNavigate('dashboard')}
        >
          {/* Overlapping classic luxury serif Monogram */}
          <span className="font-serif text-3xl font-bold tracking-tighter text-[#292524] absolute -translate-x-1.5 -translate-y-1">
            D
          </span>
          <span 
            className="font-serif text-3xl font-black tracking-tighter absolute translate-x-1.5 translate-y-1"
            style={{ color: oliveColor }}
          >
            G
          </span>
          {/* Olive/gold speck accent */}
          <Sparkle 
            className="absolute top-1 right-2 h-2 w-2 animate-pulse"
            style={{ color: oliveColor, fill: oliveColor }} 
          />
        </motion.div>

        {/* Horizontal title when expanded, collapsed is fully clean */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              key="expanded-spine-title"
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="text-center px-4 overflow-hidden w-full"
            >
              <h3 className="font-serif text-xs tracking-[0.3em] text-[#292524] font-black uppercase leading-none">
                DEADLINE
              </h3>
              <h3 className="font-serif text-xs tracking-[0.3em] mt-1.5 font-black uppercase leading-none" style={{ color: oliveColor }}>
                GUARDIAN
              </h3>
              <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-[#5B6B43]/30 to-transparent mx-auto my-3" />
              <span className="font-mono text-[7px] text-stone-600 tracking-[0.2em] font-black block uppercase">
                Est. 2026 • AI Co-Pilot
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MIDDLE SECTION: LUXURY NAVIGATION ITEMS */}
      <nav className="flex-1 flex flex-col justify-center gap-2 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="relative w-full py-3.5 rounded-xl flex items-center transition-all duration-300 group cursor-pointer"
              style={{
                backgroundColor: isActive ? 'rgba(91, 107, 67, 0.08)' : 'transparent'
              }}
            >
              {/* Premium active status bar indicator (vintage book binder stitch style) */}
              {isActive && (
                <motion.div
                  layoutId="spineActiveIndicator"
                  className="absolute right-0 top-2 bottom-2 w-1 rounded-l-full"
                  style={{ backgroundColor: oliveColor }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}

              {/* Icon component center alignment */}
              <div className="w-[56px] flex items-center justify-center shrink-0">
                <Icon
                  className="h-5 w-5 transition-transform duration-300 group-hover:scale-110"
                  style={{
                    color: isActive ? oliveColor : '#78716C',
                    strokeWidth: isActive ? 2.2 : 1.8
                  }}
                />
              </div>

              {/* Expandable Label */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col text-left min-w-0 pr-2"
                  >
                    <span 
                      className="font-serif text-xs font-bold tracking-wide truncate"
                      style={{ color: isActive ? '#292524' : '#57534E' }}
                    >
                      {item.label}
                    </span>
                    <span className="font-mono text-[8px] text-stone-500 tracking-normal uppercase truncate mt-0.5 font-bold">
                      {item.description}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Collapsed simple hover tooltip */}
              {!isExpanded && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 ml-14 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 z-50 bg-[#FAF8F5] border-2 border-[#292524]/10 text-[#292524] font-serif text-[10px] tracking-widest uppercase py-1 px-2.5 rounded-md whitespace-nowrap shadow-md">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* BOTTOM SECTION: USER METADATA (Sai) & PROFILE CONTROL */}
      <div className="pb-8 px-3 border-t border-[#5B6B43]/15 pt-6 flex flex-col items-center gap-4">
        {/* Streak Flame (Compact indicator) */}
        {!isExpanded ? (
          <div className="h-8 w-8 bg-[#5B6B43]/10 border border-[#5B6B43]/25 rounded-full flex items-center justify-center cursor-help group relative" title={`${streak} Day Streak!`}>
            <Flame className="h-4 w-4" style={{ color: '#C4705A', fill: '#C4705A' }} />
            {streak > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#C4705A] text-white text-[8px] font-mono font-bold rounded-full h-4 w-4 flex items-center justify-center border border-[#FAF8F5]">
                {streak}
              </span>
            )}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex items-center gap-2 px-2.5 py-2 bg-[#FAF8F5] border-2 border-[#292524]/10 rounded-xl"
          >
            <Flame className="h-4 w-4 shrink-0 animate-pulse" style={{ color: '#C4705A', fill: '#C4705A' }} />
            <div className="flex-1 text-left min-w-0">
              <span className="font-mono text-[9px] font-black text-[#292524] block leading-tight uppercase">
                Continuous Focus
              </span>
              <span className="font-serif text-[10px] font-bold text-[#292524]/75 block mt-0.5">
                {streak > 0 ? `${streak}-Day Active Streak` : '0-Day Setup'}
              </span>
            </div>
          </motion.div>
        )}

        {/* Global Sync Indicator */}
        {!isExpanded ? (
          <div 
            className={`h-8 w-8 rounded-full flex items-center justify-center cursor-help group relative border-2 bg-[#FAF8F5] shadow-[1px_1px_0px_#292524] transition-all duration-300 ${
              syncError 
                ? 'border-red-500 bg-red-50' 
                : isSyncing 
                  ? 'border-amber-500 bg-amber-50/50' 
                  : 'border-[#5B6B43]/20'
            }`} 
            title={syncError ? "Sync issue occurred" : isSyncing ? "Syncing changes to Firestore..." : "All changes synced to cloud"}
          >
            {syncError ? (
              <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" />
            ) : isSyncing ? (
              <div className="relative flex items-center justify-center">
                <RefreshCw className="h-4 w-4 text-amber-600 animate-spin" strokeWidth={2.5} />
                {/* Subtle outer ripple for non-expanded view */}
                <span className="absolute -inset-1 border border-amber-500/40 rounded-full animate-ping pointer-events-none" />
              </div>
            ) : (
              <div className="relative">
                <Cloud className="h-4 w-4 text-emerald-600" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 bg-emerald-500 rounded-full border border-[#FAF8F5] animate-pulse" />
              </div>
            )}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 border-2 rounded-xl text-[9px] font-mono font-black uppercase tracking-wider shadow-[2px_2px_0px_#292524] transition-all duration-300 ${
              syncError 
                ? 'bg-red-50/90 border-red-500 text-red-700' 
                : isSyncing 
                  ? 'bg-amber-50/90 border-amber-500 text-amber-700' 
                  : 'bg-emerald-50/90 border-emerald-600 text-emerald-800'
            }`}
          >
            {syncError ? (
              <>
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-600 animate-pulse" />
                <span>Sync Error</span>
              </>
            ) : isSyncing ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 shrink-0 text-amber-600 animate-spin" strokeWidth={2.5} />
                <motion.span
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                >
                  Syncing...
                </motion.span>
              </>
            ) : (
              <>
                <Cloud className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span>Cloud Synced</span>
              </>
            )}
          </motion.div>
        )}

        {/* User Identity Avatar */}
        <div className="w-full flex items-center justify-between gap-2.5 px-1.5">
          <div className="flex items-center gap-3 min-w-0">
            {/* Round Avatar Container with Olive Ring */}
            <div 
              className="h-10 w-10 rounded-full shrink-0 flex items-center justify-center overflow-hidden border-2"
              style={{ borderColor: '#5B6B43' }}
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "Sai"}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="h-full w-full bg-[#EAE5DB] flex items-center justify-center font-serif text-sm font-bold text-[#292524]">
                  S
                </div>
              )}
            </div>

            {/* User name information when expanded */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -5 }}
                  className="flex flex-col text-left min-w-0"
                >
                  <span className="font-serif text-sm font-black text-[#292524] truncate">
                    {user?.displayName ? user.displayName.split(' ')[0] : "Sai"}
                  </span>
                  <span className="font-mono text-[9px] text-[#5B6B43] tracking-tight uppercase font-bold truncate">
                    Guardian Shield
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Logout button (Visible only when expanded) */}
          <AnimatePresence>
            {isExpanded && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={logout}
                title="Sign Out Session"
                className="h-8 w-8 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center justify-center cursor-pointer shrink-0"
              >
                <LogOut className="h-4 w-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
};

export default TheSpine;
