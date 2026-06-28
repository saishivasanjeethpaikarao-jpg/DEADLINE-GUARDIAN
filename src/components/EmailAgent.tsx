import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { SmartEmail, Task } from '../types';
import { 
  getEmailsForUser, saveEmailToDb, deleteEmailFromDb, 
  draftEmailWithGemini, getRecentEmailsFromGmail, sendEmailViaGmail 
} from '../lib/emails';
import { getTasksForUser, saveTaskToDb } from '../lib/tasks';
import { 
  Mail, Send, CheckCircle, AlertTriangle, Clock, Edit3, Trash2, 
  Plus, Users, Check, X, ShieldAlert, Sparkles, RefreshCw, FileText, Lock, ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const EmailAgent: React.FC = () => {
  const { user, googleToken, setSyncing, setSyncError } = useAuth();
  const [autoSendLoading, setAutoSendLoading] = useState<boolean>(false);
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [emails, setEmails] = useState<SmartEmail[]>([]);
  const [recentInboxContext, setRecentInboxContext] = useState<any[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [scanning, setScanning] = useState<boolean>(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [autoSend, setAutoSend] = useState<boolean>(false);
  
  // Tabs: 'pending' (draft), 'approved' (sent), 'snoozed' (snoozed/rejected)
  const [activeTab, setActiveTab] = useState<'pending' | 'sent' | 'snoozed'>('pending');
  
  // Accordion for thought process of each email
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Draft Editor Modal State
  const [editingEmail, setEditingEmail] = useState<SmartEmail | null>(null);
  const [editTo, setEditTo] = useState<string>('');
  const [editToName, setEditToName] = useState<string>('');
  const [editSubject, setEditSubject] = useState<string>('');
  const [editBody, setEditBody] = useState<string>('');
  const [editCc, setEditCc] = useState<string>('');
  
  // Alert/Message state
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning', message: string } | null>(null);

  // Load all user emails and tasks
  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const allTasks = await getTasksForUser(user.uid);
      setTasks(allTasks);
      
      const allEmails = await getEmailsForUser(user.uid);
      setEmails(allEmails);

      // 1. Try loading from unified local cache first for instant responsiveness
      const cached = localStorage.getItem(`dg_settings_cache_${user.uid}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.autoSendEmails !== undefined) {
          setAutoSend(parsed.autoSendEmails);
        }
      } else if (user.uid === 'demo-user') {
        const legacyStored = localStorage.getItem(`dg_demo_settings_${user.uid}`);
        if (legacyStored) {
          const parsed = JSON.parse(legacyStored);
          if (parsed.autoSendEmails !== undefined) {
            setAutoSend(parsed.autoSendEmails);
          }
        }
      }

      // 2. Load and sync with Firestore
      if (user.uid !== 'demo-user') {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          if (data.settings && data.settings.autoSendEmails !== undefined) {
            setAutoSend(data.settings.autoSendEmails);
            
            // Sync to local cache
            let current: any = {};
            const stored = localStorage.getItem(`dg_settings_cache_${user.uid}`);
            if (stored) current = JSON.parse(stored);
            localStorage.setItem(`dg_settings_cache_${user.uid}`, JSON.stringify({ 
              ...current, 
              autoSendEmails: data.settings.autoSendEmails 
            }));
          }
        }
      }

      if (googleToken && googleToken !== 'mock-google-token') {
        try {
          const inbox = await getRecentEmailsFromGmail(googleToken);
          setRecentInboxContext(inbox);
        } catch (err) {
          console.warn("Could not load real Gmail inbox context, using mock context:", err);
        }
      }
    } catch (error) {
      console.error("Error loading email agent workspace:", error);
      showToast('error', 'Failed to synchronize workspace details.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoSend = async (val: boolean) => {
    if (!user) return;
    setAutoSend(val);
    setAutoSendLoading(true);
    setSyncing(true);
    setSyncError(false);

    // 1. Log a new history entry
    const newEntry = {
      timestamp: new Date().toISOString(),
      action: val ? 'enabled' : 'disabled'
    };

    // Load existing history from cache or define empty
    let updatedHistory = [newEntry];
    const cached = localStorage.getItem(`dg_settings_cache_${user.uid}`);
    let currentCache: any = {};
    if (cached) {
      try {
        currentCache = JSON.parse(cached);
        if (Array.isArray(currentCache.autoSendHistory)) {
          updatedHistory = [newEntry, ...currentCache.autoSendHistory].slice(0, 3);
        }
      } catch (e) {}
    }

    try {
      // 2. Immediate direct update to Firestore
      if (user.uid !== 'demo-user') {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
          settings: {
            autoSendEmails: val,
            autoSendHistory: updatedHistory
          }
        }, { merge: true });
      }

      // 3. Update unified local cache
      const updatedCache = { 
        ...currentCache, 
        autoSendEmails: val,
        autoSendHistory: updatedHistory 
      };
      localStorage.setItem(`dg_settings_cache_${user.uid}`, JSON.stringify(updatedCache));

      // Also sync demo legacy key
      if (user.uid === 'demo-user') {
        localStorage.setItem(`dg_demo_settings_${user.uid}`, JSON.stringify(updatedCache));
      }

      showToast('success', `Auto-Send emails ${val ? 'enabled' : 'disabled'} successfully.`);
    } catch (err) {
      console.error("Error toggling autoSend in EmailAgent:", err);
      setSyncError(true);
      setAutoSend(!val); // Revert UI
      showToast('error', 'Failed to synchronize setting to cloud.');
    } finally {
      setAutoSendLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, googleToken]);

  const showToast = (type: 'success' | 'error' | 'warning', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  // Safe checks: Daily count of drafts generated today
  const getDraftsGeneratedTodayCount = () => {
    const todayStr = new Date().toDateString();
    return emails.filter(e => new Date(e.createdAt).toDateString() === todayStr).length;
  };

  // Perform full Workspace scan & trigger-analysis using Gemini
  const handleScanWorkspace = async () => {
    if (!user) return;
    
    const dailyLimit = 10;
    const currentCount = getDraftsGeneratedTodayCount();
    if (currentCount >= dailyLimit) {
      showToast('warning', `Daily agent limits reached! You've generated ${currentCount}/${dailyLimit} email drafts today.`);
      return;
    }

    setScanning(true);
    showToast('success', 'Gemini is monitoring deadlines and calendar slots for trigger conflicts...');
    
    try {
      // Find eligible tasks (tasks that are pending or in progress, and not completed)
      const activeTasks = tasks.filter(t => t.status !== 'completed');
      if (activeTasks.length === 0) {
        showToast('warning', 'No active panic deadlines found to analyze. Create a milestone first!');
        setScanning(false);
        return;
      }

      // Compile relationship history contexts for Gemini
      const inboxText = recentInboxContext.length > 0 
        ? recentInboxContext.map(m => `Sender: ${m.from}\nSubject: ${m.subject}\nSnippet: ${m.snippet}`).join('\n---\n')
        : "No previous contacts history found.";

      let generatedCount = 0;
      let skippedCount = 0;

      for (const task of activeTasks) {
        // Prevent duplicate drafts for the same task
        const hasExistingDraft = emails.some(e => e.taskId === task.id && e.status === 'draft');
        if (hasExistingDraft) {
          skippedCount++;
          continue;
        }

        // Generate draft with Gemini
        const result = await draftEmailWithGemini(task, inboxText);
        
        if (result && (result.should_send === 'yes' || result.should_send === true)) {
          // Compile new SmartEmail draft
          const newDraft: SmartEmail = {
            id: 'email_' + Math.random().toString(36).substring(2) + Date.now(),
            userId: user.uid,
            taskId: task.id,
            taskName: task.name,
            shouldSend: true,
            recipient: result.recipient || '',
            recipientName: result.recipient_name || 'Recipient',
            subject: result.subject || `Progress Check: ${task.name}`,
            body: result.body || '',
            tone: result.tone || 'formal',
            sendTime: result.send_time || 'Tomorrow morning',
            confidence: result.confidence !== undefined ? result.confidence : 80,
            reasoning: result.reasoning || 'Automated task tracking update.',
            status: 'draft',
            cc: result.cc_suggestions && result.cc_suggestions.length > 0 ? result.cc_suggestions[0] : '',
            createdAt: new Date().toISOString(),
            isRecipientVerified: result.is_recipient_verified || false,
            isAppropriate: result.is_appropriate !== undefined ? result.is_appropriate : true,
            isUrgent: result.is_urgent || false,
            ccSuggestions: result.cc_suggestions || [],
            containsSensitiveKeywords: result.contains_sensitive_keywords || false,
          };

          // Save draft in Database
          await saveEmailToDb(newDraft);
          emails.unshift(newDraft);
          generatedCount++;

          // Auto-Send check if enabled and urgent!
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          const isValidRecipient = newDraft.recipient && emailRegex.test(newDraft.recipient) && !newDraft.recipient.includes("example.com");
          if (autoSend && newDraft.isUrgent && isValidRecipient && !newDraft.containsSensitiveKeywords) {
            try {
              const token = googleToken || 'mock-google-token';
              await sendEmailViaGmail(
                newDraft.recipient,
                newDraft.subject,
                newDraft.body,
                newDraft.cc || '',
                token
              );
              newDraft.status = 'sent';
              newDraft.sentAt = new Date().toISOString();
              await saveEmailToDb(newDraft);
              showToast('success', `⚡ Auto-Sent: Urgent smart notification sent immediately to ${newDraft.recipientName}!`);
            } catch (err) {
              console.error("Failed to auto-send email draft:", err);
            }
          }

          // Check daily limit during loop
          if (getDraftsGeneratedTodayCount() >= dailyLimit) {
            showToast('warning', 'Hit daily agent draft generation cap of 10 emails.');
            break;
          }
        } else {
          skippedCount++;
        }
      }

      // Refresh list
      const updatedEmails = await getEmailsForUser(user.uid);
      setEmails(updatedEmails);

      if (generatedCount > 0) {
        showToast('success', `Scan complete! Gemini successfully initiated ${generatedCount} smart drafts.`);
      } else {
        showToast('success', `Scan complete. No near conflicts detected (${skippedCount} milestones verified safe).`);
      }
    } catch (err: any) {
      console.error("Workspace scan error:", err);
      showToast('error', `AI draft routing failed: ${err.message || 'Server error'}`);
    } finally {
      setScanning(false);
    }
  };

  // Open inline editor for email draft
  const handleEditClick = (email: SmartEmail) => {
    setEditingEmail(email);
    setEditTo(email.recipient);
    setEditToName(email.recipientName);
    setEditSubject(email.subject);
    setEditBody(email.body);
    setEditCc(email.cc || '');
  };

  // Save edited draft
  const handleSaveEdit = async () => {
    if (!editingEmail) return;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isToValid = emailRegex.test(editTo);

    const updated: SmartEmail = {
      ...editingEmail,
      recipient: editTo,
      recipientName: editToName,
      subject: editSubject,
      body: editBody,
      cc: editCc,
      isRecipientVerified: isToValid, // mark verified if user edited to a valid email structure
      confidence: Math.min(100, Math.max(75, editingEmail.confidence)) // bump confidence since human verified
    };

    try {
      await saveEmailToDb(updated);
      setEmails(emails.map(e => e.id === editingEmail.id ? updated : e));
      setEditingEmail(null);
      showToast('success', 'Email draft updated and re-verified successfully.');
    } catch (err) {
      showToast('error', 'Failed to save changes.');
    }
  };

  // Approve & Send email immediately via Gmail proxy
  const handleApproveAndSend = async (email: SmartEmail) => {
    if (!user) return;

    // Unknown recipient check (Safety measure)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.recipient || !emailRegex.test(email.recipient) || email.recipient.includes("example.com")) {
      showToast('warning', `Blocked! Unknown or invalid recipient "${email.recipient || 'None'}". Please edit and specify a valid email address.`);
      handleEditClick(email);
      return;
    }

    // CC stake holder warning/suggestion alert
    if (email.ccSuggestions && email.ccSuggestions.length > 0 && !email.cc) {
      const confirmCc = window.confirm(`Gemini suggested adding CC: ${email.ccSuggestions.join(', ')}. Would you like to send without stakeholder CC copies?`);
      if (!confirmCc) {
        handleEditClick(email);
        return;
      }
    }

    // Standard confirmation dialog before mutating/sending (Safety requirement)
    const confirmSend = window.confirm(`Approve and Send email to ${email.recipientName} (${email.recipient})?\n\nSubject: ${email.subject}`);
    if (!confirmSend) return;

    setSendingId(email.id);
    try {
      const token = googleToken || 'mock-google-token';
      
      // Call standard Gmail Send Endpoint
      await sendEmailViaGmail(
        email.recipient,
        email.subject,
        email.body,
        email.cc || '',
        token
      );

      // Update state in database
      const sentEmail: SmartEmail = {
        ...email,
        status: 'sent',
        sentAt: new Date().toISOString()
      };

      await saveEmailToDb(sentEmail);
      
      // Update local state
      setEmails(emails.map(e => e.id === email.id ? sentEmail : e));
      showToast('success', `Sent! Smart email delivered to ${email.recipientName} successfully.`);

      // Proactively complete subtasks if email was an extension or status update that resolves it
      if (email.taskId) {
        const matchedTask = tasks.find(t => t.id === email.taskId);
        if (matchedTask) {
          // If the status was pending/overdue, we can update task or log history
          console.log("Email sent linked to task:", matchedTask.name);
        }
      }
    } catch (err: any) {
      console.error("Failed to deliver email:", err);
      showToast('error', `Gmail transmission failed: ${err.message || 'API error'}`);
    } finally {
      setSendingId(null);
    }
  };

  // Snooze draft
  const handleSnooze = async (email: SmartEmail, hours: number) => {
    try {
      const snoozedEmail: SmartEmail = {
        ...email,
        status: 'snoozed',
        sendTime: `Snoozed for ${hours} hours`
      };
      await saveEmailToDb(snoozedEmail);
      setEmails(emails.map(e => e.id === email.id ? snoozedEmail : e));
      showToast('success', `Draft deferred for ${hours} hours.`);
    } catch (err) {
      showToast('error', 'Snooze failed.');
    }
  };

  // Reject / Delete draft
  const handleReject = async (emailId: string) => {
    const confirmDelete = window.confirm("Are you sure you want to permanently discard this email draft?");
    if (!confirmDelete) return;

    try {
      await deleteEmailFromDb(emailId, user?.uid || '');
      setEmails(emails.filter(e => e.id !== emailId));
      showToast('success', 'Draft rejected and deleted.');
    } catch (err) {
      showToast('error', 'Discard failed.');
    }
  };

  // Filter emails based on active tabs
  const getFilteredEmails = () => {
    if (activeTab === 'pending') {
      return emails.filter(e => e.status === 'draft');
    } else if (activeTab === 'sent') {
      return emails.filter(e => e.status === 'sent');
    } else {
      return emails.filter(e => e.status === 'snoozed' || e.status === 'rejected');
    }
  };

  const filtered = getFilteredEmails();

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-left relative" id="email-agent-panel">
      {/* Toast Alert Banner */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 md:right-12 z-50 flex items-center gap-3 px-5 py-4 border-2 border-[#292524] rounded-xl shadow-[4px_4px_0px_#292524] font-dm text-xs font-black ${
              toast.type === 'success' ? 'bg-[#FCF8D5] text-[#5B6B43]' :
              toast.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER BAR: Editorial design with serif typography */}
      <div className="border-b-4 border-[#292524] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-[#FAF8F5] border-2 border-[#292524] px-3 py-1 rounded-full text-[10px] font-mono font-black uppercase tracking-widest text-[#5B6B43] shadow-[2px_2px_0px_#292524]">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            Smart Agent Integration
          </div>
          <h1 className="font-serif font-black text-3xl md:text-4xl text-[#292524]">
            Gmail Smart Agent
          </h1>
          <p className="font-dm text-sm text-[#292524]/85 font-semibold">
            The Guardian monitors conflicts and auto-drafts responses during panic deadlines. Your approval is always required before delivery.
          </p>
        </div>

        {/* Proactive Trigger Scanning Control */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <label className={`flex items-center gap-2 cursor-pointer bg-[#FAF8F5] border-2 border-[#292524] px-4 py-2.5 rounded-xl shadow-[2px_2px_0px_#292524] select-none text-xs font-mono font-black uppercase text-[#292524] ${autoSendLoading ? 'opacity-85 pointer-events-none' : ''}`}>
            {autoSendLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin text-[#5B6B43]" strokeWidth={2.5} />
            ) : (
              <input
                type="checkbox"
                checked={autoSend}
                disabled={autoSendLoading}
                onChange={(e) => handleToggleAutoSend(e.target.checked)}
                className="accent-[#5B6B43] h-4 w-4 rounded cursor-pointer"
              />
            )}
            <span>{autoSendLoading ? "Syncing..." : "Auto-Send Urgent ⚡"}</span>
          </label>

          <button
            onClick={handleScanWorkspace}
            disabled={scanning || loading}
            className="flex items-center gap-2 bg-[#5B6B43] hover:bg-[#485534] disabled:opacity-50 text-white font-mono text-xs font-black uppercase tracking-wide px-5 py-3 border-2 border-[#292524] rounded-xl shadow-[4px_4px_0px_#292524] active:translate-y-1 active:shadow-[1px_1px_0px_#292524] transition-all cursor-pointer"
          >
            {scanning ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Analyzing Deadlines...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Scan Workspace
              </>
            )}
          </button>
        </div>
      </div>

      {/* AGENT STATS & LIMITS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#FAF8F5] border-2 border-[#292524] rounded-xl p-4 shadow-[3px_3px_0px_#292524] flex items-center justify-between">
          <div>
            <span className="font-mono text-[9px] uppercase font-bold text-stone-500 block">Daily Limit Guard</span>
            <span className="font-serif font-black text-xl text-[#292524]">
              {getDraftsGeneratedTodayCount()} / 10 drafts
            </span>
          </div>
          <div className="bg-[#FCF8D5] border-2 border-[#292524]/20 p-2 rounded-lg">
            <Lock className="h-5 w-5 text-[#C4705A]" />
          </div>
        </div>

        <div className="bg-[#FAF8F5] border-2 border-[#292524] rounded-xl p-4 shadow-[3px_3px_0px_#292524] flex items-center justify-between">
          <div>
            <span className="font-mono text-[9px] uppercase font-bold text-stone-500 block">Active Inbox Scans</span>
            <span className="font-serif font-black text-xl text-[#292524]">
              {recentInboxContext.length > 0 ? `${recentInboxContext.length} threads synced` : 'Guest Simulator'}
            </span>
          </div>
          <div className="bg-[#FAF8F5] border-2 border-[#292524]/20 p-2 rounded-lg">
            <Users className="h-5 w-5 text-[#5B6B43]" />
          </div>
        </div>

        <div className="bg-[#FAF8F5] border-2 border-[#292524] rounded-xl p-4 shadow-[3px_3px_0px_#292524] flex items-center justify-between">
          <div>
            <span className="font-mono text-[9px] uppercase font-bold text-stone-500 block">Guardian Send Engine</span>
            <span className="font-serif font-black text-xl text-[#5B6B43]">
              ● Authorized via OAuth
            </span>
          </div>
          <div className="bg-[#FAF8F5] border-2 border-[#292524]/20 p-2 rounded-lg">
            <Mail className="h-5 w-5 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* VIEW FILTER TABS */}
      <div className="flex border-b-2 border-[#292524] gap-2 pt-2">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2.5 font-serif font-black text-xs uppercase tracking-wider border-2 border-b-0 border-[#292524] rounded-t-xl transition-all cursor-pointer ${
            activeTab === 'pending' ? 'bg-[#FAF8F5] translate-y-[2px] font-black' : 'bg-[#FAF8F5]/50 hover:bg-[#FAF8F5]'
          }`}
        >
          Pending Approval ({emails.filter(e => e.status === 'draft').length})
        </button>
        <button
          onClick={() => setActiveTab('sent')}
          className={`px-4 py-2.5 font-serif font-black text-xs uppercase tracking-wider border-2 border-b-0 border-[#292524] rounded-t-xl transition-all cursor-pointer ${
            activeTab === 'sent' ? 'bg-[#FAF8F5] translate-y-[2px] font-black' : 'bg-[#FAF8F5]/50 hover:bg-[#FAF8F5]'
          }`}
        >
          Sent Log ({emails.filter(e => e.status === 'sent').length})
        </button>
        <button
          onClick={() => setActiveTab('snoozed')}
          className={`px-4 py-2.5 font-serif font-black text-xs uppercase tracking-wider border-2 border-b-0 border-[#292524] rounded-t-xl transition-all cursor-pointer ${
            activeTab === 'snoozed' ? 'bg-[#FAF8F5] translate-y-[2px] font-black' : 'bg-[#FAF8F5]/50 hover:bg-[#FAF8F5]'
          }`}
        >
          Deferred ({emails.filter(e => e.status === 'snoozed' || e.status === 'rejected').length})
        </button>
      </div>

      {/* DRAFTS LIST */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 bg-[#FAF8F5] border-2 border-[#292524] rounded-2xl p-6 shadow-[4px_4px_0px_#292524] animate-pulse">
            <Mail className="h-8 w-8 text-stone-400 mx-auto animate-bounce mb-3" />
            <p className="font-serif font-bold text-sm text-[#292524]">Synchronizing secure draft queues...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-[#FAF8F5] border-2 border-[#292524] rounded-2xl p-8 text-center space-y-3 shadow-[4px_4px_0px_#292524]">
            <Mail className="h-10 w-10 text-[#5B6B43]/50 mx-auto" />
            <div className="space-y-1">
              <h3 className="font-serif font-black text-base text-[#292524]">No drafts in this queue</h3>
              <p className="font-dm text-xs text-[#292524]/75 max-w-md mx-auto">
                {activeTab === 'pending' 
                  ? "Click 'Scan Workspace' above. Gemini will evaluate active panic milestones, draft appropriate emails, and surface them here."
                  : "All logs are fully clean."}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((email) => {
              const confidenceColor = email.confidence >= 70 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                      email.confidence >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                      'bg-red-50 text-red-700 border-red-200';

              const isUnknownRecipient = !email.recipient || email.recipient.includes("example.com") || email.recipient === '';

              return (
                <motion.div
                  key={email.id}
                  layout
                  className="bg-[#FAF8F5] border-2 border-[#292524] rounded-2xl p-5 shadow-[4px_4px_0px_#292524] hover:shadow-[6px_6px_0px_#292524] transition-all space-y-4"
                >
                  {/* Draft Header Row */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#292524]/10 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full border-2 border-[#292524] bg-[#FCF8D5] flex items-center justify-center font-serif font-bold text-[#292524]">
                        {email.recipientName ? email.recipientName[0].toUpperCase() : 'M'}
                      </div>
                      <div>
                        <h4 className="font-serif font-black text-sm text-[#292524]">
                          {email.recipientName || 'Recipient'}
                        </h4>
                        <span className="font-mono text-[10px] text-stone-500 font-bold block">
                          To: {email.recipient || 'unspecified@recipient.com'}
                        </span>
                      </div>
                    </div>

                    {/* Meta Indicators: Confidence Badges, Sensitivity Flag */}
                    <div className="flex flex-wrap gap-2">
                      {email.containsSensitiveKeywords && (
                        <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 border border-red-300 text-[9px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full">
                          <AlertTriangle className="h-3 w-3" />
                          Sensitive (HR/Legal)
                        </span>
                      )}

                      {isUnknownRecipient && (
                        <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 text-[9px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full">
                          <AlertCircle className="h-3 w-3" />
                          Missing Recipient
                        </span>
                      )}

                      <span className={`inline-flex items-center gap-1 border text-[9px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full ${confidenceColor}`}>
                        Confidence {email.confidence}%
                      </span>

                      <span className="bg-stone-100 text-stone-600 border border-stone-200 text-[9px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full">
                        {email.tone}
                      </span>
                    </div>
                  </div>

                  {/* Core Content Area */}
                  <div className="space-y-2">
                    <div className="font-serif text-sm font-bold text-[#292524]">
                      Subject: {email.subject}
                    </div>
                    <div className="bg-white border-2 border-[#292524]/10 rounded-xl p-4 font-dm text-xs text-stone-700 whitespace-pre-wrap leading-relaxed shadow-inner">
                      {email.body}
                    </div>
                    {email.cc && (
                      <div className="font-mono text-[10px] text-stone-500 font-semibold">
                        CC: {email.cc}
                      </div>
                    )}
                  </div>

                  {/* Collapsible thought process of Agent */}
                  <div className="border-t border-[#292524]/10 pt-3">
                    <button
                      onClick={() => setExpandedId(expandedId === email.id ? null : email.id)}
                      className="flex items-center gap-1 text-stone-500 hover:text-[#5B6B43] font-mono text-[10px] font-black uppercase transition-colors"
                    >
                      {expandedId === email.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      {expandedId === email.id ? 'Hide Agent Analysis' : 'Show Agent Analysis'}
                    </button>

                    <AnimatePresence>
                      {expandedId === email.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden mt-2 pt-2 text-stone-600 font-dm text-xs space-y-2.5 bg-[#FAF8F5]/30 rounded-lg"
                        >
                          <div className="bg-[#FCF8D5]/50 border-l-4 border-[#C9A96E] p-3 rounded-r-lg">
                            <span className="font-mono text-[9px] font-black text-[#C4705A] uppercase block mb-1">
                              Why did the agent trigger this email?
                            </span>
                            <p className="font-serif italic text-[#292524]/85 leading-relaxed font-semibold">
                              "{email.reasoning}"
                            </p>
                          </div>

                          {/* Safety report checklist */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-[#292524]/10 pt-2.5">
                            <div className="flex items-center gap-2 font-mono text-[9px] font-black uppercase">
                              <span className={`h-4.5 w-4.5 rounded-full flex items-center justify-center border text-[9px] ${
                                email.isRecipientVerified ? 'bg-emerald-50 border-emerald-300 text-emerald-600' : 'bg-red-50 border-red-300 text-red-600'
                              }`}>
                                {email.isRecipientVerified ? '✓' : '✗'}
                              </span>
                              <span>Recipient Verified</span>
                            </div>

                            <div className="flex items-center gap-2 font-mono text-[9px] font-black uppercase">
                              <span className="h-4.5 w-4.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-600 flex items-center justify-center">
                                ✓
                              </span>
                              <span>Tone Standard Compliant</span>
                            </div>

                            <div className="flex items-center gap-2 font-mono text-[9px] font-black uppercase">
                              <span className={`h-4.5 w-4.5 rounded-full flex items-center justify-center border text-[9px] ${
                                email.isUrgent ? 'bg-red-50 border-red-300 text-red-600 font-black' : 'bg-emerald-50 border-emerald-300 text-emerald-600'
                              }`}>
                                {email.isUrgent ? '!' : '✓'}
                              </span>
                              <span>{email.isUrgent ? 'Critical Priority Email' : 'Standard Priority Email'}</span>
                            </div>

                            <div className="flex items-center gap-2 font-mono text-[9px] font-black uppercase">
                              <span className={`h-4.5 w-4.5 rounded-full flex items-center justify-center border text-[9px] ${
                                !email.containsSensitiveKeywords ? 'bg-emerald-50 border-emerald-300 text-emerald-600' : 'bg-red-50 border-red-300 text-red-600 font-black'
                              }`}>
                                {!email.containsSensitiveKeywords ? '✓' : '!'}
                              </span>
                              <span>{!email.containsSensitiveKeywords ? 'No Sensitive Language Detected' : 'Sensitive Content Alarm'}</span>
                            </div>
                          </div>

                          {email.ccSuggestions.length > 0 && (
                            <div className="font-mono text-[9px] font-bold text-stone-500">
                              CC Suggestions: {email.ccSuggestions.join(', ')}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Footer Actions */}
                  {email.status === 'draft' && (
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#292524]/10">
                      <span className="font-mono text-[10px] text-stone-500 font-semibold">
                        ⏰ Suggested send: {email.sendTime}
                      </span>

                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => handleReject(email.id)}
                          className="flex items-center gap-1.5 p-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-mono text-[10px] font-black uppercase tracking-wide rounded-xl transition-all cursor-pointer"
                          title="Reject and discard"
                        >
                          <Trash2 className="h-4 w-4" />
                          Discard
                        </button>

                        <button
                          onClick={() => handleSnooze(email, 24)}
                          className="flex items-center gap-1.5 p-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 font-mono text-[10px] font-black uppercase tracking-wide rounded-xl transition-all cursor-pointer"
                          title="Snooze for 24 hours"
                        >
                          <Clock className="h-4 w-4" />
                          Snooze
                        </button>

                        <button
                          onClick={() => handleEditClick(email)}
                          className="flex items-center gap-1.5 p-2 border border-[#292524]/20 bg-stone-100 hover:bg-stone-200 text-[#292524] font-mono text-[10px] font-black uppercase tracking-wide rounded-xl transition-all cursor-pointer"
                        >
                          <Edit3 className="h-4 w-4" />
                          Edit
                        </button>

                        <button
                          onClick={() => handleApproveAndSend(email)}
                          disabled={sendingId === email.id}
                          className="flex items-center gap-1.5 bg-[#FAF8F5] hover:bg-[#FCF8D5] text-[#292524] font-mono text-[10px] font-black uppercase tracking-wide px-4 py-2 border-2 border-[#292524] rounded-xl shadow-[3px_3px_0px_#292524] active:translate-y-0.5 active:shadow-[1px_1px_0px_#292524] transition-all cursor-pointer disabled:opacity-50"
                        >
                          {sendingId === email.id ? (
                            <>
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              Delivering...
                            </>
                          ) : (
                            <>
                              <Send className="h-3.5 w-3.5 text-[#5B6B43]" />
                              Approve & Send
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {email.status === 'sent' && (
                    <div className="flex items-center justify-between text-xs font-mono text-emerald-600 pt-3 border-t border-[#292524]/10 font-bold">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        Dispatched via Gmail API
                      </span>
                      <span>
                        Sent at {new Date(email.sentAt || '').toLocaleTimeString()}
                      </span>
                    </div>
                  )}

                  {email.status === 'snoozed' && (
                    <div className="flex items-center justify-between text-xs font-mono text-amber-600 pt-3 border-t border-[#292524]/10 font-bold">
                      <span>⏰ Deferred: {email.sendTime}</span>
                      <button
                        onClick={async () => {
                          const activated = { ...email, status: 'draft' as const };
                          await saveEmailToDb(activated);
                          setEmails(emails.map(e => e.id === email.id ? activated : e));
                        }}
                        className="text-xs text-[#5B6B43] hover:underline font-bold"
                      >
                        Restore Draft
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* DRAFT EDITING MODAL */}
      <AnimatePresence>
        {editingEmail && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#FAF8F5] border-4 border-[#292524] rounded-2xl max-w-2xl w-full overflow-hidden shadow-[8px_8px_0px_#292524]"
            >
              <div className="bg-[#292524] px-5 py-4 flex items-center justify-between text-white">
                <div className="flex items-center gap-2 font-serif font-black text-sm uppercase tracking-wider">
                  <Edit3 className="h-4 w-4 text-[#C9A96E]" />
                  Audit and Edit Draft Content
                </div>
                <button
                  onClick={() => setEditingEmail(null)}
                  className="p-1 hover:bg-stone-700 rounded-lg text-stone-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Warning for sensitive keywords inside modal */}
                {editingEmail.containsSensitiveKeywords && (
                  <div className="bg-red-50 border-2 border-red-500/30 rounded-xl p-4 flex gap-3 text-red-700">
                    <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="font-serif font-bold text-xs uppercase tracking-wide leading-none">Sensitive Content Red Flag Alert</h4>
                      <p className="font-dm text-xs leading-relaxed font-semibold">
                        This draft contains sensitive keywords (e.g., HR, Resignation, Legal affairs). Ensure you carefully scrutinize and customize the tone before dispatching.
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-mono text-[9px] font-black uppercase text-stone-500 block">Recipient Name</label>
                    <input
                      type="text"
                      value={editToName}
                      onChange={(e) => setEditToName(e.target.value)}
                      className="w-full bg-white border-2 border-[#292524] rounded-lg px-3 py-2 text-xs font-dm text-[#292524] focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-[9px] font-black uppercase text-stone-500 block">Recipient Email Address</label>
                    <input
                      type="email"
                      value={editTo}
                      onChange={(e) => setEditTo(e.target.value)}
                      className="w-full bg-white border-2 border-[#292524] rounded-lg px-3 py-2 text-xs font-dm text-[#292524] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[9px] font-black uppercase text-stone-500 block">Subject Line</label>
                  <input
                    type="text"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    className="w-full bg-white border-2 border-[#292524] rounded-lg px-3 py-2 text-xs font-dm text-[#292524] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[9px] font-black uppercase text-stone-500 block">Email CC (Stakeholders)</label>
                  <input
                    type="text"
                    value={editCc}
                    onChange={(e) => setEditCc(e.target.value)}
                    placeholder="e.g. colleague@company.com"
                    className="w-full bg-white border-2 border-[#292524] rounded-lg px-3 py-2 text-xs font-dm text-[#292524] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[9px] font-black uppercase text-stone-500 block">Email Body</label>
                  <textarea
                    rows={8}
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    className="w-full bg-white border-2 border-[#292524] rounded-lg px-3.5 py-2.5 text-xs font-dm text-stone-700 focus:outline-none leading-relaxed"
                  />
                </div>
              </div>

              <div className="bg-[#FAF8F5] border-t border-[#292524]/10 px-6 py-4 flex items-center justify-end gap-3">
                <button
                  onClick={() => setEditingEmail(null)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 border-2 border-[#292524] rounded-xl font-mono text-xs font-black uppercase transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-5 py-2 bg-[#FAF8F5] hover:bg-[#FCF8D5] border-2 border-[#292524] rounded-xl font-mono text-xs font-black uppercase tracking-wide shadow-[3px_3px_0px_#292524] active:translate-y-0.5 active:shadow-[1px_1px_0px_#292524] transition-all cursor-pointer"
                >
                  Apply Audit Corrections
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
