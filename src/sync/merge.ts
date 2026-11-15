export type SyncRecord = {
  entity: 'family' | 'member' | 'link' | 'event' | 'invite';
  id: string;
  updatedAt: number;
  deletedAt: number | null;
  body: Record<string, unknown>;
};

export type MergeReason = 'only-local' | 'only-remote' | 'remote-newer' | 'local-newer' | 'tie-same' | 'tie-keep-local';

export type MergeOneResult = {
  winner: SyncRecord | null;
  retained: SyncRecord[];
  reason: MergeReason;
};

function stable(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stable(item)).join(',')}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stable(record[key])}`).join(',')}}`;
}

export function sameRecord(left: SyncRecord, right: SyncRecord): boolean {
  return left.entity === right.entity && left.id === right.id && left.updatedAt === right.updatedAt && left.deletedAt === right.deletedAt && stable(left.body) === stable(right.body);
}

/**
 * Dernier écrivain gagnant, selon updatedAt.
 * La version qui ne gagne pas est renvoyée dans retained dès que son contenu diffère.
 * À updatedAt égal et contenu différent, la copie locale reste gagnante et la copie distante est conservée.
 */
export function mergeOne(local: SyncRecord | null, remote: SyncRecord | null): MergeOneResult {
  if (!local && !remote) return { winner: null, retained: [], reason: 'tie-same' };
  if (!local && remote) return { winner: remote, retained: [], reason: 'only-remote' };
  if (local && !remote) return { winner: local, retained: [], reason: 'only-local' };
  if (!local || !remote) return { winner: null, retained: [], reason: 'tie-same' };
  const identical = sameRecord(local, remote);
  if (remote.updatedAt > local.updatedAt) {
    return { winner: remote, retained: identical ? [] : [local], reason: 'remote-newer' };
  }
  if (local.updatedAt > remote.updatedAt) {
    return { winner: local, retained: identical ? [] : [remote], reason: 'local-newer' };
  }
  if (identical) return { winner: local, retained: [], reason: 'tie-same' };
  return { winner: local, retained: [remote], reason: 'tie-keep-local' };
}

export function recordKey(record: SyncRecord): string {
  return `${record.entity}:${record.id}`;
}

export function mergeRecords(local: SyncRecord[], remote: SyncRecord[]): { records: SyncRecord[]; retained: SyncRecord[] } {
  const map = new Map<string, SyncRecord>();
  for (const record of local) map.set(recordKey(record), record);
  const retained: SyncRecord[] = [];
  const seen = new Set<string>();
  for (const record of remote) {
    const key = recordKey(record);
    seen.add(key);
    const merged = mergeOne(map.get(key) ?? null, record);
    if (merged.winner) map.set(key, merged.winner);
    else map.delete(key);
    retained.push(...merged.retained);
  }
  return { records: [...map.values()], retained };
}

/** File d'attente : une seule opération par entité, la plus récente. */
export function coalesce(queue: SyncRecord[], incoming: SyncRecord[]): SyncRecord[] {
  const map = new Map<string, SyncRecord>();
  for (const record of queue) map.set(recordKey(record), record);
  for (const record of incoming) {
    const key = recordKey(record);
    const current = map.get(key);
    if (!current || record.updatedAt >= current.updatedAt) map.set(key, record);
  }
  return [...map.values()];
}

export function retainedKey(record: SyncRecord): string {
  return `${recordKey(record)}:${record.updatedAt}:${record.deletedAt ?? ''}:${stable(record.body)}`;
}

export function dedupeRetained(records: SyncRecord[]): SyncRecord[] {
  const map = new Map<string, SyncRecord>();
  for (const record of records) map.set(retainedKey(record), record);
  return [...map.values()];
}
