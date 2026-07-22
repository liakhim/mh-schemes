import { canonicalDeviceType } from './deviceTypes.js';
import { assignMaterializedDeviceTitles } from './deviceTitles.js';
import { balanceBoilers } from './boilerBalancer.js';
import { balanceRelayDevices } from './relayDeviceBalancer.js';
import { balanceServos } from './servoBalancer.js';
import { balance010Servos } from './servo010Balancer.js';
import { balancePressureSensors } from './pressureSensorBalancer.js';
import { balanceDiscreteDevices } from './discreteDeviceBalancer.js';
import { balanceEcosmartNtcLines } from './ecosmartNtcLineBalancer.js';
import { balanceOneWireDevices } from './oneWireBalancer.js';
import { balanceNtcSensors } from './ntcSensorBalancer.js';
import {
    CONTROLLER_MIXING_OWNER,
    getExtMixingOwner,
    isMixingUnitSensor,
    MIXING_OWNER_FIELD,
} from './mixingUnitOwnership.js';

const EXT_MODULE_TYPES = ['bl2', 'rl6', 'rl6s', 'io4', 'di6'];
const NTC_MODULE_CAPACITY = 6;

const getControllerType = (scheme) => canonicalDeviceType(
    typeof scheme?.controller === 'string' ? scheme.controller : scheme?.controller?.type,
);

const filterExtModulesForController = (scheme) => {
    const controllerType = getControllerType(scheme);
    if (controllerType !== 'ecosmart' || !Array.isArray(scheme?.ext_modules)) return scheme;

    return {
        ...scheme,
        ext_modules: scheme.ext_modules.filter((item) => {
            const type = canonicalDeviceType(typeof item === 'string' ? item : item?.type);
            return type !== 'bl2';
        }),
    };
};

const normalizeExtModule = (item, index) => {
    const rawType = typeof item === 'string' ? item : item?.type;
    const type = canonicalDeviceType(rawType);
    if (!EXT_MODULE_TYPES.includes(type)) return null;

    const base = item && typeof item === 'object' ? item : {};
    return {
        ...base,
        id: base.id ?? `${type}-${index}`,
        type,
        connection_type: base.connection_type ?? 'EXT',
        one_wire_devices: Array.isArray(base.one_wire_devices) ? base.one_wire_devices : [],
    };
};

const normalizeOneWireDevice = (device) => {
    if (!device || typeof device !== 'object') return null;
    return {
        ...device,
        type: canonicalDeviceType(device?.type),
        connection_type: '1-wire',
    };
};

const normalizeExtThermostatDevice = (device) => {
    if (!device || typeof device !== 'object') return null;
    if (canonicalDeviceType(device?.type) !== 'thermostat') return null;
    return {
        ...device,
        type: 'thermostat',
        connection_type: 'EXT',
    };
};

const getDeviceKey = (device) => {
    if (!device || typeof device !== 'object') return null;
    const type = canonicalDeviceType(device?.type);
    if (device?.id != null) return `id:${type || 'unknown'}:${device.id}`;
    return type ? `type:${type}` : null;
};

const hasConnectionType = (device, connectionType) => String(device?.connection_type || '')
    .toLowerCase()
    .split('|')
    .map((item) => item.trim())
    .includes(connectionType);

const isDirectNtcSensor = (sensor) => sensor?.device_type === 'sensor'
    && String(sensor?.connection_type || '').toLowerCase() === 'ntc';

const getNtcModuleFreeSlots = (device) => {
    const type = canonicalDeviceType(typeof device === 'string' ? device : device?.type);
    if (type !== 'ntc-1-wire') return 0;
    if (!device || typeof device !== 'object') return NTC_MODULE_CAPACITY;
    const used = ['ntc1_devices', 'ntc2_devices'].reduce((sum, lineKey) => {
        const line = Array.isArray(device?.[lineKey]) ? device[lineKey] : [];
        return sum + line.slice(0, 3).filter(Boolean).length;
    }, 0);
    return Math.max(0, NTC_MODULE_CAPACITY - used);
};

const getExistingNtcModuleFreeSlots = (scheme) => {
    const controllerDevices = Array.isArray(scheme?.controller?.one_wire_devices) ? scheme.controller.one_wire_devices : [];
    const oneWireModules = Array.isArray(scheme?.one_wire_modules) ? scheme.one_wire_modules : [];
    const extOneWireDevices = (Array.isArray(scheme?.ext_modules) ? scheme.ext_modules : [])
        .flatMap((moduleItem) => (Array.isArray(moduleItem?.one_wire_devices) ? moduleItem.one_wire_devices : []));

    return [...controllerDevices, ...oneWireModules, ...extOneWireDevices]
        .reduce((sum, device) => sum + getNtcModuleFreeSlots(device), 0);
};

