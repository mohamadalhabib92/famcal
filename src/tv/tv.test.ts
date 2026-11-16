import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { upcomingReminders } from './board.ts';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

type ExpoConfig = {
  slug?: string;
  splash?: unknown;
  plugins?: unknown[];
  ios?: { bundleIdentifier?: string; buildNumber?: string; infoPlist?: Record<string, unknown>; entitlements?: Record<string, unknown> };
  extra?: { eas?: { projectId?: string } };
};

function loadConfig(tv: boolean): ExpoConfig {
  const previousTv = process.env.EXPO_TV;
  const previousBuild = process.env.EAS_BUILD;
  if (tv) process.env.EXPO_TV = '1';
  else delete process.env.EXPO_TV;
  delete process.env.FAMCAL_TV_EAS_PROJECT_ID;
  process.env.EAS_BUILD = 'true';
  const app = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8')) as { expo: ExpoConfig };
  const configure = require(join(root, 'app.config.js')) as (args: { config: ExpoConfig }) => ExpoConfig;
  const result = configure({ config: structuredClone(app.expo) });
  if (previousTv === undefined) delete process.env.EXPO_TV;
  else process.env.EXPO_TV = previousTv;
  if (previousBuild === undefined) delete process.env.EAS_BUILD;
  else process.env.EAS_BUILD = previousBuild;
  return result;
}

function pngSize(file: string): { width: number; height: number } {
  const buf = readFileSync(file);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe('Apple TV', () => {
  it('laisse l’iPhone sur le même bundle, le même build et le même projet', () => {
    const raw = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8')) as { expo: ExpoConfig };
    assert.equal(raw.expo.ios?.bundleIdentifier, 'ch.mohamadba.famcal');
    assert.equal(raw.expo.ios?.buildNumber, '1');
    assert.equal(raw.expo.slug, 'famcal');
    assert.equal(raw.expo.extra?.eas?.projectId, '8518b478-6bf6-4096-95b0-2b2d392c13f5');
    const phone = loadConfig(false);
    assert.equal(phone.ios?.buildNumber, '1');
    assert.equal(phone.slug, 'famcal');
    assert.equal(phone.extra?.eas?.projectId, '8518b478-6bf6-4096-95b0-2b2d392c13f5');
    assert.equal(phone.experiments === undefined || !('baseUrl' in (phone as { experiments?: object }).experiments!), true);
  });

  it('prépare un binaire tvOS 2, sans le projet iPhone et sans push', () => {
    const tv = loadConfig(true);
    assert.equal(tv.slug, 'famcal-tv');
    assert.equal(tv.ios?.bundleIdentifier, 'ch.mohamadba.famcal');
    assert.equal(tv.ios?.buildNumber, '2');
    assert.equal(tv.ios?.infoPlist?.CFBundleVersion, '2');
    assert.equal(tv.extra?.eas?.projectId, undefined);
    assert.equal(tv.splash, undefined);
    const names = (tv.plugins ?? []).map((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin));
    assert.deepEqual(names, ['expo-router', '@react-native-tvos/config-tv', './plugins/with-tv-pods.js', './plugins/withoutApsEnvironment.js']);
    assert.equal(names.includes('expo-notifications'), false);
    const eas = JSON.parse(readFileSync(join(root, 'eas.json'), 'utf8')) as {
      build: { production: { autoIncrement?: boolean; env?: { EXPO_TV?: string } }; 'production-tv': { autoIncrement: boolean; env: Record<string, string> } };
    };
    assert.equal(eas.build.production.env?.EXPO_TV, undefined);
    assert.equal(eas.build.production.autoIncrement, true);
    assert.equal(eas.build['production-tv'].autoIncrement, false);
    assert.equal(eas.build['production-tv'].env.EXPO_TV, '1');
    assert.equal(eas.build['production-tv'].env.EXPO_NO_CAPABILITY_SYNC, '1');
    assert.equal(eas.build['production-tv'].env.RCT_USE_PREBUILT_RNCORE, '0');
  });

  it('retire Link Preview et la barre d’outils du fournisseur de modules', () => {
    const { patchAppleModuleConfig, patchExpoRouterPodspecSource } = require(join(root, 'scripts/tv-native-patch.cjs')) as {
      patchAppleModuleConfig: (config: { apple: { modules: string[] } }, missing: Set<string>) => { apple: { modules: string[] } };
      patchExpoRouterPodspecSource: (src: string) => string;
    };
    const next = patchAppleModuleConfig(
      { apple: { modules: ['ExpoHeadModule', 'LinkPreviewNativeModule', 'RouterToolbarModule'] } },
      new Set(['LinkPreviewNativeModule', 'RouterToolbarModule']),
    );
    assert.deepEqual(next.apple.modules, ['ExpoHeadModule']);
    const pod = patchExpoRouterPodspecSource("s.platforms      = {\n    :ios => '16.4'\n  }\n  s.exclude_files = 'Tests/**/*'\n");
    assert.match(pod, /:tvos => '16.4'/);
    assert.match(pod, /LinkPreview\/\*\*\/\*/);
    assert.match(pod, /Toolbar\/\*\*\/\*/);
  });

  it('fixe tvOS 16.4 et la version 2 sur la cible, pas sur l’iPhone', () => {
    const { patchPodfileSource, TV_BUNDLE_VERSION } = require(join(root, 'plugins/with-tv-pods.js')) as {
      patchPodfileSource: (src: string) => string;
      TV_BUNDLE_VERSION: string;
    };
    assert.equal(TV_BUNDLE_VERSION, '2');
    const pod = patchPodfileSource("platform :ios, '15.1'\nuse_expo_modules!\npost_install do |installer|\nend\n");
    assert.match(pod, /platform :tvos, '16.4'/);
    assert.match(pod, /expo-notifications/);
    assert.match(pod, /RCT_USE_PREBUILT_RNCORE/);
    assert.match(pod, /TVOS_DEPLOYMENT_TARGET'\] = '16.4'/);
  });

  it('a le catalogue d’images exigé par la validation 90513', () => {
    const expected: Record<string, [number, number]> = {
      'icon-home-back.png': [400, 240],
      'icon-home-front.png': [400, 240],
      'icon-home-back@2x.png': [800, 480],
      'icon-home-front@2x.png': [800, 480],
      'icon-store-back.png': [1280, 768],
      'icon-store-front.png': [1280, 768],
      'top-shelf.png': [1920, 720],
      'top-shelf@2x.png': [3840, 1440],
      'top-shelf-wide.png': [2320, 720],
      'top-shelf-wide@2x.png': [4640, 1440],
    };
    for (const [name, [width, height]] of Object.entries(expected)) {
      const size = pngSize(join(root, 'assets/tv', name));
      assert.deepEqual(size, { width, height }, name);
    }
  });

  it('liste les rappels du salon sans envoi', () => {
    const from = new Date(2026, 10, 15, 8, 0, 0, 0).getTime();
    const rows = upcomingReminders(
      [
        {
          id: 'e',
          title: 'Musée',
          date: '2026-11-15',
          start: '15:00',
          durationMin: 60,
          repeat: 'none',
          memberIds: ['a'],
          createdBy: 'a',
          updatedAt: 1,
          reminderMinutes: [60],
        },
      ],
      from,
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.title, 'Musée');
    assert.equal(new Date(rows[0]!.fireAt).getHours(), 14);
  });
});
