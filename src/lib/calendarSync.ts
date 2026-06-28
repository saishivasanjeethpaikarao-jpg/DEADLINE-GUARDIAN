import { Task } from '../types';

/**
 * Format a Date object to the standard YYYYMMDDTHHMMSSZ format required by Google Calendar and ICS.
 */
function formatToIsoBasic(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Generates a deep-link URL to add the deadline as an event to Google Calendar.
 */
export function generateGoogleCalendarLink(task: Task): string {
  const endDate = new Date(task.deadline);
  // Start the event 1 hour prior to the absolute deadline
  const startDate = new Date(endDate.getTime() - 60 * 60 * 1000);

  const title = `🚨 DEADLINE: ${task.name}`;
  
  const milestoneList = task.subtasks && task.subtasks.length > 0
    ? task.subtasks.map(st => `• [${st.status === 'completed' ? '✓' : ' '}] ${st.name} (${st.durationMinutes}m)`).join('\n')
    : 'No milestones defined.';

  const details = `${task.description || 'Deadline Guardian automated project tracking.'}

--------------------------------------------------
绝对 DEEPLINE STATUS:
Priority: ${task.priority?.toUpperCase() || 'STANDARD'}
Category: ${task.category?.toUpperCase() || 'GENERAL'}

MILESTONE CHECKLIST:
${milestoneList}

Created by Deadline Guardian Co-Pilot.`;

  const datesParam = `${formatToIsoBasic(startDate)}/${formatToIsoBasic(endDate)}`;
  
  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', title);
  url.searchParams.set('dates', datesParam);
  url.searchParams.set('details', details);
  if (task.locationHint) {
    url.searchParams.set('location', task.locationHint);
  }

  return url.toString();
}

/**
 * Generates and triggers download of a standardized .ics file for Apple Calendar, Outlook, etc.
 */
export function generateIcsFile(task: Task): void {
  const endDate = new Date(task.deadline);
  const startDate = new Date(endDate.getTime() - 60 * 60 * 1000);
  const stampDate = new Date();

  const title = `DEADLINE: ${task.name}`;
  
  const milestoneList = task.subtasks && task.subtasks.length > 0
    ? task.subtasks.map(st => `• [${st.status === 'completed' ? 'X' : ' '}] ${st.name} (${st.durationMinutes}m)`).join('\\n')
    : 'No milestones defined.';

  const cleanDesc = (task.description || 'Deadline Guardian automated project tracking.')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');

  const details = `${cleanDesc}\\n\\nPriority: ${task.priority || 'standard'}\\nCategory: ${task.category || 'work'}\\n\\nMilestones:\\n${milestoneList}`;

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Deadline Guardian//NONSGML Calendar Sync//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${task.id}-${stampDate.getTime()}@deadlineguardian.com`,
    `DTSTAMP:${formatToIsoBasic(stampDate)}`,
    `DTSTART:${formatToIsoBasic(startDate)}`,
    `DTEND:${formatToIsoBasic(endDate)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${details}`,
    task.locationHint ? `LOCATION:${task.locationHint.replace(/,/g, '\\,')}` : '',
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(line => line !== ''); // Remove empty lines (like location if undefined)

  const icsContent = icsLines.join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  const safeFileName = task.name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .substring(0, 30);
  
  link.setAttribute('download', `${safeFileName}_deadline.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
