import { canonicalDeviceType } from './deviceTypes.js';
import {
    CONTROLLER_MIXING_OWNER,
    getExtMixingOwner,
    isMixingUnitSensor,
    MIXING_OWNER_FIELD,
} from './mixingUnitOwnership.js';

const NTC_LINE_KEYS = ['ntc1_devices', 'ntc2_devices'];
const NTC_LINE_CAPACITY = 3;

const isNtcModule = (device) => canonicalDeviceType(device?.type) === 'ntc-1-wire';
const isNtcSensor = (sensor) => (
    sensor?.device_type === 'sensor'
    && String(sensor?.connection_type || '').toLowerCase() === 'ntc'
);

const normalizeNtcSensor = (sensor, index) => ({
    ...sensor,
    id: sensor?.id ?? `ntc-sensor-${index}`,
    type: 'ntc-sensor',
    connection_type: 'ntc',
});

const trimLine = (line) => {
    const next = [...line];
    while (next.length > 0 && !next[next.length - 1]) next.pop();
    return next;
};

const getModuleOccupancy = (device) => NTC_LINE_KEYS.reduce((sum, lineKey) => {
    const line = Array.isArray(device?.[lineKey]) ? device[lineKey] : [];
    return sum + line.slice(0, NTC_LINE_CAPACITY).filter(Boolean).length;
}, 0);

const assignSensorToModule = (device, sensor) => {
    for (let lineIndex = 0; lineIndex < NTC_LINE_KEYS.length; lineIndex += 1) {
        const lineKey = NTC_LINE_KEYS[lineIndex];
        const line = Array.isArray(device?.[lineKey]) ? [...device[lineKey]] : [];
        for (let slotIndex = 0; slotIndex < NTC_LINE_CAPACITY; slotIndex += 1) {
            if (!line[slotIndex]) {
                line[slotIndex] = sensor;
                return {
                    ...device,
                    [lineKey]: trimLine(line),
                };
            }
        }
    }

    return null;
};

const collectNtcModuleRefs = (controllerDevices, extModules) => {
    const refs = [];
    controllerDevices.forEach((device, deviceIndex) => {
        if (isNtcModule(device)) refs.push({ kind: 'controller', deviceIndex, ownerKey: CONTROLLER_MIXING_OWNER });
    });
    extModules.forEach((moduleItem, moduleIndex) => {
        const oneWireDevices = Array.isArray(moduleItem?.one_wire_devices) ? moduleItem.one_wire_devices : [];
        oneWireDevices.forEach((device, deviceIndex) => {
            if (isNtcModule(device)) refs.push({ kind: 'ext', moduleIndex, deviceIndex, ownerKey: getExtMixingOwner(moduleItem, moduleIndex) });
        });
    });
    return refs;
};

const getDeviceByRef = (controllerDevices, extModules, ref) => {
    if (ref.kind === 'controller') return controllerDevices[ref.deviceIndex] || null;
    return extModules[ref.moduleIndex]?.one_wire_devices?.[ref.deviceIndex] || null;
};

const setDeviceByRef = (controllerDevices, extModules, ref, device) => {
    if (ref.kind === 'controller') {
        controllerDevices[ref.deviceIndex] = device;
        return;
    }
    extModules[ref.moduleIndex].one_wire_devices[ref.deviceIndex] = device;
};

const findBestModuleRef = (controllerDevices, extModules, refs, startIndex, ownerKey = null) => {
    let best = null;
    let bestOccupancy = Infinity;

    refs.forEach((_, offset) => {
        const refIndex = (startIndex + offset) % refs.length;
        const ref = refs[refIndex];
        if (ownerKey && ref.ownerKey !== ownerKey) return;
        const device = getDeviceByRef(controllerDevices, extModules, ref);
        const occupancy = getModuleOccupancy(device);
        if (occupancy >= NTC_LINE_KEYS.length * NTC_LINE_CAPACITY) return;
        if (occupancy < bestOccupancy) {
            best = { ref, refIndex };
            bestOccupancy = occupancy;
        }
    });

    return best;
};

export const balanceNtcSensors = (scheme) => {
    const sensors = Array.isArray(scheme?.sensors) ? scheme.sensors : [];
    const ntcSensors = sensors
        .map((sensor, index) => ({ sensor, index }))
        .filter(({ sensor }) => (
            isNtcSensor(sensor)
            && (!isMixingUnitSensor(sensor) || sensor?.[MIXING_OWNER_FIELD])
        ));
    if (ntcSensors.length === 0) return scheme;

    const controllerDevices = Array.isArray(scheme?.controller?.one_wire_devices) ? [...scheme.controller.one_wire_devices] : [];
    const extModules = (Array.isArray(scheme?.ext_modules) ? scheme.ext_modules : []).map((moduleItem) => ({
        ...moduleItem,
        one_wire_devices: Array.isArray(moduleItem?.one_wire_devices) ? [...moduleItem.one_wire_devices] : [],
    }));
    const refs = collectNtcModuleRefs(controllerDevices, extModules);
    if (refs.length === 0) return scheme;

    const assignedSensorIndexes = new Set();
    let cursor = 0;

    const orderedNtcSensors = [...ntcSensors].sort((a, b) => (
        Number(Boolean(b.sensor?.[MIXING_OWNER_FIELD])) - Number(Boolean(a.sensor?.[MIXING_OWNER_FIELD]))
    ));
    orderedNtcSensors.forEach(({ sensor, index }) => {
        const best = findBestModuleRef(controllerDevices, extModules, refs, cursor, sensor?.[MIXING_OWNER_FIELD] || null);
        if (!best) return;

        const device = getDeviceByRef(controllerDevices, extModules, best.ref);
        const nextDevice = assignSensorToModule(device, normalizeNtcSensor(sensor, index));
        if (!nextDevice) return;

        setDeviceByRef(controllerDevices, extModules, best.ref, nextDevice);
        assignedSensorIndexes.add(index);
        cursor = (best.refIndex + 1) % refs.length;
    });

    if (assignedSensorIndexes.size === 0) return scheme;

    const nextSensors = sensors.filter((_, index) => !assignedSensorIndexes.has(index));
    const nextController = scheme?.controller && typeof scheme.controller === 'object'
        ? {
            ...scheme.controller,
            one_wire_devices: controllerDevices,
        }
        : { type: canonicalDeviceType(scheme?.controller), one_wire_devices: controllerDevices };

    const { controller_one_wire_devices: legacyControllerOneWireDevices, ...schemeWithoutLegacyControllerOneWire } = scheme;

    return {
        ...schemeWithoutLegacyControllerOneWire,
        controller: nextController,
        ext_modules: extModules,
        sensors: nextSensors,
    };
};
