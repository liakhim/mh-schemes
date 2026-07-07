import { canonicalDeviceType } from './deviceTypes';

const RELAY_LINE_CAPACITY = 6;
const PRO_CONTROLLER_RELAY_CAPACITY = 4;
const DOUBLE_RELAY_SPAN = 2;
const getControllerRelayCapacity = (controllerType) => {
    if (controllerType === 'pro') return PRO_CONTROLLER_RELAY_CAPACITY;
    if (controllerType === 'ecosmart') return 1;
    if (controllerType === 'smart2') return 1;
    return 0;
};
const getControllerRelaySCapacity = (controllerType) => (controllerType === 'pro' ? 4 : 0);

const getControllerType = (scheme) => canonicalDeviceType(
    typeof scheme?.controller === 'string' ? scheme.controller : scheme?.controller?.type,
);

const normalizeExtModule = (moduleItem, index) => {
    const type = canonicalDeviceType(typeof moduleItem === 'string' ? moduleItem : moduleItem?.type);
    if (!type) return null;
    const base = moduleItem && typeof moduleItem === 'object' ? moduleItem : {};
    return {
        ...base,
        id: base.id ?? `${type}-${index}`,
        type,
        connection_type: base.connection_type ?? 'EXT',
        one_wire_devices: Array.isArray(base.one_wire_devices) ? base.one_wire_devices : [],
        bus_devices: Array.isArray(base.bus_devices) ? base.bus_devices : [],
        relay_devices: Array.isArray(base.relay_devices) ? base.relay_devices : [],
        relay_s_devices: Array.isArray(base.relay_s_devices) ? base.relay_s_devices : [],
        channel_devices: Array.isArray(base.channel_devices) ? base.channel_devices : [],
        di_devices: Array.isArray(base.di_devices) ? base.di_devices : [],
    };
};

const normalizeDiModule = (moduleItem, index) => {
    const type = canonicalDeviceType(typeof moduleItem === 'string' ? moduleItem : moduleItem?.type);
    if (type !== 'rl2' && type !== 'rl2s') return null;
    const base = moduleItem && typeof moduleItem === 'object' ? moduleItem : {};
    return {
        ...base,
        id: base.id ?? `${type}-${index}`,
        type,
        connection_type: base.connection_type ?? 'DI',
        relay_devices: Array.isArray(base.relay_devices) ? base.relay_devices : [],
        relay_s_devices: Array.isArray(base.relay_s_devices) ? base.relay_s_devices : [],
    };
};

const getDeviceKey = (device, index) => (device?.id != null ? `id:${device.id}` : `index:${index}`);

const DOUBLE_RELAY_TYPES = new Set(['220servo', 'valve']);

const isDoubleRelayEquipment = (device) => (
    DOUBLE_RELAY_TYPES.has(canonicalDeviceType(device?.type))
    && String(device?.connection_type || '').toLowerCase() === 'double_relay'
);

const normalizeDoubleRelayEquipment = (device, index) => ({
    ...device,
    id: device?.id ?? `${canonicalDeviceType(device?.type) || 'double-relay'}-${index}`,
    type: canonicalDeviceType(device?.type),
    connection_type: 'double_relay',
});

const occupiedSlots = (devices) => (Array.isArray(devices)
    ? devices.reduce((sum, device) => (String(device?.connection_type || '').toLowerCase() === 'double_relay' ? sum + DOUBLE_RELAY_SPAN : sum + 1), 0)
    : 0);

const hasFreeSpan = (devices, capacity) => (Array.isArray(devices) && occupiedSlots(devices) + DOUBLE_RELAY_SPAN <= capacity);

const pushDoubleRelayEquipmentToLine = (line, device) => {
    if (line.onlyTypes && !line.onlyTypes.has(canonicalDeviceType(device?.type))) return false;
    if (line.capacityMode === 'device') {
        if (!Array.isArray(line.devices) || line.devices.length >= line.capacity) return false;
        line.devices.push(device);
        return true;
    }
    if (!hasFreeSpan(line.devices, line.capacity)) return false;
    line.devices.push(device);
    return true;
};

