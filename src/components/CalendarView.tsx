import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Task, Subtask, TaskPriority } from '../types';
import { saveTaskToDb } from '../lib/tasks';
import { EmptyCalendarIllustration } from './EditorialIllustrations';
import { 
  Calendar, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Circle, 
  Plus, 
  Trash, 
  Sparkles, 
  Check, 
  CalendarDays, 
  X, 
  RefreshCw, 
  AlertTriangle,
  Flame,
  LayoutGrid,
  Trophy,
  Sliders,
  CheckSquare,
  Square
} from 'lucide-react';

interface CalendarViewProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onRescheduleSubtask?: (taskId: string, subtaskId: string, targetDate: Date) => void;
  onTaskAdded?: () => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ 
  tasks, 
  onSelectTask, 
  onRescheduleSubtask,
  onTaskAdded 
}) => {
  const { user } = useAuth();
  
  // State variables
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [hoveredDayIdx, setHoveredDayIdx] = useState<number | null>(null);
  const [googleConnected] = useState<boolean>(true); // Mock status as requested

  // Task creation modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('medium');
  const [newTaskCategory, setNewTaskCategory] = useState('work');
  const [newTaskTime, setNewTaskTime] = useState('12:00');
  const [newTaskDuration, setNewTaskDuration] = useState(60);
  const [subtasks, setSubtasks] = useState<{ name: string; duration: number }[]>([
    { name: 'Initial Planning & Setup', duration: 15 },
    { name: 'Core Implementation Block', duration: 30 },
    { name: 'Review & Guarding Final Checklist', duration: 15 }
  ]);
  const [newSubtaskName, setNewSubtaskName] = useState('');
  const [newSubtaskDuration, setNewSubtaskDuration] = useState(30);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Year choices for selector
  const currentYear = currentMonth.getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  // Helper: Month Navigation
  const handlePrevMonth = () => {
    const prev = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    setCurrentMonth(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    setCurrentMonth(next);
  };

  const handleYearChange = (year: number) => {
    const updated = new Date(year, currentMonth.getMonth(), 1);
    setCurrentMonth(updated);
  };

  const handleGoToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setCurrentMonth(today);
  };

  // Helper: Generate all days for the 35 or 42 grid monthly calendar
  const generateMonthDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // First day of current month
    const firstDay = new Date(year, month, 1);
    // Day of the week of first day (0-6)
    const startOffset = firstDay.getDay(); 
    
    // Backtrack to the nearest Sunday of the grid
    const startDate = new Date(firstDay.getTime());
    startDate.setDate(firstDay.getDate() - startOffset);

    const daysList: Date[] = [];
    // Generate exactly 42 days (6 full weeks) to keep layout absolutely uniform
    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate.getTime());
      d.setDate(startDate.getDate() + i);
      daysList.push(d);
    }
    return daysList;
  };

  const monthDays = generateMonthDays();

  // Helper: Get current week days (Monday - Sunday) for Weekly Planner
  const getWeekDays = () => {
    const days = [];
    const baseDate = new Date(selectedDate.getTime());
    const dayOfWeek = baseDate.getDay(); // 0 is Sunday, 1 is Monday, etc.
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const monday = new Date(baseDate.getTime());
    monday.setDate(baseDate.getDate() + distanceToMonday);

    for (let i = 0; i < 7; i++) {
      const day = new Date(monday.getTime());
      day.setDate(monday.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const weekDays = getWeekDays();

  // Helper: Get subtasks scheduled for a specific day
  const getSubtasksForDay = (date: Date) => {
    const dayStr = date.toDateString();
    const list: Array<{ subtask: Subtask; task: Task }> = [];

    tasks.forEach(task => {
      if (task.subtasks) {
        task.subtasks.forEach(st => {
          if (st.scheduledStart) {
            const stDate = new Date(st.scheduledStart);
            if (stDate.toDateString() === dayStr) {
              list.push({ subtask: st, task });
            }
          }
        });
      }
    });

    return list.sort((a, b) => 
      new Date(a.subtask.scheduledStart!).getTime() - new Date(b.subtask.scheduledStart!).getTime()
    );
  };

  // Helper: Get absolute master tasks due on a specific day
  const getMasterTasksForDay = (date: Date) => {
    const dayStr = date.toDateString();
    return tasks.filter(task => {
      const tDate = new Date(task.deadline);
      return tDate.toDateString() === dayStr;
    });
  };

  // Check if a date has any activities
  const getDateStatusDots = (date: Date) => {
    const sub = getSubtasksForDay(date);
    const master = getMasterTasksForDay(date);
    
    const dots = {
      done: false,
      amber: false,
      red: false
    };

    const allItems = [...master.map(t => ({ priority: t.priority, status: t.status })), ...sub.map(s => ({ priority: s.task.priority, status: s.subtask.status }))];
    
    allItems.forEach(item => {
      if (item.status === 'completed') {
        dots.done = true;
      } else if (item.priority === 'critical' || item.priority === 'high') {
        dots.red = true;
      } else {
        dots.amber = true;
      }
    });

    return dots;
  };

  // Priority color styling helper
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
      case 'high':
        return 'border-[#C4705A] text-[#C4705A] bg-[#C4705A]/5 shadow-[2px_2px_0px_#C4705A]';
      case 'medium':
        return 'border-[#C9A96E] text-[#785F2C] bg-[#C9A96E]/5 shadow-[2px_2px_0px_#C9A96E]';
      default:
        return 'border-[#5B6B4F] text-[#5B6B4F] bg-[#5B6B4F]/5 shadow-[2px_2px_0px_#5B6B4F]';
    }
  };

  // Add Task Modal Checklist helpers
  const handleAddSubtask = () => {
    if (!newSubtaskName.trim()) return;
    setSubtasks([...subtasks, { name: newSubtaskName.trim(), duration: newSubtaskDuration }]);
    setNewSubtaskName('');
    setNewSubtaskDuration(30);
  };

  const handleRemoveSubtask = (idx: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== idx));
  };

  // Handle task modal submission
  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setModalError("Please log in to schedule projects.");
      return;
    }
    if (!newTaskName.trim()) {
      setModalError("Project title is required.");
      return;
    }

    setSaving(true);
    setModalError('');

    try {
      // Build selected deadline based on selected Date & specified Time
      const deadlineDate = new Date(selectedDate.getTime());
      const [hours, minutes] = newTaskTime.split(':').map(Number);
      deadlineDate.setHours(hours, minutes, 0, 0);

      const taskId = 'task_' + Math.random().toString(36).substring(2, 11);
      const totalDuration = subtasks.reduce((acc, curr) => acc + curr.duration, 0);

      // Sequentially plan subtasks back from deadline or from now
      const subtaskObjects: Subtask[] = subtasks.map((st, index) => {
        const startOffsetHours = index * 1.5;
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
          alarmNote: `Subtask checkpoint: ${st.name}`
        };
      });

      const newTask: Task = {
        id: taskId,
        userId: user.uid,
        name: newTaskName.trim(),
        description: newTaskDesc.trim() || undefined,
        deadline: deadlineDate.toISOString(),
        priority: newTaskPriority,
        status: 'pending',
        estimatedDurationMinutes: totalDuration || 60,
        subtasks: subtaskObjects,
        calendarEventIds: [],
        createdAt: new Date().toISOString(),
        category: newTaskCategory,
      };

      await saveTaskToDb(newTask);

      // Reset
      setNewTaskName('');
      setNewTaskDesc('');
      setNewTaskPriority('medium');
      setNewTaskCategory('work');
      setSubtasks([
        { name: 'Initial Planning & Setup', duration: 15 },
        { name: 'Core Implementation Block', duration: 30 },
        { name: 'Review & Guarding Final Checklist', duration: 15 }
      ]);
      setIsAddModalOpen(false);
      
      if (onTaskAdded) {
        onTaskAdded();
      }
    } catch (err: any) {
      console.error(err);
      setModalError(err.message || "Failed to save project.");
    } finally {
      setSaving(false);
    }
  };

  // Get active tasks list for currently selected day
  const activeMasterTasks = getMasterTasksForDay(selectedDate);
  const activeSubtasks = getSubtasksForDay(selectedDate);
  const hasSelectedDayActivities = activeMasterTasks.length > 0 || activeSubtasks.length > 0;

  return (
    <div className="space-y-6">
      {/* 1. CALENDAR CONTROL HEADER PANEL */}
      <div className="bg-[#FAF8F5] border-2 border-[#292524] rounded-2xl p-4 sm:p-6 shadow-[6px_6px_0px_#292524] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Left Info Area */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-[#5B6B4F]/10 border-2 border-[#5B6B4F] rounded-xl flex items-center justify-center text-[#5B6B4F] shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif font-black text-xl text-[#292524] leading-tight">
                Guardian Calendar
              </h2>
              {googleConnected && (
                <div className="flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full text-[9px] font-dm font-black tracking-wide uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse inline-block" />
                  Google Sync Connected
                </div>
              )}
            </div>
            <p className="font-dm text-xs text-stone-600 font-semibold mt-0.5">
              Plan, sequence milestones, and coordinate critical absolute deadlines
            </p>
          </div>
        </div>

        {/* Navigation & Controls Section */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Year Selector */}
          <div className="flex items-center gap-1.5 bg-white border-2 border-[#292524] px-2 py-1 rounded-xl shadow-[2px_2px_0px_#292524]">
            <span className="font-mono text-[9px] text-[#292524]/60 font-extrabold uppercase mr-1">Year:</span>
            <div className="flex gap-1">
              {years.map((yr) => (
                <button
                  key={yr}
                  onClick={() => handleYearChange(yr)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                    yr === currentYear
                      ? 'bg-[#5B6B4F] text-[#FAF8F5]'
                      : 'hover:bg-stone-100 text-[#292524]/75'
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>

          {/* Today, Month/Week view Toggles */}
          <div className="flex items-center border-2 border-[#292524] rounded-xl overflow-hidden shadow-[2px_2px_0px_#292524] bg-white text-xs">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 font-dm font-black uppercase tracking-wider transition-colors cursor-pointer border-r border-[#292524] ${
                viewMode === 'month' ? 'bg-[#5B6B4F] text-white' : 'hover:bg-stone-50 text-stone-700'
              }`}
            >
              Month View
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 font-dm font-black uppercase tracking-wider transition-colors cursor-pointer ${
                viewMode === 'week' ? 'bg-[#5B6B4F] text-white' : 'hover:bg-stone-50 text-stone-700'
              }`}
            >
              Week View
            </button>
          </div>

          <button
            onClick={handleGoToToday}
            className="bg-white hover:bg-stone-50 border-2 border-[#292524] text-[#292524] px-3.5 py-1.5 rounded-xl text-xs font-dm font-black uppercase tracking-wider shadow-[2px_2px_0px_#292524] transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            Today
          </button>
        </div>

      </div>

      {/* 2. MAIN CALENDAR CONTAINER (MONTH VS WEEK MODE) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: THE GRID PANEL */}
        <div className="lg:col-span-8 bg-[#FAF8F5] border-2 border-[#292524] rounded-2xl p-4 sm:p-6 shadow-[6px_6px_0px_#292524] space-y-4">
          
          {/* Calendar Grid Title / Month Navigator */}
          <div className="flex items-center justify-between pb-2">
            <h3 className="font-serif font-black text-2xl tracking-tight text-[#292524]">
              {months[currentMonth.getMonth()]} <span className="font-mono text-stone-400 font-extrabold">{currentYear}</span>
            </h3>
            
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 border-2 border-[#292524] hover:bg-[#5B6B4F]/10 rounded-lg text-[#292524] transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4.5 w-4.5" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 border-2 border-[#292524] hover:bg-[#5B6B4F]/10 rounded-lg text-[#292524] transition-colors cursor-pointer"
              >
                <ChevronRight className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* MONTH VIEW GRID */}
          {viewMode === 'month' && (
            <div className="space-y-2">
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-2 text-center">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <span key={day} className="font-serif text-[10px] font-black uppercase tracking-wider text-stone-500">
                    {day}
                  </span>
                ))}
              </div>

              {/* Grid Cells */}
              <div className="grid grid-cols-7 gap-2">
                {monthDays.map((day, idx) => {
                  const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                  const isSelected = day.toDateString() === selectedDate.toDateString();
                  const isToday = day.toDateString() === new Date().toDateString();
                  const dots = getDateStatusDots(day);
                  const hasTasksOnDay = dots.done || dots.amber || dots.red;

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedDate(day)}
                      className={`min-h-[75px] sm:min-h-[85px] bg-white border-2 rounded-xl p-1.5 flex flex-col justify-between transition-all relative group cursor-pointer ${
                        isSelected 
                          ? 'border-[#5B6B4F] ring-2 ring-[#5B6B4F] scale-[1.02] shadow-[3px_3px_0px_#5B6B4F]' 
                          : 'border-[#292524]/25 hover:border-[#292524] hover:scale-[1.02] hover:-translate-y-0.5'
                      } ${isToday ? 'bg-[#FCF8D5]/60 border-[#5B6B4F]/50' : ''}`}
                    >
                      {/* Day Number Header */}
                      <div className="flex justify-between items-center">
                        {isToday ? (
                          <span className="font-mono text-[8px] bg-[#5B6B4F] text-[#FAF8F5] px-1 rounded uppercase font-extrabold scale-90">
                            Today
                          </span>
                        ) : <span />}
                        <span className={`font-serif text-xs font-black text-right ${
                          isCurrentMonth ? 'text-[#292524]' : 'text-stone-300'
                        }`}>
                          {day.getDate()}
                        </span>
                      </div>

                      {/* Small visual items/dots inside grid cell */}
                      <div className="mt-2 flex flex-wrap gap-1 items-center min-h-[14px]">
                        {dots.red && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C4705A]" title="High / Critical absolute plan" />
                        )}
                        {dots.amber && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C9A96E]" title="In-progress timeblock" />
                        )}
                        {dots.done && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#5B6B4F]" title="Milestones Completed" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* WEEK VIEW COLUMNS */}
          {viewMode === 'week' && (
            <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
              {weekDays.map((day, idx) => {
                const isToday = day.toDateString() === new Date().toDateString();
                const isSelected = day.toDateString() === selectedDate.toDateString();
                const daySubtasks = getSubtasksForDay(day);
                const dayMasterTasks = getMasterTasksForDay(day);
                const isHovered = hoveredDayIdx === idx;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDate(day)}
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnter={() => setHoveredDayIdx(idx)}
                    onDragLeave={() => setHoveredDayIdx(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setHoveredDayIdx(null);
                      try {
                        const rawData = e.dataTransfer.getData("application/json");
                        if (rawData) {
                          const { taskId, subtaskId } = JSON.parse(rawData);
                          if (taskId && subtaskId && onRescheduleSubtask) {
                            onRescheduleSubtask(taskId, subtaskId, day);
                          }
                        }
                      } catch (err) {
                        console.error("DND drop failed:", err);
                      }
                    }}
                    className={`min-h-[260px] bg-[#FAF8F5] border-2 rounded-xl flex flex-col p-2.5 transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-[#5B6B4F] ring-2 ring-[#5B6B4F] shadow-[3px_3px_0px_#5B6B4F]' 
                        : 'border-[#292524] hover:scale-[1.01]'
                    } ${isToday ? 'bg-[#FCF8D5]/50' : ''} ${
                      isHovered ? 'bg-[#FCF8D5] border-dashed border-[#5B6B4F] scale-[1.02]' : ''
                    }`}
                  >
                    {/* Header */}
                    <div className="border-b border-[#292524]/10 pb-1.5 text-center">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-[#292524]/55 block font-extrabold">
                        {day.toLocaleDateString([], { weekday: 'short' })}
                      </span>
                      <span className={`font-serif text-sm font-black inline-block h-6 w-6 text-center leading-6 rounded-full mt-0.5 ${
                        isToday ? 'bg-[#5B6B4F] text-[#FAF8F5]' : 'text-[#292524]'
                      }`}>
                        {day.getDate()}
                      </span>
                    </div>

                    {/* Vertical Tasks stack */}
                    <div className="flex-1 space-y-1.5 mt-2.5 overflow-y-auto max-h-[220px] scrollbar-none">
                      {dayMasterTasks.length === 0 && daySubtasks.length === 0 ? (
                        <div className="h-full flex items-center justify-center py-8 text-center">
                          <span className="font-serif italic text-[10px] text-stone-400 font-bold">Quiet</span>
                        </div>
                      ) : (
                        <>
                          {/* absolute master milestones first */}
                          {dayMasterTasks.map((task) => (
                            <div 
                              key={task.id}
                              className={`p-1 border bg-white rounded text-[9px] font-dm leading-none text-[#292524] font-black ${
                                task.priority === 'critical' || task.priority === 'high' ? 'border-red-400 border-l-4' : 'border-stone-300'
                              }`}
                            >
                              🚨 {task.name.substring(0, 18)}
                            </div>
                          ))}
                          
                          {/* subtasks scheduling blocks */}
                          {daySubtasks.map(({ subtask, task }) => {
                            const isCompleted = subtask.status === 'completed';
                            const startTime = subtask.scheduledStart 
                              ? new Date(subtask.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                              : '';

                            return (
                              <div
                                key={subtask.id}
                                draggable={!isCompleted}
                                onDragStart={(e) => {
                                  e.dataTransfer.setData("application/json", JSON.stringify({ taskId: task.id, subtaskId: subtask.id }));
                                  e.dataTransfer.effectAllowed = "move";
                                }}
                                className={`p-1.5 rounded-lg border-2 text-[10px] leading-tight cursor-grab active:cursor-grabbing transition-all ${getPriorityColor(task.priority)} ${
                                  isCompleted ? 'opacity-50 line-through' : ''
                                }`}
                              >
                                <span className="font-mono text-[8px] font-extrabold opacity-75 block">{startTime}</span>
                                <p className="font-black truncate">{subtask.name}</p>
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: SELECTED DAY DETAIL PANEL & ADD TASK */}
        <div className="lg:col-span-4 bg-[#FAF8F5] border-2 border-[#292524] rounded-2xl p-4 sm:p-6 shadow-[6px_6px_0px_#292524] flex flex-col justify-between min-h-[400px]">
          
          <div className="space-y-4">
            {/* Panel Title */}
            <div className="border-b-2 border-[#292524]/10 pb-3 flex items-center justify-between">
              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-[#5B6B4F] font-black block">
                  Focused Timeline
                </span>
                <h4 className="font-serif font-black text-xl text-[#292524]">
                  {selectedDate.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                </h4>
              </div>
              
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-[#5B6B4F] text-[#FAF8F5] border-2 border-[#292524] hover:bg-[#5B6B4F]/90 p-1.5 rounded-xl flex items-center justify-center shadow-[1px_1px_0px_#292524] transition-all cursor-pointer"
                title="Schedule a project milestone for this day"
              >
                <Plus className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Activities List */}
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {!hasSelectedDayActivities ? (
                <div className="py-8 px-4 text-center border-2 border-dashed border-[#292524]/15 rounded-xl space-y-3 bg-white flex flex-col items-center">
                  <EmptyCalendarIllustration className="w-24 h-24" />
                  <div className="space-y-1">
                    <h5 className="font-serif italic text-xs text-[#292524] font-bold">Quiet Day</h5>
                    <p className="font-dm text-[10px] text-stone-500 font-semibold leading-relaxed max-w-[200px]">
                      No active deadline milestones scheduled. Secure your focus window or click '+' to schedule!
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* ABSOLUTE DEADLINES LIST */}
                  {activeMasterTasks.length > 0 && (
                    <div className="space-y-2">
                      <span className="font-mono text-[9px] text-[#C4705A] font-black uppercase tracking-wider block">🚨 Target Deadlines</span>
                      {activeMasterTasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={() => onSelectTask(task)}
                          className="bg-white hover:bg-stone-50 border-2 border-[#292524] rounded-xl p-3 shadow-[2px_2px_0px_#292524] cursor-pointer transition-all flex items-start justify-between gap-2"
                        >
                          <div>
                            <span className="font-mono text-[8px] bg-red-100 text-red-800 border border-red-200 px-1.5 py-0.5 rounded uppercase font-black">
                              Absolute End
                            </span>
                            <h5 className="font-serif font-black text-sm text-[#292524] mt-1.5 leading-snug">
                              {task.name}
                            </h5>
                            <p className="font-dm text-[10px] text-stone-500 font-semibold mt-1 truncate">
                              {task.description || 'Deadline Guardian tracker'}
                            </p>
                          </div>
                          <span className="font-mono text-[10px] text-[#292524] font-extrabold bg-[#F5F1EB] px-2 py-1 border border-[#292524]/20 rounded-md shrink-0">
                            {new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ACTIVE MILESTONES/SUBTASKS LIST */}
                  {activeSubtasks.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="font-mono text-[9px] text-[#5B6B4F] font-black uppercase tracking-wider block">⚙️ Timeblock Milestones</span>
                      {activeSubtasks.map(({ subtask, task }) => {
                        const isCompleted = subtask.status === 'completed';
                        const startTime = subtask.scheduledStart 
                          ? new Date(subtask.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                          : '';

                        return (
                          <div
                            key={subtask.id}
                            onClick={() => onSelectTask(task)}
                            className={`bg-white hover:bg-stone-50 border-2 border-[#292524] rounded-xl p-3 shadow-[2px_2px_0px_#292524] cursor-pointer transition-all flex items-center justify-between gap-3 ${
                              isCompleted ? 'opacity-60 bg-stone-50 border-[#292524]/30 shadow-none' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              {isCompleted ? (
                                <CheckCircle2 className="h-4.5 w-4.5 text-[#5B6B4F] shrink-0" />
                              ) : (
                                <Circle className="h-4.5 w-4.5 text-[#292524]/40 hover:text-[#5B6B4F] shrink-0" />
                              )}
                              <div>
                                <h5 className={`font-dm text-[12px] font-black text-[#292524] leading-snug ${isCompleted ? 'line-through text-stone-400' : ''}`}>
                                  {subtask.name}
                                </h5>
                                <span className="font-mono text-[8px] text-stone-500 font-extrabold uppercase mt-0.5 block">
                                  Plan: {task.name}
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-mono text-[10px] text-[#292524] font-black block">
                                {startTime}
                              </span>
                              <span className="font-mono text-[8px] text-stone-400 font-bold block mt-0.5">
                                {subtask.durationMinutes}m
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[#292524]/10">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="w-full bg-[#5B6B4F] hover:bg-[#5B6B4F]/90 text-white border-2 border-[#292524] rounded-xl py-2 px-4 text-xs font-dm font-black uppercase tracking-wider shadow-[3px_3px_0px_#292524] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus className="h-4.5 w-4.5" />
              Quick Plan Project
            </button>
          </div>

        </div>

      </div>

      {/* 3. TASK SCHEDULER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-[#FAF8F5] border-3 border-[#292524] rounded-2xl w-full max-w-lg p-6 shadow-[8px_8px_0px_#292524] relative flex flex-col max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b-2 border-[#292524]/10 pb-3 mb-4">
              <div>
                <h3 className="font-serif font-black text-xl text-[#292524]">
                  Schedule New Milestone
                </h3>
                <p className="font-dm text-[11px] text-[#292524]/70 font-semibold mt-0.5">
                  Pre-filled target date: <span className="font-bold">{selectedDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 border-2 border-[#292524] hover:bg-stone-100 rounded-lg text-[#292524]"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Error Message */}
            {modalError && (
              <div className="bg-red-50 border-2 border-[#C4705A] text-[#C4705A] p-3 rounded-xl text-xs font-dm font-semibold flex items-center gap-2 mb-4">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleTaskSubmit} className="space-y-4 text-left">
              
              <div>
                <label className="font-mono text-[9px] uppercase tracking-wider text-stone-500 font-extrabold block mb-1">
                  Project / Goal Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Design Hackathon Pitch deck"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  className="w-full bg-white border-2 border-[#292524] px-3.5 py-2 rounded-xl text-xs font-dm font-semibold text-[#292524] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-mono text-[9px] uppercase tracking-wider text-stone-500 font-extrabold block mb-1">
                    Priority Tier
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                    className="w-full bg-white border-2 border-[#292524] px-3 py-2 rounded-xl text-xs font-dm font-semibold text-[#292524] focus:outline-none"
                  >
                    <option value="low">🟢 Low priority</option>
                    <option value="medium">🟡 Medium priority</option>
                    <option value="high">🟠 High priority</option>
                    <option value="critical">🔴 Critical Priority</option>
                  </select>
                </div>

                <div>
                  <label className="font-mono text-[9px] uppercase tracking-wider text-stone-500 font-extrabold block mb-1">
                    Deadline Time
                  </label>
                  <input
                    type="time"
                    required
                    value={newTaskTime}
                    onChange={(e) => setNewTaskTime(e.target.value)}
                    className="w-full bg-white border-2 border-[#292524] px-3 py-2 rounded-xl text-xs font-mono font-bold text-[#292524] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-mono text-[9px] uppercase tracking-wider text-stone-500 font-extrabold block mb-1">
                  Category Tag
                </label>
                <select
                  value={newTaskCategory}
                  onChange={(e) => setNewTaskCategory(e.target.value)}
                  className="w-full bg-white border-2 border-[#292524] px-3 py-2 rounded-xl text-xs font-dm font-semibold text-[#292524] focus:outline-none"
                >
                  <option value="work">💼 Work / Tech</option>
                  <option value="personal">🏠 Personal / Life</option>
                  <option value="study">🎓 Education / Research</option>
                  <option value="health">🌱 Well-being</option>
                </select>
              </div>

              <div>
                <label className="font-mono text-[9px] uppercase tracking-wider text-stone-500 font-extrabold block mb-1">
                  Brief Goal Description
                </label>
                <textarea
                  placeholder="Optional notes or resources..."
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-white border-2 border-[#292524] px-3.5 py-1.5 rounded-xl text-xs font-dm font-semibold text-[#292524] focus:outline-none resize-none"
                />
              </div>

              {/* Dynamic Milestones Creator */}
              <div className="border-t border-[#292524]/10 pt-3">
                <label className="font-mono text-[9px] uppercase tracking-wider text-[#5B6B4F] font-extrabold block mb-2">
                  Project Checklist Block Sequence ({subtasks.length})
                </label>

                <div className="space-y-1.5 max-h-[140px] overflow-y-auto mb-2.5 bg-[#FAF8F5] border border-stone-200 rounded-xl p-2">
                  {subtasks.length === 0 ? (
                    <p className="text-[10px] text-stone-400 italic py-2 text-center">No milestone blocks scheduled.</p>
                  ) : (
                    subtasks.map((st, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white border border-stone-200 rounded-lg p-1.5 px-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[8px] bg-[#5B6B4F]/10 text-[#5B6B4F] border border-[#5B6B4F]/20 px-1.5 py-0.5 rounded font-black">
                            {idx + 1}
                          </span>
                          <span className="font-dm text-xs font-bold text-[#292524]">{st.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[9px] text-stone-400 font-bold">{st.duration} min</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSubtask(idx)}
                            className="text-stone-400 hover:text-[#C4705A]"
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Add step/milestone..."
                    value={newSubtaskName}
                    onChange={(e) => setNewSubtaskName(e.target.value)}
                    className="flex-1 bg-white border-2 border-[#292524] px-3 py-1.5 rounded-xl text-xs font-dm font-semibold text-[#292524] focus:outline-none"
                  />
                  <select
                    value={newSubtaskDuration}
                    onChange={(e) => setNewSubtaskDuration(Number(e.target.value))}
                    className="bg-white border-2 border-[#292524] px-2 py-1.5 rounded-xl text-xs font-mono font-bold text-[#292524] focus:outline-none"
                  >
                    <option value={15}>15m</option>
                    <option value={30}>30m</option>
                    <option value={45}>45m</option>
                    <option value={60}>60m</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddSubtask}
                    className="bg-white hover:bg-stone-50 border-2 border-[#292524] p-1.5 rounded-xl cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="border-t-2 border-[#292524]/10 pt-4 flex items-center justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border-2 border-[#292524] rounded-xl text-xs font-dm font-black uppercase text-stone-700 hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#5B6B4F] hover:bg-[#5B6B4F]/95 text-white border-2 border-[#292524] px-5 py-2 rounded-xl text-xs font-dm font-black uppercase tracking-wider shadow-[3px_3px_0px_#292524] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer flex items-center gap-1.5"
                >
                  {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-4 w-4" />}
                  {saving ? 'Creating...' : 'Schedule Absolute Plan'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default CalendarView;
