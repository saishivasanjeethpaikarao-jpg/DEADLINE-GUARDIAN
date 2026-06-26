import React, { useState } from 'react';
import { Task, Subtask } from '../types';
import { Calendar, Clock, ChevronLeft, ChevronRight, CheckCircle2, Circle, GripVertical } from 'lucide-react';

interface CalendarViewProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onRescheduleSubtask?: (taskId: string, subtaskId: string, targetDate: Date) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onSelectTask, onRescheduleSubtask }) => {
  const [hoveredDayIdx, setHoveredDayIdx] = useState<number | null>(null);

  // Generate the current week days (Monday - Sunday)
  const getWeekDays = () => {
    const days = [];
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    
    const monday = new Date();
    monday.setDate(today.getDate() + distanceToMonday);

    for (let i = 0; i < 7; i++) {
      const day = new Date(monday.getTime());
      day.setDate(monday.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const weekDays = getWeekDays();

  // Find all subtasks for each day
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

    // Sort by scheduled start time
    return list.sort((a, b) => 
      new Date(a.subtask.scheduledStart!).getTime() - new Date(b.subtask.scheduledStart!).getTime()
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
      case 'high':
        return 'border-[#C4705A] text-[#C4705A] bg-[#C4705A]/5';
      default:
        return 'border-[#5B6B43] text-[#5B6B43] bg-[#5B6B43]/5';
    }
  };

  return (
    <div className="bg-[#FAF8F5] border-2 border-[#292524] rounded-2xl p-6 shadow-[6px_6px_0px_#292524] space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-[#292524]/10 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 bg-[#5B6B43]/10 border-2 border-[#5B6B43] rounded-lg flex items-center justify-center text-[#5B6B43]">
            <Calendar className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="font-serif font-extrabold text-lg text-[#292524]">Weekly Planner</h2>
            <p className="font-dm text-xs text-[#292524]/60">Your dynamic AI calendar blocks scheduled for optimal energy hours</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-[#F5F1EB] border-2 border-[#292524] px-3.5 py-1.5 rounded-xl text-xs font-dm font-bold text-[#292524]">
          <span>{weekDays[0].toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
          <span className="text-[#292524]/30">–</span>
          <span>{weekDays[6].toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Grid of days */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {weekDays.map((day, idx) => {
          const isToday = day.toDateString() === new Date().toDateString();
          const daySubtasks = getSubtasksForDay(day);
          const isHovered = hoveredDayIdx === idx;

          return (
            <div 
              key={idx} 
              onDragOver={(e) => {
                e.preventDefault();
              }}
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
              className={`min-h-[220px] bg-[#FAF8F5] border-2 border-[#292524] rounded-xl flex flex-col p-3 transition-all ${
                isToday ? 'bg-[#FCF8D5] ring-2 ring-[#5B6B43]' : ''
              } ${
                isHovered ? 'bg-[#FCF8D5] border-dashed border-[#5B6B43] scale-[1.01]' : ''
              }`}
            >
              {/* Day Header */}
              <div className="border-b border-[#292524]/10 pb-2 text-center">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#292524]/50 block">
                  {day.toLocaleDateString([], { weekday: 'short' })}
                </span>
                <span className={`font-serif text-lg font-black inline-block h-7 w-7 text-center leading-7 rounded-full mt-0.5 ${
                  isToday ? 'bg-[#5B6B43] text-[#FAF8F5]' : 'text-[#292524]'
                }`}>
                  {day.getDate()}
                </span>
              </div>

              {/* Day Content */}
              <div className="flex-1 space-y-2 mt-3 overflow-y-auto max-h-[250px] pr-0.5">
                {daySubtasks.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center py-6">
                    <span className="font-dm text-[11px] text-[#292524]/40 italic">Quiet day</span>
                  </div>
                ) : (
                  daySubtasks.map(({ subtask, task }) => {
                    const isCompleted = subtask.status === 'completed';
                    const startTime = subtask.scheduledStart 
                      ? new Date(subtask.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '';

                    return (
                      <div
                        key={subtask.id}
                        onClick={() => onSelectTask(task)}
                        draggable={!isCompleted}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("application/json", JSON.stringify({ taskId: task.id, subtaskId: subtask.id }));
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        className={`p-2 rounded-lg border-2 text-left cursor-grab active:cursor-grabbing transition-all hover:scale-[1.02] ${getPriorityColor(task.priority)} ${
                          isCompleted ? 'opacity-50 line-through cursor-not-allowed' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-mono text-[9px] font-black tracking-tight opacity-80 flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {startTime}
                          </span>
                          {isCompleted ? (
                            <CheckCircle2 className="h-3 w-3 text-[#5B6B43] shrink-0" />
                          ) : (
                            <Circle className="h-3 w-3 opacity-45 shrink-0" />
                          )}
                        </div>
                        <h4 className="font-dm text-[11px] font-bold leading-tight line-clamp-2 text-[#292524]">
                          {subtask.name}
                        </h4>
                        <span className="font-mono text-[8px] opacity-60 block mt-0.5 truncate">
                          {task.name}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default CalendarView;
