import { useEffect, useState } from 'react';
import { AccessibilityInfo, Dimensions, PixelRatio } from 'react-native';

type TransparencyInfo = {
  isReduceTransparencyEnabled?: () => Promise<boolean>;
  addEventListener?: (event: string, cb: (value: boolean) => void) => { remove: () => void };
};

/** Dynamic Type : le texte natif est déjà mis à l’échelle. Ce facteur sert à lever la troncature. */
export function useFontScale(): number {
  const read = () => {
    const n = PixelRatio.getFontScale();
    return Number.isFinite(n) && n > 0 ? n : 1;
  };
  const [scale, setScale] = useState(read);
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', () => setScale(read()));
    return () => sub.remove();
  }, []);
  return scale;
}

export function useReduceTransparency(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let alive = true;
    const info = AccessibilityInfo as unknown as TransparencyInfo;
    info.isReduceTransparencyEnabled?.()
      .then((value) => {
        if (alive) setOn(!!value);
      })
      .catch(() => undefined);
    const sub = info.addEventListener?.('reduceTransparencyChanged', (value) => setOn(!!value));
    return () => {
      alive = false;
      sub?.remove();
    };
  }, []);
  return on;
}

export function announce(message: string) {
  try {
    AccessibilityInfo.announceForAccessibility(message);
  } catch {
    /* web ou lecteur absent */
  }
}
