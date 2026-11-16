const { withEntitlementsPlist } = require('expo/config-plugins');

/**
 * Rappels locaux seulement. Retire `aps-environment` des entitlements iOS,
 * même si un autre plugin l’a écrit. Le push distant (sync du foyer)
 * demandera plus tard la capacité Push Notifications sur l’App ID
 * `ch.mohamadba.famcal`, puis un profil de provisionnement régénéré.
 */
function withoutApsEnvironment(config) {
  return withEntitlementsPlist(config, (mod) => {
    delete mod.modResults['aps-environment'];
    return mod;
  });
}

module.exports = withoutApsEnvironment;
