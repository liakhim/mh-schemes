import { canonicalDeviceType } from './deviceTypes.js';
import { getAllOneWireDevicesForBalancing } from './initialState.js';
import {
    CONTROLLER_MIXING_OWNER,
    getExtMixingOwner,
    isMixingUnitSensor,
    MIXING_OWNER_FIELD,
} from './mixingUnitOwnership.js';

const LINE_CAPACITY = 6;
const EXT_LINE_CAPACITY = 12;

const getControllerType = (scheme) => canonicalDeviceType(
    typeof scheme?.controller === 'string' ? scheme.controller : scheme?.controller?.type,
);

const isThermostatFloorSensor = (device) => {
    const type = canonicalDeviceType(device?.type);
    return type === 'floor-sensor' || type === 'flask-sensor-floor';
};

const getControllerExtThermostatCount = (scheme) => {
    const extDevices = scheme?.controller && typeof scheme.controller === 'object' && Array.isArray(scheme.controller.ext_devices)
        ? scheme.controller.ext_devices
        : [];
    return extDevices.filter((device) => canonicalDeviceType(device?.type) === 'thermostat').length;
};

const getPotentialOneWireLines = (scheme, extModules) => {
    const lines = [{ kind: 'controller', moduleIndex: null, ownerKey: CONTROLLER_MIXING_OWNER }];
    (Array.isArray(extModules) ? extModules : []).forEach((moduleItem, moduleIndex) => {
        const type = canonicalDeviceType(typeof moduleItem === 'string' ? moduleItem : moduleItem?.type);
        if (type === 'rl6' || type === 'rl6s') {
            lines.push({ kind: 'ext', moduleIndex, ownerKey: getExtMixingOwner(moduleItem, moduleIndex) });
        }
    });
    return lines;
};

const getMostFreeLineIndex = (lineBuckets, startIndex = 0) => {
    let bestIdx = -1;
    let bestFree = -1;
    for (let i = 0; i < lineBuckets.length; i += 1) {
        const idx = (startIndex + i) % lineBuckets.length;
        const free = LINE_CAPACITY - lineBuckets[idx].length;
        if (free > bestFree) {
            bestFree = free;
            bestIdx = idx;
        }
    }
    return bestIdx;
};

const tryPushGroupToLine = (lineBuckets, lineIndex, group) => {
    if (!lineBuckets[lineIndex]) return false;
    if (lineBuckets[lineIndex].length + group.length > LINE_CAPACITY) return false;
    group.forEach((item) => lineBuckets[lineIndex].push(item));
    return true;
};

const placeGroupPreferController = (lineBuckets, group, cursorRef) => {
    if (tryPushGroupToLine(lineBuckets, 0, group)) return true;

    for (let attempt = 1; attempt < lineBuckets.length; attempt += 1) {
        const idx = ((cursorRef.value - 1 + attempt) % (lineBuckets.length - 1)) + 1;
        if (tryPushGroupToLine(lineBuckets, idx, group)) {
            cursorRef.value = idx;
            return true;
        }
    }

    return false;
};

const placeGroupRoundRobin = (lineBuckets, group, rrRef) => {
    for (let attempt = 0; attempt < lineBuckets.length; attempt += 1) {
        const idx = (rrRef.value + attempt) % lineBuckets.length;
        if (tryPushGroupToLine(lineBuckets, idx, group)) {
            rrRef.value = (idx + 1) % lineBuckets.length;
            return true;
        }
    }
    return false;
};

const tryPlaceGroupPreferController = (lineBuckets, group, cursorRef) => {
    if (tryPushGroupToLine(lineBuckets, 0, group)) return true;

    for (let attempt = 1; attempt < lineBuckets.length; attempt += 1) {
        const idx = ((cursorRef.value - 1 + attempt) % (lineBuckets.length - 1)) + 1;
        if (tryPushGroupToLine(lineBuckets, idx, group)) {
            cursorRef.value = idx;
            return true;
        }
    }

    return false;
};

const getThermostatGroupFloorSensors = (group) => (Array.isArray(group) ? group.filter(isThermostatFloorSensor) : []);

const isThermostatGroupWithFloorSensor = (group) => (
    Array.isArray(group)
    && canonicalDeviceType(group[0]?.type) === 'thermostat'
    && getThermostatGroupFloorSensors(group).length > 0
);

const makeExtThermostatFromGroup = (group) => {
    const thermostat = group[0];
    const existingAdditions = Array.isArray(thermostat?.additions) ? thermostat.additions : [];
    const floorAdditions = getThermostatGroupFloorSensors(group).map((sensor) => ({
        ...sensor,
        connection_type: '1-wire',
    }));

    return {
        ...thermostat,
        type: 'thermostat',
        connection_type: 'EXT',
        additions: [...existingAdditions, ...floorAdditions],
    };
};

