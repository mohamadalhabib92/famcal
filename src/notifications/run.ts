import { Platform } from 'react-native';
import { assignmentAlerts, digestBody, planDigest, planReminderNotices, type ReminderEvent } from '@/domain/reminders';
import { eventVisibility, me, store, type CalEvent } from '@/state';

type NotificationsModule = {
  requestPermissionsAsync: () => Promise<{ status: string }>;
  getPermissionsAsync: () => Promise<{ status: string }>;
  scheduleNotificationAsync: (request: { identifier: string; content: { title: string; body: string }; trigger: { type: string; date: Date } }) => Promise<string>;
  cancelAllScheduledNotificationsAsync: () => Promise<void>;
  SchedulableTriggerInputTypes: { DATE: string };
};

let asked = false;

async function loadNotifications(): Promise<NotificationsModule | null> {
  if (Platform.OS === 'web') return null;
  try {
    const specifier = 'expo-notifications';
    return (await import(specifier)) as NotificationsModule;
  } catch {
    return null;
  }
}

function asReminder(event: CalEvent): ReminderEvent {
  return {
    id: event.id,
    title: event.title,
    date: event.date,
    start: event.start,
    durationMin: event.durationMin,
    repeat: event.repeat,
    until: event.until,
    reminderMinutes: event.reminderMinutes,
    memberIds: event.memberIds,
    createdBy: event.createdBy,
    updatedAt: event.updatedAt,
  };
}

let previous: ReminderEvent[] = [];

export async function rescheduleNotifications(): Promise<void> {
  if (Platform.isTV) return;
  const notifications = await loadNotifications();
  if (!notifications) return;
  const state = store.get();
  if (!state.family || !state.onboarded) return;
  const viewer = me(state);
  if (!viewer) return;
  try {
    const existing = await notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted' && !asked) {
      asked = true;
      status = (await notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return;
    const visible = state.events.filter((event) => eventVisibility(state, viewer, event) === 'full').map(asReminder);
    const now = Date.now();
    const reminders = planReminderNotices(visible, now);
    const today = new Date();
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const day = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    const lines = visible
      .filter((event) => event.date === day || event.repeat !== 'none')
      .slice(0, 8)
      .map((event) => ({ time: event.start ?? 'Journée', title: event.title }));
    const digest = planDigest({ day, hour: state.prefs.digestHour ?? 7, enabled: state.prefs.digest !== false, lines, now });
    const assignments = assignmentAlerts({
      previous,
      next: visible,
      meId: viewer.id,
      actorName: (id) => state.members.find((member) => member.id === id)?.name ?? 'Quelqu’un',
      now,
    });
    previous = visible;
    await notifications.cancelAllScheduledNotificationsAsync();
    const planned = [...reminders, ...(digest ? [digest] : []), ...assignments].slice(0, 48);
    for (const notice of planned) {
      await notifications.scheduleNotificationAsync({
        identifier: notice.id,
        content: { title: notice.title, body: notice.body },
        trigger: { type: notifications.SchedulableTriggerInputTypes.DATE, date: new Date(notice.fireAt) },
      });
    }
  } catch {
    /* les rappels restent optionnels */
  }
}

export { digestBody };
