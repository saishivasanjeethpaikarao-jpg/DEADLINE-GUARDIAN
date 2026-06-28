// ==================== TASK & USER TYPES ====================
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';
export type SubtaskStatus = 'pending' | 'in_progress' | 'completed';

export interface Subtask {
  id: string;
  name: string;
  durationMinutes: number;
  order: number;
  status: SubtaskStatus;
  scheduledStart?: string; // ISO string
  scheduledEnd?: string; // ISO string
  alarmNote?: string;
  calendarEventId?: string;
  completedAt?: string; // ISO string
  snoozeCount?: number;
}

export interface PrepMaterial {
  outline: string;
  talkingPoints: string[];
  resources: string[];
  practiceQuestions: string[];
  emailTemplates: { name: string; subject: string; body: string }[];
  checklist: string[];
}

export interface Task {
  id: string;
  userId: string;
  name: string;
  description?: string;
  deadline: string; // ISO string
  priority: TaskPriority;
  status: TaskStatus;
  estimatedDurationMinutes: number;
  subtasks: Subtask[];
  prepMaterials?: PrepMaterial;
  calendarEventIds: string[];
  createdAt: string; // ISO string
  completedAt?: string; // ISO string
  category?: string;
  locationHint?: string;
}

export interface ProductivityPattern {
  peakHours: number[]; // e.g. [9, 10, 11, 14, 15]
  preferredWorkLocation: string;
}

export interface UserSettings {
  autoReschedule: boolean;
  alarmSound: string;
  snoozeDefaultMinutes: number;
  darkMode: boolean;
  notificationsEnabled: boolean;
  accountabilityPartnerEmail?: string;
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  googleAccessToken?: string;
  calendarId: string;
  productivityPattern: ProductivityPattern;
  settings: UserSettings;
  createdAt: string;
}

export interface ParsedTask {
  task_name: string;
  deadline: string;
  priority: TaskPriority;
  estimated_duration_minutes: number;
  subtasks: { name: string; duration_minutes: number; order: number }[];
  category: string;
  location_hint: string;
  description: string;
}

// ==================== ALARM TYPES ====================
export type AlarmStatus = 'scheduled' | 'sent' | 'snoozed' | 'dismissed' | 'completed';

export interface Alarm {
  id: string;
  taskId: string;
  subtaskId: string;
  userId: string;
  taskName: string;
  subtaskName: string;
  scheduledAt: string; // ISO string
  note: string;
  status: AlarmStatus;
  snoozeCount: number;
  snoozeUntil?: string; // ISO string
  priority: TaskPriority;
  deadline: string; // ISO string
}

// ==================== ALARM HISTORY TYPES ====================
export interface AlarmHistoryItem {
  id: string;
  userId: string;
  taskName: string;
  subtaskName: string;
  action: 'snooze' | 'complete';
  timestamp: string; // ISO string
  minutes?: number; // snooze duration
}

// ==================== ACHIEVEMENT & BADGE TYPES ====================
export interface AchievementBadge {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name or emoji
  unlockedAt?: string; // ISO string if unlocked, undefined if locked
  progress?: number; // e.g. 1/3 days focus streak
  maxProgress?: number;
}

// ==================== SMART EMAIL AGENT TYPES ====================
export interface SmartEmail {
  id: string;
  userId: string;
  taskId?: string;
  taskName?: string;
  shouldSend: boolean;
  recipient: string;
  recipientName: string;
  subject: string;
  body: string;
  tone: 'formal' | 'casual' | 'urgent' | 'friendly';
  sendTime?: string;
  confidence: number;
  reasoning: string;
  status: 'draft' | 'approved' | 'rejected' | 'snoozed' | 'sent';
  cc?: string;
  createdAt: string;
  sentAt?: string;
  isRecipientVerified: boolean;
  isAppropriate: boolean;
  isUrgent: boolean;
  ccSuggestions: string[];
  containsSensitiveKeywords: boolean;
}
