import { useSyncExternalStore } from 'react';

/**
 * Services optionnels (sync cloud, SMS, Sentry…). Un échec, y compris HTTP 402,
 * ne remonte jamais sur le chemin agenda / membres / export.
 * Aucun appel n’est fait au démarrage.
 */
let down = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function optionalServiceDown() {
  return down;
}

export function markOptionalUnavailable() {
  if (down) return;
  down = true;
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useOptionalUnavailable() {
  return useSyncExternalStore(subscribe, optionalServiceDown, optionalServiceDown);
}

/** Exécute un appel optionnel. Toute erreur, 402 compris, affiche le badge et renvoie null. */
export async function runOptional<T>(task: () => Promise<T>): Promise<T | null> {
  try {
    return await task();
  } catch {
    markOptionalUnavailable();
    return null;
  }
}

/** À utiliser sur une réponse fetch optionnelle. true = exploitable. */
export function acceptOptionalResponse(status: number): boolean {
  if (status === 402 || status === 401 || status >= 500) {
    markOptionalUnavailable();
    return false;
  }
  return status >= 200 && status < 300;
}
