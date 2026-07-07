import { canonicalDeviceType } from './deviceTypes';

const IO4_CHANNEL_CAPACITY = 4;

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

const isMixingNtcSensor = (device) => (
    canonicalDeviceType(device?.type) === 'mixing-ntc-sensor'
    && String(device?.connection_type || '').toLowerCase() === 'ntc'
);

const isIo4OnlyDevice = (device) => (
    (canonicalDeviceType(device?.type) === '010servo' || canonicalDeviceType(device?.type) === '010pump')
    && String(device?.connection_type || '').toLowerCase() === 'di'
);

const pushToIo4 = (extModules, device) => {
    const additions = Array.isArray(device?.additions) ? device.additions : [];
    const ntcAdditions = additions.filter(isMixingNtcSensor);
    const remainingAdditions = additions.filter((addition) => !isMixingNtcSensor(addition));
    const requiredSlots = 1 + ntcAdditions.length;

    for (let moduleIndex = 0; moduleIndex < extModules.length; moduleIndex += 1) {
        const moduleItem = extModules[moduleIndex];
        if (canonicalDeviceType(moduleItem?.type) !== 'io4') continue;
        const channelDevices = Array.isArray(moduleItem.channel_devices) ? [...moduleItem.channel_devices] : [];
        if (channelDevices.length + requiredSlots > IO4_CHANNEL_CAPACITY) continue;
        channelDevices.push({
            ...device,
            additions: remainingAdditions,
        });
        ntcAdditions.forEach((sensor, sensorIndex) => {
            channelDevices.push({
                ...sensor,
                id: sensor?.id ?? `${device?.id ?? moduleIndex}-io4-ntc-${sensorIndex}`,
                type: canonicalDeviceType(sensor?.type),
                connection_type: 'ntc',
                ownerServo010Id: device?.id ?? null,
            });
        });
        extModules[moduleIndex] = { ...moduleItem, channel_devices: channelDevices };
        return true;
    }
    return false;
};

export const balance010Servos = (scheme) => {
    const wiredDevices = Array.isArray(scheme?.wired_devices) ? scheme.wired_devices : [];
    const extModules = (Array.isArray(scheme?.ext_modules) ? scheme.ext_modules : []).map(normalizeExtModule).filter(Boolean);
    const placedKeys = new Set();

    wiredDevices.forEach((device, index) => {
        if (!isIo4OnlyDevice(device)) return;
        const type = canonicalDeviceType(device?.type);
        const placed = pushToIo4(extModules, {
            ...device,
            id: device?.id ?? `${type}-${index}`,
            type,
            connection_type: 'di',
        });
        if (placed) placedKeys.add(getDeviceKey(device, index));
    });

    if (placedKeys.size === 0) return scheme;

    return {
        ...scheme,
        ext_modules: extModules,
        wired_devices: wiredDevices.filter((device, index) => !placedKeys.has(getDeviceKey(device, index))),
    };
};
