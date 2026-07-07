import { canonicalDeviceType } from './deviceTypes';
import { getAllOneWireDevicesForBalancing } from './initialState';

const LINE_CAPACITY = 6;

const getPotentialOneWireLines = (scheme, extModules) => {
    const lines = [{ kind: 'controller', moduleIndex: null }];
    (Array.isArray(extModules) ? extModules : []).forEach((moduleItem, moduleIndex) => {
        const type = canonicalDeviceType(typeof moduleItem === 'string' ? moduleItem : moduleItem?.type);
        if (type === 'rl6' || type === 'rl6s') {
            lines.push({ kind: 'ext', moduleIndex });
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
    if (tryPushGroupToLine(lineBuckets, 0, group)) return;

    for (let attempt = 1; attempt < lineBuckets.length; attempt += 1) {
        const idx = ((cursorRef.value - 1 + attempt) % (lineBuckets.length - 1)) + 1;
        if (tryPushGroupToLine(lineBuckets, idx, group)) {
            cursorRef.value = idx;
            return;
        }
    }

    const fallback = getMostFreeLineIndex(lineBuckets, 1);
    if (fallback >= 0) {
        const free = LINE_CAPACITY - lineBuckets[fallback].length;
        group.slice(0, Math.max(0, free)).forEach((item) => lineBuckets[fallback].push(item));
    }
};

const placeGroupRoundRobin = (lineBuckets, group, rrRef) => {
    for (let attempt = 0; attempt < lineBuckets.length; attempt += 1) {
        const idx = (rrRef.value + attempt) % lineBuckets.length;
        if (tryPushGroupToLine(lineBuckets, idx, group)) {
            rrRef.value = (idx + 1) % lineBuckets.length;
            return;
        }
    }
    const fallback = getMostFreeLineIndex(lineBuckets, rrRef.value);
    if (fallback >= 0) {
        const free = LINE_CAPACITY - lineBuckets[fallback].length;
        group.slice(0, Math.max(0, free)).forEach((item) => lineBuckets[fallback].push(item));
    }
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
    const cursorRef = { value: 1 };
    const ntcRoundRobinRef = { value: 0 };
    rdtModules.forEach((device) => {
        placeGroupPreferController(lineBuckets, [device], cursorRef);
    });

    ntcModules.forEach((device) => {
        placeGroupRoundRobin(lineBuckets, [device], ntcRoundRobinRef);
    });

    thermostatGroups.forEach((group) => {
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
    sortedRemaining.forEach((device) => {
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
        extThermostatDevices: [],
    };
};