const makeAutoNtcOneWireModule = (index) => ({
    id: `auto-ntc-1-wire-${index}`,
    type: 'ntc-1-wire',
    device_type: 'module',
    connection_type: '1-wire',
});

const hasNtcAssignments = (device) => {
    if (canonicalDeviceType(typeof device === 'string' ? device : device?.type) !== 'ntc-1-wire') return true;
    return ['ntc1_devices', 'ntc2_devices'].some((lineKey) => (
        Array.isArray(device?.[lineKey]) && device[lineKey].some(Boolean)
    ));
};

const removeEmptyNtcOneWireModules = (scheme) => {
    const controller = scheme?.controller && typeof scheme.controller === 'object'
        ? {
            ...scheme.controller,
            one_wire_devices: Array.isArray(scheme.controller.one_wire_devices)
                ? scheme.controller.one_wire_devices.filter(hasNtcAssignments)
                : scheme.controller.one_wire_devices,
        }
        : scheme?.controller;

    return {
        ...scheme,
        ...(controller ? { controller } : {}),
        one_wire_modules: Array.isArray(scheme?.one_wire_modules)
            ? scheme.one_wire_modules.filter(hasNtcAssignments)
            : scheme?.one_wire_modules,
        ext_modules: Array.isArray(scheme?.ext_modules)
            ? scheme.ext_modules.map((moduleItem) => ({
                ...moduleItem,
                one_wire_devices: Array.isArray(moduleItem?.one_wire_devices)
                    ? moduleItem.one_wire_devices.filter(hasNtcAssignments)
                    : moduleItem?.one_wire_devices,
            }))
            : scheme?.ext_modules,
    };
};

const getNtcAssignments = (device) => ['ntc1_devices', 'ntc2_devices']
    .flatMap((lineKey) => (Array.isArray(device?.[lineKey]) ? device[lineKey] : []))
    .filter(Boolean);

const assignNtcSensorsToModule = (moduleDevice, sensors) => ({
    ...moduleDevice,
    ntc1_devices: sensors.slice(0, 3),
    ntc2_devices: sensors.slice(3, 6),
});

const compactEcosmartNtcOneWireModules = (scheme) => {
    if (getControllerType(scheme) !== 'ecosmart') return scheme;
    const controller = scheme?.controller && typeof scheme.controller === 'object' ? scheme.controller : null;
    const oneWireDevices = Array.isArray(controller?.one_wire_devices) ? controller.one_wire_devices : [];
    const ntcModules = oneWireDevices.filter((device) => canonicalDeviceType(device?.type) === 'ntc-1-wire');
    if (ntcModules.length <= 1) return scheme;

    const sensors = ntcModules.flatMap(getNtcAssignments);
    const compactedModules = ntcModules
        .slice(0, Math.ceil(sensors.length / NTC_MODULE_CAPACITY))
        .map((moduleDevice, index) => assignNtcSensorsToModule(
            moduleDevice,
            sensors.slice(index * NTC_MODULE_CAPACITY, index * NTC_MODULE_CAPACITY + NTC_MODULE_CAPACITY),
        ));
    const otherOneWireDevices = oneWireDevices.filter((device) => canonicalDeviceType(device?.type) !== 'ntc-1-wire');

    return {
        ...scheme,
        controller: {
            ...controller,
            one_wire_devices: [
                ...compactedModules,
                ...otherOneWireDevices,
            ],
        },
    };
};

const ensureNtcOneWireModules = (scheme) => {
    const sensors = (Array.isArray(scheme?.sensors) ? scheme.sensors : [])
        .filter((sensor) => !isMixingUnitSensor(sensor) || sensor?.[MIXING_OWNER_FIELD]);
    const ntcSensorCount = sensors.filter(isDirectNtcSensor).length;
    if (ntcSensorCount === 0) return scheme;

    const deficit = ntcSensorCount - getExistingNtcModuleFreeSlots(scheme);
    const modulesToAdd = Math.ceil(Math.max(0, deficit) / NTC_MODULE_CAPACITY);
    if (modulesToAdd <= 0) return scheme;

    const oneWireModules = Array.isArray(scheme?.one_wire_modules) ? scheme.one_wire_modules : [];
    return {
        ...scheme,
        one_wire_modules: [
            ...oneWireModules,
            ...Array.from({ length: modulesToAdd }, (_, index) => makeAutoNtcOneWireModule(oneWireModules.length + index + 1)),
        ],
    };
};

