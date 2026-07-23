import { canonicalDeviceType } from './deviceTypes.js';
import {
    CONTROLLER_MIXING_OWNER,
    getExtMixingOwner,
    getMixingUnitKey,
    MIXING_OWNER_FIELD,
} from './mixingUnitOwnership.js';
import { appendRelayDeviceToFreeSpan } from './relaySlots.js';

const RELAY_LINE_CAPACITY = 6;
const PRO_CONTROLLER_RELAY_CAPACITY = 4;
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
        ...(base.id == null ? { connectionAssignmentGeneratedId: true } : {}),
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
        ...(base.id == null ? { connectionAssignmentGeneratedId: true } : {}),
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
    ...(device?.id == null ? { connectionAssignmentGeneratedId: true } : {}),
    type: canonicalDeviceType(device?.type),
    connection_type: 'double_relay',
});

const pushDoubleRelayEquipmentToLine = (line, device) => {
    if (line.onlyTypes && !line.onlyTypes.has(canonicalDeviceType(device?.type))) return false;
    if (line.capacityMode === 'device') {
        if (!Array.isArray(line.devices) || line.devices.length >= line.capacity) return false;
        line.devices.push(device);
        return true;
    }
    return appendRelayDeviceToFreeSpan(line.devices, line.capacity, device);
};

