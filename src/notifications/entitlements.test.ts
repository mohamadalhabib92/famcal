import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { getConfig } from '@expo/config';
import { compileModsAsync } from '@expo/config-plugins';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const strip = require(join(root, 'plugins/withoutApsEnvironment.js')) as (config: {
  name: string;
  slug: string;
  ios: { bundleIdentifier: string; entitlements: Record<string, string> };
}) => {
  name: string;
  slug: string;
  ios: { bundleIdentifier: string; entitlements: Record<string, string> };
};

describe('entitlements iOS', () => {
  it('retire aps-environment même s’il est déjà demandé', async () => {
    const config = strip({
      name: 'Familycal',
      slug: 'famcal',
      ios: {
        bundleIdentifier: 'ch.mohamadba.famcal',
        entitlements: { 'aps-environment': 'production' },
      },
    });
    const evaluated = await compileModsAsync(config, {
      projectRoot: root,
      introspect: true,
      platforms: ['ios'],
    });
    assert.equal(evaluated.ios?.bundleIdentifier, 'ch.mohamadba.famcal');
    assert.equal(Object.hasOwn(evaluated.ios?.entitlements ?? {}, 'aps-environment'), false);
  });

  it('ne demande pas le push distant dans la config du build', async () => {
    const app = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8')) as {
      expo: {
        ios: { bundleIdentifier: string };
        plugins: (string | [string, { enableRemoteNotifications?: boolean; color?: string }])[];
      };
    };
    assert.equal(app.expo.ios.bundleIdentifier, 'ch.mohamadba.famcal');
    const names = app.expo.plugins.map((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin));
    const notifications = app.expo.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === 'expo-notifications');
    assert.ok(Array.isArray(notifications));
    assert.equal(notifications[1].enableRemoteNotifications, false);
    assert.equal(notifications[1].color, '#D9602E');
    assert.ok(names.indexOf('expo-notifications') < names.indexOf('./plugins/withoutApsEnvironment.js'));

    const { exp } = getConfig(root, { isModdedConfig: true, skipSDKVersionRequirement: true });
    const evaluated = await compileModsAsync(exp, {
      projectRoot: root,
      introspect: true,
      platforms: ['ios'],
    });
    assert.equal(evaluated.ios?.bundleIdentifier, 'ch.mohamadba.famcal');
    assert.equal(Object.hasOwn(evaluated.ios?.entitlements ?? {}, 'aps-environment'), false);
    const modes = evaluated.ios?.infoPlist?.UIBackgroundModes;
    assert.equal(Array.isArray(modes) && modes.includes('remote-notification'), false);
  });
});
