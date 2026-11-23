import { AppState, Platform } from 'react-native';
import { planNotificationWork } from '@/notifications/guard';
import { assignmentAlerts, digestBody, planDigest, planReminderNotices, type ReminderEvent } from '@/domain/reminders';
import { eventVisibility, me, store, type CalEvent } from '@/state';

type PermissionsModule = {
  getPermissionsAsync?: () => Promise<{ status?: string }>;
  requestPermissionsAsync?: () => Promise<{ status?: string }>;
};

type CancelModule = {
  cancelAllScheduledNotificationsAsync?: () => Promise<void>;
};

type ScheduleModule = {
  scheduleNotificationAsync?: (request: { identifier: string; content: { title: string; body: string }; trigger: { type: 'date'; date: Date } }) => Promise<string>;
};

let asked = false;

async function loadLocalNotifications(): Promise<{ permissions: PermissionsModule; cancel: CancelModule; schedule: ScheduleModule } | null> {
  if (Platform.OS === 'web' || Platform.isTV) return null;
  try {
    const [permissions, cancel, schedule] = await Promise.all([
      import('expo-notifications/build/NotificationPermissions'),
      import('expo-notifications/build/cancelAllScheduledNotificationsAsync'),
      import('expo-notifications/build/scheduleNotificationAsync'),
    ]);
    return {
      permissions: permissions as PermissionsModule,
      cancel: cancel as CancelModule,
      schedule: schedule as ScheduleModule,
    };
  } catch {
    return null;
  }
}

async function nativeCall<T>(fn: (() => Promise<T>) | undefined): Promise<T | undefined> {
  if (typeof fn !== 'function') return undefined;
  try {
    return await fn();
  } catch {
    return undefined;
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
  const active = AppState.currentState === 'active';
  const preview = planNotificationWork({
    platform: Platform.OS,
    tv: Platform.isTV,
    appActive: active,
    available: true,
    permission: null,
    asked,
  });
  if (!preview.includes('read-permission')) return;
  const state = store.get();
  if (!state.family || !state.onboarded) return;
  const viewer = me(state);
  if (!viewer) return;
  const modules = await loadLocalNotifications();
  const readable = typeof modules?.permissions.getPermissionsAsync === 'function';
  const steps = planNotificationWork({
    platform: Platform.OS,
    tv: Platform.isTV,
    appActive: active,
    available: readable,
    permission: null,
    asked,
  });
  if (!modules || !steps.includes('read-permission')) return;
  const existing = await nativeCall(modules.permissions.getPermissionsAsync);
  if (!existing) return;
  let status: 'granted' | 'denied' | 'undetermined' = existing.status === 'granted' || existing.status === 'denied' ? existing.status : 'undetermined';
  const afterRead = planNotificationWork({
    platform: Platform.OS,
    tv: Platform.isTV,
    appActive: active,
    available: true,
    permission: status,
    asked,
  });
  if (afterRead.includes('request-permission')) {
    asked = true;
    const next = await nativeCall(modules.permissions.requestPermissionsAsync);
    if (next?.status === 'granted' || next?.status === 'denied' || next?.status === 'undetermined') status = next.status;
  }
  if (status !== 'granted') return;
  const scheduled = planNotificationWork({
    platform: Platform.OS,
    tv: Platform.isTV,
    appActive: active,
    available: typeof modules.cancel.cancelAllScheduledNotificationsAsync === 'function' && typeof modules.schedule.scheduleNotificationAsync === 'function',
    permission: 'granted',
    asked,
  });
  if (!scheduled.includes('schedule')) return;
  try {
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
    await modules.cancel.cancelAllScheduledNotificationsAsync?.();
    const planned = [...reminders, ...(digest ? [digest] : []), ...assignments].slice(0, 48);
    for (const notice of planned) {
      await modules.schedule.scheduleNotificationAsync?.({
        identifier: notice.id,
        content: { title: notice.title, body: notice.body },
        trigger: { type: 'date', date: new Date(notice.fireAt) },
      });
    }
  } catch {
    /* les rappels restent optionnels */
  }
}

export { digestBody };
