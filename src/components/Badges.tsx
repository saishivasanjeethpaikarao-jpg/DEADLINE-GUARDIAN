import React from 'react';
import { AchievementBadge } from '../types';
import { 
  Award, Flame, Zap, Shield, Sun, Timer, Lock, Check, CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface BadgesProps {
  unlockedBadgeIds: string[];
  streakDays: number;
  completedTasksCount: number;
}

export const ALL_BADGES: AchievementBadge[] = [
  {
    id: 'early_bird',
    name: 'Early Bird Shield',
    description: 'Completed a critical task before 11:00 AM.',
    icon: 'Sun',
  },
  {
    id: 'streak_master',
    name: 'Streak Master',
    description: 'Maintained a focus streak of 3+ consecutive days.',
    icon: 'Flame',
    maxProgress: 3,
  },
  {
    id: 'alarm_champion',
    name: 'Alarm Champion',
    description: 'Completed a subtask on first smart alarm trigger with 0 snoozes.',
    icon: 'Zap',
  },
  {
    id: 'zen_master',
    name: 'Zen Master',
    description: 'Completed a full 25-minute Pomodoro block in Focus Mode.',
    icon: 'Timer',
  },
  {
    id: 'shield_titan',
    name: 'Shield Titan',
    description: 'Completed 5 total subtasks under Guardian surveillance.',
    icon: 'Shield',
    maxProgress: 5,
  }
];

export const Badges: React.FC<BadgesProps> = ({ 
  unlockedBadgeIds,
  streakDays,
  completedTasksCount
}) => {
  // Helper to choose matching badge icon
  const getBadgeIcon = (iconName: string, isUnlocked: boolean) => {
    const iconProps = {
      className: `h-6 w-6 transition-all ${
        isUnlocked ? 'text-[#FAF8F5]' : 'text-stone-400'
      }`
    };

    switch (iconName) {
      case 'Sun': return <Sun {...iconProps} />;
      case 'Flame': return <Flame {...iconProps} />;
      case 'Zap': return <Zap {...iconProps} />;
      case 'Timer': return <Timer {...iconProps} />;
      case 'Shield': return <Shield {...iconProps} />;
      default: return <Award {...iconProps} />;
    }
  };

  // Trigger manual confetti spray
  const handleSprayConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#5B6B43', '#FCF8D5', '#C4705A', '#292524']
    });
  };

  return (
    <div className="bg-[#FAF8F5] border-2 border-[#292524] rounded-2xl p-6 shadow-[6px_6px_0px_#292524] space-y-6 text-[#292524]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-[#292524]/10 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 bg-[#C4705A]/10 border-2 border-[#C4705A] rounded-lg flex items-center justify-center text-[#C4705A]">
            <Award className="h-4.5 w-4.5" />
          </div>
          <div className="text-left">
            <h2 className="font-serif font-extrabold text-lg">Guardian Milestones</h2>
            <p className="font-dm text-xs text-[#292524]/60">Earn achievements by beating procrastination locks</p>
          </div>
        </div>

        <button 
          onClick={handleSprayConfetti}
          className="bg-white hover:bg-stone-50 border-2 border-[#292524] px-3 py-1.5 rounded-xl text-[10px] font-mono font-black shadow-[2px_2px_0px_#292524] active:translate-y-0.5 cursor-pointer flex items-center gap-1"
        >
          🎉 Spray Confetti
        </button>
      </div>

      {/* Grid of Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {ALL_BADGES.map(badge => {
          const isUnlocked = unlockedBadgeIds.includes(badge.id);
          
          // Compute real-time progress values
          let currentProgress = 0;
          if (badge.id === 'streak_master') {
            currentProgress = Math.min(streakDays, 3);
          } else if (badge.id === 'shield_titan') {
            currentProgress = Math.min(completedTasksCount, 5);
          }

          const hasProgress = badge.maxProgress !== undefined && !isUnlocked;
          const progressPercent = hasProgress ? (currentProgress / badge.maxProgress!) * 100 : 0;

          return (
            <div 
              key={badge.id}
              className={`relative border-2 rounded-xl p-4 flex flex-col justify-between transition-all duration-300 ${
                isUnlocked 
                  ? 'border-[#292524] bg-white shadow-[4px_4px_0px_#292524] hover:scale-[1.03] hover:shadow-[6px_6px_0px_#292524]' 
                  : 'border-[#292524]/20 bg-[#FAF8F5]/50 opacity-70'
              }`}
            >
              {/* Unlocked / Locked Icon Indicator */}
              <div className="absolute top-3 right-3">
                {isUnlocked ? (
                  <span className="h-5 w-5 rounded-full bg-emerald-100 border border-emerald-500 flex items-center justify-center text-emerald-700 font-bold text-xs">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </span>
                ) : (
                  <span className="h-5 w-5 rounded-full bg-stone-100 border border-stone-300 flex items-center justify-center text-stone-400">
                    <Lock className="h-3 w-3" />
                  </span>
                )}
              </div>

              {/* Badge Visual Circle */}
              <div className="flex items-center gap-3">
                <div className={`h-11 w-11 rounded-full border-2 border-[#292524] flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#292524] ${
                  isUnlocked 
                    ? 'bg-[#5B6B43]' 
                    : 'bg-stone-100'
                }`}>
                  {getBadgeIcon(badge.icon, isUnlocked)}
                </div>

                <div className="text-left">
                  <h4 className={`font-serif text-sm font-black ${isUnlocked ? 'text-[#292524]' : 'text-stone-500'}`}>
                    {badge.name}
                  </h4>
                  <p className="font-dm text-[11px] text-stone-500 leading-tight mt-0.5 max-w-[180px]">
                    {badge.description}
                  </p>
                </div>
              </div>

              {/* Progress Bar for progress-tracked badges */}
              {hasProgress && (
                <div className="mt-4 space-y-1 text-left">
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold text-stone-500">
                    <span>PROGRESS</span>
                    <span>{currentProgress}/{badge.maxProgress}</span>
                  </div>
                  <div className="h-2 bg-[#292524]/10 rounded-full overflow-hidden border border-[#292524]/5">
                    <div 
                      className="bg-[#C4705A] h-full transition-all duration-500" 
                      style={{ width: `${progressPercent}%` }} 
                    />
                  </div>
                </div>
              )}

              {/* Achievement Unlocked Info for completed badge */}
              {isUnlocked && (
                <div className="mt-4 flex items-center gap-1 text-[10px] font-mono font-black uppercase text-[#5B6B43] tracking-wider text-left">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Shield Milestone Secured
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default Badges;
