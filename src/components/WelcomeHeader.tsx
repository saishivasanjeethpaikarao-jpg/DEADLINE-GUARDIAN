import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Brain, Settings, Mail, Bell, ShieldAlert, CheckCircle2, Flame } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Task } from '../types';
import { calculateStreak } from '../lib/tasks';

interface WelcomeHeaderProps {
  tasks: Task[];
}

export const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({ tasks }) => {
  const { user } = useAuth();
  const [partnerEmail, setPartnerEmail] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [saving, setSaving] = useState(false);

  const streak = calculateStreak(tasks);
  const completedThisWeek = tasks.filter(t => t.status === 'completed').length;


  // Load accountability partner email from Firestore on mount
  useEffect(() => {
    if (user && user.uid !== 'demo-user') {
      const loadSettings = async () => {
        try {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists()) {
            const data = snap.data();
            if (data.settings?.accountabilityPartnerEmail) {
              setPartnerEmail(data.settings.accountabilityPartnerEmail);
            }
          }
        } catch (e) {
          console.error("Error loading partner email:", e);
        }
      };
      loadSettings();
    }
  }, [user]);

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        settings: {
          accountabilityPartnerEmail: partnerEmail
        }
      }, { merge: true });
      setShowSettings(false);
      alert("Settings saved successfully! Accountability partner is configured.");
    } catch (e) {
      console.error("Error saving settings:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 md:p-8 text-white border border-slate-800 shadow-xl relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute right-0 top-0 h-40 w-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute left-10 bottom-0 h-24 w-24 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full w-fit">
              <Sparkles className="h-3.5 w-3.5 text-blue-400" />
              <span className="font-mono text-[10px] uppercase text-blue-300 font-bold tracking-widest animate-pulse">Active Guardian Session</span>
            </div>
            
            {streak > 0 ? (
              <div className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/35 px-3 py-1 rounded-full w-fit text-amber-400 font-semibold animate-bounce shadow-sm shadow-amber-500/10">
                <Flame className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                <span className="font-mono text-[10px] uppercase font-black tracking-wide">{streak} Day Task Streak</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-3 py-1 rounded-full w-fit text-slate-400">
                <Flame className="h-3.5 w-3.5 text-slate-500" />
                <span className="font-mono text-[10px] uppercase font-bold tracking-wide">0 Day Streak · Complete tasks!</span>
              </div>
            )}
          </div>
          <h1 className="font-sans font-extrabold text-3xl md:text-4xl tracking-tight text-white leading-none">
            Welcome Back, {user?.displayName ? user.displayName.split(' ')[0] : 'Guardian'}!
          </h1>
          <p className="font-sans text-sm text-slate-300 max-w-xl">
            You are currently on track to finish all high-priority project tasks. Let's tackle your milestones with autonomous scheduling!
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 bg-slate-800/90 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer"
          >
            <Settings className="h-4 w-4 text-slate-400" />
            Accountability Settings
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="mt-6 p-5 bg-slate-950/80 rounded-xl border border-slate-800/80 animate-fadeIn">
          <h3 className="font-sans font-bold text-sm text-white mb-3 flex items-center gap-2">
            <Mail className="h-4 w-4 text-blue-400" />
            Accountability Partner Integration
          </h3>
          <p className="font-sans text-xs text-slate-400 mb-4 max-w-xl">
            Configure a friend, parent, or mentor's email address. Deadline Guardian will automatically draft outline digests and extension request emails for them, so you stay accountable!
          </p>

          <form onSubmit={saveSettings} className="flex flex-col sm:flex-row gap-3 max-w-lg">
            <input
              type="email"
              value={partnerEmail}
              onChange={(e) => setPartnerEmail(e.target.value)}
              placeholder="partner-email@example.com"
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
              required
            />
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </form>
        </div>
      )}

      {/* Grid of micro stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 md:mt-8 pt-6 md:pt-8 border-t border-slate-800/80">
        <div className="flex items-center gap-3.5 bg-slate-950/50 p-4 rounded-xl border border-slate-800/40">
          <div className="h-10 w-10 bg-indigo-500/10 rounded-lg flex items-center justify-center border border-indigo-500/20">
            <Brain className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <span className="font-sans text-[10px] uppercase text-slate-400 tracking-wider block">Peak Productivity Window</span>
            <span className="font-sans text-sm font-bold block text-slate-100">09:00 AM – 11:30 AM</span>
          </div>
        </div>

        <div className="flex items-center gap-3.5 bg-slate-950/50 p-4 rounded-xl border border-slate-800/40">
          <div className="h-10 w-10 bg-emerald-500/10 rounded-lg flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <span className="font-sans text-[10px] uppercase text-slate-400 tracking-wider block">Completed Milestones</span>
            <span className="font-sans text-sm font-bold block text-slate-100">
              {completedThisWeek} Task{completedThisWeek !== 1 ? 's' : ''} Overall
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3.5 bg-slate-950/50 p-4 rounded-xl border border-slate-800/40">
          <div className="h-10 w-10 bg-red-500/10 rounded-lg flex items-center justify-center border border-red-500/20">
            <ShieldAlert className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <span className="font-sans text-[10px] uppercase text-slate-400 tracking-wider block">Guardian Alerts Avoided</span>
            <span className="font-sans text-sm font-bold block text-slate-100">100% On-Time Completion</span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default WelcomeHeader;
