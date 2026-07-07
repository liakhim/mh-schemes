import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';

const CONTROLLER_TEMPLATES = [
    { label: 'GO', value: { type: 'go', relay_devices: [], one_wire_devices: [], bus_devices: [] } },
    { label: 'GO+', value: { type: 'go+', relay_devices: [], one_wire_devices: [], bus_devices: [] } },
    { label: 'Smart2', value: { type: 'smart2', relay_devices: [], one_wire_devices: [], bus_devices: [] } },
    {
        label: 'PRO',
        value: {
            type: 'pro',
            relay_devices: [],
            relay_s_devices: [],
            one_wire_devices: [],
            ai_devices: [],
            di_devices: [],
            modbus_devices: [],
            devices_420: [],
            bus_devices: [],
        },
    },
    {
        label: 'ECOsmart',
        value: {
            type: 'ecosmart',
            one_wire_devices: [],
            bus_devices: [],
            ecosmart_bl2: [],
        },
    },
];

const BOILER_TEMPLATES = [
    {
        label: 'Умный котел',
        data: {
            id: 0,
            device_type: 'boiler',
            type: 'smart',
            name: 'Baxi Slim',
            reserve: false,
            connection_type: 'BUS',
        },
    },
    {
        label: 'Умный котел на реле',
        data: {
            id: 0,
            device_type: 'boiler',
            type: 'smart',
            name: 'Baxi Slim',
            reserve: false,
            connection_type: 'RELAY',
        },
    },
    {
        label: 'Тупой котел',
        data: {
            id: 0,
            device_type: 'boiler',
            type: 'stupid',
            name: 'Baxi HT',
            reserve: false,
            connection_type: 'RELAY',
        },
    },
];

const generateId = () => Date.now() + Math.floor(Math.random() * 1000);
let _uidCounter = 0;
const uid = () => (++_uidCounter) + Date.now();

const makeStupidBoilerSensor = () => ({
    id: generateId(),
    device_type: 'sensor',
    type: 'flask-sensor-stupid-boiler',
    connection_type: '1-wire',
    title: 'Датчик котла',
});

const withStupidBoilerSensor = (scheme, boiler) => {
    if (canonicalType(boiler?.type) !== 'stupid') return scheme;
    const sensors = Array.isArray(scheme?.sensors) ? scheme.sensors : [];
    return {
        ...scheme,
        sensors: [...sensors, makeStupidBoilerSensor()],
    };
};

const CONTROLLER_LIMITS = {
    go: { relay: 1, relayS: 0, bus: 1, oneWire: 6, di: 0, io4Channels: 0, analog420: 0, power: false },
    'go+': { relay: 1, relayS: 0, bus: 1, oneWire: 6, di: 0, io4Channels: 0, analog420: 0, power: false },
    smart2: { relay: 1, relayS: 0, bus: 1, oneWire: 6, di: 4, io4Channels: 0, analog420: 0, power: true },
    pro: { relay: 4, relayS: 4, bus: 1, oneWire: 6, di: 2, io4Channels: 0, analog420: 1, power: true },
    ecosmart: { relay: 6, relayS: 0, bus: 2, oneWire: 6, di: 2, io4Channels: 0, analog420: 1, power: false },
};

const GO_ONE_WIRE_THERMOSTAT_LIMIT = 2;
const ECOSMART_EXT_DEVICE_CAPACITY = 12;

const CONTROLLER_LABELS = {
    go: 'GO',
    'go+': 'GO+',
    smart2: 'Smart2',
    pro: 'PRO',
    ecosmart: 'ECOsmart',
};

const normalizeType = (type) => (typeof type === 'string' ? type.toLowerCase() : '');

const canonicalType = (type) => {
    const normalized = normalizeType(type);
    if (normalized === '220pump' || normalized === 'pump220v') return 'pump-220v';
    if (normalized === 'boilerpump' || normalized === 'boiler-pump') return 'boiler-pump';
    if (normalized === 'zoneservo' || normalized === 'zone-servo') return 'zoneServo';
    if (normalized === 'pressuresensor') return 'pressure-sensor';
    if (normalized === 'random_signal') return 'discrete_signal';
    if (normalized === 'ventilation') return 'discrete_ventilation';
    return normalized;
};

const getControllerType = (scheme) => canonicalType(
    typeof scheme?.controller === 'string' ? scheme.controller : scheme?.controller?.type,
);

const getConnectionTypes = (device) => String(device?.connection_type || '')
    .toLowerCase()
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);

const hasConnectionType = (device, connectionType) => getConnectionTypes(device).includes(connectionType);

const isOneWireThermostat = (device) => canonicalType(device?.type) === 'thermostat'
    && hasConnectionType(device, '1-wire');

const countThermostatFloorSensors = (device) => (
    Array.isArray(device?.additions)
        ? device.additions.filter((addition) => {
            const type = canonicalType(addition?.type);
            return (type === 'floor-sensor' || type === 'flask-sensor-floor') && hasConnectionType(addition, '1-wire');
        }).length
        : 0
);

const countIo4OnlyDeviceSlots = (device) => {
    const type = canonicalType(device?.type);
    if ((type !== '010pump' && type !== '010servo') || !hasConnectionType(device, 'di')) return 0;
    const ntcAdditions = Array.isArray(device?.additions)
        ? device.additions.filter((addition) => canonicalType(addition?.type) === 'mixing-ntc-sensor' && hasConnectionType(addition, 'ntc')).length
        : 0;
    return 1 + ntcAdditions;
};

const NTC_MODULE_CAPACITY = 6;
const NTC_MODULES_PER_ONE_WIRE_LINE = 2;

const isDirectNtcSensor = (sensor) => sensor?.device_type === 'sensor'
    && String(sensor?.connection_type || '').toLowerCase() === 'ntc';

