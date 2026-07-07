import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';

const controllerImagePaths = {
    go: new URL('../assets/controllers/go/go.svg', import.meta.url).href,
    'go+': new URL('../assets/controllers/go+/go+.svg', import.meta.url).href,
    smart2: new URL('../assets/controllers/smart2/smart2.svg', import.meta.url).href,
    pro: new URL('../assets/controllers/pro/pro.svg', import.meta.url).href,
    ecosmart: new URL('../assets/controllers/ecosmart/ecosmart.svg', import.meta.url).href,
};

const thermostatImagePaths = {
    black: new URL('../assets/thermostats/black/thermostat_black.svg', import.meta.url).href,
    white: new URL('../assets/thermostats/white/thermostat_white.svg', import.meta.url).href,
    gray: new URL('../assets/thermostats/gray/thermostat_gray.svg', import.meta.url).href,
};

const ORANGE = '#e07020';

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

const CONTROLLER_KIT_TEMPERATURE_DEVICES = {
    pro: [
        { label: 'Цифровой датчик температуры настенный', count: 1 },
        { label: 'Цифровой датчик температуры в колбе', count: 2 },
    ],
    smart2: [
        { label: 'Датчик температуры настенный проводной', count: 1 },
    ],
    ecosmart: [
        { label: 'NTC-датчик температуры', count: 3 },
    ],
    go: [
        { label: 'Настенный цифровой датчик температуры', count: 1 },
    ],
    'go+': [
        { label: 'Беспроводной комнатный датчик температуры', count: 1 },
    ],
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

const THERMOSTAT_COLORS = [
    { value: 'black', label: 'Черный' },
    { value: 'white', label: 'Белый' },
    { value: 'gray', label: 'Серый' },
];

const THERMOSTAT_CONNECTIONS = [
    { value: 'wired', label: 'Проводной' },
    { value: 'wireless', label: 'Беспроводной' },
];

const makeThermostatTemplate = ({ target, color, hasFloorSensor }) => ({
    label: `${target === 'wired' ? 'Проводной' : 'Беспроводной'} ${THERMOSTAT_COLORS.find((item) => item.value === color)?.label.toLowerCase()} термостат${hasFloorSensor ? ' с датчиком пола' : ''}`,
    target,
    data: {
        id: 0,
        device_type: 'thermostat',
        type: 'thermostat',
        ...(target === 'wired' ? { connection_type: '1-wire' } : {}),
        color,
        additions: hasFloorSensor
            ? [{ id: 0, ...(target === 'wireless' ? { device_type: 'sensor' } : {}), type: 'flask-sensor-floor', connection_type: '1-wire' }]
            : [],
    },
});

const getCsrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

const makeSchemeName = () => {
    const now = new Date();
    return `Подбор ${now.toLocaleDateString('ru-RU')} ${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
};

const TEMPERATURE_SENSOR_TEMPLATES = [
    {
        key: 'wireless-outdoor',
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
        key: 'wireless-wall',
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
        key: 'wired-wall-digital',
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
        key: 'wired-flask-digital',
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
        key: 'wired-flask-ntc',
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
        key: 'wired-wall-ntc',
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
const getTemperatureSensorGroup = (template) => (template.target === 'wireless_devices' ? 'wireless' : 'wired');

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
        label: 'Насос 220V',
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
        label: 'Насос 0-10V',
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
        label: 'Сервопривод 220V с цифровым датчиком',
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
        label: 'Сервопривод 220V с NTC-датчиком',
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
        label: 'Сервопривод 0-10V с NTC-датчиком',
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

const SectionSubtitle = ({ children }) => (
    <p style={{ margin: '-8px 0 16px', color: '#64748b', fontSize: 14, lineHeight: 1.5 }}>
        {children}
    </p>
);

const AddedDeviceLine = ({ label, count = 1, onRemove, badge = null }) => (
    <div
        style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            width: '100%',
            margin: '8px 0',
            color: '#203040',
            fontSize: 15,
            boxSizing: 'border-box',
        }}
    >
        {badge && (
            <span
                style={{
                    alignSelf: 'center',
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: '#dcfce7',
                    color: '#166534',
                    fontSize: 12,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                }}
            >
                {badge}
            </span>
        )}
        <span>{label}</span>
        <span style={{ flex: 1, borderBottom: '1px dotted #6b7f95', transform: 'translateY(-3px)' }} />
        <span style={{ whiteSpace: 'nowrap' }}>{count} шт</span>
        {onRemove && (
            <button
                onClick={onRemove}
                style={{ border: 'none', background: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}
                title="Удалить"
            >
                ×
            </button>
        )}
    </div>
);

const AddedDevicesTitle = ({ children }) => (
    <h3 style={{ margin: '0 0 14px', fontSize: 18, fontWeight: 500 }}>{children}</h3>
);

const AddedDevicesBlock = ({ children }) => (
    <div
        style={{
            marginTop: 24,
            padding: '14px 16px',
            border: '1px solid #b8c7d9',
            borderRadius: 12,
            background: '#edf3f8',
        }}
    >
        {children}
    </div>
);

const SectionDivider = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '10px 0 34px' }} aria-hidden="true">
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: ORANGE, boxShadow: '0 0 0 5px rgba(224, 112, 32, 0.12)' }} />
        <span style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(249,115,22,0.45), rgba(148,163,184,0.35), rgba(148,163,184,0))' }} />
    </div>
);

const getTemplateLabelByType = (templates, type, fallback) => (
    templates.find((template) => canonicalType(template.wiredDevice?.type || template.data?.type) === canonicalType(type))?.label || fallback
);

const getTemperatureSensorLabel = (device) => (
    device?.title || TEMPERATURE_SENSOR_TEMPLATES.find((template) => canonicalType(template.data.type) === canonicalType(device?.type))?.label || device?.type
);

const aggregateAddedItems = (items) => Object.values(items.reduce((acc, item) => {
    const key = item.label;
    if (!acc[key]) acc[key] = { label: item.label, count: 0, removeKeys: [] };
    acc[key].count += 1;
    acc[key].removeKeys.push(item.removeKey);
    return acc;
}, {}));

const getGroupedUnitLabel = (uidVal, devices, sensors, templates) => {
    if (devices[0]?._label) return devices[0]._label;

    const unitSensors = (Array.isArray(sensors) ? sensors : []).filter((sensor) => String(sensor._uid) === String(uidVal));
    if (devices.some((device) => canonicalType(device?.type) === '220servo')) {
        if (unitSensors.some((sensor) => canonicalType(sensor?.type) === 'mixing-ntc-sensor')) {
            return 'Сервопривод 220V с NTC-датчиком';
        }
        if (unitSensors.some((sensor) => canonicalType(sensor?.type) === 'flask-sensor-mixing-unit')) {
            return 'Сервопривод 220V с цифровым датчиком';
        }
    }

    return getTemplateLabelByType(templates, devices[0]?.type, devices.map((device) => device.type).join(' + '));
};

const SelectionApp = () => {
    const [incomingScheme, setIncomingScheme] = useState({
        controller: { type: 'go', relay_devices: [], one_wire_devices: [], bus_devices: [] },
    });
    const [showJsonDetails, setShowJsonDetails] = useState(false);
    const [thermostatTarget, setThermostatTarget] = useState('wired');
    const [thermostatColor, setThermostatColor] = useState('black');
    const [thermostatHasFloorSensor, setThermostatHasFloorSensor] = useState(false);
    const [temperatureSensorGroup, setTemperatureSensorGroup] = useState('wireless');
    const [temperatureSensorKey, setTemperatureSensorKey] = useState('wireless-outdoor');
    const [isBuildingScheme, setIsBuildingScheme] = useState(false);
    const [buildSchemeError, setBuildSchemeError] = useState('');
    const [boilerQuery, setBoilerQuery] = useState('');
    const [boilerResults, setBoilerResults] = useState([]);
    const [boilerSearchLoading, setBoilerSearchLoading] = useState(false);
    const controllerCompatibilityIssues = useMemo(
        () => getControllerCompatibilityIssues(incomingScheme),
        [incomingScheme],
    );
    const compatibleControllerOptions = useMemo(
        () => getCompatibleControllerOptions(incomingScheme),
        [incomingScheme],
    );
    const controllerType = getControllerType(incomingScheme);
    const proAndEcosmartOptions = useMemo(() => {
        const optionTypes = new Set(compatibleControllerOptions.map((item) => item.type));
        return optionTypes.has('pro') && optionTypes.has('ecosmart');
    }, [compatibleControllerOptions]);
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
    const thermostatTemplate = useMemo(() => makeThermostatTemplate({
        target: thermostatTarget,
        color: thermostatColor,
        hasFloorSensor: thermostatHasFloorSensor,
    }), [thermostatColor, thermostatHasFloorSensor, thermostatTarget]);
    const temperatureSensorOptions = useMemo(() => TEMPERATURE_SENSOR_TEMPLATES.filter(
        (template) => getTemperatureSensorGroup(template) === temperatureSensorGroup,
    ), [temperatureSensorGroup]);
    const temperatureSensorTemplate = useMemo(() => (
        temperatureSensorOptions.find((template) => template.key === temperatureSensorKey) || temperatureSensorOptions[0]
    ), [temperatureSensorKey, temperatureSensorOptions]);

    useEffect(() => {
        const nextScheme = resolveControllerAndRequiredModules(incomingScheme);
        if (nextScheme !== incomingScheme) {
            setIncomingScheme(nextScheme);
        }
    }, [incomingScheme]);

    useEffect(() => {
        const query = boilerQuery.trim();
        if (!query) {
            setBoilerResults([]);
            setBoilerSearchLoading(false);
            return;
        }
        setBoilerSearchLoading(true);
        const timer = setTimeout(async () => {
            try {
                const res = await fetch('/api/proxy/integration', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': getCsrfToken(),
                    },
                    body: JSON.stringify({ action: 'getNames', data: { name: query } }),
                });
                const data = await res.json();
                setBoilerResults(Array.isArray(data) ? data : []);
            } catch {
                setBoilerResults([]);
            } finally {
                setBoilerSearchLoading(false);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [boilerQuery]);

    const addBoilerFromSearch = useCallback((result) => {
        const isStupid = result.bus_type === 127;
        setIncomingScheme((prev) => {
            const boilers = Array.isArray(prev.boilers) ? [...prev.boilers] : [];
            const boiler = {
                id: generateId(),
                device_type: 'boiler',
                type: isStupid ? 'stupid' : 'smart',
                name: result.name,
                reserve: false,
                connection_type: isStupid ? 'RELAY' : 'BUS',
            };
            boilers.push(boiler);
            const nextScheme = withStupidBoilerSensor({ ...prev, boilers }, boiler);
            return resolveControllerAndRequiredModules(syncStrategySensorForSmartBoilers(nextScheme));
        });
    }, []);

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
            wiredDevices.push({ ...template.wiredDevice, id: generateId(), _uid: unitUid, _group: group, _label: template.label });

            const sensors = Array.isArray(prev.sensors) ? [...prev.sensors] : [];
            template.sensors.forEach((s) => {
                sensors.push({ ...s, id: generateId(), _uid: unitUid, _group: group, _label: template.label });
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
                devices.push({ ...template.data, id: generateId(), title: template.label });
                return resolveControllerAndRequiredModules({ ...prev, wireless_devices: devices });
            }

            const sensors = Array.isArray(prev.sensors) ? [...prev.sensors] : [];
            sensors.push({ ...template.data, id: generateId(), title: template.label });
            return resolveControllerAndRequiredModules({ ...prev, sensors });
        });
    }, []);

    const selectTemperatureSensorGroup = useCallback((group) => {
        setTemperatureSensorGroup(group);
        const firstOption = TEMPERATURE_SENSOR_TEMPLATES.find((template) => getTemperatureSensorGroup(template) === group);
        if (firstOption) setTemperatureSensorKey(firstOption.key);
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

    const removeThermostat = useCallback((target, id) => {
        setIncomingScheme((prev) => {
            if (target === 'wireless_devices') {
                const devices = Array.isArray(prev.wireless_devices)
                    ? prev.wireless_devices.filter((device) => device.id !== id)
                    : [];
                return resolveControllerAndRequiredModules({ ...prev, wireless_devices: devices });
            }

            const devices = Array.isArray(prev.wired_devices)
                ? prev.wired_devices.filter((device) => device.id !== id)
                : [];
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
        setBuildSchemeError('');
    }, []);

    const buildScheme = useCallback(async () => {
        setIsBuildingScheme(true);
        setBuildSchemeError('');

        try {
            const response = await fetch('/api/schemes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                body: JSON.stringify({
                    name: makeSchemeName(),
                    description: 'Создано со страницы подбора',
                    incoming_scheme: incomingScheme,
                }),
            });

            if (!response.ok) {
                const errorPayload = await response.json().catch(() => null);
                throw new Error(errorPayload?.message || `Не удалось сохранить схему (${response.status})`);
            }

            const schemeRecord = await response.json();
            window.location.href = `/scheme/${schemeRecord.id}`;
        } catch (error) {
            setBuildSchemeError(error instanceof Error ? error.message : 'Не удалось сохранить схему');
            setIsBuildingScheme(false);
        }
    }, [incomingScheme]);

    return (
        <div
            className={showJsonDetails ? 'selection-page selection-show-json' : 'selection-page selection-hide-json'}
            style={{ padding: 24, width: 'min(1120px, 100%)', margin: '0 auto' }}
        >
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
            <div className="sel-header">
                <h1>Подбор оборудования</h1>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: '#475569' }}>
                        <input
                            type="checkbox"
                            checked={showJsonDetails}
                            onChange={(event) => setShowJsonDetails(event.target.checked)}
                        />
                        Показать incomingScheme и JSON карточек
                    </label>
                    <button
                        onClick={buildScheme}
                        disabled={isBuildingScheme}
                        style={{
                            padding: '10px 16px',
                            border: '1px solid #3498db',
                            borderRadius: 8,
                            background: '#3498db',
                            color: '#fff',
                            cursor: isBuildingScheme ? 'not-allowed' : 'pointer',
                            fontSize: 14,
                            fontWeight: 700,
                            opacity: isBuildingScheme ? 0.72 : 1,
                        }}
                    >
                        {isBuildingScheme ? 'Сохраняем...' : 'Построить схему'}
                    </button>
                </div>
            </div>
            {buildSchemeError && (
                <div style={{ marginBottom: 20, padding: '12px 14px', border: '1px solid #fecaca', borderRadius: 8, background: '#fef2f2', color: '#991b1b', fontSize: 14 }}>
                    {buildSchemeError}
                </div>
            )}

            <section style={{ marginBottom: 32 }}>
                <h2>Контроллер</h2>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'nowrap', justifyContent: 'space-between', overflowX: 'auto', paddingBottom: 8 }}>
                    {CONTROLLER_TEMPLATES.map((item, index) => {
                        const isActive = incomingScheme.controller?.type === item.value.type;
                        const controllerTypeValue = item.value.type;
                        return (
                            <div
                                key={index}
                                onClick={() => setController(item.value)}
                                style={{
                                    border: `2px solid ${isActive ? ORANGE : '#d7dbe4'}`,
                                    borderRadius: 10,
                                    padding: 12,
                                    background: isActive ? '#fff7ed' : '#fff',
                                    cursor: 'pointer',
                                    fontWeight: isActive ? 700 : 400,
                                    fontSize: 15,
                                    textAlign: 'center',
                                    width: 210,
                                    transition: 'border-color 0.15s, background 0.15s',
                                }}
                            >
                                <img
                                    src={controllerImagePaths[controllerTypeValue]}
                                    alt={item.label}
                                    style={{ display: 'block', width: '100%', height: 132, objectFit: 'contain', marginBottom: 10 }}
                                />
                                <div>{item.label}</div>
                            </div>
                        );
                    })}
                </div>
                {proAndEcosmartOptions && (
                    <div
                        style={{
                            marginTop: 14,
                            padding: '12px 14px',
                            border: '1px solid #fed7aa',
                            borderRadius: 10,
                            background: '#fff7ed',
                            color: '#9a3412',
                            fontSize: 14,
                            lineHeight: 1.45,
                            textAlign: 'center',
                        }}
                    >
                        Для этой конфигурации подходят два контроллера: <strong>PRO</strong> и <strong>ECOsmart</strong>.
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                            <button
                                className="selection-option-button"
                                type="button"
                                onClick={() => setController(getControllerTemplateValue('pro'))}
                                style={{
                                    padding: '7px 12px',
                                    border: '1px solid #ea580c',
                                    borderRadius: 8,
                                    background: controllerType === 'pro' ? '#e07020' : '#fff',
                                    color: controllerType === 'pro' ? '#fff' : '#9a3412',
                                    cursor: 'pointer',
                                    fontSize: 13,
                                    fontWeight: 700,
                                }}
                            >
                                Использовать PRO
                            </button>
                            <button
                                className="selection-option-button"
                                type="button"
                                onClick={() => setController(getControllerTemplateValue('ecosmart'))}
                                style={{
                                    padding: '7px 12px',
                                    border: '1px solid #ea580c',
                                    borderRadius: 8,
                                    background: controllerType === 'ecosmart' ? '#e07020' : '#fff',
                                    color: controllerType === 'ecosmart' ? '#fff' : '#9a3412',
                                    cursor: 'pointer',
                                    fontSize: 13,
                                    fontWeight: 700,
                                }}
                            >
                                Использовать ECOsmart
                            </button>
                        </div>
                    </div>
                )}
            </section>

            <SectionDivider />

            <section style={{ marginBottom: 32 }}>
                <h2>Котлы</h2>
                <SectionSubtitle>
                    Найдите котел по названию. Тип подключения определяется автоматически: котлы с цифровой шиной подключаются через BUS, остальные — через реле с датчиком подающей линии.
                </SectionSubtitle>
                <div style={{ position: 'relative' }}>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="Введите название котла..."
                            value={boilerQuery}
                            onChange={(e) => setBoilerQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 40px 10px 14px',
                                border: '1px solid #d7dbe4',
                                borderRadius: boilerResults.length > 0 || (!boilerSearchLoading && boilerQuery.trim() && boilerResults.length === 0) ? '10px 10px 0 0' : 10,
                                fontSize: 14,
                                fontFamily: 'inherit',
                                outline: 'none',
                                boxSizing: 'border-box',
                                color: 'var(--text)',
                            }}
                        />
                        {boilerSearchLoading && (
                            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 13 }}>
                                Поиск...
                            </span>
                        )}
                    </div>
                    {boilerResults.length > 0 && (
                        <div style={{
                            border: '1px solid #d7dbe4',
                            borderTop: 'none',
                            borderRadius: '0 0 10px 10px',
                            background: '#fff',
                            boxShadow: '0 6px 16px rgba(32,39,56,0.08)',
                            maxHeight: 280,
                            overflowY: 'auto',
                        }}>
                            {boilerResults.map((result) => {
                                const isStupid = result.bus_type === 127;
                                return (
                                    <div
                                        key={result.name}
                                        onClick={() => addBoilerFromSearch(result)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 12,
                                            padding: '10px 14px',
                                            cursor: 'pointer',
                                            borderBottom: '1px solid #f1f5f9',
                                            fontSize: 14,
                                            transition: 'background 0.1s',
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = '#fff7ed'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
                                    >
                                        <span>{result.name}</span>
                                        <span style={{
                                            flexShrink: 0,
                                            padding: '2px 8px',
                                            borderRadius: 999,
                                            fontSize: 11,
                                            fontWeight: 700,
                                            letterSpacing: '0.03em',
                                            background: isStupid ? '#fef2f2' : '#eff6ff',
                                            color: isStupid ? '#dc2626' : '#2563eb',
                                        }}>
                                            {isStupid ? 'RELAY' : 'BUS'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {!boilerSearchLoading && boilerQuery.trim() && boilerResults.length === 0 && (
                        <div style={{
                            padding: '10px 14px',
                            border: '1px solid #d7dbe4',
                            borderTop: 'none',
                            borderRadius: '0 0 10px 10px',
                            background: '#fff',
                            color: '#94a3b8',
                            fontSize: 14,
                        }}>
                            Котлы не найдены
                        </div>
                    )}
                </div>

                {Array.isArray(incomingScheme.boilers) && incomingScheme.boilers.length > 0 && (
                    <AddedDevicesBlock>
                        <AddedDevicesTitle>Добавленные котлы</AddedDevicesTitle>
                        {aggregateAddedItems(incomingScheme.boilers.map((boiler, index) => ({
                            label: `${boiler.name} (${boiler.connection_type})`,
                            removeKey: index,
                        }))).map((row) => (
                            <AddedDeviceLine key={row.label} label={row.label} count={row.count} onRemove={() => removeBoiler(row.removeKeys[0])} />
                        ))}
                    </AddedDevicesBlock>
                )}
            </section>

            <SectionDivider />

            <div className="sel-group-label">Гидравлика</div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap', marginBottom: 32 }}>

            <section style={{ flex: '1 1 280px', minWidth: 0 }}>
                <h2>Смесительные узлы</h2>
                <SectionSubtitle>Какое количество смесительных узлов будет использоваться в системе?</SectionSubtitle>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {MIXING_TEMPLATES.map((item, index) => (
                        <div
                            key={index}
                            className="sel-card"
                            style={{
                                border: '1px solid #d7dbe4',
                                borderRadius: 10,
                                padding: 16,
                                background: '#fff',
                                flex: '1 1 260px',
                                minWidth: 260,
                            }}
                        >
                            <div className="sel-card-title" style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>{item.label}</div>
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
                                    marginTop: 'auto',
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
                    <AddedDevicesBlock>
                        <AddedDevicesTitle>Добавленные смесительные узлы</AddedDevicesTitle>
                        {(() => {
                            const groups = {};
                            incomingScheme.wired_devices.forEach((d) => {
                                if (isGroupedDevice(d, 'mixing', MIXING_TEMPLATES)) {
                                    if (!groups[d._uid]) groups[d._uid] = [];
                                    groups[d._uid].push(d);
                                }
                            });
                            return aggregateAddedItems(Object.entries(groups).map(([uidVal, devices]) => ({
                                label: getGroupedUnitLabel(uidVal, devices, incomingScheme.sensors, MIXING_TEMPLATES),
                                removeKey: uidVal,
                            }))).map((row) => (
                                <AddedDeviceLine key={row.label} label={row.label} count={row.count} onRemove={() => removeMixingUnit(Number(row.removeKeys[0]))} />
                            ));
                        })()}
                    </AddedDevicesBlock>
                )}
            </section>

            <section style={{ flex: '1 1 280px', minWidth: 0 }}>
                <h2>Бойлеры ГВС</h2>
                <SectionSubtitle>Какое количество бойлеров косвенного нагрева подключено после гидравлического разделителя?</SectionSubtitle>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {GVS_TEMPLATES.map((item, index) => (
                        <div
                            key={index}
                            className="sel-card"
                            style={{
                                border: '1px solid #d7dbe4',
                                borderRadius: 10,
                                padding: 16,
                                background: '#fff',
                                flex: '1 1 260px',
                                minWidth: 260,
                            }}
                        >
                            <div className="sel-card-title" style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>{item.label}</div>
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
                                    marginTop: 'auto',
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
                    <AddedDevicesBlock>
                        <AddedDevicesTitle>Добавленные бойлеры ГВС</AddedDevicesTitle>
                        {(() => {
                            const groups = {};
                            incomingScheme.wired_devices.forEach((d) => {
                                if (isGroupedDevice(d, 'gvs', GVS_TEMPLATES)) {
                                    if (!groups[d._uid]) groups[d._uid] = [];
                                    groups[d._uid].push(d);
                                }
                            });
                            return aggregateAddedItems(Object.entries(groups).map(([uidVal, devices]) => ({
                                label: getGroupedUnitLabel(uidVal, devices, incomingScheme.sensors, GVS_TEMPLATES),
                                removeKey: uidVal,
                            }))).map((row) => (
                                <AddedDeviceLine key={row.label} label={row.label} count={row.count} onRemove={() => removeMixingUnit(Number(row.removeKeys[0]))} />
                            ));
                        })()}
                    </AddedDevicesBlock>
                )}
            </section>

            <section style={{ flex: '1 1 280px', minWidth: 0 }}>
                <h2>Насосы</h2>
                <SectionSubtitle>Какое количество циркуляционных насосов будет использоваться в системе?</SectionSubtitle>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {PUMP_TEMPLATES.map((item, index) => (
                        <div
                            key={index}
                            className="sel-card"
                            style={{
                                border: '1px solid #d7dbe4',
                                borderRadius: 10,
                                padding: 16,
                                background: '#fff',
                                flex: '1 1 260px',
                                minWidth: 260,
                            }}
                        >
                            <div className="sel-card-title" style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>{item.label}</div>
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
                                    marginTop: 'auto',
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
                    <AddedDevicesBlock>
                        <AddedDevicesTitle>Добавленные насосы</AddedDevicesTitle>
                        {(() => {
                            const groups = {};
                            incomingScheme.wired_devices.forEach((d) => {
                                if (isGroupedDevice(d, 'pump', PUMP_TEMPLATES)) {
                                    if (!groups[d._uid]) groups[d._uid] = [];
                                    groups[d._uid].push(d);
                                }
                            });
                            return aggregateAddedItems(Object.entries(groups).map(([uidVal, devices]) => ({
                                label: devices[0]?._label || devices.map((d) => getTemplateLabelByType(PUMP_TEMPLATES, d.type, d.type)).join(', '),
                                removeKey: uidVal,
                            }))).map((row) => (
                                <AddedDeviceLine key={row.label} label={row.label} count={row.count} onRemove={() => removeMixingUnit(Number(row.removeKeys[0]))} />
                            ));
                        })()}
                    </AddedDevicesBlock>
                )}
            </section>

            </div>{/* /Гидравлика */}

            <SectionDivider />

            <div className="sel-group-label">Управление климатом</div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap', marginBottom: 32 }}>
            <section style={{ flex: '1 1 360px', minWidth: 0 }}>
                <h2>Зоны</h2>
                <SectionSubtitle>Каким количеством зон будет управлять система с помощью двухходовых сервоприводов?</SectionSubtitle>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {ZONE_TEMPLATES.map((item, index) => (
                        <div
                            key={index}
                            className="sel-card"
                            style={{
                                border: '1px solid #d7dbe4',
                                borderRadius: 10,
                                padding: 16,
                                background: '#fff',
                                flex: '1 1 260px',
                                minWidth: 260,
                            }}
                        >
                            <div className="sel-card-title" style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>{item.label}</div>
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
                                    marginTop: 'auto',
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
                    <AddedDevicesBlock>
                        <AddedDevicesTitle>Добавленные зоны</AddedDevicesTitle>
                        {(() => {
                            const groups = {};
                            incomingScheme.wired_devices.forEach((d) => {
                                if (isGroupedDevice(d, 'zone', ZONE_TEMPLATES)) {
                                    if (!groups[d._uid]) groups[d._uid] = [];
                                    groups[d._uid].push(d);
                                }
                            });
                            return aggregateAddedItems(Object.entries(groups).map(([uidVal, devices]) => ({
                                label: getGroupedUnitLabel(uidVal, devices, incomingScheme.sensors, ZONE_TEMPLATES),
                                removeKey: uidVal,
                            }))).map((row) => (
                                <AddedDeviceLine key={row.label} label={row.label} count={row.count} onRemove={() => removeMixingUnit(Number(row.removeKeys[0]))} />
                            ));
                        })()}
                    </AddedDevicesBlock>
                )}
            </section>

            <section style={{ flex: '1 1 360px', minWidth: 0 }}>
                <h2>Прочее оборудование</h2>
                <SectionSubtitle>Какое кол-во прочего оборудования (сирены и т.д.) будет управляться с помощью контроллера?</SectionSubtitle>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {OTHER_EQUIP_TEMPLATES.map((item, index) => (
                        <div
                            key={index}
                            className="sel-card"
                            style={{
                                border: '1px solid #d7dbe4',
                                borderRadius: 10,
                                padding: 16,
                                background: '#fff',
                                flex: '1 1 260px',
                                minWidth: 260,
                            }}
                        >
                            <div className="sel-card-title" style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>{item.label}</div>
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
                                    marginTop: 'auto',
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
                    <AddedDevicesBlock>
                        <AddedDevicesTitle>Добавленное оборудование</AddedDevicesTitle>
                        {(() => {
                            const groups = {};
                            incomingScheme.wired_devices.forEach((d) => {
                                if (isGroupedDevice(d, 'other', OTHER_EQUIP_TEMPLATES)) {
                                    if (!groups[d._uid]) groups[d._uid] = [];
                                    groups[d._uid].push(d);
                                }
                            });
                            return aggregateAddedItems(Object.entries(groups).map(([uidVal, devices]) => ({
                                label: getGroupedUnitLabel(uidVal, devices, incomingScheme.sensors, OTHER_EQUIP_TEMPLATES),
                                removeKey: uidVal,
                            }))).map((row) => (
                                <AddedDeviceLine key={row.label} label={row.label} count={row.count} onRemove={() => removeMixingUnit(Number(row.removeKeys[0]))} />
                            ));
                        })()}
                    </AddedDevicesBlock>
                )}
            </section>
            </div>{/* /Управление климатом */}

            <SectionDivider />

            <div className="sel-group-label">Датчики и защита</div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap', marginBottom: 32 }}>
            <div style={{ flex: '1 1 500px', minWidth: 0 }}>
            <section style={{ marginBottom: 32 }}>
                <h2>Датчики температуры</h2>
                <SectionSubtitle>Укажите тип и количество датчиков температуры</SectionSubtitle>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div
                        className="sel-card"
                        style={{
                            width: '100%',
                            border: '1px solid #d7dbe4',
                            borderRadius: 14,
                            padding: 18,
                            background: '#fff',
                        }}
                    >
                        <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 16 }}>{temperatureSensorTemplate?.label}</div>

                        <div style={{ marginBottom: 14 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#475569' }}>Подключение</div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {[
                                    { value: 'wireless', label: 'Беспроводной' },
                                    { value: 'wired', label: 'Проводной' },
                                ].map((item) => (
                                    <button
                                        className="selection-option-button"
                                        key={item.value}
                                        type="button"
                                        onClick={() => selectTemperatureSensorGroup(item.value)}
                                        style={{
                                            padding: '8px 12px',
                                            border: `1px solid ${temperatureSensorGroup === item.value ? '#c85e18' : '#d7dbe4'}`,
                                            borderRadius: 8,
                                            background: temperatureSensorGroup === item.value ? '#e07020' : '#fff',
                                            color: temperatureSensorGroup === item.value ? '#fff' : '#202738',
                                            cursor: 'pointer',
                                            fontSize: 13,
                                        }}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: 14 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#475569' }}>Тип датчика</div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {temperatureSensorOptions.map((item) => (
                                    <button
                                        className="selection-option-button"
                                        key={item.key}
                                        type="button"
                                        onClick={() => setTemperatureSensorKey(item.key)}
                                        style={{
                                            padding: '8px 12px',
                                            border: `1px solid ${temperatureSensorTemplate?.key === item.key ? '#c85e18' : '#d7dbe4'}`,
                                            borderRadius: 8,
                                            background: temperatureSensorTemplate?.key === item.key ? '#fff7ed' : '#fff',
                                            color: '#202738',
                                            cursor: 'pointer',
                                            fontSize: 13,
                                        }}
                                    >
                                        {item.label.replace(/^Беспроводной |^Проводной /, '')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <pre
                            style={{
                                background: '#f5f7fb',
                                padding: 10,
                                borderRadius: 6,
                                fontSize: 12,
                                lineHeight: 1.5,
                                overflow: 'auto',
                                margin: '0 0 12px',
                            }}
                        >
{JSON.stringify(temperatureSensorTemplate?.data, null, 4)}
                        </pre>
                        <button
                            onClick={() => addTemperatureSensor(temperatureSensorTemplate)}
                            style={{
                                padding: '8px 16px',
                                border: '1px solid #3498db',
                                borderRadius: 8,
                                background: '#3498db',
                                color: '#fff',
                                cursor: 'pointer',
                                fontSize: 14,
                                fontWeight: 700,
                            }}
                        >
                            Добавить датчик
                        </button>
                    </div>
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
                    const kitTemperatureDevices = CONTROLLER_KIT_TEMPERATURE_DEVICES[controllerType] || [];
                    if (temperatureSensors.length === 0 && kitTemperatureDevices.length === 0) return null;

                    return (
                    <AddedDevicesBlock>
                        <AddedDevicesTitle>Добавленные датчики температуры</AddedDevicesTitle>
                        {kitTemperatureDevices.map((device) => (
                            <AddedDeviceLine
                                key={`kit:${device.label}`}
                                label={device.label}
                                count={device.count}
                                badge="Комплектный"
                            />
                        ))}
                        {aggregateAddedItems(temperatureSensors.map(({ device, target }) => ({
                            label: getTemperatureSensorLabel(device),
                            removeKey: { target, id: device.id },
                        }))).map((row) => (
                            <AddedDeviceLine
                                key={row.label}
                                label={row.label}
                                count={row.count}
                                onRemove={() => removeTemperatureSensor(row.removeKeys[0].target, row.removeKeys[0].id)}
                            />
                        ))}
                    </AddedDevicesBlock>
                    );
                })()}
            </section>

            <section>
                <h2>Токовый датчик давления</h2>
                <SectionSubtitle>Укажите количество токовых датчиков давления в системе</SectionSubtitle>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {PRESSURE_TEMPLATES.map((item, index) => (
                        <div
                            key={index}
                            className="sel-card"
                            style={{
                                border: '1px solid #d7dbe4',
                                borderRadius: 10,
                                padding: 16,
                                background: '#fff',
                                flex: '1 1 260px',
                                minWidth: 260,
                            }}
                        >
                            <div className="sel-card-title" style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>{item.label}</div>
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
                                    marginTop: 'auto',
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
                    <AddedDevicesBlock>
                        <AddedDevicesTitle>Добавленные датчики давления</AddedDevicesTitle>
                        {aggregateAddedItems(incomingScheme.sensors.filter((s) => s.type === 'pressure-sensor').map((s) => ({
                            label: 'Датчик давления',
                            removeKey: s.id,
                        }))).map((row) => (
                            <AddedDeviceLine
                                key={row.label}
                                label={row.label}
                                count={row.count}
                                onRemove={() => setIncomingScheme((prev) => ({ ...prev, sensors: (prev.sensors || []).filter((x) => x.id !== row.removeKeys[0]) }))}
                            />
                        ))}
                    </AddedDevicesBlock>
                )}
            </section>
            </div>

            <section style={{ flex: '1 1 500px', minWidth: 0 }}>
                <h2>Термостаты</h2>
                <SectionSubtitle>Укажите тип и количество термостатов</SectionSubtitle>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div
                        className="sel-card"
                        style={{
                            width: '100%',
                            border: '1px solid #d7dbe4',
                            borderRadius: 14,
                            padding: 18,
                            background: '#fff',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 16 }}>{thermostatTemplate.label}</div>

                            <div style={{ marginBottom: 14 }}>
                                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#475569' }}>Подключение</div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {THERMOSTAT_CONNECTIONS.map((item) => (
                                        <button
                                            className="selection-option-button"
                                            key={item.value}
                                            type="button"
                                            onClick={() => setThermostatTarget(item.value)}
                                            style={{
                                                padding: '8px 12px',
                                                border: `1px solid ${thermostatTarget === item.value ? '#c85e18' : '#d7dbe4'}`,
                                                borderRadius: 8,
                                                background: thermostatTarget === item.value ? '#e07020' : '#fff',
                                                color: thermostatTarget === item.value ? '#fff' : '#202738',
                                                cursor: 'pointer',
                                                fontSize: 13,
                                            }}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ marginBottom: 14 }}>
                                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#475569' }}>Цвет</div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {THERMOSTAT_COLORS.map((item) => (
                                        <button
                                            className="selection-option-button"
                                            key={item.value}
                                            type="button"
                                            onClick={() => setThermostatColor(item.value)}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                padding: '8px 12px',
                                                border: `1px solid ${thermostatColor === item.value ? '#c85e18' : '#d7dbe4'}`,
                                                borderRadius: 8,
                                                background: thermostatColor === item.value ? '#fff7ed' : '#fff',
                                                color: '#202738',
                                                cursor: 'pointer',
                                                fontSize: 13,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    width: 14,
                                                    height: 14,
                                                    borderRadius: '50%',
                                                    border: '1px solid #cbd5e1',
                                                    background: item.value === 'black' ? '#111827' : item.value === 'gray' ? '#9ca3af' : '#fff',
                                                }}
                                            />
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 14, fontSize: 14 }}>
                                <input
                                    type="checkbox"
                                    checked={thermostatHasFloorSensor}
                                    onChange={(event) => setThermostatHasFloorSensor(event.target.checked)}
                                />
                                Добавить датчик пола
                            </label>

                            <pre
                                style={{
                                    background: '#f5f7fb',
                                    padding: 10,
                                    borderRadius: 6,
                                    fontSize: 12,
                                    lineHeight: 1.5,
                                    overflow: 'auto',
                                    margin: '0 0 12px',
                                }}
                            >
{JSON.stringify(thermostatTemplate.data, null, 4)}
                            </pre>
                            <button
                                onClick={() => addThermostat(thermostatTemplate)}
                                style={{
                                    marginTop: 'auto',
                                    padding: '8px 16px',
                                    border: '1px solid #3498db',
                                    borderRadius: 8,
                                    background: '#3498db',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontSize: 14,
                                    fontWeight: 700,
                                }}
                            >
                                Добавить термостат
                            </button>
                        </div>
                    </div>
                </div>

                {(() => {
                    const wiredThermostats = (Array.isArray(incomingScheme.wired_devices) ? incomingScheme.wired_devices : [])
                        .filter((device) => canonicalType(device?.type) === 'thermostat')
                        .map((device) => ({ device, target: 'wired_devices' }));
                    const wirelessThermostats = (Array.isArray(incomingScheme.wireless_devices) ? incomingScheme.wireless_devices : [])
                        .filter((device) => canonicalType(device?.type) === 'thermostat')
                        .map((device) => ({ device, target: 'wireless_devices' }));
                    const thermostats = [...wiredThermostats, ...wirelessThermostats];
                    if (thermostats.length === 0) return null;

                    return (
                        <AddedDevicesBlock>
                            <AddedDevicesTitle>Добавленные термостаты</AddedDevicesTitle>
                            {aggregateAddedItems(thermostats.map(({ device, target }) => {
                                const colorLabel = THERMOSTAT_COLORS.find((item) => item.value === device.color)?.label || device.color || 'Без цвета';
                                const connectionLabel = target === 'wired_devices' ? 'Проводной' : 'Беспроводной';
                                const hasFloorSensor = Array.isArray(device.additions)
                                    && device.additions.some((addition) => canonicalType(addition?.type) === 'flask-sensor-floor');

                                return {
                                    label: `Термостат ${connectionLabel.toLowerCase()}, ${colorLabel.toLowerCase()}${hasFloorSensor ? ', с датчиком пола' : ''}`,
                                    removeKey: { target, id: device.id },
                                };
                            })).map((row) => (
                                <AddedDeviceLine
                                    key={row.label}
                                    label={row.label}
                                    count={row.count}
                                    onRemove={() => removeThermostat(row.removeKeys[0].target, row.removeKeys[0].id)}
                                />
                            ))}
                        </AddedDevicesBlock>
                    );
                })()}
            </section>
            </div>{/* /Датчики и защита flex */}

            <section style={{ marginBottom: 32 }}>
                <h2>Контроль протечки воды</h2>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {LEAK_TEMPLATES.map((item, index) => (
                        <div
                            key={index}
                            className="sel-card"
                            style={{
                                border: '1px solid #d7dbe4',
                                borderRadius: 10,
                                padding: 16,
                                background: '#fff',
                                flex: '1 1 260px',
                                minWidth: 260,
                            }}
                        >
                            <div className="sel-card-title" style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>{item.label}</div>
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
                                    marginTop: 'auto',
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
                    const leakItems = [
                        ...(Array.isArray(incomingScheme.sensors) ? incomingScheme.sensors : [])
                            .filter((sensor) => sensor.type === 'leak-sensor')
                            .map((sensor) => ({ label: 'Датчик протечки', removeKey: { target: 'sensors', id: sensor.id } })),
                        ...(Array.isArray(incomingScheme.wired_devices) ? incomingScheme.wired_devices : [])
                            .filter((device) => device.type === 'valve')
                            .map((device) => ({ label: 'Запорный клапан', removeKey: { target: 'wired_devices', id: device.id } })),
                    ];
                    if (leakItems.length === 0) return null;

                    return (
                        <AddedDevicesBlock>
                            <AddedDevicesTitle>Добавленные устройства контроля протечки</AddedDevicesTitle>
                            {aggregateAddedItems(leakItems).map((row) => (
                                <AddedDeviceLine
                                    key={row.label}
                                    label={row.label}
                                    count={row.count}
                                    onRemove={() => setIncomingScheme((prev) => ({
                                        ...prev,
                                        [row.removeKeys[0].target]: (prev[row.removeKeys[0].target] || []).filter((item) => item.id !== row.removeKeys[0].id),
                                    }))}
                                />
                            ))}
                        </AddedDevicesBlock>
                    );
                })()}
            </section>

            <SectionDivider />

            <div className="sel-group-label">Прочее</div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap', marginBottom: 32 }}>
            <section style={{ flex: '1 1 400px', minWidth: 0 }}>
                <h2>Дискретные входы</h2>
                <SectionSubtitle>Укажите какое количество и как будут использоваться дискретные входы</SectionSubtitle>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {DISCRETE_TEMPLATES.map((item, index) => (
                        <div
                            key={index}
                            className="sel-card"
                            style={{
                                border: '1px solid #d7dbe4',
                                borderRadius: 10,
                                padding: 16,
                                background: '#fff',
                                flex: '1 1 260px',
                                minWidth: 260,
                            }}
                        >
                            <div className="sel-card-title" style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>{item.label}</div>
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
                                    marginTop: 'auto',
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
                    <AddedDevicesBlock>
                        <AddedDevicesTitle>Добавленные дискретные входы</AddedDevicesTitle>
                        {aggregateAddedItems(incomingScheme.wired_devices.filter((d) => DISCRETE_TEMPLATES.some((t) => t.data.type === d.type)).map((d) => {
                            const label = DISCRETE_TEMPLATES.find((t) => t.data.type === d.type)?.label || d.type;
                            return { label, removeKey: d.id };
                        })).map((row) => (
                            <AddedDeviceLine
                                key={row.label}
                                label={row.label}
                                count={row.count}
                                onRemove={() => setIncomingScheme((prev) => ({ ...prev, wired_devices: (prev.wired_devices || []).filter((x) => x.id !== row.removeKeys[0]) }))}
                            />
                        ))}
                    </AddedDevicesBlock>
                )}
            </section>

            <section style={{ flex: '1 1 400px', minWidth: 0 }}>
                <h2>Источник бесперебойного питания</h2>
                <SectionSubtitle>Требуется ли установка источника бесперебойного питания</SectionSubtitle>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {UPS_TEMPLATES.map((item, index) => (
                        <div
                            key={index}
                            className="sel-card"
                            style={{
                                border: '1px solid #d7dbe4',
                                borderRadius: 10,
                                padding: 16,
                                background: '#fff',
                                flex: '1 1 260px',
                                minWidth: 260,
                            }}
                        >
                            <div className="sel-card-title" style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>{item.label}</div>
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
                                    marginTop: 'auto',
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
                    <AddedDevicesBlock>
                        <AddedDevicesTitle>Добавленные модули питания</AddedDevicesTitle>
                        {aggregateAddedItems(incomingScheme.power_modules.filter((m) => m === 'ups').map((m) => ({
                            label: 'UPS',
                            removeKey: m,
                        }))).map((row) => (
                            <AddedDeviceLine
                                key={row.label}
                                label={row.label}
                                count={row.count}
                                onRemove={() => removePowerModule(row.removeKeys[0])}
                            />
                        ))}
                    </AddedDevicesBlock>
                )}
            </section>
            </div>{/* /Прочее */}

            {showJsonDetails && (
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
            )}
            {showJsonDetails && ecosmartIncomingScheme && (
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
