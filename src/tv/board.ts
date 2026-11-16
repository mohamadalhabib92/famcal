import { reminderInstants, type ReminderEvent } from '../domain/reminders';

export type TvLine = {
  id: string;
  title: string;
  time: string;
  names: string;
  color: string;
};

export type TvReminder = {
  id: string;
  title: string;
  when: string;
  fireAt: number;
};

const pad = (value: number) => String(value).padStart(2, '0');

export function formatClock(ms: number): string {
  const date = new Date(ms);
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Rappels à venir, calculés sur l’appareil. Aucun envoi push. */
export function upcomingReminders(events: ReminderEvent[], from: number, horizonDays = 2, limit = 8): TvReminder[] {
  const rows: TvReminder[] = [];
  for (const event of events) {
    for (const fireAt of reminderInstants(event, from, horizonDays)) {
      rows.push({
        id: `${event.id}:${fireAt}`,
        title: event.title,
        when: formatClock(fireAt),
        fireAt,
      });
    }
  }
  rows.sort((a, b) => a.fireAt - b.fireAt || a.title.localeCompare(b.title));
  return rows.slice(0, limit);
}

export function memberLines(lines: TvLine[]): Map<string, TvLine[]> {
  const grouped = new Map<string, TvLine[]>();
  for (const line of lines) {
    const key = line.names || 'Famille';
    const list = grouped.get(key) ?? [];
    list.push(line);
    grouped.set(key, list);
  }
  return grouped;
}
