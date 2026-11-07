import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

/**
 * Préservation locale du blob. Pas de migration, pas de restauration, pas de serveur.
 * L'enveloppe d'export recopie les octets lus : ce n'est pas une sauvegarde restaurée.
 */
export const FAMCAL_SCHEMA_VERSION = 1;
export const PRESERVATION_EXPORT_VERSION = 1;

export type QuarantineReason = 'malformed-json' | 'future-schema' | 'incompatible-shape';
export type PreservationStatus = 'pending' | 'empty' | 'ready' | 'quarantined';

export type PreservationView = {
  storageKey: string;
  status: PreservationStatus;
  reason: QuarantineReason | null;
  /** Octets exacts lus sur la clé. Null si la clé est absente ou pas encore lue. */
  capturedOriginal: string | null;
};

export type ClassifyResult = { ok: true } | { ok: false; reason: Exclude<QuarantineReason, 'malformed-json'> };

const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** Complète les champs connus manquants sans retirer les clés inconnues. Les tableaux restent intacts. */
export function mergePreservingUnknown<T extends object>(base: T, parsed: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    out[key] = value;
  }
  for (const [key, value] of Object.entries(base as Record<string, unknown>)) {
    if (!(key in out)) {
      out[key] = value;
      continue;
    }
    if (isPlainObject(value) && isPlainObject(out[key])) {
      out[key] = mergePreservingUnknown(value, out[key] as Record<string, unknown>);
    }
  }
  return out as T;
}

/** Version absente ou 1 : document compris. Toute autre valeur de schemaVersion est future. */
export function classifySchemaValue(value: unknown): ClassifyResult {
  if (!isPlainObject(value)) return { ok: false, reason: 'incompatible-shape' };
  if ('schemaVersion' in value && value.schemaVersion !== FAMCAL_SCHEMA_VERSION) {
    return { ok: false, reason: 'future-schema' };
  }
  return { ok: true };
}

/** Conteneurs FamCal uniquement. Un champ inconnu dans un événement n'est pas retiré. */
export function classifyFamCalValue(value: unknown): ClassifyResult {
  const schema = classifySchemaValue(value);
  if (!schema.ok) return schema;
  const record = value as Record<string, unknown>;
  for (const key of ['members', 'events', 'invites', 'links'] as const) {
    if (key in record && !Array.isArray(record[key])) return { ok: false, reason: 'incompatible-shape' };
  }
  if ('family' in record && record.family !== null && !isPlainObject(record.family)) return { ok: false, reason: 'incompatible-shape' };
  if ('session' in record && record.session !== null && !isPlainObject(record.session)) return { ok: false, reason: 'incompatible-shape' };
  if ('pendingOtp' in record && record.pendingOtp !== null && !isPlainObject(record.pendingOtp)) {
    return { ok: false, reason: 'incompatible-shape' };
  }
  if ('prefs' in record && !isPlainObject(record.prefs)) return { ok: false, reason: 'incompatible-shape' };
  return { ok: true };
}

export function buildPreservationEnvelope(input: PreservationView & { interpreted: unknown | null }): string {
  const body: Record<string, unknown> = {
    famcalExport: PRESERVATION_EXPORT_VERSION,
    kind: 'preservation-envelope',
    storageKey: input.storageKey,
    status: input.status,
    reason: input.reason,
    capturedOriginal: input.capturedOriginal,
    disclaimer:
      "Export de préservation locale. Ce n'est pas une sauvegarde restaurée, ni une répétition snapshot/restore, ni une copie serveur. capturedOriginal reprend les octets lus, sans migration.",
  };
  if (input.status === 'ready') body.interpreted = input.interpreted;
  return JSON.stringify(body);
}

/**
 * Petit store persistant (AsyncStorage sur mobile, localStorage sur web).
 * Aucune dépendance réseau : tout le chemin "core" fonctionne hors ligne.
 *
 * Aucune écriture (setItem ou removeItem) tant que hydrate() n'a pas lu
 * le stockage avec succès. Sinon « Continuer hors ligne » ou une sauvegarde
 * pendant l'attente écrase les données déjà enregistrées par l'état vide.
 */
export type PersistOptions = {
  /** Contrôles supplémentaires après le contrôle de version. Ne doit pas réécrire le stockage. */
  classify?: (value: unknown) => ClassifyResult;
};

