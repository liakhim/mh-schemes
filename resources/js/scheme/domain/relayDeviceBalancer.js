import { canonicalDeviceType } from './deviceTypes.js';
import { appendRelayDeviceToFreeSpan } from './relaySlots.js';

const RELAY_LINE_CAPACITY = 6;
const PRO_CONTROLLER_RELAY_CAPACITY = 4;
const getControllerRelayCapacity = (controllerType) => {
    if (controllerType === 'pro') return PRO_CONTROLLER_RELAY_CAPACITY;
    if (controllerType === 'ecosmart') return 1;
    if (controllerType === 'smart2') return 1;
    if (controllerType === 'go' || controllerType === 'go+') return 1;
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

const getConnectionTypes = (device) => (typeof device?.connection_type === 'string'
    ? device.connection_type.split('|').map((item) => item.trim().toLowerCase()).filter(Boolean)
    : []);

const isRelayDevice = (device) => {
    const type = canonicalDeviceType(device?.type);
    const connectionTypes = getConnectionTypes(device);
    if (type === 'other-equipment' || type === 'otherequipment') {
        return connectionTypes.includes('relay') && !connectionTypes.includes('relay-s');
    }
    if (type === 'boiler-pump') {
        return connectionTypes.includes('relay') || connectionTypes.includes('relay-s');
    }
    if (type === 'pump-220v') {
        return connectionTypes.includes('relay') || connectionTypes.includes('relay-s');
    }
    if (type === 'zoneServo') {
        return connectionTypes.includes('relay');
    }
    return false;
};

const supportsRelay = (device) => {
    const connectionTypes = getConnectionTypes(device);
    return connectionTypes.includes('relay') || connectionTypes.includes('double_relay');
};

const isStupidBoilerDevice = (device) => {
    const type = canonicalDeviceType(device?.type);
    const rawType = typeof device?.type === 'string' ? device.type.toLowerCase() : '';
    return type === 'stupid' || rawType === 'stupidboiler' || rawType === 'stupid-boiler';
};

const supportsRelayS = (device) => {
    // Тупой котёл не может садиться на RELAY-S порты.
    if (isStupidBoilerDevice(device)) return false;
    const type = canonicalDeviceType(device?.type);
    const connectionTypes = getConnectionTypes(device);
    if (type === 'valve') {
        return connectionTypes.includes('relay-s') || connectionTypes.includes('double_relay');
    }
    if (type === 'zoneServo') {
        return connectionTypes.includes('relay-s');
    }
    if (type === 'pump-220v') {
        return connectionTypes.includes('relay-s');
    }
    return connectionTypes.includes('relay-s') || connectionTypes.includes('double_relay');
};

const normalizeRelayDevice = (device, index) => ({
    ...device,
    id: device?.id ?? `relay-device-${index}`,
    ...(device?.id == null ? { connectionAssignmentGeneratedId: true } : {}),
    type: canonicalDeviceType(device?.type),
});

const pushToLine = (line, device) => {
    if (line.onlyTypes && !line.onlyTypes.has(canonicalDeviceType(device?.type))) return false;
    if (line.accepts && !line.accepts(device)) return false;
    return appendRelayDeviceToFreeSpan(line.devices, line.capacity, device);
};

export const balanceRelayDevices = (scheme) => {
    const controllerType = getControllerType(scheme);
    if (controllerType !== 'pro' && controllerType !== 'ecosmart' && controllerType !== 'smart2' && controllerType !== 'go' && controllerType !== 'go+') return scheme;

    const controller = scheme?.controller && typeof scheme.controller === 'object'
        ? { ...scheme.controller }
        : { type: controllerType };
    const extModules = controllerType === 'pro' || controllerType === 'ecosmart'
        ? (Array.isArray(scheme?.ext_modules) ? scheme.ext_modules : []).map(normalizeExtModule).filter(Boolean)
        : scheme?.ext_modules;
    const diModules = controllerType === 'smart2'
        ? (Array.isArray(scheme?.di_modules) ? scheme.di_modules : []).map((item, index) => normalizeDiModule(item, index) || item)
        : scheme?.di_modules;

    const controllerRelaySDevices = Array.isArray(controller.relay_s_devices)
        ? controller.relay_s_devices
            .map((device) => {
                if (!device || typeof device !== 'object') return null;
                return { ...device };
            })
            .filter(Boolean)
        : [];
    const relayOnlyDevicesFromRelayS = controllerRelaySDevices
        .filter((device) => (supportsRelay(device) || isStupidBoilerDevice(device)) && !supportsRelayS(device))
        .map((device) => (isStupidBoilerDevice(device) ? { ...device, connection_type: 'relay' } : device));
    controller.relay_s_devices = controllerRelaySDevices.filter(supportsRelayS);
    controller.relay_devices = [
        ...(Array.isArray(controller.relay_devices) ? controller.relay_devices : []),
        ...relayOnlyDevicesFromRelayS,
    ];
    controller.relay_boiler_gvs_devices = Array.isArray(controller.relay_boiler_gvs_devices) ? [...controller.relay_boiler_gvs_devices] : [];
    controller.relay_220pump_devices = Array.isArray(controller.relay_220pump_devices) ? [...controller.relay_220pump_devices] : [];
    controller.relay_220pump5_devices = Array.isArray(controller.relay_220pump5_devices) ? [...controller.relay_220pump5_devices] : [];
    controller.relay_220pump3_devices = Array.isArray(controller.relay_220pump3_devices) ? [...controller.relay_220pump3_devices] : [];

    // Тупой котёл не может садиться на RELAY-S порты: вычищаем застрявшие котлы
    // из relay-s линий модулей и переносим их в обычные relay-линии.
    const strayStupidBoilers = [];
    const stripStupidBoilersFromRelayS = (moduleItem) => {
        if (!Array.isArray(moduleItem.relay_s_devices) || moduleItem.relay_s_devices.length === 0) return;
        const strays = moduleItem.relay_s_devices.filter(isStupidBoilerDevice);
        if (strays.length === 0) return;
        strayStupidBoilers.push(...strays);
        moduleItem.relay_s_devices = moduleItem.relay_s_devices.filter((device) => !isStupidBoilerDevice(device));
    };
    if (controllerType === 'pro' || controllerType === 'ecosmart') extModules.forEach(stripStupidBoilersFromRelayS);
    if (controllerType === 'smart2') diModules.forEach(stripStupidBoilersFromRelayS);

    const unplacedStupidBoilers = [];
    if (strayStupidBoilers.length > 0) {
        const boilerRelayLines = [
            { devices: controller.relay_devices, capacity: getControllerRelayCapacity(controllerType) },
            ...(controllerType === 'pro' || controllerType === 'ecosmart' ? extModules : [])
                .filter((moduleItem) => canonicalDeviceType(moduleItem?.type) === 'rl6')
                .map((moduleItem) => ({ devices: moduleItem.relay_devices, capacity: RELAY_LINE_CAPACITY })),
        ].filter((line) => line.capacity > 0);
        strayStupidBoilers.forEach((boiler) => {
            const device = { ...boiler, connection_type: 'relay' };
            const placed = boilerRelayLines.some((line) => {
                return appendRelayDeviceToFreeSpan(line.devices, line.capacity, device);
            });
            if (!placed) unplacedStupidBoilers.push(device);
        });
    }

    const lines = [
        { devices: controller.relay_boiler_gvs_devices, capacity: controllerType === 'ecosmart' ? 1 : 0, onlyTypes: new Set(['boiler-pump']) },
        { devices: controller.relay_220pump_devices, capacity: controllerType === 'ecosmart' ? 1 : 0, onlyTypes: new Set(['pump-220v']) },
        { devices: controller.relay_220pump5_devices, capacity: controllerType === 'ecosmart' ? 1 : 0, onlyTypes: new Set(['pump-220v']) },
        { devices: controller.relay_220pump3_devices, capacity: controllerType === 'ecosmart' ? 1 : 0, onlyTypes: new Set(['pump-220v']) },
        { devices: controller.relay_devices, capacity: getControllerRelayCapacity(controllerType), accepts: supportsRelay },
        { devices: controller.relay_s_devices, capacity: getControllerRelaySCapacity(controllerType), accepts: supportsRelayS },
        ...(controllerType === 'pro' || controllerType === 'ecosmart' ? extModules : [])
            .filter((moduleItem) => canonicalDeviceType(moduleItem?.type) === 'rl6')
            .map((moduleItem) => ({ devices: moduleItem.relay_devices, capacity: RELAY_LINE_CAPACITY, accepts: supportsRelay })),
        ...(controllerType === 'pro' || controllerType === 'ecosmart' ? extModules : [])
            .filter((moduleItem) => canonicalDeviceType(moduleItem?.type) === 'rl6s')
            .map((moduleItem) => ({ devices: moduleItem.relay_s_devices, capacity: RELAY_LINE_CAPACITY, accepts: supportsRelayS })),
        ...(controllerType === 'smart2' ? diModules : [])
            .filter((moduleItem) => canonicalDeviceType(moduleItem?.type) === 'rl2')
            .map((moduleItem) => ({ devices: moduleItem.relay_devices, capacity: 2, accepts: supportsRelay })),
        ...(controllerType === 'smart2' ? diModules : [])
            .filter((moduleItem) => canonicalDeviceType(moduleItem?.type) === 'rl2s')
            .map((moduleItem) => ({ devices: moduleItem.relay_s_devices, capacity: 2, accepts: supportsRelayS })),
    ].filter((line) => line.capacity > 0);

    const relayDeviceEntries = (Array.isArray(scheme?.wired_devices) ? scheme.wired_devices : [])
        .map((device, index) => ({ device, index }))
        .filter(({ device }) => isRelayDevice(device))
        // Keep relay-only devices from being starved by devices that can move to relay-s.
        .sort((a, b) => {
            const aSupportsRelayS = supportsRelayS(a.device);
            const bSupportsRelayS = supportsRelayS(b.device);
            if (aSupportsRelayS === bSupportsRelayS) return a.index - b.index;
            return aSupportsRelayS ? 1 : -1;
        });

    const placedKeys = new Set();
    relayDeviceEntries.forEach(({ device, index }) => {
        const normalizedDevice = normalizeRelayDevice(device, index);
        const placed = lines.some((line) => pushToLine(line, normalizedDevice));
        if (placed) placedKeys.add(getDeviceKey(device, index));
    });

    return {
        ...scheme,
        controller,
        ext_modules: extModules,
        di_modules: diModules,
        wired_devices: Array.isArray(scheme?.wired_devices)
            ? scheme.wired_devices.filter((device, index) => !placedKeys.has(getDeviceKey(device, index)))
            : scheme?.wired_devices,
        boilers: unplacedStupidBoilers.length > 0
            ? [...(Array.isArray(scheme?.boilers) ? scheme.boilers : []), ...unplacedStupidBoilers]
            : scheme?.boilers,
    };
};
