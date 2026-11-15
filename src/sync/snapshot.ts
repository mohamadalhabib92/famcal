import { coalesce, dedupeRetained, mergeRecords, recordKey, type SyncRecord } from './merge';

export type Deletion = { entity: SyncRecord['entity']; id: string; updatedAt: number };

type Stamped = Record<string, unknown> & { id?: string; code?: string; createdAt?: number; updatedAt?: number };

export type Snap = {
  isDemo: boolean;
  updatedAt: number;
  family: (Stamped & { id: string; name: string; createdAt: number }) | null;
  members: Stamped[];
  links: Stamped[];
  events: Stamped[];
  invites: Stamped[];
  deletions?: Deletion[];
  outbox?: SyncRecord[];
  retained?: SyncRecord[];
};

function stable(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stable(item)).join(',')}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record)
    .filter((key) => key !== 'updatedAt')
    .sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stable(record[key])}`).join(',')}}`;
}

function asRecord(entity: SyncRecord['entity'], id: string, updatedAt: number, body: Stamped): SyncRecord {
  return { entity, id, updatedAt, deletedAt: null, body: { ...body } };
}

function liveId(entity: SyncRecord['entity'], row: Stamped): string {
  if (entity === 'invite') return String(row.code ?? row.id ?? '');
  return String(row.id ?? '');
}

function stampOf(row: Stamped, fallback: number): number {
  return typeof row.updatedAt === 'number' ? row.updatedAt : typeof row.createdAt === 'number' ? row.createdAt : fallback;
}

export function toRecords(state: Snap): SyncRecord[] {
  const rows: SyncRecord[] = [];
  if (state.family) rows.push(asRecord('family', state.family.id, stampOf(state.family, state.updatedAt), state.family));
  for (const member of state.members) rows.push(asRecord('member', liveId('member', member), stampOf(member, state.updatedAt), member));
  for (const link of state.links) rows.push(asRecord('link', liveId('link', link), stampOf(link, state.updatedAt), link));
  for (const event of state.events) rows.push(asRecord('event', liveId('event', event), stampOf(event, state.updatedAt), event));
  for (const invite of state.invites) rows.push(asRecord('invite', liveId('invite', invite), stampOf(invite, state.updatedAt), invite));
  const live = new Set(rows.map(recordKey));
  for (const deletion of state.deletions ?? []) {
    if (live.has(`${deletion.entity}:${deletion.id}`)) continue;
    rows.push({ entity: deletion.entity, id: deletion.id, updatedAt: deletion.updatedAt, deletedAt: deletion.updatedAt, body: { id: deletion.id } });
  }
  return rows;
}

function rowsOf(state: Snap, entity: SyncRecord['entity']): Stamped[] {
  if (entity === 'member') return state.members;
  if (entity === 'link') return state.links;
  if (entity === 'event') return state.events;
  if (entity === 'invite') return state.invites;
  return [];
}

/**
 * Compare deux documents locaux. Chaque entité modifiée ou supprimée devient une opération.
 * Le contenu perdu n'est pas écrasé : la suppression est un tombstone daté.
 */
type Loose = {
  isDemo: boolean;
  updatedAt: number;
  family: unknown;
  members: unknown[];
  links: unknown[];
  events: unknown[];
  invites: unknown[];
  deletions?: Deletion[];
  outbox?: SyncRecord[];
  retained?: SyncRecord[];
};

export function stampChanges<T extends Snap>(prev: T, next: T, now: number): { state: T; ops: SyncRecord[] } {
  const stamped: T = { ...next, updatedAt: now };
  if (next.isDemo) return { state: stamped, ops: [] };
  const ops: SyncRecord[] = [];
  const deletions = [...(next.deletions ?? [])].filter((deletion) => {
    if (deletion.entity === 'family') return !next.family || next.family.id !== deletion.id;
    return !rowsOf(next, deletion.entity).some((row) => liveId(deletion.entity, row) === deletion.id);
  });

  const consider = (entity: SyncRecord['entity'], before: Stamped | null, after: Stamped | null) => {
    if (!after && before) {
      const id = liveId(entity, before);
      const tomb: SyncRecord = { entity, id, updatedAt: now, deletedAt: now, body: { id } };
      ops.push(tomb);
      if (!deletions.some((deletion) => deletion.entity === entity && deletion.id === id)) deletions.push({ entity, id, updatedAt: now });
      return;
    }
    if (!after) return;
    const id = liveId(entity, after);
    const changed = !before || stable(before) !== stable(after);
    const updatedAt = changed ? Math.max(stampOf(after, 0), now) : stampOf(after, now);
    const body = { ...after, updatedAt };
    if (entity === 'family' && stamped.family) stamped.family = body as T['family'];
    if (changed || !before) ops.push(asRecord(entity, id, updatedAt, body));
    if (entity === 'member') stamped.members = stamped.members.map((row) => (liveId('member', row) === id ? body : row));
    if (entity === 'link') stamped.links = stamped.links.map((row) => (liveId('link', row) === id ? body : row));
    if (entity === 'event') stamped.events = stamped.events.map((row) => (liveId('event', row) === id ? body : row));
    if (entity === 'invite') stamped.invites = stamped.invites.map((row) => (liveId('invite', row) === id ? body : row));
  };

  const prevFamily = prev.family;
  const nextFamily = stamped.family;
  consider('family', prevFamily, nextFamily);
  for (const entity of ['member', 'link', 'event', 'invite'] as const) {
    const before = new Map(rowsOf(prev, entity).map((row) => [liveId(entity, row), row]));
    const after = new Map(rowsOf(stamped, entity).map((row) => [liveId(entity, row), row]));
    for (const [id, row] of after) consider(entity, before.get(id) ?? null, row);
    for (const [id, row] of before) if (!after.has(id)) consider(entity, row, null);
  }
  return { state: { ...stamped, deletions }, ops };
}

export function commitSnap<T extends Loose>(prev: T, next: T, now = Date.now()): T {
  const stamped = stampChanges(prev as unknown as Snap, next as unknown as Snap, now);
  return { ...stamped.state, outbox: coalesce((prev.outbox ?? []) as SyncRecord[], stamped.ops) } as T;
}

function group(records: SyncRecord[], entity: SyncRecord['entity']): SyncRecord[] {
  return records.filter((record) => record.entity === entity && record.deletedAt == null);
}

/** Applique un flux distant. Une ligne absente du flux n'est pas une suppression : seul deletedAt l'est. */
export function foldRemote<T extends Loose>(state: T, remote: SyncRecord[], revisions: SyncRecord[] = []): T {
  const merged = mergeRecords(toRecords(state as unknown as Snap), remote);
  const records = merged.records;
  const family = group(records, 'family')[0];
  const deletions: Deletion[] = records
    .filter((record) => record.deletedAt != null)
    .map((record) => ({ entity: record.entity, id: record.id, updatedAt: record.deletedAt as number }));
  return {
    ...state,
    family: family ? family.body : null,
    members: group(records, 'member').map((record) => record.body),
    links: group(records, 'link').map((record) => record.body),
    events: group(records, 'event').map((record) => record.body),
    invites: group(records, 'invite').map((record) => record.body),
    deletions,
    retained: dedupeRetained([...(state.retained ?? []), ...merged.retained, ...revisions]),
    updatedAt: Date.now(),
  } as T;
}

export function dropOutbox(queue: SyncRecord[], done: SyncRecord[]): SyncRecord[] {
  const finished = new Set(done.map((record) => `${recordKey(record)}:${record.updatedAt}`));
  return queue.filter((record) => !finished.has(`${recordKey(record)}:${record.updatedAt}`));
}
