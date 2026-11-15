/** 1 jour et 1 heure, par défaut. Une liste vide veut dire « aucun rappel ». */
export const DEFAULT_REMINDER_MINUTES = [24 * 60, 60] as const;

export type RepeatKind = 'none' | 'daily' | 'weekly';

export type ReminderEvent = {
  id: string;
  title: string;
  date: string;
  start: string | null;
  durationMin: number;
  repeat: RepeatKind;
  until?: string;
  reminderMinutes?: number[];
  memberIds: string[];
  createdBy: string;
  updatedAt: number;
};

export type PlannedNotice = {
  id: string;
  title: string;
  body: string;
  fireAt: number;
  kind: 'reminder' | 'digest' | 'assignment';
};

const MINUTE = 60 * 1000;

export function resolveReminderMinutes(explicit?: number[] | null): number[] {
  if (!explicit) return [...DEFAULT_REMINDER_MINUTES];
  const clean = explicit.filter((value) => Number.isFinite(value) && value >= 0 && value <= 14 * 24 * 60);
  return [...new Set(clean)].sort((a, b) => b - a);
}

export function parseDay(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function isoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function addDays(iso: string, count: number): string {
  const date = parseDay(iso);
  date.setDate(date.getDate() + count);
  return isoDay(date);
}

function occursOn(event: ReminderEvent, day: string): boolean {
  if (event.date === day) return true;
  if (day < event.date || (event.until && day > event.until)) return false;
  if (event.repeat === 'daily') return true;
  if (event.repeat === 'weekly') return parseDay(day).getDay() === parseDay(event.date).getDay();
  return false;
}

/** Journée entière : ancre à 09:00 locale. Sinon, date + heure de début. */
export function eventAnchor(event: ReminderEvent, day: string): number {
  const date = parseDay(day);
  if (!event.start) {
    date.setHours(9, 0, 0, 0);
    return date.getTime();
  }
  const [hours, minutes] = event.start.split(':').map(Number);
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date.getTime();
}

export function reminderInstants(event: ReminderEvent, from: number, horizonDays = 21): number[] {
  const offsets = resolveReminderMinutes(event.reminderMinutes);
  if (offsets.length === 0) return [];
  const start = isoDay(new Date(from));
  const times: number[] = [];
  for (let i = 0; i <= horizonDays; i++) {
    const day = addDays(start, i);
    if (!occursOn(event, day)) continue;
    const anchor = eventAnchor(event, day);
    for (const minutes of offsets) {
      const fireAt = anchor - minutes * MINUTE;
      if (fireAt > from) times.push(fireAt);
    }
  }
  return times;
}

export function digestFireAt(day: string, hour: number): number {
  const date = parseDay(day);
  const safe = Number.isFinite(hour) ? Math.min(23, Math.max(0, Math.trunc(hour))) : 7;
  date.setHours(safe, 0, 0, 0);
  return date.getTime();
}

export function digestBody(lines: { time: string; title: string }[]): string {
  if (lines.length === 0) return 'Rien de prévu aujourd’hui.';
  return lines.map((line) => `${line.time} ${line.title}`).join('\n');
}

export function assignmentCopy(input: { title: string; actorName: string; created: boolean }): { title: string; body: string } {
  return {
    title: input.created ? 'Nouvel événement' : 'Événement modifié',
    body: `${input.actorName} : ${input.title}`,
  };
}

export function planReminderNotices(events: ReminderEvent[], from: number, horizonDays = 21): PlannedNotice[] {
  const notices: PlannedNotice[] = [];
  for (const event of events) {
    for (const fireAt of reminderInstants(event, from, horizonDays)) {
      notices.push({
        id: `reminder:${event.id}:${fireAt}`,
        title: 'Familycal',
        body: event.start ? `${event.start} ${event.title}` : event.title,
        fireAt,
        kind: 'reminder',
      });
    }
  }
  return notices;
}

export function planDigest(input: {
  day: string;
  hour: number;
  enabled: boolean;
  lines: { time: string; title: string }[];
  now: number;
}): PlannedNotice | null {
  if (!input.enabled) return null;
  const fireAt = digestFireAt(input.day, input.hour);
  if (fireAt <= input.now) return null;
  return {
    id: `digest:${input.day}`,
    title: 'Familycal · aujourd’hui',
    body: digestBody(input.lines),
    fireAt,
    kind: 'digest',
  };
}

/** Changement reçu pour un événement dont je suis participant, et que je n'ai pas moi-même écrit. */
export function assignmentAlerts(input: {
  previous: ReminderEvent[];
  next: ReminderEvent[];
  meId: string;
  actorName: (createdBy: string) => string;
  now: number;
}): PlannedNotice[] {
  const before = new Map(input.previous.map((event) => [event.id, event]));
  const notices: PlannedNotice[] = [];
  for (const event of input.next) {
    if (!event.memberIds.includes(input.meId)) continue;
    if (event.createdBy === input.meId) continue;
    const prev = before.get(event.id);
    if (prev && prev.updatedAt === event.updatedAt && prev.title === event.title && prev.date === event.date && prev.start === event.start) continue;
    const copy = assignmentCopy({ title: event.title, actorName: input.actorName(event.createdBy), created: !prev });
    notices.push({
      id: `assign:${event.id}:${event.updatedAt}`,
      title: copy.title,
      body: copy.body,
      fireAt: input.now + 1000,
      kind: 'assignment',
    });
  }
  return notices;
}
