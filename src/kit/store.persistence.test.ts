import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createPersistedStore, type StorageLike } from './store.ts';

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
