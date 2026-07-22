import { canonicalDeviceType } from './deviceTypes.js';
import { getOneWireDevicesFromScheme } from './initialState.js';

const ONE_WIRE_MODULE_TYPES = new Set(['ntc-1-wire', 'rdt2']);

const isModuleType = (type) => ONE_WIRE_MODULE_TYPES.has(canonicalDeviceType(type));
const isOneWireThermostat = (type) => canonicalDeviceType(type) === 'thermostat';
const isOneWireSensor = (type) => !isModuleType(type) && !isOneWireThermostat(type);

export const addOneWireDeviceToScheme = (scheme, devicePayload, slotIndex, maxDevices = 6) => {
    const current = getOneWireDevicesFromScheme(scheme);
    const insertIndex = Number.isInteger(slotIndex) ? slotIndex : current.length;
    const normalizedType = canonicalDeviceType(devicePayload?.type);
    if (current.length >= maxDevices) return scheme;

    if (normalizedType === 'ntc-1-wire') {
        const ntcCount = current
            .filter((item) => canonicalDeviceType(item?.type) === 'ntc-1-wire')
            .length;
        if (ntcCount >= 2) return scheme;
    }

    if (Array.isArray(scheme?.controller?.one_wire_devices)) {
        const normalizedDevice = {
            ...devicePayload,
            type: normalizedType,
            connection_type: '1-wire',
        };
        return {
            ...scheme,
            controller: {
                ...scheme.controller,
                one_wire_devices: [
                    ...scheme.controller.one_wire_devices.slice(0, insertIndex),
                    normalizedDevice,
                    ...scheme.controller.one_wire_devices.slice(insertIndex),
                ],
            },
            one_wire_modules: [],
        };
    }

    if (scheme?.controller_one_wire_devices || typeof scheme?.controller === 'string') {
        const controllerType = typeof scheme?.controller === 'string' ? scheme.controller : scheme?.controller?.type;
        const currentControllerDevices = Array.isArray(scheme?.controller_one_wire_devices) ? scheme.controller_one_wire_devices : [];
        const { controller_one_wire_devices: legacyControllerOneWireDevices, ...schemeWithoutLegacyControllerOneWire } = scheme;
        const normalizedDevice = {
            ...devicePayload,
            type: normalizedType,
            connection_type: '1-wire',
        };
        return {
            ...schemeWithoutLegacyControllerOneWire,
            controller: {
                ...(scheme?.controller && typeof scheme.controller === 'object' ? scheme.controller : { type: controllerType }),
                one_wire_devices: [
                    ...currentControllerDevices.slice(0, insertIndex),
                    normalizedDevice,
                    ...currentControllerDevices.slice(insertIndex),
                ],
            },
            one_wire_modules: [],
        };
    }

    if (isModuleType(normalizedType)) {
        const modulesBeforeSlot = current
            .slice(0, insertIndex)
            .filter((item) => isModuleType(item?.type))
            .length;
        const currentModules = Array.isArray(scheme.one_wire_modules) ? scheme.one_wire_modules : [];
        const moduleTypeForScheme = normalizedType === 'rdt2' ? 'rdt' : normalizedType;
        return {
            ...scheme,
            one_wire_modules: [
                ...currentModules.slice(0, modulesBeforeSlot),
                {
                    id: Date.now(),
                    type: moduleTypeForScheme,
                    connection_type: '1-wire',
                },
                ...currentModules.slice(modulesBeforeSlot),
            ],
        };
    }

    if (normalizedType === 'thermostat') {
        const wiredDevices = Array.isArray(scheme.wired_devices) ? scheme.wired_devices : [];
        const wiredInsertPosition = current
            .slice(0, insertIndex)
            .filter((item) => canonicalDeviceType(item?.type) === 'thermostat')
            .length;
        const oneWireWiredIndexes = wiredDevices
            .map((item, index) => (item?.connection_type === '1-wire' ? index : -1))
            .filter((index) => index >= 0);
        const targetIndex = wiredInsertPosition >= oneWireWiredIndexes.length
            ? wiredDevices.length
            : oneWireWiredIndexes[wiredInsertPosition];
        return {
            ...scheme,
            wired_devices: [
                ...wiredDevices.slice(0, targetIndex),
                {
                    ...devicePayload,
                    type: 'thermostat',
                    connection_type: '1-wire',
                },
                ...wiredDevices.slice(targetIndex),
            ],
        };
    }

    const sensors = Array.isArray(scheme.sensors) ? scheme.sensors : [];
    const sensorInsertPosition = current
        .slice(0, insertIndex)
        .filter((item) => isOneWireSensor(item?.type))
        .length;
    const oneWireSensorIndexes = sensors
        .map((item, index) => (item?.connection_type === '1-wire' ? index : -1))
        .filter((index) => index >= 0);
    const targetIndex = sensorInsertPosition >= oneWireSensorIndexes.length
        ? sensors.length
        : oneWireSensorIndexes[sensorInsertPosition];
    const normalizedSensor = {
        ...devicePayload,
        type: normalizedType,
        connection_type: '1-wire',
    };

    return {
        ...scheme,
        sensors: [
            ...sensors.slice(0, targetIndex),
            normalizedSensor,
            ...sensors.slice(targetIndex),
        ],
    };
};