export const balanceServos = (scheme) => {
    const controllerType = getControllerType(scheme);
    if (controllerType !== 'pro' && controllerType !== 'ecosmart' && controllerType !== 'smart2') return scheme;

    const controller = scheme?.controller && typeof scheme.controller === 'object'
        ? { ...scheme.controller }
        : { type: controllerType };
    const extModules = controllerType === 'pro' || controllerType === 'ecosmart'
        ? (Array.isArray(scheme?.ext_modules) ? scheme.ext_modules : []).map(normalizeExtModule).filter(Boolean)
        : scheme?.ext_modules;
    const diModules = controllerType === 'smart2'
        ? (Array.isArray(scheme?.di_modules) ? scheme.di_modules : []).map((item, index) => normalizeDiModule(item, index) || item)
        : scheme?.di_modules;

    controller.relay_s_devices = Array.isArray(controller.relay_s_devices) ? [...controller.relay_s_devices] : [];
    controller.relay_devices = Array.isArray(controller.relay_devices) ? [...controller.relay_devices] : [];
    const legacyRelaySValveDevices = Array.isArray(controller.relay_s_valve_devices) ? [...controller.relay_s_valve_devices] : [];
    controller.relay_s_valve_devices = [];
    controller['220_servo_devices'] = Array.isArray(controller['220_servo_devices']) ? [...controller['220_servo_devices']] : [];

    const lines = [
        {
            devices: controller['220_servo_devices'],
            capacity: controllerType === 'ecosmart' ? 2 : 0,
            capacityMode: 'device',
            onlyTypes: new Set(['220servo']),
            ownerKey: CONTROLLER_MIXING_OWNER,
            setDevices: (devices) => { controller['220_servo_devices'] = devices; },
        },
        { devices: controller.relay_s_valve_devices, capacity: controllerType === 'ecosmart' ? 1 : 0, capacityMode: 'device', onlyTypes: new Set(['valve']) },
        { devices: controller.relay_s_devices, capacity: getControllerRelaySCapacity(controllerType), onlyTypes: new Set(['220servo', 'valve']), ownerKey: CONTROLLER_MIXING_OWNER },
        ...(controllerType === 'pro' || controllerType === 'ecosmart' ? extModules : [])
            .filter((moduleItem) => canonicalDeviceType(moduleItem?.type) === 'rl6s')
            .map((moduleItem) => ({ devices: moduleItem.relay_s_devices, capacity: RELAY_LINE_CAPACITY, onlyTypes: new Set(['220servo', 'valve']), ownerKey: getExtMixingOwner(moduleItem, extModules.indexOf(moduleItem)) })),
        ...(controllerType === 'smart2' ? diModules : [])
            .filter((moduleItem) => canonicalDeviceType(moduleItem?.type) === 'rl2s')
            .map((moduleItem) => ({
                devices: moduleItem.relay_s_devices,
                capacity: 2,
                onlyTypes: new Set(['220servo', 'valve']),
                ownerKey: controllerType === 'smart2' ? CONTROLLER_MIXING_OWNER : null,
                setDevices: (devices) => { moduleItem.relay_s_devices = devices; },
            })),
        { devices: controller.relay_devices, capacity: getControllerRelayCapacity(controllerType), onlyTypes: new Set(['valve']) },
        ...(controllerType === 'pro' || controllerType === 'ecosmart' ? extModules : [])
            .filter((moduleItem) => canonicalDeviceType(moduleItem?.type) === 'rl6')
            .map((moduleItem) => ({ devices: moduleItem.relay_devices, capacity: RELAY_LINE_CAPACITY, onlyTypes: new Set(['valve']) })),
        ...(controllerType === 'smart2' ? diModules : [])
            .filter((moduleItem) => canonicalDeviceType(moduleItem?.type) === 'rl2')
            .map((moduleItem) => ({ devices: moduleItem.relay_devices, capacity: 2, onlyTypes: new Set(['valve']) })),
    ].filter((line) => line.capacity > 0);

    const placedKeys = new Set();
    const mixingOwnersByUnitKey = new Map();
    lines.forEach((line) => {
        if (!line.ownerKey) return;
        line.devices = line.devices.map((device) => {
            if (canonicalDeviceType(device?.type) !== '220servo') return device;
            const unitKey = getMixingUnitKey(device);
            if (unitKey != null) mixingOwnersByUnitKey.set(unitKey, line.ownerKey);
            return { ...device, [MIXING_OWNER_FIELD]: line.ownerKey };
        });
        if (line.setDevices) line.setDevices(line.devices);
        else if (line.ownerKey === CONTROLLER_MIXING_OWNER) controller.relay_s_devices = line.devices;
        else {
            const extModule = extModules.find((moduleItem, moduleIndex) => getExtMixingOwner(moduleItem, moduleIndex) === line.ownerKey);
            if (extModule) extModule.relay_s_devices = line.devices;
        }
    });
    const doubleRelayEntries = [
        ...legacyRelaySValveDevices.map((device, index) => ({ device, index, legacy: true })),
        ...(Array.isArray(scheme?.wired_devices) ? scheme.wired_devices : [])
            .map((device, index) => ({ device, index, legacy: false })),
    ];
    doubleRelayEntries.forEach(({ device, index, legacy }) => {
        if (!isDoubleRelayEquipment(device)) return;
        const normalizedDevice = normalizeDoubleRelayEquipment(device, index);
        const targetLine = lines.find((line) => pushDoubleRelayEquipmentToLine(
            line,
            line.ownerKey && canonicalDeviceType(normalizedDevice.type) === '220servo'
                ? { ...normalizedDevice, [MIXING_OWNER_FIELD]: line.ownerKey }
                : normalizedDevice,
        ));
        const placed = Boolean(targetLine);
        const unitKey = getMixingUnitKey(normalizedDevice);
        if (placed && targetLine?.ownerKey && unitKey != null) {
            mixingOwnersByUnitKey.set(unitKey, targetLine.ownerKey);
        }
        if (placed && !legacy) placedKeys.add(getDeviceKey(device, index));
    });

    return {
        ...scheme,
        controller,
        ext_modules: extModules,
        di_modules: diModules,
        sensors: Array.isArray(scheme?.sensors)
            ? scheme.sensors.map((sensor) => {
                const ownerKey = mixingOwnersByUnitKey.get(getMixingUnitKey(sensor));
                return ownerKey ? { ...sensor, [MIXING_OWNER_FIELD]: ownerKey } : sensor;
            })
            : scheme?.sensors,
        wired_devices: Array.isArray(scheme?.wired_devices)
            ? scheme.wired_devices.filter((device, index) => !placedKeys.has(getDeviceKey(device, index)))
            : scheme?.wired_devices,
    };
};
