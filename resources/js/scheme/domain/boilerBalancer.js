import { canonicalDeviceType } from './deviceTypes.js';

const RELAY_LINE_CAPACITY = 6;
const BUS_LINE_CAPACITY = 1;

const getControllerType = (scheme) => canonicalDeviceType(
    typeof scheme?.controller === 'string' ? scheme.controller : scheme?.controller?.type,
);

const getControllerBusCapacity = (controllerType) => (controllerType === 'ecosmart' ? 2 : 1);

const getControllerRelayCapacity = (controllerType) => {
    if (controllerType === 'pro') return 4;
    if (controllerType === 'smart2') return 1;
    if (controllerType === 'ecosmart') return 1;
    if (controllerType === 'go' || controllerType === 'go+') return 1;
    return 0;
};

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
    if (type !== 'rl2') return null;
    const base = moduleItem && typeof moduleItem === 'object' ? moduleItem : {};
    return {
        ...base,
        id: base.id ?? `${type}-${index}`,
        ...(base.id == null ? { connectionAssignmentGeneratedId: true } : {}),
        type,
        connection_type: base.connection_type ?? 'DI',
        relay_devices: Array.isArray(base.relay_devices) ? [...base.relay_devices] : [],
    };
};

const normalizeBoilerForRelay = (boiler, index) => ({
    ...boiler,
    id: boiler?.id ?? `relay-boiler-${index}`,
    ...(boiler?.id == null ? { connectionAssignmentGeneratedId: true } : {}),
    type: canonicalDeviceType(boiler?.type) === 'smart' ? 'smart' : 'stupid',
    connection_type: 'relay',
});

const normalizeBoilerForBus = (boiler, index) => ({
    ...boiler,
    id: boiler?.id ?? `bus-boiler-${index}`,
    ...(boiler?.id == null ? { connectionAssignmentGeneratedId: true } : {}),
    type: 'smart',
    connection_type: 'BUS',
    reserve: false,
});

const getDeviceKey = (device, index) => (device?.id != null ? `id:${device.id}` : `index:${index}`);

const isRelayBoiler = (boiler) => {
    const type = canonicalDeviceType(boiler?.type);
    const rawType = typeof boiler?.type === 'string' ? boiler.type.toLowerCase() : '';
    const connectionTypes = String(boiler?.connection_type || '')
        .toLowerCase()
        .split('|')
        .map((item) => item.trim());
    if (connectionTypes.includes('relay')) return true;
    return type === 'stupid' || rawType === 'stupidboiler' || rawType === 'stupid-boiler' || boiler?.reserve === true;
};

const isBusBoiler = (boiler) => {
    const connectionTypes = String(boiler?.connection_type || '')
        .toLowerCase()
        .split('|')
        .map((item) => item.trim());
    if (connectionTypes.includes('relay')) return false;
    return canonicalDeviceType(boiler?.type) === 'smart' && boiler?.reserve !== true;
};

const pushToLine = (line, device, capacity) => {
    if (!Array.isArray(line) || line.length >= capacity) return false;
    line.push(device);
    return true;
};

export const balanceBoilers = (scheme) => {
    const controllerType = getControllerType(scheme);
    const controller = scheme?.controller && typeof scheme.controller === 'object'
        ? { ...scheme.controller }
        : { type: controllerType };
    const extModules = controllerType === 'pro' || controllerType === 'ecosmart'
        ? (Array.isArray(scheme?.ext_modules) ? scheme.ext_modules : []).map(normalizeExtModule).filter(Boolean)
        : scheme?.ext_modules;
    const diModules = controllerType === 'smart2'
        ? (Array.isArray(scheme?.di_modules) ? scheme.di_modules : []).map((item, index) => (
            normalizeDiModule(item, index) || item
        ))
        : scheme?.di_modules;

    controller.bus_devices = Array.isArray(controller.bus_devices) ? [...controller.bus_devices] : [];
    controller.relay_devices = Array.isArray(controller.relay_devices) ? [...controller.relay_devices] : [];

    const relayLines = [
        { kind: 'controller', devices: controller.relay_devices, capacity: getControllerRelayCapacity(controllerType) },
        ...(controllerType === 'pro' || controllerType === 'ecosmart' ? extModules : [])
            .map((moduleItem, moduleIndex) => ({ moduleItem, moduleIndex }))
            .filter(({ moduleItem }) => canonicalDeviceType(moduleItem?.type) === 'rl6')
            .map(({ moduleItem, moduleIndex }) => ({ kind: 'ext', moduleIndex, devices: moduleItem.relay_devices, capacity: RELAY_LINE_CAPACITY })),
        ...(controllerType === 'smart2' ? diModules : [])
            .filter((moduleItem) => canonicalDeviceType(moduleItem?.type) === 'rl2')
            .map((moduleItem) => ({ kind: 'di', devices: moduleItem.relay_devices, capacity: 2 })),
    ].filter((line) => line.capacity > 0);

    const busLines = [
        { kind: 'controller', devices: controller.bus_devices, capacity: getControllerBusCapacity(controllerType) },
        ...(controllerType === 'pro' ? extModules : [])
            .map((moduleItem, moduleIndex) => ({ moduleItem, moduleIndex }))
            .filter(({ moduleItem }) => canonicalDeviceType(moduleItem?.type) === 'bl2')
            .map(({ moduleItem, moduleIndex }) => ({ kind: 'ext', moduleIndex, devices: moduleItem.bus_devices, capacity: BUS_LINE_CAPACITY })),
    ].filter((line) => line.capacity > 0);

    const placedKeys = new Set();
    (Array.isArray(scheme?.boilers) ? scheme.boilers : []).forEach((boiler, index) => {
        if (isRelayBoiler(boiler)) {
            const device = normalizeBoilerForRelay(boiler, index);
            const placed = relayLines.some((line) => pushToLine(line.devices, device, line.capacity));
            if (placed) placedKeys.add(getDeviceKey(boiler, index));
            return;
        }

        if (isBusBoiler(boiler)) {
            const device = normalizeBoilerForBus(boiler, index);
            const placed = busLines.some((line) => pushToLine(line.devices, device, line.capacity));
            if (placed) placedKeys.add(getDeviceKey(boiler, index));
        }
    });

    return {
        ...scheme,
        controller,
        boilers: Array.isArray(scheme?.boilers)
            ? scheme.boilers.filter((boiler, index) => !placedKeys.has(getDeviceKey(boiler, index)))
            : scheme?.boilers,
        ext_modules: extModules,
        di_modules: diModules,
    };
};
