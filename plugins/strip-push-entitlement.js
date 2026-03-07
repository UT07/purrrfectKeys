/**
 * Expo config plugin: strip aps-environment entitlement.
 *
 * expo-notifications auto-adds the aps-environment (Push Notifications)
 * entitlement, but our app only uses LOCAL notifications. The AdHoc
 * provisioning profile doesn't include Push capability, so the Xcode
 * build fails with "Provisioning profile doesn't support Push Notifications".
 *
 * This plugin removes the entitlement so the build succeeds without needing
 * to enable Push Notifications on the Apple Developer portal.
 *
 * If remote push is ever needed, remove this plugin and enable the
 * Push Notifications capability on the App ID in Apple Developer portal.
 */
const { withEntitlementsPlist } = require('expo/config-plugins');

function stripPushEntitlement(config) {
  return withEntitlementsPlist(config, (mod) => {
    delete mod.modResults['aps-environment'];
    return mod;
  });
}

module.exports = stripPushEntitlement;