const getNtcModuleFreeSlots = (device) => {
    const type = canonicalType(typeof device === 'string' ? device : device?.type);
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

const getRequiredNtcOneWireModuleCount = (scheme) => {
    const controllerType = getControllerType(scheme);
    const sensors = Array.isArray(scheme?.sensors) ? scheme.sensors : [];
    const directNtcSensors = sensors.filter(isDirectNtcSensor);
    const ecosmartBuiltInMixingNtcCount = controllerType === 'ecosmart'
        ? Math.min(2, directNtcSensors.filter((sensor) => canonicalType(sensor?.type) === 'mixing-ntc-sensor').length)
        : 0;
    const ntcSensorCount = Math.max(0, directNtcSensors.length - ecosmartBuiltInMixingNtcCount);
    const deficit = ntcSensorCount - getExistingNtcModuleFreeSlots(scheme);
    return Math.ceil(Math.max(0, deficit) / NTC_MODULE_CAPACITY);
};

const isNtcOneWireModule = (device) => canonicalType(typeof device === 'string' ? device : device?.type) === 'ntc-1-wire';

const isExtOneWireLineModule = (moduleItem) => {
    const type = canonicalType(typeof moduleItem === 'string' ? moduleItem : moduleItem?.type);
    return type === 'rl6' || type === 'rl6s';
};

const countNtcOneWireModules = (scheme) => {
    const controllerDevices = Array.isArray(scheme?.controller?.one_wire_devices) ? scheme.controller.one_wire_devices : [];
    const oneWireModules = Array.isArray(scheme?.one_wire_modules) ? scheme.one_wire_modules : [];
    const extOneWireDevices = (Array.isArray(scheme?.ext_modules) ? scheme.ext_modules : [])
        .flatMap((moduleItem) => (Array.isArray(moduleItem?.one_wire_devices) ? moduleItem.one_wire_devices : []));

    return [...controllerDevices, ...oneWireModules, ...extOneWireDevices]
        .filter(isNtcOneWireModule)
        .length;
};

const getOneWireLineCount = (extModules) => 1 + (Array.isArray(extModules) ? extModules.filter(isExtOneWireLineModule).length : 0);

const STRATEGY_SENSOR_AUTO_SOURCE = 'smart-boilers-strategy';

const syncStrategySensorForSmartBoilers = (scheme) => {
    const boilers = Array.isArray(scheme?.boilers) ? scheme.boilers : [];
    const sensors = Array.isArray(scheme?.sensors) ? scheme.sensors : [];
    const smartBoilersCount = boilers.filter((boiler) => canonicalType(boiler?.type) === 'smart').length;
    const hasStrategySensor = sensors.some((sensor) => canonicalType(sensor?.type) === 'flask-sensor-strategy');

    if (smartBoilersCount >= 2 && !hasStrategySensor) {
        return {
            ...scheme,
            sensors: [
                ...sensors,
                {
                    id: generateId(),
                    device_type: 'sensor',
                    type: 'flask-sensor-strategy',
                    connection_type: '1-wire|ntc',
                    _auto_source: STRATEGY_SENSOR_AUTO_SOURCE,
                },
            ],
        };
    }

    if (smartBoilersCount < 2) {
        const nextSensors = sensors.filter((sensor) => sensor?._auto_source !== STRATEGY_SENSOR_AUTO_SOURCE);
        if (nextSensors.length !== sensors.length) return { ...scheme, sensors: nextSensors };
    }

    return scheme;
};

const deviceHasMixingNtcAddition = (device) => Array.isArray(device?.additions)
    && device.additions.some((addition) => canonicalType(addition?.type) === 'mixing-ntc-sensor');

const isGroupedDevice = (device, group, templates) => {
    if (!device?._uid) return false;
    if (device._group) return device._group === group;

    if (group === 'mixing') {
        const type = canonicalType(device?.type);
        return type === '220servo' || ((type === '010pump' || type === '010servo') && deviceHasMixingNtcAddition(device));
    }

    if (group === 'pump' && deviceHasMixingNtcAddition(device)) return false;

    return templates.some((template) => canonicalType(template.wiredDevice?.type) === canonicalType(device?.type));
};

const getModuleAdjustedLimits = (scheme, controllerType) => {
    const baseLimits = CONTROLLER_LIMITS[controllerType];
    if (!baseLimits) return null;

    const limits = { ...baseLimits };
    const extModules = Array.isArray(scheme?.ext_modules) ? scheme.ext_modules : [];
    const diModules = Array.isArray(scheme?.di_modules) ? scheme.di_modules : [];
    const hasUps = Array.isArray(scheme?.power_modules) && scheme.power_modules.includes('ups');

    if (controllerType === 'pro' && hasUps) {
        limits.di = 0;
    }

    if (controllerType === 'pro') {
        extModules.forEach((moduleItem) => {
            const type = canonicalType(typeof moduleItem === 'string' ? moduleItem : moduleItem?.type);
            if (type === 'rl6' || type === 'rl6s') {
                if (type === 'rl6s') limits.relayS += 6;
                else limits.relay += 6;
                limits.oneWire += 6;
            }
            if (type === 'io4') {
                limits.di += 4;
                limits.io4Channels += 4;
                limits.analog420 += 4;
            }
            if (type === 'di6') {
                limits.di += 6;
            }
            if (type === 'bl2') {
                limits.bus += 1;
            }
        });
    }

    if (controllerType === 'smart2') {
        if (hasUps) limits.di = Math.max(0, limits.di - 2);
        diModules.forEach((moduleItem) => {
            const type = canonicalType(typeof moduleItem === 'string' ? moduleItem : moduleItem?.type);
            if (type === 'rl2' || type === 'rl2s') {
                if (type === 'rl2s') limits.relayS += 2;
                else limits.relay += 2;
                limits.di = Math.max(0, limits.di - 2);
            }
        });
    }

    return limits;
};

const getRelayStatsForLimits = (scheme, limits) => {
    const wiredDevices = Array.isArray(scheme?.wired_devices) ? scheme.wired_devices : [];
    const boilers = Array.isArray(scheme?.boilers) ? scheme.boilers : [];
    const isFlexibleRelayDevice = (device) => {
        const type = canonicalType(device?.type);
        if (type === 'zoneServo') return hasConnectionType(device, 'relay') && hasConnectionType(device, 'relay-s');
        return (type === 'boiler-pump' || type === 'pump-220v') && hasConnectionType(device, 'relay') && hasConnectionType(device, 'relay-s');
    };
    const flexibleRelayDevices = wiredDevices.filter(isFlexibleRelayDevice).length;
    const relayBoilers = boilers.filter((boiler) => hasConnectionType(boiler, 'relay')).length;
    const relayFromWired = wiredDevices.reduce((sum, device) => {
        const type = canonicalType(device?.type);
        if (isFlexibleRelayDevice(device)) return sum;
        if (type === 'boiler-pump' && hasConnectionType(device, 'relay')) return sum + 1;
        if (hasConnectionType(device, 'double_relay') && type !== '220servo') return sum + 2;
        if (hasConnectionType(device, 'relay') && !hasConnectionType(device, 'relay-s')) return sum + 1;
        return sum;
    }, 0);
    const strictRelay = relayBoilers + relayFromWired;
    const strictRelayS = wiredDevices.reduce((sum, device) => {
        const type = canonicalType(device?.type);
        if (isFlexibleRelayDevice(device)) return sum;
        if (type === '220servo' && hasConnectionType(device, 'double_relay')) return sum + 2;
        if (hasConnectionType(device, 'relay-s') && !hasConnectionType(device, 'relay')) return sum + 1;
        return sum;
    }, 0);
    const flexibleRelayOnRelay = Math.min(flexibleRelayDevices, Math.max(0, (limits?.relay || 0) - strictRelay));

    return {
        relay: strictRelay + flexibleRelayOnRelay,
        relayS: strictRelayS + (flexibleRelayDevices - flexibleRelayOnRelay),
        strictRelay,
        strictRelayS,
        flexibleRelayDevices,
        flexibleRelayOnRelay,
    };
};

const getCompatibilityStats = (scheme, controllerTypeOverride = null) => {
    const controllerType = controllerTypeOverride || getControllerType(scheme);
    const wiredDevices = Array.isArray(scheme?.wired_devices) ? scheme.wired_devices : [];
    const sensors = Array.isArray(scheme?.sensors) ? scheme.sensors : [];
    const boilers = Array.isArray(scheme?.boilers) ? scheme.boilers : [];
    const oneWireModules = Array.isArray(scheme?.one_wire_modules) ? scheme.one_wire_modules : [];
    const controller = scheme?.controller && typeof scheme.controller === 'object' ? scheme.controller : {};

    const oneWireFromWired = wiredDevices.reduce((sum, device) => (
        hasConnectionType(device, '1-wire') ? sum + 1 + countThermostatFloorSensors(device) : sum
    ), 0);
    const oneWireFromSensors = sensors.filter((sensor) => {
        const type = canonicalType(sensor?.type);
        const ecosmartNtcSensor = controllerType === 'ecosmart' && (type === 'flask-sensor-strategy' || type === 'flask-sensor-gvs-boiler');
        return hasConnectionType(sensor, '1-wire') && !ecosmartNtcSensor;
    }).length;
    const controllerOneWireDevices = Array.isArray(controller.one_wire_devices) ? controller.one_wire_devices : [];
    const oneWireThermostats = wiredDevices.filter(isOneWireThermostat).length
        + controllerOneWireDevices.filter(isOneWireThermostat).length;
    const requiredNtcModules = getRequiredNtcOneWireModuleCount(scheme);
    const totalNtcModules = countNtcOneWireModules(scheme) + requiredNtcModules;
    const requiredNtcOneWireLines = Math.ceil(totalNtcModules / NTC_MODULES_PER_ONE_WIRE_LINE);
    const oneWireLines = getOneWireLineCount(scheme?.ext_modules);
    const oneWire = oneWireFromWired + oneWireFromSensors + oneWireModules.length + requiredNtcModules;

    const bus = boilers.filter((boiler) => canonicalType(boiler?.type) === 'smart' && hasConnectionType(boiler, 'bus')).length;
    const relayLimits = getModuleAdjustedLimits(scheme, controllerType) || CONTROLLER_LIMITS[controllerType] || { relay: 0 };
    const { relay, relayS } = getRelayStatsForLimits(scheme, relayLimits);

    const diFromController = Array.isArray(controller.di_devices) ? controller.di_devices.length : 0;
    const diFromWired = wiredDevices.filter((device) => hasConnectionType(device, 'di')).length;
    const diFromSensors = sensors.filter((sensor) => hasConnectionType(sensor, 'di')).length;
    const di = diFromController + diFromWired + diFromSensors;
    const io4Only = wiredDevices.reduce((sum, device) => sum + countIo4OnlyDeviceSlots(device), 0);
    const analog420 = sensors.filter((sensor) => hasConnectionType(sensor, '4-20')).length;
    const ups = Array.isArray(scheme?.power_modules) && scheme.power_modules.includes('ups') ? 1 : 0;

    return { oneWire, oneWireThermostats, bus, relay, relayS, di, io4Only, analog420, ups, requiredNtcModules, totalNtcModules, requiredNtcOneWireLines, oneWireLines };
};

// идентификация ecosmart
const isEcosmartIdentified = (scheme) => {
    if (getControllerType(scheme) !== 'pro') return false;

    const controller = scheme?.controller && typeof scheme.controller === 'object' ? scheme.controller : {};
    const extModules = Array.isArray(scheme?.ext_modules) ? scheme.ext_modules : [];
    const controllerDevices = [
        ...Object.values(controller).filter(Array.isArray).flat(),
        ...extModules.flatMap((moduleItem) => (moduleItem && typeof moduleItem === 'object'
            ? Object.values(moduleItem).filter(Array.isArray).flat()
            : [])),
    ];
    const wiredDevices = [
        ...(Array.isArray(scheme?.wired_devices) ? scheme.wired_devices : []),
        ...controllerDevices,
    ];
    const sensors = [
        ...(Array.isArray(scheme?.sensors) ? scheme.sensors : []),
        ...controllerDevices.filter((device) => device?.device_type === 'sensor'),
    ];
    const boilers = Array.isArray(scheme?.boilers) ? scheme.boilers : [];

    const smartBoilers = boilers.filter((boiler) => canonicalType(boiler?.type) === 'smart' && hasConnectionType(boiler, 'bus')).length;
    const stupidBoilers = boilers.filter((boiler) => canonicalType(boiler?.type) === 'stupid').length;
    const boilerGvs = wiredDevices.filter((device) => canonicalType(device?.type) === 'boiler-pump').length;
    const mixing220 = wiredDevices.filter((device) => canonicalType(device?.type) === '220servo' && hasConnectionType(device, 'double_relay')).length;
    const pumps220 = wiredDevices.filter((device) => canonicalType(device?.type) === 'pump-220v').length;
    const pressure420 = sensors.filter((sensor) => canonicalType(sensor?.type) === 'pressure-sensor' && hasConnectionType(sensor, '4-20')).length;
    const leakSensors = sensors.filter((sensor) => canonicalType(sensor?.type) === 'leak-sensor' && hasConnectionType(sensor, 'di')).length;
    const valves = wiredDevices.filter((device) => canonicalType(device?.type) === 'valve').length;
    const discreteInputs = wiredDevices.filter((device) => DISCRETE_TEMPLATES.some((template) => canonicalType(template.data.type) === canonicalType(device?.type))).length;
    const io4Only = wiredDevices.reduce((sum, device) => sum + countIo4OnlyDeviceSlots(device), 0);
    const zoneServos = wiredDevices.filter((device) => canonicalType(device?.type) === 'zoneServo').length;
    const otherEquipment = wiredDevices.filter((device) => {
        const type = canonicalType(device?.type);
        return type === 'otherequipment' || type === 'other-equipment';
    }).length;

    return smartBoilers <= 2
        && stupidBoilers <= 1
        && boilerGvs <= 1
        && mixing220 <= 2
        && pumps220 <= 3
        && pressure420 <= 1
        && leakSensors <= 1
        && valves <= 1
        && discreteInputs <= 1
        && io4Only === 0
        && zoneServos === 0
        && otherEquipment === 0;
};

const getSmart2FreeDiPorts = (scheme) => {
    if (getControllerType(scheme) !== 'smart2') return 0;
    const stats = getCompatibilityStats(scheme, 'smart2');
    const usedByDiModules = (Array.isArray(scheme?.di_modules) ? scheme.di_modules : [])
        .map((moduleItem) => canonicalType(typeof moduleItem === 'string' ? moduleItem : moduleItem?.type))
        .filter((type) => type === 'rl2' || type === 'rl2s')
        .length * 2;
    const usedByUps = stats.ups > 0 ? 2 : 0;
    return Math.max(0, 4 - usedByUps - usedByDiModules - stats.di);
};

const getSmart2UsedDiPorts = (scheme) => {
    const stats = getCompatibilityStats(scheme, 'smart2');
    const usedByDiModules = (Array.isArray(scheme?.di_modules) ? scheme.di_modules : [])
        .map((moduleItem) => canonicalType(typeof moduleItem === 'string' ? moduleItem : moduleItem?.type))
        .filter((type) => type === 'rl2' || type === 'rl2s')
        .length * 2;
    const usedByUps = stats.ups > 0 ? 2 : 0;
    return usedByUps + usedByDiModules + stats.di;
};

const getControllerCompatibilityIssues = (scheme, controllerTypeOverride = null) => {
    const controllerType = controllerTypeOverride || getControllerType(scheme);
    const limits = getModuleAdjustedLimits(scheme, controllerType);
    if (!limits) return ['Не выбран поддерживаемый контроллер.'];

    const stats = getCompatibilityStats(scheme, controllerType);
    const issues = [];
    const addCapacityIssue = (label, current, limit) => {
        if (current > limit) issues.push(`${label}: требуется ${current}, доступно ${limit}.`);
    };

    addCapacityIssue('Relay-слоты', stats.relay, limits.relay);
    addCapacityIssue('Relay-S слоты', stats.relayS, limits.relayS);
    addCapacityIssue('BUS-слоты для умных котлов', stats.bus, limits.bus);
    addCapacityIssue('1-wire устройства', stats.oneWire, limits.oneWire);
    if (stats.requiredNtcOneWireLines > stats.oneWireLines) {
        issues.push(`1-wire линии для NTC-1-wire: требуется ${stats.requiredNtcOneWireLines}, доступно ${stats.oneWireLines}.`);
    }
    if ((controllerType === 'go' || controllerType === 'go+') && stats.oneWireThermostats > GO_ONE_WIRE_THERMOSTAT_LIMIT) {
        issues.push(`1-wire термостаты для ${CONTROLLER_LABELS[controllerType]}: требуется ${stats.oneWireThermostats}, доступно ${GO_ONE_WIRE_THERMOSTAT_LIMIT}.`);
    }
    if (stats.io4Only > 0 && controllerType !== 'pro' && controllerType !== 'ecosmart') {
        issues.push('0-10V устройства требуют io4, доступный только для pro или ecosmart.');
    }
    addCapacityIssue('DI-входы', stats.di, limits.di);
    if (controllerType === 'smart2') {
        const usedDiPorts = getSmart2UsedDiPorts(scheme);
        if (usedDiPorts > 4) {
            issues.push(`DI-порты smart2: требуется ${usedDiPorts}, доступно 4.`);
        }
    }
    addCapacityIssue('io4 channel-слоты для 0-10V устройств', stats.io4Only, limits.io4Channels);
    addCapacityIssue('4-20 входы', stats.analog420, limits.analog420);
    if (stats.ups > 0 && !limits.power) {
        issues.push('UPS требует контроллер с power-линией: smart2 или pro.');
    }

    return issues;
};

const getControllerRecommendation = (scheme, controllerType) => {
    const baseLimits = CONTROLLER_LIMITS[controllerType];
    if (!baseLimits) return { compatible: false, modules: [] };

    if (controllerType === 'ecosmart') {
        return { compatible: isEcosmartIdentified(scheme), modules: [] };
    }

    const stats = getCompatibilityStats(scheme, controllerType);
    const modules = [];
    let limits = { ...baseLimits };
    const addModules = (type, count) => {
        if (count > 0) modules.push(`${type} x${count}`);
    };

    addModules('ntc-1-wire', stats.requiredNtcModules);

    if (controllerType === 'smart2') {
        if (stats.ups > 0) limits.di = Math.max(0, limits.di - 2);
        const baseRelayStats = getRelayStatsForLimits(scheme, limits);
        const relayDeficit = Math.max(0, baseRelayStats.relay - limits.relay);
        const flexibleRelayOverflow = Math.max(0, baseRelayStats.flexibleRelayDevices - baseRelayStats.flexibleRelayOnRelay);
        const freeRelaySSlots = Math.max(0, limits.relayS - baseRelayStats.strictRelayS);
        const flexibleRelayOverflowBeyondRelayS = Math.max(0, flexibleRelayOverflow - freeRelaySSlots);
        const rl2Count = Math.max(
            Math.ceil(relayDeficit / 2),
            Math.ceil(flexibleRelayOverflowBeyondRelayS / 2),
        );
        const relayStatsAfterRelayModules = getRelayStatsForLimits(scheme, {
            ...limits,
            relay: limits.relay + rl2Count * 2,
        });
        const relaySDeficit = Math.max(0, relayStatsAfterRelayModules.relayS - limits.relayS);
        const rl2sCount = Math.ceil(relaySDeficit / 2);
        const requiredDiForModules = (rl2Count + rl2sCount) * 2;
        if (requiredDiForModules > Math.max(0, limits.di - stats.di)) {
            return { compatible: false, modules };
        }
        limits.relay += rl2Count * 2;
        limits.relayS += rl2sCount * 2;
        limits.di = Math.max(0, limits.di - (rl2Count + rl2sCount) * 2);
        addModules('rl2', rl2Count);
        addModules('rl2s', rl2sCount);
    }

    if (controllerType === 'pro' || controllerType === 'ecosmart') {
        let oneWireLineCount = stats.oneWireLines;
        if (controllerType === 'pro') {
            const busDeficit = Math.max(0, stats.bus - limits.bus);
            const bl2Count = busDeficit;
            limits.bus += bl2Count;
            addModules('bl2', bl2Count);
        }

        const baseRelayStats = getRelayStatsForLimits(scheme, limits);
        const relayDeficit = Math.max(0, baseRelayStats.relay - limits.relay);
        const flexibleRelayOverflow = Math.max(0, baseRelayStats.flexibleRelayDevices - baseRelayStats.flexibleRelayOnRelay);
        const freeRelaySSlots = Math.max(0, limits.relayS - baseRelayStats.strictRelayS);
        const flexibleRelayOverflowBeyondRelayS = Math.max(0, flexibleRelayOverflow - freeRelaySSlots);
        const relayModuleCount = Math.max(
            Math.ceil(relayDeficit / 6),
            Math.ceil(flexibleRelayOverflowBeyondRelayS / 6),
        );
        limits.relay += relayModuleCount * 6;
        limits.oneWire += relayModuleCount * 6;
        oneWireLineCount += relayModuleCount;
        const relayStatsAfterRelayModules = getRelayStatsForLimits(scheme, limits);
        const relaySDeficit = Math.max(0, relayStatsAfterRelayModules.relayS - limits.relayS);
        const relaySModuleCount = Math.ceil(relaySDeficit / 6);
        limits.relayS += relaySModuleCount * 6;
        limits.oneWire += relaySModuleCount * 6;
        oneWireLineCount += relaySModuleCount;
        const ntcLineModuleCount = Math.max(0, stats.requiredNtcOneWireLines - oneWireLineCount);
        const oneWireCapacityModuleCount = Math.ceil(Math.max(0, stats.oneWire - limits.oneWire) / 6);
        const oneWireModuleCount = Math.max(ntcLineModuleCount, oneWireCapacityModuleCount);
        limits.oneWire += oneWireModuleCount * 6;
        oneWireLineCount += oneWireModuleCount;
        limits.relay += oneWireModuleCount * 6;
        addModules('rl6', relayModuleCount + oneWireModuleCount);
        addModules('rl6s', relaySModuleCount);

        const analogDeficit = Math.max(0, stats.analog420 - limits.analog420);
        const io4OnlyDeficit = Math.max(0, stats.io4Only - limits.io4Channels);
        const io4Count = Math.max(
            Math.ceil(analogDeficit / 4),
            Math.ceil(io4OnlyDeficit / 4),
        );
        limits.analog420 += io4Count * 4;
        limits.io4Channels += io4Count * 4;
        limits.di += io4Count * 4;
        addModules('io4', io4Count);

        const diDeficit = Math.max(0, stats.di - limits.di);
        const di6Count = Math.ceil(diDeficit / 6);
        limits.di += di6Count * 6;
        addModules('di6', di6Count);
    }

    const finalRelayStats = getRelayStatsForLimits(scheme, limits);
    const compatible = finalRelayStats.relay <= limits.relay
        && finalRelayStats.relayS <= limits.relayS
        && stats.bus <= limits.bus
        && stats.oneWire <= limits.oneWire
        && stats.requiredNtcOneWireLines <= stats.oneWireLines + modules.reduce((sum, item) => {
            const match = String(item).match(/^(rl6|rl6s) x(\d+)$/);
            return match ? sum + Number(match[2]) : sum;
        }, 0)
        && ((controllerType !== 'go' && controllerType !== 'go+') || stats.oneWireThermostats <= GO_ONE_WIRE_THERMOSTAT_LIMIT)
        && stats.di <= limits.di
        && stats.io4Only <= limits.io4Channels
        && stats.analog420 <= limits.analog420
        && (stats.ups === 0 || limits.power);

    return { compatible, modules };
};

const getCompatibleControllerOptions = (scheme) => CONTROLLER_TEMPLATES
    .map((item) => ({
        type: item.value.type,
        label: item.label,
        ...getControllerRecommendation(scheme, item.value.type),
    }))
    .filter((item) => item.compatible);

const getControllerTemplateValue = (controllerType) => {
    const template = CONTROLLER_TEMPLATES.find((item) => item.value.type === controllerType);
    return template ? { ...template.value } : null;
};

const makeExtModule = (type) => ({
    id: generateId(),
    type,
    device_type: 'module',
    connection_type: 'EXT',
});

const makeDiModule = (type) => ({
    id: generateId(),
    type,
    device_type: 'module',
    connection_type: 'DI',
});

const makeOneWireModule = (type) => ({
    id: generateId(),
    type,
    device_type: 'module',
    connection_type: '1-wire',
});

const makeEcosmartBl2Module = () => ({
    id: 0,
    device_type: 'module',
    type: 'ecosmartbl2',
    connection_type: 'ecosmartbl2',
});

const getBusSmartBoilerCount = (scheme) => (Array.isArray(scheme?.boilers) ? scheme.boilers : [])
    .filter((boiler) => canonicalType(boiler?.type) === 'smart' && hasConnectionType(boiler, 'bus'))
    .length;

const withRequiredEcosmartBl2 = (scheme) => {
    if (getControllerType(scheme) !== 'ecosmart') return scheme;
    const currentModules = Array.isArray(scheme?.ecosmart_bl2) ? scheme.ecosmart_bl2 : [];
    if (getBusSmartBoilerCount(scheme) < 2) {
        if (currentModules.length === 0) return scheme;
        const nextModules = currentModules.filter((moduleItem) => canonicalType(moduleItem?.type) !== 'ecosmartbl2');
        if (nextModules.length === currentModules.length) return scheme;
        if (nextModules.length === 0) {
            const { ecosmart_bl2: removedEcosmartBl2, ...rest } = scheme;
            return rest;
        }
        return { ...scheme, ecosmart_bl2: nextModules };
    }
    if (currentModules.some((moduleItem) => canonicalType(moduleItem?.type) === 'ecosmartbl2')) return scheme;
    return {
        ...scheme,
        ecosmart_bl2: [
            ...currentModules,
            makeEcosmartBl2Module(),
        ],
    };
};

const moveExtModuleDevicesToPublicLines = (scheme) => {
    const extModules = Array.isArray(scheme?.ext_modules) ? scheme.ext_modules : [];
    if (extModules.length === 0) return scheme;

    const nextBoilers = Array.isArray(scheme.boilers) ? [...scheme.boilers] : [];
    const nextSensors = Array.isArray(scheme.sensors) ? [...scheme.sensors] : [];
    const nextWiredDevices = Array.isArray(scheme.wired_devices) ? [...scheme.wired_devices] : [];
    const nextOneWireModules = Array.isArray(scheme.one_wire_modules) ? [...scheme.one_wire_modules] : [];
    const pushDevice = (device) => {
        if (!device || typeof device !== 'object') return;
        const deviceType = canonicalType(device?.device_type);
        const type = canonicalType(device?.type);
        if (deviceType === 'boiler' || type === 'smart' || type === 'stupid') {
            nextBoilers.push(device);
            return;
        }
        if (deviceType === 'sensor') {
            nextSensors.push(device);
            return;
        }
        if (type === 'ntc-1-wire' || type === 'rdt2') {
            nextOneWireModules.push(device);
            return;
        }
        nextWiredDevices.push(device);
    };

    extModules.forEach((moduleItem) => {
        if (!moduleItem || typeof moduleItem !== 'object') return;
        [
            'bus_devices',
            'relay_devices',
            'relay_s_devices',
            'channel_devices',
            'di_devices',
            'one_wire_devices',
        ].forEach((lineKey) => {
            if (Array.isArray(moduleItem[lineKey])) moduleItem[lineKey].forEach(pushDevice);
        });
    });

    const { ext_modules: removedExtModules, ...rest } = scheme;
    return {
        ...rest,
        boilers: nextBoilers,
        sensors: nextSensors,
        wired_devices: nextWiredDevices,
        one_wire_modules: nextOneWireModules,
    };
};

const withoutEcosmartStupidBoilerSensor = (scheme) => {
    const isStupidBoilerSensor = (device) => canonicalType(device?.type) === 'flask-sensor-stupid-boiler';
    const controller = scheme?.controller && typeof scheme.controller === 'object' ? scheme.controller : null;
    const nextController = controller && Array.isArray(controller.one_wire_devices)
        ? {
            ...controller,
            one_wire_devices: controller.one_wire_devices.filter((device) => !isStupidBoilerSensor(device)),
        }
        : controller;

    return {
        ...scheme,
        ...(nextController ? { controller: nextController } : {}),
        sensors: Array.isArray(scheme?.sensors)
            ? scheme.sensors.filter((sensor) => !isStupidBoilerSensor(sensor))
            : scheme?.sensors,
    };
};

const moveEcosmartWiredThermostatsToExtLine = (scheme) => {
    if (getControllerType(scheme) !== 'ecosmart') return scheme;
    const wiredDevices = Array.isArray(scheme?.wired_devices) ? scheme.wired_devices : [];
    const controller = scheme?.controller && typeof scheme.controller === 'object' ? scheme.controller : {};
    const currentExtDevices = Array.isArray(controller.ext_devices) ? controller.ext_devices : [];
    let availableExtSlots = Math.max(0, ECOSMART_EXT_DEVICE_CAPACITY - currentExtDevices.length);
    const nextWiredDevices = [];
    const extThermostats = [];

    wiredDevices.forEach((device) => {
        const shouldPreferExt = isOneWireThermostat(device) && countThermostatFloorSensors(device) > 0;
        if (shouldPreferExt && availableExtSlots > 0) {
            availableExtSlots -= 1;
            extThermostats.push({
                ...device,
                connection_type: 'EXT',
            });
            return;
        }
        nextWiredDevices.push(device);
    });

    if (extThermostats.length === 0) return scheme;

    return {
        ...scheme,
        controller: {
            ...controller,
            ext_devices: [
                ...currentExtDevices,
                ...extThermostats,
            ],
        },
        wired_devices: nextWiredDevices,
    };
};

const normalizeModulesForController = (scheme) => {
    const controllerType = getControllerType(scheme);
    let nextScheme = scheme;

    if (controllerType === 'smart2') {
        if (Array.isArray(nextScheme.ext_modules) && nextScheme.ext_modules.length > 0) {
            const { ext_modules: removedExtModules, ...rest } = nextScheme;
            nextScheme = rest;
        }
        return nextScheme;
    }

    if (controllerType === 'pro') {
        if (Array.isArray(nextScheme.di_modules) && nextScheme.di_modules.length > 0) {
            const { di_modules: removedDiModules, ...rest } = nextScheme;
            nextScheme = rest;
        }
        return nextScheme;
    }

    if (controllerType === 'ecosmart') {
        nextScheme = moveExtModuleDevicesToPublicLines(nextScheme);
        nextScheme = moveEcosmartWiredThermostatsToExtLine(nextScheme);
        nextScheme = withoutEcosmartStupidBoilerSensor(nextScheme);
        if (Array.isArray(nextScheme.di_modules) && nextScheme.di_modules.length > 0) {
            const { di_modules: removedDiModules, ...rest } = nextScheme;
            nextScheme = rest;
        }
        return withRequiredEcosmartBl2(nextScheme);
    }

    if (controllerType === 'go' || controllerType === 'go+') {
        if (!Object.prototype.hasOwnProperty.call(nextScheme, 'ext_modules') && !Object.prototype.hasOwnProperty.call(nextScheme, 'di_modules')) {
            return nextScheme;
        }
        const { ext_modules: removedExtModules, di_modules: removedDiModules, ...rest } = nextScheme;
        return rest;
    }

    return nextScheme;
};

const withRequiredModules = (scheme) => {
    scheme = normalizeModulesForController(scheme);
    const controllerType = getControllerType(scheme);

    const stats = getCompatibilityStats(scheme, controllerType);
    let limits = getModuleAdjustedLimits(scheme, controllerType);
    if (!limits) return scheme;

    let extModules = Array.isArray(scheme?.ext_modules) ? [...scheme.ext_modules] : [];
    let diModules = Array.isArray(scheme?.di_modules) ? [...scheme.di_modules] : [];
    let oneWireModules = Array.isArray(scheme?.one_wire_modules) ? [...scheme.one_wire_modules] : [];
    let changed = false;

    if (stats.requiredNtcModules > 0) {
        oneWireModules = [
            ...oneWireModules,
            ...Array.from({ length: stats.requiredNtcModules }, () => makeOneWireModule('ntc-1-wire')),
        ];
        changed = true;
    }

    if (controllerType === 'smart2') {
        const baseRelayStats = getRelayStatsForLimits(scheme, limits);
        const relayDeficit = Math.max(0, baseRelayStats.relay - limits.relay);
        const flexibleRelayOverflow = Math.max(0, baseRelayStats.flexibleRelayDevices - baseRelayStats.flexibleRelayOnRelay);
        const freeRelaySSlots = Math.max(0, limits.relayS - baseRelayStats.strictRelayS);
        const flexibleRelayOverflowBeyondRelayS = Math.max(0, flexibleRelayOverflow - freeRelaySSlots);
        const moduleCount = Math.max(
            Math.ceil(relayDeficit / 2),
            Math.ceil(flexibleRelayOverflowBeyondRelayS / 2),
        );
        const relayStatsAfterRelayModules = getRelayStatsForLimits(scheme, {
            ...limits,
            relay: limits.relay + moduleCount * 2,
        });
        const relaySDeficit = Math.max(0, relayStatsAfterRelayModules.relayS - limits.relayS);
        const relaySModuleCount = Math.ceil(relaySDeficit / 2);
        const requiredDiForModules = (moduleCount + relaySModuleCount) * 2;
        if (requiredDiForModules > Math.max(0, limits.di - stats.di)) return scheme;
        if (moduleCount <= 0 && relaySModuleCount <= 0) {
            return changed ? { ...scheme, one_wire_modules: oneWireModules } : scheme;
        }

        diModules = [
            ...diModules,
            ...Array.from({ length: moduleCount }, () => makeDiModule('rl2')),
            ...Array.from({ length: relaySModuleCount }, () => makeDiModule('rl2s')),
        ];

        return { ...scheme, di_modules: diModules, one_wire_modules: oneWireModules };
    }

    if (controllerType === 'ecosmart') {
        return withRequiredEcosmartBl2(changed ? { ...scheme, one_wire_modules: oneWireModules } : scheme);
    }

    if (controllerType !== 'pro') {
        return changed ? { ...scheme, one_wire_modules: oneWireModules } : scheme;
    }

    const baseRelayStats = getRelayStatsForLimits(scheme, limits);
    const relayDeficit = Math.max(0, baseRelayStats.relay - limits.relay);
    const flexibleRelayOverflow = Math.max(0, baseRelayStats.flexibleRelayDevices - baseRelayStats.flexibleRelayOnRelay);
    const freeRelaySSlots = Math.max(0, limits.relayS - baseRelayStats.strictRelayS);
    const flexibleRelayOverflowBeyondRelayS = Math.max(0, flexibleRelayOverflow - freeRelaySSlots);
    const relayModuleCount = Math.max(
        Math.ceil(relayDeficit / 6),
        Math.ceil(flexibleRelayOverflowBeyondRelayS / 6),
    );

    if (controllerType === 'pro') {
        const busDeficit = Math.max(0, stats.bus - limits.bus);
        const bl2Count = busDeficit;
        if (bl2Count > 0) {
            extModules = [
                ...extModules,
                ...Array.from({ length: bl2Count }, () => makeExtModule('bl2')),
            ];
            changed = true;
            limits = {
                ...limits,
                bus: limits.bus + bl2Count,
            };
        }
    }

    if (relayModuleCount > 0) {
        extModules = [
            ...extModules,
            ...Array.from({ length: relayModuleCount }, () => makeExtModule('rl6')),
        ];
        changed = true;
        limits = {
            ...limits,
            relay: limits.relay + relayModuleCount * 6,
            oneWire: limits.oneWire + relayModuleCount * 6,
        };
    }

    const relayStatsAfterRelayModules = getRelayStatsForLimits(scheme, limits);
    const relaySDeficit = Math.max(0, relayStatsAfterRelayModules.relayS - limits.relayS);
    const relaySModuleCount = Math.ceil(relaySDeficit / 6);
    if (relaySModuleCount > 0) {
        extModules = [
            ...extModules,
            ...Array.from({ length: relaySModuleCount }, () => makeExtModule('rl6s')),
        ];
        changed = true;
        limits = {
            ...limits,
            relayS: limits.relayS + relaySModuleCount * 6,
            oneWire: limits.oneWire + relaySModuleCount * 6,
        };
    }

    const ntcLineModuleCount = Math.max(0, stats.requiredNtcOneWireLines - getOneWireLineCount(extModules));
    const oneWireCapacityModuleCount = Math.ceil(Math.max(0, stats.oneWire - limits.oneWire) / 6);
    const oneWireModuleCount = Math.max(ntcLineModuleCount, oneWireCapacityModuleCount);
    if (oneWireModuleCount > 0) {
        extModules = [
            ...extModules,
            ...Array.from({ length: oneWireModuleCount }, () => makeExtModule('rl6')),
        ];
        changed = true;
        limits = {
            ...limits,
            relay: limits.relay + oneWireModuleCount * 6,
            oneWire: limits.oneWire + oneWireModuleCount * 6,
        };
    }

    const analogDeficit = Math.max(0, stats.analog420 - limits.analog420);
    const io4OnlyDeficit = Math.max(0, stats.io4Only - limits.io4Channels);
    const io4Count = Math.max(
        Math.ceil(analogDeficit / 4),
        Math.ceil(io4OnlyDeficit / 4),
    );
    if (io4Count > 0) {
        extModules = [
            ...extModules,
            ...Array.from({ length: io4Count }, () => makeExtModule('io4')),
        ];
        changed = true;
        limits = {
            ...limits,
            analog420: limits.analog420 + io4Count * 4,
            io4Channels: limits.io4Channels + io4Count * 4,
            di: limits.di + io4Count * 4,
        };
    }

    const diDeficit = Math.max(0, stats.di - limits.di);
    const di6Count = Math.ceil(diDeficit / 6);
    if (di6Count > 0) {
        extModules = [
            ...extModules,
            ...Array.from({ length: di6Count }, () => makeExtModule('di6')),
        ];
        changed = true;
    }

    if (!changed) return scheme;
    return { ...scheme, ext_modules: extModules, one_wire_modules: oneWireModules };
};

const resolveControllerAndRequiredModules = (scheme) => {
    scheme = normalizeModulesForController(scheme);
    const currentControllerIssues = getControllerCompatibilityIssues(scheme);
    if (currentControllerIssues.length > 0) {
        const compatibleOption = getCompatibleControllerOptions(scheme)[0] || null;
        const controllerValue = compatibleOption ? getControllerTemplateValue(compatibleOption.type) : null;
        if (controllerValue) {
            return withRequiredModules({ ...scheme, controller: controllerValue });
        }
    }

    return withRequiredModules(scheme);
};

const UPS_TEMPLATES = [
    { label: 'Источник бесперебойного питания', value: 'ups' },
];

const DISCRETE_TEMPLATES = [
    { label: 'Запрос тепла от бассейна', data: { id: 8, device_type: 'equipment', type: 'discrete_pool', connection_type: 'di' } },
    { label: 'Запрос тепла от вентиляции', data: { id: 8, device_type: 'equipment', type: 'discrete_ventilation', connection_type: 'di' } },
    { label: 'Датчик ОПС', data: { id: 9, device_type: 'equipment', type: 'discrete_fire_alarm', connection_type: 'di' } },
    { label: 'Произвольный сигнал', data: { id: 10, device_type: 'equipment', type: 'discrete_signal', connection_type: 'di' } },
];

const PRESSURE_TEMPLATES = [
    {
        label: 'Токовый датчик давления',
        data: { id: 4, device_type: 'sensor', type: 'pressure-sensor', connection_type: '4-20' },
    },
];

const LEAK_TEMPLATES = [
    {
        label: 'Датчик защиты от протечки',
        target: 'sensors',
        data: { id: 1, device_type: 'sensor', type: 'leak-sensor', connection_type: 'di' },
    },
    {
        label: 'Запорный клапан',
        target: 'wired',
        data: { id: 0, device_type: 'equipment', type: 'valve', connection_type: 'double_relay', additions: [] },
    },
];

const THERMOSTAT_TEMPLATES = [
    { label: 'Проводной черный термостат без датчика пола', target: 'wired', data: { id: 0, device_type: 'thermostat', type: 'thermostat', connection_type: '1-wire', color: 'black', additions: [] } },
    { label: 'Проводной белый термостат без датчика пола', target: 'wired', data: { id: 0, device_type: 'thermostat', type: 'thermostat', connection_type: '1-wire', color: 'white', additions: [] } },
    { label: 'Проводной серый термостат без датчика пола', target: 'wired', data: { id: 0, device_type: 'thermostat', type: 'thermostat', connection_type: '1-wire', color: 'gray', additions: [] } },
    { label: 'Проводной черный термостат с датчиком пола', target: 'wired', data: { id: 0, device_type: 'thermostat', type: 'thermostat', connection_type: '1-wire', color: 'black', additions: [{ id: 0, type: 'flask-sensor-floor', connection_type: '1-wire' }] } },
    { label: 'Проводной белый термостат с датчиком пола', target: 'wired', data: { id: 0, device_type: 'thermostat', type: 'thermostat', connection_type: '1-wire', color: 'white', additions: [{ id: 0, type: 'flask-sensor-floor', connection_type: '1-wire' }] } },
    { label: 'Проводной серый термостат с датчиком пола', target: 'wired', data: { id: 0, device_type: 'thermostat', type: 'thermostat', connection_type: '1-wire', color: 'gray', additions: [{ id: 0, type: 'flask-sensor-floor', connection_type: '1-wire' }] } },
    { label: 'Беспроводной черный термостат с датчиком пола', target: 'wireless', data: { id: 0, device_type: 'thermostat', type: 'thermostat', color: 'black', additions: [{ id: 0, device_type: 'sensor', type: 'flask-sensor-floor', connection_type: '1-wire' }] } },
    { label: 'Беспроводной белый термостат с датчиком пола', target: 'wireless', data: { id: 0, device_type: 'thermostat', type: 'thermostat', color: 'white', additions: [{ id: 0, device_type: 'sensor', type: 'flask-sensor-floor', connection_type: '1-wire' }] } },
    { label: 'Беспроводной серый термостат с датчиком пола', target: 'wireless', data: { id: 0, device_type: 'thermostat', type: 'thermostat', color: 'gray', additions: [{ id: 0, device_type: 'sensor', type: 'flask-sensor-floor', connection_type: '1-wire' }] } },
    { label: 'Беспроводной черный термостат без датчика пола', target: 'wireless', data: { id: 0, device_type: 'thermostat', type: 'thermostat', color: 'black', additions: [] } },
    { label: 'Беспроводной белый термостат без датчика пола', target: 'wireless', data: { id: 0, device_type: 'thermostat', type: 'thermostat', color: 'white', additions: [] } },
    { label: 'Беспроводной серый термостат без датчика пола', target: 'wireless', data: { id: 0, device_type: 'thermostat', type: 'thermostat', color: 'gray', additions: [] } },
];

const TEMPERATURE_SENSOR_TEMPLATES = [
    {
        label: 'Беспроводной уличный датчик температуры',
        target: 'wireless_devices',
        data: {
            id: 3,
            device_type: 'sensor',
            type: 'outdoor-temperature-sensor',
            additions: [],
        },
    },
    {
        label: 'Беспроводной настенный датчик температуры',
        target: 'wireless_devices',
        data: {
            id: 4,
            device_type: 'sensor',
            type: 'wall-temperature-sensor',
            additions: [],
        },
    },
    {
        label: 'Проводной настенный цифровой датчик',
        target: 'sensors',
        data: {
            id: 13,
            device_type: 'sensor',
            type: 'wall-digital-sensor',
            connection_type: '1-wire',
        },
    },
    {
        label: 'Проводной цифровой датчик в колбе',
        target: 'sensors',
        data: {
            id: 12,
            device_type: 'sensor',
            type: 'flask-sensor-temperature',
            connection_type: '1-wire',
        },
    },
    {
        label: 'Проводной NTC датчик в колбе',
        target: 'sensors',
        data: {
            id: 3,
            device_type: 'sensor',
            type: 'ntc-sensor',
            connection_type: 'ntc',
        },
    },
    {
        label: 'Проводной настенный NTC датчик',
        target: 'sensors',
        data: {
            id: 3,
            device_type: 'sensor',
            type: 'wall-ntc-sensor',
            connection_type: 'ntc',
        },
    },
];

const TEMPERATURE_SENSOR_TYPES = new Set(TEMPERATURE_SENSOR_TEMPLATES.map((template) => canonicalType(template.data.type)));
const isTemperatureSensor = (device) => TEMPERATURE_SENSOR_TYPES.has(canonicalType(device?.type));

const OTHER_EQUIP_TEMPLATES = [
    {
        label: 'Прочее оборудование',
        wiredDevice: {
            id: 4,
            device_type: 'equipment',
            type: 'otherEquipment',
            connection_type: 'relay',
            additions: [],
        },
        sensors: [],
    },
];

const ZONE_TEMPLATES = [
    {
        label: 'Зона',
        wiredDevice: {
            id: 20,
            device_type: 'equipment',
            type: 'zoneServo',
            connection_type: 'relay | relay-s',
            additions: [],
        },
        sensors: [],
    },
];

const PUMP_TEMPLATES = [
    {
        label: 'Насос 220',
        wiredDevice: {
            id: 12,
            device_type: 'equipment',
            type: '220pump',
            connection_type: 'relay|relay-s',
            additions: [],
        },
        sensors: [],
    },
    {
        label: 'Насос 010',
        wiredDevice: {
            id: 13,
            device_type: 'equipment',
            type: '010pump',
            connection_type: 'di',
            additions: [],
        },
        sensors: [],
    },
];

const GVS_TEMPLATES = [
    {
        label: 'Бойлер ГВС',
        wiredDevice: {
            id: 14,
            device_type: 'equipment',
            type: 'boilerPump',
            connection_type: 'relay|relay-s',
            additions: [],
        },
        sensors: [
            { id: 8, device_type: 'sensor', type: 'flask-sensor-gvs-boiler', connection_type: '1-wire|ntc' },
        ],
    },
];

const MIXING_TEMPLATES = [
    {
        label: 'Сервопривод 220 с цифровым датчиком',
        wiredDevice: {
            id: 0,
            device_type: 'equipment',
            type: '220servo',
            connection_type: 'double_relay',
            additions: [],
        },
        sensors: [
            { id: 10, device_type: 'sensor', type: 'flask-sensor-mixing-unit', connection_type: '1-wire' },
        ],
    },
    {
        label: 'Сервопривод 220 с NTC датчиком',
        wiredDevice: {
            id: 0,
            device_type: 'equipment',
            type: '220servo',
            connection_type: 'double_relay',
            additions: [],
        },
        sensors: [
            { id: 1, device_type: 'sensor', type: 'mixing-ntc-sensor', connection_type: 'ntc' },
        ],
    },
    {
        label: 'Насос 0-10v с NTC датчиком',
        wiredDevice: {
            id: 13,
            device_type: 'equipment',
            type: '010pump',
            connection_type: 'di',
            additions: [
                { id: 1, device_type: 'sensor', type: 'mixing-ntc-sensor', connection_type: 'ntc' },
            ],
        },
        sensors: [],
    },
];

const JsonView = ({ data, name }) => {
    const [collapsed, setCollapsed] = useState({});

    const toggle = (key) => {
        setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const renderValue = (value, key) => {
        if (value === null) return <span style={{ color: '#999' }}>null</span>;
        if (typeof value === 'boolean') return <span style={{ color: '#e67e22' }}>{String(value)}</span>;
        if (typeof value === 'number') return <span style={{ color: '#2980b9' }}>{value}</span>;
        if (typeof value === 'string') return <span style={{ color: '#27ae60' }}>"{value}"</span>;
        if (Array.isArray(value)) return renderArray(value, key);
        if (typeof value === 'object') return renderObject(value, key);
        return String(value);
    };

    const renderArray = (arr, key) => {
        const isCollapsed = collapsed[key];
        return (
            <div style={{ marginLeft: 16 }}>
                <span
                    onClick={() => toggle(key)}
                    style={{ cursor: 'pointer', userSelect: 'none', color: '#7f8c8d' }}
                >
                    {isCollapsed ? '▶' : '▼'} [{arr.length}]
                </span>
                {!isCollapsed && (
                    <div>
                        {arr.map((item, index) => (
                            <div key={index} style={{ marginLeft: 16, borderLeft: '1px solid #ddd', paddingLeft: 8 }}>
                                <span style={{ color: '#7f8c8d' }}>{index}: </span>
                                {renderValue(item, `${key}[${index}]`)}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderObject = (obj, key) => {
        const isCollapsed = collapsed[key];
        const entries = Object.entries(obj);
        return (
            <div style={{ marginLeft: 16 }}>
                <span
                    onClick={() => toggle(key)}
                    style={{ cursor: 'pointer', userSelect: 'none', color: '#7f8c8d' }}
                >
                    {isCollapsed ? '▶' : '▼'} {'{...}'}
                </span>
                {!isCollapsed && (
                    <div>
                        {entries.map(([k, v]) => (
                            <div key={k} style={{ marginLeft: 16 }}>
                                <span style={{ color: '#8e44ad' }}>"{k}"</span>: {renderValue(v, `${key}.${k}`)}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{ fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6 }}>
            <div>
                <span style={{ color: '#8e44ad' }}>"{name}"</span>: {renderValue(data, name)}
            </div>
        </div>
    );
};

const SelectionApp = () => {
    const [incomingScheme, setIncomingScheme] = useState({
        controller: { type: 'go', relay_devices: [], one_wire_devices: [], bus_devices: [] },
    });
    const controllerCompatibilityIssues = useMemo(
        () => getControllerCompatibilityIssues(incomingScheme),
        [incomingScheme],
    );
    const compatibleControllerOptions = useMemo(
        () => getCompatibleControllerOptions(incomingScheme),
        [incomingScheme],
    );
    const controllerType = getControllerType(incomingScheme);
    const ecosmartAvailableForProScheme = useMemo(
        () => controllerType === 'pro' && isEcosmartIdentified(incomingScheme),
        [controllerType, incomingScheme],
    );
    const ecosmartIncomingScheme = useMemo(() => {
        if (!ecosmartAvailableForProScheme) return null;
        const controllerValue = getControllerTemplateValue('ecosmart');
        if (!controllerValue) return null;
        return withRequiredModules({ ...incomingScheme, controller: controllerValue });
    }, [ecosmartAvailableForProScheme, incomingScheme]);

    useEffect(() => {
        const nextScheme = resolveControllerAndRequiredModules(incomingScheme);
        if (nextScheme !== incomingScheme) {
            setIncomingScheme(nextScheme);
        }
    }, [incomingScheme]);

    const addBoiler = useCallback((template) => {
        setIncomingScheme((prev) => {
            const boilers = Array.isArray(prev.boilers) ? [...prev.boilers] : [];
            const boiler = { ...template.data, id: generateId() };
            boilers.push(boiler);
            const nextScheme = withStupidBoilerSensor({ ...prev, boilers }, boiler);
            return resolveControllerAndRequiredModules(syncStrategySensorForSmartBoilers(nextScheme));
        });
    }, []);

    const removeBoiler = useCallback((index) => {
        setIncomingScheme((prev) => {
            const boilers = Array.isArray(prev.boilers) ? [...prev.boilers] : [];
            boilers.splice(index, 1);
            return resolveControllerAndRequiredModules(syncStrategySensorForSmartBoilers({ ...prev, boilers }));
        });
    }, []);

    const addMixingUnit = useCallback((template, group = 'mixing') => {
        setIncomingScheme((prev) => {
            const unitUid = uid();
            const wiredDevices = Array.isArray(prev.wired_devices) ? [...prev.wired_devices] : [];
            wiredDevices.push({ ...template.wiredDevice, id: generateId(), _uid: unitUid });

            const sensors = Array.isArray(prev.sensors) ? [...prev.sensors] : [];
            template.sensors.forEach((s) => {
                sensors.push({ ...s, id: generateId(), _uid: unitUid });
            });

            return resolveControllerAndRequiredModules({ ...prev, wired_devices: wiredDevices, sensors });
        });
    }, []);

    const removeMixingUnit = useCallback((unitUid) => {
        setIncomingScheme((prev) => {
            const wiredDevices = Array.isArray(prev.wired_devices)
                ? prev.wired_devices.filter((d) => d._uid !== unitUid)
                : [];
            const sensors = Array.isArray(prev.sensors)
                ? prev.sensors.filter((s) => s._uid !== unitUid)
                : [];
            return { ...prev, wired_devices: wiredDevices, sensors };
        });
    }, []);

    const addWirelessDevice = useCallback((template) => {
        setIncomingScheme((prev) => {
            const devices = Array.isArray(prev.wireless_devices) ? [...prev.wireless_devices] : [];
            devices.push({ ...template.wirelessDevice, id: generateId() });
            return resolveControllerAndRequiredModules({ ...prev, wireless_devices: devices });
        });
    }, []);

    const removeWirelessDevice = useCallback((index) => {
        setIncomingScheme((prev) => {
            const devices = Array.isArray(prev.wireless_devices) ? [...prev.wireless_devices] : [];
            devices.splice(index, 1);
            return { ...prev, wireless_devices: devices };
        });
    }, []);

    const addTemperatureSensor = useCallback((template) => {
        setIncomingScheme((prev) => {
            if (template.target === 'wireless_devices') {
                const devices = Array.isArray(prev.wireless_devices) ? [...prev.wireless_devices] : [];
                devices.push({ ...template.data, id: generateId() });
                return resolveControllerAndRequiredModules({ ...prev, wireless_devices: devices });
            }

            const sensors = Array.isArray(prev.sensors) ? [...prev.sensors] : [];
            sensors.push({ ...template.data, id: generateId() });
            return resolveControllerAndRequiredModules({ ...prev, sensors });
        });
    }, []);

    const removeTemperatureSensor = useCallback((target, id) => {
        setIncomingScheme((prev) => {
            if (target === 'wireless_devices') {
                const devices = Array.isArray(prev.wireless_devices)
                    ? prev.wireless_devices.filter((device) => device.id !== id)
                    : [];
                return resolveControllerAndRequiredModules({ ...prev, wireless_devices: devices });
            }

            const sensors = Array.isArray(prev.sensors)
                ? prev.sensors.filter((sensor) => sensor.id !== id)
                : [];
            return resolveControllerAndRequiredModules({ ...prev, sensors });
        });
    }, []);

    const addThermostat = useCallback((template) => {
        setIncomingScheme((prev) => {
            if (template.target === 'wireless') {
                const devices = Array.isArray(prev.wireless_devices) ? [...prev.wireless_devices] : [];
                devices.push({ ...template.data, id: generateId() });
                return resolveControllerAndRequiredModules({ ...prev, wireless_devices: devices });
            }
            const devices = Array.isArray(prev.wired_devices) ? [...prev.wired_devices] : [];
            devices.push({ ...template.data, id: generateId() });
            return resolveControllerAndRequiredModules({ ...prev, wired_devices: devices });
        });
    }, []);

    const addLeakItem = useCallback((template) => {
        setIncomingScheme((prev) => {
            if (template.target === 'sensors') {
                const items = Array.isArray(prev.sensors) ? [...prev.sensors] : [];
                items.push({ ...template.data, id: generateId() });
                return resolveControllerAndRequiredModules({ ...prev, sensors: items });
            }
            const items = Array.isArray(prev.wired_devices) ? [...prev.wired_devices] : [];
            items.push({ ...template.data, id: generateId() });
            return resolveControllerAndRequiredModules({ ...prev, wired_devices: items });
        });
    }, []);

    const addPowerModule = useCallback((template) => {
        setIncomingScheme((prev) => {
            const modules = Array.isArray(prev.power_modules) ? [...prev.power_modules] : [];
            if (!modules.includes(template.value)) {
                modules.push(template.value);
            }
            return resolveControllerAndRequiredModules({ ...prev, power_modules: modules });
        });
    }, []);

    const removePowerModule = useCallback((value) => {
        setIncomingScheme((prev) => ({
            ...prev,
            power_modules: (Array.isArray(prev.power_modules) ? prev.power_modules : []).filter((m) => m !== value),
        }));
    }, []);

    const setController = useCallback((controllerValue) => {
        setIncomingScheme((prev) => resolveControllerAndRequiredModules({ ...prev, controller: controllerValue }));
    }, []);

    const clearScheme = useCallback(() => {
        setIncomingScheme({
            controller: { type: 'go', relay_devices: [], one_wire_devices: [], bus_devices: [] },
        });
    }, []);

    return (
        <div style={{ fontFamily: 'Arial, sans-serif', padding: 24, maxWidth: 800 }}>
            {controllerCompatibilityIssues.length > 0 && (
                <div
                    style={{
                        position: 'fixed',
                        left: 16,
                        bottom: 16,
                        width: 380,
                        maxWidth: 'calc(100vw - 32px)',
                        background: '#b91c1c',
                        color: '#fff',
                        border: '1px solid #7f1d1d',
                        borderRadius: 12,
                        padding: 16,
                        boxShadow: '0 12px 30px rgba(127, 29, 29, 0.28)',
                        zIndex: 1100,
                    }}
                >
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
                        Контроллер {controllerType || 'не выбран'} не подходит
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.45, marginBottom: 8 }}>
                        После последнего изменения схема превышает возможности выбранного контроллера.
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.45 }}>
                        {controllerCompatibilityIssues.map((issue) => (
                            <li key={issue}>{issue}</li>
                        ))}
                    </ul>
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.28)' }}>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Подходящие контроллеры:</div>
                        {compatibleControllerOptions.length > 0 ? (
                            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.45 }}>
                                {compatibleControllerOptions.map((item) => (
                                    <li key={item.type}>
                                        {item.label}{item.modules.length > 0 ? ` + ${item.modules.join(', ')}` : ''}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div style={{ fontSize: 13, lineHeight: 1.45 }}>
                                Подходящий контроллер не найден даже с доступными модулями расширения.
                            </div>
                        )}
                    </div>
                </div>
            )}
            <h1>Selection</h1>

            <section style={{ marginBottom: 32 }}>
                <h2>Контроллер</h2>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {CONTROLLER_TEMPLATES.map((item, index) => {
                        const isActive = incomingScheme.controller?.type === item.value.type;
                        return (
                            <div
                                key={index}
                                onClick={() => setController(item.value)}
                                style={{
                                    border: `2px solid ${isActive ? '#3498db' : '#d7dbe4'}`,
                                    borderRadius: 10,
                                    padding: '14px 24px',
                                    background: isActive ? '#eef6ff' : '#fff',
                                    cursor: 'pointer',
                                    fontWeight: isActive ? 700 : 400,
                                    fontSize: 15,
                                    textAlign: 'center',
                                    minWidth: 100,
                                    transition: 'border-color 0.15s, background 0.15s',
                                }}
                            >
                                {item.label}
                            </div>
                        );
                    })}
                </div>
            </section>

            <section style={{ marginBottom: 32 }}>
                <h2>Котлы</h2>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {BOILER_TEMPLATES.map((item, index) => (
                        <div
                            key={index}
                            style={{
                                border: '1px solid #d7dbe4',
                                borderRadius: 10,
                                padding: 16,
                                background: '#fff',
                                flex: '1 1 220px',
                                minWidth: 220,
                            }}
                        >
                            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>{item.label}</div>
                            <pre
                                style={{
                                    background: '#f5f7fb',
                                    padding: 10,
                                    borderRadius: 6,
                                    fontSize: 12,
                                    lineHeight: 1.5,
                                    overflow: 'auto',
                                    margin: 0,
                                }}
                            >
{JSON.stringify(item.data, null, 4)}
                            </pre>
                            <button
                                onClick={() => addBoiler(item)}
                                style={{
                                    marginTop: 10,
                                    padding: '6px 14px',
                                    border: '1px solid #3498db',
                                    borderRadius: 6,
                                    background: '#3498db',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontSize: 13,
                                }}
                            >
                                Добавить
                            </button>
                        </div>
                    ))}
                </div>

                {Array.isArray(incomingScheme.boilers) && incomingScheme.boilers.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                        <h3>Добавленные котлы:</h3>
                        {incomingScheme.boilers.map((boiler, index) => (
                            <div
                                key={boiler.id}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    border: '1px solid #d7dbe4',
                                    borderRadius: 6,
                                    padding: '6px 12px',
                                    margin: '4px 8px 4px 0',
                                    background: '#f0faf0',
                                }}
                            >
                                <span style={{ fontSize: 13 }}>{boiler.type} — {boiler.name}</span>
                                <button
                                    onClick={() => removeBoiler(index)}
                                    style={{
                                        border: 'none',
                                        background: 'none',
                                        color: '#e74c3c',
                                        cursor: 'pointer',
                                        fontSize: 16,
                                        lineHeight: 1,
                                        padding: 0,
                                    }}
                                    title="Удалить"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section style={{ marginBottom: 32 }}>
                <h2>Смесительные узлы</h2>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {MIXING_TEMPLATES.map((item, index) => (
                        <div
                            key={index}
                            style={{
                                border: '1px solid #d7dbe4',
                                borderRadius: 10,
                                padding: 16,
                                background: '#fff',
                                flex: '1 1 260px',
                                minWidth: 260,
                            }}
                        >
                            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>{item.label}</div>
                            <pre
                                style={{
                                    background: '#f5f7fb',
                                    padding: 10,
                                    borderRadius: 6,
                                    fontSize: 12,
                                    lineHeight: 1.5,
                                    overflow: 'auto',
                                    margin: 0,
                                }}
                            >
{JSON.stringify({ wired_device: item.wiredDevice, sensors: item.sensors }, null, 4)}
                            </pre>
                            <button
                                onClick={() => addMixingUnit(item, 'mixing')}
                                style={{
                                    marginTop: 10,
                                    padding: '6px 14px',
                                    border: '1px solid #3498db',
                                    borderRadius: 6,
                                    background: '#3498db',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontSize: 13,
                                }}
                            >
                                Добавить
                            </button>
                        </div>
                    ))}
                </div>

                {Array.isArray(incomingScheme.wired_devices) && incomingScheme.wired_devices.some((d) => isGroupedDevice(d, 'mixing', MIXING_TEMPLATES)) && (
                    <div style={{ marginTop: 16 }}>
                        <h3>Добавленные смесительные узлы:</h3>
                        {(() => {
                            const groups = {};
                            incomingScheme.wired_devices.forEach((d) => {
                                if (isGroupedDevice(d, 'mixing', MIXING_TEMPLATES)) {
                                    if (!groups[d._uid]) groups[d._uid] = [];
                                    groups[d._uid].push(d);
                                }
                            });
                            return Object.entries(groups).map(([uidVal, devices]) => (
                                <div
                                    key={uidVal}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        border: '1px solid #d7dbe4',
                                        borderRadius: 6,
                                        padding: '6px 12px',
                                        margin: '4px 8px 4px 0',
                                        background: '#f0faf0',
                                    }}
                                >
                                    <span style={{ fontSize: 13 }}>
                                        {devices.map((d) => d.type).join(' + ')}
                                    </span>
                                    <button
                                        onClick={() => removeMixingUnit(Number(uidVal))}
                                        style={{
                                            border: 'none',
                                            background: 'none',
                                            color: '#e74c3c',
                                            cursor: 'pointer',
                                            fontSize: 16,
                                            lineHeight: 1,
                                            padding: 0,
                                        }}
                                        title="Удалить"
                                    >
                                        ×
                                    </button>
                                </div>
                            ));
                        })()}
                    </div>
                )}
            </section>

            <section style={{ marginBottom: 32 }}>
                <h2>Бойлеры ГВС</h2>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {GVS_TEMPLATES.map((item, index) => (
                        <div
                            key={index}
                            style={{
                                border: '1px solid #d7dbe4',
                                borderRadius: 10,
                                padding: 16,
                                background: '#fff',
                                flex: '1 1 260px',
                                minWidth: 260,
                            }}
                        >
                            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>{item.label}</div>
                            <pre
                                style={{
                                    background: '#f5f7fb',
                                    padding: 10,
                                    borderRadius: 6,
                                    fontSize: 12,
                                    lineHeight: 1.5,
                                    overflow: 'auto',
                                    margin: 0,
                                }}
                            >
{JSON.stringify({ wired_device: item.wiredDevice, sensors: item.sensors }, null, 4)}
                            </pre>
                            <button
                                onClick={() => addMixingUnit(item, 'gvs')}
                                style={{
                                    marginTop: 10,
                                    padding: '6px 14px',
                                    border: '1px solid #3498db',
                                    borderRadius: 6,
                                    background: '#3498db',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontSize: 13,
                                }}
                            >
                                Добавить
                            </button>
                        </div>
                    ))}
                </div>

                {Array.isArray(incomingScheme.wired_devices) && incomingScheme.wired_devices.some((d) => isGroupedDevice(d, 'gvs', GVS_TEMPLATES)) && (
                    <div style={{ marginTop: 16 }}>
                        <h3>Добавленные бойлеры ГВС:</h3>
                        {(() => {
                            const groups = {};
                            incomingScheme.wired_devices.forEach((d) => {
                                if (isGroupedDevice(d, 'gvs', GVS_TEMPLATES)) {
                                    if (!groups[d._uid]) groups[d._uid] = [];
                                    groups[d._uid].push(d);
                                }
                            });
                            return Object.entries(groups).map(([uidVal]) => (
                                <div
                                    key={uidVal}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        border: '1px solid #d7dbe4',
                                        borderRadius: 6,
                                        padding: '6px 12px',
                                        margin: '4px 8px 4px 0',
                                        background: '#f0faf0',
                                    }}
                                >
                                    <span style={{ fontSize: 13 }}>Бойлер ГВС</span>
                                    <button
                                        onClick={() => removeMixingUnit(Number(uidVal))}
                                        style={{
                                            border: 'none',
                                            background: 'none',
                                            color: '#e74c3c',
                                            cursor: 'pointer',
                                            fontSize: 16,
                                            lineHeight: 1,
                                            padding: 0,
                                        }}
                                        title="Удалить"
                                    >
                                        ×
                                    </button>
                                </div>
                            ));
                        })()}
                    </div>
                )}
            </section>

            <section style={{ marginBottom: 32 }}>
                <h2>Насосы</h2>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {PUMP_TEMPLATES.map((item, index) => (
                        <div
                            key={index}
                            style={{
                                border: '1px solid #d7dbe4',
                                borderRadius: 10,
                                padding: 16,
                                background: '#fff',
                                flex: '1 1 260px',
                                minWidth: 260,
                            }}
                        >
                            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>{item.label}</div>
                            <pre
                                style={{
                                    background: '#f5f7fb',
                                    padding: 10,
                                    borderRadius: 6,
                                    fontSize: 12,
                                    lineHeight: 1.5,
                                    overflow: 'auto',
                                    margin: 0,
                                }}
                            >
{JSON.stringify(item.wiredDevice, null, 4)}
                            </pre>
                            <button
                                onClick={() => addMixingUnit(item, 'pump')}
                                style={{
                                    marginTop: 10,
                                    padding: '6px 14px',
                                    border: '1px solid #3498db',
                                    borderRadius: 6,
                                    background: '#3498db',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontSize: 13,
                                }}
                            >
                                Добавить
                            </button>
                        </div>
                    ))}
                </div>

                {Array.isArray(incomingScheme.wired_devices) && incomingScheme.wired_devices.some((d) => isGroupedDevice(d, 'pump', PUMP_TEMPLATES)) && (
                    <div style={{ marginTop: 16 }}>
                        <h3>Добавленные насосы:</h3>
                        {(() => {
                            const groups = {};
                            incomingScheme.wired_devices.forEach((d) => {
                                if (isGroupedDevice(d, 'pump', PUMP_TEMPLATES)) {
                                    if (!groups[d._uid]) groups[d._uid] = [];
                                    groups[d._uid].push(d);
                                }
                            });
                            return Object.entries(groups).map(([uidVal, devices]) => (
                                <div
                                    key={uidVal}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        border: '1px solid #d7dbe4',
                                        borderRadius: 6,
                                        padding: '6px 12px',
                                        margin: '4px 8px 4px 0',
                                        background: '#f0faf0',
                                    }}
                                >
                                    <span style={{ fontSize: 13 }}>{devices.map((d) => (d.type === '220pump' ? 'Насос 220' : 'Насос 010')).join(', ')}</span>
                                    <button
                                        onClick={() => removeMixingUnit(Number(uidVal))}
                                        style={{
                                            border: 'none',
                                            background: 'none',
                                            color: '#e74c3c',
                                            cursor: 'pointer',
                                            fontSize: 16,
                                            lineHeight: 1,
                                            padding: 0,
                                        }}
                                        title="Удалить"
                                    >
                                        ×
                                    </button>
                                </div>
                            ));
                        })()}
                    </div>
                )}
            </section>

            <section style={{ marginBottom: 32 }}>
                <h2>Зоны</h2>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {ZONE_TEMPLATES.map((item, index) => (
                        <div
                            key={index}
                            style={{
                                border: '1px solid #d7dbe4',
                                borderRadius: 10,
                                padding: 16,
                                background: '#fff',
                                flex: '1 1 260px',
                                minWidth: 260,
                            }}
                        >
                            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>{item.label}</div>
                            <pre
                                style={{
                                    background: '#f5f7fb',
                                    padding: 10,
                                    borderRadius: 6,
                                    fontSize: 12,
                                    lineHeight: 1.5,
                                    overflow: 'auto',
                                    margin: 0,
                                }}
                            >
{JSON.stringify(item.wiredDevice, null, 4)}
                            </pre>
                            <button
                                onClick={() => addMixingUnit(item, 'zone')}
                                style={{
                                    marginTop: 10,
                                    padding: '6px 14px',
                                    border: '1px solid #3498db',
                                    borderRadius: 6,
                                    background: '#3498db',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontSize: 13,
                                }}
                            >
                                Добавить
                            </button>
                        </div>
                    ))}
                </div>

                {Array.isArray(incomingScheme.wired_devices) && incomingScheme.wired_devices.some((d) => isGroupedDevice(d, 'zone', ZONE_TEMPLATES)) && (
                    <div style={{ marginTop: 16 }}>
                        <h3>Добавленные зоны:</h3>
                        {(() => {
                            const groups = {};
                            incomingScheme.wired_devices.forEach((d) => {
                                if (isGroupedDevice(d, 'zone', ZONE_TEMPLATES)) {
                                    if (!groups[d._uid]) groups[d._uid] = [];
                                    groups[d._uid].push(d);
                                }
                            });
                            return Object.entries(groups).map(([uidVal]) => (
                                <div
                                    key={uidVal}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        border: '1px solid #d7dbe4',
                                        borderRadius: 6,
                                        padding: '6px 12px',
                                        margin: '4px 8px 4px 0',
                                        background: '#f0faf0',
                                    }}
                                >
                                    <span style={{ fontSize: 13 }}>Зона</span>
                                    <button
                                        onClick={() => removeMixingUnit(Number(uidVal))}
                                        style={{
                                            border: 'none',
                                            background: 'none',
                                            color: '#e74c3c',
                                            cursor: 'pointer',
                                            fontSize: 16,
                                            lineHeight: 1,
                                            padding: 0,
                                        }}
                                        title="Удалить"
                                    >
                                        ×
                                    </button>
                                </div>
                            ));
                        })()}
                    </div>
                )}
            </section>

            <section style={{ marginBottom: 32 }}>
                <h2>Прочее оборудование</h2>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {OTHER_EQUIP_TEMPLATES.map((item, index) => (
                        <div
                            key={index}
                            style={{
                                border: '1px solid #d7dbe4',
                                borderRadius: 10,
                                padding: 16,
                                background: '#fff',
                                flex: '1 1 260px',
                                minWidth: 260,
                            }}
                        >
                            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>{item.label}</div>
                            <pre
                                style={{
                                    background: '#f5f7fb',
                                    padding: 10,
                                    borderRadius: 6,
                                    fontSize: 12,
                                    lineHeight: 1.5,
                                    overflow: 'auto',
                                    margin: 0,
                                }}
                            >
{JSON.stringify(item.wiredDevice, null, 4)}
                            </pre>
                            <button
                                onClick={() => addMixingUnit(item, 'other')}
                                style={{
                                    marginTop: 10,
                                    padding: '6px 14px',
                                    border: '1px solid #3498db',
                                    borderRadius: 6,
                                    background: '#3498db',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontSize: 13,
                                }}
                            >
                                Добавить
                            </button>
                        </div>
                    ))}
                </div>

                {Array.isArray(incomingScheme.wired_devices) && incomingScheme.wired_devices.some((d) => isGroupedDevice(d, 'other', OTHER_EQUIP_TEMPLATES)) && (
                    <div style={{ marginTop: 16 }}>
                        <h3>Добавленное оборудование:</h3>
                        {(() => {
                            const groups = {};
                            incomingScheme.wired_devices.forEach((d) => {
                                if (isGroupedDevice(d, 'other', OTHER_EQUIP_TEMPLATES)) {
                                    if (!groups[d._uid]) groups[d._uid] = [];
                                    groups[d._uid].push(d);
                                }
                            });
                            return Object.entries(groups).map(([uidVal]) => (
                                <div
                                    key={uidVal}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        border: '1px solid #d7dbe4',
                                        borderRadius: 6,
                                        padding: '6px 12px',
                                        margin: '4px 8px 4px 0',
                                        background: '#f0faf0',
                                    }}
                                >
                                    <span style={{ fontSize: 13 }}>Прочее оборудование</span>
                                    <button
                                        onClick={() => removeMixingUnit(Number(uidVal))}
                                        style={{
                                            border: 'none',
                                            background: 'none',
                                            color: '#e74c3c',
                                            cursor: 'pointer',
                                            fontSize: 16,
                                            lineHeight: 1,
                                            padding: 0,
                                        }}
                                        title="Удалить"
                                    >
                                        ×
                                    </button>
                                </div>
                            ));
                        })()}
                    </div>
                )}
            </section>

            <section style={{ marginBottom: 32 }}>
                <h2>Датчики температуры</h2>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {TEMPERATURE_SENSOR_TEMPLATES.map((item, index) => (
                        <div
                            key={index}
                            style={{
                                border: '1px solid #d7dbe4',
                                borderRadius: 10,
                                padding: 16,
                                background: '#fff',
                                flex: '1 1 260px',
                                minWidth: 260,
                            }}
                        >
                            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>{item.label}</div>
                            <pre
                                style={{
                                    background: '#f5f7fb',
                                    padding: 10,
                                    borderRadius: 6,
                                    fontSize: 12,
                                    lineHeight: 1.5,
                                    overflow: 'auto',
                                    margin: 0,
                                }}
                            >
{JSON.stringify(item.data, null, 4)}
                            </pre>
                            <button
                                onClick={() => addTemperatureSensor(item)}
                                style={{
                                    marginTop: 10,
                                    padding: '6px 14px',
                                    border: '1px solid #3498db',
                                    borderRadius: 6,
                                    background: '#3498db',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontSize: 13,
                                }}
                            >
                                Добавить
                            </button>
                        </div>
                    ))}
                </div>

                {(() => {
                    const wirelessTemperatureSensors = (Array.isArray(incomingScheme.wireless_devices) ? incomingScheme.wireless_devices : [])
                        .filter(isTemperatureSensor);
                    const wiredTemperatureSensors = (Array.isArray(incomingScheme.sensors) ? incomingScheme.sensors : [])
                        .filter(isTemperatureSensor);
                    const temperatureSensors = [
                        ...wirelessTemperatureSensors.map((device) => ({ device, target: 'wireless_devices' })),
                        ...wiredTemperatureSensors.map((device) => ({ device, target: 'sensors' })),
                    ];
                    if (temperatureSensors.length === 0) return null;

                    return (
                    <div style={{ marginTop: 16 }}>
                        <h3>Добавленные датчики температуры:</h3>
                        {temperatureSensors.map(({ device, target }) => (
                            <div
                                key={`${target}:${device.id}`}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    border: '1px solid #d7dbe4',
                                    borderRadius: 6,
                                    padding: '6px 12px',
                                    margin: '4px 8px 4px 0',
                                    background: '#f0faf0',
                                }}
                            >
                                <span style={{ fontSize: 13 }}>{device.type}</span>
                                <button
                                    onClick={() => removeTemperatureSensor(target, device.id)}
                                    style={{
                                        border: 'none',
                                        background: 'none',
                                        color: '#e74c3c',
                                        cursor: 'pointer',
                                        fontSize: 16,
                                        lineHeight: 1,
                                        padding: 0,
                                    }}
                                    title="Удалить"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                    );
                })()}
            </section>

            <section style={{ marginBottom: 32 }}>
                <h2>Термостаты</h2>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {THERMOSTAT_TEMPLATES.map((item, index) => (
                        <div
                            key={index}
                            style={{
                                border: '1px solid #d7dbe4',
                                borderRadius: 10,
                                padding: 16,
                                background: '#fff',
                                flex: '1 1 260px',
                                minWidth: 260,
                            }}
                        >
                            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>{item.label}</div>
                            <pre
                                style={{
                                    background: '#f5f7fb',
                                    padding: 10,
                                    borderRadius: 6,
                                    fontSize: 12,
                                    lineHeight: 1.5,
                                    overflow: 'auto',
                                    margin: 0,
                                }}
                            >
{JSON.stringify(item.data, null, 4)}
                            </pre>
                            <button
                                onClick={() => addThermostat(item)}
                                style={{
                                    marginTop: 10,
                                    padding: '6px 14px',
                                    border: '1px solid #3498db',
                                    borderRadius: 6,
                                    background: '#3498db',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontSize: 13,
                                }}
                            >
                                Добавить
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            <section style={{ marginBottom: 32 }}>
                <h2>Контроль протечки воды</h2>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {LEAK_TEMPLATES.map((item, index) => (
                        <div
                            key={index}
                            style={{
                                border: '1px solid #d7dbe4',
                                borderRadius: 10,
                                padding: 16,
                                background: '#fff',
                                flex: '1 1 260px',
                                minWidth: 260,
                            }}
                        >
                            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>{item.label}</div>
                            <pre
                                style={{
                                    background: '#f5f7fb',
                                    padding: 10,
                                    borderRadius: 6,
                                    fontSize: 12,
                                    lineHeight: 1.5,
                                    overflow: 'auto',
                                    margin: 0,
                                }}
                            >
{JSON.stringify(item.data, null, 4)}
                            </pre>
                            <button
                                onClick={() => addLeakItem(item)}
                                style={{
                                    marginTop: 10,
                                    padding: '6px 14px',
                                    border: '1px solid #3498db',
                                    borderRadius: 6,
                                    background: '#3498db',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontSize: 13,
                                }}
                            >
                                Добавить
                            </button>
                        </div>
                    ))}
                </div>

                {Array.isArray(incomingScheme.sensors) && incomingScheme.sensors.some((s) => s.type === 'leak-sensor') && (
                    <div style={{ marginTop: 16 }}>
                        <h3>Добавленные датчики протечки:</h3>
                        {incomingScheme.sensors.filter((s) => s.type === 'leak-sensor').map((s) => (
                            <div key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid #d7dbe4', borderRadius: 6, padding: '6px 12px', margin: '4px 8px 4px 0', background: '#f0faf0' }}>
                                <span style={{ fontSize: 13 }}>Датчик протечки</span>
                                <button onClick={() => setIncomingScheme((prev) => ({ ...prev, sensors: (prev.sensors || []).filter((x) => x.id !== s.id) }))} style={{ border: 'none', background: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }} title="Удалить">×</button>
                            </div>
                        ))}
                    </div>
                )}

                {Array.isArray(incomingScheme.wired_devices) && incomingScheme.wired_devices.some((d) => d.type === 'valve') && (
                    <div style={{ marginTop: 16 }}>
                        <h3>Добавленные клапаны:</h3>
                        {incomingScheme.wired_devices.filter((d) => d.type === 'valve').map((d) => (
                            <div key={d.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid #d7dbe4', borderRadius: 6, padding: '6px 12px', margin: '4px 8px 4px 0', background: '#f0faf0' }}>
                                <span style={{ fontSize: 13 }}>Запорный клапан</span>
                                <button onClick={() => setIncomingScheme((prev) => ({ ...prev, wired_devices: (prev.wired_devices || []).filter((x) => x.id !== d.id) }))} style={{ border: 'none', background: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }} title="Удалить">×</button>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section style={{ marginBottom: 32 }}>
                <h2>Токовый датчик давления</h2>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {PRESSURE_TEMPLATES.map((item, index) => (
                        <div
                            key={index}
                            style={{
                                border: '1px solid #d7dbe4',
                                borderRadius: 10,
                                padding: 16,
                                background: '#fff',
                                flex: '1 1 260px',
                                minWidth: 260,
                            }}
                        >
                            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>{item.label}</div>
                            <pre
                                style={{
                                    background: '#f5f7fb',
                                    padding: 10,
                                    borderRadius: 6,
                                    fontSize: 12,
                                    lineHeight: 1.5,
                                    overflow: 'auto',
                                    margin: 0,
                                }}
                            >
{JSON.stringify(item.data, null, 4)}
                            </pre>
                            <button
                                onClick={() => addLeakItem({ ...item, target: 'sensors' })}
                                style={{
                                    marginTop: 10,
                                    padding: '6px 14px',
                                    border: '1px solid #3498db',
                                    borderRadius: 6,
                                    background: '#3498db',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontSize: 13,
                                }}
                            >
                                Добавить
                            </button>
                        </div>
                    ))}
                </div>

                {Array.isArray(incomingScheme.sensors) && incomingScheme.sensors.some((s) => s.type === 'pressure-sensor') && (
                    <div style={{ marginTop: 16 }}>
                        <h3>Добавленные датчики давления:</h3>
                        {incomingScheme.sensors.filter((s) => s.type === 'pressure-sensor').map((s) => (
                            <div key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid #d7dbe4', borderRadius: 6, padding: '6px 12px', margin: '4px 8px 4px 0', background: '#f0faf0' }}>
                                <span style={{ fontSize: 13 }}>Датчик давления</span>
                                <button onClick={() => setIncomingScheme((prev) => ({ ...prev, sensors: (prev.sensors || []).filter((x) => x.id !== s.id) }))} style={{ border: 'none', background: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }} title="Удалить">×</button>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section style={{ marginBottom: 32 }}>
                <h2>Дискретные входы</h2>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {DISCRETE_TEMPLATES.map((item, index) => (
                        <div
                            key={index}
                            style={{
                                border: '1px solid #d7dbe4',
                                borderRadius: 10,
                                padding: 16,
                                background: '#fff',
                                flex: '1 1 260px',
                                minWidth: 260,
                            }}
                        >
                            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>{item.label}</div>
                            <pre
                                style={{
                                    background: '#f5f7fb',
                                    padding: 10,
                                    borderRadius: 6,
                                    fontSize: 12,
                                    lineHeight: 1.5,
                                    overflow: 'auto',
                                    margin: 0,
                                }}
                            >
{JSON.stringify(item.data, null, 4)}
                            </pre>
                            <button
                                onClick={() => addLeakItem({ ...item, target: 'wired' })}
                                style={{
                                    marginTop: 10,
                                    padding: '6px 14px',
                                    border: '1px solid #3498db',
                                    borderRadius: 6,
                                    background: '#3498db',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontSize: 13,
                                }}
                            >
                                Добавить
                            </button>
                        </div>
                    ))}
                </div>

                {Array.isArray(incomingScheme.wired_devices) && incomingScheme.wired_devices.some((d) => DISCRETE_TEMPLATES.some((t) => t.data.type === d.type)) && (
                    <div style={{ marginTop: 16 }}>
                        <h3>Добавленные дискретные входы:</h3>
                        {incomingScheme.wired_devices.filter((d) => DISCRETE_TEMPLATES.some((t) => t.data.type === d.type)).map((d) => {
                            const label = DISCRETE_TEMPLATES.find((t) => t.data.type === d.type)?.label || d.type;
                            return (
                                <div key={d.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid #d7dbe4', borderRadius: 6, padding: '6px 12px', margin: '4px 8px 4px 0', background: '#f0faf0' }}>
                                    <span style={{ fontSize: 13 }}>{label}</span>
                                    <button onClick={() => setIncomingScheme((prev) => ({ ...prev, wired_devices: (prev.wired_devices || []).filter((x) => x.id !== d.id) }))} style={{ border: 'none', background: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }} title="Удалить">×</button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            <section style={{ marginBottom: 32 }}>
                <h2>Источник бесперебойного питания</h2>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {UPS_TEMPLATES.map((item, index) => (
                        <div
                            key={index}
                            style={{
                                border: '1px solid #d7dbe4',
                                borderRadius: 10,
                                padding: 16,
                                background: '#fff',
                                flex: '1 1 260px',
                                minWidth: 260,
                            }}
                        >
                            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>{item.label}</div>
                            <pre
                                style={{
                                    background: '#f5f7fb',
                                    padding: 10,
                                    borderRadius: 6,
                                    fontSize: 12,
                                    lineHeight: 1.5,
                                    overflow: 'auto',
                                    margin: 0,
                                }}
                            >
'{item.value}'
                            </pre>
                            <button
                                onClick={() => addPowerModule(item)}
                                style={{
                                    marginTop: 10,
                                    padding: '6px 14px',
                                    border: '1px solid #3498db',
                                    borderRadius: 6,
                                    background: '#3498db',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontSize: 13,
                                }}
                            >
                                Добавить
                            </button>
                        </div>
                    ))}
                </div>

                {Array.isArray(incomingScheme.power_modules) && incomingScheme.power_modules.includes('ups') && (
                    <div style={{ marginTop: 16 }}>
                        <h3>Добавленные модули питания:</h3>
                        {incomingScheme.power_modules.filter((m) => m === 'ups').map((m) => (
                            <div key={m} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid #d7dbe4', borderRadius: 6, padding: '6px 12px', margin: '4px 8px 4px 0', background: '#f0faf0' }}>
                                <span style={{ fontSize: 13 }}>UPS</span>
                                <button onClick={() => removePowerModule(m)} style={{ border: 'none', background: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }} title="Удалить">×</button>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <div
                style={{
                    position: 'fixed',
                    top: 16,
                    right: 16,
                    width: 380,
                    maxHeight: 'calc(100vh - 32px)',
                    overflow: 'auto',
                    background: '#fff',
                    border: '1px solid #d7dbe4',
                    borderRadius: 10,
                    padding: 16,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    zIndex: 1000,
                }}
            >
                {ecosmartAvailableForProScheme && (
                    <div
                        style={{
                            marginBottom: 12,
                            padding: '12px 14px',
                            border: '1px solid #0ea5e9',
                            borderRadius: 8,
                            background: '#e0f2fe',
                            color: '#075985',
                            fontSize: 13,
                            lineHeight: 1.45,
                        }}
                    >
                        Подбор определил контроллер PRO, но для этой схемы также доступен ECOsmart.
                    </div>
                )}
                <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>incomingScheme</div>
                <JsonView data={incomingScheme} name="incomingScheme" />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 16, paddingTop: 12, borderTop: '1px solid #d7dbe4' }}>
                    <button
                        onClick={() => navigator.clipboard.writeText(JSON.stringify(incomingScheme, null, 4))}
                        style={{
                            padding: '6px 14px',
                            border: '1px solid #27ae60',
                            borderRadius: 6,
                            background: '#27ae60',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: 13,
                        }}
                    >
                        Скопировать схему
                    </button>
                    <button
                        onClick={clearScheme}
                        style={{
                            padding: '6px 14px',
                            border: '1px solid #e74c3c',
                            borderRadius: 6,
                            background: '#fff',
                            color: '#e74c3c',
                            cursor: 'pointer',
                            fontSize: 13,
                        }}
                    >
                        Очистить схему
                    </button>
                </div>
            </div>
            {ecosmartIncomingScheme && (
                <div
                    style={{
                        position: 'fixed',
                        top: 16,
                        right: 412,
                        width: 380,
                        maxHeight: 'calc(100vh - 32px)',
                        overflow: 'auto',
                        background: '#fff',
                        border: '1px solid #d7dbe4',
                        borderRadius: 10,
                        padding: 16,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                        zIndex: 1000,
                    }}
                >
                    <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>incomingScheme ECOsmart</div>
                    <JsonView data={ecosmartIncomingScheme} name="incomingScheme" />
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 16, paddingTop: 12, borderTop: '1px solid #d7dbe4' }}>
                        <button
                            onClick={() => navigator.clipboard.writeText(JSON.stringify(ecosmartIncomingScheme, null, 4))}
                            style={{
                                padding: '6px 14px',
                                border: '1px solid #27ae60',
                                borderRadius: 6,
                                background: '#27ae60',
                                color: '#fff',
                                cursor: 'pointer',
                                fontSize: 13,
                            }}
                        >
                            Скопировать схему
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const container = document.getElementById('selection-app');
if (container) {
    const root = createRoot(container);
    root.render(<SelectionApp />);
}
