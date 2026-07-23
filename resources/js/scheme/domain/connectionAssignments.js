import { canonicalDeviceType } from './deviceTypes.js';

export const CONNECTION_LAYOUT_VERSION = 1;

const RELAY_LINES = new Set(['relay_devices', 'relay_s_devices']);
const PUBLIC_BUCKETS = ['boilers', 'wired_devices', 'sensors'];

const getControllerType = (scheme) => canonicalDeviceType(
    typeof scheme?.controller === 'string' ? scheme.controller : scheme?.controller?.type,
);

const getConnectionTypes = (device) => String(device?.connection_type || '')
    .toLowerCase()
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);

const hasConnectionType = (device, type) => getConnectionTypes(device).includes(type);
const getDeviceType = (device) => canonicalDeviceType(device?.type);
export const getStableIdKey = (id) => `${typeof id}:${JSON.stringify(id)}`;
const getDeviceKey = (type, id) => {
    const canonicalType = canonicalDeviceType(type);
    return id == null || !canonicalType ? null : `${canonicalType}:id:${getStableIdKey(id)}`;
};
const getRelaySpan = (device) => (hasConnectionType(device, 'double_relay') ? 2 : 1);

const isStupidBoiler = (device) => {
    const type = getDeviceType(device);
    const rawType = String(device?.type || '').toLowerCase();
    return type === 'stupid' || rawType === 'stupidboiler' || rawType === 'stupid-boiler';
};

const supportsRelay = (device) => isStupidBoiler(device)
    || hasConnectionType(device, 'relay')
    || hasConnectionType(device, 'double_relay');

const supportsRelayS = (device) => !isStupidBoiler(device)
    && (hasConnectionType(device, 'relay-s') || hasConnectionType(device, 'double_relay'));

const isBusBoiler = (device) => getDeviceType(device) === 'smart'
    && !hasConnectionType(device, 'relay')
    && device?.reserve !== true;

const isPressureSensor = (device) => getDeviceType(device) === 'pressure-sensor'
    && hasConnectionType(device, '4-20');

const isDiscreteDevice = (device) => new Set([
    'discrete_pool',
    'discrete_fire_alarm',
    'discrete_signal',
    'discrete_ventilation',
    'leak-sensor',
]).has(getDeviceType(device)) && hasConnectionType(device, 'di');

const isIo4Device = (device) => {
    const type = getDeviceType(device);
    return isPressureSensor(device)
        || isDiscreteDevice(device)
        || ((type === '010servo' || type === '010pump') && hasConnectionType(device, 'di'))
        || (type === 'mixing-ntc-sensor' && hasConnectionType(device, 'ntc'));
};

const isIo4GroupParent = (device) => {
    const type = getDeviceType(device);
    return (type === '010servo' || type === '010pump') && hasConnectionType(device, 'di');
};

const isMixingNtcSensor = (device) => getDeviceType(device) === 'mixing-ntc-sensor'
    && hasConnectionType(device, 'ntc');

const getControllerDiCapacity = (scheme, controllerType) => {
    const hasUps = Array.isArray(scheme?.power_modules) && scheme.power_modules.some((item) => (
        canonicalDeviceType(typeof item === 'string' ? item : item?.type) === 'ups'
    ));
    if (controllerType === 'pro') return hasUps ? 0 : 2;
    if (controllerType === 'ecosmart') return 1;
    if (controllerType === 'smart2') {
        const moduleCount = Array.isArray(scheme?.di_modules) ? scheme.di_modules.length : 0;
        return Math.max(0, 4 - (hasUps ? 2 : 0) - moduleCount * 2);
    }
    return 0;
};

const getControllerLine = (scheme, line) => {
    const type = getControllerType(scheme);
    if (line === 'bus_devices') return { capacity: type === 'ecosmart' ? 2 : 1, accepts: isBusBoiler };
    if (line === 'relay_devices') {
        const capacity = type === 'pro' ? 4 : ['ecosmart', 'smart2', 'go', 'go+'].includes(type) ? 1 : 0;
        return { capacity, accepts: supportsRelay };
    }
    if (line === 'relay_s_devices') return { capacity: type === 'pro' ? 4 : 0, accepts: supportsRelayS };
    if (line === 'di_devices') return { capacity: getControllerDiCapacity(scheme, type), accepts: isDiscreteDevice };
    if (line === 'devices_420' || line === 'devices420') {
        return { capacity: type === 'pro' || type === 'ecosmart' ? 1 : 0, accepts: isPressureSensor };
    }
    return null;
};

