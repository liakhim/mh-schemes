import { canonicalDeviceType } from './deviceTypes.js';
import { normalizeWifiModules } from './wifiModules.js';

const normalizeWirelessDevice = (device) => {
    if (!device || typeof device !== 'object') return null;
    return {
        ...device,
        type: canonicalDeviceType(device.type),
    };
};

const migrateLegacyWirelessDevices = (scheme) => {
    const wirelessDevices = Array.isArray(scheme?.wireless_devices) && scheme.wireless_devices.length > 0
        ? scheme.wireless_devices
        : (Array.isArray(scheme?.thermostats) ? scheme.thermostats : []);
    const { thermostats: removedLegacyThermostats, ...schemeWithoutLegacyThermostats } = scheme || {};
    return {
        ...schemeWithoutLegacyThermostats,
        wireless_devices: wirelessDevices.map(normalizeWirelessDevice).filter(Boolean),
    };
};

/**
 * Converts public and legacy input into the stable public shape used by materializers.
 * It intentionally preserves device placement inside wifi_modules: these are user-owned
 * Wi-Fi line assignments, not generated controller lines.
 */
export const normalizeIncomingScheme = (scheme) => {
    const wirelessNormalizedScheme = migrateLegacyWirelessDevices(scheme);
    return {
        ...wirelessNormalizedScheme,
        wifi_modules: normalizeWifiModules(wirelessNormalizedScheme.wifi_modules) || [],
    };
};
