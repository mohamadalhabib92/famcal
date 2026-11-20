import { AccessibilityInfo, Platform, Vibration } from 'react-native';
import { useEffect, useState } from 'react';
import { store } from '@/state';

export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (alive) setReduce(value);
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

/** Retour tactile court. Inactif sur le web, si le réglage est coupé, ou si l’API manque. */
export function haptic(kind: 'light' | 'success' | 'warn' = 'light') {
  if (Platform.OS === 'web' || Platform.isTV) return;
  if (store.get().prefs?.haptics === false) return;
  try {
    if (kind === 'warn') Vibration.vibrate([0, 18, 40, 18]);
    else if (kind === 'success') Vibration.vibrate(14);
    else Vibration.vibrate(8);
  } catch {
    /* optionnel */
  }
}