const getExtModuleLine = (moduleItem, line) => {
    const type = getDeviceType(moduleItem);
    if (type === 'bl2' && line === 'bus_devices') return { capacity: 1, accepts: isBusBoiler };
    if (type === 'rl6' && line === 'relay_devices') return { capacity: 6, accepts: supportsRelay };
    if (type === 'rl6s' && line === 'relay_s_devices') return { capacity: 6, accepts: supportsRelayS };
    if (type === 'io4' && line === 'channel_devices') return { capacity: 4, accepts: isIo4Device };
    if (type === 'di6' && (line === 'channel_devices' || line === 'di_devices')) {
        return { capacity: 6, accepts: isDiscreteDevice };
    }
    return null;
};

const getDiModuleLine = (moduleItem, line) => {
    const type = getDeviceType(moduleItem);
    if (type === 'rl2' && line === 'relay_devices') return { capacity: 2, accepts: supportsRelay };
    if (type === 'rl2s' && line === 'relay_s_devices') return { capacity: 2, accepts: supportsRelayS };
    return null;
};

const getOwnerLine = (scheme, ownerKind, owner, line) => {
    if (ownerKind === 'controller') return getControllerLine(scheme, line);
    if (ownerKind === 'ext_module') {
        const controllerType = getControllerType(scheme);
        if (controllerType === 'ecosmart' && getDeviceType(owner) === 'bl2') return null;
        return ['pro', 'ecosmart'].includes(controllerType) ? getExtModuleLine(owner, line) : null;
    }
    if (ownerKind === 'di_module') {
        return getControllerType(scheme) === 'smart2' ? getDiModuleLine(owner, line) : null;
    }
    return null;
};

const getPhysicalRelaySlot = (devices, arrayIndex, capacity) => {
    const device = devices[arrayIndex];
    const storedSlot = Number(device?.relay_slot_index);
    if (device?.relay_slot_index != null && Number.isInteger(storedSlot)) return storedSlot;

    const occupied = new Set();
    for (let index = 0; index < arrayIndex; index += 1) {
        const previous = devices[index];
        if (!previous) continue;
        const explicit = Number(previous?.relay_slot_index);
        let start = Number.isInteger(explicit) ? explicit : 0;
        if (!Number.isInteger(explicit)) {
            while (occupied.has(start) && start < capacity) start += 1;
        }
        for (let slot = start; slot < start + getRelaySpan(previous); slot += 1) occupied.add(slot);
    }
    let slot = 0;
    while (occupied.has(slot) && slot < capacity) slot += 1;
    return slot;
};

const collectOwnerAssignments = (scheme, ownerKind, owner, seen, assignments) => {
    if (!owner || typeof owner !== 'object') return;
    const lines = ['bus_devices', 'relay_devices', 'relay_s_devices', 'di_devices', 'channel_devices', 'devices_420', 'devices420'];
    lines.forEach((line) => {
        const descriptor = getOwnerLine(scheme, ownerKind, owner, line);
        if (!descriptor || descriptor.capacity <= 0 || !Array.isArray(owner[line])) return;
        owner[line].forEach((device, arrayIndex) => {
            if (!device || device.id == null || device.connectionAssignmentGeneratedId || !descriptor.accepts(device)) return;
            const deviceType = getDeviceType(device);
            if (!deviceType) return;
            const key = getDeviceKey(deviceType, device.id);
            if (!key || seen.has(key)) return;
            const slot = RELAY_LINES.has(line)
                ? getPhysicalRelaySlot(owner[line], arrayIndex, descriptor.capacity)
                : arrayIndex;
            const span = RELAY_LINES.has(line) ? getRelaySpan(device) : 1;
            if (!Number.isInteger(slot) || slot < 0 || slot + span > descriptor.capacity) return;
            seen.add(key);
            assignments.push({
                device_type: deviceType,
                device_id: device.id,
                owner_kind: ownerKind,
                ...(ownerKind === 'controller' ? {} : { owner_id: owner.id }),
                line,
                slot,
            });
        });
    });
};