const ensureOwnedNtcOneWireModules = (scheme) => {
    const requiredByOwner = new Map();
    (Array.isArray(scheme?.sensors) ? scheme.sensors : [])
        .filter(isDirectNtcSensor)
        .forEach((sensor) => {
            const ownerKey = sensor?.[MIXING_OWNER_FIELD];
            if (ownerKey) requiredByOwner.set(ownerKey, (requiredByOwner.get(ownerKey) || 0) + 1);
        });
    if (requiredByOwner.size === 0) return scheme;

    const controller = scheme?.controller && typeof scheme.controller === 'object'
        ? { ...scheme.controller }
        : { type: getControllerType(scheme) };
    controller.one_wire_devices = (Array.isArray(controller.one_wire_devices) ? controller.one_wire_devices : [])
        .map((device) => (canonicalDeviceType(device?.type) === 'ntc-1-wire'
            ? { ...device, [MIXING_OWNER_FIELD]: device?.[MIXING_OWNER_FIELD] || CONTROLLER_MIXING_OWNER }
            : device));
    const extModules = (Array.isArray(scheme?.ext_modules) ? scheme.ext_modules : []).map((moduleItem, moduleIndex) => {
        const ownerKey = getExtMixingOwner(moduleItem, moduleIndex);
        return {
            ...moduleItem,
            one_wire_devices: (Array.isArray(moduleItem?.one_wire_devices) ? moduleItem.one_wire_devices : [])
                .map((device) => (canonicalDeviceType(device?.type) === 'ntc-1-wire'
                    ? { ...device, [MIXING_OWNER_FIELD]: device?.[MIXING_OWNER_FIELD] || ownerKey }
                    : device)),
        };
    });
    const oneWireModules = (Array.isArray(scheme?.one_wire_modules) ? scheme.one_wire_modules : []).map((device, index) => (
        typeof device === 'string' ? { id: `one-wire-${index}`, type: canonicalDeviceType(device) } : { ...device }
    ));

    const getOwnedCapacity = (ownerKey) => {
        const controllerCapacity = ownerKey === CONTROLLER_MIXING_OWNER
            ? controller.one_wire_devices
                .filter((device) => canonicalDeviceType(device?.type) === 'ntc-1-wire')
                .reduce((sum, device) => sum + getNtcModuleFreeSlots(device), 0)
            : 0;
        const extCapacity = extModules.reduce((sum, moduleItem, moduleIndex) => (
            getExtMixingOwner(moduleItem, moduleIndex) === ownerKey
                ? sum + moduleItem.one_wire_devices
                    .filter((device) => canonicalDeviceType(device?.type) === 'ntc-1-wire')
                    .reduce((moduleSum, device) => moduleSum + getNtcModuleFreeSlots(device), 0)
                : sum
        ), 0);
        const stagedCapacity = oneWireModules
            .filter((device) => canonicalDeviceType(device?.type) === 'ntc-1-wire' && device?.[MIXING_OWNER_FIELD] === ownerKey)
            .reduce((sum, device) => sum + getNtcModuleFreeSlots(device), 0);
        return controllerCapacity + extCapacity + stagedCapacity;
    };

    requiredByOwner.forEach((requiredCount, ownerKey) => {
        let deficit = requiredCount - getOwnedCapacity(ownerKey);
        if (deficit <= 0) return;
        oneWireModules.forEach((device, index) => {
            if (deficit <= 0 || canonicalDeviceType(device?.type) !== 'ntc-1-wire' || device?.[MIXING_OWNER_FIELD]) return;
            oneWireModules[index] = { ...device, [MIXING_OWNER_FIELD]: ownerKey };
            deficit -= getNtcModuleFreeSlots(oneWireModules[index]);
        });
        while (deficit > 0) {
            const moduleIndex = oneWireModules.length + 1;
            oneWireModules.push({
                ...makeAutoNtcOneWireModule(moduleIndex),
                [MIXING_OWNER_FIELD]: ownerKey,
            });
            deficit -= NTC_MODULE_CAPACITY;
        }
    });

    return { ...scheme, controller, ext_modules: extModules, one_wire_modules: oneWireModules };
};

const getPlacedOneWireKeyCounts = (controllerDevices, extDevicesByModuleIndex) => {
    const counts = new Map();
    [...controllerDevices, ...Object.values(extDevicesByModuleIndex || {}).flat()]
        .map(getDeviceKey)
        .filter(Boolean)
        .forEach((key) => counts.set(key, (counts.get(key) || 0) + 1));
    return counts;
};

const getPlacedDeviceKeyCounts = (items) => {
    const counts = new Map();
    (Array.isArray(items) ? items : [])
        .map(getDeviceKey)
        .filter(Boolean)
        .forEach((key) => counts.set(key, (counts.get(key) || 0) + 1));
    return counts;
};

const mergeKeyCounts = (...maps) => {
    const merged = new Map();
    maps.forEach((map) => {
        if (!map) return;
        map.forEach((count, key) => merged.set(key, (merged.get(key) || 0) + count));
    });
    return merged;
};

