import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useReduceMotion } from '@/kit/motion';
import { rescheduleNotifications } from '@/notifications/run';
import { runBackgroundSync } from '@/sync/backend';
import { store } from '@/state';

/** Synchronisation et rappels, après le premier rendu. Sans backend, rien n'est envoyé. */
export function FamilyServices() {
  const updatedAt = store.useSelect((s) => s.updatedAt);
  const digest = store.useSelect((s) => s.prefs.digest);
  const hour = store.useSelect((s) => s.prefs.digestHour);
  const meId = store.useSelect((s) => s.meId);
  const reduce = useReduceMotion();
  useEffect(() => {
    const timer = setTimeout(() => {
      void runBackgroundSync();
      if (!Platform.isTV) void rescheduleNotifications();
    }, reduce ? 0 : 500);
    return () => clearTimeout(timer);
  }, [updatedAt, digest, hour, meId, reduce]);
  return null;
}
