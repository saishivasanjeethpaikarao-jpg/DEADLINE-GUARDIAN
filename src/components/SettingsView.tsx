import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, Shield, Mail, Bell, Sparkles, Sliders, CheckCircle, Volume2, ShieldAlert, RefreshCw } from 'lucide-react';
import { AlarmHistoryItem } from '../types';
import { getAlarmHistory } from '../lib/tasks';
import { AlarmHistoryChart } from './AlarmHistoryChart';
import { playChime } from '../lib/audio';

interface SettingsViewProps {
  onSaved: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onSaved }) => {
  const { user, setSyncing, setSyncError } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [alarmSound, setAlarmSound] = useState('mama_coach');
  const [snoozeMin, setSnoozeMin] = useState(10);
  const [preferredChime, setPreferredChime] = useState('retro_pulse');
  const [autoSendEmails, setAutoSendEmails] = useState(false);
  const [autoSendLoading, setAutoSendLoading] = useState(false);
  const [autoSendHistory, setAutoSendHistory] = useState<any[]>([]);
  const [peakMorning, setPeakMorning] = useState(true);
  const [peakAfternoon, setPeakAfternoon] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [alarmHistory, setAlarmHistory] = useState<AlarmHistoryItem[]>([]);

  // Load configuration from Firestore and load alarm history
  useEffect(() => {
    if (user) {
      getAlarmHistory(user.uid).then(history => setAlarmHistory(history));
    }

    if (user) {
      const loadConfig = async () => {
        try {
          // 1. Load from localStorage cache first for immediate responsiveness
          const stored = localStorage.getItem(`dg_settings_cache_${user.uid}`);
          if (stored) {
            const data = JSON.parse(stored);
            if (data.displayName) setDisplayName(data.displayName);
            if (data.partnerEmail) setPartnerEmail(data.partnerEmail);
            if (data.alarmSound) setAlarmSound(data.alarmSound);
            if (data.snoozeMin) setSnoozeMin(Number(data.snoozeMin));
            if (data.preferredChime) setPreferredChime(data.preferredChime);
            if (data.autoSendEmails !== undefined) setAutoSendEmails(data.autoSendEmails);
            if (data.autoSendHistory !== undefined) setAutoSendHistory(data.autoSendHistory);
            if (data.peakMorning !== undefined) setPeakMorning(data.peakMorning);
            if (data.peakAfternoon !== undefined) setPeakAfternoon(data.peakAfternoon);
            if (data.notifications !== undefined) setNotifications(data.notifications);
          } else if (user.uid === 'demo-user') {
            const legacyStored = localStorage.getItem(`dg_demo_settings_${user.uid}`);
            if (legacyStored) {
              const data = JSON.parse(legacyStored);
              if (data.displayName) setDisplayName(data.displayName);
              if (data.partnerEmail) setPartnerEmail(data.partnerEmail);
              if (data.alarmSound) setAlarmSound(data.alarmSound);
              if (data.snoozeMin) setSnoozeMin(Number(data.snoozeMin));
              if (data.preferredChime) setPreferredChime(data.preferredChime);
              if (data.autoSendEmails !== undefined) setAutoSendEmails(data.autoSendEmails);
              if (data.autoSendHistory !== undefined) setAutoSendHistory(data.autoSendHistory);
              if (data.peakMorning !== undefined) setPeakMorning(data.peakMorning);
              if (data.peakAfternoon !== undefined) setPeakAfternoon(data.peakAfternoon);
            }
          }

          if (user.uid !== 'demo-user') {
            const snap = await getDoc(doc(db, 'users', user.uid));
            if (snap.exists()) {
              const data = snap.data();
              if (data.displayName) setDisplayName(data.displayName);
              if (data.settings) {
                const partner = data.settings.accountabilityPartnerEmail || '';
                const sound = data.settings.alarmSound || 'mama_coach';
                const snooze = Number(data.settings.snoozeDefaultMinutes) || 10;
                const chime = data.settings.preferredChime || 'retro_pulse';
                const autoSend = data.settings.autoSendEmails || false;
                const history = data.settings.autoSendHistory || [];
                const notif = data.settings.notificationsEnabled !== undefined ? data.settings.notificationsEnabled : true;

                setPartnerEmail(partner);
                setAlarmSound(sound);
                setSnoozeMin(snooze);
                setPreferredChime(chime);
                setAutoSendEmails(autoSend);
                setAutoSendHistory(history);
                setNotifications(notif);

                // Update the localStorage cache with the fresh values
                const updatedCache = {
                  displayName: data.displayName || displayName,
                  partnerEmail: partner,
                  alarmSound: sound,
                  snoozeMin: snooze,
                  preferredChime: chime,
                  autoSendEmails: autoSend,
                  autoSendHistory: history,
                  notifications: notif,
                  peakMorning,
                  peakAfternoon
                };
                localStorage.setItem(`dg_settings_cache_${user.uid}`, JSON.stringify(updatedCache));
              }
              if (data.productivityPattern?.peakHours) {
                const hours = data.productivityPattern.peakHours;
                setPeakMorning(hours.includes(9));
                setPeakAfternoon(hours.includes(14));
              }
            }
          }
        } catch (e) {
          console.error("Error loading user settings:", e);
        }
      };
      loadConfig();
    }
  }, [user]);

  const handleToggleAutoSend = async (newValue: boolean) => {
    if (!user) return;
    setAutoSendLoading(true);
    setAutoSendEmails(newValue);
    setSyncing(true);
    setSyncError(false);

    // Create a new history entry
    const newEntry = {
      timestamp: new Date().toISOString(),
      action: newValue ? 'enabled' : 'disabled'
    };

    // Prepend to history, keeping last 3 items
    const updatedHistory = [newEntry, ...autoSendHistory].slice(0, 3);
    setAutoSendHistory(updatedHistory);

    try {
      // 1. Direct immediate update to Firestore
      if (user.uid !== 'demo-user') {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
          settings: {
            autoSendEmails: newValue,
            autoSendHistory: updatedHistory
          }
        }, { merge: true });
      }

      // 2. Save/Sync to local storage cache immediately
      const stored = localStorage.getItem(`dg_settings_cache_${user.uid}`);
      let current: any = {};
      if (stored) {
        try { current = JSON.parse(stored); } catch (e) {}
      }
      const updatedCache = { 
        ...current, 
        autoSendEmails: newValue,
        autoSendHistory: updatedHistory 
      };
      localStorage.setItem(`dg_settings_cache_${user.uid}`, JSON.stringify(updatedCache));
      
      // Also sync demo legacy key
      if (user.uid === 'demo-user') {
        localStorage.setItem(`dg_demo_settings_${user.uid}`, JSON.stringify(updatedCache));
      }

    } catch (err) {
      console.error("Error saving autoSendEmails preference:", err);
      setSyncError(true);
      // Revert states on failure
      setAutoSendEmails(!newValue);
    } finally {
      setAutoSendLoading(false);
      setSyncing(false);
    }
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    const peakHours = [];
    if (peakMorning) peakHours.push(9, 10, 11);
    if (peakAfternoon) peakHours.push(14, 15, 16);

    const settingsObj = {
      displayName,
      partnerEmail,
      alarmSound,
      snoozeMin,
      preferredChime,
      autoSendEmails,
      autoSendHistory,
      peakMorning,
      peakAfternoon,
      notifications
    };

    // Save to localStorage cache immediately
    localStorage.setItem(`dg_settings_cache_${user.uid}`, JSON.stringify(settingsObj));

    try {
      if (user.uid !== 'demo-user') {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
          displayName,
          settings: {
            accountabilityPartnerEmail: partnerEmail,
            alarmSound,
            snoozeDefaultMinutes: Number(snoozeMin),
            notificationsEnabled: notifications,
            autoReschedule: true,
            preferredChime,
            autoSendEmails,
            autoSendHistory
          },
          productivityPattern: {
            peakHours,
            preferredWorkLocation: "Desk Workspace"
          }
        }, { merge: true });
      } else {
        // Also sync legacy key just in case
        localStorage.setItem(`dg_demo_settings_${user.uid}`, JSON.stringify(settingsObj));
      }
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
      onSaved();
    } catch (e) {
      console.error("Error saving config:", e);
      setShowError(true);
      setTimeout(() => setShowError(false), 4000);
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

        {/* Success / Error Banners */}
        {showSuccess && (
          <div className="flex items-center gap-2.5 px-4 py-3 bg-[#FCF8D5] border-2 border-[#5B6B43] rounded-xl text-xs font-dm font-black text-[#5B6B43] shadow-[2px_2px_0px_rgba(91,107,67,0.15)] animate-pulse">
            <CheckCircle className="h-4 w-4 shrink-0 text-[#5B6B43]" />
            <span>Settings saved successfully! Guardian preferences synchronized.</span>
          </div>
        )}
        {showError && (
          <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border-2 border-red-500 rounded-xl text-xs font-dm font-black text-red-700 shadow-[2px_2px_0px_rgba(239,68,68,0.15)] animate-pulse">
            <ShieldAlert className="h-4 w-4 shrink-0 text-red-600" />
            <span>Failed to save configurations. Please try again.</span>
          </div>
        )}

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
                title="Your Full Name"
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
                  title="Partner Email Address"
                  className="w-full bg-[#F5F1EB] border-2 border-[#292524] rounded-xl px-4 py-2.5 text-xs text-[#292524] placeholder-[#292524]/40 font-dm focus:outline-none focus:ring-1 focus:ring-[#5B6B43]"
                />
              </div>

              <div className="pt-3 border-t border-[#292524]/5">
                <label className={`flex items-start gap-2 cursor-pointer font-dm text-xs text-[#292524] select-none ${autoSendLoading ? 'opacity-70 pointer-events-none' : ''}`}>
                  {autoSendLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-[#5B6B43] mt-0.5 shrink-0" strokeWidth={2.5} />
                  ) : (
                    <input
                      type="checkbox"
                      checked={autoSendEmails}
                      disabled={autoSendLoading}
                      onChange={(e) => handleToggleAutoSend(e.target.checked)}
                      title="Auto-Send Urgent Smart Emails"
                      aria-label="Auto-Send Smart Emails"
                      className="accent-[#5B6B43] h-4 w-4 rounded mt-0.5 shrink-0 cursor-pointer"
                    />
                  )}
                  <div>
                    <span className="font-bold block flex items-center gap-1.5">
                      Auto-Send Urgent Smart Emails
                      {autoSendLoading && (
                        <span className="font-mono text-[9px] font-bold text-[#5B6B43] animate-pulse">
                          Syncing...
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] text-[#292524]/60 leading-tight block">
                      When a highly urgent panic conflict or deadline squeeze is detected, automatically send drafted notifications to your accountability partner.
                    </span>
                  </div>
                </label>
              </div>

              {/* Activity History Section */}
              <div className="pt-4 border-t border-[#292524]/10 space-y-2">
                <h4 className="font-mono text-[9px] font-black text-[#292524]/50 uppercase tracking-wider">
                  Auto-Send Activity History (Last 3 updates)
                </h4>
                {autoSendHistory.length === 0 ? (
                  <p className="font-dm text-[11px] text-[#292524]/50 italic">
                    No settings modification history found.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {autoSendHistory.slice(0, 3).map((item, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between gap-3 px-3 py-2 bg-[#F5F1EB]/60 border border-[#292524]/10 rounded-lg text-[11px]"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`h-2 w-2 rounded-full shrink-0 ${item.action === 'enabled' ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'}`} />
                          <span className="font-dm font-semibold text-[#292524] truncate">
                            Preference set to <span className={item.action === 'enabled' ? 'text-emerald-700 font-bold' : 'text-stone-600 font-bold'}>{item.action.toUpperCase()}</span>
                          </span>
                        </div>
                        <span className="font-mono text-[9px] text-[#292524]/50 shrink-0">
                          {new Date(item.timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Column 2: Alarms & Peak Energy Hours */}
          <div className="space-y-4 border-t md:border-t-0 md:border-l border-[#292524]/10 md:pl-6">
            <h3 className="font-serif font-black text-sm text-[#292524] uppercase tracking-wider flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-[#5B6B43]" />
              Alarm Customization
            </h3>

            <div>
              <label className="font-mono text-[10px] uppercase text-[#292524]/50 font-black block mb-1">AI Coach Speaking Style</label>
              <select
                value={alarmSound}
                onChange={(e) => setAlarmSound(e.target.value)}
                className="w-full bg-[#F5F1EB] border-2 border-[#292524] rounded-xl px-3 py-2.5 text-xs text-[#292524] font-dm focus:outline-none focus:ring-1 focus:ring-[#5B6B43]"
              >
                <option value="mama_coach">👩 Mama's Idea (Loving Support & Discipline)</option>
                <option value="drill_sergeant">🎖️ Drill Sergeant (Action-Oriented & Urgent)</option>
                <option value="gentle_zen">🧘 Gentle Zen Coach (Mindful & Quiet Flow)</option>
              </select>
            </div>

            <div>
              <label className="font-mono text-[10px] uppercase text-[#292524]/50 font-black block mb-1">Preferred Chime Sound</label>
              <div className="flex gap-2">
                <select
                  value={preferredChime}
                  onChange={(e) => setPreferredChime(e.target.value)}
                  className="flex-1 bg-[#F5F1EB] border-2 border-[#292524] rounded-xl px-3 py-2.5 text-xs text-[#292524] font-dm focus:outline-none focus:ring-1 focus:ring-[#5B6B43]"
                >
                  <option value="retro_pulse">⚡ Retro Pulse (Default)</option>
                  <option value="zen_gong">🧘 Zen Gong Resonance</option>
                  <option value="drill_sergeant">🎖️ Drill Sergeant Alert</option>
                  <option value="loving_call">🌸 Loving Harmonic Major</option>
                  <option value="digital_beep">⏰ Standard Digital Beep</option>
                </select>
                <button
                  type="button"
                  onClick={() => playChime(preferredChime)}
                  className="bg-[#292524] text-[#FAF8F5] hover:bg-[#3d3835] px-4 rounded-xl border-2 border-[#292524] active:translate-y-0.5 font-mono text-xs font-black shrink-0 flex items-center gap-1 transition-all"
                  title="Test selected chime sound"
                >
                  Test 🔊
                </button>
              </div>
            </div>

            <div>
              <label className="font-mono text-[10px] uppercase text-[#292524]/50 font-black block mb-1">Snooze Interval Duration</label>
              <select
                value={snoozeMin}
                onChange={(e) => setSnoozeMin(Number(e.target.value))}
                className="w-full bg-[#F5F1EB] border-2 border-[#292524] rounded-xl px-3 py-2.5 text-xs text-[#292524] font-dm focus:outline-none focus:ring-1 focus:ring-[#5B6B43]"
              >
                <option value="5">5 Minutes</option>
                <option value="10">10 Minutes</option>
                <option value="15">15 Minutes</option>
                <option value="20">20 Minutes</option>
                <option value="30">30 Minutes</option>
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
                    title="Morning Focus peak window"
                    aria-label="Morning Focus peak window"
                    className="accent-[#5B6B43] h-4 w-4 rounded"
                  />
                  Morning Focus (09:00 AM – 12:00 PM)
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-dm text-xs text-[#292524]">
                  <input
                    type="checkbox"
                    checked={peakAfternoon}
                    onChange={(e) => setPeakAfternoon(e.target.checked)}
                    title="Afternoon Focus peak window"
                    aria-label="Afternoon Focus peak window"
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
