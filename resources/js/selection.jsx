import React, { useState, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { getAllOneWireDevicesForBalancing } from './scheme/domain/initialState';

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

const MYHEAT_LOGO_PATH = new URL('../assets/logo/logo.svg', import.meta.url).href;

const MyHeatBadge = ({ size = 16 }) => (
    <img
        src={MYHEAT_LOGO_PATH}
        alt="MyHeat"
        title="Оборудование MyHeat"
        style={{ height: size, width: 'auto', flexShrink: 0, alignSelf: 'center' }}
    />
);

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
const PRO_EXT_DEVICE_CAPACITY = 12;
const AUTO_REQUIRED_MODULE_SOURCE = 'selection-required-module';

const CONTROLLER_LABELS = {
    go: 'GO',
    'go+': 'GO+',
    smart2: 'Smart2',
    pro: 'PRO',
    ecosmart: 'ECOsmart',
};

const CONTROLLER_DESC_BOX_WIDTH = 260;
const CONTROLLER_CONNECTOR_GAP = 20;
const CONTROLLER_CONNECTOR_COLOR = '#c7ccd6';

const controllerDescBoxStyle = {
    position: 'absolute',
    width: CONTROLLER_DESC_BOX_WIDTH,
    border: '1px solid #d7dbe4',
    borderRadius: 10,
    background: '#f8fafc',
    padding: '10px 14px',
    fontSize: 12.5,
    lineHeight: 1.45,
    color: '#64748b',
    textAlign: 'center',
    boxSizing: 'border-box',
};

const CONTROLLER_KIT_TEMPERATURE_DEVICES = {
    pro: [
        { label: 'Цифровой датчик температуры настенный', count: 1, templateKey: 'wired-wall-digital' },
        { label: 'Цифровой датчик температуры в колбе', count: 2, templateKey: 'wired-flask-digital' },
    ],
    smart2: [
        { label: 'Проводной Настенный цифровой датчик', count: 1, templateKey: 'wired-wall-digital' },
    ],
    ecosmart: [
        { label: 'NTC-датчик температуры', count: 3, templateKey: 'wired-flask-ntc' },
    ],
    go: [
        { label: 'Настенный цифровой датчик температуры', count: 1, templateKey: 'wired-wall-digital' },
    ],
    'go+': [
        { label: 'Беспроводной комнатный датчик температуры', count: 1, templateKey: 'wireless-wall' },
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

// go/go+ имеют встроенный радиомодуль (у go он неактивированный, но модуль RDT2 ему всё равно не нужен),
// ecosmart имеет собственный радиомодуль; pro и smart2 радиомодуля не имеют вовсе и требуют RDT2
// для любого беспроводного устройства в схеме.
const RDT2_REQUIRED_CONTROLLERS = new Set(['pro', 'smart2']);

const isRdt2Module = (device) => canonicalType(typeof device === 'string' ? device : device?.type) === 'rdt2';

const countRdt2Modules = (scheme) => {
    const controllerDevices = Array.isArray(scheme?.controller?.one_wire_devices) ? scheme.controller.one_wire_devices : [];
    const oneWireModules = Array.isArray(scheme?.one_wire_modules) ? scheme.one_wire_modules : [];
    const extOneWireDevices = (Array.isArray(scheme?.ext_modules) ? scheme.ext_modules : [])
        .flatMap((moduleItem) => (Array.isArray(moduleItem?.one_wire_devices) ? moduleItem.one_wire_devices : []));

    return [...controllerDevices, ...oneWireModules, ...extOneWireDevices]
        .filter(isRdt2Module)
        .length;
};

const getRequiredRdt2ModuleCount = (scheme, controllerTypeOverride = null) => {
    const controllerType = controllerTypeOverride || getControllerType(scheme);
    if (!RDT2_REQUIRED_CONTROLLERS.has(controllerType)) return 0;
    const wirelessDevices = Array.isArray(scheme?.wireless_devices) ? scheme.wireless_devices : [];
    if (wirelessDevices.length === 0) return 0;
    return countRdt2Modules(scheme) > 0 ? 0 : 1;
};

const getOneWireCapacityUsage = (scheme, controllerType) => {
    const devices = getAllOneWireDevicesForBalancing(scheme);
    if (controllerType !== 'pro') return devices.length;

    const extDevices = Array.isArray(scheme?.controller?.ext_devices) ? scheme.controller.ext_devices : [];
    let freeExtSlots = Math.max(0, PRO_EXT_DEVICE_CAPACITY - extDevices.length);
    const movedDeviceIndexes = new Set();
    const thermostatGroups = new Map();

    devices.forEach((device, index) => {
        const ownerKey = device?.ownerThermostatKey;
        if (!ownerKey) return;

        const group = thermostatGroups.get(ownerKey) || { indexes: [], hasFloorSensor: false };
        group.indexes.push(index);
        const type = canonicalType(device?.type);
        if (type === 'floor-sensor' || type === 'flask-sensor-floor') {
            group.hasFloorSensor = true;
        }
        thermostatGroups.set(ownerKey, group);
    });

    devices.forEach((device, index) => {
        if (freeExtSlots <= 0 || canonicalType(device?.type) !== 'thermostat') return;
        const ownerKey = device?.ownerThermostatKey;
        if (!ownerKey) return;
        const group = thermostatGroups.get(ownerKey);
        if (!group?.hasFloorSensor) return;
        group.indexes.forEach((candidateIndex) => movedDeviceIndexes.add(candidateIndex));
        freeExtSlots -= 1;
    });

    return devices.length - movedDeviceIndexes.size;
};

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
    const controller = scheme?.controller && typeof scheme.controller === 'object' ? scheme.controller : {};

    const controllerOneWireDevices = Array.isArray(controller.one_wire_devices) ? controller.one_wire_devices : [];
    const oneWireThermostats = wiredDevices.filter(isOneWireThermostat).length
        + controllerOneWireDevices.filter(isOneWireThermostat).length;
    const requiredNtcModules = getRequiredNtcOneWireModuleCount(scheme);
    const totalNtcModules = countNtcOneWireModules(scheme) + requiredNtcModules;
    const requiredNtcOneWireLines = Math.ceil(totalNtcModules / NTC_MODULES_PER_ONE_WIRE_LINE);
    const oneWireLines = getOneWireLineCount(scheme?.ext_modules);
    const requiredRdt2Modules = getRequiredRdt2ModuleCount(scheme, controllerType);
    const oneWire = getOneWireCapacityUsage(scheme, controllerType) + requiredNtcModules + requiredRdt2Modules;

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

    return { oneWire, oneWireThermostats, bus, relay, relayS, di, io4Only, analog420, ups, requiredNtcModules, totalNtcModules, requiredNtcOneWireLines, oneWireLines, requiredRdt2Modules };
};

const getPreferredGoControllerType = (scheme) => (
    Array.isArray(scheme?.wireless_devices) && scheme.wireless_devices.length > 0
        ? 'go+'
        : 'go'
);

// идентификация ecosmart
const isEcosmartIdentified = (scheme) => {
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

    // У ecosmart relay-линия — не единый пул слотов, а фиксированные
    // per-role пары пинов (смеситель, насос, клапан, ГВС и т.д.),
    // поэтому общая числовая проверка relay/relay-S к ней неприменима.
    if (controllerType === 'ecosmart') {
        if (!isEcosmartIdentified(scheme)) {
            issues.push('Состав оборудования не подходит под фиксированные relay-линии ECOsmart (смесительные узлы, насосы, клапан, ГВС и т.д. имеют ограниченное число выделенных слотов).');
        }
        if (stats.ups > 0 && !limits.power) {
            issues.push('UPS требует контроллер с power-линией: smart2 или pro.');
        }
        return issues;
    }

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
    const candidateScheme = getControllerCandidateScheme(scheme, controllerType);

    if (controllerType === 'ecosmart') {
        return { compatible: isEcosmartIdentified(candidateScheme), modules: [] };
    }

    const stats = getCompatibilityStats(candidateScheme, controllerType);
    const modules = [];
    let limits = { ...baseLimits };
    const addModules = (type, count) => {
        if (count > 0) modules.push(`${type} x${count}`);
    };

    addModules('ntc-1-wire', stats.requiredNtcModules);
    addModules('rdt2', stats.requiredRdt2Modules);

    if (controllerType === 'smart2') {
        if (stats.ups > 0) limits.di = Math.max(0, limits.di - 2);
        const baseRelayStats = getRelayStatsForLimits(candidateScheme, limits);
        const relayDeficit = Math.max(0, baseRelayStats.relay - limits.relay);
        const flexibleRelayOverflow = Math.max(0, baseRelayStats.flexibleRelayDevices - baseRelayStats.flexibleRelayOnRelay);
        const freeRelaySSlots = Math.max(0, limits.relayS - baseRelayStats.strictRelayS);
        const flexibleRelayOverflowBeyondRelayS = Math.max(0, flexibleRelayOverflow - freeRelaySSlots);
        const rl2Count = Math.max(
            Math.ceil(relayDeficit / 2),
            Math.ceil(flexibleRelayOverflowBeyondRelayS / 2),
        );
        const relayStatsAfterRelayModules = getRelayStatsForLimits(candidateScheme, {
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

        const baseRelayStats = getRelayStatsForLimits(candidateScheme, limits);
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
        const relayStatsAfterRelayModules = getRelayStatsForLimits(candidateScheme, limits);
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

    const finalRelayStats = getRelayStatsForLimits(candidateScheme, limits);
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

const makeExtModule = (type, autoSource = null) => ({
    id: generateId(),
    type,
    device_type: 'module',
    connection_type: 'EXT',
    ...(autoSource ? { _auto_source: autoSource } : {}),
});

const makeDiModule = (type, autoSource = null) => ({
    id: generateId(),
    type,
    device_type: 'module',
    connection_type: 'DI',
    ...(autoSource ? { _auto_source: autoSource } : {}),
});

const makeOneWireModule = (type, autoSource = null) => ({
    id: generateId(),
    type,
    device_type: 'module',
    connection_type: '1-wire',
    ...(autoSource ? { _auto_source: autoSource } : {}),
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
    const controller = scheme?.controller && typeof scheme.controller === 'object' ? scheme.controller : { type: 'ecosmart' };
    const currentModules = Array.isArray(controller.ecosmart_bl2) ? controller.ecosmart_bl2 : [];
    if (getBusSmartBoilerCount(scheme) < 2) {
        if (currentModules.length === 0) return scheme;
        const { ecosmart_bl2: removedEcosmartBl2, ...nextController } = controller;
        return { ...scheme, controller: nextController };
    }
    if (currentModules.some((moduleItem) => canonicalType(moduleItem?.type) === 'ecosmartbl2')) return scheme;
    return {
        ...scheme,
        controller: {
            ...controller,
            ecosmart_bl2: [...currentModules, makeEcosmartBl2Module()],
        },
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
    const controllerDevices = Array.isArray(controller?.one_wire_devices) ? controller.one_wire_devices : null;
    const sensors = Array.isArray(scheme?.sensors) ? scheme.sensors : null;
    const hasControllerSensor = controllerDevices?.some(isStupidBoilerSensor);
    const hasPublicSensor = sensors?.some(isStupidBoilerSensor);
    if (!hasControllerSensor && !hasPublicSensor) return scheme;

    const nextController = hasControllerSensor
        ? { ...controller, one_wire_devices: controllerDevices.filter((device) => !isStupidBoilerSensor(device)) }
        : controller;

    return {
        ...scheme,
        ...(nextController ? { controller: nextController } : {}),
        sensors: hasPublicSensor ? sensors.filter((sensor) => !isStupidBoilerSensor(sensor)) : sensors,
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

// Откатывает внутренние ecosmart-материализации, чтобы при смене контроллера
// устройства не терялись вместе с заменяемым объектом controller.
const unwindEcosmartInternals = (scheme) => {
    let nextScheme = scheme;
    const controller = nextScheme?.controller && typeof nextScheme.controller === 'object' ? nextScheme.controller : null;

    if (controller && Array.isArray(controller.ext_devices) && controller.ext_devices.length > 0) {
        const { ext_devices: extDevices, ...restController } = controller;
        nextScheme = {
            ...nextScheme,
            controller: restController,
            wired_devices: [
                ...(Array.isArray(nextScheme.wired_devices) ? nextScheme.wired_devices : []),
                ...extDevices.map((device) => ({ ...device, connection_type: '1-wire' })),
            ],
        };
    }

    if (nextScheme?.controller && typeof nextScheme.controller === 'object' && Array.isArray(nextScheme.controller.ecosmart_bl2)) {
        const { ecosmart_bl2: removedEcosmartBl2, ...restController } = nextScheme.controller;
        nextScheme = { ...nextScheme, controller: restController };
    }

    const boilers = Array.isArray(nextScheme?.boilers) ? nextScheme.boilers : [];
    const hasStupidBoiler = boilers.some((boiler) => canonicalType(boiler?.type) === 'stupid');
    const sensors = Array.isArray(nextScheme?.sensors) ? nextScheme.sensors : [];
    const hasStupidBoilerSensor = sensors.some((sensor) => canonicalType(sensor?.type) === 'flask-sensor-stupid-boiler');
    if (hasStupidBoiler && !hasStupidBoilerSensor) {
        nextScheme = { ...nextScheme, sensors: [...sensors, makeStupidBoilerSensor()] };
    }

    return nextScheme;
};

const withControllerValue = (scheme, controllerValue) => {
    const base = getControllerType(scheme) === 'ecosmart' ? unwindEcosmartInternals(scheme) : scheme;
    return { ...base, controller: controllerValue };
};

const normalizeModulesForController = (scheme) => {
    const controllerType = getControllerType(scheme);
    let nextScheme = scheme;

    if (controllerType === 'ecosmart' && Array.isArray(nextScheme?.ecosmart_bl2)) {
        const { ecosmart_bl2: legacyEcosmartBl2, ...rest } = nextScheme;
        const controller = rest.controller && typeof rest.controller === 'object' ? rest.controller : { type: 'ecosmart' };
        nextScheme = {
            ...rest,
            controller: Array.isArray(controller.ecosmart_bl2) && controller.ecosmart_bl2.length > 0
                ? controller
                : { ...controller, ecosmart_bl2: legacyEcosmartBl2 },
        };
    } else if (controllerType !== 'ecosmart' && Array.isArray(nextScheme?.ecosmart_bl2)) {
        const { ecosmart_bl2: removedEcosmartBl2, ...rest } = nextScheme;
        nextScheme = rest;
    }

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

const getControllerCandidateScheme = (scheme, controllerType) => {
    if (getControllerType(scheme) === controllerType) return scheme;
    const controllerValue = getControllerTemplateValue(controllerType);
    return controllerValue
        ? normalizeModulesForController(withControllerValue(scheme, controllerValue))
        : scheme;
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
            ...Array.from({ length: stats.requiredNtcModules }, () => makeOneWireModule('ntc-1-wire', AUTO_REQUIRED_MODULE_SOURCE)),
        ];
        changed = true;
    }

    if (stats.requiredRdt2Modules > 0) {
        oneWireModules = [
            ...oneWireModules,
            ...Array.from({ length: stats.requiredRdt2Modules }, () => makeOneWireModule('rdt2', AUTO_REQUIRED_MODULE_SOURCE)),
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
            ...Array.from({ length: moduleCount }, () => makeDiModule('rl2', AUTO_REQUIRED_MODULE_SOURCE)),
            ...Array.from({ length: relaySModuleCount }, () => makeDiModule('rl2s', AUTO_REQUIRED_MODULE_SOURCE)),
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
                ...Array.from({ length: bl2Count }, () => makeExtModule('bl2', AUTO_REQUIRED_MODULE_SOURCE)),
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
            ...Array.from({ length: relayModuleCount }, () => makeExtModule('rl6', AUTO_REQUIRED_MODULE_SOURCE)),
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
            ...Array.from({ length: relaySModuleCount }, () => makeExtModule('rl6s', AUTO_REQUIRED_MODULE_SOURCE)),
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
            ...Array.from({ length: oneWireModuleCount }, () => makeExtModule('rl6', AUTO_REQUIRED_MODULE_SOURCE)),
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
            ...Array.from({ length: io4Count }, () => makeExtModule('io4', AUTO_REQUIRED_MODULE_SOURCE)),
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
            ...Array.from({ length: di6Count }, () => makeExtModule('di6', AUTO_REQUIRED_MODULE_SOURCE)),
        ];
        changed = true;
    }

    if (!changed) return scheme;
    return { ...scheme, ext_modules: extModules, one_wire_modules: oneWireModules };
};

const isAutoRequiredModule = (moduleItem) => moduleItem?._auto_source === AUTO_REQUIRED_MODULE_SOURCE;

const getRequiredModuleCounts = (items) => (Array.isArray(items) ? items : []).reduce((counts, moduleItem) => {
    if (!isAutoRequiredModule(moduleItem)) return counts;
    const type = canonicalType(moduleItem?.type);
    counts.set(type, (counts.get(type) || 0) + 1);
    return counts;
}, new Map());

const reconcileRequiredModuleList = (currentItems, requiredItems) => {
    const requiredCounts = getRequiredModuleCounts(requiredItems);
    const retainedCounts = new Map();
    const result = [];
    let changed = false;

    (Array.isArray(currentItems) ? currentItems : []).forEach((moduleItem) => {
        if (!isAutoRequiredModule(moduleItem)) {
            result.push(moduleItem);
            return;
        }

        const type = canonicalType(moduleItem?.type);
        const retained = retainedCounts.get(type) || 0;
        if (retained < (requiredCounts.get(type) || 0)) {
            retainedCounts.set(type, retained + 1);
            result.push(moduleItem);
        } else {
            changed = true;
        }
    });

    (Array.isArray(requiredItems) ? requiredItems : []).forEach((moduleItem) => {
        if (!isAutoRequiredModule(moduleItem)) return;
        const type = canonicalType(moduleItem?.type);
        const retained = retainedCounts.get(type) || 0;
        if (retained >= (requiredCounts.get(type) || 0)) return;
        retainedCounts.set(type, retained + 1);
        result.push(moduleItem);
        changed = true;
    });

    return { items: result, changed };
};

const reconcileRequiredModules = (scheme) => {
    const withoutAutoModules = (items) => (Array.isArray(items)
        ? items.filter((moduleItem) => !isAutoRequiredModule(moduleItem))
        : []);
    const manualScheme = {
        ...scheme,
        ext_modules: withoutAutoModules(scheme?.ext_modules),
        di_modules: withoutAutoModules(scheme?.di_modules),
        one_wire_modules: withoutAutoModules(scheme?.one_wire_modules),
    };
    const requiredScheme = withRequiredModules(manualScheme);
    const extModules = reconcileRequiredModuleList(scheme?.ext_modules, requiredScheme?.ext_modules);
    const diModules = reconcileRequiredModuleList(scheme?.di_modules, requiredScheme?.di_modules);
    const oneWireModules = reconcileRequiredModuleList(scheme?.one_wire_modules, requiredScheme?.one_wire_modules);

    if (!extModules.changed && !diModules.changed && !oneWireModules.changed) return scheme;
    return {
        ...scheme,
        ext_modules: extModules.items,
        di_modules: diModules.items,
        one_wire_modules: oneWireModules.items,
    };
};

const resolveControllerAndRequiredModules = (scheme) => {
    scheme = normalizeModulesForController(scheme);
    scheme = reconcileRequiredModules(scheme);
    const currentControllerType = getControllerType(scheme);
    const preferredGoControllerType = getPreferredGoControllerType(scheme);
    if (
        (currentControllerType === 'go' || currentControllerType === 'go+')
        && currentControllerType !== preferredGoControllerType
    ) {
        scheme = reconcileRequiredModules(normalizeModulesForController(withControllerValue(
            scheme,
            getControllerTemplateValue(preferredGoControllerType),
        )));
    }
    const currentControllerIssues = getControllerCompatibilityIssues(scheme);
    if (currentControllerIssues.length > 0) {
        const compatibleOption = getCompatibleControllerOptions(scheme)[0] || null;
        const controllerValue = compatibleOption ? getControllerTemplateValue(compatibleOption.type) : null;
        if (controllerValue) {
            return reconcileRequiredModules(normalizeModulesForController(withControllerValue(scheme, controllerValue)));
        }
    }

    return scheme;
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
        description: 'Предназначен для фиксации протечки воды и передачи аварийного сигнала на контроллер.',
        target: 'sensors',
        data: { id: 1, device_type: 'sensor', type: 'leak-sensor', connection_type: 'di' },
    },
    {
        label: 'Запорный клапан',
        description: 'Предназначен для фиксации протечки воды и передачи аварийного сигнала на контроллер.',
        target: 'wired',
        data: { id: 0, device_type: 'equipment', type: 'valve', connection_type: 'double_relay', additions: [] },
    },
];

const THERMOSTAT_COLORS = [
    { value: 'black', label: 'Черный' },
    { value: 'white', label: 'Белый' },
    { value: 'gray', label: 'Серый' },
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

const BOILER_SEARCH_ENDPOINT = '/api/integration';
const BOILER_SEARCH_DEBOUNCE_MS = 400;

const makeBoilerSearchPayload = (query) => ({
    action: 'getNames',
    data: { name: query },
});

const normalizeBoilerSearchResults = (data) => {
    const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.result)
                ? data.result
                : Array.isArray(data?.names)
                    ? data.names
                    : [];

    return items.map((item) => ({
        ...item,
        id: item.id ?? item.boiler_id,
        name: item.name ?? item.boiler_name,
    })).filter((item) => item.name);
};

const withRinnaiAdapter = (boiler) => (
    String(boiler?.name || '').toLowerCase().includes('rinnai')
        ? { ...boiler, adapter: { ...boiler?.adapter, type: 'rinnai' } }
        : boiler
);

const makeSchemeName = () => {
    const now = new Date();
    return `Подбор ${now.toLocaleDateString('ru-RU')} ${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
};

const TEMPERATURE_SENSOR_TEMPLATES = [
    {
        key: 'wireless-outdoor',
        label: 'Беспроводной Уличный датчик температуры',
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
        label: 'Беспроводной Настенный датчик температуры',
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
        label: 'Проводной Настенный цифровой датчик',
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
        label: 'Проводной Цифровой датчик в колбе',
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
        label: 'Проводной NTC-датчик в колбе',
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
        label: 'Проводной Настенный NTC-датчик',
        target: 'sensors',
        disabled: true,
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

const getKitTemperatureSensorTemplateKey = (device, controllerType) => {
    const type = canonicalType(device?.type);
    if (controllerType === 'ecosmart' && [
        'ntc-sensor',
        'mixing-ntc-sensor',
        'flask-sensor-gvs-boiler',
        'flask-sensor-strategy',
    ].includes(type)) return 'wired-flask-ntc';
    if (controllerType === 'pro') {
        if (type === 'wall-digital-sensor') return 'wired-wall-digital';
        if ([
            'flask-sensor-temperature',
            'flask-sensor-gvs-boiler',
            'flask-sensor-strategy',
            'flask-sensor-mixing-unit',
            'flask-sensor-stupid-boiler',
        ].includes(type)) return 'wired-flask-digital';
    }
    if ((controllerType === 'smart2' || controllerType === 'go') && type === 'wall-digital-sensor') return 'wired-wall-digital';
    if (controllerType === 'go+' && type === 'wall-temperature-sensor') return 'wireless-wall';
    return null;
};

const getKitTemperatureSensorLabel = (device) => {
    const type = canonicalType(device?.type);
    if (type === 'mixing-ntc-sensor') return 'NTC-датчик температуры';
    if (type === 'flask-sensor-gvs-boiler') return 'Датчик бойлера';
    if (type === 'flask-sensor-strategy') return 'Датчик стратегии котлов';
    return getTemperatureSensorLabel(device);
};

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
        description: 'Циркуляционный насос с питанием 220 В предназначен для обеспечения стабильной циркуляции теплоносителя в системах отопления и горячего водоснабжения. Простое подключение и надежная работа делают его оптимальным решением для большинства стандартных систем.',
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
        description: 'Циркуляционный насос с управлением 0–10 В обеспечивает плавное регулирование производительности по внешнему сигналу. Подходит для автоматизированных систем, где требуется точное поддержание заданных параметров и повышение энергоэффективности.',
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
        description: 'Бойлер ГВС используется для приготовления горячей воды за счет теплоносителя системы отопления. Позволяет эффективно обеспечивать горячее водоснабжение при минимальных затратах энергии.',
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
        description: 'Обеспечивает автоматическое управление отоплением с высокой точностью измерения температуры.',
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
        description: 'Предназначен для автоматического управления системой отопления по температуре.',
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
        description: 'Предназначен для плавного управления исполнительным механизмом по аналоговому сигналу 0–10 В.',
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

const BoilerConnectionSwitch = ({ connectionType, onChange }) => {
    const isRelay = String(connectionType || '').toUpperCase() === 'RELAY';
    return (
        <label
            title={`Подключение: ${isRelay ? 'RELAY' : 'BUS'}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#64748b', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer' }}
        >
            <span style={{ color: isRelay ? '#94a3b8' : '#2563eb' }}>BUS</span>
            <input
                type="checkbox"
                checked={isRelay}
                onChange={(event) => onChange(event.target.checked ? 'RELAY' : 'BUS')}
                style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
            />
            <span
                aria-hidden="true"
                style={{ position: 'relative', width: 30, height: 16, borderRadius: 999, background: isRelay ? '#e07020' : '#2563eb', transition: 'background 0.18s ease' }}
            >
                <span style={{ position: 'absolute', top: 2, left: 2, width: 12, height: 12, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(15,23,42,0.28)', transform: isRelay ? 'translateX(14px)' : 'none', transition: 'transform 0.18s ease' }} />
            </span>
            <span style={{ color: isRelay ? '#c2410c' : '#94a3b8' }}>RELAY</span>
        </label>
    );
};

const AddedDeviceLine = ({ label, count = 1, onRemove, badge = null, badgeAbove = false, myheat = false, price = null, disabled = false, control = null, hideCount = false }) => (
    <div
        style={{
            display: 'flex',
            alignItems: badgeAbove ? 'flex-end' : 'baseline',
            gap: 8,
            width: '100%',
            margin: '8px 0',
            color: disabled ? '#94a3b8' : '#203040',
            opacity: disabled ? 0.7 : 1,
            fontSize: 15,
            boxSizing: 'border-box',
        }}
    >
        {myheat && !badgeAbove && <MyHeatBadge />}
        {badge && !badgeAbove && (
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
        {badgeAbove ? (
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3 }}>
                {(myheat || badge) && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, minHeight: 14 }}>
                        {myheat && <MyHeatBadge size={8} />}
                        {badge && (
                            <span
                                style={{
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
                    </span>
                )}
                <span>{label}</span>
            </span>
        ) : <span>{label}</span>}
        <span style={{ flex: 1, borderBottom: '1px dotted #6b7f95', transform: badgeAbove ? 'none' : 'translateY(-3px)' }} />
        {control}
        {!hideCount && <span style={{ whiteSpace: 'nowrap' }}>{count} шт</span>}
        {price != null && (
            <span style={{ whiteSpace: 'nowrap', fontWeight: 700, minWidth: 64, textAlign: 'right' }}>
                {price.toLocaleString('ru-RU')} ₽
            </span>
        )}
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

const ThermostatCard = ({ template, color, onColorChange, hasFloorSensor, onFloorSensorChange, onAdd }) => (
    <div
        className="sel-card"
        style={{
            flex: '1 1 320px',
            minWidth: 260,
            border: '1px solid #d7dbe4',
            borderRadius: 14,
            padding: 18,
            background: '#fff',
            display: 'flex',
            flexDirection: 'column',
        }}
    >
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 16 }}>{template.label}</div>

            <div style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#475569' }}>Цвет</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {THERMOSTAT_COLORS.map((item) => (
                        <button
                            className="selection-option-button"
                            key={item.value}
                            type="button"
                            onClick={() => onColorChange(item.value)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '8px 12px',
                                border: `1px solid ${color === item.value ? '#c85e18' : '#d7dbe4'}`,
                                borderRadius: 8,
                                background: color === item.value ? '#fff7ed' : '#fff',
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
                    checked={hasFloorSensor}
                    onChange={(event) => onFloorSensorChange(event.target.checked)}
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
{JSON.stringify(template.data, null, 4)}
            </pre>
            <button
                onClick={onAdd}
                style={{
                    marginTop: 'auto',
                    padding: '8px 16px',
                    border: '1px solid #3498db',
                    borderRadius: 8,
                    background: '#3498db',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 700,
                }}
            >
                Добавить термостат
            </button>
        </div>
    </div>
);

const TemperatureSensorCard = ({ options, selectedKey, onSelectKey, template, onAdd, stepper = null }) => (
    <div
        className="sel-card"
        style={{
            flex: '1 1 320px',
            minWidth: 260,
            border: '1px solid #d7dbe4',
            borderRadius: 14,
            padding: 18,
            background: '#fff',
        }}
    >
        <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 16 }}>{template?.label}</div>

        <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#475569' }}>Тип датчика</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {options.map((item) => (
                    <button
                        className="selection-option-button"
                        key={item.key}
                        type="button"
                        disabled={item.disabled}
                        onClick={() => !item.disabled && onSelectKey(item.key)}
                        style={{
                            padding: '8px 12px',
                            border: `1px solid ${selectedKey === item.key ? '#c85e18' : '#d7dbe4'}`,
                            borderRadius: 8,
                            background: item.disabled ? '#f1f5f9' : (selectedKey === item.key ? '#fff7ed' : '#fff'),
                            color: item.disabled ? '#94a3b8' : '#202738',
                            cursor: item.disabled ? 'not-allowed' : 'pointer',
                            opacity: item.disabled ? 0.6 : 1,
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
{JSON.stringify(template?.data, null, 4)}
        </pre>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
                onClick={onAdd}
                style={{
                    padding: '8px 16px',
                    border: '1px solid #3498db',
                    borderRadius: 8,
                    background: '#3498db',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 700,
                }}
            >
                Добавить датчик
            </button>
            {stepper}
        </div>
    </div>
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

const QTY_STEPPER_BLOCK_STYLE = {
    width: 28,
    height: 28,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #d7dbe4',
    borderRadius: 6,
    background: '#fff',
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1,
    padding: 0,
    boxSizing: 'border-box',
};

const QtyStepper = ({ count, onDecrement, onIncrement, disabled = false }) => {
    if (!count) return null;
    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <button
                type="button"
                title="Убрать одно"
                onClick={onDecrement}
                disabled={disabled}
                style={{ ...QTY_STEPPER_BLOCK_STYLE, cursor: disabled ? 'not-allowed' : 'pointer', color: disabled ? '#94a3b8' : '#e74c3c', opacity: disabled ? 0.6 : 1 }}
            >
                −
            </button>
            <span style={{ ...QTY_STEPPER_BLOCK_STYLE, color: '#203040' }}>{count}</span>
            <button
                type="button"
                title="Добавить ещё"
                onClick={onIncrement}
                disabled={disabled}
                style={{ ...QTY_STEPPER_BLOCK_STYLE, cursor: disabled ? 'not-allowed' : 'pointer', color: disabled ? '#94a3b8' : '#2e7d32', opacity: disabled ? 0.6 : 1 }}
            >
                +
            </button>
        </div>
    );
};

const SEL_CHAPTERS = [
    { id: 'chapter-controller', label: 'Контроллер' },
    { id: 'chapter-boilers', label: 'Котлы' },
    { id: 'chapter-hydraulics', label: 'Гидравлика' },
    { id: 'chapter-climate', label: 'Климат' },
    { id: 'chapter-other-equipment', label: 'Прочее оборудование' },
    { id: 'chapter-sensors', label: 'Датчики и защита' },
    { id: 'chapter-misc', label: 'Прочее' },
    { id: 'chapter-power', label: 'Питание' },
];

const SelectionQuickNav = () => (
    <nav className="sel-quick-nav" aria-label="Разделы подбора">
        {SEL_CHAPTERS.map((item, index) => (
            <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(event) => {
                    event.preventDefault();
                    document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
            >
                <span>{index + 1}</span>
                {item.label}
            </a>
        ))}
    </nav>
);

const getTemplateLabelByType = (templates, type, fallback) => (
    templates.find((template) => canonicalType(template.wiredDevice?.type || template.data?.type) === canonicalType(type))?.label || fallback
);

const getTemperatureSensorLabel = (device) => (
    device?.title || TEMPERATURE_SENSOR_TEMPLATES.find((template) => canonicalType(template.data.type) === canonicalType(device?.type))?.label || device?.type
);

const getTemperatureSensorTemplateKey = (device) => TEMPERATURE_SENSOR_TEMPLATES.find(
    (template) => canonicalType(template.data.type) === canonicalType(device?.type),
)?.key || null;

const aggregateAddedItems = (items) => Object.values(items.reduce((acc, item) => {
    const key = item.label;
    if (!acc[key]) acc[key] = { label: item.label, count: 0, removeKeys: [], templateKey: item.templateKey || null };
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

const getGroupedDeviceRows = (scheme, group, templates) => {
    const wiredDevices = Array.isArray(scheme?.wired_devices) ? scheme.wired_devices : [];
    const sensors = Array.isArray(scheme?.sensors) ? scheme.sensors : [];
    const groups = {};
    wiredDevices.forEach((device) => {
        if (isGroupedDevice(device, group, templates)) {
            if (!groups[device._uid]) groups[device._uid] = [];
            groups[device._uid].push(device);
        }
    });
    return aggregateAddedItems(Object.entries(groups).map(([uidVal, devices]) => ({
        label: getGroupedUnitLabel(uidVal, devices, sensors, templates),
        removeKey: uidVal,
    })));
};

const getTemperatureSensorRows = (scheme, controllerType) => {
    const isKitTemperatureSensor = (device) => getKitTemperatureSensorTemplateKey(device, controllerType) !== null;
    const wirelessTemperatureSensors = (Array.isArray(scheme?.wireless_devices) ? scheme.wireless_devices : [])
        .filter((device) => isTemperatureSensor(device) || isKitTemperatureSensor(device))
        .map((device) => ({ device, target: 'wireless_devices' }));
    const wiredTemperatureSensors = (Array.isArray(scheme?.sensors) ? scheme.sensors : [])
        .filter((device) => isTemperatureSensor(device) || isKitTemperatureSensor(device))
        .map((device) => ({ device, target: 'sensors' }));
    const embeddedTemperatureSensors = (Array.isArray(scheme?.wired_devices) ? scheme.wired_devices : [])
        .flatMap((device) => (Array.isArray(device?.additions) ? device.additions : []))
        .filter(isKitTemperatureSensor)
        .map((device) => ({ device, target: null }));
    const temperatureSensors = [...wirelessTemperatureSensors, ...wiredTemperatureSensors, ...embeddedTemperatureSensors];
    const kitTemperatureDevices = CONTROLLER_KIT_TEMPERATURE_DEVICES[controllerType] || [];

    const kitRemainingByTemplateKey = new Map(kitTemperatureDevices.map((device) => [device.templateKey, device.count]));
    const extraSensors = temperatureSensors.filter(({ device }) => {
        const templateKey = getKitTemperatureSensorTemplateKey(device, controllerType);
        const remaining = kitRemainingByTemplateKey.get(templateKey) || 0;
        if (remaining <= 0) return true;
        kitRemainingByTemplateKey.set(templateKey, remaining - 1);
        return false;
    });
    const extraRows = aggregateAddedItems(extraSensors.map(({ device, target }) => ({
        label: getKitTemperatureSensorLabel(device),
        templateKey: getTemperatureSensorTemplateKey(device, controllerType) || getTemperatureSensorTemplateKey(device),
        removeKey: target ? { target, id: device.id } : null,
    })));
    const kitRows = kitTemperatureDevices.map((device) => ({
        key: `kit:${device.label}`,
        label: device.label,
        count: device.count,
        badge: 'Комплектный',
        removeKey: null,
        templateKey: device.templateKey || null,
        paidCount: 0,
    }));
    const remainingRows = extraRows
        .map((row) => ({ key: row.label, label: row.label, count: row.count, badge: null, removeKey: row.removeKeys[0], templateKey: row.templateKey || null, paidCount: row.count }));

    return [...kitRows, ...remainingRows];
};

const getPressureSensorRows = (scheme) => {
    const pressureSensors = (Array.isArray(scheme?.sensors) ? scheme.sensors : []).filter((sensor) => sensor.type === 'pressure-sensor');
    return aggregateAddedItems(pressureSensors.map((sensor) => ({ label: 'Датчик давления', removeKey: sensor.id })));
};

const getThermostatRows = (scheme) => {
    const wiredThermostats = (Array.isArray(scheme?.wired_devices) ? scheme.wired_devices : [])
        .filter((device) => canonicalType(device?.type) === 'thermostat')
        .map((device) => ({ device, target: 'wired_devices' }));
    const extThermostats = (Array.isArray(scheme?.controller?.ext_devices) ? scheme.controller.ext_devices : [])
        .filter((device) => canonicalType(device?.type) === 'thermostat')
        .map((device) => ({ device, target: 'ext_devices' }));
    const wirelessThermostats = (Array.isArray(scheme?.wireless_devices) ? scheme.wireless_devices : [])
        .filter((device) => canonicalType(device?.type) === 'thermostat')
        .map((device) => ({ device, target: 'wireless_devices' }));
    const thermostats = [...wiredThermostats, ...extThermostats, ...wirelessThermostats];
    return aggregateAddedItems(thermostats.map(({ device, target }) => {
        const colorLabel = THERMOSTAT_COLORS.find((item) => item.value === device.color)?.label || device.color || 'Без цвета';
        const connectionLabel = target === 'wireless_devices' ? 'Беспроводной' : 'Проводной';
        const hasFloorSensor = Array.isArray(device.additions)
            && device.additions.some((addition) => canonicalType(addition?.type) === 'flask-sensor-floor');
        return {
            label: `Термостат ${connectionLabel.toLowerCase()}, ${colorLabel.toLowerCase()}${hasFloorSensor ? ', с датчиком пола' : ''}`,
            removeKey: { target, id: device.id },
        };
    }));
};

const getLeakProtectionRows = (scheme) => {
    const leakItems = [
        ...(Array.isArray(scheme?.sensors) ? scheme.sensors : [])
            .filter((sensor) => sensor.type === 'leak-sensor')
            .map((sensor) => ({ label: 'Датчик протечки', removeKey: { target: 'sensors', id: sensor.id } })),
        ...(Array.isArray(scheme?.wired_devices) ? scheme.wired_devices : [])
            .filter((device) => device.type === 'valve')
            .map((device) => ({ label: 'Запорный клапан', removeKey: { target: 'wired_devices', id: device.id } })),
    ];
    return aggregateAddedItems(leakItems);
};

const MODULE_TYPE_LABELS = {
    bl2: 'Модуль BUS BL2',
    ecosmartbl2: 'Модуль ECOsmart BL2',
    rl6: 'Модуль реле RL6',
    rl6s: 'Модуль реле RL6S',
    io4: 'Модуль IO4',
    di6: 'Модуль DI6',
    rl2: 'Модуль реле RL2',
    rl2s: 'Модуль реле RL2S',
    'ntc-1-wire': 'Модуль NTC 1-Wire',
    rdt2: 'Радиомодуль RDT2',
};

const getExpansionModuleRows = (incomingSchemeValue) => {
    const items = [
        ...(Array.isArray(incomingSchemeValue?.ext_modules) ? incomingSchemeValue.ext_modules : []),
        ...(Array.isArray(incomingSchemeValue?.di_modules) ? incomingSchemeValue.di_modules : []),
        ...(Array.isArray(incomingSchemeValue?.one_wire_modules) ? incomingSchemeValue.one_wire_modules : []),
        ...(Array.isArray(incomingSchemeValue?.controller?.ecosmart_bl2) ? incomingSchemeValue.controller.ecosmart_bl2 : []),
    ];
    return aggregateAddedItems(items.map((item) => {
        const type = canonicalType(typeof item === 'string' ? item : item?.type);
        return { label: MODULE_TYPE_LABELS[type] || type, templateKey: type };
    }));
};

const getEquipmentOfferSections = (incomingSchemeValue, controllerType) => {
    const sections = [];
    const wiredDevices = Array.isArray(incomingSchemeValue?.wired_devices) ? incomingSchemeValue.wired_devices : [];

    if (controllerType && CONTROLLER_LABELS[controllerType]) {
        const controllerRows = [{ label: CONTROLLER_LABELS[controllerType], count: 1, unitPrice: MYHEAT_PRICES.controllers[controllerType] ?? null }];
        const hasWirelessDevices = (Array.isArray(incomingSchemeValue?.wireless_devices) ? incomingSchemeValue.wireless_devices : []).length > 0;
        if (controllerType === 'go' && hasWirelessDevices) {
            controllerRows.push({ label: RADIO_MODULE_ACTIVATION_LABEL, count: 1, unitPrice: MYHEAT_PRICES.radioModuleActivation });
        }
        sections.push({ title: 'Контроллер', rows: controllerRows });
    }

    const moduleRows = getExpansionModuleRows(incomingSchemeValue)
        .map((row) => ({ ...row, unitPrice: MYHEAT_PRICES.modules[row.templateKey] ?? null }));
    if (moduleRows.length > 0) sections.push({ title: 'Модули расширения', rows: moduleRows });

    const boilers = Array.isArray(incomingSchemeValue?.boilers) ? incomingSchemeValue.boilers : [];
    if (boilers.length > 0) {
        sections.push({
            title: 'Котлы',
            rows: aggregateAddedItems(boilers.map((boiler) => ({ label: `${boiler.name} (${boiler.connection_type})` }))),
        });
    }

    const groupedRows = (group, templates) => getGroupedDeviceRows(incomingSchemeValue, group, templates);

    const mixingRows = groupedRows('mixing', MIXING_TEMPLATES);
    if (mixingRows.length > 0) sections.push({ title: 'Смесительные узлы', rows: mixingRows });

    const gvsRows = groupedRows('gvs', GVS_TEMPLATES);
    if (gvsRows.length > 0) sections.push({ title: 'Бойлеры ГВС', rows: gvsRows });

    const pumpRows = groupedRows('pump', PUMP_TEMPLATES);
    if (pumpRows.length > 0) sections.push({ title: 'Насосы', rows: pumpRows });

    const zoneRows = groupedRows('zone', ZONE_TEMPLATES);
    if (zoneRows.length > 0) sections.push({ title: 'Зоны', rows: zoneRows });

    const otherRows = groupedRows('other', OTHER_EQUIP_TEMPLATES);
    if (otherRows.length > 0) sections.push({ title: 'Прочее оборудование', rows: otherRows });

    const temperatureRows = getTemperatureSensorRows(incomingSchemeValue, controllerType);
    if (temperatureRows.length > 0) {
        sections.push({
            title: 'Датчики температуры',
            rows: temperatureRows.map((row) => ({
                label: row.label,
                count: row.count,
                badge: row.badge,
                paidCount: row.paidCount,
                unitPrice: MYHEAT_PRICES.temperatureSensors[row.templateKey] ?? null,
            })),
        });
    }

    const pressureRows = getPressureSensorRows(incomingSchemeValue)
        .map((row) => ({ ...row, unitPrice: MYHEAT_PRICES.pressureSensor }));
    if (pressureRows.length > 0) sections.push({ title: 'Датчики давления', rows: pressureRows });

    const thermostatRows = getThermostatRows(incomingSchemeValue)
        .map((row) => ({ ...row, unitPrice: MYHEAT_PRICES.thermostat }));
    if (thermostatRows.length > 0) sections.push({ title: 'Термостаты', rows: thermostatRows });

    const leakRows = getLeakProtectionRows(incomingSchemeValue)
        .map((row) => ({ ...row, unitPrice: row.label === 'Датчик протечки' ? MYHEAT_PRICES.leakSensor : null }));
    if (leakRows.length > 0) sections.push({ title: 'Контроль протечки воды', rows: leakRows });

    const discreteDevices = wiredDevices.filter((device) => DISCRETE_TEMPLATES.some((template) => template.data.type === device.type));
    if (discreteDevices.length > 0) {
        sections.push({
            title: 'Дискретные входы',
            rows: aggregateAddedItems(discreteDevices.map((device) => ({
                label: DISCRETE_TEMPLATES.find((template) => template.data.type === device.type)?.label || device.type,
            }))),
        });
    }

    const upsCount = (Array.isArray(incomingSchemeValue?.power_modules) ? incomingSchemeValue.power_modules : [])
        .filter((moduleItem) => moduleItem === 'ups').length;
    if (upsCount > 0) {
        sections.push({ title: 'Питание', rows: [{ label: 'Источник бесперебойного питания (UPS)', count: upsCount, unitPrice: MYHEAT_PRICES.ups }] });
    }

    return sections;
};

// Прайс MyHeat (https://mhtest.ru/products/, только позиции в продаже).
// Устройства без цены считаются сторонними (не поставляются MyHeat).
const MYHEAT_PRICES = {
    controllers: {
        go: 16990, // MyHeat GO!
        'go+': 22490, // MyHeat GO!+
        smart2: 18990, // MyHeat Smart 2
        pro: 44990, // MyHeat Pro
        ecosmart: 46990, // MyHeat Eco Smart
    },
    modules: {
        rl2: 3890, // MyHeat RL2
        rl2s: 3890, // MyHeat RL2S
        rl6: 8990, // MyHeat RL6
        rl6s: 9990, // MyHeat RL6S
        rdt2: 4990, // MyHeat RDT2
        di6: 7990, // MyHeat DI6
        io4: 7990, // MyHeat IO4
        'ntc-1-wire': 4190, // MyHeat NTC-1wire
        bl2: 6990, // Адаптер цифровой шины для MyHeat Pro
        ecosmartbl2: 6990, // Адаптер цифровой шины для MyHeat Eco
    },
    temperatureSensors: {
        'wireless-outdoor': 5890, // Радиодатчик температуры уличный
        'wireless-wall': 4190, // Радиодатчик температуры и влажности комнатный
        'wired-wall-digital': 1650, // Датчик температуры настенный проводной
        'wired-flask-digital': 1450, // Датчик температуры в колбе проводной
        'wired-flask-ntc': 3190, // Датчик температуры в колбе NTC 10K
    },
    thermostat: 9490, // Комнатный термостат MyHeat
    pressureSensor: 5990, // Датчик давления 4-20мА
    leakSensor: 2990, // Датчик протечки Нептун SW 005 (5м)
    ups: 9990, // MyHeat UPS
    radioModuleActivation: 3000,
};

const RADIO_MODULE_ACTIVATION_LABEL = 'Активация радиомодуля';

const EquipmentOfferModal = ({ sections, onClose }) => (
    <div
        onClick={onClose}
        style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: 24,
        }}
    >
        <div
            onClick={(event) => event.stopPropagation()}
            style={{
                background: '#fff',
                borderRadius: 14,
                padding: 24,
                width: 'min(560px, 100%)',
                maxHeight: '85vh',
                overflowY: 'auto',
                boxShadow: '0 24px 60px rgba(15, 23, 42, 0.35)',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 20 }}>Коммерческое предложение</h2>
                <button
                    type="button"
                    onClick={onClose}
                    style={{
                        width: 32,
                        height: 32,
                        border: '1px solid #cbd5e1',
                        borderRadius: '50%',
                        background: '#f8fafc',
                        color: '#475569',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                        lineHeight: 1,
                        padding: 0,
                    }}
                    aria-label="Закрыть"
                >
                    ×
                </button>
            </div>
            {sections.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: 14 }}>Оборудование пока не выбрано.</div>
            ) : (
                <>
                    {sections.map((section) => (
                        <div key={section.title} style={{ marginBottom: 18 }}>
                            <h3 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                {section.title}
                            </h3>
                            {section.rows.map((row) => {
                                const unitPrice = row.unitPrice ?? null;
                                const billableCount = row.paidCount != null ? row.paidCount : (row.count || 1);
                                return (
                                    <AddedDeviceLine
                                        key={row.label}
                                        label={row.label}
                                        count={row.count}
                                        badge={row.badge || null}
                                        badgeAbove
                                        myheat={unitPrice != null}
                                        disabled={unitPrice == null}
                                        price={unitPrice != null ? unitPrice * billableCount : null}
                                    />
                                );
                            })}
                        </div>
                    ))}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'baseline',
                            justifyContent: 'space-between',
                            gap: 12,
                            marginTop: 20,
                            paddingTop: 14,
                            borderTop: '2px solid #e2e8f0',
                            fontSize: 17,
                            fontWeight: 700,
                            color: '#203040',
                        }}
                    >
                        <span>Итого</span>
                        <span style={{ whiteSpace: 'nowrap' }}>
                            {sections.reduce((sum, section) => sum + section.rows.reduce((rowSum, row) => {
                                const unitPrice = row.unitPrice ?? null;
                                if (unitPrice == null) return rowSum;
                                const billableCount = row.paidCount != null ? row.paidCount : (row.count || 1);
                                return rowSum + unitPrice * billableCount;
                            }, 0), 0).toLocaleString('ru-RU')} ₽
                        </span>
                    </div>
                </>
            )}
        </div>
    </div>
);

const SelectionApp = () => {
    const [incomingScheme, setIncomingScheme] = useState({
        controller: { type: 'go', relay_devices: [], one_wire_devices: [], bus_devices: [] },
    });
    const [showJsonDetails, setShowJsonDetails] = useState(false);
    const [wiredThermostatColor, setWiredThermostatColor] = useState('black');
    const [wiredThermostatHasFloorSensor, setWiredThermostatHasFloorSensor] = useState(false);
    const [wirelessThermostatColor, setWirelessThermostatColor] = useState('black');
    const [wirelessThermostatHasFloorSensor, setWirelessThermostatHasFloorSensor] = useState(false);
    const [wiredTemperatureSensorKey, setWiredTemperatureSensorKey] = useState('wired-wall-digital');
    const [wirelessTemperatureSensorKey, setWirelessTemperatureSensorKey] = useState('wireless-outdoor');
    const [isBuildingScheme, setIsBuildingScheme] = useState(false);
    const [buildSchemeError, setBuildSchemeError] = useState('');
    const [boilerQuery, setBoilerQuery] = useState('');
    const [boilerResults, setBoilerResults] = useState([]);
    const [boilerSearchLoading, setBoilerSearchLoading] = useState(false);
    const [controllerConnectorGeometry, setControllerConnectorGeometry] = useState(null);
    const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
    const controllerWrapRef = useRef(null);
    const controllerCardRefs = useRef([]);
    const stickyTopRef = useRef(null);
    const [isControllerBarStuck, setIsControllerBarStuck] = useState(false);
    const controllerCompatibilityIssues = useMemo(
        () => getControllerCompatibilityIssues(incomingScheme),
        [incomingScheme],
    );
    const compatibleControllerOptions = useMemo(
        () => getCompatibleControllerOptions(incomingScheme),
        [incomingScheme],
    );
    const compatibleControllerTypes = useMemo(
        () => new Set(compatibleControllerOptions.map((item) => item.type)),
        [compatibleControllerOptions],
    );
    const controllerType = getControllerType(incomingScheme);
    const unifiedLeakLoop = incomingScheme.unified_leak_loop === true;
    const leakSensorCount = [
        ...(Array.isArray(incomingScheme.sensors) ? incomingScheme.sensors : []),
        ...(Array.isArray(incomingScheme.wired_devices) ? incomingScheme.wired_devices : []),
    ].filter((item) => canonicalType(item?.type) === 'leak-sensor').length;
    const equipmentOfferSections = useMemo(
        () => (isOfferModalOpen ? getEquipmentOfferSections(incomingScheme, controllerType) : []),
        [incomingScheme, controllerType, isOfferModalOpen],
    );
    const proAndEcosmartOptions = useMemo(() => {
        if (controllerType !== 'pro' && controllerType !== 'ecosmart') return false;
        const optionTypes = new Set(compatibleControllerOptions.map((item) => item.type));
        return optionTypes.has('pro') && optionTypes.has('ecosmart');
    }, [controllerType, compatibleControllerOptions]);
    const ecosmartAvailableForProScheme = useMemo(
        () => controllerType === 'pro' && isEcosmartIdentified(incomingScheme),
        [controllerType, incomingScheme],
    );
    const ecosmartIncomingScheme = useMemo(() => {
        if (!ecosmartAvailableForProScheme) return null;
        const controllerValue = getControllerTemplateValue('ecosmart');
        if (!controllerValue) return null;
        return resolveControllerAndRequiredModules(withControllerValue(incomingScheme, controllerValue));
    }, [ecosmartAvailableForProScheme, incomingScheme]);
    const wiredThermostatTemplate = useMemo(() => makeThermostatTemplate({
        target: 'wired',
        color: wiredThermostatColor,
        hasFloorSensor: wiredThermostatHasFloorSensor,
    }), [wiredThermostatColor, wiredThermostatHasFloorSensor]);
    const wirelessThermostatTemplate = useMemo(() => makeThermostatTemplate({
        target: 'wireless',
        color: wirelessThermostatColor,
        hasFloorSensor: wirelessThermostatHasFloorSensor,
    }), [wirelessThermostatColor, wirelessThermostatHasFloorSensor]);
    const wiredTemperatureSensorOptions = useMemo(() => TEMPERATURE_SENSOR_TEMPLATES.filter(
        (template) => getTemperatureSensorGroup(template) === 'wired',
    ), []);
    const wirelessTemperatureSensorOptions = useMemo(() => TEMPERATURE_SENSOR_TEMPLATES.filter(
        (template) => getTemperatureSensorGroup(template) === 'wireless',
    ), []);
    const wiredTemperatureSensorTemplate = useMemo(() => (
        wiredTemperatureSensorOptions.find((template) => template.key === wiredTemperatureSensorKey) || wiredTemperatureSensorOptions[0]
    ), [wiredTemperatureSensorKey, wiredTemperatureSensorOptions]);
    const wirelessTemperatureSensorTemplate = useMemo(() => (
        wirelessTemperatureSensorOptions.find((template) => template.key === wirelessTemperatureSensorKey) || wirelessTemperatureSensorOptions[0]
    ), [wirelessTemperatureSensorKey, wirelessTemperatureSensorOptions]);

    const measureControllerConnectors = useCallback(() => {
        const wrap = controllerWrapRef.current;
        const proEl = controllerCardRefs.current[3];
        const ecosmartEl = controllerCardRefs.current[4];
        if (!wrap || !proEl || !ecosmartEl) return;

        const wrapRect = wrap.getBoundingClientRect();
        const relRect = (el) => {
            const r = el.getBoundingClientRect();
            return {
                left: r.left - wrapRect.left,
                right: r.right - wrapRect.left,
                top: r.top - wrapRect.top,
                bottom: r.bottom - wrapRect.top,
            };
        };

        const pro = relRect(proEl);
        const ecosmart = relRect(ecosmartEl);

        const proSideY = (pro.top + pro.bottom) / 2;
        const proCenterX = (pro.right + ecosmart.left) / 2;
        const proBoxTop = pro.bottom + CONTROLLER_CONNECTOR_GAP;

        setControllerConnectorGeometry({
            proBar: { left: pro.right, width: Math.max(0, ecosmart.left - pro.right), y: proSideY },
            proStem: { x: proCenterX, top: proSideY, height: Math.max(0, proBoxTop - proSideY) },
            proBoxTop,
        });
    }, []);

    useLayoutEffect(() => {
        measureControllerConnectors();
        window.addEventListener('resize', measureControllerConnectors);
        return () => window.removeEventListener('resize', measureControllerConnectors);
    }, [measureControllerConnectors]);

    useEffect(() => {
        const updateControllerBarStuck = () => {
            const wrap = controllerWrapRef.current;
            const sticky = stickyTopRef.current;
            if (!wrap || !sticky) return;
            const stickyBottom = sticky.getBoundingClientRect().bottom;
            const wrapBottom = wrap.getBoundingClientRect().bottom;
            setIsControllerBarStuck(wrapBottom <= stickyBottom);
        };
        updateControllerBarStuck();
        window.addEventListener('scroll', updateControllerBarStuck, { passive: true });
        window.addEventListener('resize', updateControllerBarStuck);
        return () => {
            window.removeEventListener('scroll', updateControllerBarStuck);
            window.removeEventListener('resize', updateControllerBarStuck);
        };
    }, []);

    useEffect(() => {
        const query = boilerQuery.trim();
        if (!query) {
            setBoilerResults([]);
            setBoilerSearchLoading(false);
            return;
        }
        setBoilerSearchLoading(true);
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(BOILER_SEARCH_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': getCsrfToken(),
                    },
                    body: JSON.stringify(makeBoilerSearchPayload(query)),
                    signal: controller.signal,
                });
                if (!res.ok) throw new Error('Boiler search request failed');
                const data = await res.json();
                setBoilerResults(normalizeBoilerSearchResults(data));
            } catch (error) {
                if (error?.name === 'AbortError') return;
                setBoilerResults([]);
            } finally {
                if (!controller.signal.aborted) {
                    setBoilerSearchLoading(false);
                }
            }
        }, BOILER_SEARCH_DEBOUNCE_MS);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [boilerQuery]);

    const addBoilerFromSearch = useCallback((result) => {
        const isStupid = result.bus_type === 127;
        setIncomingScheme((prev) => {
            const boilers = Array.isArray(prev.boilers) ? [...prev.boilers] : [];
            const boiler = withRinnaiAdapter({
                id: generateId(),
                device_type: 'boiler',
                type: isStupid ? 'stupid' : 'smart',
                name: result.name,
                reserve: false,
                connection_type: isStupid ? 'RELAY' : 'BUS',
            });
            boilers.push(boiler);
            const nextScheme = withStupidBoilerSensor({ ...prev, boilers }, boiler);
            return resolveControllerAndRequiredModules(syncStrategySensorForSmartBoilers(nextScheme));
        });
    }, []);

    const addBoiler = useCallback((template) => {
        setIncomingScheme((prev) => {
            const boilers = Array.isArray(prev.boilers) ? [...prev.boilers] : [];
            const boiler = withRinnaiAdapter({ ...template.data, id: generateId() });
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

    const setSmartBoilerConnectionType = useCallback((index, connectionType) => {
        setIncomingScheme((prev) => {
            const boilers = Array.isArray(prev.boilers) ? [...prev.boilers] : [];
            const boiler = boilers[index];
            if (!boiler || canonicalType(boiler.type) !== 'smart') return prev;
            boilers[index] = { ...boiler, connection_type: connectionType };
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
            return resolveControllerAndRequiredModules({ ...prev, wired_devices: wiredDevices, sensors });
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
            return resolveControllerAndRequiredModules({ ...prev, wireless_devices: devices });
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
            const hasUnifiedLeakSensor = prev.unified_leak_loop && [
                ...(Array.isArray(prev.sensors) ? prev.sensors : []),
                ...(Array.isArray(prev.wired_devices) ? prev.wired_devices : []),
            ].some((item) => canonicalType(item?.type) === 'leak-sensor');
            if (hasUnifiedLeakSensor) return prev;
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

    const setUnifiedLeakLoop = useCallback((enabled) => {
        setIncomingScheme((prev) => {
            const sensors = Array.isArray(prev.sensors) ? prev.sensors : [];
            const wiredDevices = Array.isArray(prev.wired_devices) ? prev.wired_devices : [];
            if (!enabled) return resolveControllerAndRequiredModules({ ...prev, unified_leak_loop: false });

            let retained = false;
            const keepFirstLeakSensor = (item) => {
                if (canonicalType(item?.type) !== 'leak-sensor') return true;
                if (retained) return false;
                retained = true;
                return true;
            };
            return resolveControllerAndRequiredModules({
                ...prev,
                unified_leak_loop: true,
                sensors: sensors.filter(keepFirstLeakSensor),
                wired_devices: wiredDevices.filter(keepFirstLeakSensor),
            });
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
        setIncomingScheme((prev) => resolveControllerAndRequiredModules({
            ...prev,
            power_modules: (Array.isArray(prev.power_modules) ? prev.power_modules : []).filter((m) => m !== value),
        }));
    }, []);

    const removeSchemeItemById = useCallback((target, id) => {
        setIncomingScheme((prev) => {
            if (target === 'ext_devices') {
                const controller = prev?.controller && typeof prev.controller === 'object' ? prev.controller : {};
                return resolveControllerAndRequiredModules({
                    ...prev,
                    controller: {
                        ...controller,
                        ext_devices: (Array.isArray(controller.ext_devices) ? controller.ext_devices : [])
                            .filter((item) => item.id !== id),
                    },
                });
            }
            return resolveControllerAndRequiredModules({
                ...prev,
                [target]: (Array.isArray(prev[target]) ? prev[target] : []).filter((item) => item.id !== id),
            });
        });
    }, []);

    const renderUnitStepper = (template, group, templates) => {
        const row = getGroupedDeviceRows(incomingScheme, group, templates)
            .find((item) => item.label === template.label);
        if (!row) return null;
        return (
            <QtyStepper
                count={row.count}
                onIncrement={() => addMixingUnit(template, group)}
                onDecrement={() => removeMixingUnit(Number(row.removeKeys[row.removeKeys.length - 1]))}
            />
        );
    };

    const renderItemStepper = (target, type, onIncrement, disabled = false) => {
        const items = (Array.isArray(incomingScheme[target]) ? incomingScheme[target] : [])
            .filter((item) => canonicalType(item?.type) === canonicalType(type));
        if (items.length === 0) return null;
        return (
            <QtyStepper
                count={items.length}
                onIncrement={onIncrement}
                onDecrement={() => removeSchemeItemById(target, items[items.length - 1].id)}
                disabled={disabled}
            />
        );
    };

    const setController = useCallback((controllerValue) => {
        setIncomingScheme((prev) => reconcileRequiredModules(normalizeModulesForController(withControllerValue(prev, controllerValue))));
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

        // Открываем вкладку синхронно в обработчике клика — иначе браузер
        // не даст открыть полноценную вкладку после await и либо заблокирует
        // её, либо схлопнет в маленький popup.
        const newTab = window.open('', '_blank');
        if (newTab) {
            newTab.document.write('<!doctype html><title>Построение схемы…</title><body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;font:14px system-ui, sans-serif;color:#64748b;background:#f8fafc">Строим схему…</body>');
            newTab.document.close();
        }

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
            if (newTab) {
                newTab.location.href = `/scheme/${schemeRecord.id}`;
            } else {
                window.open(`/scheme/${schemeRecord.id}`, '_blank');
            }
            setIsBuildingScheme(false);
        } catch (error) {
            if (newTab) newTab.close();
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
            <div className="sel-sticky-top" ref={stickyTopRef}>
            <div className="sel-header">
                <h1>Подбор оборудования</h1>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
                    <label className="sel-json-toggle">
                        <input
                            type="checkbox"
                            checked={showJsonDetails}
                            onChange={(event) => setShowJsonDetails(event.target.checked)}
                        />
                    </label>
                    <button
                        type="button"
                        className="selection-secondary-button"
                        onClick={() => setIsOfferModalOpen(true)}
                        style={{
                            padding: '10px 16px',
                            border: '1px solid #d7dbe4',
                            borderRadius: 8,
                            background: '#fff',
                            color: '#202738',
                            cursor: 'pointer',
                            fontSize: 14,
                            fontWeight: 700,
                        }}
                    >
                        Коммерческое предложение
                    </button>
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
                    <button
                        type="button"
                        className="selection-danger-button"
                        onClick={() => {
                            if (window.confirm('Сбросить всю схему? Все добавленные устройства будут удалены.')) {
                                clearScheme();
                            }
                        }}
                        style={{
                            padding: '10px 16px',
                            border: '1px solid #dc2626',
                            borderRadius: 8,
                            background: '#dc2626',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: 14,
                            fontWeight: 700,
                        }}
                    >
                        Сбросить схему
                    </button>
                </div>
            </div>
            <SelectionQuickNav />
            {isControllerBarStuck && (
                <>
                <div className="sel-stuck-controllers-title" style={{ paddingTop: 10, fontSize: 13, fontWeight: 700, color: '#475569' }}>Подобранный контроллер</div>
                <div className="sel-stuck-controllers" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 8, justifyContent: 'flex-start' }}>
                    {CONTROLLER_TEMPLATES.map((item, index) => {
                        const isActive = incomingScheme.controller?.type === item.value.type;
                        const isCompatible = compatibleControllerTypes.has(item.value.type);
                        return (
                            <div
                                key={index}
                                className="sel-stuck-controller-card"
                                onClick={isCompatible ? () => setController(item.value) : undefined}
                                aria-disabled={!isCompatible}
                                title={isCompatible ? undefined : 'Этот контроллер не поддерживает текущую конфигурацию'}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    flex: '0 0 auto',
                                    border: `2px solid ${isActive ? ORANGE : '#d7dbe4'}`,
                                    borderRadius: 8,
                                    padding: '4px 10px 4px 6px',
                                    background: isActive ? '#fff7ed' : '#fff',
                                    cursor: isCompatible ? 'pointer' : 'not-allowed',
                                    fontWeight: isActive ? 700 : 400,
                                    fontSize: 13,
                                    whiteSpace: 'nowrap',
                                    transition: 'border-color 0.15s, background 0.15s',
                                    opacity: isCompatible ? 1 : 0.45,
                                }}
                            >
                                <img
                                    src={controllerImagePaths[item.value.type]}
                                    alt={item.label}
                                    style={{ display: 'block', width: 44, height: 34, objectFit: 'contain' }}
                                />
                                <span>{item.label}</span>
                            </div>
                        );
                    })}
                </div>
                {proAndEcosmartOptions && (
                    <div
                        className="sel-stuck-controllers-note"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            flexWrap: 'wrap',
                            marginTop: 8,
                            padding: '6px 10px',
                            border: '1px solid #fed7aa',
                            borderRadius: 8,
                            background: '#fff7ed',
                            color: '#9a3412',
                            fontSize: 13,
                        }}
                    >
                        <span>Для этой конфигурации подходят два контроллера: <strong>PRO</strong> и <strong>ECOsmart</strong>.</span>
                        <button
                            className="selection-option-button"
                            type="button"
                            onClick={() => setController(getControllerTemplateValue('pro'))}
                            style={{
                                padding: '4px 10px',
                                border: '1px solid #ea580c',
                                borderRadius: 8,
                                background: controllerType === 'pro' ? '#e07020' : '#fff',
                                color: controllerType === 'pro' ? '#fff' : '#9a3412',
                                cursor: 'pointer',
                                fontSize: 12,
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
                                padding: '4px 10px',
                                border: '1px solid #ea580c',
                                borderRadius: 8,
                                background: controllerType === 'ecosmart' ? '#e07020' : '#fff',
                                color: controllerType === 'ecosmart' ? '#fff' : '#9a3412',
                                cursor: 'pointer',
                                fontSize: 12,
                                fontWeight: 700,
                            }}
                        >
                            Использовать ECOsmart
                        </button>
                    </div>
                )}
                </>
            )}
            </div>
            {buildSchemeError && (
                <div style={{ marginBottom: 20, padding: '12px 14px', border: '1px solid #fecaca', borderRadius: 8, background: '#fef2f2', color: '#991b1b', fontSize: 14 }}>
                    {buildSchemeError}
                </div>
            )}
            {isOfferModalOpen && (
                <EquipmentOfferModal sections={equipmentOfferSections} onClose={() => setIsOfferModalOpen(false)} />
            )}

            <div className="sel-group-label" id="chapter-controller">Контроллер</div>
            <section style={{ marginBottom: 32 }}>
                <div ref={controllerWrapRef} style={{ position: 'relative', paddingBottom: proAndEcosmartOptions ? 108 : 0 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, paddingBottom: 8 }}>
                        {CONTROLLER_TEMPLATES.map((item, index) => {
                            const isActive = incomingScheme.controller?.type === item.value.type;
                            const controllerTypeValue = item.value.type;
                            const isCompatible = compatibleControllerTypes.has(controllerTypeValue);
                            return (
                                <div
                                    key={index}
                                    ref={(el) => { controllerCardRefs.current[index] = el; }}
                                    onClick={isCompatible ? () => setController(item.value) : undefined}
                                    aria-disabled={!isCompatible}
                                    title={isCompatible ? undefined : 'Этот контроллер не поддерживает текущую конфигурацию'}
                                    style={{
                                        border: `2px solid ${isActive ? ORANGE : '#d7dbe4'}`,
                                        borderRadius: 10,
                                        padding: 12,
                                        background: isActive ? '#fff7ed' : '#fff',
                                        cursor: isCompatible ? 'pointer' : 'not-allowed',
                                        fontWeight: isActive ? 700 : 400,
                                        fontSize: 15,
                                        textAlign: 'center',
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        transition: 'border-color 0.15s, background 0.15s',
                                        opacity: isCompatible ? 1 : 0.45,
                                    }}
                                >
                                    <img
                                        src={controllerImagePaths[controllerTypeValue]}
                                        alt={item.label}
                                        style={{ display: 'block', width: '100%', height: 160, objectFit: 'contain', marginBottom: 10 }}
                                    />
                                    <div>{item.label}</div>
                                </div>
                            );
                        })}
                    </div>

                    {controllerConnectorGeometry && proAndEcosmartOptions && (
                        <>
                            <div style={{ position: 'absolute', left: controllerConnectorGeometry.proBar.left, top: controllerConnectorGeometry.proBar.y - 1, width: controllerConnectorGeometry.proBar.width, height: 2, background: CONTROLLER_CONNECTOR_COLOR }} />
                            <div style={{ position: 'absolute', left: controllerConnectorGeometry.proStem.x - 1, top: controllerConnectorGeometry.proStem.top, width: 2, height: controllerConnectorGeometry.proStem.height, background: CONTROLLER_CONNECTOR_COLOR }} />
                            <div
                                style={{
                                    ...controllerDescBoxStyle,
                                    left: controllerConnectorGeometry.proStem.x - CONTROLLER_DESC_BOX_WIDTH / 2,
                                    top: controllerConnectorGeometry.proBoxTop,
                                    border: '1px solid #fed7aa',
                                    background: '#fff7ed',
                                    color: '#9a3412',
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
                        </>
                    )}
                </div>
            </section>

            <div className="sel-group-label" id="chapter-boilers">Котлы</div>
            <section style={{ marginBottom: 32 }}>
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
                        {incomingScheme.boilers.map((boiler, index) => {
                            const isSmart = canonicalType(boiler?.type) === 'smart';
                            return (
                                <AddedDeviceLine
                                    key={boiler.id ?? `${boiler.name}-${index}`}
                                    label={boiler.name}
                                    control={isSmart ? (
                                        <BoilerConnectionSwitch
                                            connectionType={boiler.connection_type}
                                            onChange={(connectionType) => setSmartBoilerConnectionType(index, connectionType)}
                                        />
                                    ) : null}
                                    hideCount
                                    onRemove={() => removeBoiler(index)}
                                />
                            );
                        })}
                    </AddedDevicesBlock>
                )}
            </section>

            <div className="sel-group-label" id="chapter-hydraulics">Гидравлика</div>
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
                            {item.description && (
                                <p style={{ margin: '0 0 8px', color: '#64748b', fontSize: 13, lineHeight: 1.45 }}>
                                    {item.description}
                                </p>
                            )}
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
                                <button
                                    onClick={() => addMixingUnit(item, 'mixing')}
                                    style={{
                                        padding: '6px 14px',
                                        border: '1px solid #3498db',
                                        borderRadius: 6,
                                        background: '#3498db',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        fontSize: 13,
                                        fontWeight: 700,
                                    }}
                                >
                                    Добавить
                                </button>
                                {renderUnitStepper(item, 'mixing', MIXING_TEMPLATES)}
                            </div>
                        </div>
                    ))}
                </div>

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
                            {item.description && (
                                <p style={{ margin: '0 0 8px', color: '#64748b', fontSize: 13, lineHeight: 1.45 }}>
                                    {item.description}
                                </p>
                            )}
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
                                <button
                                    onClick={() => addMixingUnit(item, 'gvs')}
                                    style={{
                                        padding: '6px 14px',
                                        border: '1px solid #3498db',
                                        borderRadius: 6,
                                        background: '#3498db',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        fontSize: 13,
                                        fontWeight: 700,
                                    }}
                                >
                                    Добавить
                                </button>
                                {renderUnitStepper(item, 'gvs', GVS_TEMPLATES)}
                            </div>
                        </div>
                    ))}
                </div>

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
                            {item.description && (
                                <p style={{ margin: '0 0 8px', color: '#64748b', fontSize: 13, lineHeight: 1.45 }}>
                                    {item.description}
                                </p>
                            )}
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
                                <button
                                    onClick={() => addMixingUnit(item, 'pump')}
                                    style={{
                                        padding: '6px 14px',
                                        border: '1px solid #3498db',
                                        borderRadius: 6,
                                        background: '#3498db',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        fontSize: 13,
                                        fontWeight: 700,
                                    }}
                                >
                                    Добавить
                                </button>
                                {renderUnitStepper(item, 'pump', PUMP_TEMPLATES)}
                            </div>
                        </div>
                    ))}
                </div>

            </section>

            </div>{/* /Гидравлика */}

            <div className="sel-group-label" id="chapter-climate">Климат</div>
            <div style={{ marginBottom: 32 }}>

            <section style={{ marginBottom: 32 }}>
                <h2>Термостаты</h2>
                <SectionSubtitle>Укажите тип и количество термостатов</SectionSubtitle>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <ThermostatCard
                        template={wiredThermostatTemplate}
                        color={wiredThermostatColor}
                        onColorChange={setWiredThermostatColor}
                        hasFloorSensor={wiredThermostatHasFloorSensor}
                        onFloorSensorChange={setWiredThermostatHasFloorSensor}
                        onAdd={() => addThermostat(wiredThermostatTemplate)}
                    />
                    <ThermostatCard
                        template={wirelessThermostatTemplate}
                        color={wirelessThermostatColor}
                        onColorChange={setWirelessThermostatColor}
                        hasFloorSensor={wirelessThermostatHasFloorSensor}
                        onFloorSensorChange={setWirelessThermostatHasFloorSensor}
                        onAdd={() => addThermostat(wirelessThermostatTemplate)}
                    />
                </div>

                {(() => {
                    const thermostatRows = getThermostatRows(incomingScheme);
                    if (thermostatRows.length === 0) return null;

                    return (
                        <AddedDevicesBlock>
                            <AddedDevicesTitle>Добавленные термостаты</AddedDevicesTitle>
                            {thermostatRows.map((row) => (
                                <AddedDeviceLine
                                    key={row.label}
                                    label={row.label}
                                    count={row.count}
                                    myheat
                                    onRemove={() => removeSchemeItemById(row.removeKeys[0].target, row.removeKeys[0].id)}
                                />
                            ))}
                        </AddedDevicesBlock>
                    );
                })()}
            </section>

                <section>
                    <h2>Зоны</h2>
                    <SectionSubtitle>Настройте управление системой с помощью зонирования</SectionSubtitle>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
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
                                    maxWidth: 'calc(50% - 8px)',
                                }}
                            >
                                <div className="sel-card-title" style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>{item.label}</div>
                                <p style={{ margin: '0 0 8px', color: '#64748b', fontSize: 13, lineHeight: 1.45 }}>
                                    Определите, на сколько зон будет разделена система, чтобы эффективно управлять оборудованием черех двухходовые сервоприводы.
                                </p>
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
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
                                    <button
                                        onClick={() => addMixingUnit(item, 'zone')}
                                        style={{
                                            padding: '6px 14px',
                                            border: '1px solid #3498db',
                                            borderRadius: 6,
                                            background: '#3498db',
                                            color: '#fff',
                                            cursor: 'pointer',
                                            fontSize: 13,
                                            fontWeight: 700,
                                        }}
                                    >
                                        Добавить
                                    </button>
                                    {renderUnitStepper(item, 'zone', ZONE_TEMPLATES)}
                                </div>
                            </div>
                        ))}
                    </div>

                </section>

            </div>{/* /Управление климатом */}

            <div className="sel-group-label" id="chapter-other-equipment">Прочее оборудование</div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap', marginBottom: 32 }}>
            <section style={{ flex: '1 1 360px', minWidth: 0 }}>
                <SectionSubtitle>Какое количество прочего оборудования (сирены и т.д.) будет управляться с помощью контроллера?</SectionSubtitle>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
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
                                maxWidth: 'calc(50% - 8px)',
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
                                <button
                                    onClick={() => addMixingUnit(item, 'other')}
                                    style={{
                                        padding: '6px 14px',
                                        border: '1px solid #3498db',
                                        borderRadius: 6,
                                        background: '#3498db',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        fontSize: 13,
                                        fontWeight: 700,
                                    }}
                                >
                                    Добавить
                                </button>
                                {renderUnitStepper(item, 'other', OTHER_EQUIP_TEMPLATES)}
                            </div>
                        </div>
                    ))}
                </div>

            </section>
            </div>{/* /Прочее оборудование */}

            <div className="sel-group-label" id="chapter-sensors">Датчики и защита</div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap', marginBottom: 32 }}>
            <div style={{ flex: '1 1 500px', minWidth: 0 }}>
            <section style={{ marginBottom: 32 }}>
                <h2>Датчики температуры</h2>
                <SectionSubtitle>Укажите тип и количество датчиков температуры</SectionSubtitle>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <TemperatureSensorCard
                        options={wiredTemperatureSensorOptions}
                        selectedKey={wiredTemperatureSensorKey}
                        onSelectKey={setWiredTemperatureSensorKey}
                        template={wiredTemperatureSensorTemplate}
                        onAdd={() => addTemperatureSensor(wiredTemperatureSensorTemplate)}
                        stepper={wiredTemperatureSensorTemplate ? renderItemStepper(
                            wiredTemperatureSensorTemplate.target,
                            wiredTemperatureSensorTemplate.data.type,
                            () => addTemperatureSensor(wiredTemperatureSensorTemplate),
                        ) : null}
                    />
                    <TemperatureSensorCard
                        options={wirelessTemperatureSensorOptions}
                        selectedKey={wirelessTemperatureSensorKey}
                        onSelectKey={setWirelessTemperatureSensorKey}
                        template={wirelessTemperatureSensorTemplate}
                        onAdd={() => addTemperatureSensor(wirelessTemperatureSensorTemplate)}
                        stepper={wirelessTemperatureSensorTemplate ? renderItemStepper(
                            wirelessTemperatureSensorTemplate.target,
                            wirelessTemperatureSensorTemplate.data.type,
                            () => addTemperatureSensor(wirelessTemperatureSensorTemplate),
                        ) : null}
                    />
                </div>

            </section>

            <section>
                <h2>Токовый датчик давления</h2>
                <SectionSubtitle>Укажите количество токовых датчиков давления в системе</SectionSubtitle>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
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
                                maxWidth: 'calc(50% - 8px)',
                            }}
                        >
                            <div className="sel-card-title" style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>{item.label}</div>
                            <p style={{ margin: '0 0 8px', color: '#64748b', fontSize: 13, lineHeight: 1.45 }}>
                                Предназначен для измерения давления теплоносителя/воды в автоматизированных системах отопления и водоснабжения.
                            </p>
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
                                <button
                                    onClick={() => addLeakItem({ ...item, target: 'sensors' })}
                                    style={{
                                        padding: '6px 14px',
                                        border: '1px solid #3498db',
                                        borderRadius: 6,
                                        background: '#3498db',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        fontSize: 13,
                                        fontWeight: 700,
                                    }}
                                >
                                    Добавить
                                </button>
                                {renderItemStepper('sensors', item.data.type, () => addLeakItem({ ...item, target: 'sensors' }))}
                            </div>
                        </div>
                    ))}
                </div>

            </section>
            </div>

            </div>{/* /Датчики и защита flex */}

            <section style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
                    <h2 style={{ margin: 0 }}>Контроль протечки воды</h2>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#334155', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        <span>Единый шлейф</span>
                        <input
                            type="checkbox"
                            checked={unifiedLeakLoop}
                            onChange={(event) => setUnifiedLeakLoop(event.target.checked)}
                            style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
                        />
                        <span style={{ position: 'relative', width: 36, height: 20, borderRadius: 999, background: unifiedLeakLoop ? '#2e7d32' : '#cbd5e1', transition: 'background 0.18s ease' }}>
                            <span style={{ position: 'absolute', top: 3, left: 3, width: 14, height: 14, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(15,23,42,0.22)', transform: unifiedLeakLoop ? 'translateX(16px)' : 'none', transition: 'transform 0.18s ease' }} />
                        </span>
                    </label>
                </div>
                {unifiedLeakLoop && <SectionSubtitle>В едином шлейфе используется один датчик протечки.</SectionSubtitle>}
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {LEAK_TEMPLATES.map((item, index) => {
                        const isLeakSensor = canonicalType(item.data.type) === 'leak-sensor';
                        const isUnifiedLeakLimitReached = unifiedLeakLoop && isLeakSensor && leakSensorCount > 0;
                        return (
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
                            {item.description && (
                                <p style={{ margin: '0 0 8px', color: '#64748b', fontSize: 13, lineHeight: 1.45 }}>
                                    {item.description}
                                </p>
                            )}
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
                                <button
                                    onClick={() => addLeakItem(item)}
                                    disabled={isUnifiedLeakLimitReached}
                                    style={{
                                        padding: '6px 14px',
                                        border: `1px solid ${isUnifiedLeakLimitReached ? '#cbd5e1' : '#3498db'}`,
                                        borderRadius: 6,
                                        background: isUnifiedLeakLimitReached ? '#e2e8f0' : '#3498db',
                                        color: isUnifiedLeakLimitReached ? '#94a3b8' : '#fff',
                                        cursor: isUnifiedLeakLimitReached ? 'not-allowed' : 'pointer',
                                        fontSize: 13,
                                        fontWeight: 700,
                                    }}
                                >
                                    Добавить
                                </button>
                                {renderItemStepper(
                                    item.target === 'sensors' ? 'sensors' : 'wired_devices',
                                    item.data.type,
                                    () => addLeakItem(item),
                                    unifiedLeakLoop && isLeakSensor,
                                )}
                            </div>
                        </div>
                        );
                    })}
                </div>

            </section>

            <div className="sel-group-label" id="chapter-misc">Прочее</div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap', marginBottom: 32 }}>
            <section style={{ flex: '1 1 400px', minWidth: 0 }}>
                <h2>Дискретные входы</h2>
                <SectionSubtitle>Укажите какое количество и как будут использоваться дискретные входы</SectionSubtitle>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'nowrap' }}>
                    {DISCRETE_TEMPLATES.map((item, index) => (
                        <div
                            key={index}
                            className="sel-card"
                            style={{
                                border: '1px solid #d7dbe4',
                                borderRadius: 10,
                                padding: 16,
                                background: '#fff',
                                flex: '1 1 0',
                                minWidth: 180,
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
                                <button
                                    onClick={() => addLeakItem({ ...item, target: 'wired' })}
                                    style={{
                                        padding: '6px 14px',
                                        border: '1px solid #3498db',
                                        borderRadius: 6,
                                        background: '#3498db',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        fontSize: 13,
                                        fontWeight: 700,
                                    }}
                                >
                                    Добавить
                                </button>
                                {renderItemStepper('wired_devices', item.data.type, () => addLeakItem({ ...item, target: 'wired' }))}
                            </div>
                        </div>
                    ))}
                </div>

            </section>

            </div>{/* /Прочее */}

            <div className="sel-group-label" id="chapter-power">Питание</div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap', marginBottom: 32 }}>
            <section style={{ flex: '1 1 400px', minWidth: 0 }}>
                <h2>Источник бесперебойного питания</h2>
                <SectionSubtitle>Требуется ли установка источника бесперебойного питания</SectionSubtitle>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
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
                                maxWidth: 'calc(50% - 8px)',
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
                                <button
                                    onClick={() => addPowerModule(item)}
                                    style={{
                                        padding: '6px 14px',
                                        border: '1px solid #3498db',
                                        borderRadius: 6,
                                        background: '#3498db',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        fontSize: 13,
                                        fontWeight: 700,
                                    }}
                                >
                                    Добавить
                                </button>
                                <QtyStepper
                                    count={(Array.isArray(incomingScheme.power_modules) ? incomingScheme.power_modules : []).filter((m) => m === item.value).length}
                                    onIncrement={() => addPowerModule(item)}
                                    onDecrement={() => removePowerModule(item.value)}
                                />
                            </div>
                        </div>
                    ))}
                </div>

            </section>
            </div>{/* /Питание */}

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

export { SelectionApp };
