import { canonicalDeviceType } from './deviceTypes';

const CONTROLLER_420_CAPACITY = 1;
const IO4_CHANNEL_CAPACITY = 4;
const getController420Capacity = (controllerType) => (controllerType === 'pro' || controllerType === 'ecosmart' ? CONTROLLER_420_CAPACITY : 0);

const getControllerType = (scheme) => canonicalDeviceType(
    typeof scheme?.controller === 'string' ? scheme.controller : scheme?.controller?.type,
);

const getController420Key = (controller) => (
    controller && Object.prototype.hasOwnProperty.call(controller, 'devices420') ? 'devices420' : 'devices_420'
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

const getDeviceKey = (device, index) => (device?.id != null ? `id:${device.id}` : `index:${index}`);

const isPressureSensor = (sensor) => (
    canonicalDeviceType(sensor?.type) === 'pressure-sensor'
    && String(sensor?.connection_type || '').toLowerCase() === '4-20'
);

const normalizePressureSensor = (sensor, index) => ({
    ...sensor,
    id: sensor?.id ?? `pressure-sensor-${index}`,
    type: 'pressure-sensor',
    connection_type: '4-20',
});

const pushToLine = (line, device, capacity) => {
    if (!Array.isArray(line) || line.length >= capacity) return false;
    line.push(device);
    return true;
};

export const balancePressureSensors = (scheme) => {
    const controllerType = getControllerType(scheme);
    const controller = scheme?.controller && typeof scheme.controller === 'object'
        ? { ...scheme.controller }
        : { type: controllerType };
    const controller420Key = getController420Key(controller);
    const extModules = (Array.isArray(scheme?.ext_modules) ? scheme.ext_modules : [])
        .map(normalizeExtModule)
        .filter(Boolean);

    controller[controller420Key] = Array.isArray(controller[controller420Key]) ? [...controller[controller420Key]] : [];

    const lines = [
        { devices: controller[controller420Key], capacity: getController420Capacity(controllerType) },
        ...extModules
            .filter((moduleItem) => canonicalDeviceType(moduleItem?.type) === 'io4')
            .map((moduleItem) => ({ devices: moduleItem.channel_devices, capacity: IO4_CHANNEL_CAPACITY })),
    ].filter((line) => line.capacity > 0);

    const placedKeys = new Set();
    (Array.isArray(scheme?.sensors) ? scheme.sensors : []).forEach((sensor, index) => {
        if (!isPressureSensor(sensor)) return;
        const normalizedSensor = normalizePressureSensor(sensor, index);
        const placed = lines.some((line) => pushToLine(line.devices, normalizedSensor, line.capacity));
        if (placed) placedKeys.add(getDeviceKey(sensor, index));
    });

    return {
        ...scheme,
        controller,
        ext_modules: extModules,
        sensors: Array.isArray(scheme?.sensors)
            ? scheme.sensors.filter((sensor, index) => !placedKeys.has(getDeviceKey(sensor, index)))
            : scheme?.sensors,
    };
};
