import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { coalesce, mergeOne, mergeRecords, type SyncRecord } from './merge.ts';
import { RLS_CASES, caseLine, expectRead, expectWrite } from './rlsCases.ts';
import { commitSnap, foldRemote, toRecords, type Snap } from './snapshot.ts';

function event(id: string, updatedAt: number, title: string, extra: Record<string, unknown> = {}): SyncRecord {
  return { entity: 'event', id, updatedAt, deletedAt: null, body: { id, title, ...extra } };
}

function snap(events: SyncRecord[]): Snap {
  return {
    isDemo: false,
    updatedAt: 1,
    family: { id: 'fam', name: 'Martin', createdAt: 1 },
    members: [{ id: 'mem', name: 'Camille', createdAt: 1 }],
    links: [],
    events: events.filter((row) => row.deletedAt == null).map((row) => row.body),
    invites: [],
    deletions: events.filter((row) => row.deletedAt != null).map((row) => ({ entity: row.entity, id: row.id, updatedAt: row.updatedAt })),
    outbox: [],
    retained: [],
  };
}

describe('fusion dernier écrivain', () => {
  it('le plus récent gagne et l’autre version est conservée', () => {
    const local = event('e', 100, 'École', { note: 'locale' });
    const remote = event('e', 200, 'Musée', { note: 'distante' });
    const newerRemote = mergeOne(local, remote);
    assert.equal(newerRemote.reason, 'remote-newer');
    assert.equal(newerRemote.winner?.body.title, 'Musée');
    assert.equal(newerRemote.retained[0]?.body.title, 'École');

    const newerLocal = mergeOne(remote, local);
    assert.equal(newerLocal.reason, 'local-newer');
    assert.equal(newerLocal.winner?.body.title, 'Musée');
    assert.equal(newerLocal.retained[0]?.body.title, 'École');
  });

  it('à horodatage égal, garde le local et retient le distant', () => {
    const local = event('e', 50, 'Piano');
    const remote = event('e', 50, 'Piscine');
    const merged = mergeOne(local, remote);
    assert.equal(merged.reason, 'tie-keep-local');
    assert.equal(merged.winner?.body.title, 'Piano');
    assert.equal(merged.retained[0]?.body.title, 'Piscine');
    assert.equal(merged.retained.length, 1);
  });

  it('ne retient rien quand les deux copies sont identiques', () => {
    const row = event('e', 50, 'Piano');
    const merged = mergeOne(row, { ...row, body: { ...row.body } });
    assert.equal(merged.reason, 'tie-same');
    assert.deepEqual(merged.retained, []);
  });

  it('un tombstone plus récent retire l’événement sans jeter son contenu', () => {
    const local = event('e', 10, 'Dentiste');
    const tomb: SyncRecord = { entity: 'event', id: 'e', updatedAt: 20, deletedAt: 20, body: { id: 'e' } };
    const merged = mergeRecords([local], [tomb]);
    assert.equal(merged.records[0]?.deletedAt, 20);
    assert.equal(merged.retained[0]?.body.title, 'Dentiste');
  });

  it('une édition plus récente ressuscite l’événement et retient le tombstone', () => {
    const tomb: SyncRecord = { entity: 'event', id: 'e', updatedAt: 10, deletedAt: 10, body: { id: 'e' } };
    const remote = event('e', 30, 'Dentiste déplacé');
    const folded = foldRemote(snap([tomb]), [remote]);
    assert.equal(folded.events.length, 1);
    assert.equal(folded.events[0]?.title, 'Dentiste déplacé');
    assert.equal(folded.retained?.some((row) => row.deletedAt === 10), true);
  });

  it('une ligne absente du serveur n’efface pas l’agenda local', () => {
    const folded = foldRemote(snap([event('e', 5, 'Gardé')]), []);
    assert.equal(folded.events[0]?.title, 'Gardé');
    assert.deepEqual(folded.retained, []);
  });
});

describe('file locale', () => {
  it('fusionne deux éditions du même événement', () => {
    const queue = coalesce([event('e', 1, 'A')], [event('e', 2, 'B')]);
    assert.equal(queue.length, 1);
    assert.equal(queue[0]?.body.title, 'B');
  });

  it('n’empile pas une édition plus ancienne', () => {
    const queue = coalesce([event('e', 5, 'récent')], [event('e', 2, 'ancien')]);
    assert.equal(queue[0]?.body.title, 'récent');
  });

  it('met la suppression en file sans perdre les autres événements', () => {
    const prev = snap([event('a', 1, 'A'), event('b', 1, 'B')]);
    const next = snap([event('a', 1, 'A')]);
    const committed = commitSnap(prev, next, 9);
    assert.equal(committed.events.length, 1);
    assert.equal(committed.outbox?.some((row) => row.id === 'b' && row.deletedAt === 9), true);
    assert.equal(committed.deletions?.some((row) => row.id === 'b'), true);
    assert.equal(committed.events[0]?.title, 'A');
  });
});

describe('politiques RLS', () => {
  const sql = readFileSync(new URL('../../supabase/migrations/20261115120000_familycal_sync.sql', import.meta.url), 'utf8');

  it('exécute la matrice et la retrouve dans le SQL', () => {
    for (const row of RLS_CASES) {
      assert.equal(expectRead(row), row.read, row.id);
      assert.equal(expectWrite(row), row.write, row.id);
      assert.ok(sql.includes(caseLine(row)), row.id);
    }
  });

  it('ferme chaque table et n’ouvre pas l’accès anonyme', () => {
    const tables = [...sql.matchAll(/create table if not exists public\.(\w+)/g)].map((match) => match[1]);
    assert.ok(tables.length >= 5);
    for (const table of tables) {
      assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
      assert.match(sql, new RegExp(`alter table public\\.${table} force row level security`));
    }
    assert.equal(/to anon/i.test(sql), false);
    assert.equal(/using\s*\(\s*true\s*\)/i.test(sql), false);
    assert.match(sql, /revoke all on table public\.events from anon, public/);
    assert.match(sql, /auth\.uid\(\)/);
  });
});