/** Builds persisted physical assignments from the current materialized state. */
export const collectConnectionLayout = (scheme) => {
    const assignments = [];
    const seen = new Set();
    const controller = scheme?.controller && typeof scheme.controller === 'object' ? scheme.controller : null;
    collectOwnerAssignments(scheme, 'controller', controller, seen, assignments);
    (Array.isArray(scheme?.ext_modules) ? scheme.ext_modules : []).forEach((moduleItem) => {
        if (moduleItem?.id != null && !moduleItem.connectionAssignmentGeneratedId) {
            collectOwnerAssignments(scheme, 'ext_module', moduleItem, seen, assignments);
        }
    });
    (Array.isArray(scheme?.di_modules) ? scheme.di_modules : []).forEach((moduleItem) => {
        if (moduleItem?.id != null && !moduleItem.connectionAssignmentGeneratedId) {
            collectOwnerAssignments(scheme, 'di_module', moduleItem, seen, assignments);
        }
    });
    return assignments.length > 0 ? { version: CONNECTION_LAYOUT_VERSION, assignments } : null;
};

const findPublicDevice = (scheme, assignment) => {
    const expectedKey = getDeviceKey(assignment?.device_type, assignment?.device_id);
    if (!expectedKey) return null;
    for (const bucket of PUBLIC_BUCKETS) {
        const items = Array.isArray(scheme?.[bucket]) ? scheme[bucket] : [];
        const index = items.findIndex((device) => getDeviceKey(device?.type, device?.id) === expectedKey);
        if (index >= 0) return { bucket, index, device: items[index] };
    }
    return null;
};

const getOwner = (scheme, assignment) => {
    if (assignment?.owner_kind === 'controller') {
        return scheme?.controller && typeof scheme.controller === 'object' ? scheme.controller : null;
    }
    const bucket = assignment?.owner_kind === 'ext_module' ? 'ext_modules'
        : assignment?.owner_kind === 'di_module' ? 'di_modules'
            : null;
    if (!bucket || assignment?.owner_id == null) return null;
    return (Array.isArray(scheme?.[bucket]) ? scheme[bucket] : [])
        .find((moduleItem) => moduleItem && typeof moduleItem === 'object' && moduleItem.id === assignment.owner_id) || null;
};

const getOccupiedRelaySlots = (devices, capacity) => {
    const occupied = new Set();
    (Array.isArray(devices) ? devices : []).forEach((device, index) => {
        if (!device) return;
        const start = getPhysicalRelaySlot(devices, index, capacity);
        for (let slot = start; slot < start + getRelaySpan(device); slot += 1) occupied.add(slot);
    });
    return occupied;
};

const placeDevice = (owner, line, slot, capacity, device) => {
    const devices = Array.isArray(owner[line]) ? [...owner[line]] : [];
    if (RELAY_LINES.has(line)) {
        const span = getRelaySpan(device);
        const occupied = getOccupiedRelaySlots(devices, capacity);
        for (let index = slot; index < slot + span; index += 1) {
            if (occupied.has(index)) return false;
        }
        devices.push({ ...device, relay_slot_index: slot });
    } else {
        if (devices[slot]) return false;
        devices[slot] = device;
    }
    owner[line] = devices;
    return true;
};

const hasSameOwner = (left, right) => left?.owner_kind === right?.owner_kind
    && left?.owner_id === right?.owner_id
    && left?.line === right?.line;