export type PersistedStore<T> = {
  get: () => T;
  set: (updater: T | ((prev: T) => T)) => void;
  use: () => T;
  useSelect: <S>(sel: (s: T) => S) => S;
  hydrate: () => Promise<void>;
  reset: () => Promise<void>;
  /** État de lecture. Ne déclenche aucune écriture. */
  preservation: () => PreservationView;
  /**
   * JSON valide qui embarque les octets d'origine.
   * Ce n'est pas une sauvegarde restaurée.
   */
  exportEnvelope: () => string;
  key: string;
};

export type StorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

export function createPersistedStore<T extends object>(
  key: string,
  initial: () => T,
  version = 1,
  storage: StorageLike = AsyncStorage,
  options?: PersistOptions,
): PersistedStore<T> {
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
  /**
   * Blob illisible, forme incompatible ou schemaVersion différente de 1.
   * Aucune écriture ni suppression de la clé tant que le processus vit.
   */
  let sealed = false;
  let preservationStatus: PreservationView['status'] = 'pending';
  let preservationReason: QuarantineReason | null = null;
  let capturedOriginal: string | null = null;

  const view = (): PreservationView => ({
    storageKey,
    status: preservationStatus,
    reason: preservationReason,
    capturedOriginal,
  });

  const inspect = (raw: string): { ok: true; value: Record<string, unknown> } | { ok: false; reason: QuarantineReason } => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, reason: 'malformed-json' };
    }
    const schema = classifySchemaValue(parsed);
    if (!schema.ok) return schema;
    const extra = options?.classify?.(parsed);
    if (extra && !extra.ok) return extra;
    return { ok: true, value: parsed as Record<string, unknown> };
  };

  const quarantine = (raw: string, reason: QuarantineReason) => {
    cancelSave();
    state = initial();
    sealed = true;
    wipe = false;
    dirtyBeforeLoad = false;
    durable = false;
    capturedOriginal = raw;
    preservationReason = reason;
    preservationStatus = 'quarantined';
    emit();
  };

  const emit = () => listeners.forEach((l) => l());
  const cancelSave = () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
  };
  const persist = () => {
    if (sealed || !durable || wipe) return;
    cancelSave();
    saveTimer = setTimeout(() => {
      saveTimer = null;
      if (sealed || !durable || wipe) return;
      storage.setItem(storageKey, JSON.stringify(state)).catch(() => {
        /* stockage indisponible : on garde l'état en mémoire */
      });
    }, 150);
  };
  const applyWipe = async () => {
    if (sealed) {
      wipe = false;
      return;
    }
    cancelSave();
    state = initial();
    dirtyBeforeLoad = false;
    wipe = true;
    durable = true;
    capturedOriginal = null;
    preservationReason = null;
    preservationStatus = 'empty';
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
    preservation: () => view(),
    exportEnvelope: () =>
      buildPreservationEnvelope({
        ...view(),
        interpreted: preservationStatus === 'ready' ? JSON.parse(JSON.stringify(state)) : null,
      }),
    set: (updater) => {
      if (sealed) return;
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
      if (sealed) return;
      if (durable && !wipe) return;
      let raw: string | null;
      try {
        raw = await storage.getItem(storageKey);
      } catch {
        /* lecture impossible : ne rien écrire */
        emit();
        return;
      }
      if (sealed) return;
      if (raw) {
        const decision = inspect(raw);
        if (!decision.ok) {
          quarantine(raw, decision.reason);
          return;
        }
        if (wipe) {
          await applyWipe();
          return;
        }
        state = mergePreservingUnknown(initial(), decision.value);
        capturedOriginal = raw;
        preservationReason = null;
        preservationStatus = 'ready';
        dirtyBeforeLoad = false;
      }
      if (wipe) {
        await applyWipe();
        return;
      }
      const hadEditsOnEmptyDisk = !raw && dirtyBeforeLoad;
      dirtyBeforeLoad = false;
      durable = true;
      if (!raw) {
        capturedOriginal = null;
        preservationReason = null;
        preservationStatus = hadEditsOnEmptyDisk ? 'ready' : 'empty';
      }
      emit();
      if (hadEditsOnEmptyDisk) persist();
    },
    reset: async () => {
      cancelSave();
      if (sealed) {
        state = initial();
        dirtyBeforeLoad = false;
        wipe = false;
        emit();
        return;
      }
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
