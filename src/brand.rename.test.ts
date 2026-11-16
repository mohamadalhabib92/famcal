import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { ANDROID_PACKAGE, APP_NAME, EAS_PROJECT_ID, EXPO_SLUG, IOS_BUNDLE_ID, STORAGE_KEY, URL_SCHEME } from './brand.ts';
import { locales } from './locales/index.ts';
import { classifyFamCalValue, createPersistedStore, type StorageLike } from './kit/store.ts';
import { isoDay } from './kit/format.ts';

function memory(seed: Record<string, string>) {
  const data = new Map(Object.entries(seed));
  const writes: string[] = [];
  const storage: StorageLike = {
    async getItem(key) {
      return data.has(key) ? (data.get(key) as string) : null;
    },
    async setItem(key, value) {
      writes.push(key);
      data.set(key, value);
    },
    async removeItem(key) {
      writes.push(key);
      data.delete(key);
    },
  };
  return { data, writes, storage };
}

describe('renommage Familycal', () => {
  it('relit un agenda FamCal déjà enregistré sous famcal@v1', async () => {
    const legacy = {
      schemaVersion: 1,
      session: { email: 'camille@exemple.fr', method: 'otp', at: 10 },
      pendingOtp: null,
      family: { id: 'fam_martin', name: 'Famille Martin', createdAt: 10 },
      meId: 'mem_cam',
      members: [{ id: 'mem_cam', familyId: 'fam_martin', name: 'Camille', color: '#D9602E', role: 'tuteur', managed: false, createdAt: 10 }],
      links: [],
      events: [{ id: 'evt_ecole', familyId: 'fam_martin', title: 'École', date: '2026-11-15', start: '09:00', durationMin: 180, memberIds: ['mem_cam'], repeat: 'none', createdBy: 'mem_cam', updatedAt: 10, extra: { keep: true } }],
      invites: [],
      isDemo: false,
      onboarded: true,
      prefs: { view: 'semaine', hidden: [], cursor: '2026-11-15' },
      updatedAt: 10,
    };
    const saved = JSON.stringify(legacy);
    const box = memory({ 'famcal@v1': saved });
    const store = createPersistedStore(
      'famcal',
      () => ({
        schemaVersion: 1 as const,
        session: null,
        pendingOtp: null,
        family: null,
        meId: null,
        members: [] as unknown[],
        links: [] as unknown[],
        events: [] as unknown[],
        invites: [] as unknown[],
        isDemo: false,
        onboarded: false,
        prefs: { view: 'semaine' as const, hidden: [] as string[], cursor: isoDay(new Date()), busy: false, digest: true, digestHour: 7, appearance: 'system' as const, haptics: true },
        outbox: [] as unknown[],
        deletions: [] as unknown[],
        retained: [] as unknown[],
        updatedAt: 0,
      }),
      1,
      box.storage,
      { classify: classifyFamCalValue },
    );
    await store.hydrate();
    const loaded = store.get() as typeof legacy & { events: { title: string; extra: { keep: boolean } }[]; outbox: unknown[] };
    assert.equal(store.preservation().status, 'ready');
    assert.equal(store.key, STORAGE_KEY);
    assert.equal(loaded.family?.name, 'Famille Martin');
    assert.equal(loaded.events[0]?.title, 'École');
    assert.equal(loaded.events[0]?.extra.keep, true);
    assert.equal(loaded.members[0]?.name, 'Camille');
    assert.deepEqual(box.writes, []);
    assert.equal(box.data.get('famcal@v1'), saved);
  });

  it('change le nom affiché et garde les identifiants d’installation', () => {
    const app = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8')) as {
      expo: { name: string; slug: string; scheme: string; ios: { bundleIdentifier: string }; android: { package: string }; web: { name: string; shortName: string }; extra: { eas: { projectId: string } } };
    };
    const pwa = JSON.parse(readFileSync(new URL('../pwa.json', import.meta.url), 'utf8')) as { name: string; short_name: string };
    assert.equal(APP_NAME, 'Familycal');
    assert.equal(app.expo.name, 'Familycal');
    assert.equal(app.expo.web.name, 'Familycal');
    assert.equal(app.expo.web.shortName, 'Familycal');
    assert.equal(pwa.short_name, 'Familycal');
    assert.equal(app.expo.slug, EXPO_SLUG);
    assert.equal(app.expo.slug, 'famcal');
    assert.equal(app.expo.scheme, URL_SCHEME);
    assert.equal(app.expo.ios.bundleIdentifier, IOS_BUNDLE_ID);
    assert.equal(app.expo.ios.bundleIdentifier, 'ch.mohamadba.famcal');
    assert.equal(app.expo.android.package, ANDROID_PACKAGE);
    assert.equal(app.expo.android.package, 'ch.mohamadba.famcal');
    assert.equal(app.expo.extra.eas.projectId, EAS_PROJECT_ID);
    assert.equal(app.expo.extra.eas.projectId, '8518b478-6bf6-4096-95b0-2b2d392c13f5');
    assert.equal(STORAGE_KEY, 'famcal@v1');
    const keys = Object.keys(locales.fr);
    assert.deepEqual(Object.keys(locales.en), keys);
    for (const locale of Object.values(locales)) {
      assert.equal(locale.appName, 'Familycal');
      assert.equal(/FamCal/.test(locale.appName), false);
    }
  });
});
