import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { compileModsAsync } from '@expo/config-plugins';
import { focusSearch, hasSearch, registerSearch, resetSearch } from './lib/keys.ts';
import { CONTENT_MAX, hostAllows, MAC_SIDEBAR_AT, MAC_TYPE_BOOST, PAD_SIDEBAR_AT, shellMetrics, shortcutFor } from './lib/shell.ts';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('fenêtre Mac et iPad', () => {
  it('garde la colonne téléphone sur iPhone, même en paysage', () => {
    const phone = shellMetrics({ width: 390, pad: false, mac: false, tv: false, web: false });
    assert.equal(phone.sidebar, false);
    assert.equal(phone.contentMax, 720);
    assert.equal(phone.typeBoost, 1);
    assert.equal(phone.keyboard, false);
    const landscape = shellMetrics({ width: 932, pad: false, mac: false, tv: false, web: false });
    assert.equal(landscape.sidebar, false);
    assert.equal(landscape.keyboard, false);
    assert.equal(landscape.contentMax, CONTENT_MAX);
  });

  it('ouvre la barre à 1024 pt sur iPad et à 900 pt sur Mac', () => {
    const padPortrait = shellMetrics({ width: 1023, pad: true, mac: false, tv: false, web: false });
    assert.equal(padPortrait.sidebar, false);
    assert.equal(padPortrait.contentMax, CONTENT_MAX);
    assert.equal(padPortrait.typeBoost, 1);
    const padWide = shellMetrics({ width: PAD_SIDEBAR_AT, pad: true, mac: false, tv: false, web: false });
    assert.equal(padWide.sidebar, true);
    assert.equal(padWide.keyboard, false);
    const macNarrow = shellMetrics({ width: MAC_SIDEBAR_AT - 1, pad: true, mac: true, tv: false, web: false });
    assert.equal(macNarrow.sidebar, false);
    assert.equal(macNarrow.keyboard, true);
    assert.equal(macNarrow.typeBoost, MAC_TYPE_BOOST);
    assert.equal(macNarrow.contentMax, CONTENT_MAX);
    const macWide = shellMetrics({ width: MAC_SIDEBAR_AT, pad: true, mac: true, tv: false, web: false });
    assert.equal(macWide.sidebar, true);
    assert.equal(macWide.contentMax, 1040);
    assert.equal(macWide.typeBoost, MAC_TYPE_BOOST);
    const macSmall = shellMetrics({ width: 700, pad: true, mac: true, tv: false, web: false });
    assert.equal(macSmall.contentMax, 720);
    assert.equal(macSmall.keyboard, true);
    assert.equal(macSmall.typeBoost, MAC_TYPE_BOOST);
  });

  it('traite le web large comme une fenêtre, et laisse la télé de côté', () => {
    const web = shellMetrics({ width: 1280, pad: false, mac: false, tv: false, web: true });
    assert.equal(web.sidebar, true);
    assert.equal(web.keyboard, true);
    assert.equal(web.typeBoost, 1);
    const webKeys = shellMetrics({ width: 900, pad: false, mac: false, tv: false, web: true });
    assert.equal(webKeys.sidebar, false);
    assert.equal(webKeys.keyboard, true);
    const tv = shellMetrics({ width: 1920, pad: false, mac: false, tv: true, web: false });
    assert.equal(tv.sidebar, false);
    assert.equal(tv.keyboard, false);
    assert.equal(tv.contentMax, 720);
  });

  it('coupe haptique, calendrier et notifications sur Mac', () => {
    const mac = { mac: true, tv: false, web: false };
    assert.equal(hostAllows('haptics', mac), false);
    assert.equal(hostAllows('calendar', mac), false);
    assert.equal(hostAllows('notifications', mac), false);
    const phone = { mac: false, tv: false, web: false };
    assert.equal(hostAllows('haptics', phone), true);
    assert.equal(hostAllows('calendar', phone), true);
    assert.equal(hostAllows('notifications', { mac: false, tv: true }), false);
    assert.equal(hostAllows('haptics', { mac: false, tv: false, web: true }), false);
  });

  it('reconnaît Échap et Cmd+F, et ignore le reste en saisie', () => {
    assert.equal(shortcutFor({ key: 'f', metaKey: true }), 'search');
    assert.equal(shortcutFor({ key: 'f', ctrlKey: true, typing: true }), 'search');
    assert.equal(shortcutFor({ key: 'F', metaKey: true, altKey: true }), null);
    assert.equal(shortcutFor({ key: 'Escape' }), 'back');
    assert.equal(shortcutFor({ key: 'escape' }), 'back');
    assert.equal(shortcutFor({ key: 'Escape', typing: true }), null);
    assert.equal(shortcutFor({ key: 'f' }), null);
    assert.equal(shortcutFor({ key: 'a', metaKey: true }), null);
  });

  it('retient Cmd+F jusqu’à ce que l’agenda enregistre son champ', () => {
    resetSearch();
    assert.equal(hasSearch(), false);
    assert.equal(focusSearch(), false);
    let focused = 0;
    const stop = registerSearch(() => {
      focused += 1;
    });
    assert.equal(focused, 1);
    assert.equal(focusSearch(), true);
    assert.equal(focused, 2);
    stop();
    resetSearch();
    assert.equal(hasSearch(), false);
  });

  it('retire les capacités incompatibles avec le Mac sans toucher au bundle', async () => {
    const withMacIpad = require(join(root, 'plugins/with-mac-ipad.js')) as (config: {
      name: string;
      slug: string;
      ios: { bundleIdentifier: string; buildNumber: string; supportsTablet: boolean; requireFullScreen: boolean; infoPlist: Record<string, unknown> };
    }) => {
      name: string;
      slug: string;
      ios: { bundleIdentifier: string; buildNumber: string; supportsTablet: boolean; requireFullScreen: boolean };
    };
    const config = withMacIpad({
      name: 'Familycal',
      slug: 'famcal',
      ios: {
        bundleIdentifier: 'ch.mohamadba.famcal',
        buildNumber: '1',
        supportsTablet: false,
        requireFullScreen: true,
        infoPlist: {
          UIRequiredDeviceCapabilities: ['armv7', 'arm64', 'telephony'],
          UIRequiresFullScreen: true,
          CFBundleDisplayName: 'Familycal',
        },
      },
    });
    const evaluated = await compileModsAsync(config, { projectRoot: root, introspect: true, platforms: ['ios'] });
    assert.equal(evaluated.ios?.bundleIdentifier, 'ch.mohamadba.famcal');
    assert.equal(evaluated.ios?.buildNumber, '1');
    assert.equal(evaluated.ios?.supportsTablet, true);
    assert.equal(evaluated.ios?.requireFullScreen, false);
    const info = evaluated.ios?.infoPlist ?? {};
    assert.equal(info.UIApplicationSupportsIndirectInputEvents, true);
    assert.equal(info.UIRequiresFullScreen, false);
    assert.equal(info.CFBundleDisplayName, 'Familycal');
    const caps = info.UIRequiredDeviceCapabilities as string[];
    assert.equal(caps.includes('arm64'), true);
    assert.equal(caps.includes('armv7'), false);
    assert.equal(caps.includes('telephony'), false);
  });
});
