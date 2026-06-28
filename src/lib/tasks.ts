import { db } from './firebase';
import { Task, Subtask, PrepMaterial, AlarmHistoryItem } from '../types';
import {
  collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy
} from 'firebase/firestore';
import { mockTasks } from './demoData';
import { syncEvents } from './syncEvents';

const TASKS_COLL = 'tasks';

/**
 * Gets a merge of persistent Firestore tasks and cached demo tasks
 */
export async function getTasksForUser(userId: string): Promise<Task[]> {
  try {
    // Return mockTasks for demo user instantly
    if (userId === 'demo-user') {
      const local = localStorage.getItem('dg_local_tasks_demo');
      if (local) return JSON.parse(local);
      return mockTasks;
    }

    const q = query(collection(db, TASKS_COLL), where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const firestoreTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
    
    // Merge standard demo tasks in if user is new and has 0 tasks
    if (firestoreTasks.length === 0) {
      // Create user copy of demo task to make it instantly alive
      const copyTasks = mockTasks.map(task => ({
        ...task,
        userId: userId,
        createdAt: new Date().toISOString()
      }));
      // Save them in the background so we don't block the UI waking up
      copyTasks.forEach(task => {
        saveTaskToDb(task).catch(err => console.warn("Background seed save failed:", err));
      });
      try {
        localStorage.setItem(`dg_tasks_${userId}`, JSON.stringify(copyTasks));
      } catch (lc) {}
      return copyTasks;
    }

    try {
      localStorage.setItem(`dg_tasks_${userId}`, JSON.stringify(firestoreTasks));
    } catch (lc) {}
    return firestoreTasks;
  } catch (e: any) {
    const errStr = e instanceof Error ? e.message : String(e);
    if (errStr.includes('offline') || errStr.includes('Failed to get document')) {
      console.info("Firestore client is offline. Utilizing local cached tasks list.");
    } else {
      console.warn("Could not fetch remote tasks, fell back to local cache:", e);
    }
    const cached = localStorage.getItem(`dg_tasks_${userId}`);
    if (cached) return JSON.parse(cached);
    return mockTasks.map(t => ({ ...t, userId }));
  }
}

/**
 * Save or update a task to DB / local fallback
 */
export async function saveTaskToDb(task: Task): Promise<void> {
  const isRealUser = task.userId !== 'demo-user';
  if (isRealUser) {
    syncEvents.emit(true, false);
  }
  try {
    if (task.userId === 'demo-user') {
      const current = localStorage.getItem('dg_local_tasks_demo');
      let list = current ? JSON.parse(current) : [...mockTasks];
      const index = list.findIndex((t: Task) => t.id === task.id);
      if (index > -1) {
        list[index] = task;
      } else {
        list.unshift(task);
      }
      localStorage.setItem('dg_local_tasks_demo', JSON.stringify(list));
      return;
    }

    const docRef = doc(db, TASKS_COLL, task.id);
    await setDoc(docRef, task, { merge: true });
    
    // Keep local cache up to date
    try {
      const current = localStorage.getItem(`dg_tasks_${task.userId}`);
      let list = current ? JSON.parse(current) : [];
      const index = list.findIndex((t: Task) => t.id === task.id);
      if (index > -1) list[index] = task;
      else list.unshift(task);
      localStorage.setItem(`dg_tasks_${task.userId}`, JSON.stringify(list));
    } catch (lc) {}
    
    if (isRealUser) {
      syncEvents.emit(false, false);
    }
  } catch (e) {
    console.error("Error saving task:", e);
    // Write fallback to local cache
    const current = localStorage.getItem(`dg_tasks_${task.userId}`);
    let list = current ? JSON.parse(current) : [];
    const index = list.findIndex((t: Task) => t.id === task.id);
    if (index > -1) list[index] = task;
    else list.unshift(task);
    localStorage.setItem(`dg_tasks_${task.userId}`, JSON.stringify(list));
    
    if (isRealUser) {
      syncEvents.emit(false, true);
    }
  }
}

/**
 * Delete a task
 */
export async function deleteTaskFromDb(userId: string, taskId: string): Promise<void> {
  const isRealUser = userId !== 'demo-user';
  if (isRealUser) {
    syncEvents.emit(true, false);
  }
  try {
    if (userId === 'demo-user') {
      const current = localStorage.getItem('dg_local_tasks_demo');
      let list = current ? JSON.parse(current) : [...mockTasks];
      list = list.filter((t: Task) => t.id !== taskId);
      localStorage.setItem('dg_local_tasks_demo', JSON.stringify(list));
      return;
    }

    await deleteDoc(doc(db, TASKS_COLL, taskId));
    
    try {
      const current = localStorage.getItem(`dg_tasks_${userId}`);
      if (current) {
        let list = JSON.parse(current);
        list = list.filter((t: Task) => t.id !== taskId);
        localStorage.setItem(`dg_tasks_${userId}`, JSON.stringify(list));
      }
    } catch (lc) {}
    
    if (isRealUser) {
      syncEvents.emit(false, false);
    }
  } catch (e) {
    console.error("Error deleting task:", e);
    if (isRealUser) {
      syncEvents.emit(false, true);
    }
  }
}

/**
 * Calculates the number of consecutive days a user has completed at least one task.
 */
export function calculateStreak(tasks: Task[]): number {
  const completedDates = new Set<string>();
  tasks.forEach(task => {
    if (task.status === 'completed' && task.completedAt) {
      const dateStr = task.completedAt.split('T')[0]; // YYYY-MM-DD
      completedDates.add(dateStr);
    }
  });

  if (completedDates.size === 0) return 0;

  const getLocalDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateStr(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateStr(yesterday);

  if (!completedDates.has(todayStr) && !completedDates.has(yesterdayStr)) {
    return 0;
  }

  let streak = 0;
  const currentDate = completedDates.has(todayStr) ? new Date() : yesterday;

  for (let i = 0; i < 1000; i++) {
    const dateStr = getLocalDateStr(currentDate);
    if (completedDates.has(dateStr)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Calculates the consecutive days a user has completed at least one task subtask.
 */
export function calculateFocusStreak(tasks: Task[]): number {
  const completedDates = new Set<string>();

  const getLocalDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  tasks.forEach(task => {
    if (task.subtasks) {
      task.subtasks.forEach(sub => {
        if (sub.status === 'completed') {
          let dateStr = '';
          if (sub.completedAt) {
            dateStr = getLocalDateStr(new Date(sub.completedAt));
          } else if (sub.scheduledStart) {
            dateStr = getLocalDateStr(new Date(sub.scheduledStart));
          } else if (task.completedAt) {
            dateStr = getLocalDateStr(new Date(task.completedAt));
          } else {
            dateStr = getLocalDateStr(new Date(task.createdAt));
          }
          if (dateStr) {
            completedDates.add(dateStr);
          }
        }
      });
    }
  });

  if (completedDates.size === 0) return 0;

  const todayStr = getLocalDateStr(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateStr(yesterday);

  if (!completedDates.has(todayStr) && !completedDates.has(yesterdayStr)) {
    return 0;
  }

  let streak = 0;
  const currentDate = completedDates.has(todayStr) ? new Date() : yesterday;

  for (let i = 0; i < 1000; i++) {
    const dateStr = getLocalDateStr(currentDate);
    if (completedDates.has(dateStr)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

// ==================== ALARM HISTORY PERSISTENCE ====================
const ALARM_HISTORY_COLL = 'alarmHistory';

function getMockAlarmHistory(): AlarmHistoryItem[] {
  const list: AlarmHistoryItem[] = [];
  const taskNames = ["Database Setup", "Compiler Design Project", "Marketing Prep", "UI Layout Review"];
  const subtaskNames = ["Schema design", "Tokenizing parser", "Ad Copy Draft", "Tailwind flex refinement"];
  
  const now = new Date();
  for (let i = 0; i < 15; i++) {
    const dayOffset = Math.floor(i / 2);
    const date = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000 - Math.random() * 4 * 60 * 60 * 1000);
    const action: 'snooze' | 'complete' = Math.random() > 0.45 ? 'complete' : 'snooze';
    const idx = i % taskNames.length;
    list.push({
      id: `mock_history_${i}`,
      userId: 'demo-user',
      taskName: taskNames[idx],
      subtaskName: subtaskNames[idx],
      action,
      timestamp: date.toISOString(),
      minutes: action === 'snooze' ? (Math.random() > 0.5 ? 10 : 5) : undefined
    });
  }
  return list;
}

export async function logAlarmEvent(
  userId: string,
  taskName: string,
  subtaskName: string,
  action: 'snooze' | 'complete',
  minutes?: number
): Promise<void> {
  const item: AlarmHistoryItem = {
    id: `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    userId,
    taskName,
    subtaskName,
    action,
    timestamp: new Date().toISOString(),
    minutes
  };

  try {
    if (userId === 'demo-user') {
      const current = localStorage.getItem('dg_local_alarm_history_demo');
      let list = current ? JSON.parse(current) : getMockAlarmHistory();
      list.unshift(item);
      localStorage.setItem('dg_local_alarm_history_demo', JSON.stringify(list));
      return;
    }

    const docRef = doc(db, ALARM_HISTORY_COLL, item.id);
    await setDoc(docRef, item);

    // Update local cache
    const current = localStorage.getItem(`dg_alarm_history_${userId}`);
    let list = current ? JSON.parse(current) : [];
    list.unshift(item);
    localStorage.setItem(`dg_alarm_history_${userId}`, JSON.stringify(list));
  } catch (e) {
    console.error("Error logging alarm event:", e);
    // Local fallback
    const current = localStorage.getItem(`dg_alarm_history_${userId}`);
    let list = current ? JSON.parse(current) : [];
    list.unshift(item);
    localStorage.setItem(`dg_alarm_history_${userId}`, JSON.stringify(list));
  }
}

export async function getAlarmHistory(userId: string): Promise<AlarmHistoryItem[]> {
  try {
    if (userId === 'demo-user') {
      const local = localStorage.getItem('dg_local_alarm_history_demo');
      if (local) return JSON.parse(local);
      const mockHist = getMockAlarmHistory();
      localStorage.setItem('dg_local_alarm_history_demo', JSON.stringify(mockHist));
      return mockHist;
    }

    const q = query(collection(db, ALARM_HISTORY_COLL), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const firestoreHistory = snapshot.docs.map(doc => doc.data() as AlarmHistoryItem);

    if (firestoreHistory.length === 0) {
      const mockHist = getMockAlarmHistory().map(h => ({ ...h, userId, id: `${userId}_${h.id}` }));
      // Save them in the background so we don't block the UI waking up
      mockHist.forEach(h => {
        setDoc(doc(db, ALARM_HISTORY_COLL, h.id), h).catch(err => console.warn("History background seed failed:", err));
      });
      return mockHist;
    }

    return firestoreHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (e) {
    console.error("Error fetching alarm history, returning cached fallback:", e);
    const cached = localStorage.getItem(`dg_alarm_history_${userId}`);
    if (cached) return JSON.parse(cached);
    return getMockAlarmHistory().map(h => ({ ...h, userId }));
  }
}

