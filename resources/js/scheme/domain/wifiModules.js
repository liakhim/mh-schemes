import { canonicalDeviceType } from './deviceTypes.js';

export const WIFI_RELAY_CAPACITY = 6;
export const WIFI_ONE_WIRE_CAPACITY = 6;

const WIFI_MODULE_TYPES = new Set(['rl6w', 'rl6sw']);
const WIFI_ONE_WIRE_SENSOR_TYPES = new Set([
    'wall-temperature-sensor',
    'wall-digital-sensor',
    'flask-sensor-temperature',
]);

export const normalizeWifiModule = (moduleItem, index) => {
    const type = canonicalDeviceType(typeof moduleItem === 'string' ? moduleItem : moduleItem?.type);
    if (!WIFI_MODULE_TYPES.has(type)) return null;
    const base = moduleItem && typeof moduleItem === 'object' ? moduleItem : {};
    return {
        ...base,
        id: base.id ?? `${type}-${index}`,
        ...(base.id == null ? { connectionAssignmentGeneratedId: true } : {}),
        type,
        device_type: 'module',
        connection_type: 'WIFI',
        one_wire_devices: Array.isArray(base.one_wire_devices) ? base.one_wire_devices : [],
        relay_devices: Array.isArray(base.relay_devices) ? base.relay_devices : [],
        relay_s_devices: Array.isArray(base.relay_s_devices) ? base.relay_s_devices : [],
    };
};

export const normalizeWifiModules = (modules) => (
    Array.isArray(modules) ? modules.map(normalizeWifiModule).filter(Boolean) : modules
);

export const isWifiOneWireSensor = (device) => (
    device?.device_type === 'sensor'
    && String(device?.connection_type || '').toLowerCase() === '1-wire'
    && WIFI_ONE_WIRE_SENSOR_TYPES.has(canonicalDeviceType(device?.type))
);

export const getWifiOneWireOwner = (moduleItem, moduleIndex) => `wifi:${moduleItem?.id ?? moduleIndex}`;