const consumePlacedOneWireItem = (item, placedCounts) => {
    if (!item || !placedCounts) return false;
    const key = typeof item === 'string' ? `type:${canonicalDeviceType(item)}` : getDeviceKey(item);
    if (!key || !placedCounts.has(key)) return false;
    const count = placedCounts.get(key);
    if (count <= 0) return false;
    if (count === 1) placedCounts.delete(key);
    else placedCounts.set(key, count - 1);
    return true;
};

const filterMovedOneWireItems = (items, placedCounts) => {
    if (!Array.isArray(items)) return items;
    return items.filter((item) => !consumePlacedOneWireItem(item, placedCounts));
};

const filterMovedOneWireLineItems = (items, placedCounts) => {
    if (!Array.isArray(items)) return items;
    return items.filter((item) => {
        if (!hasConnectionType(item, '1-wire')) return true;
        return !consumePlacedOneWireItem(item, placedCounts);
    });
};

const copyPlacedCounts = (placedCounts) => new Map(placedCounts);

export const materializeBalancedOneWireScheme = (scheme) => {
    const compatibleScheme = filterExtModulesForController(scheme);
    const boilerBalancedScheme = balanceBoilers(compatibleScheme);
    const servoBalancedScheme = balanceServos(boilerBalancedScheme);
    const relayBalancedScheme = balanceRelayDevices(servoBalancedScheme);
    const servo010BalancedScheme = balance010Servos(relayBalancedScheme);
    const pressureBalancedScheme = balancePressureSensors(servo010BalancedScheme);
    const discreteBalancedScheme = balanceDiscreteDevices(pressureBalancedScheme);
    const ecosmartNtcBalancedScheme = balanceEcosmartNtcLines(discreteBalancedScheme);
    const ownedNtcModuleScheme = ensureOwnedNtcOneWireModules(ecosmartNtcBalancedScheme);
    const ntcModuleBalancedScheme = ensureNtcOneWireModules(ownedNtcModuleScheme);
    const extModules = (Array.isArray(ntcModuleBalancedScheme?.ext_modules) ? ntcModuleBalancedScheme.ext_modules : [])
        .map((item, index) => normalizeExtModule(item, index))
        .filter(Boolean);
    const balanced = balanceOneWireDevices(ntcModuleBalancedScheme, extModules);
    const controllerDevices = (balanced.controllerDevices || [])
        .map(normalizeOneWireDevice)
        .filter(Boolean);
    const balancedExtThermostatDevices = (balanced.extThermostatDevices || [])
        .map(normalizeExtThermostatDevice)
        .filter(Boolean);
    const placedOneWireCounts = getPlacedOneWireKeyCounts(controllerDevices, balanced.extDevicesByModuleIndex);
    const placedExtThermostatCounts = getPlacedDeviceKeyCounts(balancedExtThermostatDevices);
    const placedMovedCounts = mergeKeyCounts(placedOneWireCounts, placedExtThermostatCounts);

    const controllerBase = ntcModuleBalancedScheme?.controller && typeof ntcModuleBalancedScheme.controller === 'object'
        ? ntcModuleBalancedScheme.controller
        : { type: canonicalDeviceType(ntcModuleBalancedScheme?.controller) };
    const extThermostatDevices = [
        ...(Array.isArray(controllerBase.ext_devices) ? controllerBase.ext_devices : [])
            .map(normalizeExtThermostatDevice)
            .filter(Boolean),
        ...balancedExtThermostatDevices,
    ];
    const { controller_one_wire_devices: legacyControllerOneWireDevices, ...balancedSchemeBase } = ntcModuleBalancedScheme;

    const oneWireBalancedScheme = {
        ...balancedSchemeBase,
        controller: {
            ...controllerBase,
            one_wire_devices: controllerDevices,
            ext_devices: extThermostatDevices,
        },
        one_wire_modules: filterMovedOneWireItems(ntcModuleBalancedScheme?.one_wire_modules, copyPlacedCounts(placedMovedCounts)),
        wired_devices: filterMovedOneWireLineItems(ntcModuleBalancedScheme?.wired_devices, copyPlacedCounts(placedMovedCounts)),
        sensors: filterMovedOneWireLineItems(ntcModuleBalancedScheme?.sensors, copyPlacedCounts(placedMovedCounts)),
        ext_modules: extModules.map((moduleItem, moduleIndex) => ({
            ...moduleItem,
            one_wire_devices: (balanced.extDevicesByModuleIndex[moduleIndex] || [])
                .map(normalizeOneWireDevice)
                .filter(Boolean),
        })),
    };

    return assignMaterializedDeviceTitles(compactEcosmartNtcOneWireModules(removeEmptyNtcOneWireModules(balanceNtcSensors(oneWireBalancedScheme))));
};