export const balanceOneWireDevices = (scheme, extModules) => {
    const lines = getPotentialOneWireLines(scheme, extModules);
    if (lines.length === 0) return { controllerDevices: [], extDevicesByModuleIndex: {}, extThermostatDevices: [] };

    const devices = getAllOneWireDevicesForBalancing(scheme);
    const rdtModules = devices.filter((item) => canonicalDeviceType(item?.type) === 'rdt2');
    const ntcModules = devices.filter((item) => canonicalDeviceType(item?.type) === 'ntc-1-wire');

    const thermostatGroups = [];
    const used = new Set();
    devices.forEach((item, index) => {
        if (used.has(index)) return;
        if (canonicalDeviceType(item?.type) !== 'thermostat') return;
        const group = [item];
        used.add(index);
        devices.forEach((candidate, candidateIndex) => {
            if (used.has(candidateIndex)) return;
            const sameById = item?.id != null && candidate?.ownerThermostatId === item.id;
            const sameByKey = item?.ownerThermostatKey && candidate?.ownerThermostatKey === item.ownerThermostatKey;
            if (sameById || sameByKey) {
                group.push(candidate);
                used.add(candidateIndex);
            }
        });
        thermostatGroups.push(group);
    });

    const remaining = devices.filter((item, index) => {
        const type = canonicalDeviceType(item?.type);
        if (type === 'rdt2') return false;
        if (canonicalDeviceType(item?.type) === 'ntc-1-wire') return false;
        if (used.has(index)) return false;
        return true;
    });

    const lineBuckets = lines.map(() => []);
    const extThermostatDevices = [];
    const extThermostatPlacedDevices = [];
    const proExtThermostatSlotsFree = getControllerType(scheme) === 'pro'
        ? Math.max(0, EXT_LINE_CAPACITY - (Array.isArray(extModules) ? extModules.length : 0) - getControllerExtThermostatCount(scheme))
        : 0;
    const cursorRef = { value: 1 };
    const ntcRoundRobinRef = { value: 0 };
    const placePinnedDevice = (device) => {
        const ownerKey = device?.[MIXING_OWNER_FIELD]
            || (device?.ownerExtModuleId != null ? `ext:${device.ownerExtModuleId}` : null);
        const lineIndex = lines.findIndex((line) => line.ownerKey === ownerKey);
        return lineIndex >= 0 && tryPushGroupToLine(lineBuckets, lineIndex, [device]);
    };
    rdtModules.forEach((device) => {
        if (device?.ownerExtModuleId != null) placePinnedDevice(device);
        else placeGroupPreferController(lineBuckets, [device], cursorRef);
    });

    ntcModules.filter((device) => device?.[MIXING_OWNER_FIELD] || device?.ownerExtModuleId != null).forEach(placePinnedDevice);
    ntcModules.filter((device) => !device?.[MIXING_OWNER_FIELD] && device?.ownerExtModuleId == null).forEach((device) => {
        placeGroupRoundRobin(lineBuckets, [device], ntcRoundRobinRef);
    });

    thermostatGroups.forEach((group) => {
        if (extThermostatDevices.length < proExtThermostatSlotsFree && isThermostatGroupWithFloorSensor(group)) {
            extThermostatDevices.push(makeExtThermostatFromGroup(group));
            extThermostatPlacedDevices.push(...group);
            return;
        }
        if (tryPlaceGroupPreferController(lineBuckets, group, cursorRef)) return;
        placeGroupPreferController(lineBuckets, group, cursorRef);
    });

    const sortedRemaining = [...remaining].sort((a, b) => {
        const aType = canonicalDeviceType(a?.type);
        const bType = canonicalDeviceType(b?.type);
        const aPriority = aType === 'thermostat' ? 0 : 1;
        const bPriority = bType === 'thermostat' ? 0 : 1;
        return aPriority - bPriority;
    });

    const oneWireRoundRobinRef = { value: 0 };
    sortedRemaining.filter((device) => device?.[MIXING_OWNER_FIELD] || device?.ownerExtModuleId != null).forEach(placePinnedDevice);
    sortedRemaining.filter((device) => !device?.[MIXING_OWNER_FIELD] && device?.ownerExtModuleId == null && !isMixingUnitSensor(device)).forEach((device) => {
        placeGroupRoundRobin(lineBuckets, [device], oneWireRoundRobinRef);
    });

    const extDevicesByModuleIndex = {};
    lines.forEach((line, index) => {
        if (line.kind === 'ext' && Number.isInteger(line.moduleIndex)) {
            extDevicesByModuleIndex[line.moduleIndex] = lineBuckets[index];
        }
    });

    return {
        controllerDevices: lineBuckets[0] || [],
        extDevicesByModuleIndex,
        extThermostatDevices,
        unplacedDevices: devices.filter((device) => ![
            ...lineBuckets.flat(),
            ...extThermostatDevices,
            ...extThermostatPlacedDevices,
        ].some((placed) => placed === device || (
            placed?.id != null && device?.id != null
            && canonicalDeviceType(placed?.type) === canonicalDeviceType(device?.type)
            && placed.id === device.id
        ))),
    };
};
