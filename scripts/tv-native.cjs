/**
 * Modules retirés du lien natif Apple TV. Une seule liste, lue par le hook EAS,
 * le plugin Podfile et react-native.config.js. Inerte tant que EXPO_TV n’est pas 1.
 *
 * expo-notifications, expo-haptics et expo-calendar ne déclarent que l’iOS.
 * famcal-mac non plus : il lit ProcessInfo.isiOSAppOnMac et ne doit pas entrer dans le binaire tvOS.
 * Les rappels restent locaux sur iPhone ; la télé les affiche, elle ne s’enregistre pas au push.
 * expo-router est patché à part (tvOS + retrait de Link Preview et de la barre d’outils).
 */
const TV_AUTOLINK_EXCLUDE = ['expo-notifications', 'expo-haptics', 'expo-calendar', 'famcal-mac'];

/** Les xcframework Maven sont le cœur iOS upstream, pas le fork tvOS. */
const TV_RN_CORE_FROM_SOURCE = '0';

module.exports = { TV_AUTOLINK_EXCLUDE, TV_RN_CORE_FROM_SOURCE };
