import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ParsedTask, Task, Subtask } from '../types';
import { Calendar, CheckCircle2, Clock, Trash2, ArrowRight, ListPlus, Loader2 } from 'lucide-react';
import { saveTaskToDb } from '../lib/tasks';
import { createSubtaskCalendarEvent } from '../lib/calendar';

interface VoiceConfirmationProps {
  parsedTask: ParsedTask;
  onConfirm: () => void;
  onCancel: () => void;
}

export const VoiceConfirmation: React.FC<VoiceConfirmationProps> = ({
  parsedTask,
  onConfirm,
  onCancel,
}) => {
  const { user, googleToken } = useAuth();
  
  // State variables for parsed parameters, fully editable by the user!
  const [taskName, setTaskName] = useState(parsedTask.task_name);
  const [deadline, setDeadline] = useState(parsedTask.deadline.substring(0, 16)); // Format for datetime-local
  const [priority, setPriority] = useState(parsedTask.priority);
  const [category, setCategory] = useState(parsedTask.category || 'work');
  const [locationHint, setLocationHint] = useState(parsedTask.location_hint || 'Desk');
  const [description, setDescription] = useState(parsedTask.description || '');
  const [subtasks, setSubtasks] = useState<any[]>(
    parsedTask.subtasks.map((st, i) => ({
      id: `st-${Date.now()}-${i}`,
      name: st.name,
      durationMinutes: st.duration_minutes,
      order: st.order
    }))
  );

  const [scheduling, setScheduling] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Handle adding a subtask manually
  const [newSubtaskName, setNewSubtaskName] = useState('');
  const [newSubtaskDur, setNewSubtaskDur] = useState(30);

  const addSubtask = () => {
    if (!newSubtaskName.trim()) return;
    setSubtasks([
      ...subtasks,
      {
        id: `st-${Date.now()}`,
        name: newSubtaskName,
        durationMinutes: Number(newSubtaskDur),
        order: subtasks.length + 1
      }
    ]);
    setNewSubtaskName('');
  };

  const removeSubtask = (id: string) => {
    setSubtasks(subtasks.filter(st => st.id !== id).map((st, idx) => ({ ...st, order: idx + 1 })));
  };

  const updateSubtaskName = (id: string, name: string) => {
    setSubtasks(subtasks.map(st => st.id === id ? { ...st, name } : st));
  };

  const updateSubtaskDuration = (id: string, durationMinutes: number) => {
    setSubtasks(subtasks.map(st => st.id === id ? { ...st, durationMinutes: Math.max(1, durationMinutes) } : st));
  };

  const handleConfirmAndSchedule = async () => {
    if (!user) return;
    setScheduling(true);
    setStatusMsg("Step 1/4: Analyzing peak hours & generating optimal timeblocks...");

    try {
      // 1. Generate optimized schedule slots using our server route
      const scheduleRes = await fetch('/api/gemini/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskName,
          subtasks: subtasks.map(s => ({ name: s.name, duration_minutes: s.durationMinutes })),
          deadline: new Date(deadline).toISOString(),
          existingEvents: [], // Optional: list existing events to avoid overlap
          peakHours: [9, 10, 11, 14, 15] // Default peak performance energy levels
        })
      });

      if (!scheduleRes.ok) throw new Error("Scheduling calculations failed");
      const scheduleData = await scheduleRes.json();
      const slots = scheduleData.data; // Array of slots with { startTime, endTime, reasoning }

      setStatusMsg("Step 2/4: Injecting smart time blocks into your Google Calendar...");

      // 2. Prepare subtasks with their specific times
      const finalizedSubtasks: Subtask[] = subtasks.map((sub, index) => {
        const slot = slots.find((sl: any) => sl.subtaskIndex === index) || slots[index];
        const scheduledStart = slot ? slot.startTime : new Date(Date.now() + (index + 1) * 3 * 60 * 60 * 1000).toISOString();
        const scheduledEnd = slot ? slot.endTime : new Date(new Date(scheduledStart).getTime() + sub.durationMinutes * 60 * 1000).toISOString();

        return {
          id: sub.id,
          name: sub.name,
          durationMinutes: sub.durationMinutes,
          order: sub.order,
          status: 'pending',
          scheduledStart,
          scheduledEnd,
          alarmNote: slot?.reasoning || `Planned for peak efficiency.`
        };
      });

      // 3. Create Google Calendar Events for each subtask if the user signed in with Google
      const calendarEventIds: string[] = [];
      if (googleToken && user.uid !== 'demo-user') {
        setStatusMsg("Step 3/4: Granting Google Calendar API entries...");
        for (const sub of finalizedSubtasks) {
          const eventId = await createSubtaskCalendarEvent(googleToken, taskName, sub, category);
          if (eventId) {
            sub.calendarEventId = eventId;
            calendarEventIds.push(eventId);
          }
        }
      }

      setStatusMsg("Step 4/4: Designing study outlines and reference guides...");

      // 4. Pre-generate learning/prep materials using our AI route
      let prepMaterials = undefined;
      try {
        const prepRes = await fetch('/api/gemini/prep', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskName, description })
        });
        if (prepRes.ok) {
          const prepData = await prepRes.json();
          prepMaterials = prepData.data;
        }
      } catch (e) {
        console.warn("Could not pre-load prep materials, using offline fallbacks.");
      }

      // 5. Construct final Task object and save to Firestore
      const newTask: Task = {
        id: `task-${Date.now()}`,
        userId: user.uid,
        name: taskName,
        description,
        deadline: new Date(deadline).toISOString(),
        priority: priority as any,
        status: 'pending',
        estimatedDurationMinutes: subtasks.reduce((acc, curr) => acc + curr.durationMinutes, 0),
        subtasks: finalizedSubtasks,
        calendarEventIds,
        prepMaterials,
        category,
        locationHint,
        createdAt: new Date().toISOString()
      };

      await saveTaskToDb(newTask);
      onConfirm();
    } catch (error: any) {
      console.error("Scheduling failure:", error);
      alert(`Scheduling Encountered Error: ${error.message || "Please check your network connection and try again."}`);
    } finally {
      setScheduling(false);
      setStatusMsg('');
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-lg animate-fadeIn">
      {scheduling ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
          <div className="space-y-1">
            <h3 className="font-sans font-bold text-base text-slate-800 dark:text-slate-100">AI Scheduling Agent Active</h3>
            <p className="font-sans text-xs text-slate-500 dark:text-slate-400 max-w-sm">{statusMsg}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <h3 className="font-sans font-extrabold text-base text-slate-800 dark:text-slate-100">Review Planned Guardian Task</h3>
            <p className="font-sans text-xs text-slate-600 dark:text-slate-300 font-semibold">Gemini parsed your prompt! Confirm or edit details before timeblocks are scheduled.</p>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-mono text-[10px] uppercase text-slate-600 dark:text-slate-300 font-black block mb-1">Task Title</label>
              <input
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-mono text-[10px] uppercase text-slate-600 dark:text-slate-300 font-black block mb-1">Absolute Deadline</label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-mono text-[10px] uppercase text-slate-600 dark:text-slate-300 font-black block mb-1">Urgency Priority</label>
              <select
                value={priority}
                onChange={(e: any) => setPriority(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
              >
                <option value="low">🟢 Low Priority</option>
                <option value="medium">🟡 Medium Priority</option>
                <option value="high">🟠 High Priority</option>
                <option value="critical">🔴 Critical Priority</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-mono text-[10px] uppercase text-slate-600 dark:text-slate-300 font-black block mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                >
                  <option value="work">💼 Work</option>
                  <option value="study">📚 Study</option>
                  <option value="personal">🏡 Personal</option>
                  <option value="health">❤️ Health</option>
                  <option value="finance">💳 Finance</option>
                  <option value="other">🎯 Other</option>
                </select>
              </div>

              <div>
                <label className="font-mono text-[10px] uppercase text-slate-600 dark:text-slate-300 font-black block mb-1">Ideal Location</label>
                <input
                  type="text"
                  value={locationHint}
                  onChange={(e) => setLocationHint(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="font-mono text-[10px] uppercase text-slate-600 dark:text-slate-300 font-black block mb-1">Context Objective Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
            />
          </div>

          {/* Subtask Editor */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[10px] uppercase text-slate-600 dark:text-slate-300 font-black block">Planned Subtask Blocks</span>
              <span className="font-mono text-[9px] text-indigo-500 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full">💡 Click fields below to edit</span>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {subtasks.map((st, idx) => (
                <div key={st.id} className="flex items-center justify-between gap-3 p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-xl transition-all hover:border-slate-300 dark:hover:border-slate-800">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-6 w-6 bg-indigo-50 dark:bg-indigo-950 rounded-full flex items-center justify-center text-[10px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2">
                      <input
                        type="text"
                        value={st.name}
                        onChange={(e) => updateSubtaskName(st.id, e.target.value)}
                        placeholder="Subtask name..."
                        className="flex-1 font-sans text-xs font-bold text-slate-800 dark:text-slate-100 bg-slate-50/50 hover:bg-slate-100/70 focus:bg-white dark:bg-slate-900/50 dark:hover:bg-slate-850/70 dark:focus:bg-slate-900 border border-slate-200/50 focus:border-indigo-500/35 outline-none rounded px-2.5 py-1.5 transition-all"
                      />
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          value={st.durationMinutes}
                          onChange={(e) => updateSubtaskDuration(st.id, Number(e.target.value))}
                          className="w-14 text-center font-mono text-[11px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 hover:bg-indigo-100/50 dark:bg-indigo-950/70 dark:hover:bg-indigo-900/50 border border-indigo-200/40 focus:border-indigo-500/35 rounded-lg py-1.5 focus:outline-none transition-all"
                          min={1}
                        />
                        <span className="font-mono text-[9px] uppercase text-slate-400 dark:text-slate-600 font-black">Mins</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeSubtask(st.id)}
                    className="text-slate-600 dark:text-slate-300 hover:text-red-500 transition-colors p-1 shrink-0"
                    title="Remove subtask"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Quick add subtask form */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="text"
                placeholder="Add subtask step..."
                value={newSubtaskName}
                onChange={(e) => setNewSubtaskName(e.target.value)}
                className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
              />
              <input
                type="number"
                value={newSubtaskDur}
                onChange={(e) => setNewSubtaskDur(Number(e.target.value))}
                className="w-16 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg px-2 py-1.5 text-xs text-slate-800 dark:text-slate-100 text-center focus:outline-none"
                title="Duration in minutes"
              />
              <button
                type="button"
                onClick={addSubtask}
                className="bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-indigo-600 dark:text-indigo-400 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={onCancel}
              className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-semibold px-4 py-2 transition-colors cursor-pointer"
            >
              Discard Prompt
            </button>
            <button
              onClick={handleConfirmAndSchedule}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              Confirm & Auto-Schedule
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default VoiceConfirmation;
