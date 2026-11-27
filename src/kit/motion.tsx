import { AccessibilityInfo, Platform, Vibration } from 'react-native';
import { useEffect, useState } from 'react';
import { isIosAppOnMac } from '@/lib/mac';
import { hostAllows } from '@/lib/shell';
import { store } from '@/state';

export const MAC_HAPTIC_MESSAGE = 'Pas de vibration sur Mac. Le réglage est conservé pour l’iPhone.';

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

/** Retour tactile court. Inactif sur le web, Apple TV et Mac, si le réglage est coupé, ou si l’API manque. */
export function haptic(kind: 'light' | 'success' | 'warn' = 'light') {
  if (!hostAllows('haptics', { mac: isIosAppOnMac(), tv: Platform.isTV === true, web: Platform.OS === 'web' })) return;
  if (store.get().prefs?.haptics === false) return;
  try {
    if (kind === 'warn') Vibration.vibrate([0, 18, 40, 18]);
    else if (kind === 'success') Vibration.vibrate(14);
    else Vibration.vibrate(8);
  } catch {
    /* optionnel */
  }
}
