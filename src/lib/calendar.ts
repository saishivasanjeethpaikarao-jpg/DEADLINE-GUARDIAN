import { Task, Subtask } from '../types';

export interface CalendarEventPayload {
  summary: string;
  description: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
}

/**
 * Fetch calendar events in a window to avoid double booking
 */
export async function getUpcomingCalendarEvents(token: string, daysAhead = 7): Promise<any[]> {
  try {
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString();

    const response = await fetch(`/api/calendar/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error("Failed to load Google Calendar events");
    }

    const data = await response.json();
    return data.events || [];
  } catch (error) {
    console.error("getUpcomingCalendarEvents error:", error);
    return [];
  }
}

/**
 * Create a calendar event for a single subtask
 */
export async function createSubtaskCalendarEvent(
  token: string,
  taskName: string,
  subtask: Subtask,
  category = "productivity"
): Promise<string | null> {
  if (!subtask.scheduledStart || !subtask.scheduledEnd) {
    console.warn("Subtask is missing scheduled times, skipping calendar event creation.");
    return null;
  }

  const categoryEmojis: Record<string, string> = {
    work: '💼',
    study: '📚',
    personal: '🏡',
    health: '❤️',
    finance: '💳',
    other: '🎯'
  };

  const emoji = categoryEmojis[category] || '⏰';

  const eventPayload: CalendarEventPayload = {
    summary: `${emoji} ${subtask.name} | Deadline Guardian`,
    description: `Subtask of: ${taskName}\nPlanned Duration: ${subtask.durationMinutes} minutes.\n\n🛡️ Generated automatically by Deadline Guardian. Act immediately when the Smart Alarm sounds!`,
    start: {
      dateTime: subtask.scheduledStart,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    },
    end: {
      dateTime: subtask.scheduledEnd,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    }
  };

  try {
    const response = await fetch('/api/calendar/create-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ event: eventPayload })
    });

    if (!response.ok) {
      throw new Error("Failed to insert calendar event");
    }

    const data = await response.json();
    return data.event?.id || null;
  } catch (error) {
    console.error("createSubtaskCalendarEvent error:", error);
    return null;
  }
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(token: string, eventId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/calendar/delete-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ eventId })
    });

    return response.ok;
  } catch (error) {
    console.error("deleteCalendarEvent error:", error);
    return false;
  }
}
