import { canonicalDeviceType } from './deviceTypes.js';

const hasConnectionType = (device, connectionType) => String(device?.connection_type || '')
    .toLowerCase()
    .split('|')
    .map((item) => item.trim())
    .includes(connectionType);

const isExtConnection = (device) => hasConnectionType(device, 'ext');

const isThermostatFloorSensor = (device) => {
    const type = canonicalDeviceType(device?.type);
    return type === 'floor-sensor' || type === 'flask-sensor-floor';
};

const expandOneWireDeviceWithFloorAdditions = (device, deviceIndex, ownerPrefix = 'thermostat') => {
    if (!device || typeof device !== 'object') return [];
    const normalizedType = canonicalDeviceType(device?.type);
    if (normalizedType !== 'thermostat') {
        return [{ ...device, type: normalizedType, connection_type: '1-wire' }];
    }
    const ownerThermostatKey = device?.id != null ? `${ownerPrefix}:${device.id}` : `${ownerPrefix}-index:${deviceIndex}`;
    const rawAdditions = Array.isArray(device?.additions) ? device.additions : [];
    const extractedAdditions = [];
    const remainingAdditions = [];

    rawAdditions.forEach((addition, additionIndex) => {
        if (!addition) return;
        const additionType = canonicalDeviceType(addition?.type);
        if (!additionType) return;
        if (normalizedType === 'thermostat' && isThermostatFloorSensor(addition)) {
            extractedAdditions.push({
                ...addition,
                id: addition?.id ?? `${device?.id ?? deviceIndex}-addition-${additionIndex}`,
                type: additionType,
                connection_type: '1-wire',
                ownerThermostatId: device?.id ?? null,
                ownerThermostatKey,
            });
            return;
        }
        remainingAdditions.push(addition);
    });

    return [
        {
            ...device,
            type: normalizedType,
            connection_type: '1-wire',
            additions: remainingAdditions,
            ownerThermostatKey,
        },
        ...extractedAdditions,
    ];
};

export const getInitialWirelessDevices = (scheme) => {
    if (Array.isArray(scheme.wireless_devices) && scheme.wireless_devices.length > 0) {
        return scheme.wireless_devices;
    }

    if (!Array.isArray(scheme.thermostats)) {
        return [];
    }

    return scheme.thermostats.map((device) => ({
        id: device.id,
        type: device.type,
        color: device.color,
        additions: device.additions || [],
    }));
};

const getLegacyOneWireDevicesFromScheme = (scheme) => {
    const fromWiredDevices = Array.isArray(scheme?.wired_devices)
        ? scheme.wired_devices
            .filter((device) => hasConnectionType(device, '1-wire') && !isExtConnection(device))
            .flatMap((device, deviceIndex) => {
                return expandOneWireDeviceWithFloorAdditions(device, deviceIndex);
            })
        : [];

    const fromSensors = Array.isArray(scheme?.sensors)
        ? scheme.sensors.filter((sensor) => hasConnectionType(sensor, '1-wire') && !isExtConnection(sensor))
        : [];

    const fromOneWireModules = Array.isArray(scheme?.one_wire_modules)
        ? scheme.one_wire_modules
            .map((moduleItem, index) => {
                if (typeof moduleItem === 'string') {
                    return {
                        id: Date.now() + index,
                        type: canonicalDeviceType(moduleItem),
                        connection_type: '1-wire',
                    };
                }

                if (moduleItem && typeof moduleItem === 'object' && moduleItem.type) {
                    return {
                        ...moduleItem,
                        type: canonicalDeviceType(moduleItem.type),
                        connection_type: '1-wire',
                    };
                }

                return null;
            })
            .filter((item) => item && (item.type === 'ntc-1-wire' || item.type === 'rdt2'))
        : [];

    return [
        ...fromWiredDevices,
        ...fromSensors.map((sensor) => ({
            ...sensor,
            type: canonicalDeviceType(sensor?.type),
        })),
        ...fromOneWireModules,
    ];
};

export const getOneWireDevicesFromScheme = (scheme) => {
    if (Array.isArray(scheme?.controller?.one_wire_devices)) {
        return scheme.controller.one_wire_devices
            .flatMap((device, deviceIndex) => {
                if (!device || typeof device !== 'object') return null;
                if (isExtConnection(device)) return null;
                return expandOneWireDeviceWithFloorAdditions(device, deviceIndex, 'controller-thermostat');
            })
            .filter(Boolean);
    }

    if (Array.isArray(scheme.controller_one_wire_devices)) {
        return scheme.controller_one_wire_devices
            .flatMap((device, deviceIndex) => {
                if (!device || typeof device !== 'object') return null;
                if (isExtConnection(device)) return null;
                return expandOneWireDeviceWithFloorAdditions(device, deviceIndex, 'controller-thermostat');
            })
            .filter(Boolean);
    }

    return getLegacyOneWireDevicesFromScheme(scheme);
};

export const getExtOneWireDevicesByModuleIndex = (scheme) => {
    const controllerType = canonicalDeviceType(
        typeof scheme?.controller === 'string' ? scheme.controller : scheme?.controller?.type,
    );
    if (controllerType !== 'pro' && controllerType !== 'ecosmart') return {};
    const extModules = Array.isArray(scheme?.ext_modules) ? scheme.ext_modules : [];
    const out = {};

    extModules.forEach((moduleItem, moduleIndex) => {
        if (!moduleItem || typeof moduleItem !== 'object') return;
        const moduleType = canonicalDeviceType(moduleItem.type);
        if (moduleType !== 'rl6' && moduleType !== 'rl6s') return;
        const devices = Array.isArray(moduleItem.one_wire_devices) ? moduleItem.one_wire_devices : [];
        if (!devices.length) return;
        out[moduleIndex] = devices
            .flatMap((device, deviceIndex) => {
                if (!device || typeof device !== 'object') return null;
                if (isExtConnection(device)) return null;
                return expandOneWireDeviceWithFloorAdditions(device, deviceIndex, `ext-${moduleIndex}-thermostat`)
                    .map((item) => ({
                        ...item,
                        ownerExtModuleId: moduleItem.id ?? null,
                        ownerExtModuleIndex: moduleIndex,
                    }));
            })
            .filter(Boolean);
    });

    return out;
};

export const getAllOneWireDevicesForBalancing = (scheme) => {
    const controllerDevices = getOneWireDevicesFromScheme(scheme);
    const extByModule = getExtOneWireDevicesByModuleIndex(scheme);
    const extDevices = Object.values(extByModule).flat();
    const legacyDevices = getLegacyOneWireDevicesFromScheme(scheme);
    return [...controllerDevices, ...extDevices, ...legacyDevices];
};

export const getInitialOneWireDevices = getOneWireDevicesFromScheme;
