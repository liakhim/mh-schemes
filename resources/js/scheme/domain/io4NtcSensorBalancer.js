import { canonicalDeviceType } from './deviceTypes.js';
import { MIXING_OWNER_FIELD } from './mixingUnitOwnership.js';

const IO4_CHANNEL_CAPACITY = 4;

const getControllerType = (scheme) => canonicalDeviceType(
    typeof scheme?.controller === 'string' ? scheme.controller : scheme?.controller?.type,
);

const isDirectNtcSensor = (device) => device?.device_type === 'sensor'
    && String(device?.connection_type || '')
        .toLowerCase()
        .split('|')
        .map((value) => value.trim())
        .includes('ntc');

export const balanceNtcSensorsIntoIo4 = (scheme) => {
    if (!['pro', 'ecosmart'].includes(getControllerType(scheme))) return scheme;

    const extModules = (Array.isArray(scheme?.ext_modules) ? scheme.ext_modules : []).map((moduleItem) => {
        const type = canonicalDeviceType(typeof moduleItem === 'string' ? moduleItem : moduleItem?.type);
        if (type !== 'io4') return moduleItem;
        const base = moduleItem && typeof moduleItem === 'object' ? moduleItem : { type };
        return {
            ...base,
            type,
            channel_devices: Array.isArray(base.channel_devices) ? [...base.channel_devices] : [],
        };
    });
    const placedSensors = new Set();

    (Array.isArray(scheme?.sensors) ? scheme.sensors : []).forEach((sensor) => {
        if (!isDirectNtcSensor(sensor) || sensor?.[MIXING_OWNER_FIELD]) return;
        const target = extModules.find((moduleItem) => (
            canonicalDeviceType(moduleItem?.type) === 'io4'
            && moduleItem.channel_devices.length < IO4_CHANNEL_CAPACITY
        ));
        if (!target) return;
        target.channel_devices.push(sensor);
        placedSensors.add(sensor);
    });

    if (placedSensors.size === 0) return scheme;
    return {
        ...scheme,
        ext_modules: extModules,
        sensors: scheme.sensors.filter((sensor) => !placedSensors.has(sensor)),
    };
};
