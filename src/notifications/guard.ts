import { hostAllows } from '../lib/shell';

/**
 * Décide quels appels natifs de notification sont permis.
 * Le jeton push n’est jamais demandé : `registerForRemoteNotifications`
 * est une méthode void qui lève une NSException sans entitlement aps-environment.
 * Sur Mac, aucune notification locale n’est programmée.
 */

export const MAC_NOTIFICATION_MESSAGE = 'Sur Mac, aucune notification locale n’est programmée. Les rappels restent dans l’agenda.';

export type NotificationStep = 'read-permission' | 'request-permission' | 'schedule';

export function planNotificationWork(input: {
  platform: string;
  tv: boolean;
  mac?: boolean;
  appActive: boolean;
  available: boolean;
  permission: 'granted' | 'denied' | 'undetermined' | null;
  asked: boolean;
}): NotificationStep[] {
  if (!hostAllows('notifications', { mac: input.mac === true, tv: input.tv, web: input.platform === 'web' })) return [];
  if (!input.available || !input.appActive) return [];
  if (input.permission === null) return ['read-permission'];
  if (input.permission === 'granted') return ['read-permission', 'schedule'];
  if (input.permission === 'undetermined' && !input.asked) return ['read-permission', 'request-permission'];
  return ['read-permission'];
}
