/**
 * Décide quels appels natifs de notification sont permis.
 * Le jeton push n’est jamais demandé : `registerForRemoteNotifications`
 * est une méthode void qui lève une NSException sans entitlement aps-environment.
 */

export type NotificationStep = 'read-permission' | 'request-permission' | 'schedule';

export function planNotificationWork(input: {
  platform: string;
  tv: boolean;
  appActive: boolean;
  available: boolean;
  permission: 'granted' | 'denied' | 'undetermined' | null;
  asked: boolean;
}): NotificationStep[] {
  if (input.tv || input.platform === 'web' || !input.available || !input.appActive) return [];
  if (input.permission === null) return ['read-permission'];
  if (input.permission === 'granted') return ['read-permission', 'schedule'];
  if (input.permission === 'undetermined' && !input.asked) return ['read-permission', 'request-permission'];
  return ['read-permission'];
}
