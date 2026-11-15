export type DeviceCalendarEvent = {
  id: string;
  calendarId: string;
  title: string;
  startDate: string;
  endDate: string;
  allDay?: boolean;
  location?: string | null;
  notes?: string | null;
};

export type MappedEvent = {
  id: string;
  familyId: string;
  title: string;
  date: string;
  start: string | null;
  durationMin: number;
  memberIds: string[];
  location?: string;
  notes?: string;
  repeat: 'none';
  visibility: 'private';
  createdBy: string;
  updatedAt: number;
  source: 'device-calendar';
  deviceCalendarId: string;
  deviceEventId: string;
};

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function localParts(iso: string): { date: string; minutes: number } {
  const date = new Date(iso);
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    minutes: date.getHours() * 60 + date.getMinutes(),
  };
}

/** Identifiant stable : réimporter le même événement du téléphone ne crée pas un doublon. */
export function deviceEventId(calendarId: string, eventId: string): string {
  return `cal_${calendarId}_${eventId}`;
}

export function mapDeviceEvent(input: DeviceCalendarEvent, ctx: { familyId: string; memberId: string; updatedAt: number }): MappedEvent {
  const start = localParts(input.startDate);
  const end = localParts(input.endDate);
  const allDay = !!input.allDay;
  let duration = allDay ? 0 : end.minutes - start.minutes;
  if (!allDay && duration <= 0) duration = 60;
  return {
    id: deviceEventId(input.calendarId, input.id),
    familyId: ctx.familyId,
    title: input.title.trim() || 'Sans titre',
    date: start.date,
    start: allDay ? null : `${pad(Math.floor(start.minutes / 60))}:${pad(start.minutes % 60)}`,
    durationMin: duration,
    memberIds: [ctx.memberId],
    location: input.location?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    repeat: 'none',
    visibility: 'private',
    createdBy: ctx.memberId,
    updatedAt: ctx.updatedAt,
    source: 'device-calendar',
    deviceCalendarId: input.calendarId,
    deviceEventId: input.id,
  };
}

export type DeviceWrite = {
  title: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  location?: string;
  notes?: string;
  timeZone: string;
};

export function toDeviceWrite(event: { title: string; date: string; start: string | null; durationMin: number; location?: string; notes?: string }): DeviceWrite {
  const [year, month, day] = event.date.split('-').map(Number);
  if (!event.start) {
    const startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endDate = new Date(year, month - 1, day + 1, 0, 0, 0, 0);
    return { title: event.title, startDate, endDate, allDay: true, location: event.location, notes: event.notes, timeZone: 'UTC' };
  }
  const [hours, minutes] = event.start.split(':').map(Number);
  const startDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
  const endDate = new Date(startDate.getTime() + Math.max(event.durationMin, 15) * 60 * 1000);
  return { title: event.title, startDate, endDate, allDay: false, location: event.location, notes: event.notes, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' };
}
