import React from 'react';
import { 
  Award, Shield, Flame, Brain, Clock, Lock, Sparkles, AlertCircle 
} from 'lucide-react';

interface AchievementBadge {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: any;
}

interface BadgesGridProps {
  unlockedIds: string[];
}

export const BadgesGrid: React.FC<BadgesGridProps> = ({ unlockedIds = [] }) => {
  const badgeDefinitions: AchievementBadge[] = [
    {
      id: 'early_bird',
      name: 'Early Bird',
      description: 'Checked off any high-priority task block before 9:00 AM',
      color: 'bg-yellow-100 text-yellow-700 border-yellow-400 dark:bg-yellow-950/40 dark:text-yellow-300',
      icon: Clock
    },
    {
      id: 'streak_master',
      name: 'Streak Master',
      description: 'Sustained a continuous 3+ day milestone completion streak',
      color: 'bg-orange-100 text-orange-700 border-orange-400 dark:bg-orange-950/40 dark:text-orange-300',
      icon: Flame
    },
    {
      id: 'focus_master',
      name: 'Focus Master',
      description: 'Completed any full distraction-free Focus Mode session',
      color: 'bg-purple-100 text-purple-700 border-purple-400 dark:bg-purple-950/40 dark:text-purple-300',
      icon: Brain
    },
    {
      id: 'alarm_champion',
      name: 'Alarm Champion',
      description: 'Responded immediately to Smart Alarm with 0 snoozes',
      color: 'bg-emerald-100 text-emerald-700 border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-300',
      icon: Shield
    },
    {
      id: 'shield_titan',
      name: 'Shield Titan',
      description: 'Defended 5+ task deadlines overall to secure academic goals',
      color: 'bg-blue-100 text-blue-700 border-blue-400 dark:bg-blue-950/40 dark:text-blue-300',
      icon: Award
    }
  ];

  const unlockedCount = badgeDefinitions.filter(b => unlockedIds.includes(b.id)).length;

  return (
    <div className="bg-white dark:bg-slate-800 border-2 border-[#292524] rounded-2xl p-5 shadow-[4px_4px_0px_#292524] text-[#292524] text-left space-y-4" id="badges-achievements-panel">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#292524]/10 pb-3">
        <div className="space-y-0.5">
          <h3 className="font-serif font-black text-sm uppercase tracking-wide flex items-center gap-1.5">
            <Award className="h-4.5 w-4.5 text-[#5B6B43]" />
            Guardian Shield Milestones
          </h3>
          <p className="font-dm text-[11px] text-[#292524]/50">Gamified trophies earned from bulletproof discipline</p>
        </div>
        <span className="font-mono text-[10px] font-black uppercase bg-[#5B6B43]/10 text-[#5B6B43] border border-[#5B6B43]/20 px-2.5 py-0.5 rounded-full">
          {unlockedCount} / {badgeDefinitions.length} Earned
        </span>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {badgeDefinitions.map(badge => {
          const isUnlocked = unlockedIds.includes(badge.id);
          const IconComponent = badge.icon;

          return (
            <div 
              key={badge.id}
              className={`p-3 border-2 rounded-xl flex items-start gap-3 transition-all relative overflow-hidden ${
                isUnlocked 
                  ? `${badge.color} hover:scale-[1.01]` 
                  : 'bg-[#FAF8F5]/40 border-stone-200 text-stone-400 opacity-60'
              }`}
            >
              {/* Unlocked Sparkles glow */}
              {isUnlocked && (
                <div className="absolute top-1.5 right-1.5" title="Completed!">
                  <Sparkles className="h-3.5 w-3.5 text-yellow-500 animate-pulse" />
                </div>
              )}

              {/* Icon Container */}
              <div className={`p-2 rounded-lg border-2 shrink-0 ${
                isUnlocked 
                  ? 'bg-white dark:bg-slate-900 border-[#292524]' 
                  : 'bg-stone-100 border-stone-300'
              }`}>
                {isUnlocked ? (
                  <IconComponent className="h-5 w-5" />
                ) : (
                  <Lock className="h-5 w-5 text-stone-400" />
                )}
              </div>

              {/* Text Info */}
              <div className="space-y-0.5 min-w-0">
                <h4 className={`font-serif font-black text-xs truncate ${isUnlocked ? 'text-[#292524]' : 'text-stone-400'}`}>
                  {badge.name}
                </h4>
                <p className="font-dm text-[10px] leading-tight line-clamp-2">
                  {badge.description}
                </p>
                {isUnlocked && (
                  <span className="font-mono text-[8px] uppercase tracking-wider font-bold block pt-1 text-[#5B6B43]">
                    🛡️ UNLOCKED
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default BadgesGrid;
