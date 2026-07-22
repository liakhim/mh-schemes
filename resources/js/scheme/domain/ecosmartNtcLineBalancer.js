import { canonicalDeviceType } from './deviceTypes.js';

const getControllerType = (scheme) => canonicalDeviceType(
    typeof scheme?.controller === 'string' ? scheme.controller : scheme?.controller?.type,
);

const getDeviceKey = (device, index) => (device?.id != null ? `id:${device.id}` : `index:${index}`);
const getDeviceIdKey = (device) => (device?.id != null ? `id:${device.id}` : null);

const hasConnectionType = (device, connectionType) => String(device?.connection_type || '')
    .toLowerCase()
    .split('|')
    .map((item) => item.trim())
    .includes(connectionType);

const isStrategySensor = (device) => canonicalDeviceType(device?.type) === 'flask-sensor-strategy'
    && (hasConnectionType(device, 'ntc') || hasConnectionType(device, '1-wire'));

const isBoilerSensor = (device) => canonicalDeviceType(device?.type) === 'flask-sensor-gvs-boiler'
    && (hasConnectionType(device, 'ntc') || hasConnectionType(device, '1-wire'));

const isMixingNtcSensor = (device) => canonicalDeviceType(device?.type) === 'mixing-ntc-sensor'
    && hasConnectionType(device, 'ntc');

const normalizeNtcConnection = (device) => ({
    ...device,
    type: canonicalDeviceType(device?.type),
    connection_type: 'ntc',
});

const isAssignedAddition = (addition, index, assignedAdditions, assignedKeys) => (
    assignedAdditions.has(addition)
    || (addition?.id != null && assignedKeys.has(getDeviceIdKey(addition)))
);

const removeAssignedAdditions = (device, assignedAdditions, assignedKeys) => {
    if (!device || typeof device !== 'object' || !Array.isArray(device.additions)) return device;
    return {
        ...device,
        additions: device.additions.filter((addition, index) => !isAssignedAddition(addition, index, assignedAdditions, assignedKeys)),
    };
};

const mapRelayLines = (moduleItem, assignedAdditions, assignedKeys) => {
    if (!moduleItem || typeof moduleItem !== 'object') return moduleItem;
    return {
        ...moduleItem,
        relay_devices: Array.isArray(moduleItem.relay_devices)
            ? moduleItem.relay_devices.map((device) => removeAssignedAdditions(device, assignedAdditions, assignedKeys))
            : moduleItem.relay_devices,
        relay_s_devices: Array.isArray(moduleItem.relay_s_devices)
            ? moduleItem.relay_s_devices.map((device) => removeAssignedAdditions(device, assignedAdditions, assignedKeys))
            : moduleItem.relay_s_devices,
    };
};

