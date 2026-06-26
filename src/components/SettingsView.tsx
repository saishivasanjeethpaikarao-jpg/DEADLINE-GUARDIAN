import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, Shield, Mail, Bell, Sparkles, Sliders, CheckCircle, Volume2 } from 'lucide-react';
import { AlarmHistoryItem } from '../types';
import { getAlarmHistory } from '../lib/tasks';
import { AlarmHistoryChart } from './AlarmHistoryChart';

interface SettingsViewProps {
  onSaved: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onSaved }) => {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [alarmSound, setAlarmSound] = useState('mama_coach');
  const [snoozeMin, setSnoozeMin] = useState(10);
  const [peakMorning, setPeakMorning] = useState(true);
  const [peakAfternoon, setPeakAfternoon] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alarmHistory, setAlarmHistory] = useState<AlarmHistoryItem[]>([]);

  // Load configuration from Firestore and load alarm history
  useEffect(() => {
    if (user) {
      getAlarmHistory(user.uid).then(history => setAlarmHistory(history));
    }

    if (user && user.uid !== 'demo-user') {
      const loadConfig = async () => {
        try {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists()) {
            const data = snap.data();
            if (data.displayName) setDisplayName(data.displayName);
            if (data.settings) {
              if (data.settings.accountabilityPartnerEmail) {
                setPartnerEmail(data.settings.accountabilityPartnerEmail);
              }
              if (data.settings.alarmSound) {
                setAlarmSound(data.settings.alarmSound);
              }
              if (data.settings.snoozeDefaultMinutes) {
                setSnoozeMin(data.settings.snoozeDefaultMinutes);
              }
              if (data.settings.notificationsEnabled !== undefined) {
                setNotifications(data.settings.notificationsEnabled);
              }
            }
            if (data.productivityPattern?.peakHours) {
              const hours = data.productivityPattern.peakHours;
              setPeakMorning(hours.includes(9));
              setPeakAfternoon(hours.includes(14));
            }
          }
        } catch (e) {
          console.error("Error loading user settings:", e);
        }
      };
      loadConfig();
    }
  }, [user]);

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    const peakHours = [];
    if (peakMorning) peakHours.push(9, 10, 11);
    if (peakAfternoon) peakHours.push(14, 15, 16);

    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        displayName,
        settings: {
          accountabilityPartnerEmail: partnerEmail,
          alarmSound,
          snoozeDefaultMinutes: Number(snoozeMin),
          notificationsEnabled: notifications,
          autoReschedule: true
        },
        productivityPattern: {
          peakHours,
          preferredWorkLocation: "Desk Workspace"
        }
      }, { merge: true });
      
      alert("Settings saved successfully! Deadline Guardian config updated.");
      onSaved();
    } catch (e) {
      console.error("Error saving config:", e);
      alert("Failed to save configuration. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSaveAll} className="space-y-6">
      <div className="bg-[#FAF8F5] border-2 border-[#292524] rounded-2xl p-6 shadow-[6px_6px_0px_#292524] space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 border-b-2 border-[#292524]/10 pb-4">
          <div className="h-9 w-9 bg-[#5B6B43]/10 border-2 border-[#5B6B43] rounded-lg flex items-center justify-center text-[#5B6B43]">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif font-extrabold text-lg text-[#292524]">Account Settings & Guardian Profile</h2>
            <p className="font-dm text-xs text-[#292524]/60">Customize AI coaching voices, schedule rules, and partner triggers</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column 1: Profile & Accountability */}
          <div className="space-y-4">
            <h3 className="font-serif font-black text-sm text-[#292524] uppercase tracking-wider flex items-center gap-2">
              <User className="h-4 w-4 text-[#5B6B43]" />
              Personal Profile
            </h3>

            <div>
              <label className="font-mono text-[10px] uppercase text-[#292524]/50 font-black block mb-1">Your Full Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Alex Carter"
                className="w-full bg-[#F5F1EB] border-2 border-[#292524] rounded-xl px-4 py-2.5 text-xs text-[#292524] placeholder-[#292524]/40 font-dm focus:outline-none focus:ring-1 focus:ring-[#5B6B43]"
                required
              />
            </div>

            <div className="pt-2 border-t border-[#292524]/10 space-y-3">
              <h3 className="font-serif font-black text-sm text-[#292524] uppercase tracking-wider flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#C4705A]" />
                Accountability Partner Integration
              </h3>
              <p className="font-dm text-xs text-[#292524]/70 leading-relaxed">
                Provide a parent's or mentor's email address. Deadline Guardian sends pre-drafted status digests, progress outlines, and delay justifications here automatically.
              </p>
              <div>
                <label className="font-mono text-[10px] uppercase text-[#292524]/50 font-black block mb-1">Partner Email Address</label>
                <input
                  type="email"
                  value={partnerEmail}
                  onChange={(e) => setPartnerEmail(e.target.value)}
                  placeholder="parent-email@example.com"
                  className="w-full bg-[#F5F1EB] border-2 border-[#292524] rounded-xl px-4 py-2.5 text-xs text-[#292524] placeholder-[#292524]/40 font-dm focus:outline-none focus:ring-1 focus:ring-[#5B6B43]"
                />
              </div>
            </div>
          </div>

          {/* Column 2: Alarms & Peak Energy Hours */}
          <div className="space-y-4 border-t md:border-t-0 md:border-l border-[#292524]/10 md:pl-6">
            <h3 className="font-serif font-black text-sm text-[#292524] uppercase tracking-wider flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-[#5B6B43]" />
              Smart Alarm Settings
            </h3>

            <div>
              <label className="font-mono text-[10px] uppercase text-[#292524]/50 font-black block mb-1">AI Coach Speaking Style</label>
              <select
                value={alarmSound}
                onChange={(e) => setAlarmSound(e.target.value)}
                className="w-full bg-[#F5F1EB] border-2 border-[#292524] rounded-xl px-3 py-2.5 text-xs text-[#292524] font-dm focus:outline-none"
              >
                <option value="mama_coach">👩 Mama's Idea (Loving Support & Discipline)</option>
                <option value="drill_sergeant">🎖️ Drill Sergeant (Action-Oriented & Urgent)</option>
                <option value="gentle_zen">🧘 Gentle Zen Coach (Mindful & Quiet Flow)</option>
              </select>
            </div>

            <div>
              <label className="font-mono text-[10px] uppercase text-[#292524]/50 font-black block mb-1">Default Snooze Delay</label>
              <select
                value={snoozeMin}
                onChange={(e) => setSnoozeMin(Number(e.target.value))}
                className="w-full bg-[#F5F1EB] border-2 border-[#292524] rounded-xl px-3 py-2.5 text-xs text-[#292524] font-dm focus:outline-none"
              >
                <option value="5">5 Minutes</option>
                <option value="10">10 Minutes</option>
                <option value="15">15 Minutes</option>
              </select>
            </div>

            <div className="pt-2 border-t border-[#292524]/10 space-y-3">
              <h3 className="font-serif font-black text-sm text-[#292524] uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#5B6B43]" />
                Peak Energy Hours
              </h3>
              <p className="font-dm text-xs text-[#292524]/70 leading-relaxed">
                Select your peak cognitive focus windows. Gemini will automatically plan study blocks and alarms in these zones to boost efficiency.
              </p>
              
              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-dm text-xs text-[#292524]">
                  <input
                    type="checkbox"
                    checked={peakMorning}
                    onChange={(e) => setPeakMorning(e.target.checked)}
                    className="accent-[#5B6B43] h-4 w-4 rounded"
                  />
                  Morning Focus (09:00 AM – 12:00 PM)
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-dm text-xs text-[#292524]">
                  <input
                    type="checkbox"
                    checked={peakAfternoon}
                    onChange={(e) => setPeakAfternoon(e.target.checked)}
                    className="accent-[#5B6B43] h-4 w-4 rounded"
                  />
                  Afternoon Focus (02:00 PM – 05:00 PM)
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Alarm History Trends D3 Section */}
        <div className="pt-6 border-t-2 border-[#292524]/10 space-y-4">
          <div className="text-left">
            <h3 className="font-serif font-black text-sm text-[#292524] uppercase tracking-wider">
              Guardian Accountability Metrics
            </h3>
            <p className="font-dm text-xs text-[#292524]/60">
              Analysis of snooze habits versus immediate completion behaviors. Beat the snooze to unlock premium achievements.
            </p>
          </div>
          <AlarmHistoryChart history={alarmHistory} />
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#292524]/10">
          <button
            type="submit"
            disabled={saving}
            className="bg-[#5B6B43] hover:bg-[#4a5836] active:translate-y-0.5 disabled:opacity-50 text-[#FAF8F5] font-dm font-bold text-xs px-6 py-3 rounded-xl border-2 border-[#292524] shadow-[4px_4px_0px_#292524] transition-all cursor-pointer flex items-center gap-2"
          >
            {saving ? 'Updating Settings...' : 'Save All Preferences'}
            <CheckCircle className="h-4 w-4" />
          </button>
        </div>
      </div>
    </form>
  );
};
export default SettingsView;