export const balanceServos = (scheme) => {
    const controllerType = getControllerType(scheme);
    if (controllerType !== 'pro' && controllerType !== 'ecosmart' && controllerType !== 'smart2') return scheme;

    const controller = scheme?.controller && typeof scheme.controller === 'object'
        ? { ...scheme.controller }
        : { type: controllerType };
    const extModules = (Array.isArray(scheme?.ext_modules) ? scheme.ext_modules : [])
        .map(normalizeExtModule)
        .filter(Boolean);
    const diModules = (Array.isArray(scheme?.di_modules) ? scheme.di_modules : [])
        .map(normalizeDiModule)
        .filter(Boolean);

    controller.relay_s_devices = Array.isArray(controller.relay_s_devices) ? [...controller.relay_s_devices] : [];
    controller.relay_devices = Array.isArray(controller.relay_devices) ? [...controller.relay_devices] : [];
    const legacyRelaySValveDevices = Array.isArray(controller.relay_s_valve_devices) ? [...controller.relay_s_valve_devices] : [];
    controller.relay_s_valve_devices = [];
    controller['220_servo_devices'] = Array.isArray(controller['220_servo_devices']) ? [...controller['220_servo_devices']] : [];

    const lines = [
        { devices: controller['220_servo_devices'], capacity: controllerType === 'ecosmart' ? 2 : 0, capacityMode: 'device', onlyTypes: new Set(['220servo']) },
        { devices: controller.relay_s_valve_devices, capacity: controllerType === 'ecosmart' ? 1 : 0, capacityMode: 'device', onlyTypes: new Set(['valve']) },
        { devices: controller.relay_s_devices, capacity: getControllerRelaySCapacity(controllerType), onlyTypes: new Set(['220servo']) },
        { devices: controller.relay_devices, capacity: getControllerRelayCapacity(controllerType), onlyTypes: new Set(['valve']) },
        ...extModules
            .filter((moduleItem) => canonicalDeviceType(moduleItem?.type) === 'rl6s')
            .map((moduleItem) => ({ devices: moduleItem.relay_s_devices, capacity: RELAY_LINE_CAPACITY, onlyTypes: new Set(['220servo']) })),
        ...extModules
            .filter((moduleItem) => canonicalDeviceType(moduleItem?.type) === 'rl6')
            .map((moduleItem) => ({ devices: moduleItem.relay_devices, capacity: RELAY_LINE_CAPACITY, onlyTypes: new Set(['valve']) })),
        ...diModules
            .filter((moduleItem) => canonicalDeviceType(moduleItem?.type) === 'rl2s')
            .map((moduleItem) => ({ devices: moduleItem.relay_s_devices, capacity: 2, onlyTypes: new Set(['220servo']) })),
        ...diModules
            .filter((moduleItem) => canonicalDeviceType(moduleItem?.type) === 'rl2')
            .map((moduleItem) => ({ devices: moduleItem.relay_devices, capacity: 2, onlyTypes: new Set(['valve']) })),
    ].filter((line) => line.capacity > 0);

    const placedKeys = new Set();
    const doubleRelayEntries = [
        ...legacyRelaySValveDevices.map((device, index) => ({ device, index, legacy: true })),
        ...(Array.isArray(scheme?.wired_devices) ? scheme.wired_devices : [])
            .map((device, index) => ({ device, index, legacy: false })),
    ];
    doubleRelayEntries.forEach(({ device, index, legacy }) => {
        if (!isDoubleRelayEquipment(device)) return;
        const normalizedDevice = normalizeDoubleRelayEquipment(device, index);
        const placed = lines.some((line) => pushDoubleRelayEquipmentToLine(line, normalizedDevice));
        if (placed && !legacy) placedKeys.add(getDeviceKey(device, index));
    });

    return {
        ...scheme,
        controller,
        ext_modules: extModules,
        di_modules: diModules,
        wired_devices: Array.isArray(scheme?.wired_devices)
            ? scheme.wired_devices.filter((device, index) => !placedKeys.has(getDeviceKey(device, index)))
            : scheme?.wired_devices,
    };
};
