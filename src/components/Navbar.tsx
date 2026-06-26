import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Flame, Calendar, List, Home, Sparkles, User } from 'lucide-react';
import { Task } from '../types';
import { calculateStreak } from '../lib/tasks';
import { Logo } from './Logo';

interface NavbarProps {
  tasks?: Task[];
  currentView: 'dashboard' | 'tasks' | 'calendar' | 'settings' | 'voice-input';
  onNavigate: (view: 'dashboard' | 'tasks' | 'calendar' | 'settings' | 'voice-input') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  tasks = [], 
  currentView, 
  onNavigate 
}) => {
  const { user, logout } = useAuth();
  const streak = calculateStreak(tasks);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'tasks', label: 'Tasks', icon: List },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'voice-input', label: 'AI Agent', icon: Sparkles },
    { id: 'settings', label: 'Profile', icon: User },
  ] as const;

  return (
    <>
      {/* Top Brand Header Bar */}
      <nav className="bg-[#FAF8F5] border-b-4 border-[#292524] text-[#292524] sticky top-0 z-40 px-4 md:px-8 py-3.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo and Brand */}
          <div className="cursor-pointer" onClick={() => onNavigate('dashboard')}>
            <Logo variant="horizontal" isDarkBg={false} />
          </div>

          {/* User profile & actions */}
          <div className="flex items-center justify-end gap-3">
            {user && (
              <>
                {/* Streak info */}
                <div className="flex items-center gap-1.5 bg-[#FCF8D5] border-2 border-[#292524] px-2.5 md:px-3.5 py-1 md:py-1.5 rounded-full shadow-sm">
                  <Flame className="h-3.5 w-3.5 md:h-4 md:w-4 text-[#C4705A] fill-[#C4705A] animate-pulse" />
                  <span className="font-mono text-[9px] md:text-[10px] font-black uppercase text-[#292524]">
                    {streak > 0 ? `${streak}-Day Streak` : '0-Day Streak'}
                  </span>
                </div>

                {/* User Identity Avatar */}
                <div className="flex items-center gap-2 bg-[#FAF8F5] border-2 border-[#292524] px-2 py-1 md:px-3 md:py-1.5 rounded-xl">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || "Avatar"}
                      className="h-5 w-5 md:h-6 md:w-6 rounded-full border border-[#292524]/20 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-5 w-5 md:h-6 md:w-6 rounded-full bg-[#5B6B43] flex items-center justify-center text-[9px] md:text-[10px] font-black text-white">
                      {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'G'}
                    </div>
                  )}
                  <span className="font-dm text-xs font-bold text-[#292524] hidden sm:inline">
                    {user.displayName ? user.displayName.split(' ')[0] : "Guardian"}
                  </span>
                </div>

                {/* Log out */}
                <button
                  onClick={logout}
                  title="Log out session"
                  className="h-8 w-8 md:h-9 md:w-9 rounded-xl bg-[#FAF8F5] hover:bg-red-50 border-2 border-[#292524] flex items-center justify-center text-[#292524] hover:text-red-700 hover:border-red-700 transition-colors cursor-pointer active:translate-y-0.5"
                >
                  <LogOut className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Clean Bottom Navigation Bar */}
      {user && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#FAF8F5] border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] z-40 pb-safe">
          <div className="max-w-xl mx-auto flex items-center justify-around px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex-1 flex flex-col items-center justify-center pt-3 pb-2 transition-all cursor-pointer border-t-2 -mt-[1px] ${
                    isActive
                      ? 'border-indigo-600 text-indigo-600 font-bold'
                      : 'border-transparent text-[#292524]/60 hover:text-[#292524] hover:bg-gray-50/50'
                  }`}
                >
                  <Icon className={`h-5 w-5 mb-1 ${isActive ? 'text-indigo-600' : 'text-[#292524]/60'}`} />
                  <span className="font-dm text-[10px] md:text-xs tracking-wide whitespace-nowrap">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};
export default Navbar;