export const balanceEcosmartNtcLines = (scheme) => {
    if (getControllerType(scheme) !== 'ecosmart') return scheme;

    const controller = scheme?.controller && typeof scheme.controller === 'object'
        ? { ...scheme.controller }
        : { type: 'ecosmart' };
    const sensors = Array.isArray(scheme?.sensors) ? scheme.sensors : [];
    const assignedSensorKeys = new Set();

    const strategySensorEntry = sensors
        .map((sensor, index) => ({ sensor, index }))
        .find(({ sensor }) => isStrategySensor(sensor));
    const boilerSensorEntry = sensors
        .map((sensor, index) => ({ sensor, index }))
        .find(({ sensor }) => isBoilerSensor(sensor));

    const strategySensors = Array.isArray(controller.strategy_sensor_devices) ? [...controller.strategy_sensor_devices] : [];
    if (strategySensors.length === 0 && strategySensorEntry) {
        strategySensors[0] = normalizeNtcConnection(strategySensorEntry.sensor);
        assignedSensorKeys.add(getDeviceKey(strategySensorEntry.sensor, strategySensorEntry.index));
    }

    const boilerSensors = Array.isArray(controller.boiler_sensor_devices) ? [...controller.boiler_sensor_devices] : [];
    if (boilerSensors.length === 0 && boilerSensorEntry) {
        boilerSensors[0] = normalizeNtcConnection(boilerSensorEntry.sensor);
        assignedSensorKeys.add(getDeviceKey(boilerSensorEntry.sensor, boilerSensorEntry.index));
    }

    const mixingNtcDevices = Array.isArray(controller.mixing_ntc_devices) ? [...controller.mixing_ntc_devices] : [];
    const assignedAdditions = new Set();
    const assignedAdditionKeys = new Set();
    const assignMixingSensor = (device) => {
        if (mixingNtcDevices.filter(Boolean).length >= 2) return false;
        if (!isMixingNtcSensor(device)) return false;
        const slotIndex = mixingNtcDevices[0] ? 1 : 0;
        mixingNtcDevices[slotIndex] = normalizeNtcConnection(device);
        return true;
    };
    const collectMixingSensors = (device) => {
        if (mixingNtcDevices.filter(Boolean).length >= 2) return;
        if (canonicalDeviceType(device?.type) !== '220servo' || !Array.isArray(device?.additions)) return;
        device.additions.forEach((addition, index) => {
            if (mixingNtcDevices.filter(Boolean).length >= 2) return;
            const key = getDeviceIdKey(addition);
            if (key && assignedAdditionKeys.has(key)) return;
            if (!key && assignedAdditions.has(addition)) return;
            if (!assignMixingSensor(addition)) return;
            assignedAdditions.add(addition);
            if (key) assignedAdditionKeys.add(key);
        });
    };

    sensors
        .map((sensor, index) => ({ sensor, index }))
        .forEach(({ sensor, index }) => {
            if (!assignMixingSensor(sensor)) return;
            assignedSensorKeys.add(getDeviceKey(sensor, index));
        });

    (Array.isArray(scheme?.wired_devices) ? scheme.wired_devices : []).forEach(collectMixingSensors);
    [controller.relay_devices, controller.relay_s_devices]
        .filter(Array.isArray)
        .flat()
        .forEach(collectMixingSensors);
    (Array.isArray(scheme?.ext_modules) ? scheme.ext_modules : [])
        .flatMap((moduleItem) => [
            ...(Array.isArray(moduleItem?.relay_devices) ? moduleItem.relay_devices : []),
            ...(Array.isArray(moduleItem?.relay_s_devices) ? moduleItem.relay_s_devices : []),
        ])
        .forEach(collectMixingSensors);

    return {
        ...scheme,
        controller: {
            ...controller,
            strategy_sensor_devices: strategySensors.slice(0, 1),
            boiler_sensor_devices: boilerSensors.slice(0, 1),
            mixing_ntc_devices: mixingNtcDevices.slice(0, 2),
            relay_devices: Array.isArray(controller.relay_devices)
                ? controller.relay_devices.map((device) => removeAssignedAdditions(device, assignedAdditions, assignedAdditionKeys))
                : controller.relay_devices,
            relay_s_devices: Array.isArray(controller.relay_s_devices)
                ? controller.relay_s_devices.map((device) => removeAssignedAdditions(device, assignedAdditions, assignedAdditionKeys))
                : controller.relay_s_devices,
        },
        sensors: sensors.filter((sensor, index) => !assignedSensorKeys.has(getDeviceKey(sensor, index))),
        wired_devices: Array.isArray(scheme?.wired_devices)
            ? scheme.wired_devices.map((device) => removeAssignedAdditions(device, assignedAdditions, assignedAdditionKeys))
            : scheme?.wired_devices,
        ext_modules: Array.isArray(scheme?.ext_modules)
            ? scheme.ext_modules.map((moduleItem) => mapRelayLines(moduleItem, assignedAdditions, assignedAdditionKeys))
            : scheme?.ext_modules,
    };
};
