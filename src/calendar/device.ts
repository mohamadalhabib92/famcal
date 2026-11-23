import { Platform } from 'react-native';
import { strings } from '@/locales';
import { mapDeviceEvent, toDeviceWrite, type DeviceCalendarEvent } from './map';
import { importMapped, store, type CalEvent } from '@/state';

type CalendarModule = {
  requestCalendarPermissionsAsync: () => Promise<{ status: string }>;
  getCalendarsAsync: (type: string) => Promise<{ id: string; title: string; allowsModifications?: boolean }[]>;
  getEventsAsync: (ids: string[], start: Date, end: Date) => Promise<DeviceCalendarEvent[]>;
  createEventAsync: (calendarId: string, details: ReturnType<typeof toDeviceWrite>) => Promise<string>;
  EntityTypes: { EVENT: string };
};

async function loadCalendar(): Promise<CalendarModule | null> {
  if (Platform.OS === 'web') return null;
  try {
    const specifier = 'expo-calendar';
    return (await import(specifier)) as CalendarModule;
  } catch {
    return null;
  }
}

export const calendarPermissionCopy = strings.calendarPermission;

export async function importDeviceCalendars(): Promise<{ status: 'imported' | 'denied' | 'unavailable' | 'empty'; count: number; keptLocal: number; message: string }> {
  if (Platform.isTV) return { status: 'unavailable', count: 0, keptLocal: 0, message: 'Le salon affiche Familycal. Le calendrier du téléphone reste sur iPhone.' };
  const calendar = await loadCalendar();
  if (!calendar || typeof calendar.requestCalendarPermissionsAsync !== 'function') {
    return { status: 'unavailable', count: 0, keptLocal: 0, message: 'Le calendrier du téléphone est disponible sur iOS et Android.' };
  }
  try {
    const permission = await calendar.requestCalendarPermissionsAsync();
    if (permission.status !== 'granted') return { status: 'denied', count: 0, keptLocal: 0, message: 'Accès refusé. Familycal continue sans lire le téléphone.' };
    const calendars = await calendar.getCalendarsAsync(calendar.EntityTypes.EVENT);
    if (calendars.length === 0) return { status: 'empty', count: 0, keptLocal: 0, message: 'Aucun agenda trouvé sur cet appareil.' };
    const start = new Date();
    start.setDate(start.getDate() - 7);
    const end = new Date();
    end.setDate(end.getDate() + 60);
    const raw = await calendar.getEventsAsync(calendars.map((item) => item.id), start, end);
    const state = store.get();
    if (!state.family || !state.meId) return { status: 'empty', count: 0, keptLocal: 0, message: 'Créez d’abord un foyer.' };
    const mapped = raw.map((event) => mapDeviceEvent(event, { familyId: state.family!.id, memberId: state.meId!, updatedAt: Date.now() }));
    const result = importMapped(mapped as unknown as CalEvent[]);
    return { status: 'imported', count: result.applied, keptLocal: result.keptLocal, message: `${result.applied} événement(s) importés. ${result.keptLocal} version(s) locale(s) plus récentes conservées.` };
  } catch {
    return { status: 'unavailable', count: 0, keptLocal: 0, message: 'Le calendrier du téléphone n’a pas répondu. Familycal continue avec l’agenda déjà enregistré.' };
  }
}

export async function mirrorToDevice(event: CalEvent, calendarId: string): Promise<'written' | 'unavailable' | 'denied'> {
  if (Platform.isTV) return 'unavailable';
  const calendar = await loadCalendar();
  if (!calendar) return 'unavailable';
  try {
    const permission = await calendar.requestCalendarPermissionsAsync();
    if (permission.status !== 'granted') return 'denied';
    await calendar.createEventAsync(calendarId, toDeviceWrite(event));
    return 'written';
  } catch {
    return 'unavailable';
  }
}
