import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

/**
 * Petit store persistant (AsyncStorage sur mobile, localStorage sur web).
 * Aucune dépendance réseau : tout le chemin "core" fonctionne hors ligne.
 *
 * Aucune écriture (setItem ou removeItem) tant que hydrate() n'a pas lu
 * le stockage avec succès. Sinon « Continuer hors ligne » ou une sauvegarde
 * pendant l'attente écrase les données déjà enregistrées par l'état vide.
 */
export type PersistedStore<T> = {
  get: () => T;
  set: (updater: T | ((prev: T) => T)) => void;
  use: () => T;
  useSelect: <S>(sel: (s: T) => S) => S;
  hydrate: () => Promise<void>;
  reset: () => Promise<void>;
  key: string;
};

export type StorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

export function createPersistedStore<T extends object>(key: string, initial: () => T, version = 1, storage: StorageLike = AsyncStorage): PersistedStore<T> {
  let state: T = initial();
  const listeners = new Set<() => void>();
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  const storageKey = `${key}@v${version}`;
  /** Lecture terminée : on peut écrire sans écraser un blob pas encore lu. */
  let durable = false;
  /** set() appelé avant la fin de la lecture. */
  let dirtyBeforeLoad = false;
  /** reset() demandé avant la fin de la lecture : on n'efface le disque qu'après. */
  let wipe = false;

  const emit = () => listeners.forEach((l) => l());
  const cancelSave = () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
  };
  const persist = () => {
    if (!durable || wipe) return;
    cancelSave();
    saveTimer = setTimeout(() => {
      saveTimer = null;
      if (!durable || wipe) return;
      storage.setItem(storageKey, JSON.stringify(state)).catch(() => {
        /* stockage indisponible : on garde l'état en mémoire */
      });
    }, 150);
  };
  const applyWipe = async () => {
    cancelSave();
    state = initial();
    dirtyBeforeLoad = false;
    wipe = true;
    durable = true;
    emit();
    try {
      await storage.removeItem(storageKey);
    } finally {
      wipe = false;
    }
  };
  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  };

  const store: PersistedStore<T> = {
    key: storageKey,
    get: () => state,
    set: (updater) => {
      state = typeof updater === 'function' ? (updater as (p: T) => T)(state) : updater;
      emit();
      if (!durable) {
        dirtyBeforeLoad = true;
        return;
      }
      persist();
    },
    use: () => useSyncExternalStore(subscribe, () => state, () => state),
    useSelect: <S,>(sel: (s: T) => S) => useSyncExternalStore(subscribe, () => sel(state), () => sel(state)),
    hydrate: async () => {
      if (durable && !wipe) return;
      const raw = await storage.getItem(storageKey);
      if (wipe) {
        await applyWipe();
        return;
      }
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as T;
          if (wipe) {
            await applyWipe();
            return;
          }
          state = { ...initial(), ...parsed };
          dirtyBeforeLoad = false;
        } catch {
          /* blob illisible : ne pas le remplacer par l'état vide */
          emit();
          return;
        }
      }
      if (wipe) {
        await applyWipe();
        return;
      }
      const hadEditsOnEmptyDisk = !raw && dirtyBeforeLoad;
      dirtyBeforeLoad = false;
      durable = true;
      emit();
      if (hadEditsOnEmptyDisk) persist();
    },
    reset: async () => {
      cancelSave();
      state = initial();
      dirtyBeforeLoad = false;
      wipe = true;
      emit();
      if (!durable) return;
      await applyWipe();
    },
  };
  return store;
}

/** Résout une promesse ou échoue après `ms` (évite les "Loading" infinis). */
export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

export function uid(prefix = ''): string {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