const restoreIo4Groups = (scheme, assignments, blockedKeys) => {
    const assignmentCounts = new Map();
    assignments.forEach((assignment) => {
        const key = getDeviceKey(assignment?.device_type, assignment?.device_id);
        if (!key) return;
        if (!assignmentCounts.has(key)) assignmentCounts.set(key, []);
        assignmentCounts.get(key).push(assignment);
    });

    assignments.forEach((parentAssignment) => {
        const parentKey = getDeviceKey(parentAssignment?.device_type, parentAssignment?.device_id);
        if (!parentKey || blockedKeys.has(parentKey)) return;
        const found = findPublicDevice(scheme, parentAssignment);
        if (!found || found.bucket !== 'wired_devices' || !isIo4GroupParent(found.device)) return;
        const additions = Array.isArray(found.device.additions) ? found.device.additions : [];
        const mixingAdditions = additions.filter(isMixingNtcSensor);
        if (mixingAdditions.length === 0) return;

        const childEntries = mixingAdditions.map((device) => ({
            device,
            key: getDeviceKey(device?.type, device?.id),
        }));
        blockedKeys.add(parentKey);
        childEntries.forEach(({ key }) => {
            if (key) blockedKeys.add(key);
        });

        const parentAssignments = assignmentCounts.get(parentKey) || [];
        const childAssignments = childEntries.map(({ key }) => (key ? assignmentCounts.get(key) || [] : []));
        if (parentAssignments.length !== 1 || childAssignments.some((items) => items.length !== 1)) return;
        if (!Number.isInteger(parentAssignment.slot) || parentAssignment.slot < 0) return;

        const owner = getOwner(scheme, parentAssignment);
        const descriptor = owner && getOwnerLine(scheme, parentAssignment.owner_kind, owner, parentAssignment.line);
        if (!owner
            || getDeviceType(owner) !== 'io4'
            || parentAssignment.line !== 'channel_devices'
            || !descriptor?.accepts(found.device)) return;

        const groupAssignments = childAssignments.map((items) => items[0]);
        const assignmentsAreContiguous = groupAssignments.every((assignment, index) => (
            hasSameOwner(parentAssignment, assignment)
            && assignment.slot === parentAssignment.slot + index + 1
            && descriptor.accepts(childEntries[index].device)
        ));
        const groupEnd = parentAssignment.slot + mixingAdditions.length + 1;
        if (!assignmentsAreContiguous || groupEnd > descriptor.capacity) return;

        const channelDevices = Array.isArray(owner.channel_devices) ? [...owner.channel_devices] : [];
        for (let slot = parentAssignment.slot; slot < groupEnd; slot += 1) {
            if (channelDevices[slot]) return;
        }

        channelDevices[parentAssignment.slot] = {
            ...found.device,
            additions: additions.filter((addition) => !isMixingNtcSensor(addition)),
        };
        childEntries.forEach(({ device }, index) => {
            channelDevices[parentAssignment.slot + index + 1] = {
                ...device,
                type: getDeviceType(device),
                connection_type: 'ntc',
                ownerServo010Id: found.device.id,
            };
        });
        owner.channel_devices = channelDevices;
        scheme[found.bucket].splice(found.index, 1);
    });
};

/** Restores valid saved assignments and leaves every invalid assignment for automatic balancing. */
export const restoreConnectionAssignments = (scheme) => {
    const layout = scheme?.connection_layout;
    if (layout?.version !== CONNECTION_LAYOUT_VERSION || !Array.isArray(layout.assignments)) return scheme;

    const restored = {
        ...scheme,
        controller: scheme?.controller && typeof scheme.controller === 'object' ? { ...scheme.controller } : scheme?.controller,
        ext_modules: Array.isArray(scheme?.ext_modules)
            ? scheme.ext_modules.map((item) => (item && typeof item === 'object' ? { ...item } : item))
            : scheme?.ext_modules,
        di_modules: Array.isArray(scheme?.di_modules)
            ? scheme.di_modules.map((item) => (item && typeof item === 'object' ? { ...item } : item))
            : scheme?.di_modules,
        ...Object.fromEntries(PUBLIC_BUCKETS.map((bucket) => [bucket, Array.isArray(scheme?.[bucket]) ? [...scheme[bucket]] : scheme?.[bucket]])),
    };
    const seen = new Set();
    const blockedKeys = new Set();

    restoreIo4Groups(restored, layout.assignments, blockedKeys);

    layout.assignments.forEach((assignment) => {
        const key = getDeviceKey(assignment?.device_type, assignment?.device_id);
        if (!key || seen.has(key) || blockedKeys.has(key)) return;
        seen.add(key);
        if (!Number.isInteger(assignment?.slot) || assignment.slot < 0 || typeof assignment?.line !== 'string') return;
        const found = findPublicDevice(restored, assignment);
        const owner = getOwner(restored, assignment);
        if (!found || !owner) return;
        const descriptor = getOwnerLine(restored, assignment.owner_kind, owner, assignment.line);
        if (!descriptor || !descriptor.accepts(found.device)) return;
        const span = RELAY_LINES.has(assignment.line) ? getRelaySpan(found.device) : 1;
        if (assignment.slot + span > descriptor.capacity) return;
        if (!placeDevice(owner, assignment.line, assignment.slot, descriptor.capacity, found.device)) return;
        restored[found.bucket].splice(found.index, 1);
    });

    return restored;
};
