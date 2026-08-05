import { canonicalDeviceType } from './deviceTypes.js';

export const CONTROLLER_KIT_SENSOR_LIMITS = {
    pro: { wall: 1, flask: 2 },
    smart2: { wall: 1 },
    ecosmart: { ntc: 3 },
    go: { wall: 1 },
    'go+': { wireless: 1 },
};

export const CONTROLLER_KIT_SENSOR_PRODUCTS = {
    wall: 'Датчик температуры настенный проводной',
    flask: 'Датчик температуры в колбе проводной',
    ntc: 'Датчик температуры в колбе NTC 10K',
    wireless: 'Радиодатчик температуры и влажности комнатный',
};

export const getControllerKitSensorBucket = (controllerType, type) => {
    if (controllerType === 'pro') {
        if (type === 'wall-digital-sensor') return 'wall';
        if (['flask-sensor', 'flask-sensor-temperature', 'flask-sensor-gvs-boiler', 'flask-sensor-strategy', 'flask-sensor-mixing-unit', 'flask-sensor-stupid-boiler'].includes(type)) return 'flask';
    }
    if ((controllerType === 'smart2' || controllerType === 'go') && type === 'wall-digital-sensor') return 'wall';
    if (controllerType === 'ecosmart' && ['ntc-sensor', 'mixing-ntc-sensor', 'flask-sensor-gvs-boiler', 'flask-sensor-strategy'].includes(type)) return 'ntc';
    if (controllerType === 'go+' && type === 'wall-temperature-sensor') return 'wireless';
    return null;
};

const getSensorIdentity = (device) => (
    device?.id != null ? `${canonicalDeviceType(device.type)}:${device.id}` : null
);

const getModuleOneWireDevices = (modules) => (Array.isArray(modules) ? modules : [])
    .flatMap((moduleItem) => (Array.isArray(moduleItem?.one_wire_devices) ? moduleItem.one_wire_devices : []));

export const getControllerKitSensorState = (scheme, controllerType) => {
    const limits = CONTROLLER_KIT_SENSOR_LIMITS[controllerType] || {};
    const remaining = { ...limits };
    const controller = scheme?.controller || {};
    const candidates = [
        ...(Array.isArray(scheme?.wireless_devices) ? scheme.wireless_devices : []),
        ...(Array.isArray(controller?.one_wire_devices) ? controller.one_wire_devices : []),
        ...getModuleOneWireDevices(scheme?.ext_modules),
        ...getModuleOneWireDevices(scheme?.wifi_modules),
        ...(Array.isArray(scheme?.sensors) ? scheme.sensors : []),
        ...(Array.isArray(scheme?.wired_devices) ? scheme.wired_devices.flatMap((device) => device?.additions || []) : []),
        ...['mixing_ntc_devices', 'boiler_sensor_devices', 'strategy_sensor_devices'].flatMap((key) => controller?.[key] || []),
    ];
    const bundled = new Set();
    candidates.forEach((device) => {
        const type = canonicalDeviceType(device?.type);
        const bucket = getControllerKitSensorBucket(controllerType, type);
        if (!bucket || !remaining[bucket]) return;
        bundled.add(device);
        const identity = getSensorIdentity(device);
        if (identity) bundled.add(identity);
        remaining[bucket] -= 1;
    });
    return { bundled, remaining };
};

export const isBundledSensorDevice = (bundledSensors, device) => (
    bundledSensors.has(device) || bundledSensors.has(getSensorIdentity(device))
);
