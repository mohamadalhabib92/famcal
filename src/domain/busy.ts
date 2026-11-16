import { eventReadLevel, type AccessEvent, type AccessLink, type AccessMember, type ReadLevel } from './visibility';

export type BusyInterval = {
  memberId: string;
  day: string;
  start: string | null;
  endMin: number | null;
  level: Exclude<ReadLevel, 'hidden'>;
  title: string;
};

export type BusyEvent = AccessEvent & {
  date: string;
  start: string | null;
  durationMin: number;
  repeat: 'none' | 'daily' | 'weekly';
  until?: string;
  title: string;
};

function parseDay(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function occursOn(event: BusyEvent, day: string): boolean {
  if (event.date === day) return true;
  if (event.repeat === 'none' || day < event.date || (event.until && day > event.until)) return false;
  if (event.repeat === 'daily') return true;
  return parseDay(day).getDay() === parseDay(event.date).getDay();
}

function toMin(hhmm: string): number {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Créneaux occupés visibles par la personne. Le titre n'est présent que si le détail est autorisé. */
export function busyIntervals(input: {
  events: BusyEvent[];
  day: string;
  viewer: AccessMember | null;
  members: AccessMember[];
  links: AccessLink[];
}): BusyInterval[] {
  const intervals: BusyInterval[] = [];
  for (const event of input.events) {
    if (!occursOn(event, input.day)) continue;
    const level = eventReadLevel(input.viewer, event, input.members, input.links);
    if (level === 'hidden') continue;
    const people = event.memberIds.length > 0 ? event.memberIds : [event.createdBy];
    for (const memberId of people) {
      intervals.push({
        memberId,
        day: input.day,
        start: event.start,
        endMin: event.start ? toMin(event.start) + event.durationMin : null,
        level,
        title: level === 'full' ? event.title : 'Occupé',
      });
    }
  }
  intervals.sort((a, b) => (a.start ?? '').localeCompare(b.start ?? '') || a.memberId.localeCompare(b.memberId));
  return intervals;
}
