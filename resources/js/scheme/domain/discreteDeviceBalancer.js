import { canonicalDeviceType } from './deviceTypes';

const CONTROLLER_DI_CAPACITY = 2;
const SMART2_CONTROLLER_DI_CAPACITY = 4;
const IO4_CHANNEL_CAPACITY = 4;
const DI6_DI_CAPACITY = 6;
const DISCRETE_ONLY_TYPES = new Set(['discrete_pool', 'discrete_fire_alarm', 'discrete_signal', 'discrete_ventilation']);
const DISCRETE_TYPES = new Set([...DISCRETE_ONLY_TYPES, 'leak-sensor']);

const normalizePowerModuleType = (type) => {
    const normalized = canonicalDeviceType(type);
    if (normalized === 'circuitbreaker') return 'circuit-breaker';
    if (normalized === 'powerunit') return 'power-unit';
    return normalized;
};

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

const getDeviceKey = (device, index) => (device?.id != null ? `id:${device.id}` : `index:${index}`);

const isDiscreteDevice = (device) => (
    DISCRETE_TYPES.has(canonicalDeviceType(device?.type))
    && String(device?.connection_type || '').toLowerCase() === 'di'
);

const normalizeDiscreteDevice = (device, index) => ({
    ...device,
    id: device?.id ?? `discrete-device-${index}`,
    type: canonicalDeviceType(device?.type),
    connection_type: 'di',
});

const pushToLine = (line, device, capacity, onlyTypes = null) => {
    if (!Array.isArray(line) || line.length >= capacity) return false;
    if (onlyTypes && !onlyTypes.has(canonicalDeviceType(device?.type))) return false;
    line.push(device);
    return true;
};

export const balanceDiscreteDevices = (scheme) => {
    const controllerType = getControllerType(scheme);
    const hasUps = Array.isArray(scheme?.power_modules)
        && scheme.power_modules
            .map((item) => normalizePowerModuleType(typeof item === 'string' ? item : item?.type))
            .includes('ups');
    const useControllerDi = !(controllerType === 'pro' && hasUps);
    const smart2DiModulesCount = controllerType === 'smart2' && Array.isArray(scheme?.di_modules)
        ? scheme.di_modules.length
        : 0;
    const smart2UsedDiPorts = (hasUps ? 2 : 0) + smart2DiModulesCount * 2;
    const smart2ControllerDiCapacity = Math.max(0, SMART2_CONTROLLER_DI_CAPACITY - smart2UsedDiPorts);
    const controller = scheme?.controller && typeof scheme.controller === 'object'
        ? { ...scheme.controller }
        : { type: controllerType };
    const extModules = (Array.isArray(scheme?.ext_modules) ? scheme.ext_modules : [])
        .map(normalizeExtModule)
        .filter(Boolean);

    const controllerDiDevices = Array.isArray(controller.di_devices) ? [...controller.di_devices] : [];
    const retainedControllerDiDevices = controllerType === 'smart2'
        ? controllerDiDevices.slice(0, smart2ControllerDiCapacity)
        : controllerDiDevices;
    const overflowControllerDiDevices = controllerType === 'smart2'
        ? controllerDiDevices.slice(smart2ControllerDiCapacity)
        : [];
    controller.di_devices = useControllerDi ? retainedControllerDiDevices : [];
    controller.leak_sensor_devices = Array.isArray(controller.leak_sensor_devices) ? [...controller.leak_sensor_devices] : [];

    const lines = [
        { devices: controller.leak_sensor_devices, capacity: controllerType === 'ecosmart' ? 1 : 0, onlyTypes: new Set(['leak-sensor']) },
        { devices: controller.di_devices, capacity: controllerType === 'ecosmart' ? 1 : 0, onlyTypes: DISCRETE_ONLY_TYPES },
        { devices: controller.di_devices, capacity: controllerType === 'pro' && useControllerDi ? CONTROLLER_DI_CAPACITY : 0 },
        { devices: controller.di_devices, capacity: controllerType === 'smart2' ? smart2ControllerDiCapacity : 0 },
        ...extModules
            .map((moduleItem) => {
                const type = canonicalDeviceType(moduleItem?.type);
                if (type === 'io4') return { devices: moduleItem.channel_devices, capacity: IO4_CHANNEL_CAPACITY };
        if (type === 'di6') return { devices: moduleItem.channel_devices, capacity: DI6_DI_CAPACITY };
                return null;
            })
            .filter(Boolean),
    ].filter((line) => line.capacity > 0);

    const placedKeysBySource = { wired_devices: new Set(), sensors: new Set() };
    const unplacedControllerDiDevices = overflowControllerDiDevices
        .filter(isDiscreteDevice)
        .map((device, index) => normalizeDiscreteDevice(device, index));
    [
        { key: 'controller_di_devices', items: useControllerDi ? [] : controllerDiDevices },
        { key: 'wired_devices', items: Array.isArray(scheme?.wired_devices) ? scheme.wired_devices : [] },
        { key: 'sensors', items: Array.isArray(scheme?.sensors) ? scheme.sensors : [] },
    ].forEach(({ key, items }) => {
        items.forEach((device, index) => {
            if (!isDiscreteDevice(device)) return;
            const normalizedDevice = normalizeDiscreteDevice(device, index);
            const placed = lines.some((line) => pushToLine(line.devices, normalizedDevice, line.capacity, line.onlyTypes));
            if (!placed && key === 'controller_di_devices') {
                unplacedControllerDiDevices.push(normalizedDevice);
            }
            if (placed && placedKeysBySource[key]) placedKeysBySource[key].add(getDeviceKey(device, index));
        });
    });

    const remainingWiredDevices = Array.isArray(scheme?.wired_devices)
        ? scheme.wired_devices.filter((device, index) => !placedKeysBySource.wired_devices.has(getDeviceKey(device, index)))
        : scheme?.wired_devices;

    return {
        ...scheme,
        controller,
        ext_modules: extModules,
        wired_devices: unplacedControllerDiDevices.length > 0
            ? [...(Array.isArray(remainingWiredDevices) ? remainingWiredDevices : []), ...unplacedControllerDiDevices]
            : remainingWiredDevices,
        sensors: Array.isArray(scheme?.sensors)
            ? scheme.sensors.filter((device, index) => !placedKeysBySource.sensors.has(getDeviceKey(device, index)))
            : scheme?.sensors,
    };
};
