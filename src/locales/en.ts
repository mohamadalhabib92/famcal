import type { LocaleKey } from './fr';

/** English strings. The product name stays Familycal in every locale. */
export const en: Record<LocaleKey, string> = {
  appName: 'Familycal',
  tagline: 'The shared family calendar — everyone sees the plans, and nothing is forgotten.',
  localMode: 'Local mode: agendas stay on this device. Family sync starts once Supabase is configured.',
  syncPending: 'Changes are waiting. They leave when sync answers.',
  calendarPermission:
    'Familycal can read the phone calendars you pick and, if you turn it on, copy its events into a device calendar. Nothing is read without your agreement. The family agenda works without this permission.',
  reminderDefault: 'Default reminders: 1 day before and 1 hour before.',
  digest: 'Each morning, a notification lists the day’s plans.',
  assignment: 'When an event you are on is created or changed, this device tells you.',
  privacyChild: 'A guardian sees children’s events. A child sees family-shared events, and their own.',
  busy: 'Who is busy',
  visibilityFamily: 'Whole family',
  visibilitySelected: 'Selected people',
  visibilityPrivate: 'Private',
  roleGuardian: 'Guardian',
  roleParent: 'Parent',
  roleMember: 'Member',
  roleChild: 'Child',
};
