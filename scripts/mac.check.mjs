/**
 * iOS sur Mac : même bundle, même build iPhone, mêmes clés. iPad activé,
 * capacités compatibles, module Mac hors du binaire tvOS.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const app = JSON.parse(readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
assert(app.ios.supportsTablet === true, 'supportsTablet');
assert(app.ios.requireFullScreen === false, 'fenêtre redimensionnable');
assert(app.ios.bundleIdentifier === 'ch.mohamadba.famcal', 'bundle');
assert(app.ios.buildNumber === '1', 'build iPhone');
assert(app.ios.infoPlist.UIApplicationSupportsIndirectInputEvents === true, 'pointeur');
assert(!app.ios.infoPlist.UIRequiredDeviceCapabilities, 'app.json n’exige pas de capacité incompatible');
assert(app.extra.eas.projectId === '8518b478-6bf6-4096-95b0-2b2d392c13f5', 'projet Expo');

const brand = readFileSync(path.join(root, 'src/brand.ts'), 'utf8');
assert(brand.includes("STORAGE_PREFIX = 'famcal'"), 'préfixe de stockage');
assert(brand.includes('STORAGE_VERSION = 1'), 'version de stockage');
assert(brand.includes("IOS_BUNDLE_ID = 'ch.mohamadba.famcal'"), 'bundle dans le code');
assert(!brand.includes('famcal@v2'), 'pas de nouvelle clé');

const { macCompatiblePlist, MAC_BLOCKED_CAPABILITIES } = require('../plugins/with-mac-ipad.js');
const plist = macCompatiblePlist({
  UIRequiredDeviceCapabilities: ['armv7', 'arm64', 'telephony'],
  UIRequiresFullScreen: true,
  CFBundleName: 'Familycal',
});
assert(!plist.UIRequiredDeviceCapabilities.includes('armv7'), 'armv7 retiré');
assert(!plist.UIRequiredDeviceCapabilities.includes('telephony'), 'telephony retiré');
assert(plist.UIRequiredDeviceCapabilities.includes('arm64'), 'arm64 conservé');
assert(plist.UIRequiresFullScreen === false, 'plein écran non exigé');
assert(plist.UIApplicationSupportsIndirectInputEvents === true, 'événements indirects');
assert(plist.CFBundleName === 'Familycal', 'le reste du plist reste');
assert(Array.isArray(plist['UISupportedInterfaceOrientations~ipad']), 'orientations iPad');
for (const blocked of ['gps', 'sms', 'wifi', 'microphone']) {
  assert(MAC_BLOCKED_CAPABILITIES.includes(blocked), blocked);
}
const emptied = macCompatiblePlist({ UIRequiredDeviceCapabilities: ['armv7'] });
assert(!('UIRequiredDeviceCapabilities' in emptied), 'liste vide retirée');

const { TV_AUTOLINK_EXCLUDE } = require('../scripts/tv-native.cjs');
assert(TV_AUTOLINK_EXCLUDE.includes('famcal-mac'), 'le module Mac ne se lie pas au build tvOS');
assert(TV_AUTOLINK_EXCLUDE.includes('expo-notifications'), 'notifications toujours hors TV');
assert(TV_AUTOLINK_EXCLUDE.includes('expo-calendar'), 'calendrier toujours hors TV');
assert(TV_AUTOLINK_EXCLUDE.includes('expo-haptics'), 'haptique toujours hors TV');

function loadConfig(tv) {
  const script = `
    const c = require('./app.config.js')({ config: JSON.parse(JSON.stringify(require('./app.json').expo)) });
    const info = (c.ios && c.ios.infoPlist) || {};
    process.stdout.write(JSON.stringify({
      bundle: c.ios.bundleIdentifier,
      build: c.ios.buildNumber,
      tablet: c.ios.supportsTablet,
      full: c.ios.requireFullScreen,
      project: c.extra && c.extra.eas && c.extra.eas.projectId,
      slug: c.slug,
      indirect: info.UIApplicationSupportsIndirectInputEvents,
      plugins: (c.plugins || []).map((p) => Array.isArray(p) ? p[0] : p)
    }));
  `;
  const env = { ...process.env, EAS_BUILD: 'true' };
  delete env.FAMCAL_TV_EAS_PROJECT_ID;
  if (tv) env.EXPO_TV = '1';
  else delete env.EXPO_TV;
  const run = spawnSync(process.execPath, ['-e', script], { cwd: root, env, encoding: 'utf8' });
  if (run.status !== 0) throw new Error(run.stderr || 'config');
  return JSON.parse(run.stdout);
}

const phone = loadConfig(false);
assert(phone.bundle === 'ch.mohamadba.famcal' && phone.build === '1', 'config iPhone');
assert(phone.slug === 'famcal', 'slug iPhone');
assert(phone.tablet === true && phone.full === false, 'iPad sans plein écran forcé');
assert(phone.indirect === true, 'pointeur dans la config');
assert(phone.project === '8518b478-6bf6-4096-95b0-2b2d392c13f5', 'projet Expo inchangé');
assert(phone.plugins.includes('./plugins/with-mac-ipad.js'), 'plugin Mac');
assert(!phone.plugins.includes('@react-native-tvos/config-tv'), 'pas de config TV sur iPhone');

const tv = loadConfig(true);
assert(tv.bundle === 'ch.mohamadba.famcal' && tv.build === '2', 'config TV');
assert(tv.slug === 'famcal-tv', 'slug TV');
assert(tv.tablet === false, 'la télé ne devient pas un iPad');
assert(!tv.plugins.includes('./plugins/with-mac-ipad.js'), 'plugin Mac hors TV');
assert(tv.project == null, 'la télé ne prend pas le projet iPhone');

function text(file) {
  return readFileSync(path.join(root, file), 'utf8');
}

const mac = text('src/lib/mac.ts');
assert(mac.includes('export function isIosAppOnMac'), 'helper');
assert(mac.includes('FamcalMac'), 'module natif');
assert(mac.includes('isiOSAppOnMac'), 'constante ProcessInfo');

for (const file of ['src/kit/motion.tsx', 'src/calendar/device.ts', 'src/notifications/run.ts']) {
  assert(text(file).includes('isIosAppOnMac'), `${file} garde le Mac`);
}
assert(text('src/calendar/device.ts').includes('Sur Mac'), 'message calendrier');
assert(text('src/notifications/guard.ts').includes('Sur Mac'), 'message notifications');
const calendar = text('src/calendar/device.ts');
assert(calendar.indexOf('isIosAppOnMac') < calendar.indexOf("const specifier = 'expo-calendar'"), 'import calendrier après le garde');
const notifications = text('src/notifications/run.ts');
assert(notifications.indexOf('isIosAppOnMac') < notifications.indexOf('expo-notifications/build/NotificationPermissions'), 'import notifications après le garde');

const shell = text('src/lib/shell.ts');
assert(shell.includes('1040') && shell.includes('900') && shell.includes('1024'), 'seuils de fenêtre');

console.log('mac checks ok');
