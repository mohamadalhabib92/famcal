import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { classifyFamCalValue, createPersistedStore, mergePreservingUnknown, type StorageLike } from './store.ts';

type Box = {
  data: Map<string, string>;
  writes: { op: 'set' | 'remove'; key: string; value?: string }[];
  storage: StorageLike;
  gate: Promise<void>;
  release: () => void;
};

function memory(seed: Record<string, string> = {}): Box {
  const data = new Map(Object.entries(seed));
  const writes: Box['writes'] = [];
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const storage: StorageLike = {
    async getItem(key) {
      await gate;
      return data.has(key) ? (data.get(key) as string) : null;
    },
    async setItem(key, value) {
      writes.push({ op: 'set', key, value });
      data.set(key, value);
    },
    async removeItem(key) {
      writes.push({ op: 'remove', key });
      data.delete(key);
    },
  };
  return { data, writes, storage, gate, release };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('persistance avant hydrate', () => {
  it('n’écrit pas l’état vide si set() arrive avant la lecture', async () => {
    const saved = JSON.stringify({ name: 'Famille Martin', events: [1] });
    const box = memory({ 'famcal@v1': saved });
    const store = createPersistedStore('famcal', () => ({ name: '', events: [] as number[] }), 1, box.storage);

    store.set({ name: '', events: [] });
    await wait(200);

    assert.deepEqual(box.writes, []);
    assert.equal(box.data.get('famcal@v1'), saved);

    box.release();
    await store.hydrate();

    assert.deepEqual(store.get(), { name: 'Famille Martin', events: [1] });
    assert.equal(box.data.get('famcal@v1'), saved);
    assert.deepEqual(box.writes, []);
  });

  it('ignore une sauvegarde pendant une lecture lente, puis recharge le disque', async () => {
    const saved = JSON.stringify({ title: 'École' });
    const box = memory({ 'famcal@v1': saved });
    const store = createPersistedStore('famcal', () => ({ title: '' }), 1, box.storage);
    const pending = store.hydrate();

    store.set({ title: '' });
    await wait(200);
    assert.deepEqual(box.writes, []);
    assert.equal(box.data.get('famcal@v1'), saved);

    box.release();
    await pending;

    assert.equal(store.get().title, 'École');
    assert.equal(box.data.get('famcal@v1'), saved);
  });

  it('écrit après une lecture réussie, et reset efface sans course avec le debounce', async () => {
    const box = memory();
    box.release();
    const store = createPersistedStore('famcal', () => ({ n: 0 }), 1, box.storage);
    await store.hydrate();

    store.set({ n: 2 });
    await wait(200);
    assert.equal(box.data.get('famcal@v1'), JSON.stringify({ n: 2 }));

    store.set({ n: 3 });
    await store.reset();
    await wait(200);
    assert.equal(box.data.has('famcal@v1'), false);
    assert.equal(box.writes.filter((w) => w.op === 'set' && w.value === JSON.stringify({ n: 0 })).length, 0);
  });

  it('reset avant la lecture n’efface pas le blob, puis la lecture applique l’effacement', async () => {
    const saved = JSON.stringify({ name: 'Gardé' });
    const box = memory({ 'famcal@v1': saved });
    const store = createPersistedStore('famcal', () => ({ name: '' }), 1, box.storage);
    const pending = store.hydrate();

    await store.reset();
    assert.equal(box.data.get('famcal@v1'), saved);
    assert.equal(box.writes.some((w) => w.op === 'remove'), false);

    box.release();
    await pending;

    assert.equal(store.get().name, '');
    assert.equal(box.data.has('famcal@v1'), false);
  });
});

describe('quarantaine et champs inconnus', () => {
  it('garde les octets illisibles, les exporte, et ignore set/reset', async () => {
    const saved = '{"events": "coupé';
    const box = memory({ 'famcal@v1': saved });
    box.release();
    const store = createPersistedStore('famcal', () => ({ name: '', events: [] as number[] }), 1, box.storage);
    await store.hydrate();

    assert.equal(store.preservation().status, 'quarantined');
    assert.equal(store.preservation().reason, 'malformed-json');
    assert.equal(store.preservation().capturedOriginal, saved);
    assert.deepEqual(store.get(), { name: '', events: [] });
    assert.deepEqual(box.writes, []);

    store.set({ name: 'nouvelle', events: [9] });
    await store.reset();
    await wait(200);

    assert.equal(box.data.get('famcal@v1'), saved);
    assert.deepEqual(box.writes, []);
    const envelope = JSON.parse(store.exportEnvelope()) as {
      kind: string;
      status: string;
      capturedOriginal: string;
      interpreted?: unknown;
      disclaimer: string;
    };
    assert.equal(envelope.kind, 'preservation-envelope');
    assert.equal(envelope.status, 'quarantined');
    assert.equal(envelope.capturedOriginal, saved);
    assert.equal('interpreted' in envelope, false);
    assert.match(envelope.disclaimer, /pas une sauvegarde restaurée/);
  });

  it('ne réécrit pas un schemaVersion futur, même si reset part pendant la lecture', async () => {
    const saved = JSON.stringify({ schemaVersion: 2, payload: 'keep-me', events: { hidden: true } });
    const box = memory({ 'famcal@v1': saved });
    const store = createPersistedStore('famcal', () => ({ schemaVersion: 1 as const, n: 0 }), 1, box.storage);
    const pending = store.hydrate();
    await store.reset();
    box.release();
    await pending;
    await wait(200);

    assert.equal(store.preservation().reason, 'future-schema');
    assert.equal(box.data.get('famcal@v1'), saved);
    assert.equal(box.writes.some((w) => w.op === 'remove' || w.op === 'set'), false);
    const envelope = JSON.parse(store.exportEnvelope()) as { capturedOriginal: string; interpreted?: unknown };
    assert.equal(envelope.capturedOriginal, saved);
    assert.equal('interpreted' in envelope, false);
  });

  it('quarantaine une forme FamCal incompatible sans effacer les champs futurs', async () => {
    const saved = JSON.stringify({ schemaVersion: 1, events: 'pas-un-tableau', note: 'garder' });
    const box = memory({ 'famcal@v1': saved });
    box.release();
    const store = createPersistedStore('famcal', () => ({ schemaVersion: 1 as const, events: [] as unknown[] }), 1, box.storage, {
      classify: classifyFamCalValue,
    });
    await store.hydrate();
    store.set((s) => ({ ...s, events: [{ id: 'x' }] }));
    await wait(200);

    assert.equal(store.preservation().reason, 'incompatible-shape');
    assert.equal(box.data.get('famcal@v1'), saved);
    assert.deepEqual(box.writes, []);
  });

  it('relit un document v1 ou hérité et conserve les clés inconnues au prochain enregistrement', async () => {
    const saved = JSON.stringify({
      name: 'Famille Martin',
      events: [{ id: 'e1', title: 'École', extra: { hijri: true } }],
      futureNote: 'ne-pas-jeter',
    });
    const box = memory({ 'famcal@v1': saved });
    box.release();
    const store = createPersistedStore(
      'famcal',
      () => ({ schemaVersion: 1 as const, name: '', events: [] as { id: string }[], prefs: { view: 'semaine', hidden: [] as string[] } }),
      1,
      box.storage,
      { classify: classifyFamCalValue },
    );
    await store.hydrate();

    assert.equal(store.preservation().status, 'ready');
    assert.equal(box.data.get('famcal@v1'), saved);
    assert.deepEqual(box.writes, []);
    const loaded = store.get() as {
      schemaVersion: number;
      name: string;
      futureNote: string;
      events: { id: string; extra: { hijri: boolean } }[];
      prefs: { view: string; hidden: string[] };
    };
    assert.equal(loaded.schemaVersion, 1);
    assert.equal(loaded.futureNote, 'ne-pas-jeter');
    assert.deepEqual(loaded.events[0].extra, { hijri: true });
    assert.deepEqual(loaded.prefs.hidden, []);

    store.set((s) => ({ ...s, name: 'Famille Martin' }));
    await wait(200);
    const written = JSON.parse(box.data.get('famcal@v1') as string) as {
      futureNote: string;
      events: { extra: { hijri: boolean } }[];
      schemaVersion: number;
      prefs: { hidden: string[] };
    };
    assert.equal(written.futureNote, 'ne-pas-jeter');
    assert.deepEqual(written.events[0].extra, { hijri: true });
    assert.equal(written.schemaVersion, 1);
    assert.deepEqual(written.prefs.hidden, []);

    const envelope = JSON.parse(store.exportEnvelope()) as { status: string; capturedOriginal: string; interpreted: { futureNote: string } };
    assert.equal(envelope.status, 'ready');
    assert.equal(envelope.capturedOriginal, saved);
    assert.equal(envelope.interpreted.futureNote, 'ne-pas-jeter');
  });

  it('ne remplace pas la clé si la lecture échoue', async () => {
    const saved = JSON.stringify({ name: 'encore là' });
    const box = memory({ 'famcal@v1': saved });
    box.release();
    box.storage.getItem = async () => {
      throw new Error('io');
    };
    const store = createPersistedStore('famcal', () => ({ name: '' }), 1, box.storage);
    await store.hydrate();
    store.set({ name: 'vide' });
    await wait(200);
    assert.equal(store.preservation().status, 'pending');
    assert.equal(box.data.get('famcal@v1'), saved);
    assert.deepEqual(box.writes, []);
  });

  it('fusionne les objets connus sans copier __proto__', () => {
    const parsed = JSON.parse('{"prefs":{"view":"mois","laterFlag":true},"__proto__":{"polluted":true}}') as Record<string, unknown>;
    const merged = mergePreservingUnknown({ prefs: { view: 'semaine', hidden: [] as string[] } }, parsed) as {
      prefs: { view: string; hidden: string[]; laterFlag?: boolean };
    };
    assert.equal(merged.prefs.view, 'mois');
    assert.deepEqual(merged.prefs.hidden, []);
    assert.equal(merged.prefs.laterFlag, true);
    assert.equal(({} as { polluted?: boolean }).polluted, undefined);
    assert.equal(Object.hasOwn(merged, '__proto__'), false);
  });
});
