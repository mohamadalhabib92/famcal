import { useEffect, useState } from 'react';

/**
 * L’écran diagnostic (variables d’environnement) n’est visible qu’en __DEV__
 * ou après le geste caché : 5 touches en moins de 2,5 s sur le titre « FamCal »
 * (écran de connexion) ou sur la ligne de version (Réglages).
 * Le déverrouillage reste en mémoire : il disparaît au rechargement.
 */
const WINDOW_MS = 2500;
const TAPS = 5;

let unlocked = false;
const listeners = new Set<() => void>();
const taps: number[] = [];

export function isDevBuild() {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

export function isConfigUnlocked() {
  return isDevBuild() || unlocked;
}

function emit() {
  listeners.forEach((l) => l());
}

/** Enregistre une touche du geste caché. Renvoie true quand le diagnostic s’ouvre. */
export function registerHiddenTap(): boolean {
  const now = Date.now();
  taps.push(now);
  while (taps.length && now - taps[0] > WINDOW_MS) taps.shift();
  if (taps.length < TAPS) return false;
  taps.length = 0;
  if (!unlocked) {
    unlocked = true;
    emit();
  }
  return true;
}

export function useConfigAccess() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return isConfigUnlocked();
}
