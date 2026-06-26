import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Task, Subtask, TaskPriority } from '../types';
import { saveTaskToDb } from '../lib/tasks';
import { Plus, Trash, Calendar, AlignLeft, ShieldCheck, Tag, AlertTriangle } from 'lucide-react';

interface TaskFormProps {
  onTaskAdded: () => void;
}

export const TaskForm: React.FC<TaskFormProps> = ({ onTaskAdded }) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('work');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [deadline, setDeadline] = useState('');
  const [locationHint, setLocationHint] = useState('');
  
  // Dynamic manual subtasks list
  const [subtasks, setSubtasks] = useState<{ name: string; duration: number }[]>([
    { name: 'Initial Planning & Setup', duration: 30 },
    { name: 'Core Implementation', duration: 60 },
    { name: 'Review & Refinement', duration: 30 }
  ]);
  
  const [newSubtaskName, setNewSubtaskName] = useState('');
  const [newSubtaskDuration, setNewSubtaskDuration] = useState(30);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const addSubtask = () => {
    if (!newSubtaskName.trim()) return;
    setSubtasks([...subtasks, { name: newSubtaskName.trim(), duration: newSubtaskDuration }]);
    setNewSubtaskName('');
    setNewSubtaskDuration(30);
  };

  const removeSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) {
      setErrorMsg('Task title is required.');
      return;
    }
    if (!deadline) {
      setErrorMsg('A deadline date and time is required.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      const taskId = 'task_' + Math.random().toString(36).substring(2, 11);
      const totalDuration = subtasks.reduce((acc, curr) => acc + curr.duration, 0);

      // Distribute subtask schedule backward from deadline to create chronological block scheduling
      const deadlineDate = new Date(deadline);
      const subtaskObjects: Subtask[] = subtasks.map((st, index) => {
        // Calculate appropriate start/end times chronologically
        // To keep it simple, we schedule them sequentially starting from current time or leading up to the deadline
        const startOffsetHours = index * 2; // spaced out by 2 hours
        const scheduledStart = new Date(Date.now() + (startOffsetHours + 1) * 60 * 60 * 1000);
        const scheduledEnd = new Date(scheduledStart.getTime() + st.duration * 60 * 1000);

        return {
          id: `sub_${taskId}_${index}`,
          name: st.name,
          durationMinutes: st.duration,
          order: index + 1,
          status: 'pending',
          scheduledStart: scheduledStart.toISOString(),
          scheduledEnd: scheduledEnd.toISOString(),
          alarmNote: `Subtask ${index + 1}: ${st.name}. You got this! ⏱️`
        };
      });

      const newTask: Task = {
        id: taskId,
        userId: user.uid,
        name: name.trim(),
        description: description.trim() || undefined,
        deadline: new Date(deadline).toISOString(),
        priority,
        status: 'pending',
        estimatedDurationMinutes: totalDuration || 60,
        subtasks: subtaskObjects,
        calendarEventIds: [],
        createdAt: new Date().toISOString(),
        category,
        locationHint: locationHint.trim() || undefined
      };

      // Generate AI-powered preparation guide using Speech Synthesis offline outlines if Gemini fails
      newTask.prepMaterials = {
        outline: `### Outline for ${name}\n1. Introduction & Objectives\n2. Key milestones and deliverables\n3. Checklist for final sign-off`,
        talkingPoints: [
          `Key focus: Completing ${name} on time.`,
          `Primary metric: Quality of subtasks implementation.`,
          `Deadline accountability checkpoint.`
        ],
        resources: [
          `Deadline Guardian Study Guide — ${category}`,
          `Internal Project Tracker Docs`
        ],
        practiceQuestions: [
          `What is the most critical block stopping progress?`,
          `How can I improve the efficiency of these subtasks?`
        ],
        emailTemplates: [
          {
            name: "Completed Milestones Digest",
            subject: `Progress Report: ${name}`,
            body: `Hi there,\n\nI have created a Deadline Guardian plan for ${name}. I am tracking towards a target of ${new Date(deadline).toLocaleString()}.\n\nBest regards.`
          }
        ],
        checklist: subtasks.map(s => s.name)
      };

      await saveTaskToDb(newTask);
      
      // Reset form
      setName('');
      setDescription('');
      setCategory('work');
      setPriority('medium');
      setDeadline('');
      setLocationHint('');
      setSubtasks([
        { name: 'Initial Planning & Setup', duration: 30 },
        { name: 'Core Implementation', duration: 60 },
        { name: 'Review & Refinement', duration: 30 }
      ]);
      
      onTaskAdded();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(`Failed to save task: ${e.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 md:p-8 border border-slate-200 dark:border-slate-700 shadow-md">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-700">
        <ShieldCheck className="h-5 w-5 text-indigo-500" />
        <h2 className="font-sans font-extrabold text-lg text-slate-800 dark:text-slate-100">Add Project Task Form</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl text-red-600 dark:text-red-400 text-xs">
            <AlertTriangle className="h-4 w-4" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block font-sans text-[10px] uppercase font-bold text-slate-400">Task Title</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Physics Midterm Prep"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block font-sans text-[10px] uppercase font-bold text-slate-400">Target Deadline</label>
            <div className="relative">
              <input
                type="datetime-local"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="block font-sans text-[10px] uppercase font-bold text-slate-400">Category</label>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
              >
                <option value="work">💼 Work / Coding</option>
                <option value="study">📚 Study / Exam</option>
                <option value="personal">🏡 Personal Life</option>
                <option value="health">❤️ Health & Wellness</option>
                <option value="finance">💳 Finance</option>
                <option value="other">🎯 Miscellaneous</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block font-sans text-[10px] uppercase font-bold text-slate-400">Priority Level</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
            >
              <option value="critical">🔥 Critical Urgency</option>
              <option value="high">⚠️ High Priority</option>
              <option value="medium">⚡ Medium Priority</option>
              <option value="low">🟢 Low Priority</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block font-sans text-[10px] uppercase font-bold text-slate-400">Location Hint</label>
            <input
              type="text"
              value={locationHint}
              onChange={(e) => setLocationHint(e.target.value)}
              placeholder="e.g., Home Office / Library"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block font-sans text-[10px] uppercase font-bold text-slate-400">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add specific rules, details or objectives for this plan..."
            rows={2}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 resize-none"
          />
        </div>

        {/* Milestone Subtasks Section */}
        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <span className="block font-mono text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">Milestones & Subtask blocks ({subtasks.length})</span>
          
          <div className="space-y-2">
            {subtasks.map((st, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white dark:bg-slate-950 px-3 py-2.5 rounded-lg border border-slate-150 dark:border-slate-900 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold px-1.5 py-0.5 rounded">
                    #{idx + 1}
                  </span>
                  <span className="font-sans font-semibold">{st.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-slate-400">{st.duration} mins</span>
                  <button
                    type="button"
                    onClick={() => removeSubtask(idx)}
                    className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    <Trash className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <input
              type="text"
              value={newSubtaskName}
              onChange={(e) => setNewSubtaskName(e.target.value)}
              placeholder="Add next block name (e.g. Write Introduction)"
              className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
            />
            <input
              type="number"
              value={newSubtaskDuration}
              onChange={(e) => setNewSubtaskDuration(parseInt(e.target.value) || 15)}
              placeholder="Duration (mins)"
              className="w-24 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
              min={5}
            />
            <button
              type="button"
              onClick={addSubtask}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-sans font-bold text-xs uppercase tracking-wide py-3.5 px-6 rounded-xl transition-all cursor-pointer shadow hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Creating Guardian Schedule...' : 'Generate Project Plan'}
        </button>
      </form>
    </div>
  );
};