export const removeOneWireDeviceFromScheme = (scheme, slotIndex) => {
    const current = getOneWireDevicesFromScheme(scheme);
    const removedDevice = current[slotIndex];
    if (!removedDevice) return scheme;

    if (Array.isArray(scheme?.controller?.one_wire_devices)) {
        return {
            ...scheme,
            controller: {
                ...scheme.controller,
                one_wire_devices: scheme.controller.one_wire_devices.filter((_, index) => index !== slotIndex),
            },
            one_wire_modules: [],
        };
    }

    if (Array.isArray(scheme.controller_one_wire_devices)) {
        const { controller_one_wire_devices: legacyControllerOneWireDevices, ...schemeWithoutLegacyControllerOneWire } = scheme;
        return {
            ...schemeWithoutLegacyControllerOneWire,
            controller: {
                ...(scheme?.controller && typeof scheme.controller === 'object' ? scheme.controller : { type: scheme?.controller }),
                one_wire_devices: scheme.controller_one_wire_devices.filter((_, index) => index !== slotIndex),
            },
            one_wire_modules: [],
        };
    }

    if (isModuleType(removedDevice?.type)) {
        const currentModules = Array.isArray(scheme.one_wire_modules) ? scheme.one_wire_modules : [];
        const modulePosition = current
            .slice(0, slotIndex + 1)
            .filter((item) => isModuleType(item?.type))
            .length - 1;
        if (modulePosition < 0 || modulePosition >= currentModules.length) return scheme;
        return {
            ...scheme,
            one_wire_modules: [
                ...currentModules.slice(0, modulePosition),
                ...currentModules.slice(modulePosition + 1),
            ],
        };
    }

    if (canonicalDeviceType(removedDevice?.type) === 'thermostat') {
        const wiredDevices = Array.isArray(scheme.wired_devices) ? scheme.wired_devices : [];
        const thermostatPosition = current
            .slice(0, slotIndex + 1)
            .filter((item) => canonicalDeviceType(item?.type) === 'thermostat')
            .length - 1;
        const oneWireWiredIndexes = wiredDevices
            .map((item, index) => (item?.connection_type === '1-wire' ? index : -1))
            .filter((index) => index >= 0);
        const removeIndex = oneWireWiredIndexes[thermostatPosition];
        if (typeof removeIndex !== 'number') return scheme;
        return {
            ...scheme,
            wired_devices: [
                ...wiredDevices.slice(0, removeIndex),
                ...wiredDevices.slice(removeIndex + 1),
            ],
        };
    }

    const sensors = Array.isArray(scheme.sensors) ? scheme.sensors : [];
    const sensorPosition = current
        .slice(0, slotIndex + 1)
        .filter((item) => isOneWireSensor(item?.type))
        .length - 1;
    const oneWireSensorIndexes = sensors
        .map((item, index) => (item?.connection_type === '1-wire' ? index : -1))
        .filter((index) => index >= 0);
    const removeIndex = oneWireSensorIndexes[sensorPosition];
    if (typeof removeIndex !== 'number') return scheme;
    return {
        ...scheme,
        sensors: [
            ...sensors.slice(0, removeIndex),
            ...sensors.slice(removeIndex + 1),
        ],
    };
};
