// baseUrl n'est utile que pour la PWA (GitHub Pages). Sur les builds natifs EAS,
// il préfixe les assets par "<slug>/", ce qui entre en collision avec
// l'exécutable de même nom (système de fichiers insensible à la casse).
//
// Apple TV : EXPO_TV=1 seulement (profil EAS production-tv). Sans cette variable,
// le slug, le projectId, le bundle et le buildNumber iPhone ne bougent pas.

const IPHONE_PROJECT_ID = '8518b478-6bf6-4096-95b0-2b2d392c13f5';
const IPHONE_BUILD = '1';

const MAC_PLUGIN = './plugins/with-mac-ipad.js';

module.exports = ({ config }) => {
  if (process.env.EXPO_TV === '1') return withAppleTv(config);
  // Même binaire iPhone, fenêtre iPad redimensionnable sur Mac. Le buildNumber
  // et le bundle ne sont pas réécrits ici.
  config.ios = { ...(config.ios ?? {}), supportsTablet: true, requireFullScreen: false };
  const plugins = [...(config.plugins || [])];
  const names = plugins.map((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin));
  if (!names.includes(MAC_PLUGIN)) plugins.push(MAC_PLUGIN);
  config.plugins = plugins;
  if (process.env.EAS_BUILD && config.experiments) {
    const { baseUrl, ...rest } = config.experiments;
    config.experiments = rest;
  }
  return config;
};

const TV_DROP_INFO = [
  'NSCalendarsUsageDescription',
  'NSCalendarsFullAccessUsageDescription',
  'NSCalendarsWriteOnlyAccessUsageDescription',
  'NSRemindersUsageDescription',
  'NSRemindersFullAccessUsageDescription',
];

/**
 * Projet tvOS séparé : même bundle (même app, données inchangées), sans notifications
 * distantes, sans calendrier du téléphone, sans haptique. config-tv ne s’exécute qu’ici.
 * Le projectId iPhone n’est pas recopié : un build TV ne doit pas consommer son compteur distant.
 * Mohamed crée @habib548/famcal-tv et pose l’identifiant dans FAMCAL_TV_EAS_PROJECT_ID.
 */
function withAppleTv(config) {
  if (process.env.EAS_BUILD && config.experiments) {
    const { baseUrl, ...rest } = config.experiments;
    config.experiments = rest;
  }
  delete config.splash;
  const plugins = [
    'expo-router',
    [
      '@react-native-tvos/config-tv',
      {
        isTV: true,
        tvosDeploymentTarget: '16.4',
        appleTVImages: {
          iconSmallLayers: { front: './assets/tv/icon-home-front.png', back: './assets/tv/icon-home-back.png' },
          iconSmall2xLayers: { front: './assets/tv/icon-home-front@2x.png', back: './assets/tv/icon-home-back@2x.png' },
          iconLayers: { front: './assets/tv/icon-store-front.png', back: './assets/tv/icon-store-back.png' },
          topShelf: './assets/tv/top-shelf.png',
          topShelf2x: './assets/tv/top-shelf@2x.png',
          topShelfWide: './assets/tv/top-shelf-wide.png',
          topShelfWide2x: './assets/tv/top-shelf-wide@2x.png',
        },
      },
    ],
    './plugins/with-tv-pods.js',
    './plugins/withoutApsEnvironment.js',
  ];
  config.plugins = plugins;
  config.orientation = 'landscape';
  config.slug = 'famcal-tv';
  config.owner = 'habib548';
  config.ios = config.ios || {};
  config.ios.bundleIdentifier = 'ch.mohamadba.famcal';
  config.ios.buildNumber = '2';
  config.ios.entitlements = {};
  config.ios.supportsTablet = false;
  const info = { ...(config.ios.infoPlist || {}) };
  for (const key of TV_DROP_INFO) delete info[key];
  info.CFBundleDisplayName = 'Familycal';
  info.CFBundleVersion = '2';
  config.ios.infoPlist = info;
  config.extra = config.extra || {};
  config.extra.eas = { ...(config.extra.eas || {}) };
  const tvProject = process.env.FAMCAL_TV_EAS_PROJECT_ID;
  if (tvProject && tvProject !== IPHONE_PROJECT_ID) config.extra.eas.projectId = tvProject;
  else delete config.extra.eas.projectId;
  if (config.extra.eas.build) delete config.extra.eas.build;
  return config;
}

module.exports.IPHONE_PROJECT_ID = IPHONE_PROJECT_ID;
module.exports.IPHONE_BUILD = IPHONE_BUILD;
