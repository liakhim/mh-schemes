import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import EquipmentOfferModal from './components/EquipmentOfferModal';
import { getAllOneWireDevicesForBalancing } from './scheme/domain/initialState';
import { materializePowerModules } from './scheme/domain/powerModules';
import {
    createLeakSensor,
    createLeakValve,
    createLeakZone,
    getLeakZoneSensors,
    getLeakValves,
    getLeakZones,
    isLeakLoop,
    materializeLeakZones,
} from './scheme/domain/leakZones';
import { countRinnaiAdapters, RINNAI_ADAPTER_LABEL, RINNAI_ADAPTER_PRICE, withRinnaiAdapter } from './scheme/domain/rinnaiAdapter';
import { normalizeSchemeIds } from './scheme/domain/schemeIds';
import { buildSelectionConfig } from './scheme/domain/selectionConfig';
import {
    calculateSelectionMixedIoModules,
    getProExtPortUsage,
    hasProExtPortCapacity,
    PRO_EXT_DEVICE_CAPACITY,
    reconcileSelectionStupidBoilerSensors,
} from './selectionMixedIoCapacity';

const controllerImagePaths = {
    go: new URL('../assets/controllers/go/go.svg', import.meta.url).href,
    'go+': new URL('../assets/controllers/go+/go+.svg', import.meta.url).href,
    smart2: new URL('../assets/controllers/smart2/smart2.svg', import.meta.url).href,
    pro: new URL('../assets/controllers/pro/pro.svg', import.meta.url).href,
    ecosmart: new URL('../assets/controllers/ecosmart/ecosmart.svg', import.meta.url).href,
};

/** Снимки модулей расширения для плиток панели «Подобранный контроллер». */
const moduleImagePaths = {
    bl2: new URL('../assets/modules/bl2/bl2.svg', import.meta.url).href,
    ecosmartbl2: new URL('../assets/modules/bl2/ecosmartbl2.svg', import.meta.url).href,
    rl6: new URL('../assets/modules/rl6/rl6.svg', import.meta.url).href,
    rl6s: new URL('../assets/modules/rl6s/rl6s.svg', import.meta.url).href,
    io4: new URL('../assets/modules/io4/io4.svg', import.meta.url).href,
    di6: new URL('../assets/modules/di6/di6.svg', import.meta.url).href,
    rl2: new URL('../assets/modules/rl2/rl2.svg', import.meta.url).href,
    rl2s: new URL('../assets/modules/rl2s/rl2s.svg', import.meta.url).href,
    'ntc-1-wire': new URL('../assets/modules/ntc-1-wire/ntc-1-wire.svg', import.meta.url).href,
    rdt2: new URL('../assets/modules/rdt2/rdt2.svg', import.meta.url).href,
    ups: new URL('../assets/modules/ups/ups.svg', import.meta.url).href,
};

const thermostatImagePaths = {
    black: new URL('../images/thermostats/black_thermostat.png', import.meta.url).href,
    white: new URL('../images/thermostats/white_thermostat.png', import.meta.url).href,
    gray: new URL('../images/thermostats/gray_thermostat.png', import.meta.url).href,
};

/** Интерьерное фото — фон карточки термостата. */
const THERMOSTAT_ROOM_IMAGE_PATH = new URL('../images/thermostats/thermostat_room.png', import.meta.url).href;

// TODO: временные картинки для карточки уличного датчика — нужны фото самого
// датчика и уличный кадр под фон; сейчас переиспользуется схематичный SVG
// из отрисовки схемы и интерьерный снимок от термостата.
const OUTDOOR_SENSOR_IMAGE_PATH = new URL('../assets/sensors/wirelessOutdoorSensor.svg', import.meta.url).href;
const OUTDOOR_SENSOR_BACKGROUND_PATH = THERMOSTAT_ROOM_IMAGE_PATH;

/** Котельная — фон карточки подбора котла. */
const BOILER_ROOM_IMAGE_PATH = new URL('../images/thermostats/boiler_room.png', import.meta.url).href;

/** Фон карточки смесительного узла. */
const MIXING_UNIT_BACKGROUND_PATH = new URL('../images/thermostats/mixing_room.png', import.meta.url).href;

/** Фон карточки бойлера ГВС. */
const GVS_BOILER_BACKGROUND_PATH = new URL('../images/thermostats/boiler_gvs_room.png', import.meta.url).href;

/** Фон карточки насосов. */
const PUMP_BACKGROUND_PATH = new URL('../images/thermostats/pump_room.png', import.meta.url).href;

/**
 * Цвет нижней кромки фоновых снимков. Снимок в карточке масштабируется по
 * ширине слоя и не тянется по высоте, поэтому у высокой карточки кадр
 * заканчивается раньше её нижней грани — ниже продолжается этот цвет.
 * Значения — средний цвет нижних строк пикселей соответствующего файла.
 */
const CARD_PHOTO_TAIL_COLOR = {
    boilerRoom: '#51534d',
    pumpRoom: '#bdbab8',
    standardRoom: '#9d8a7f',
    otherRoom: '#615f61',
    thermostatRoom: '#323538',
    upsRoom: '#a09b97',
    zonesRoom: '#fdfdfd',
};

/** Фон карточки зонирования. */
const ZONES_BACKGROUND_PATH = new URL('../images/thermostats/zones_room.jpg', import.meta.url).href;

/** Фон карточки прочего оборудования. */
const OTHER_EQUIP_BACKGROUND_PATH = new URL('../images/thermostats/other_room.png', import.meta.url).href;

/** Фон карточки зон контроля протечки: отдельного снимка нет, берём общий интерьер. */
const LEAK_ZONE_BACKGROUND_PATH = new URL('../images/thermostats/standard_room.png', import.meta.url).href;

/** Пример структуры зоны для режима «показать JSON». */
const LEAK_ZONE_JSON_EXAMPLE = {
    sensors: [{
        type: 'leak-loop',
        device_type: 'sensor',
        connection_type: 'di',
        additions: [{ type: 'leak-sensor', device_type: 'sensor' }],
    }],
    wired_devices: [{
        type: 'valve',
        device_type: 'equipment',
        connection_type: 'double_relay',
    }],
};

/** Фон карточки источника бесперебойного питания. */
const UPS_BACKGROUND_PATH = new URL('../images/thermostats/ups_room.png', import.meta.url).href;

/** Фон карточки токового датчика давления и снимок самого датчика поверх него. */
const PRESSURE_SENSOR_BACKGROUND_PATH = new URL('../images/thermostats/standard_room.png', import.meta.url).href;
const PRESSURE_SENSOR_IMAGE_PATH = new URL('../images/thermostats/420sensor.png', import.meta.url).href;

/** Быстрые подсказки над строкой поиска: подставляют бренд в запрос. */
const BOILER_BRAND_TAGS = ['Baxi', 'Ariston', 'Arderia', 'Rinnai', 'Zota'];

const MYHEAT_LOGO_PATH = new URL('../assets/logo/logo.svg', import.meta.url).href;

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

const STUPID_BOILER_SENSOR_AUTO_SOURCE = 'selection-stupid-boiler';

const makeStupidBoilerSensor = (boiler) => ({
    id: generateId(),
    device_type: 'sensor',
    type: 'flask-sensor-stupid-boiler',
    connection_type: '1-wire',
    title: 'Датчик котла',
    boiler_id: boiler?.id,
    _auto_source: STUPID_BOILER_SENSOR_AUTO_SOURCE,
});

/**
 * Добавляет обязательный датчик подачи для котла с релейным управлением.
 * @param {object} scheme Текущая схема.
 * @param {object} boiler Добавляемый котел.
 * @returns {object} Исходная либо дополненная схема.
 */
const withStupidBoilerSensor = (scheme, boiler) => {
    if (canonicalType(boiler?.type) !== 'stupid') return scheme;
    const sensors = Array.isArray(scheme?.sensors) ? scheme.sensors : [];
    return {
        ...scheme,
        sensors: [...sensors, makeStupidBoilerSensor(boiler)],
    };
};

/** Removes exactly the sensor linked to a boiler, or one unlinked legacy sensor. */
const withoutStupidBoilerSensor = (scheme, boiler) => {
    if (canonicalType(boiler?.type) !== 'stupid') return scheme;
    const isBoilerSensor = (device) => canonicalType(device?.type) === 'flask-sensor-stupid-boiler';
    const isLinkedSensor = (device) => isBoilerSensor(device)
        && boiler?.id != null
        && String(device?.boiler_id) === String(boiler.id);
    const controller = scheme?.controller && typeof scheme.controller === 'object' ? scheme.controller : null;
    const extModules = Array.isArray(scheme?.ext_modules) ? scheme.ext_modules : [];
    const allSensors = [
        ...(Array.isArray(scheme?.sensors) ? scheme.sensors : []),
        ...(Array.isArray(controller?.one_wire_devices) ? controller.one_wire_devices : []),
        ...extModules.flatMap((moduleItem) => (Array.isArray(moduleItem?.one_wire_devices) ? moduleItem.one_wire_devices : [])),
    ];
    const hasLinkedSensor = allSensors.some(isLinkedSensor);
    let removed = false;
    const removeOne = (devices) => (Array.isArray(devices) ? devices.filter((device) => {
        if (removed) return true;
        const matches = hasLinkedSensor
            ? isLinkedSensor(device)
            : isBoilerSensor(device) && device?.boiler_id == null;
        if (!matches) return true;
        removed = true;
        return false;
    }) : devices);

    const sensors = removeOne(scheme?.sensors);
    const nextController = controller && Array.isArray(controller.one_wire_devices)
        ? { ...controller, one_wire_devices: removeOne(controller.one_wire_devices) }
        : controller;
    const nextExtModules = extModules.map((moduleItem) => (
        moduleItem && typeof moduleItem === 'object' && Array.isArray(moduleItem.one_wire_devices)
            ? { ...moduleItem, one_wire_devices: removeOne(moduleItem.one_wire_devices) }
            : moduleItem
    ));
    if (!removed) return scheme;
    return {
        ...scheme,
        ...(Array.isArray(scheme?.sensors) ? { sensors } : {}),
        ...(nextController ? { controller: nextController } : {}),
        ...(Array.isArray(scheme?.ext_modules) ? { ext_modules: nextExtModules } : {}),
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
const AUTO_REQUIRED_MODULE_SOURCE = 'selection-required-module';

const CONTROLLER_LABELS = {
    go: 'GO',
    'go+': 'GO+',
    smart2: 'Smart2',
    pro: 'PRO',
    ecosmart: 'ECOsmart',
};

/** Описания контроллеров в карточках панели «Подобранный контроллер». */
const CONTROLLER_CARD_DESCRIPTIONS = {
    go: 'Предназначен для удалённого управления котлом отопления.',
    'go+': 'Предназначен для удалённого управления котлом отопления, дополнен встроенным аккумулятором и активированным радиомодулем.',
    smart2: 'Предназначен для автоматизации небольших систем отопления с гибкой настройкой инженерного оборудования.',
    pro: 'Обеспечивает широкие возможности настройки, управления контурами, каскадом до 13 котлов по цифровой шине, бойлером и дополнительным инженерным оборудованием до 80 единиц для построения гибкой системы автоматики.',
    ecosmart: 'Оснащён встроенным аккумулятором и радиоприёмником, имеет простую коммутацию и поддерживает автонастройку системы при первом включении без подключения к интернету.',
};

// Подсветка смены подобранного контроллера. Длительность должна совпадать с
// анимациями `sel-controller-*` в app.css, иначе класс снимут раньше времени.
const CONTROLLER_CHANGE_CLASS = 'is-controller-changed';
const CONTROLLER_CHANGE_ANIMATION_NAME = 'sel-controller-panel-pop';
const CONTROLLER_CHANGE_ANIMATION_MS = 520;

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

/**
 * Считает свободные NTC-входы конкретного модуля ntc-1-wire.
 * @param {string|object} device Тип либо объект модуля с внутренними линиями.
 * @returns {number} Число свободных входов от 0 до 6.
 */
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

/**
 * Рассчитывает дефицит модулей ntc-1-wire для прямых NTC-датчиков схемы.
 * @param {object} scheme Анализируемая схема.
 * @returns {number} Число дополнительных модулей.
 */
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

/**
 * Определяет, требуется ли радиомодуль RDT2 для выбранного контроллера.
 * @param {object} scheme Анализируемая схема.
 * @param {?string} controllerTypeOverride Тип контроллера вместо указанного в схеме.
 * @returns {number} Ноль либо один требуемый модуль.
 */
const getRequiredRdt2ModuleCount = (scheme, controllerTypeOverride = null) => {
    const controllerType = controllerTypeOverride || getControllerType(scheme);
    if (!RDT2_REQUIRED_CONTROLLERS.has(controllerType)) return 0;
    const wirelessDevices = Array.isArray(scheme?.wireless_devices) ? scheme.wireless_devices : [];
    if (wirelessDevices.length === 0) return 0;
    return countRdt2Modules(scheme) > 0 ? 0 : 1;
};

/**
 * Считает загрузку 1-wire с учетом переноса термостатов PRO на EXT.
 * @param {object} scheme Анализируемая схема.
 * @param {string} controllerType Тип контроллера, задающий правила подсчета.
 * @returns {number} Число занятых позиций 1-wire.
 */
const getOneWireCapacityUsage = (scheme, controllerType) => {
    const devices = getAllOneWireDevicesForBalancing(scheme);
    if (controllerType !== 'pro') return devices.length;

    const extDevices = Array.isArray(scheme?.controller?.ext_devices) ? scheme.controller.ext_devices : [];
    const extModules = Array.isArray(scheme?.ext_modules) ? scheme.ext_modules : [];
    let freeExtSlots = Math.max(0, PRO_EXT_DEVICE_CAPACITY - extDevices.length - extModules.length);
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

/**
 * Синхронизирует автоматический датчик стратегии для двух и более умных котлов.
 * @param {object} scheme Текущая схема.
 * @returns {object} Схема с актуальным составом датчиков.
 */
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

/**
 * Проверяет принадлежность устройства составной пользовательской группе.
 * @param {object} device Устройство схемы.
 * @param {string} group Идентификатор группы: mixing, pump, zone и т.п.
 * @param {Array<object>} templates Шаблоны допустимых устройств группы.
 * @returns {boolean} Принадлежит ли устройство группе.
 */
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

/**
 * Рассчитывает доступные порты контроллера после учета расширений и UPS.
 * @param {object} scheme Схема с установленными модулями.
 * @param {string} controllerType Проверяемый контроллер.
 * @returns {?object} Итоговые лимиты либо null для неизвестного контроллера.
 */
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

/**
 * Распределяет строгие и гибкие устройства между линиями RELAY и RELAY-S.
 * @param {object} scheme Анализируемая схема.
 * @param {object} limits Доступные емкости relay-линий.
 * @returns {object} Загрузка линий и промежуточные счетчики.
 */
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

/**
 * Собирает сводную потребность схемы во всех типах портов и модулей.
 * @param {object} scheme Анализируемая схема.
 * @param {?string} controllerTypeOverride Проверяемый тип вместо текущего.
 * @returns {object} Счетчики BUS, relay, 1-wire, DI, 4-20 и модулей.
 */
const getCompatibilityStats = (scheme, controllerTypeOverride = null) => {
    const controllerType = controllerTypeOverride || getControllerType(scheme);
    const wiredDevices = Array.isArray(scheme?.wired_devices) ? scheme.wired_devices : [];
    const sensors = Array.isArray(scheme?.sensors) ? scheme.sensors : [];
    const boilers = Array.isArray(scheme?.boilers) ? scheme.boilers : [];
    const controller = scheme?.controller && typeof scheme.controller === 'object' ? scheme.controller : {};
    const io4ChannelDevices = (Array.isArray(scheme?.ext_modules) ? scheme.ext_modules : [])
        .filter((moduleItem) => canonicalType(typeof moduleItem === 'string' ? moduleItem : moduleItem?.type) === 'io4')
        .flatMap((moduleItem) => (Array.isArray(moduleItem?.channel_devices) ? moduleItem.channel_devices : []));

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
    const diFromWired = wiredDevices.filter((device) => (
        hasConnectionType(device, 'di') && countIo4OnlyDeviceSlots(device) === 0
    )).length;
    const diFromSensors = sensors.filter((sensor) => hasConnectionType(sensor, 'di')).length;
    const diFromIo4 = io4ChannelDevices.filter((device) => (
        hasConnectionType(device, 'di') && countIo4OnlyDeviceSlots(device) === 0
    )).length;
    const di = diFromController + diFromWired + diFromSensors + diFromIo4;
    const placedIo4Only = io4ChannelDevices.filter((device) => {
        const type = canonicalType(device?.type);
        return type === '010pump' || type === '010servo' || type === 'mixing-ntc-sensor';
    }).length;
    const io4Only = wiredDevices.reduce((sum, device) => sum + countIo4OnlyDeviceSlots(device), placedIo4Only);
    const controller420Key = Object.prototype.hasOwnProperty.call(controller, 'devices420')
        ? 'devices420'
        : 'devices_420';
    const controller420Devices = Array.isArray(controller[controller420Key]) ? controller[controller420Key] : [];
    const analog420 = sensors.filter((sensor) => hasConnectionType(sensor, '4-20')).length
        + controller420Devices.filter((sensor) => hasConnectionType(sensor, '4-20')).length
        + io4ChannelDevices.filter((sensor) => hasConnectionType(sensor, '4-20')).length;
    const ups = Array.isArray(scheme?.power_modules) && scheme.power_modules.includes('ups') ? 1 : 0;

    return { oneWire, oneWireThermostats, bus, relay, relayS, di, io4Only, analog420, ups, requiredNtcModules, totalNtcModules, requiredNtcOneWireLines, oneWireLines, requiredRdt2Modules };
};

const getSelectionMixedIoPlan = (scheme, stats, controllerType) => {
    const baseLimits = CONTROLLER_LIMITS[controllerType] || {};
    const controllerDiCapacity = controllerType === 'pro' && stats.ups > 0 ? 0 : (baseLimits.di || 0);
    const controller = scheme?.controller && typeof scheme.controller === 'object' ? scheme.controller : {};
    const controller420Key = Object.prototype.hasOwnProperty.call(controller, 'devices420')
        ? 'devices420'
        : 'devices_420';
    const controller420Devices = Array.isArray(controller[controller420Key]) ? controller[controller420Key] : [];
    const extModules = Array.isArray(scheme?.ext_modules) ? scheme.ext_modules : [];
    const io4Modules = extModules.filter((moduleItem) => (
        canonicalType(typeof moduleItem === 'string' ? moduleItem : moduleItem?.type) === 'io4'
    ));
    const di6Modules = extModules.filter((moduleItem) => (
        canonicalType(typeof moduleItem === 'string' ? moduleItem : moduleItem?.type) === 'di6'
    ));
    const wiredDevices = Array.isArray(scheme?.wired_devices) ? scheme.wired_devices : [];
    const sensors = Array.isArray(scheme?.sensors) ? scheme.sensors : [];
    return calculateSelectionMixedIoModules({
        unplacedIo4ChannelGroups: wiredDevices
            .map(countIo4OnlyDeviceSlots)
            .filter((count) => count > 0),
        unplacedAnalog420Devices: sensors.filter((sensor) => hasConnectionType(sensor, '4-20')).length,
        unplacedGeneralDiDevices: wiredDevices.filter((device) => (
            hasConnectionType(device, 'di') && countIo4OnlyDeviceSlots(device) === 0
        )).length + sensors.filter((sensor) => hasConnectionType(sensor, 'di')).length,
        controllerAnalog420Capacity: baseLimits.analog420 || 0,
        controllerAnalog420Occupied: controller420Devices.length,
        controllerDiCapacity,
        controllerDiOccupied: Array.isArray(controller.di_devices) ? controller.di_devices.length : 0,
        existingIo4ChannelLengths: io4Modules.map((moduleItem) => (
            Array.isArray(moduleItem?.channel_devices) ? moduleItem.channel_devices.length : 0
        )),
        existingDi6ChannelLengths: di6Modules.map((moduleItem) => (
            Array.isArray(moduleItem?.channel_devices) ? moduleItem.channel_devices.length : 0
        )),
    });
};

const getPreferredGoControllerType = (scheme, upsRequested = false) => (
    upsRequested || (Array.isArray(scheme?.wireless_devices) && scheme.wireless_devices.length > 0)
        ? 'go+'
        : 'go'
);

/**
 * Преобразует пользовательский выбор UPS в формат конкретного контроллера.
 * @param {object} scheme Текущая схема.
 * @param {string} controllerType Целевой контроллер.
 * @param {boolean} upsRequested Требуется ли бесперебойное питание.
 * @returns {object} Схема с актуальными power_modules.
 */
const materializeUpsIntentForController = (scheme, controllerType, upsRequested) => {
    const powerModules = materializePowerModules(scheme?.power_modules, controllerType, upsRequested);
    if (powerModules.length > 0) return { ...scheme, power_modules: powerModules };
    if (!Object.prototype.hasOwnProperty.call(scheme || {}, 'power_modules')) return scheme;
    const { power_modules: removedPowerModules, ...rest } = scheme;
    return rest;
};

const requiresProForBoilerCombination = (scheme) => {
    const boilers = Array.isArray(scheme?.boilers) ? scheme.boilers : [];
    const smartBoilers = boilers.filter((boiler) => canonicalType(boiler?.type) === 'smart');
    const stupidBoilers = boilers.filter((boiler) => canonicalType(boiler?.type) === 'stupid');

    return smartBoilers.length >= 2
        && stupidBoilers.length >= 1
        && smartBoilers.some((boiler) => hasConnectionType(boiler, 'relay'));
};

// идентификация ecosmart
/**
 * Проверяет, помещается ли оборудование в фиксированные линии ECOsmart.
 * @param {object} scheme Полная схема, включая устройства внутри модулей.
 * @returns {boolean} Поддерживает ли ECOsmart такой состав оборудования.
 */
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
    const relayBoilers = boilers.filter((boiler) => hasConnectionType(boiler, 'relay')).length;
    const boilerGvs = wiredDevices.filter((device) => canonicalType(device?.type) === 'boiler-pump').length;
    const mixing220 = wiredDevices.filter((device) => canonicalType(device?.type) === '220servo' && hasConnectionType(device, 'double_relay')).length;
    const pumps220 = wiredDevices.filter((device) => canonicalType(device?.type) === 'pump-220v').length;
    const pressure420 = sensors.filter((sensor) => canonicalType(sensor?.type) === 'pressure-sensor' && hasConnectionType(sensor, '4-20')).length;
    // Зона занимает один дискретный вход независимо от числа датчиков в шлейфе.
    const leakZones = sensors.filter((sensor) => isLeakLoop(sensor) && hasConnectionType(sensor, 'di')).length;
    const valves = wiredDevices.filter((device) => canonicalType(device?.type) === 'valve').length;
    const discreteInputs = wiredDevices.filter((device) => DISCRETE_TEMPLATES.some((template) => canonicalType(template.data.type) === canonicalType(device?.type))).length;
    const io4Only = wiredDevices.reduce((sum, device) => sum + countIo4OnlyDeviceSlots(device), 0);
    const zoneServos = wiredDevices.filter((device) => canonicalType(device?.type) === 'zoneServo').length;
    const otherEquipment = wiredDevices.filter((device) => {
        const type = canonicalType(device?.type);
        return type === 'otherequipment' || type === 'other-equipment';
    }).length;

    return smartBoilers <= 2
        && relayBoilers <= 1
        && boilerGvs <= 1
        && mixing220 <= 2
        && pumps220 <= 3
        && pressure420 <= 1
        && leakZones <= 1
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

const getSmart2UsedDiPorts = (scheme, preparedStats = null) => {
    const stats = preparedStats || getCompatibilityStats(scheme, 'smart2');
    const usedByDiModules = (Array.isArray(scheme?.di_modules) ? scheme.di_modules : [])
        .map((moduleItem) => canonicalType(typeof moduleItem === 'string' ? moduleItem : moduleItem?.type))
        .filter((type) => type === 'rl2' || type === 'rl2s')
        .length * 2;
    const usedByUps = stats.ups > 0 ? 2 : 0;
    return usedByUps + usedByDiModules + stats.di;
};

/**
 * Возвращает понятные пользователю причины несовместимости схемы с контроллером.
 * @param {object} scheme Проверяемая схема.
 * @param {?string} controllerTypeOverride Контроллер-кандидат вместо текущего.
 * @param {boolean} upsRequested Требуется ли UPS.
 * @returns {string[]} Список нарушенных ограничений.
 */
const getControllerCompatibilityIssues = (scheme, controllerTypeOverride = null, upsRequested = false) => {
    const controllerType = controllerTypeOverride || getControllerType(scheme);
    if (controllerType !== 'pro' && requiresProForBoilerCombination(scheme)) {
        return ['Комбинация из двух умных и одного тупого котла, где умный котёл подключён по RELAY, требует контроллер PRO.'];
    }
    if (upsRequested && controllerType === 'go') {
        return ['Для бесперебойного питания требуется GO+ со встроенным ИБП либо Smart2/PRO с внешним UPS.'];
    }
    scheme = materializeUpsIntentForController(scheme, controllerType, upsRequested);
    const limits = getModuleAdjustedLimits(scheme, controllerType);
    if (!limits) return ['Не выбран поддерживаемый контроллер.'];

    const stats = getCompatibilityStats(scheme, controllerType);
    const issues = [];

    if (controllerType === 'pro') {
        const extPortUsage = getProExtPortUsage(scheme);
        if (extPortUsage > PRO_EXT_DEVICE_CAPACITY) {
            issues.push(`EXT-порты PRO: требуется ${extPortUsage}, доступно ${PRO_EXT_DEVICE_CAPACITY}.`);
        }
    }

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
    if (controllerType === 'pro') {
        const mixedIoPlan = getSelectionMixedIoPlan(scheme, stats, controllerType);
        if (mixedIoPlan.additionalIo4Modules > 0) {
            issues.push(`Общие каналы IO4: требуется еще модулей ${mixedIoPlan.additionalIo4Modules}.`);
        }
        if (mixedIoPlan.additionalDi6Modules > 0) {
            issues.push(`DI-входы: требуется еще модулей DI6 ${mixedIoPlan.additionalDi6Modules}.`);
        }
    } else {
        addCapacityIssue('DI-входы', stats.di, limits.di);
    }
    if (controllerType === 'smart2') {
        const usedDiPorts = getSmart2UsedDiPorts(scheme, stats);
        if (usedDiPorts > 4) {
            issues.push(`DI-порты smart2: требуется ${usedDiPorts}, доступно 4.`);
        }
    }
    if (controllerType !== 'pro') {
        addCapacityIssue('io4 channel-слоты для 0-10V устройств', stats.io4Only, limits.io4Channels);
        addCapacityIssue('4-20 входы', stats.analog420, limits.analog420);
    }
    if (stats.ups > 0 && !limits.power) {
        issues.push('UPS требует контроллер с power-линией: smart2 или pro.');
    }

    return issues;
};

/**
 * Проверяет контроллер-кандидат и рассчитывает необходимые модули расширения.
 * @param {object} scheme Исходная схема.
 * @param {string} controllerType Тип контроллера-кандидата.
 * @param {boolean} upsRequested Требуется ли UPS.
 * @returns {{compatible: boolean, modules: string[]}} Результат подбора.
 */
const getControllerRecommendation = (scheme, controllerType, upsRequested = false) => {
    const baseLimits = CONTROLLER_LIMITS[controllerType];
    if (!baseLimits) return { compatible: false, modules: [] };
    if (controllerType !== 'pro' && requiresProForBoilerCombination(scheme)) {
        return { compatible: false, modules: [] };
    }
    if (upsRequested && controllerType === 'go') {
        return { compatible: false, modules: [] };
    }
    const candidateScheme = getControllerCandidateScheme(scheme, controllerType, upsRequested);

    if (controllerType === 'ecosmart') {
        return { compatible: isEcosmartIdentified(candidateScheme), modules: [] };
    }

    const stats = getCompatibilityStats(candidateScheme, controllerType);
    const modules = [];
    let additionalProExtModules = 0;
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
            additionalProExtModules += bl2Count;
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
        if (controllerType === 'pro') {
            additionalProExtModules += relayModuleCount + relaySModuleCount + oneWireModuleCount;
        }

        const mixedIoPlan = getSelectionMixedIoPlan(candidateScheme, stats, controllerType);
        const io4Count = mixedIoPlan.additionalIo4Modules;
        limits.analog420 += io4Count * 4;
        limits.io4Channels += io4Count * 4;
        limits.di += io4Count * 4;
        addModules('io4', io4Count);
        if (controllerType === 'pro') additionalProExtModules += io4Count;

        const di6Count = mixedIoPlan.additionalDi6Modules;
        limits.di += di6Count * 6;
        addModules('di6', di6Count);
        if (controllerType === 'pro') additionalProExtModules += di6Count;
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
        && (controllerType === 'pro' || (
            stats.di <= limits.di
            && stats.io4Only <= limits.io4Channels
            && stats.analog420 <= limits.analog420
        ))
        && (controllerType !== 'pro' || hasProExtPortCapacity(candidateScheme, additionalProExtModules))
        && (stats.ups === 0 || limits.power);

    return { compatible, modules };
};

const getCompatibleControllerOptions = (scheme, upsRequested = false) => CONTROLLER_TEMPLATES
    .map((item) => ({
        type: item.value.type,
        label: item.label,
        ...getControllerRecommendation(scheme, item.value.type, upsRequested),
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

/**
 * Возвращает устройства удаляемых EXT-модулей в публичные массивы схемы.
 * @param {object} scheme Схема с ext_modules.
 * @returns {object} Схема с восстановленными устройствами, датчиками и котлами.
 */
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

/**
 * Переносит подходящие проводные термостаты на встроенную EXT-линию ECOsmart.
 * @param {object} scheme Схема ECOsmart.
 * @returns {object} Схема с материализованной ext_devices.
 */
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
/**
 * Разворачивает внутренние линии ECOsmart перед переходом на другой контроллер.
 * @param {object} scheme Материализованная схема ECOsmart.
 * @returns {object} Публичное представление устройств.
 */
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

    const stupidBoilers = (Array.isArray(nextScheme?.boilers) ? nextScheme.boilers : [])
        .filter((boiler) => canonicalType(boiler?.type) === 'stupid');
    const currentController = nextScheme?.controller && typeof nextScheme.controller === 'object'
        ? nextScheme.controller
        : null;
    const controllerOneWireDevices = Array.isArray(currentController?.one_wire_devices)
        ? currentController.one_wire_devices
        : [];
    const isStupidBoilerSensor = (sensor) => canonicalType(sensor?.type) === 'flask-sensor-stupid-boiler';
    const controllerBoilerSensors = controllerOneWireDevices.filter(isStupidBoilerSensor);
    const sensors = reconcileSelectionStupidBoilerSensors(
        stupidBoilers,
        [
            ...(Array.isArray(nextScheme?.sensors) ? nextScheme.sensors : []),
            ...controllerBoilerSensors,
        ],
        makeStupidBoilerSensor,
    );
    nextScheme = {
        ...nextScheme,
        sensors,
        ...(currentController && controllerBoilerSensors.length > 0 ? {
            controller: {
                ...currentController,
                one_wire_devices: controllerOneWireDevices.filter((sensor) => !isStupidBoilerSensor(sensor)),
            },
        } : {}),
    };

    return nextScheme;
};

const withControllerValue = (scheme, controllerValue) => {
    const base = getControllerType(scheme) === 'ecosmart' ? unwindEcosmartInternals(scheme) : scheme;
    return { ...base, controller: controllerValue };
};

/**
 * Приводит модули и размещение устройств к правилам текущего контроллера.
 * @param {object} scheme Схема после выбора контроллера.
 * @returns {object} Нормализованная схема.
 */
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

/**
 * Строит нормализованную копию схемы для проверки контроллера-кандидата.
 * @param {object} scheme Исходная схема.
 * @param {string} controllerType Проверяемый контроллер.
 * @param {boolean} upsRequested Требуется ли UPS.
 * @returns {object} Схема-кандидат без изменения исходного объекта.
 */
const getControllerCandidateScheme = (scheme, controllerType, upsRequested = false) => {
    if (getControllerType(scheme) === controllerType) {
        return materializeUpsIntentForController(scheme, controllerType, upsRequested);
    }
    const controllerValue = getControllerTemplateValue(controllerType);
    return controllerValue
        ? materializeUpsIntentForController(
            normalizeModulesForController(withControllerValue(scheme, controllerValue)),
            controllerType,
            upsRequested,
        )
        : scheme;
};

/**
 * Добавляет автоматически необходимые модули для текущего состава оборудования.
 * @param {object} scheme Нормализуемая схема.
 * @returns {object} Схема с рассчитанными EXT, DI и 1-wire модулями.
 */
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

    const mixedIoPlan = getSelectionMixedIoPlan(scheme, stats, controllerType);
    const io4Count = mixedIoPlan.additionalIo4Modules;
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

    const di6Count = mixedIoPlan.additionalDi6Modules;
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

/**
 * Согласует текущие автоматические модули с заново рассчитанным набором.
 * @param {Array<object>} currentItems Текущий список, включая ручные модули.
 * @param {Array<object>} requiredItems Новый расчет автоматических модулей.
 * @returns {{items: Array<object>, changed: boolean}} Итоговый список и признак изменения.
 */
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

/**
 * Пересчитывает автоматические модули, сохраняя добавленные вручную.
 * @param {object} scheme Текущая схема.
 * @returns {object} Согласованная схема.
 */
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

/**
 * Выполняет полный цикл выбора контроллера, нормализации и подбора модулей.
 * @param {object} scheme Входная схема после пользовательского изменения.
 * @param {boolean} upsRequested Пользовательское требование UPS.
 * @returns {object} Готовая согласованная схема.
 */
const resolveControllerAndRequiredModules = (scheme, upsRequested = false, isManualControllerSelection = false) => {
    const initialControllerType = getControllerType(scheme);
    const preferredGoControllerType = getPreferredGoControllerType(scheme, upsRequested);
    if (
        !isManualControllerSelection
        && (initialControllerType === 'go' || initialControllerType === 'go+')
        && initialControllerType !== preferredGoControllerType
    ) {
        scheme = withControllerValue(scheme, getControllerTemplateValue(preferredGoControllerType));
    }
    scheme = materializeUpsIntentForController(scheme, getControllerType(scheme), upsRequested);
    scheme = normalizeModulesForController(scheme);
    scheme = reconcileRequiredModules(scheme);
    const currentControllerIssues = getControllerCompatibilityIssues(scheme, null, upsRequested);
    if (currentControllerIssues.length > 0) {
        const compatibleOption = getCompatibleControllerOptions(scheme, upsRequested)[0] || null;
        const controllerValue = compatibleOption ? getControllerTemplateValue(compatibleOption.type) : null;
        if (controllerValue) {
            const candidateScheme = materializeUpsIntentForController(
                withControllerValue(scheme, controllerValue),
                compatibleOption.type,
                upsRequested,
            );
            return reconcileRequiredModules(normalizeModulesForController(candidateScheme));
        }
    }

    return materializeUpsIntentForController(scheme, getControllerType(scheme), upsRequested);
};

const DISCRETE_TEMPLATES = [
    {
        label: 'Запрос тепла от бассейна',
        background: new URL('../images/thermostats/2_room.png', import.meta.url).href,
        data: { id: 8, device_type: 'equipment', type: 'discrete_pool', connection_type: 'di' },
    },
    {
        label: 'Запрос тепла от вентиляции',
        background: new URL('../images/thermostats/1_room.png', import.meta.url).href,
        data: { id: 8, device_type: 'equipment', type: 'discrete_ventilation', connection_type: 'di' },
    },
    {
        label: 'Датчик ОПС',
        background: new URL('../images/thermostats/3_room.png', import.meta.url).href,
        data: { id: 9, device_type: 'equipment', type: 'discrete_fire_alarm', connection_type: 'di' },
    },
    {
        label: 'Произвольный сигнал',
        background: new URL('../images/thermostats/4_room.png', import.meta.url).href,
        data: { id: 10, device_type: 'equipment', type: 'discrete_signal', connection_type: 'di' },
    },
];

// Высота карточки дискретного входа фиксирована, потому что фон карточки —
// снимок в режиме `cover`: он масштабируется по высоте слоя, и любое изменение
// высоты (появился блок «Добавлено», исчезла кнопка) дёргало бы кадр. Высоты
// хватает на оба состояния карточки, поэтому картинка стоит на месте.
const DISCRETE_CARD_HEIGHT = 158;

const PRESSURE_TEMPLATES = [
    {
        label: 'Токовый датчик давления',
        data: { id: 4, device_type: 'sensor', type: 'pressure-sensor', connection_type: '4-20' },
    },
];

const THERMOSTAT_COLORS = [
    { value: 'black', label: 'Черный' },
    { value: 'white', label: 'Белый' },
    { value: 'gray', label: 'Серебристый' },
];

const THERMOSTAT_CONNECTIONS = [
    { value: 'wired', label: 'Проводной' },
    { value: 'wireless', label: 'Беспроводной' },
];

/** Заливка кружка-образца в переключателе цвета термостата. */
const THERMOSTAT_SWATCH_FILL = {
    black: '#1c2230',
    white: '#ffffff',
    gray: '#a3aab8',
};

/**
 * Создает шаблон термостата по подключению, цвету и наличию датчика пола.
 * @param {object} options Параметры шаблона.
 * @param {'wired'|'wireless'} options.target Способ подключения.
 * @param {string} options.color Цвет корпуса.
 * @param {boolean} options.hasFloorSensor Добавлять ли датчик пола.
 * @returns {object} Шаблон карточки и устройства.
 */
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
const SELECTION_DRAFT_STORAGE_KEY = 'mh-schemes-selection-draft';
const SELECTION_DRAFT_VERSION = 1;

const createInitialSelectionScheme = () => ({
    controller: { type: 'go', relay_devices: [], one_wire_devices: [], bus_devices: [] },
});

const hasSelectedArrayItems = (value) => {
    if (Array.isArray(value)) return value.some(Boolean);
    if (!value || typeof value !== 'object') return false;
    return Object.values(value).some(hasSelectedArrayItems);
};

const isSelectionDraftMeaningful = (scheme, upsRequested) => (
    canonicalType(typeof scheme?.controller === 'string' ? scheme.controller : scheme?.controller?.type) !== 'go'
    || upsRequested === true
    || hasSelectedArrayItems(scheme)
);

const readSelectionDraft = () => {
    try {
        const raw = window.localStorage?.getItem(SELECTION_DRAFT_STORAGE_KEY);
        if (!raw) return null;
        const draft = JSON.parse(raw);
        if (draft?.version !== SELECTION_DRAFT_VERSION || !draft.incomingScheme || typeof draft.incomingScheme !== 'object') return null;
        // Черновики со старой моделью протечки поднимаются уже в виде зон.
        const migratedDraft = { ...draft, incomingScheme: materializeLeakZones(draft.incomingScheme) };
        return isSelectionDraftMeaningful(migratedDraft.incomingScheme, migratedDraft.upsRequested) ? migratedDraft : null;
    } catch {
        return null;
    }
};

const removeSelectionDraft = () => {
    try {
        window.localStorage?.removeItem(SELECTION_DRAFT_STORAGE_KEY);
    } catch {
        // localStorage can be unavailable in private browsing or restricted contexts.
    }
};

const writeSelectionDraft = (draft) => {
    try {
        window.localStorage?.setItem(SELECTION_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
        // Selection remains usable when storage quota or browser policy blocks persistence.
    }
};

/**
 * Отладочный показ `incomingScheme` в карточках. Чекбокс скрыт от обычного
 * пользователя и появляется, только если в localStorage вручную выставлено
 * `incomingScheme = '1'`.
 */
const isJsonToggleEnabled = () => {
    try {
        return window.localStorage?.getItem('incomingScheme') === '1';
    } catch {
        // localStorage can be unavailable in private browsing or restricted contexts.
        return false;
    }
};

const makeBoilerSearchPayload = (query) => ({
    action: 'getNames',
    data: { name: query },
});

/**
 * Приводит варианты ответа API поиска котлов к единому массиву.
 * @param {*} data Непроверенный JSON-ответ сервера.
 * @returns {Array<object>} Результаты с едиными id и name.
 */
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

const makeSchemeName = () => {
    const now = new Date();
    return `Подбор ${now.toLocaleDateString('ru-RU')} ${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
};

const TEMPERATURE_SENSOR_TEMPLATES = [
    {
        key: 'wireless-outdoor',
        label: 'Беспроводной Уличный датчик температуры',
        addLabel: 'Добавить беспроводной уличный датчик температуры',
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
        addLabel: 'Добавить беспроводной настенный датчик температуры',
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
        addLabel: 'Добавить проводной цифровой настенный датчик температуры',
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
        addLabel: 'Добавить проводной цифровой датчик температуры в колбе',
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
        addLabel: 'Добавить проводной NTC-датчик температуры в колбе',
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
        addLabel: 'Добавить проводной настенный NTC-датчик температуры',
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

// Уличный радиодатчик вынесен из общей карточки беспроводных датчиков:
// он допустим в единственном экземпляре и включается тумблером.
const OUTDOOR_TEMPERATURE_SENSOR_KEY = 'wireless-outdoor';
const OUTDOOR_TEMPERATURE_SENSOR_TEMPLATE = TEMPERATURE_SENSOR_TEMPLATES
    .find((template) => template.key === OUTDOOR_TEMPERATURE_SENSOR_KEY);
const OUTDOOR_TEMPERATURE_SENSOR_TYPE = canonicalType(OUTDOOR_TEMPERATURE_SENSOR_TEMPLATE.data.type);

const TEMPERATURE_SENSOR_TYPES = new Set(TEMPERATURE_SENSOR_TEMPLATES.map((template) => canonicalType(template.data.type)));
const isTemperatureSensor = (device) => TEMPERATURE_SENSOR_TYPES.has(canonicalType(device?.type));
const getTemperatureSensorGroup = (template) => (template.target === 'wireless_devices' ? 'wireless' : 'wired');

// Варианты объединённой карточки датчиков температуры. Ключи проводных шаблонов
// собираются как `wired-<расположение>-<тип>`, беспроводной вариант один —
// настенный, поэтому «в колбе» для него гасится.
const TEMPERATURE_SENSOR_CONNECTIONS = [
    { value: 'wired', label: 'Проводной' },
    { value: 'wireless', label: 'Беспроводной' },
];
const TEMPERATURE_SENSOR_PLACEMENTS = [
    { value: 'wall', label: 'Настенный' },
    { value: 'flask', label: 'В колбе' },
];
const TEMPERATURE_SENSOR_KINDS = [
    { value: 'digital', label: 'Цифровой' },
    { value: 'ntc', label: 'NTC' },
];

const getKitTemperatureSensorTemplateKey = (device, controllerType) => {
    const type = canonicalType(device?.type);
    if (['ntc-sensor', 'mixing-ntc-sensor'].includes(type)) return 'wired-flask-ntc';
    if (controllerType === 'ecosmart' && [
        'flask-sensor-gvs-boiler',
        'flask-sensor-strategy',
    ].includes(type)) return 'wired-flask-ntc';
    // Датчик пола термостата — отдельная позиция каталога (короткая гильза,
    // провод 3 м, код 6304), а не обычный flask-sensor (код 6286): комплектный
    // датчик, идущий в комплекте с контроллером, физически непригоден для
    // установки в стяжку пола, поэтому у него свой templateKey и он никогда
    // не должен закрываться квотой комплектных датчиков.
    if (['flask-sensor-floor', 'floor-sensor'].includes(type)) return 'wired-flask-floor';
    if ([
        'flask-sensor-temperature',
        'flask-sensor-gvs-boiler',
        'flask-sensor-strategy',
        'flask-sensor-mixing-unit',
        'flask-sensor-stupid-boiler',
    ].includes(type)) return 'wired-flask-digital';
    if (type === 'wall-digital-sensor' && (controllerType === 'pro' || controllerType === 'smart2' || controllerType === 'go')) return 'wired-wall-digital';
    if (controllerType === 'go+' && type === 'wall-temperature-sensor') return 'wireless-wall';
    return null;
};

const getKitTemperatureSensorLabel = (device) => {
    const type = canonicalType(device?.type);
    if (type === 'flask-sensor-floor' || type === 'floor-sensor') return 'Датчик пола (в колбе, 3 м)';
    if (type === 'mixing-ntc-sensor') return 'NTC-датчик температуры';
    if (type === 'flask-sensor-gvs-boiler') return 'Датчик бойлера';
    if (type === 'flask-sensor-strategy') return 'Датчик стратегии котлов';
    if (type === 'flask-sensor-mixing-unit') return 'Датчик смесительного узла';
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
        pump: '220',
        description: 'Простое подключение и надежная работа делают его оптимальным решением для большинства стандартных систем.',
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
        pump: '010',
        description: 'Подходит для автоматизированных систем, где требуется точное поддержание заданных параметров и повышение энергоэффективности.',
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

/** Тип управления насосом: значения совпадают с ключом `pump` в PUMP_TEMPLATES. */
const PUMP_TYPE_OPTIONS = [
    { value: '220', label: '220V' },
    { value: '010', label: '0-10V' },
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
        servo: '220',
        sensor: 'digital',
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
        servo: '220',
        sensor: 'ntc',
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
        servo: '010',
        sensor: 'ntc',
        description: 'Предназначен для плавного управления механизмом по аналоговому сигналу 0–10 В.',
        wiredDevice: {
            id: 13,
            device_type: 'equipment',
            type: '010servo',
            connection_type: 'di',
            additions: [
                { id: 1, device_type: 'sensor', type: 'mixing-ntc-sensor', connection_type: 'ntc' },
            ],
        },
        sensors: [],
    },
];

// Смесительный узел собирается из двух независимых выборов; комбинация
// «0-10V + цифровой датчик» в MIXING_TEMPLATES отсутствует и в интерфейсе
// блокируется — по аналоговому входу цифровой датчик не подключить.
const MIXING_SERVO_OPTIONS = [
    { value: '220', label: '220V' },
    { value: '010', label: '0-10V' },
];

const MIXING_SENSOR_OPTIONS = [
    { value: 'digital', label: 'Цифровой' },
    { value: 'ntc', label: 'NTC' },
];

const findMixingTemplate = (servo, sensor) => MIXING_TEMPLATES
    .find((template) => template.servo === servo && template.sensor === sensor) || null;

const isMixingCombinationAvailable = (servo, sensor) => findMixingTemplate(servo, sensor) !== null;

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
    <p className="sel-subtitle">{children}</p>
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

const AddedDeviceLine = ({ label, count = 1, onRemove, badge = null, badgeAbove = false, price = null, disabled = false, control = null, hideCount = false, removeFirst = false }) => {
    const removeButton = onRemove ? (
        <button
            onClick={onRemove}
            style={{ border: 'none', background: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}
            title="Удалить"
        >
            ×
        </button>
    ) : null;

    return (
    <div
        className="sel-added-line"
        style={{
            // По нижнему краю, а не по базовой линии: у названия из двух строк
            // базовая линия — первая строка, и счётчик вставал напротив неё,
            // отрываясь от низа строки списка.
            alignItems: 'flex-end',
            color: disabled ? '#94a3b8' : '#203040',
            opacity: disabled ? 0.7 : 1,
        }}
    >
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
            <span className="sel-added-label" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3 }}>
                {badge && (
                    <span
                        style={{
                            minHeight: 14,
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
            </span>
        ) : <span className="sel-added-label">{label}</span>}
        <span className="sel-added-leader" style={{ flex: 1, borderBottom: '1px dotted #6b7f95', transform: badgeAbove ? 'none' : 'translateY(-3px)' }} />
        {removeFirst && removeButton}
        {control}
        {!hideCount && <span style={{ whiteSpace: 'nowrap' }}>{count} шт</span>}
        {price != null && (
            <span style={{ whiteSpace: 'nowrap', fontWeight: 700, minWidth: 64, textAlign: 'right' }}>
                {price.toLocaleString('ru-RU')} ₽
            </span>
        )}
        {!removeFirst && removeButton}
    </div>
    );
};

const AddedDevicesTitle = ({ children }) => (
    <h3 className="sel-added-title">{children}</h3>
);

/**
 * Фоновый слой карточки: фото прижато к правому краю, альфа-маска проявляет
 * его слева направо от 0 до 100%, сверху матовый blur. Контент карточки должен
 * быть позиционированным, чтобы рисоваться поверх.
 *
 * Два режима размера:
 * - с `aspectRatio` слой повторяет пропорции снимка и занимает правую часть
 *   карточки; `cover` тут точен, потому что слой и так в пропорциях снимка.
 *   Ширина считается от высоты, поэтому режим только для карточек постоянной
 *   высоты.
 * - без `aspectRatio` снимок масштабируется строго по ширине слоя
 *   (`100% auto`): по ширине карточки, если `width` не задан, иначе по самому
 *   `width`. Это ключевой момент: `cover` пересчитывал бы масштаб, как только
 *   слой станет выше кадра, и фон дергался бы при каждом добавлении строки.
 *   С привязкой по ширине рост карточки просто открывает кадр ниже.
 *
 * `fallbackColor` подкладывается под снимок: если карточка выросла выше, чем
 * хватает высоты кадра, снизу продолжается этот цвет, а не белый край.
 * `position` перебивает привязку фона (по умолчанию — правый верхний угол).
 */
const CardPhotoBackdrop = ({ image, aspectRatio = null, width = null, blur = 5, position = null, fallbackColor = null }) => (
    <>
        <div
            aria-hidden
            className="sel-card-photo"
            style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                right: 0,
                // `width` задаёт ширину слоя явно, поэтому снимок не зависит от
                // высоты карточки: когда она растёт, кадр не масштабируется, а
                // просто открывается ниже. `aspectRatio` наоборот считает ширину
                // от высоты и при изменении контента заставляет фон прыгать.
                ...(width ? { width, maxWidth: '100%' } : {}),
                ...(aspectRatio ? { aspectRatio, maxWidth: '100%' } : (width ? {} : { left: 0 })),
                // Слои скругляются сами, чтобы карточке не требовался
                // `overflow: hidden` — иначе он обрезал бы выпадашки.
                borderRadius: 'inherit',
                backgroundColor: fallbackColor || undefined,
                backgroundImage: `url(${image})`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: position || (aspectRatio ? 'center right' : 'right top'),
                backgroundSize: aspectRatio ? 'cover' : '100% auto',
                maskImage: 'linear-gradient(to right, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 100%)',
                WebkitMaskImage: 'linear-gradient(to right, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 100%)',
                pointerEvents: 'none',
            }}
        />
        <div
            aria-hidden
            style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 'inherit',
                backdropFilter: `blur(${blur}px)`,
                WebkitBackdropFilter: `blur(${blur}px)`,
                pointerEvents: 'none',
            }}
        />
    </>
);

/** Тумблер: скрытый checkbox плюс дорожка с бегунком. */
/**
 * Сегментированный переключатель: взаимоисключающие варианты в одной капсуле.
 * Недоступные комбинации гасятся через `disabled` у варианта.
 */
const SegmentedToggle = ({ options, value, onChange, testIdPrefix = null }) => (
    <div
        style={{
            display: 'inline-flex',
            gap: 3,
            padding: 3,
            border: '1px solid #e3e7ef',
            borderRadius: 12,
            background: '#f4f6fa',
        }}
    >
        {options.map((item) => {
            const isActive = value === item.value;
            return (
                <button
                    className="selection-option-button"
                    key={item.value}
                    type="button"
                    disabled={item.disabled === true}
                    data-test-id={testIdPrefix ? `${testIdPrefix}-${item.value}` : undefined}
                    data-active={isActive}
                    onClick={() => !item.disabled && onChange(item.value)}
                    style={{
                        padding: '9px 18px',
                        border: `1px solid ${isActive ? '#e3e7ef' : 'transparent'}`,
                        borderRadius: 9,
                        background: isActive ? '#fff' : 'transparent',
                        color: item.disabled ? '#a3aab9' : (isActive ? '#202738' : '#667089'),
                        boxShadow: isActive ? '0 1px 3px rgba(32, 39, 56, 0.12)' : 'none',
                        cursor: item.disabled ? 'not-allowed' : 'pointer',
                        fontSize: 13.5,
                        fontWeight: isActive ? 700 : 500,
                        transition: 'background 0.18s, color 0.18s, box-shadow 0.18s',
                    }}
                >
                    {item.label}
                </button>
            );
        })}
    </div>
);

const ToggleSwitch = ({ checked, onChange, label, testId = null }) => (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
        <input
            type="checkbox"
            role="switch"
            data-test-id={testId || undefined}
            checked={checked}
            onChange={(event) => onChange(event.target.checked)}
            style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
        />
        <span
            style={{
                position: 'relative',
                flex: '0 0 auto',
                width: 40,
                height: 22,
                borderRadius: 999,
                background: checked ? '#e07020' : '#cbd5e1',
                transition: 'background 0.18s ease',
            }}
        >
            <span
                style={{
                    position: 'absolute',
                    top: 3,
                    left: 3,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: '#fff',
                    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.22)',
                    transform: checked ? 'translateX(18px)' : 'none',
                    transition: 'transform 0.18s ease',
                }}
            />
        </span>
        {label}
    </label>
);

/** Подпись группы настроек внутри карточки термостата. */
const ThermostatFieldLabel = ({ children }) => (
    <div className="sel-field-label">{children}</div>
);

/** Карточка термостата: callbacks меняют тип подключения, цвет, датчик пола и добавляют устройство. */
const ThermostatCard = ({ template, connection, onConnectionChange, color, onColorChange, hasFloorSensor, onFloorSensorChange, onAdd, showAdd = true, addedRows = [], onRemoveRow, onAddRow, showJsonDetails = false }) => (
    <div
        className="sel-card sel-card-static sel-card-section sel-thermostat-card"
        style={{
            flex: '1 1 100%',
            width: '100%',
            minWidth: 260,
            display: 'flex',
            // Заголовок и список добавленного идут во всю ширину карточки,
            // а настройки и рендер стоят рядом во вложенном ряду.
            flexDirection: 'column',
            gap: 20,
            position: 'relative',
            overflow: 'hidden',
        }}
    >
        {/* Кадр занимает правую половину карточки и масштабируется только по её
            ширине: с `aspectRatio` ширина слоя считалась от высоты, и каждая
            добавленная строка списка увеличивала снимок. */}
        <CardPhotoBackdrop
            image={THERMOSTAT_ROOM_IMAGE_PATH}
            width="48%"
            fallbackColor={CARD_PHOTO_TAIL_COLOR.thermostatRoom}
        />

        {/* Содержимое карточки лежит одним позиционированным слоем: слой
            размытия у `CardPhotoBackdrop` спозиционирован и растянут на всю
            карточку, поэтому непозиционированные соседи красятся под ним и
            уходят в размытие. Раньше `position: relative` стоял на колонке
            настроек; теперь рядом с ней есть заголовок и список, и слой общий
            на всех. */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="sel-card-heading">{template.label}</div>

        {addedRows.length > 0 && (
            <AddedDevicesBlock marginTop={0} compact>
                <AddedDevicesTitle>Добавленные термостаты:</AddedDevicesTitle>
                {addedRows.map((row) => (
                    <AddedDeviceLine
                        key={row.label}
                        label={row.label}
                        count={row.count}
                        hideCount
                        removeFirst
                        onRemove={() => onRemoveRow(row)}
                        control={(
                            <QtyStepper
                                count={row.count}
                                onDecrement={() => onRemoveRow(row)}
                                onIncrement={() => onAddRow(row)}
                                decTestId={`thermostat-${String(row.templateKey || '').replace(/\|/g, '-')}-qty-dec`}
                                incTestId={`thermostat-${String(row.templateKey || '').replace(/\|/g, '-')}-qty-inc`}
                            />
                        )}
                    />
                ))}
            </AddedDevicesBlock>
        )}

        <div
            className="sel-thermostat-row"
            style={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 32,
                alignItems: 'stretch',
                // Действует только на перенесённой строке: пока рендер стоит
                // справа, свободного места нет — его разбирает flex-grow колонок.
                justifyContent: 'center',
            }}
        >
        <div
            className="sel-thermostat-settings"
            style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 20,
                // Базис задан по фактическому минимуму колонки, а не по
                // комфортной ширине: на flex-basis считается перенос строки, и
                // прежние 420px роняли рендер вниз уже на 1300px экрана, хотя
                // места хватало. Ширину сверх минимума добирает flex-grow.
                // Пол колонки задан содержимым: у карточки `overflow: hidden`,
                // и фиксированное число обрезало бы капсулу типа подключения на
                // узкой колонке. С `min-content` колонка вместо обрезки роняет
                // рендер вниз, а на коротком содержимом дольше держит его справа.
                flex: '1.5 1 310px',
                minWidth: 'min-content',
                maxWidth: 540,
            }}
        >
            {/* Тип подключения и датчик пола — в одном ряду; выравнивание по
                нижнему краю, чтобы капсула и чекбокс стояли на одной линии. */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
            <div>
                <ThermostatFieldLabel>Тип подключения</ThermostatFieldLabel>
                {/* Сегментированный переключатель: два взаимоисключающих варианта в одной капсуле. */}
                <div
                    style={{
                        display: 'inline-flex',
                        gap: 3,
                        padding: 3,
                        border: '1px solid #e3e7ef',
                        borderRadius: 12,
                        background: '#f4f6fa',
                    }}
                >
                    {THERMOSTAT_CONNECTIONS.map((item) => {
                        const isActive = connection === item.value;
                        return (
                            <button
                                className="selection-option-button"
                                key={item.value}
                                type="button"
                                data-test-id={`thermostat-connection-${item.value}`}
                                data-active={isActive}
                                onClick={() => onConnectionChange(item.value)}
                                style={{
                                    padding: '9px 18px',
                                    border: `1px solid ${isActive ? '#e3e7ef' : 'transparent'}`,
                                    borderRadius: 9,
                                    background: isActive ? '#fff' : 'transparent',
                                    color: isActive ? '#202738' : '#667089',
                                    boxShadow: isActive ? '0 1px 3px rgba(32, 39, 56, 0.12)' : 'none',
                                    cursor: 'pointer',
                                    fontSize: 13.5,
                                    fontWeight: isActive ? 700 : 500,
                                    transition: 'background 0.18s, color 0.18s, box-shadow 0.18s',
                                }}
                            >
                                {item.label}
                            </button>
                        );
                    })}
                </div>
            </div>

                <label
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '12px 16px',
                        border: `1px solid ${hasFloorSensor ? '#f2cba6' : '#e3e7ef'}`,
                        borderRadius: 12,
                        background: hasFloorSensor ? '#fff8f2' : '#fff',
                        cursor: 'pointer',
                        fontSize: 14,
                        transition: 'background 0.18s, border-color 0.18s',
                    }}
                >
                    <input
                        type="checkbox"
                        checked={hasFloorSensor}
                        onChange={(event) => onFloorSensorChange(event.target.checked)}
                        style={{ width: 16, height: 16, margin: 0, accentColor: '#e07020', cursor: 'pointer' }}
                    />
                    Добавить датчик пола
                </label>
            </div>

            <div>
                <ThermostatFieldLabel>
                    Цвет
                    <span style={{ fontWeight: 500, letterSpacing: 0, textTransform: 'none', fontSize: 12.5, color: '#667089' }}>
                        {THERMOSTAT_COLORS.find((item) => item.value === color)?.label}
                    </span>
                </ThermostatFieldLabel>
                {/* Кружки-образцы: название выбранного цвета выведено в подписи группы. */}
                <div className="sel-thermostat-color-options" style={{ display: 'flex', gap: 10 }}>
                    {THERMOSTAT_COLORS.map((item) => {
                        const isActive = color === item.value;
                        return (
                            <button
                                className="selection-option-button sel-thermostat-color-button"
                                key={item.value}
                                type="button"
                                title={item.label}
                                aria-label={item.label}
                                aria-pressed={isActive}
                                onClick={() => onColorChange(item.value)}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 36,
                                    height: 36,
                                    padding: 0,
                                    borderRadius: '50%',
                                    border: `2px solid ${isActive ? '#e07020' : '#e3e7ef'}`,
                                    background: '#fff',
                                    cursor: 'pointer',
                                    boxShadow: isActive ? '0 0 0 3px rgba(224, 112, 32, 0.16)' : 'none',
                                    transition: 'border-color 0.18s, box-shadow 0.18s',
                                }}
                            >
                                <span
                                    style={{
                                        width: 22,
                                        height: 22,
                                        borderRadius: '50%',
                                        border: '1px solid rgba(32, 39, 56, 0.16)',
                                        background: THERMOSTAT_SWATCH_FILL[item.value],
                                    }}
                                />
                            </button>
                        );
                    })}
                </div>
            </div>

            {showJsonDetails && (
                <pre className="sel-card-json">{JSON.stringify(template.data, null, 4)}</pre>
            )}

            {/* Как в карточке бойлера ГВС: уже добавленная конфигурация меняет
                количество счетчиком в списке, кнопка добавления для нее не нужна.
                Переключение цвета, типа подключения или датчика пола на еще не
                добавленный вариант возвращает кнопку. */}
            {showAdd && (
                <button
                    className="selection-add-button"
                    onClick={onAdd}
                    data-test-id="add-thermostat"
                >
                    {`Добавить ${template.label.charAt(0).toLowerCase()}${template.label.slice(1)}`}
                </button>
            )}
        </div>

        {/* Изображение термостата: вместо плашки-фона под устройством мягкое
            свечение и тень, все цвета лежат стопкой и переключаются
            прозрачностью — кроссфейд без подгрузки картинки в момент клика. */}
        <div
            className="sel-thermostat-visual"
            style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                // Рендер держится справа, пока позволяет ширина, поэтому базис и
                // минимум взяты по нижней границе читаемого размера картинки:
                // сжиматься для него приоритетнее, чем уезжать под настройки.
                flex: '1 1 170px',
                minWidth: 170,
                // Потолок ниже ширины карточки: он не срабатывает, пока колонка
                // стоит справа (там она не шире 332px), и ограничивает рендер
                // на перенесённой строке - иначе колонка растягивалась во всю
                // карточку и картинка висела в пустой полосе.
                maxWidth: 380,
                minHeight: 200,
            }}
        >
            <div
                aria-hidden
                style={{
                    position: 'absolute',
                    width: '86%',
                    maxWidth: 330,
                    aspectRatio: '1 / 1',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(224, 112, 32, 0.10) 0%, rgba(224, 112, 32, 0) 68%)',
                }}
            />
            <div
                aria-hidden
                style={{
                    position: 'absolute',
                    bottom: '11%',
                    width: '44%',
                    maxWidth: 175,
                    height: 16,
                    borderRadius: '50%',
                    background: 'radial-gradient(ellipse, rgba(32, 39, 56, 0.20) 0%, rgba(32, 39, 56, 0) 72%)',
                }}
            />
            <div style={{ position: 'relative', width: '100%', maxWidth: 255, aspectRatio: '1 / 1' }}>
                {THERMOSTAT_COLORS.map((item) => (
                    <img
                        key={item.value}
                        src={thermostatImagePaths[item.value]}
                        alt={item.value === color ? template.label : ''}
                        aria-hidden={item.value !== color}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            opacity: item.value === color ? 1 : 0,
                            transition: 'opacity 260ms ease',
                        }}
                    />
                ))}
            </div>
        </div>
        </div>
        </div>
    </div>
);

/**
 * Карточка уличного радиодатчика. Датчик в схеме может быть только один,
 * поэтому вместо кнопки «Добавить» и счетчика здесь тумблер: включен —
 * датчик есть, выключен — его нет.
 */
const OutdoorSensorCard = ({ template, enabled, onEnabledChange, showJsonDetails = false }) => (
    <div
        className="sel-card sel-card-static sel-card-section"
        style={{
            flex: '1 1 100%',
            width: '100%',
            minWidth: 260,
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 32,
            alignItems: 'stretch',
            position: 'relative',
            overflow: 'hidden',
        }}
    >
        <CardPhotoBackdrop
            image={OUTDOOR_SENSOR_BACKGROUND_PATH}
            width="48%"
            fallbackColor={CARD_PHOTO_TAIL_COLOR.thermostatRoom}
        />

        <div
            style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 20,
                flex: '1 1 340px',
                minWidth: 260,
                maxWidth: 480,
            }}
        >
            <div className="sel-card-heading">{template.label}</div>

            <p className="sel-card-desc">
                Измеряет уличную температуру и передает ее по радиоканалу.
                В схеме используется только один такой датчик.
            </p>

            <div
                style={{
                    alignSelf: 'flex-start',
                    padding: '12px 16px',
                    border: `1px solid ${enabled ? '#f2cba6' : '#e3e7ef'}`,
                    borderRadius: 12,
                    background: enabled ? '#fff8f2' : '#fff',
                    transition: 'background 0.18s, border-color 0.18s',
                }}
                data-test-id="outdoor-sensor-toggle"
                data-active={enabled}
            >
                <ToggleSwitch
                    checked={enabled}
                    onChange={onEnabledChange}
                    label="Уличный датчик в схеме"
                />
            </div>

            {showJsonDetails && (
                <pre className="sel-card-json">{JSON.stringify(template.data, null, 4)}</pre>
            )}
        </div>

        {/* Изображение датчика — как в карточке термостата: мягкое свечение и
            тень под устройством вместо плашки-фона. */}
        <div
            style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: '1 1 280px',
                minWidth: 220,
            }}
        >
            <div
                aria-hidden
                style={{
                    position: 'absolute',
                    width: '78%',
                    height: '86%',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(224, 112, 32, 0.10) 0%, rgba(224, 112, 32, 0) 68%)',
                }}
            />
            <div
                aria-hidden
                style={{
                    position: 'absolute',
                    bottom: '4%',
                    width: '46%',
                    maxWidth: 180,
                    height: 14,
                    borderRadius: '50%',
                    background: 'radial-gradient(ellipse, rgba(32, 39, 56, 0.20) 0%, rgba(32, 39, 56, 0) 72%)',
                }}
            />
            <img
                src={OUTDOOR_SENSOR_IMAGE_PATH}
                alt={template.label}
                style={{ position: 'relative', width: '100%', maxWidth: 260, maxHeight: 170, objectFit: 'contain' }}
            />
        </div>
    </div>
);

/**
 * Общий каркас карточки-раздела: фото на фоне, заголовок с описанием, список
 * уже добавленного оборудования со счетчиками и кнопка добавления. Настройки,
 * специфичные для раздела (переключатели и т.п.), передаются через children и
 * встают между списком и кнопкой.
 */
const SectionEquipmentCard = ({
    image = null,
    backgroundColor = null,
    backgroundPosition = null,
    aspectRatio = null,
    blur = 3,
    // Снимок устройства в правой части: рисуется поверх размытого фона и сам не размывается.
    deviceImage = null,
    deviceImageAlt = '',
    // Ширина фонового слоя: фиксирует кадр независимо от высоты карточки.
    backgroundWidth = null,
    // Половинная ширина: две карточки в ряду (дискретные входы).
    half = false,
    // Фиксированная высота карточки: держит фон-снимок неподвижным, когда
    // содержимое карточки меняется. Ставит класс `sel-card-fixed-height` —
    // на телефоне высота возвращается к содержимому (см. app.css).
    minHeight = null,
    title,
    description = null,
    addedTitle,
    addedRows = [],
    // Список добавленного во всю ширину карточки, а не внутри текстовой колонки:
    // строке со счетчиком тесно в узкой колонке половинной карточки.
    addedFullWidth = false,
    // Плотная верстка списка: мельче заголовок, строка и счетчик, меньше
    // отступов — блок ниже, а вместе с ним и карточка.
    addedDense = false,
    onAddUnit,
    onRemoveUnit,
    addLabel,
    onAdd,
    showAdd = true,
    addTestId = null,
    // Строка или функция от строки списка: у карточки с несколькими вариантами
    // оборудования счетчики должны различаться (насос 220V и насос 0-10V).
    qtyTestId = null,
    jsonData = null,
    showJsonDetails = false,
    children = null,
}) => {
    const addedBlock = addedRows.length > 0 ? (
        <AddedDevicesBlock marginTop={0} dense={addedDense}>
            <AddedDevicesTitle>{addedTitle}</AddedDevicesTitle>
            {addedRows.map((row) => {
                const rowQtyTestId = typeof qtyTestId === 'function' ? qtyTestId(row) : qtyTestId;
                return (
                    <AddedDeviceLine
                        key={row.label}
                        label={row.label}
                        hideCount
                        control={(
                            <QtyStepper
                                count={row.count}
                                dense={addedDense}
                                onDecrement={() => onRemoveUnit(row)}
                                onIncrement={() => onAddUnit(row)}
                                decTestId={rowQtyTestId ? `${rowQtyTestId}-dec` : null}
                                incTestId={rowQtyTestId ? `${rowQtyTestId}-inc` : null}
                            />
                        )}
                    />
                );
            })}
        </AddedDevicesBlock>
    ) : null;

    const addButton = showAdd ? (
        <button
            className="selection-add-button"
            onClick={onAdd}
            data-test-id={addTestId || undefined}
        >
            {addLabel}
        </button>
    ) : null;

    // Во всю ширину список выносится из текстовой колонки отдельной строкой
    // карточки. Непрозрачный фон блока сам перекрывает снимок справа.
    const wideAddedBlock = addedFullWidth && addedBlock;

    return (
    <div
        className={`sel-card sel-card-static sel-card-section${deviceImage ? ' sel-card-with-device' : ''}${minHeight ? ' sel-card-fixed-height' : ''}`}
        style={{
            flex: half ? '1 1 calc(50% - 8px)' : '1 1 100%',
            width: half ? 'auto' : '100%',
            minWidth: half ? 320 : 260,
            ...(minHeight ? { minHeight } : {}),
            display: 'flex',
            flexDirection: 'row',
            // Со снимком устройства колонки не переносим: перенос менял бы высоту
            // карточки при добавлении, и фон со снимком прыгали бы.
            flexWrap: deviceImage ? 'nowrap' : 'wrap',
            columnGap: 32,
            // Перенесённый на свою строку список отбивается от текста так же,
            // как отбивались бы соседние элементы внутри колонки.
            rowGap: wideAddedBlock ? (half ? 14 : 20) : 32,
            alignItems: 'stretch',
            position: 'relative',
        }}
    >
        {image && (
            <CardPhotoBackdrop
                image={image}
                blur={blur}
                aspectRatio={aspectRatio}
                width={backgroundWidth}
                position={backgroundPosition}
                fallbackColor={backgroundColor}
            />
        )}

        <div
            style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: half ? 14 : 20,
                flex: half ? '1 1 240px' : '1 1 420px',
                minWidth: half ? 200 : 260,
                // В половинной карточке текст короче: иначе строки уезжают на
                // непрозрачную часть снимка.
                maxWidth: half ? 300 : 560,
            }}
        >
            <div className="sel-card-heading">{title}</div>

            {description && (
                <p className="sel-card-desc">{description}</p>
            )}

            {!addedFullWidth && addedBlock}

            {children}

            {showJsonDetails && (
                <pre className="sel-card-json">{JSON.stringify(jsonData, null, 4)}</pre>
            )}

            {addButton}
        </div>

        {wideAddedBlock && (
            <div style={{ position: 'relative', flex: '1 1 100%', width: '100%', minWidth: 0 }}>
                {addedBlock}
            </div>
        )}

        {deviceImage && (
            /* Тот же приём, что в карточке уличного датчика: мягкое свечение и
               тень под устройством, снимок лежит поверх размытой подложки. */
            <div
                style={{
                    position: 'relative',
                    display: 'flex',
                    // Колонка прижата к верху и не тянется по высоте карточки:
                    // иначе при появлении списка добавленного снимок съезжал бы вниз.
                    alignSelf: 'flex-start',
                    alignItems: 'center',
                    justifyContent: 'center',
                    // Колонка со снимком уступает ширину тексту первой.
                    flex: '0 1 300px',
                    minWidth: 160,
                }}
            >
                <div
                    aria-hidden
                    style={{
                        position: 'absolute',
                        width: '78%',
                        height: '86%',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(224, 112, 32, 0.10) 0%, rgba(224, 112, 32, 0) 68%)',
                    }}
                />
                <div
                    aria-hidden
                    style={{
                        position: 'absolute',
                        bottom: '4%',
                        width: '46%',
                        maxWidth: 180,
                        height: 14,
                        borderRadius: '50%',
                        background: 'radial-gradient(ellipse, rgba(32, 39, 56, 0.20) 0%, rgba(32, 39, 56, 0) 72%)',
                    }}
                />
                <img
                    src={deviceImage}
                    alt={deviceImageAlt}
                    style={{ position: 'relative', width: '100%', maxWidth: 300, maxHeight: 165, objectFit: 'contain' }}
                />
            </div>
        )}
    </div>
    );
};

/**
 * Сегментированный переключатель варианта оборудования внутри карточки:
 * подпись сверху, кнопки в одной обойме. Недоступный вариант не убирается из
 * ряда, а гасится — так видно весь набор возможностей.
 */
const SegmentedField = ({
    label,
    options,
    value,
    onChange,
    testIdPrefix,
    isAvailable = () => true,
    unavailableTitle = null,
}) => (
    <div>
        <ThermostatFieldLabel>{label}</ThermostatFieldLabel>
        <div
            style={{
                display: 'inline-flex',
                gap: 3,
                padding: 3,
                border: '1px solid #e3e7ef',
                borderRadius: 12,
                background: '#f4f6fa',
            }}
        >
            {options.map((item) => {
                const isActive = value === item.value;
                const available = isAvailable(item.value);
                return (
                    <button
                        className="selection-option-button"
                        key={item.value}
                        type="button"
                        data-test-id={`${testIdPrefix}-${item.value}`}
                        data-active={isActive}
                        disabled={!available}
                        title={available ? undefined : unavailableTitle || undefined}
                        onClick={() => available && onChange(item.value)}
                        style={{
                            padding: '9px 18px',
                            border: `1px solid ${isActive ? '#e3e7ef' : 'transparent'}`,
                            borderRadius: 9,
                            background: isActive ? '#fff' : 'transparent',
                            color: available ? (isActive ? '#202738' : '#667089') : '#b3bac8',
                            boxShadow: isActive ? '0 1px 3px rgba(32, 39, 56, 0.12)' : 'none',
                            cursor: available ? 'pointer' : 'not-allowed',
                            fontSize: 13.5,
                            fontWeight: isActive ? 700 : 500,
                            transition: 'background 0.18s, color 0.18s, box-shadow 0.18s',
                        }}
                    >
                        {item.label}
                    </button>
                );
            })}
        </div>
    </div>
);

/**
 * Карточка смесительного узла: сервопривод и датчик выбираются независимо,
 * из пары получается шаблон MIXING_TEMPLATES. Комбинации «0-10V + цифровой
 * датчик» не существует, поэтому такой вариант датчика гасится.
 */
const MixingUnitCard = ({ template, servo, onServoChange, sensor, onSensorChange, onAdd, addedRows = [], onAddUnit, onRemoveUnit, showJsonDetails = false }) => (
    <SectionEquipmentCard
        image={MIXING_UNIT_BACKGROUND_PATH}
        backgroundColor="#474847"
        title={template.label}
        description={template.description}
        addedTitle="Добавленные смесительные узлы:"
        addedRows={addedRows}
        onAddUnit={onAddUnit}
        onRemoveUnit={onRemoveUnit}
        addLabel={`Добавить ${template.label.charAt(0).toLowerCase()}${template.label.slice(1)}`}
        onAdd={onAdd}
        // Как только этот вариант узла попал в список, количеством управляет
        // счетчик в строке — большая кнопка становится лишней и прячется.
        showAdd={!addedRows.some((row) => row.label === template.label)}
        jsonData={{ wired_device: template.wiredDevice, sensors: template.sensors }}
        showJsonDetails={showJsonDetails}
    >
        {/* Оба переключателя в одном ряду; на узкой карточке переносятся. */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
            <SegmentedField
                label="Сервопривод"
                options={MIXING_SERVO_OPTIONS}
                value={servo}
                onChange={onServoChange}
                testIdPrefix="mixing-servo"
            />
            <SegmentedField
                label="Датчик"
                options={MIXING_SENSOR_OPTIONS}
                value={sensor}
                onChange={onSensorChange}
                testIdPrefix="mixing-sensor"
                isAvailable={(option) => isMixingCombinationAvailable(servo, option)}
                unavailableTitle="Цифровой датчик не подключается к сервоприводу 0-10V"
            />
        </div>
    </SectionEquipmentCard>
);

/**
 * Карточка насоса: тип управления выбирается переключателем, как сервопривод в
 * смесительном узле. В списке добавленного 220V и 0-10V остаются отдельными
 * строками со своими счетчиками.
 */
const PumpCard = ({ template, pumpType, onPumpTypeChange, onAdd, addedRows = [], onAddUnit, onRemoveUnit, showJsonDetails = false }) => (
    <SectionEquipmentCard
        image={PUMP_BACKGROUND_PATH}
        backgroundColor={CARD_PHOTO_TAIL_COLOR.pumpRoom}
        // Кадр приподнят: при верхней привязке в карточку попадали потолок и
        // пустая стена, а сама насосная группа оставалась за нижней границей.
        backgroundPosition="right -150px"
        title={template.label}
        description={template.description}
        addedTitle="Добавленные насосы:"
        addedRows={addedRows}
        onAddUnit={onAddUnit}
        onRemoveUnit={onRemoveUnit}
        addLabel={`Добавить ${template.label.charAt(0).toLowerCase()}${template.label.slice(1)}`}
        onAdd={onAdd}
        // Выбранный тип уже в списке — количеством управляет счетчик строки.
        showAdd={!addedRows.some((row) => row.label === template.label)}
        addTestId="add-pump"
        qtyTestId={(row) => `pump-${PUMP_TEMPLATES.find((item) => item.label === row.label)?.pump}-qty`}
        jsonData={{ wired_device: template.wiredDevice }}
        showJsonDetails={showJsonDetails}
    >
        <SegmentedField
            label="Управление"
            options={PUMP_TYPE_OPTIONS}
            value={pumpType}
            onChange={onPumpTypeChange}
            testIdPrefix="pump-type"
        />
    </SectionEquipmentCard>
);

/** Карточка датчика: options задает варианты, selectedKey выбор, stepper счетчик. */
const AddedDevicesBlock = ({ children, marginTop = 24, compact = false, dense = false }) => (
    <div
        className={`sel-added-block${compact ? ' sel-added-block-compact' : ''}${dense ? ' sel-added-block-dense' : ''}`}
        style={{ marginTop }}
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

// Уменьшенный счетчик для плотных списков: та же геометрия, но мельче.
const QTY_STEPPER_DENSE_STYLE = {
    ...QTY_STEPPER_BLOCK_STYLE,
    width: 22,
    height: 22,
    borderRadius: 5,
    fontSize: 12,
};

const QtyStepper = ({ count, onDecrement, onIncrement, disabled = false, allowZero = false, dense = false, decTestId = null, incTestId = null }) => {
    if (!count && !allowZero) return null;
    const blockStyle = dense ? QTY_STEPPER_DENSE_STYLE : QTY_STEPPER_BLOCK_STYLE;
    const decrementDisabled = disabled || (allowZero && count <= 0);
    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: dense ? 3 : 4, flexShrink: 0 }}>
            <button
                type="button"
                title="Убрать одно"
                data-test-id={decTestId || undefined}
                onClick={onDecrement}
                disabled={decrementDisabled}
                style={{ ...blockStyle, cursor: decrementDisabled ? 'not-allowed' : 'pointer', color: decrementDisabled ? '#94a3b8' : '#e74c3c', opacity: decrementDisabled ? 0.6 : 1 }}
            >
                −
            </button>
            <span style={{ ...blockStyle, color: '#203040' }}>{count}</span>
            <button
                type="button"
                title="Добавить ещё"
                data-test-id={incTestId || undefined}
                onClick={onIncrement}
                disabled={disabled}
                style={{ ...blockStyle, cursor: disabled ? 'not-allowed' : 'pointer', color: disabled ? '#94a3b8' : '#2e7d32', opacity: disabled ? 0.6 : 1 }}
            >
                +
            </button>
        </div>
    );
};

const SEL_CHAPTERS = [
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

/**
 * Агрегирует одинаковые позиции интерфейса и собирает ключи для удаления.
 * @param {Array<object>} items Плоские позиции с label и removeKey.
 * @returns {Array<object>} Строки со счетчиком и removeKeys.
 */
const aggregateAddedItems = (items) => Array.from(items.reduce((rows, item) => {
    const row = rows.get(item.label) || {
        label: item.label,
        count: 0,
        removeKeys: [],
        templateKey: item.templateKey || null,
    };
    row.count += 1;
    row.removeKeys.push(item.removeKey);
    rows.set(item.label, row);
    return rows;
}, new Map()).values());

/**
 * Определяет подпись составной единицы оборудования по ее uid.
 * @param {number|string} uidVal Идентификатор группы.
 * @param {Array<object>} devices Устройства группы.
 * @param {Array<object>} sensors Датчики схемы.
 * @param {Array<object>} templates Шаблоны группы.
 * @returns {string} Отображаемая подпись.
 */
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

/**
 * Строит агрегированные строки устройств выбранной логической группы.
 * @param {object} scheme Текущая схема.
 * @param {string} group Имя группы.
 * @param {Array<object>} templates Шаблоны распознавания.
 * @returns {Array<object>} Строки для AddedDevicesBlock.
 */
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

/**
 * Разделяет комплектные и платные температурные датчики для отображения.
 * @param {object} scheme Текущая схема.
 * @param {string} controllerType Тип контроллера, определяющий комплект.
 * @returns {Array<object>} Агрегированные строки датчиков.
 */
const getTemperatureSensorRows = (scheme, controllerType) => {
    const isKitTemperatureSensor = (device) => getKitTemperatureSensorTemplateKey(device, controllerType) !== null;
    const wirelessTemperatureSensors = (Array.isArray(scheme?.wireless_devices) ? scheme.wireless_devices : [])
        .filter((device) => isTemperatureSensor(device) || isKitTemperatureSensor(device))
        .map((device) => ({ device, target: 'wireless_devices' }));
    const wiredTemperatureSensors = (Array.isArray(scheme?.sensors) ? scheme.sensors : [])
        .filter((device) => isTemperatureSensor(device) || isKitTemperatureSensor(device))
        .map((device) => ({ device, target: 'sensors' }));
    const embeddedTemperatureSensors = (Array.isArray(scheme?.wired_devices) ? scheme.wired_devices : [])
        .concat(Array.isArray(scheme?.wireless_devices) ? scheme.wireless_devices : [])
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
        templateKey: getKitTemperatureSensorTemplateKey(device, controllerType) || getTemperatureSensorTemplateKey(device),
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
            // Ключ конфигурации нужен счётчику: «+» добавляет точно такой же термостат.
            templateKey: [
                target === 'wireless_devices' ? 'wireless' : 'wired',
                device.color || 'black',
                hasFloorSensor ? 'floor' : 'no-floor',
            ].join('|'),
            removeKey: { target, id: device.id },
        };
    }));
};

const getLeakProtectionRows = (scheme) => {
    // Датчики живут внутри шлейфов зон, поэтому в КП они собираются из additions.
    const leakItems = [
        ...getLeakZones(scheme).flatMap((zone) => getLeakZoneSensors(zone)
            .map((sensor) => ({ label: 'Датчик протечки', removeKey: { target: 'sensors', id: sensor.id } }))),
        ...(Array.isArray(scheme?.wired_devices) ? scheme.wired_devices : [])
            .filter((device) => canonicalType(device?.type) === 'valve')
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

/**
 * Модули питания, для которых в панели контроллера есть отдельная плитка.
 * `circuit-breaker` и `power-unit` сюда не входят: они обязательны для smart2
 * и pro, поэтому не являются результатом подбора.
 */
const POWER_MODULE_TILE_LABELS = {
    ups: 'Источник бесперебойного питания (UPS)',
};

/**
 * Формирует строки плиток для модулей питания из `power_modules`. Отдельно от
 * `getExpansionModuleRows`, потому что в коммерческом предложении UPS уже
 * учтён собственным разделом «Питание» и не должен дублироваться.
 * @param {object} incomingSchemeValue Публичная схема.
 * @returns {Array<object>} Строки плиток модулей питания.
 */
const getPowerModuleTileRows = (incomingSchemeValue) => {
    const modules = Array.isArray(incomingSchemeValue?.power_modules) ? incomingSchemeValue.power_modules : [];
    return aggregateAddedItems(modules
        .map((moduleItem) => canonicalType(typeof moduleItem === 'string' ? moduleItem : moduleItem?.type))
        .filter((type) => POWER_MODULE_TILE_LABELS[type])
        .map((type) => ({ label: POWER_MODULE_TILE_LABELS[type], templateKey: type })));
};

/**
 * Формирует разделы коммерческого предложения из подобранной схемы.
 * @param {object} incomingSchemeValue Публичная схема.
 * @param {string} controllerType Тип контроллера для комплекта и цен.
 * @returns {Array<object>} Разделы КП.
 */
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
    const rinnaiAdapterCount = countRinnaiAdapters(boilers);
    if (rinnaiAdapterCount > 0) {
        sections.push({
            title: 'Переходники',
            rows: [{ key: 'rinnai-adapter', label: RINNAI_ADAPTER_LABEL, count: rinnaiAdapterCount, unitPrice: RINNAI_ADAPTER_PRICE }],
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
        'wired-flask-floor': 3690, // Датчик температуры в колбе MyHeat (3 метра), код 6304 — датчик пола для термостата
    },
    thermostat: 9490, // Комнатный термостат MyHeat
    pressureSensor: 5990, // Датчик давления 4-20мА
    leakSensor: null, // Датчик протечки пока не продается MyHeat.
    ups: 9990, // MyHeat UPS
    radioModuleActivation: 3000,
};

const RADIO_MODULE_ACTIVATION_LABEL = 'Активация радиомодуля';

const SelectionApp = () => {
    const [pendingDraft, setPendingDraft] = useState(readSelectionDraft);
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
    const [selectionMode, setSelectionMode] = useState('automatic');
    const [incomingScheme, setIncomingScheme] = useState(createInitialSelectionScheme);
    const [showJsonDetails, setShowJsonDetails] = useState(false);
    const [jsonToggleEnabled] = useState(isJsonToggleEnabled);
    const [thermostatConnection, setThermostatConnection] = useState('wired');
    const [wiredThermostatColor, setWiredThermostatColor] = useState('black');
    const [wiredThermostatHasFloorSensor, setWiredThermostatHasFloorSensor] = useState(false);
    const [wirelessThermostatColor, setWirelessThermostatColor] = useState('black');
    const [wirelessThermostatHasFloorSensor, setWirelessThermostatHasFloorSensor] = useState(false);
    const [mixingServo, setMixingServo] = useState('220');
    const [mixingSensor, setMixingSensor] = useState('digital');
    const [pumpType, setPumpType] = useState('220');
    const [wiredTemperatureSensorKey, setWiredTemperatureSensorKey] = useState('wired-wall-digital');
    const [wirelessTemperatureSensorKey, setWirelessTemperatureSensorKey] = useState('wireless-wall');
    const [temperatureSensorConnection, setTemperatureSensorConnection] = useState('wired');
    const [isBuildingScheme, setIsBuildingScheme] = useState(false);
    const [buildSchemeError, setBuildSchemeError] = useState('');
    const [boilerQuery, setBoilerQuery] = useState('');
    const [boilerResults, setBoilerResults] = useState([]);
    const [boilerSearchLoading, setBoilerSearchLoading] = useState(false);
    // Запрос, по которому поиск уже завершился. Нужен, чтобы «Котлы не найдены»
    // показывалось только для отработанного запроса, а не в паузе перед ним.
    const [boilerSearchedQuery, setBoilerSearchedQuery] = useState('');
    // Видимость выпадашки отделена от самих результатов: выбор котла закрывает
    // список, но найденное и текст запроса остаются. Новый поиск инициирует
    // только изменение строки поиска — возврат в поле ввода просто раскрывает
    // результаты последнего поиска заново, без запроса.
    const [boilerDropdownOpen, setBoilerDropdownOpen] = useState(false);
    const boilerSearchRef = useRef(null);
    const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
    const [upsRequested, setUpsRequested] = useState(false);
    const [requestedControllerType, setRequestedControllerType] = useState('go');
    const [controllerSelectionSource, setControllerSelectionSource] = useState('default');
    const upsRequestedRef = useRef(false);
    const upsRequestSourceRef = useRef(null);
    const controllerSelectionSourceRef = useRef('default');
    const controllerPanelRef = useRef(null);
    const previousControllerTypeRef = useRef(null);
    const startSelectionFromScratch = useCallback(() => {
        removeSelectionDraft();
        upsRequestSourceRef.current = null;
        upsRequestedRef.current = false;
        setUpsRequested(false);
        setRequestedControllerType('go');
        controllerSelectionSourceRef.current = 'default';
        setControllerSelectionSource('default');
        setIncomingScheme(createInitialSelectionScheme());
        setThermostatConnection('wired');
        setWiredThermostatColor('black');
        setWiredThermostatHasFloorSensor(false);
        setWirelessThermostatColor('black');
        setWirelessThermostatHasFloorSensor(false);
        setMixingServo('220');
        setMixingSensor('digital');
        setPumpType('220');
        setWiredTemperatureSensorKey('wired-wall-digital');
        setWirelessTemperatureSensorKey('wireless-wall');
        setBuildSchemeError('');
        setPendingDraft(null);
    }, []);
    const continueSelectionDraft = useCallback(() => {
        if (!pendingDraft) return;
        const requested = pendingDraft.upsRequested === true;
        const requestSource = pendingDraft.upsRequestSource === 'manual' || pendingDraft.upsRequestSource === 'go+'
            ? pendingDraft.upsRequestSource
            : null;
        const editor = pendingDraft.editor && typeof pendingDraft.editor === 'object' ? pendingDraft.editor : {};
        upsRequestSourceRef.current = requestSource;
        upsRequestedRef.current = requested;
        setUpsRequested(requested);
        setRequestedControllerType(pendingDraft.requestedControllerType || getControllerType(pendingDraft.incomingScheme));
        controllerSelectionSourceRef.current = pendingDraft.controllerSelectionSource === 'manual' ? 'manual' : 'default';
        setControllerSelectionSource(controllerSelectionSourceRef.current);
        setIncomingScheme(pendingDraft.incomingScheme);
        setThermostatConnection(editor.thermostatConnection === 'wireless' ? 'wireless' : 'wired');
        setWiredThermostatColor(editor.wiredThermostatColor || 'black');
        setWiredThermostatHasFloorSensor(editor.wiredThermostatHasFloorSensor === true);
        setWirelessThermostatColor(editor.wirelessThermostatColor || 'black');
        setWirelessThermostatHasFloorSensor(editor.wirelessThermostatHasFloorSensor === true);
        setMixingServo(editor.mixingServo === '010' ? '010' : '220');
        setMixingSensor(editor.mixingSensor === 'ntc' ? 'ntc' : 'digital');
        setWiredTemperatureSensorKey(editor.wiredTemperatureSensorKey || 'wired-wall-digital');
        setWirelessTemperatureSensorKey(editor.wirelessTemperatureSensorKey || 'wireless-wall');
        setTemperatureSensorConnection(editor.temperatureSensorConnection === 'wireless' ? 'wireless' : 'wired');
        setPendingDraft(null);
    }, [pendingDraft]);
    const resolveSelectionScheme = useCallback(
        (scheme, requested = upsRequestedRef.current) => resolveControllerAndRequiredModules(
            scheme,
            requested,
            controllerSelectionSourceRef.current === 'manual',
        ),
        [],
    );
    const controllerCompatibilityIssues = useMemo(
        () => getControllerCompatibilityIssues(incomingScheme, null, upsRequested),
        [incomingScheme, upsRequested],
    );
    const compatibleControllerOptions = useMemo(
        () => getCompatibleControllerOptions(incomingScheme, upsRequested),
        [incomingScheme, upsRequested],
    );
    const compatibleControllerTypes = useMemo(
        () => new Set(compatibleControllerOptions.map((item) => item.type)),
        [compatibleControllerOptions],
    );
    const controllerType = getControllerType(incomingScheme);
    // При уходе с автоматически выбранного GO+ снимает связанное с ним намерение UPS
    // и повторно согласует контроллер и обязательные модули.
    useEffect(() => {
        if (upsRequestSourceRef.current !== 'go+' || controllerType === 'go+') return;
        upsRequestSourceRef.current = null;
        upsRequestedRef.current = false;
        setUpsRequested(false);
        setIncomingScheme((prev) => resolveSelectionScheme(prev, false));
    }, [controllerType, resolveSelectionScheme]);
    /**
     * Подбор сменил контроллер — панель справа на мгновение приподнимается над
     * контентом. Класс снимается и ставится через рефлоу: иначе повторная смена
     * подряд не перезапустила бы ту же CSS-анимацию.
     */
    useEffect(() => {
        const panel = controllerPanelRef.current;
        // Первое значение — это загрузка страницы или черновика, а не смена.
        if (!panel || !previousControllerTypeRef.current) {
            previousControllerTypeRef.current = controllerType;
            return undefined;
        }
        if (previousControllerTypeRef.current === controllerType) return undefined;
        previousControllerTypeRef.current = controllerType;
        panel.classList.remove(CONTROLLER_CHANGE_CLASS);
        void panel.offsetWidth;
        panel.classList.add(CONTROLLER_CHANGE_CLASS);
        // Класс снимается по концу анимации, иначе приподнятая тень висела бы
        // дольше самого движения. Таймер — страховка на случай, когда анимации
        // нет вовсе (prefers-reduced-motion) и события не будет.
        const stop = () => {
            panel.removeEventListener('animationend', onAnimationEnd);
            clearTimeout(timer);
            panel.classList.remove(CONTROLLER_CHANGE_CLASS);
        };
        // Класс снимает только конец самого подъёма: в списке анимаций панели
        // есть и входная, а `animationend` вдобавок всплывает от потомков.
        const onAnimationEnd = (event) => {
            if (event.animationName === CONTROLLER_CHANGE_ANIMATION_NAME) stop();
        };
        const timer = setTimeout(stop, CONTROLLER_CHANGE_ANIMATION_MS + 200);
        panel.addEventListener('animationend', onAnimationEnd);
        return stop;
    }, [controllerType]);
    useEffect(() => {
        if (pendingDraft) return;
        if (!isSelectionDraftMeaningful(incomingScheme, upsRequested)) {
            removeSelectionDraft();
            return;
        }
        writeSelectionDraft({
            version: SELECTION_DRAFT_VERSION,
            savedAt: Date.now(),
            incomingScheme,
            upsRequested,
            upsRequestSource: upsRequestSourceRef.current,
            requestedControllerType,
            controllerSelectionSource,
            editor: {
                thermostatConnection,
                wiredThermostatColor,
                wiredThermostatHasFloorSensor,
                wirelessThermostatColor,
                wirelessThermostatHasFloorSensor,
                mixingServo,
                mixingSensor,
                wiredTemperatureSensorKey,
                wirelessTemperatureSensorKey,
                temperatureSensorConnection,
            },
        });
    }, [
        pendingDraft,
        incomingScheme,
        upsRequested,
        requestedControllerType,
        controllerSelectionSource,
        thermostatConnection,
        wiredThermostatColor,
        wiredThermostatHasFloorSensor,
        wirelessThermostatColor,
        wirelessThermostatHasFloorSensor,
        mixingServo,
        mixingSensor,
        wiredTemperatureSensorKey,
        wirelessTemperatureSensorKey,
        temperatureSensorConnection,
    ]);
    // В зонах группируются только датчики; клапаны задаются общим количеством.
    const leakZoneRows = useMemo(() => getLeakZones(incomingScheme).map((zone) => ({
        id: zone.id,
        sensorCount: getLeakZoneSensors(zone).length,
    })), [incomingScheme]);
    const leakValveCount = useMemo(() => getLeakValves(incomingScheme).length, [incomingScheme]);
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
    /**
     * В панели виден только подобранный контроллер. Исключение — конфигурация,
     * которую закрывают и PRO, и ECOsmart: тогда показываем обе карточки, чтобы
     * вариант можно было выбрать. Если тип неизвестен, показываем весь список,
     * иначе панель осталась бы пустой.
     */
    const panelControllerTemplates = useMemo(() => {
        if (proAndEcosmartOptions) {
            return CONTROLLER_TEMPLATES.filter((item) => item.value.type === 'pro' || item.value.type === 'ecosmart');
        }
        const selected = CONTROLLER_TEMPLATES.filter((item) => item.value.type === controllerType);
        return selected.length > 0 ? selected : CONTROLLER_TEMPLATES;
    }, [proAndEcosmartOptions, controllerType]);
    /** Плитки модулей расширения и питания под карточкой контроллера. */
    const panelModuleTiles = useMemo(
        () => [
            ...getExpansionModuleRows(incomingScheme),
            ...getPowerModuleTileRows(incomingScheme),
        ].filter((row) => moduleImagePaths[row.templateKey]),
        [incomingScheme],
    );
    const ecosmartIncomingScheme = useMemo(() => {
        if (!ecosmartAvailableForProScheme) return null;
        const controllerValue = getControllerTemplateValue('ecosmart');
        if (!controllerValue) return null;
        return resolveSelectionScheme(withControllerValue(incomingScheme, controllerValue));
    }, [ecosmartAvailableForProScheme, incomingScheme, resolveSelectionScheme]);
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
    // Карточка термостата одна: тип подключения переключается внутри неё,
    // но цвет и датчик пола запоминаются отдельно для каждого типа.
    const isWirelessThermostat = thermostatConnection === 'wireless';
    const thermostatTemplate = isWirelessThermostat ? wirelessThermostatTemplate : wiredThermostatTemplate;
    const wiredTemperatureSensorOptions = useMemo(() => TEMPERATURE_SENSOR_TEMPLATES.filter(
        (template) => getTemperatureSensorGroup(template) === 'wired',
    ), []);
    // Уличный датчик живет в собственной карточке с тумблером, поэтому из
    // списка вариантов общей беспроводной карточки он исключен.
    const wirelessTemperatureSensorOptions = useMemo(() => TEMPERATURE_SENSOR_TEMPLATES.filter(
        (template) => getTemperatureSensorGroup(template) === 'wireless'
            && template.key !== OUTDOOR_TEMPERATURE_SENSOR_KEY,
    ), []);
    // Датчик и сервопривод выбираются независимо, но комбинации
    // «0-10V + цифровой» не существует: при переходе на 0-10V откатываем
    // датчик на NTC, иначе шаблон не нашелся бы.
    const mixingTemplate = useMemo(
        () => findMixingTemplate(mixingServo, mixingSensor) || findMixingTemplate(mixingServo, 'ntc'),
        [mixingServo, mixingSensor],
    );
    const pumpTemplate = useMemo(
        () => PUMP_TEMPLATES.find((item) => item.pump === pumpType) || PUMP_TEMPLATES[0],
        [pumpType],
    );
    // Строки списка нужны дважды: в самом списке и в условии показа кнопки.
    const gvsBoilerRows = getGroupedDeviceRows(incomingScheme, 'gvs', GVS_TEMPLATES);
    const pumpCardRows = getGroupedDeviceRows(incomingScheme, 'pump', PUMP_TEMPLATES);
    const zoneRows = getGroupedDeviceRows(incomingScheme, 'zone', ZONE_TEMPLATES);
    const otherEquipmentRows = getGroupedDeviceRows(incomingScheme, 'other', OTHER_EQUIP_TEMPLATES);
    const thermostatRows = getThermostatRows(incomingScheme);
    // Ключ текущей конфигурации карточки в том же формате, что и templateKey
    // строк списка: по нему видно, добавлен ли уже такой термостат.
    const thermostatTemplateKey = [
        isWirelessThermostat ? 'wireless' : 'wired',
        (isWirelessThermostat ? wirelessThermostatColor : wiredThermostatColor) || 'black',
        (isWirelessThermostat ? wirelessThermostatHasFloorSensor : wiredThermostatHasFloorSensor) ? 'floor' : 'no-floor',
    ].join('|');
    // Список добавленного отдельно по каждому типу дискретного входа.
    const discreteInputRows = useMemo(() => {
        const wiredDevices = Array.isArray(incomingScheme?.wired_devices) ? incomingScheme.wired_devices : [];
        return DISCRETE_TEMPLATES.reduce((rows, template) => {
            const type = canonicalType(template.data.type);
            const items = wiredDevices.filter((device) => canonicalType(device?.type) === type);
            rows[type] = items.length > 0
                ? [{ label: template.label, count: items.length, removeKeys: items.map((item) => item.id) }]
                : [];
            return rows;
        }, {});
    }, [incomingScheme]);
    const pressureSensorRows = useMemo(() => {
        const template = PRESSURE_TEMPLATES[0];
        const items = (Array.isArray(incomingScheme?.sensors) ? incomingScheme.sensors : [])
            .filter((item) => canonicalType(item?.type) === canonicalType(template.data.type));
        return items.length > 0
            ? [{ label: template.label, count: items.length, removeKeys: items.map((item) => item.id) }]
            : [];
    }, [incomingScheme]);
    const selectMixingServo = useCallback((servo) => {
        setMixingServo(servo);
        setMixingSensor((current) => (isMixingCombinationAvailable(servo, current) ? current : 'ntc'));
    }, []);

    const wiredTemperatureSensorTemplate = useMemo(() => (
        wiredTemperatureSensorOptions.find((template) => template.key === wiredTemperatureSensorKey) || wiredTemperatureSensorOptions[0]
    ), [wiredTemperatureSensorKey, wiredTemperatureSensorOptions]);
    const wirelessTemperatureSensorTemplate = useMemo(() => (
        wirelessTemperatureSensorOptions.find((template) => template.key === wirelessTemperatureSensorKey) || wirelessTemperatureSensorOptions[0]
    ), [wirelessTemperatureSensorKey, wirelessTemperatureSensorOptions]);
    const hasOutdoorTemperatureSensor = useMemo(() => (
        (Array.isArray(incomingScheme.wireless_devices) ? incomingScheme.wireless_devices : [])
            .some((item) => canonicalType(item?.type) === OUTDOOR_TEMPERATURE_SENSOR_TYPE)
    ), [incomingScheme.wireless_devices]);

    // Объединённая карточка датчиков температуры: три переключателя вместо двух
    // отдельных карточек. Беспроводной вариант существует только настенный, а
    // настенного NTC-датчика нет — недоступные комбинации гасятся.
    const isWirelessTemperatureSensor = temperatureSensorConnection === 'wireless';
    const temperatureSensorTemplate = isWirelessTemperatureSensor
        ? wirelessTemperatureSensorTemplate
        : wiredTemperatureSensorTemplate;
    const temperatureSensorPlacement = isWirelessTemperatureSensor || !wiredTemperatureSensorKey.includes('flask')
        ? 'wall'
        : 'flask';
    const temperatureSensorKind = wiredTemperatureSensorKey.endsWith('-ntc') ? 'ntc' : 'digital';
    const temperatureSensorPlacementOptions = useMemo(() => TEMPERATURE_SENSOR_PLACEMENTS.map((item) => (
        item.value === 'flask' && isWirelessTemperatureSensor ? { ...item, disabled: true } : item
    )), [isWirelessTemperatureSensor]);
    const temperatureSensorKindOptions = useMemo(() => TEMPERATURE_SENSOR_KINDS.map((item) => (
        item.value === 'ntc' && temperatureSensorPlacement === 'wall' ? { ...item, disabled: true } : item
    )), [temperatureSensorPlacement]);
    const selectTemperatureSensorPlacement = useCallback((placement) => {
        setWiredTemperatureSensorKey((current) => {
            // Настенного NTC-датчика в каталоге нет, поэтому на стену уходит цифровой.
            const kind = placement === 'wall' || !current.endsWith('-ntc') ? 'digital' : 'ntc';
            return `wired-${placement}-${kind}`;
        });
    }, []);
    const selectTemperatureSensorKind = useCallback((kind) => {
        setWiredTemperatureSensorKey((current) => `wired-${current.includes('flask') ? 'flask' : 'wall'}-${kind}`);
    }, []);
    const temperatureSensorRows = useMemo(() => {
        const items = [
            ...(Array.isArray(incomingScheme?.sensors) ? incomingScheme.sensors : [])
                .map((device) => ({ device, target: 'sensors' })),
            ...(Array.isArray(incomingScheme?.wireless_devices) ? incomingScheme.wireless_devices : [])
                .map((device) => ({ device, target: 'wireless_devices' })),
        ].filter(({ device }) => (
            isTemperatureSensor(device)
            && canonicalType(device?.type) !== OUTDOOR_TEMPERATURE_SENSOR_TYPE
        ));
        return aggregateAddedItems(items.map(({ device, target }) => ({
            label: getTemperatureSensorLabel(device),
            templateKey: getTemperatureSensorTemplateKey(device),
            removeKey: { target, id: device.id },
        })));
    }, [incomingScheme]);


    // После паузы во вводе ищет котлы по текущему запросу;
    // cleanup отменяет debounce и предыдущий HTTP-запрос при изменении строки.
    useEffect(() => {
        const query = boilerQuery.trim();
        if (!query) {
            setBoilerResults([]);
            setBoilerSearchLoading(false);
            setBoilerSearchedQuery('');
            setBoilerDropdownOpen(false);
            return;
        }
        // Флаг поднимается сразу, а не внутри debounce: иначе между вводом и
        // запросом состояние выглядит как «поиск закончен, ничего не нашли»,
        // и выпадашка «Котлы не найдены» успевает мигнуть.
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
                    setBoilerSearchedQuery(query);
                    setBoilerSearchLoading(false);
                    // Список открывается по завершении запроса: пока идет поиск
                    // после выбора котла, старые результаты не всплывают обратно.
                    setBoilerDropdownOpen(true);
                }
            }
        }, BOILER_SEARCH_DEBOUNCE_MS);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [boilerQuery]);

    // Выпадашка поиска котлов: либо список найденного, либо «Котлы не найдены»
    // для уже отработанного запроса. Скругление поля ввода снимается, пока
    // что-то из этого раскрыто, поэтому условия собраны в одном месте.
    const boilerSearchQuery = boilerQuery.trim();
    const boilerResultsVisible = boilerDropdownOpen && boilerResults.length > 0;
    const boilerNotFoundVisible = boilerDropdownOpen
        && !boilerSearchLoading
        && boilerResults.length === 0
        && Boolean(boilerSearchQuery)
        && boilerSearchedQuery === boilerSearchQuery;
    const boilerDropdownVisible = boilerResultsVisible || boilerNotFoundVisible;

    // Клик мимо блока поиска и Escape убирают выпадашку. Слушатели висят только
    // пока она раскрыта; клик по самой строке результата попадает внутрь
    // контейнера, поэтому выбор котла обрабатывается обычным onClick и не
    // срывается. Escape закрывает только список: текст запроса и найденное
    // остаются, поле ввода не теряет фокус.
    useEffect(() => {
        if (!boilerDropdownOpen) return undefined;
        const onDocumentMouseDown = (event) => {
            if (!boilerSearchRef.current?.contains(event.target)) setBoilerDropdownOpen(false);
        };
        const onDocumentKeyDown = (event) => {
            if (event.key === 'Escape') setBoilerDropdownOpen(false);
        };
        document.addEventListener('mousedown', onDocumentMouseDown);
        document.addEventListener('keydown', onDocumentKeyDown);
        return () => {
            document.removeEventListener('mousedown', onDocumentMouseDown);
            document.removeEventListener('keydown', onDocumentKeyDown);
        };
    }, [boilerDropdownOpen]);

    const addBoilerFromSearch = useCallback((result) => {
        // Выбор котла убирает только саму выпадашку. Строка поиска и найденное
        // сохраняются: возврат в поле ввода снова раскрывает тот же список, а
        // новый запрос инициирует только изменение текста.
        setBoilerDropdownOpen(false);
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
                catalog_ref: {
                    source: 'mhtest',
                    catalog_id: result.id != null ? String(result.id) : null,
                    bus_type: result.bus_type ?? null,
                },
            });
            boilers.push(boiler);
            const nextScheme = withStupidBoilerSensor({ ...prev, boilers }, boiler);
            return resolveSelectionScheme(syncStrategySensorForSmartBoilers(nextScheme));
        });
    }, []);

    const addBoiler = useCallback((template) => {
        setIncomingScheme((prev) => {
            const boilers = Array.isArray(prev.boilers) ? [...prev.boilers] : [];
            const boiler = withRinnaiAdapter({ ...template.data, id: generateId() });
            boilers.push(boiler);
            const nextScheme = withStupidBoilerSensor({ ...prev, boilers }, boiler);
            return resolveSelectionScheme(syncStrategySensorForSmartBoilers(nextScheme));
        });
    }, []);

    const removeBoiler = useCallback((index) => {
        setIncomingScheme((prev) => {
            const boilers = Array.isArray(prev.boilers) ? [...prev.boilers] : [];
            const [removedBoiler] = boilers.splice(index, 1);
            const nextScheme = withoutStupidBoilerSensor({ ...prev, boilers }, removedBoiler);
            return resolveSelectionScheme(syncStrategySensorForSmartBoilers(nextScheme));
        });
    }, []);

    const setSmartBoilerConnectionType = useCallback((index, connectionType) => {
        setIncomingScheme((prev) => {
            const boilers = Array.isArray(prev.boilers) ? [...prev.boilers] : [];
            const boiler = boilers[index];
            if (!boiler || canonicalType(boiler.type) !== 'smart') return prev;
            boilers[index] = { ...boiler, connection_type: connectionType };
            return resolveSelectionScheme(syncStrategySensorForSmartBoilers({ ...prev, boilers }));
        });
    }, []);

    /** Добавляет составное устройство и связанные датчики; group задает логическую группу. */
    const addMixingUnit = useCallback((template, group = 'mixing') => {
        setIncomingScheme((prev) => {
            const unitUid = uid();
            const wiredDevices = Array.isArray(prev.wired_devices) ? [...prev.wired_devices] : [];
            wiredDevices.push({
                ...template.wiredDevice,
                id: generateId(),
                _uid: unitUid,
                mixing_unit_id: unitUid,
                _group: group,
                _label: template.label,
                additions: (Array.isArray(template.wiredDevice?.additions) ? template.wiredDevice.additions : []).map((addition) => ({
                    ...addition,
                    id: generateId(),
                    _uid: unitUid,
                    mixing_unit_id: unitUid,
                })),
            });

            const sensors = Array.isArray(prev.sensors) ? [...prev.sensors] : [];
            template.sensors.forEach((s) => {
                sensors.push({ ...s, id: generateId(), _uid: unitUid, mixing_unit_id: unitUid, _group: group, _label: template.label });
            });

            return resolveSelectionScheme({ ...prev, wired_devices: wiredDevices, sensors });
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
            return resolveSelectionScheme({ ...prev, wired_devices: wiredDevices, sensors });
        });
    }, []);

    const addWirelessDevice = useCallback((template) => {
        setIncomingScheme((prev) => {
            const devices = Array.isArray(prev.wireless_devices) ? [...prev.wireless_devices] : [];
            devices.push({ ...template.wirelessDevice, id: generateId() });
            return resolveSelectionScheme({ ...prev, wireless_devices: devices });
        });
    }, []);

    const removeWirelessDevice = useCallback((index) => {
        setIncomingScheme((prev) => {
            const devices = Array.isArray(prev.wireless_devices) ? [...prev.wireless_devices] : [];
            devices.splice(index, 1);
            return resolveSelectionScheme({ ...prev, wireless_devices: devices });
        });
    }, []);

    const addTemperatureSensor = useCallback((template) => {
        setIncomingScheme((prev) => {
            if (template.target === 'wireless_devices') {
                const devices = Array.isArray(prev.wireless_devices) ? [...prev.wireless_devices] : [];
                devices.push({ ...template.data, id: generateId(), title: template.label });
                return resolveSelectionScheme({ ...prev, wireless_devices: devices });
            }

            const sensors = Array.isArray(prev.sensors) ? [...prev.sensors] : [];
            sensors.push({ ...template.data, id: generateId(), title: template.label });
            return resolveSelectionScheme({ ...prev, sensors });
        });
    }, []);


    /**
     * Уличный радиодатчик допустим в единственном экземпляре: включение
     * заменяет все имеющиеся ровно одним, выключение убирает их полностью.
     */
    const setOutdoorTemperatureSensor = useCallback((enabled) => {
        setIncomingScheme((prev) => {
            const devices = Array.isArray(prev.wireless_devices) ? prev.wireless_devices : [];
            const rest = devices.filter((item) => canonicalType(item?.type) !== OUTDOOR_TEMPERATURE_SENSOR_TYPE);
            if (!enabled) return resolveSelectionScheme({ ...prev, wireless_devices: rest });
            return resolveSelectionScheme({
                ...prev,
                wireless_devices: [
                    ...rest,
                    {
                        ...OUTDOOR_TEMPERATURE_SENSOR_TEMPLATE.data,
                        id: generateId(),
                        title: OUTDOOR_TEMPERATURE_SENSOR_TEMPLATE.label,
                    },
                ],
            });
        });
    }, [resolveSelectionScheme]);

    const addThermostat = useCallback((template) => {
        setIncomingScheme((prev) => {
            if (template.target === 'wireless') {
                const devices = Array.isArray(prev.wireless_devices) ? [...prev.wireless_devices] : [];
                devices.push({ ...template.data, id: generateId() });
                return resolveSelectionScheme({ ...prev, wireless_devices: devices });
            }
            const devices = Array.isArray(prev.wired_devices) ? [...prev.wired_devices] : [];
            devices.push({ ...template.data, id: generateId() });
            return resolveSelectionScheme({ ...prev, wired_devices: devices });
        });
    }, []);

    /** Общий аддер устройства из шаблона в sensors либо wired_devices. */
    const addLeakItem = useCallback((template) => {
        setIncomingScheme((prev) => {
            if (template.target === 'sensors') {
                const items = Array.isArray(prev.sensors) ? [...prev.sensors] : [];
                items.push({ ...template.data, id: generateId() });
                return resolveSelectionScheme({ ...prev, sensors: items });
            }
            const items = Array.isArray(prev.wired_devices) ? [...prev.wired_devices] : [];
            items.push({ ...template.data, id: generateId() });
            return resolveSelectionScheme({ ...prev, wired_devices: items });
        });
    }, []);

    /** Добавляет зону контроля протечки как шлейф с одним датчиком. */
    const addLeakZone = useCallback(() => {
        setIncomingScheme((prev) => {
            const { loop } = createLeakZone({ id: generateId(), sensors: 1 });
            return resolveSelectionScheme({
                ...prev,
                sensors: [...(Array.isArray(prev.sensors) ? prev.sensors : []), loop],
            });
        });
    }, []);

    /** Удаляет только шлейф датчиков; общее количество клапанов не меняется. */
    const removeLeakZone = useCallback((zoneId) => {
        setIncomingScheme((prev) => resolveSelectionScheme({
            ...prev,
            sensors: (Array.isArray(prev.sensors) ? prev.sensors : [])
                .filter((sensor) => !(isLeakLoop(sensor) && String(sensor.id) === String(zoneId))),
        }));
    }, []);

    /** Меняет количество датчиков в шлейфе зоны: минимум один датчик. */
    const changeLeakZoneSensors = useCallback((zoneId, delta) => {
        setIncomingScheme((prev) => resolveSelectionScheme({
            ...prev,
            sensors: (Array.isArray(prev.sensors) ? prev.sensors : []).map((sensor) => {
                if (!isLeakLoop(sensor) || String(sensor.id) !== String(zoneId)) return sensor;
                const additions = Array.isArray(sensor.additions) ? sensor.additions : [];
                const zoneSensors = additions.filter((item) => canonicalType(item?.type) === 'leak-sensor');
                const others = additions.filter((item) => canonicalType(item?.type) !== 'leak-sensor');
                if (delta > 0) {
                    return { ...sensor, additions: [...others, ...zoneSensors, createLeakSensor(generateId())] };
                }
                if (zoneSensors.length <= 1) return sensor;
                return { ...sensor, additions: [...others, ...zoneSensors.slice(0, -1)] };
            }),
        }));
    }, []);

    /** Меняет общее количество независимых запорных клапанов. */
    const changeLeakValves = useCallback((delta) => {
        setIncomingScheme((prev) => {
            const wiredDevices = Array.isArray(prev.wired_devices) ? prev.wired_devices : [];
            const valves = wiredDevices.filter((device) => canonicalType(device?.type) === 'valve');
            if (delta > 0) {
                return resolveSelectionScheme({
                    ...prev,
                    wired_devices: [...wiredDevices, createLeakValve(generateId())],
                });
            }
            if (valves.length === 0) return prev;
            const removedValve = valves[valves.length - 1];
            return resolveSelectionScheme({
                ...prev,
                wired_devices: wiredDevices.filter((device) => device !== removedValve),
            });
        });
    }, []);

    /**
     * Добавляет токовый датчик давления в sensors. Отдельно от addLeakItem:
     * у датчика давления нет ограничений единого шлейфа протечки.
     */
    const addPressureSensor = useCallback(() => {
        setIncomingScheme((prev) => {
            const sensors = Array.isArray(prev.sensors) ? [...prev.sensors] : [];
            sensors.push({ ...PRESSURE_TEMPLATES[0].data, id: generateId() });
            return resolveSelectionScheme({ ...prev, sensors });
        });
    }, []);

    const setUpsIntent = useCallback((enabled) => {
        upsRequestSourceRef.current = enabled ? 'manual' : null;
        upsRequestedRef.current = enabled;
        setUpsRequested(enabled);
        setIncomingScheme((prev) => resolveSelectionScheme(prev, enabled));
    }, []);

    /** Удаляет устройство с идентификатором id из массива target либо из EXT-линии. */
    const removeSchemeItemById = useCallback((target, id) => {
        setIncomingScheme((prev) => {
            if (target === 'ext_devices') {
                const controller = prev?.controller && typeof prev.controller === 'object' ? prev.controller : {};
                return resolveSelectionScheme({
                    ...prev,
                    controller: {
                        ...controller,
                        ext_devices: (Array.isArray(controller.ext_devices) ? controller.ext_devices : [])
                            .filter((item) => item.id !== id),
                    },
                });
            }
            return resolveSelectionScheme({
                ...prev,
                [target]: (Array.isArray(prev[target]) ? prev[target] : []).filter((item) => item.id !== id),
            });
        });
    }, []);

    /** Строит счетчик составных устройств указанного шаблона и группы. */
    /** Строит счетчик однотипных элементов массива target. */
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

    /** Переключает controllerValue и синхронизирует UPS и обязательные модули. */
    const setController = useCallback((controllerValue) => {
        const targetControllerType = canonicalType(controllerValue?.type);
        setRequestedControllerType(targetControllerType);
        controllerSelectionSourceRef.current = 'manual';
        setControllerSelectionSource('manual');
        let requested = upsRequestedRef.current;
        if (targetControllerType === 'go+') {
            requested = true;
            if (upsRequestSourceRef.current !== 'manual') upsRequestSourceRef.current = 'go+';
        } else if (targetControllerType === 'go' || upsRequestSourceRef.current === 'go+') {
            requested = false;
            upsRequestSourceRef.current = null;
        }
        if (requested !== upsRequestedRef.current) {
            upsRequestedRef.current = requested;
            setUpsRequested(requested);
        }
        setIncomingScheme((prev) => resolveSelectionScheme(withControllerValue(prev, controllerValue), requested));
    }, [resolveSelectionScheme]);

    const clearScheme = useCallback(() => {
        startSelectionFromScratch();
    }, [startSelectionFromScratch]);

    /** Сохраняет согласованную схему и открывает ее редактор в новой вкладке. */
    const buildScheme = useCallback(async (schemeOverride = null, openOptions = null) => {
        const hasSchemeOverride = schemeOverride && typeof schemeOverride === 'object';
        const sourceScheme = hasSchemeOverride ? schemeOverride : incomingScheme;
        if (!hasSchemeOverride && controllerCompatibilityIssues.length > 0) {
            setBuildSchemeError('Сначала устраните несовместимость оборудования с выбранным контроллером.');
            return;
        }
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
            const normalizedScheme = normalizeSchemeIds(sourceScheme);
            const sourceControllerType = getControllerType(normalizedScheme);
            const sourceUpsRequested = hasSchemeOverride ? sourceControllerType === 'go+' : upsRequested;
            const selectionConfig = buildSelectionConfig({
                selectionState: normalizedScheme,
                requestedControllerType: hasSchemeOverride ? sourceControllerType : requestedControllerType,
                controllerSelectionSource: hasSchemeOverride ? 'manual' : controllerSelectionSource,
                upsRequested: sourceUpsRequested,
                upsRequestSource: hasSchemeOverride && sourceUpsRequested ? 'manual' : upsRequestSourceRef.current,
                editor: {
                    wiredThermostatColor,
                    wiredThermostatHasFloorSensor,
                    wirelessThermostatColor,
                    wirelessThermostatHasFloorSensor,
                    mixingServo,
                    mixingSensor,
                    wiredTemperatureSensorKey,
                    wirelessTemperatureSensorKey,
                    temperatureSensorConnection,
                },
            });
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
                    incoming_scheme: normalizedScheme,
                    selection_config: selectionConfig,
                }),
            });

            if (!response.ok) {
                const errorPayload = await response.json().catch(() => null);
                throw new Error(errorPayload?.message || `Не удалось сохранить схему (${response.status})`);
            }

            const schemeRecord = await response.json();
            removeSelectionDraft();
            const schemeUrl = new URL(`/scheme/${schemeRecord.id}`, window.location.origin);
            if (openOptions?.view === 'scheme' || openOptions?.view === 'installation') {
                schemeUrl.searchParams.set('view', openOptions.view);
            }
            if (typeof openOptions?.showEmptySlots === 'boolean') {
                schemeUrl.searchParams.set('showEmptySlots', openOptions.showEmptySlots ? '1' : '0');
            }
            const schemePath = `${schemeUrl.pathname}${schemeUrl.search}`;
            if (newTab) {
                newTab.location.href = schemePath;
            } else {
                window.open(schemePath, '_blank');
            }
            setIsBuildingScheme(false);
        } catch (error) {
            if (newTab) newTab.close();
            setBuildSchemeError(error instanceof Error ? error.message : 'Не удалось сохранить схему');
            setIsBuildingScheme(false);
        }
    }, [
        controllerCompatibilityIssues,
        incomingScheme,
        requestedControllerType,
        controllerSelectionSource,
        upsRequested,
        wiredThermostatColor,
        wiredThermostatHasFloorSensor,
        wirelessThermostatColor,
        wirelessThermostatHasFloorSensor,
        mixingServo,
        mixingSensor,
        wiredTemperatureSensorKey,
        wirelessTemperatureSensorKey,
        temperatureSensorConnection,
    ]);

    return (
        <div
            className={showJsonDetails ? 'selection-page selection-show-json' : 'selection-page selection-hide-json'}
            style={{ width: 'min(1500px, 100%)', margin: '0 auto' }}
        >
            {pendingDraft && (
                <div className="selection-draft-backdrop">
                    <div
                        className="selection-draft-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="selection-draft-title"
                    >
                        <h2 id="selection-draft-title">Незаконченная схема</h2>
                        <p>У вас есть незаконченная схема, продолжить или начать составлять подбор заново?</p>
                        <div className="selection-draft-actions">
                            <button
                                type="button"
                                className="selection-secondary-button"
                                onClick={startSelectionFromScratch}
                            >
                                Начать заново
                            </button>
                            <button
                                type="button"
                                className="selection-primary-button"
                                onClick={continueSelectionDraft}
                                autoFocus
                            >
                                Продолжить
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {isResetConfirmOpen && (
                <div className="selection-draft-backdrop">
                    <div
                        className="selection-draft-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="selection-reset-title"
                    >
                        <h2 id="selection-reset-title">Сбросить схему</h2>
                        <p>Сбросить всю схему? Все добавленные устройства будут удалены.</p>
                        <div className="selection-draft-actions">
                            <button
                                type="button"
                                className="selection-secondary-button"
                                onClick={() => setIsResetConfirmOpen(false)}
                            >
                                Отмена
                            </button>
                            <button
                                type="button"
                                className="selection-danger-button"
                                data-test-id="reset-equipment-confirm"
                                autoFocus
                                onClick={() => {
                                    setIsResetConfirmOpen(false);
                                    clearScheme();
                                }}
                            >
                                Сбросить схему
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {selectionMode === 'automatic' && controllerCompatibilityIssues.length > 0 && (
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
            {buildSchemeError && (
                <div style={{ marginBottom: 20, padding: '12px 14px', border: '1px solid #fecaca', borderRadius: 8, background: '#fef2f2', color: '#991b1b', fontSize: 14 }}>
                    {buildSchemeError}
                </div>
            )}
            {isOfferModalOpen && (
                <EquipmentOfferModal sections={equipmentOfferSections} onClose={() => setIsOfferModalOpen(false)} />
            )}

            <header className="sel-liquid-header">
                <div className="sel-liquid-header-shine" aria-hidden="true" />
                <div className="sel-liquid-header-inner">
                    <a className="sel-header-brand" href="/" aria-label="MyHeat, на главную">
                        <img src={MYHEAT_LOGO_PATH} alt="MyHeat" />
                        <span>Подбор оборудования</span>
                    </a>
                    <div className="sel-mode-panel">
                        <div className="sel-mode-title">Режим подбора оборудования</div>
                        <div className="sel-mode-controls">
                            <div className="sel-mode-switch" role="group" aria-label="Режим подбора оборудования">
                                <button
                                    type="button"
                                    className="selection-option-button sel-mode-option"
                                    data-active={selectionMode === 'automatic'}
                                    aria-pressed={selectionMode === 'automatic'}
                                    onClick={() => {
                                        setSelectionMode('automatic');
                                        setBuildSchemeError('');
                                    }}
                                >
                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M9 3h6v3h2.5A2.5 2.5 0 0 1 20 8.5V11h2v6h-2v2.5a2.5 2.5 0 0 1-2.5 2.5H15v-2H9v2H6.5A2.5 2.5 0 0 1 4 19.5V17H2v-6h2V8.5A2.5 2.5 0 0 1 6.5 6H9V3Z" />
                                    </svg>
                                    <span>
                                        <strong>Автоматический</strong>
                                        <small>Подбор по параметрам</small>
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    className="selection-option-button sel-mode-option"
                                    data-active={selectionMode === 'manual'}
                                    aria-pressed={selectionMode === 'manual'}
                                    onClick={() => {
                                        setSelectionMode('manual');
                                        setBuildSchemeError('');
                                    }}
                                >
                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M4 6h5m4 0h7M4 12h9m4 0h3M4 18h2m4 0h10M9 3v6m6 0v6m-7 0v6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                    </svg>
                                    <span>
                                        <strong>Ручной</strong>
                                        <small>Самостоятельный выбор</small>
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="sel-layout">
            {selectionMode === 'automatic' && (
                <aside className="sel-side-nav">
                    <SelectionQuickNav />
                </aside>
            )}
            {selectionMode === 'manual' && <div className="sel-layout-spacer" aria-hidden="true" />}
            <div className="sel-layout-content">
            <div key={selectionMode} className="sel-mode-view">

            {selectionMode === 'automatic' ? (
            <>
            <div className="sel-group-label" id="chapter-boilers">Котлы</div>
            <section>
                <div
                    className="sel-card sel-card-static sel-card-section"
                    style={{
                        flex: '1 1 100%',
                        width: '100%',
                        minWidth: 260,
                        border: '1px solid #d7dbe4',
                        borderRadius: 16,
                        // padding задаёт .sel-card-section: на десктопе те же 24px,
                        // но на телефоне он ужимается до 12px по медиазапросам.
                        background: '#fff',
                        display: 'flex',
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: 32,
                        alignItems: 'stretch',
                        // Карточка — прямой ребенок section, поэтому перебиваем
                        // общее правило `.selection-page section > div`,
                        // центрирующее содержимое: колонка должна быть слева.
                        justifyContent: 'flex-start',
                        position: 'relative',
                        // Без `overflow: hidden` — выпадашка поиска выходит за
                        // пределы карточки. Фоновые слои скругляют себя сами.
                    }}
                >
                    {/* Фон растянут на всю карточку и масштабируется от ширины,
                        поэтому при добавлении котлов он не пересчитывается — просто
                        открывается нижняя часть кадра. Сдвиг вверх на 70px нужен,
                        чтобы в компактном состоянии котел попадал в кадр. */}
                    <CardPhotoBackdrop
                        image={BOILER_ROOM_IMAGE_PATH}
                        blur={3}
                        position="right -70px"
                        fallbackColor={CARD_PHOTO_TAIL_COLOR.boilerRoom}
                    />

                    <div
                        style={{
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 20,
                            flex: '1 1 420px',
                            minWidth: 260,
                            maxWidth: 560,
                        }}
                    >
                        <div style={{ fontWeight: 700, fontSize: 18, lineHeight: 1.3 }}>Котлы</div>

                        <p className="sel-card-desc sel-boilers-lead">
                            Найдите котел по названию. Тип подключения определяется автоматически:
                            котлы с цифровой шиной подключаются через BUS, остальные — через реле
                            с датчиком подающей линии.
                        </p>

                        {Array.isArray(incomingScheme.boilers) && incomingScheme.boilers.length > 0 && (
                            <AddedDevicesBlock marginTop={0}>
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

                        <div>
                            {/* Быстрые теги брендов: подставляют бренд в строку поиска,
                                повторный клик по активному тегу очищает запрос. */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                                {BOILER_BRAND_TAGS.map((brand) => {
                                    const isActive = boilerQuery.trim().toLowerCase() === brand.toLowerCase();
                                    return (
                                        <button
                                            className="selection-option-button"
                                            key={brand}
                                            type="button"
                                            data-test-id={`boiler-brand-${brand.toLowerCase()}`}
                                            data-active={isActive}
                                            onClick={() => setBoilerQuery(isActive ? '' : brand)}
                                            style={{
                                                padding: '6px 14px',
                                                border: `1px solid ${isActive ? '#e07020' : '#e3e7ef'}`,
                                                borderRadius: 999,
                                                background: isActive ? '#fff8f2' : '#fff',
                                                color: isActive ? '#c85e18' : '#667089',
                                                cursor: 'pointer',
                                                fontSize: 13,
                                                fontWeight: isActive ? 700 : 500,
                                                transition: 'background 0.18s, border-color 0.18s, color 0.18s',
                                            }}
                                        >
                                            {brand}
                                        </button>
                                    );
                                })}
                            </div>

                            <div style={{ position: 'relative' }} ref={boilerSearchRef}>
                                {/* Возврат в поле ввода снова раскрывает результаты последнего
                                    поиска, нового запроса при этом не уходит. onClick стоит рядом
                                    с onFocus: если поле уже в фокусе, событие focus не повторяется. */}
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        placeholder="Введите название котла..."
                                        value={boilerQuery}
                                        onChange={(e) => setBoilerQuery(e.target.value)}
                                        onFocus={() => setBoilerDropdownOpen(true)}
                                        onClick={() => setBoilerDropdownOpen(true)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 44px 10px 14px',
                                            border: '1px solid #d7dbe4',
                                            borderRadius: boilerDropdownVisible ? '10px 10px 0 0' : 10,
                                            fontSize: 14,
                                            fontFamily: 'inherit',
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                            background: '#fff',
                                            color: 'var(--text)',
                                        }}
                                    />
                                    {boilerSearchLoading && (
                                        <span style={{ position: 'absolute', right: boilerQuery ? 44 : 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 13 }}>
                                            Поиск...
                                        </span>
                                    )}
                                    {boilerQuery && (
                                        <button
                                            className="selection-option-button"
                                            type="button"
                                            data-test-id="boiler-search-clear"
                                            aria-label="Очистить поиск"
                                            title="Очистить поиск"
                                            onClick={() => setBoilerQuery('')}
                                            style={{
                                                position: 'absolute',
                                                right: 8,
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: 26,
                                                height: 26,
                                                padding: 0,
                                                border: 'none',
                                                borderRadius: '50%',
                                                background: 'transparent',
                                                color: '#dc2626',
                                                cursor: 'pointer',
                                                fontSize: 18,
                                                lineHeight: 1,
                                                transition: 'background 0.15s',
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                                {/* Выпадашка висит поверх контента и не входит
                                    в поток, чтобы высота карточки от нее не зависела. */}
                                {boilerResultsVisible && (
                                    <div data-test-id="boiler-search-results" style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0,
                                        zIndex: 20,
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
                                                    data-test-id="boiler-search-option"
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
                                {boilerNotFoundVisible && (
                                    <div data-test-id="boiler-search-empty" style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0,
                                        zIndex: 20,
                                        padding: '10px 14px',
                                        border: '1px solid #d7dbe4',
                                        borderTop: 'none',
                                        borderRadius: '0 0 10px 10px',
                                        background: '#fff',
                                        boxShadow: '0 6px 16px rgba(32,39,56,0.08)',
                                        color: '#94a3b8',
                                        fontSize: 14,
                                    }}>
                                        Котлы не найдены
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="sel-group-label" id="chapter-hydraulics">Гидравлика</div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap', marginBottom: 32 }}>

            <section style={{ flex: '1 1 100%', minWidth: 0 }}>
                <h2>Смесительные узлы</h2>
                <SectionSubtitle>Какое количество смесительных узлов будет использоваться в системе?</SectionSubtitle>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <MixingUnitCard
                        template={mixingTemplate}
                        servo={mixingServo}
                        onServoChange={selectMixingServo}
                        sensor={mixingSensor}
                        onSensorChange={setMixingSensor}
                        onAdd={() => addMixingUnit(mixingTemplate, 'mixing')}
                        addedRows={getGroupedDeviceRows(incomingScheme, 'mixing', MIXING_TEMPLATES)}
                        onAddUnit={(row) => addMixingUnit(
                            MIXING_TEMPLATES.find((item) => item.label === row.label),
                            'mixing',
                        )}
                        onRemoveUnit={(row) => removeMixingUnit(Number(row.removeKeys[row.removeKeys.length - 1]))}
                        showJsonDetails={showJsonDetails}
                    />
                </div>
            </section>

            <section style={{ flex: '1 1 100%', minWidth: 0 }}>
                <h2>Бойлеры ГВС</h2>
                <SectionSubtitle>Какое количество бойлеров косвенного нагрева подключено после гидравлического разделителя?</SectionSubtitle>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <SectionEquipmentCard
                        image={GVS_BOILER_BACKGROUND_PATH}
                        backgroundColor="#555351"
                        backgroundPosition="right -100px"
                        title={GVS_TEMPLATES[0].label}
                        description={GVS_TEMPLATES[0].description}
                        addedTitle="Добавленные бойлеры ГВС:"
                        addedRows={gvsBoilerRows}
                        onAddUnit={(row) => addMixingUnit(
                            GVS_TEMPLATES.find((item) => item.label === row.label) || GVS_TEMPLATES[0],
                            'gvs',
                        )}
                        onRemoveUnit={(row) => removeMixingUnit(Number(row.removeKeys[row.removeKeys.length - 1]))}
                        addLabel="Добавить бойлер ГВС"
                        onAdd={() => addMixingUnit(GVS_TEMPLATES[0], 'gvs')}
                        showAdd={gvsBoilerRows.length === 0}
                        addTestId="add-gvs-boiler"
                        qtyTestId="gvs-qty"
                        jsonData={{ wired_device: GVS_TEMPLATES[0].wiredDevice, sensors: GVS_TEMPLATES[0].sensors }}
                        showJsonDetails={showJsonDetails}
                    />
                </div>
            </section>

            <section style={{ flex: '1 1 100%', minWidth: 0 }}>
                <h2>Насосы</h2>
                <SectionSubtitle>Какое количество циркуляционных насосов будет использоваться в системе?</SectionSubtitle>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <PumpCard
                        template={pumpTemplate}
                        pumpType={pumpType}
                        onPumpTypeChange={setPumpType}
                        onAdd={() => addMixingUnit(pumpTemplate, 'pump')}
                        addedRows={pumpCardRows}
                        onAddUnit={(row) => addMixingUnit(
                            PUMP_TEMPLATES.find((item) => item.label === row.label) || pumpTemplate,
                            'pump',
                        )}
                        onRemoveUnit={(row) => removeMixingUnit(Number(row.removeKeys[row.removeKeys.length - 1]))}
                        showJsonDetails={showJsonDetails}
                    />
                </div>

            </section>

            </div>{/* /Гидравлика */}

            <div className="sel-group-label" id="chapter-climate">Климат</div>
            <div style={{ marginBottom: 32 }}>

            <section>
                <h2>Термостаты</h2>
                <SectionSubtitle>Укажите тип и количество термостатов</SectionSubtitle>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                    <ThermostatCard
                        template={thermostatTemplate}
                        connection={thermostatConnection}
                        onConnectionChange={setThermostatConnection}
                        color={isWirelessThermostat ? wirelessThermostatColor : wiredThermostatColor}
                        onColorChange={isWirelessThermostat ? setWirelessThermostatColor : setWiredThermostatColor}
                        hasFloorSensor={isWirelessThermostat ? wirelessThermostatHasFloorSensor : wiredThermostatHasFloorSensor}
                        onFloorSensorChange={isWirelessThermostat ? setWirelessThermostatHasFloorSensor : setWiredThermostatHasFloorSensor}
                        onAdd={() => addThermostat(thermostatTemplate)}
                        showAdd={!thermostatRows.some((row) => row.templateKey === thermostatTemplateKey)}
                        addedRows={thermostatRows}
                        onRemoveRow={(row) => {
                            const removeKey = row.removeKeys[row.removeKeys.length - 1];
                            removeSchemeItemById(removeKey.target, removeKey.id);
                        }}
                        onAddRow={(row) => {
                            // Конфигурация берётся из самой строки, а не из текущих
                            // переключателей карточки: «+» повторяет именно эту позицию.
                            const [rowTarget, rowColor, rowFloor] = String(row.templateKey || '').split('|');
                            addThermostat(makeThermostatTemplate({
                                target: rowTarget === 'wireless' ? 'wireless' : 'wired',
                                color: rowColor || 'black',
                                hasFloorSensor: rowFloor === 'floor',
                            }));
                        }}
                        showJsonDetails={showJsonDetails}
                    />
                </div>
            </section>

                <section>
                    <h2>Зональное управление</h2>
                    <SectionSubtitle>Настройте управление системой с помощью зонирования</SectionSubtitle>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <SectionEquipmentCard
                            image={ZONES_BACKGROUND_PATH}
                            backgroundWidth={560}
                            backgroundColor={CARD_PHOTO_TAIL_COLOR.zonesRoom}
                            title={ZONE_TEMPLATES[0].label}
                            description="Определите, на сколько зон будет разделена система, чтобы эффективно управлять оборудованием черех двухходовые сервоприводы."
                            addedTitle="Добавленные зоны:"
                            addedRows={zoneRows}
                            onAddUnit={() => addMixingUnit(ZONE_TEMPLATES[0], 'zone')}
                            onRemoveUnit={(row) => removeMixingUnit(Number(row.removeKeys[row.removeKeys.length - 1]))}
                            addLabel="Добавить зону"
                            onAdd={() => addMixingUnit(ZONE_TEMPLATES[0], 'zone')}
                            showAdd={zoneRows.length === 0}
                            addTestId="add-zone"
                            qtyTestId="zone-qty"
                            jsonData={ZONE_TEMPLATES[0].wiredDevice}
                            showJsonDetails={showJsonDetails}
                        />
                    </div>
                </section>

            </div>{/* /Управление климатом */}

            <div className="sel-group-label" id="chapter-other-equipment">Прочее оборудование</div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap', marginBottom: 32 }}>
            <section style={{ flex: '1 1 360px', minWidth: 0 }}>
                <SectionSubtitle>Какое количество прочего оборудования (сирены и т.д.) будет управляться с помощью контроллера?</SectionSubtitle>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <SectionEquipmentCard
                        image={OTHER_EQUIP_BACKGROUND_PATH}
                        backgroundWidth={520}
                        backgroundColor={CARD_PHOTO_TAIL_COLOR.otherRoom}
                        title={OTHER_EQUIP_TEMPLATES[0].label}
                        description="Сирены, реле и другие устройства, которыми контроллер управляет через релейный выход. Каждое занимает один релейный порт."
                        addedTitle="Добавленное оборудование:"
                        addedRows={otherEquipmentRows}
                        onAddUnit={(row) => addMixingUnit(
                            OTHER_EQUIP_TEMPLATES.find((item) => item.label === row.label) || OTHER_EQUIP_TEMPLATES[0],
                            'other',
                        )}
                        onRemoveUnit={(row) => removeMixingUnit(Number(row.removeKeys[row.removeKeys.length - 1]))}
                        addLabel="Добавить оборудование"
                        onAdd={() => addMixingUnit(OTHER_EQUIP_TEMPLATES[0], 'other')}
                        showAdd={otherEquipmentRows.length === 0}
                        addTestId="add-other-equipment"
                        qtyTestId="other-equipment-qty"
                        jsonData={OTHER_EQUIP_TEMPLATES[0].wiredDevice}
                        showJsonDetails={showJsonDetails}
                    />
                </div>

            </section>
            </div>{/* /Прочее оборудование */}

            <div className="sel-group-label" id="chapter-sensors">Датчики и защита</div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap', marginBottom: 32 }}>
            <div style={{ flex: '1 1 500px', minWidth: 0 }}>
            <section>
                <h2>Датчики температуры</h2>
                <SectionSubtitle>Укажите тип и количество датчиков температуры</SectionSubtitle>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <SectionEquipmentCard
                        image={THERMOSTAT_ROOM_IMAGE_PATH}
                        backgroundWidth={520}
                        backgroundColor={CARD_PHOTO_TAIL_COLOR.thermostatRoom}
                        title={temperatureSensorTemplate?.label}
                        description="Измеряет температуру воздуха в помещении или теплоносителя в колбе и передаёт её контроллеру."
                        addedTitle="Добавленные датчики температуры:"
                        addedRows={temperatureSensorRows}
                        onAddUnit={(row) => addTemperatureSensor(
                            TEMPERATURE_SENSOR_TEMPLATES.find((template) => template.key === row.templateKey)
                            || temperatureSensorTemplate,
                        )}
                        onRemoveUnit={(row) => {
                            const removeKey = row.removeKeys[row.removeKeys.length - 1];
                            removeSchemeItemById(removeKey.target, removeKey.id);
                        }}
                        addLabel={temperatureSensorTemplate?.addLabel || 'Добавить датчик'}
                        onAdd={() => addTemperatureSensor(temperatureSensorTemplate)}
                        showAdd={!temperatureSensorRows.some((row) => row.templateKey === temperatureSensorTemplate?.key)}
                        addTestId="add-temperature-sensor"
                        qtyTestId={(row) => `temperature-sensor-${row.templateKey}-qty`}
                        jsonData={temperatureSensorTemplate?.data}
                        showJsonDetails={showJsonDetails}
                    >
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
                            <div>
                                <ThermostatFieldLabel>Тип подключения</ThermostatFieldLabel>
                                <SegmentedToggle
                                    options={TEMPERATURE_SENSOR_CONNECTIONS}
                                    value={temperatureSensorConnection}
                                    onChange={setTemperatureSensorConnection}
                                    testIdPrefix="temperature-sensor-connection"
                                />
                            </div>
                            <div>
                                <ThermostatFieldLabel>Расположение</ThermostatFieldLabel>
                                <SegmentedToggle
                                    options={temperatureSensorPlacementOptions}
                                    value={temperatureSensorPlacement}
                                    onChange={selectTemperatureSensorPlacement}
                                    testIdPrefix="temperature-sensor-placement"
                                />
                            </div>
                            {!isWirelessTemperatureSensor && (
                                <div>
                                    <ThermostatFieldLabel>Тип датчика</ThermostatFieldLabel>
                                    <SegmentedToggle
                                        options={temperatureSensorKindOptions}
                                        value={temperatureSensorKind}
                                        onChange={selectTemperatureSensorKind}
                                        testIdPrefix="temperature-sensor-kind"
                                    />
                                </div>
                            )}
                        </div>
                    </SectionEquipmentCard>
                </div>

            </section>

            <section>
                <h2>Уличный датчик температуры</h2>
                <SectionSubtitle>Беспроводной датчик уличной температуры — не более одного на схему</SectionSubtitle>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <OutdoorSensorCard
                        template={OUTDOOR_TEMPERATURE_SENSOR_TEMPLATE}
                        enabled={hasOutdoorTemperatureSensor}
                        onEnabledChange={setOutdoorTemperatureSensor}
                        showJsonDetails={showJsonDetails}
                    />
                </div>
            </section>

            <section>
                <h2>Токовый датчик давления</h2>
                <SectionSubtitle>Укажите количество токовых датчиков давления в системе</SectionSubtitle>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <SectionEquipmentCard
                        image={PRESSURE_SENSOR_BACKGROUND_PATH}
                        backgroundWidth={520}
                        backgroundColor={CARD_PHOTO_TAIL_COLOR.standardRoom}
                        deviceImage={PRESSURE_SENSOR_IMAGE_PATH}
                        deviceImageAlt={PRESSURE_TEMPLATES[0].label}
                        title={PRESSURE_TEMPLATES[0].label}
                        description="Предназначен для измерения давления теплоносителя/воды в автоматизированных системах отопления и водоснабжения."
                        addedTitle="Добавленные датчики давления:"
                        addedRows={pressureSensorRows}
                        onAddUnit={addPressureSensor}
                        onRemoveUnit={(row) => removeSchemeItemById('sensors', row.removeKeys[row.removeKeys.length - 1])}
                        addLabel="Добавить датчик давления"
                        onAdd={addPressureSensor}
                        showAdd={pressureSensorRows.length === 0}
                        addTestId="add-pressure-sensor"
                        qtyTestId="pressure-sensor-qty"
                        jsonData={PRESSURE_TEMPLATES[0].data}
                        showJsonDetails={showJsonDetails}
                    />
                </div>

            </section>
            </div>

            </div>{/* /Датчики и защита flex */}

            <section>
                <h2>Контроль протечки воды</h2>
                <SectionSubtitle>
                    Все датчики одной группы занимают один дискретный вход контроллера или модуля.
                    Количество запорных клапанов задаётся отдельно.
                </SectionSubtitle>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <SectionEquipmentCard
                        image={LEAK_ZONE_BACKGROUND_PATH}
                        backgroundWidth={520}
                        backgroundColor={CARD_PHOTO_TAIL_COLOR.standardRoom}
                        title="Контроль протечки воды"
                        description="Датчики каждой зоны собираются в один шлейф и занимают один дискретный вход. Запорные клапаны задаются общим количеством, каждый занимает два соседних релейных порта."
                        addLabel="Добавить группу датчиков протечки"
                        onAdd={addLeakZone}
                        addTestId="add-leak-zone"
                        jsonData={LEAK_ZONE_JSON_EXAMPLE}
                        showJsonDetails={showJsonDetails}
                    >
                        <AddedDevicesBlock marginTop={0}>
                            {leakZoneRows.length > 0 && (
                                <>
                                <AddedDevicesTitle>Добавленные устройства контроля протечки воды:</AddedDevicesTitle>
                                {leakZoneRows.map((zone, index) => (
                                    <div
                                        key={zone.id}
                                        style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            alignItems: 'center',
                                            gap: 12,
                                            padding: '8px 0',
                                            borderTop: index === 0 ? 'none' : '1px solid #d3dfeb',
                                        }}
                                    >
                                        <span style={{ flex: '1 1 130px', fontWeight: 700, fontSize: 14 }}>
                                            {`Группа датчиков протечки ${index + 1}`}
                                        </span>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ color: '#475569', fontSize: 13 }}>Датчики</span>
                                            <QtyStepper
                                                count={zone.sensorCount}
                                                onDecrement={() => changeLeakZoneSensors(zone.id, -1)}
                                                onIncrement={() => changeLeakZoneSensors(zone.id, 1)}
                                                decTestId={`leak-zone-sensor-qty-dec-${index}`}
                                                incTestId={`leak-zone-sensor-qty-inc-${index}`}
                                            />
                                        </span>
                                        <button
                                            type="button"
                                            className="selection-remove-icon"
                                            onClick={() => removeLeakZone(zone.id)}
                                            data-test-id={`remove-leak-zone-${index}`}
                                            title="Удалить зону"
                                            aria-label={`Удалить зону ${index + 1}`}
                                            style={{ marginLeft: 'auto' }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                                </>
                            )}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: '10px 0 2px',
                                    borderTop: leakZoneRows.length > 0 ? '1px solid #d3dfeb' : 'none',
                                }}
                            >
                                <span style={{ flex: '1 1 160px', fontWeight: 700, fontSize: 14 }}>
                                    Запорные клапаны
                                </span>
                                <QtyStepper
                                    count={leakValveCount}
                                    allowZero
                                    onDecrement={() => changeLeakValves(-1)}
                                    onIncrement={() => changeLeakValves(1)}
                                    decTestId="leak-valve-qty-dec"
                                    incTestId="leak-valve-qty-inc"
                                />
                            </div>
                        </AddedDevicesBlock>
                    </SectionEquipmentCard>
                </div>

            </section>

            <div className="sel-group-label" id="chapter-misc">Прочее</div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap', marginBottom: 32 }}>
            <section style={{ flex: '1 1 400px', minWidth: 0 }}>
                <h2>Дискретные входы</h2>
                <SectionSubtitle>Укажите какое количество и как будут использоваться дискретные входы</SectionSubtitle>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {DISCRETE_TEMPLATES.map((item) => {
                        const rows = discreteInputRows[canonicalType(item.data.type)] || [];
                        return (
                            <SectionEquipmentCard
                                key={item.data.type}
                                half
                                image={item.background}
                                backgroundWidth={260}
                                minHeight={DISCRETE_CARD_HEIGHT}
                                title={item.label}
                                addedTitle="Добавлено:"
                                addedRows={rows}
                                addedFullWidth
                                addedDense
                                onAddUnit={() => addLeakItem({ ...item, target: 'wired' })}
                                onRemoveUnit={(row) => removeSchemeItemById('wired_devices', row.removeKeys[row.removeKeys.length - 1])}
                                addLabel="Добавить"
                                onAdd={() => addLeakItem({ ...item, target: 'wired' })}
                                // Как только вход добавлен, количеством управляет счетчик в строке —
                                // большая кнопка становится лишней и прячется.
                                showAdd={rows.length === 0}
                                addTestId={`add-${canonicalType(item.data.type).replace(/_/g, '-')}`}
                                jsonData={item.data}
                                showJsonDetails={showJsonDetails}
                            />
                        );
                    })}
                </div>

            </section>

            </div>{/* /Прочее */}

            <div className="sel-group-label" id="chapter-power">Питание</div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap', marginBottom: 32 }}>
            <section style={{ flex: '1 1 400px', minWidth: 0 }}>
                <h2>Источник бесперебойного питания</h2>
                <SectionSubtitle>Требуется ли установка источника бесперебойного питания</SectionSubtitle>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <SectionEquipmentCard
                        image={UPS_BACKGROUND_PATH}
                        backgroundWidth={520}
                        backgroundColor={CARD_PHOTO_TAIL_COLOR.upsRoom}
                        title="Источник бесперебойного питания"
                        description="Поддерживает работу контроллера и модулей при отключении электричества."
                        showAdd={false}
                        jsonData={{ power_modules: ['ups'] }}
                        showJsonDetails={showJsonDetails}
                    >
                        <div
                            style={{
                                alignSelf: 'flex-start',
                                padding: '12px 16px',
                                border: `1px solid ${upsRequested ? '#f2cba6' : '#e3e7ef'}`,
                                borderRadius: 12,
                                background: upsRequested ? '#fff8f2' : '#fff',
                                transition: 'background 0.18s, border-color 0.18s',
                            }}
                        >
                            <ToggleSwitch
                                checked={upsRequested}
                                onChange={setUpsIntent}
                                testId="ups-toggle"
                                label={controllerType === 'go'
                                    ? 'Сменить контроллер с Go на Go+ (имеет встроенный ИБП)'
                                    : 'ИБП в схеме'}
                            />
                        </div>
                    </SectionEquipmentCard>
                </div>

            </section>
            </div>{/* /Питание */}
            </>
            ) : (
                <div className="sel-manual-controller-picker">
                    <div className="sel-manual-controller-heading">
                        <h2>Ручная сборка схемы</h2>
                        <p>Выберите контроллер, с которого хотите начать работу в конструкторе.</p>
                    </div>
                    <div className="sel-manual-controller-grid">
                        <article className="sel-manual-controller-card sel-manual-info-card">
                            <div className="sel-manual-info-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24">
                                    <path d="M4 6h5m4 0h7M4 12h9m4 0h3M4 18h2m4 0h10M9 3v6m6 0v6m-7 0v6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                </svg>
                            </div>
                            <small>Ручной режим</small>
                            <strong>Начните с контроллера</strong>
                            <span>Вы сами выбираете базовый контроллер. Конструктор откроет чистую схему без автоматически подобранного оборудования, чтобы вы могли собрать подключения вручную.</span>
                            <ul>
                                <li>Выберите подходящую модель</li>
                                <li>Откройте чистую схему</li>
                                <li>Добавьте оборудование вручную</li>
                            </ul>
                        </article>
                        {CONTROLLER_TEMPLATES.map((item) => {
                            const controllerName = {
                                go: 'Go',
                                'go+': 'Go+',
                                smart2: 'Smart2',
                                pro: 'PRO',
                                ecosmart: 'ECOsmart',
                            }[item.value.type];
                            const preposition = item.value.type === 'smart2' ? 'со' : 'с';
                            return (
                                <article
                                    key={item.value.type}
                                    className="sel-manual-controller-card"
                                >
                                    <img src={controllerImagePaths[item.value.type]} alt="" />
                                    <strong>{item.label}</strong>
                                    <span>{CONTROLLER_CARD_DESCRIPTIONS[item.value.type]}</span>
                                    <button
                                        type="button"
                                        className="selection-option-button sel-controller-primary-action sel-manual-card-build-button"
                                        disabled={isBuildingScheme}
                                        onClick={() => {
                                            const manualScheme = resolveControllerAndRequiredModules(
                                                withControllerValue(createInitialSelectionScheme(), item.value),
                                                item.value.type === 'go+',
                                                true,
                                            );
                                            buildScheme(manualScheme, {
                                                view: 'scheme',
                                                showEmptySlots: true,
                                            });
                                        }}
                                    >
                                        <span className="sel-controller-action-icon">
                                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                                <circle cx="5" cy="6" r="2" />
                                                <circle cx="19" cy="6" r="2" />
                                                <circle cx="12" cy="18" r="2" />
                                                <path d="M7 6h10M6.5 7.5l4.2 8.7m6.8-8.7-4.2 8.7" />
                                            </svg>
                                        </span>
                                        <span className="sel-controller-action-copy">
                                            <strong>
                                                {/* Подпись держится в одну строку: перенос здесь сжимал бы
                                                    карточку по высоте и ломал ритм сетки. */}
                                                {isBuildingScheme ? 'Сохраняем...' : `Собрать схему ${preposition} ${controllerName}`}
                                            </strong>
                                        </span>
                                        <svg className="sel-controller-action-arrow" viewBox="0 0 24 24" aria-hidden="true">
                                            <path d="m9 5 7 7-7 7" />
                                        </svg>
                                    </button>
                                </article>
                            );
                        })}
                    </div>
                </div>
            )}
            </div>
            </div>{/* /sel-layout-content */}
            {/* Единственное место выбора контроллера: липкая колонка справа,
                видна на всём протяжении подбора. */}
            {selectionMode === 'automatic' && (
            <aside className="sel-stuck-controllers-panel" ref={controllerPanelRef}>
                <div className="sel-controller-panel-glow" aria-hidden="true" />
                <div className="sel-controller-panel-header">
                    <div>
                        <span>Результат подбора</span>
                        <strong>Подобранный контроллер</strong>
                    </div>
                </div>
                {jsonToggleEnabled && (
                    <label className="sel-json-toggle">
                        <input
                            type="checkbox"
                            checked={showJsonDetails}
                            onChange={(event) => setShowJsonDetails(event.target.checked)}
                        />
                    </label>
                )}
                <div className="sel-stuck-controllers">
                    {panelControllerTemplates.map((item, index) => {
                        const isActive = incomingScheme.controller?.type === item.value.type;
                        const isGoFamilySwitch = (controllerType === 'go' && item.value.type === 'go+')
                            || (controllerType === 'go+' && item.value.type === 'go');
                        const isCompatible = compatibleControllerTypes.has(item.value.type) || isGoFamilySwitch;
                        return (
                            <button
                                type="button"
                                key={index}
                                className="selection-option-button sel-stuck-controller-card"
                                data-test-id={`controller-card-${item.value.type}`}
                                data-active={isActive}
                                onClick={isCompatible ? () => setController(item.value) : undefined}
                                disabled={!isCompatible}
                                aria-disabled={!isCompatible}
                                title={isCompatible ? undefined : 'Этот контроллер не поддерживает текущую конфигурацию'}
                            >
                                <span className="sel-stuck-controller-visual">
                                    <img
                                        src={controllerImagePaths[item.value.type]}
                                        alt={item.label}
                                    />
                                </span>
                                <span className="sel-stuck-controller-copy">
                                    <strong>{item.label}</strong>
                                    <small>{CONTROLLER_CARD_DESCRIPTIONS[item.value.type] || ''}</small>
                                </span>
                            </button>
                        );
                    })}
                </div>
                {proAndEcosmartOptions && (
                    <div className="sel-stuck-controllers-note">
                        <span>Для этой конфигурации подходят два контроллера: <strong>PRO</strong> и <strong>ECOsmart</strong>.</span>
                        <button
                            className="selection-option-button sel-controller-choice-button"
                            type="button"
                            data-active={controllerType === 'pro'}
                            onClick={() => setController(getControllerTemplateValue('pro'))}
                        >
                            Использовать PRO
                        </button>
                        <button
                            className="selection-option-button sel-controller-choice-button"
                            type="button"
                            data-active={controllerType === 'ecosmart'}
                            onClick={() => setController(getControllerTemplateValue('ecosmart'))}
                        >
                            Использовать ECOsmart
                        </button>
                    </div>
                )}
                {/* Модули расширения, которые подбор добавил к контроллеру:
                    только снимок в плитке, название — в подсказке, количество
                    одинаковых — кружком в углу. */}
                {panelModuleTiles.length > 0 && (
                    <div className="sel-stuck-modules">
                        <div className="sel-stuck-modules-title">Модули расширения</div>
                        <div className="sel-stuck-modules-grid">
                            {panelModuleTiles.map((tile) => (
                                <div
                                    key={tile.label}
                                    className="sel-stuck-module-tile"
                                    data-test-id={`panel-module-${tile.templateKey}`}
                                    title={tile.count > 1 ? `${tile.label}, ${tile.count} шт` : tile.label}
                                >
                                    <img src={moduleImagePaths[tile.templateKey]} alt={tile.label} />
                                    {tile.count > 1 && (
                                        <span className="sel-stuck-module-count">{tile.count}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {/* Действия над собранным составом живут под панелью контроллера. */}
                <div className="sel-stuck-actions">
                    <button
                        type="button"
                        className="selection-option-button sel-controller-primary-action"
                        onClick={() => buildScheme()}
                        disabled={isBuildingScheme || controllerCompatibilityIssues.length > 0}
                    >
                        <span className="sel-controller-action-icon">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <circle cx="5" cy="6" r="2" />
                                <circle cx="19" cy="6" r="2" />
                                <circle cx="12" cy="18" r="2" />
                                <path d="M7 6h10M6.5 7.5l4.2 8.7m6.8-8.7-4.2 8.7" />
                            </svg>
                        </span>
                        <span className="sel-controller-action-copy">
                            <strong>
                                {/* Перенос нужен узкой панели на десктопе; на телефоне `br`
                                    скрывается стилями, и пробел склеивает подпись в строку. */}
                                {isBuildingScheme ? 'Сохраняем...' : <>Схема<br /> подключения</>}
                            </strong>
                        </span>
                        <svg className="sel-controller-action-arrow" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="m9 5 7 7-7 7" />
                        </svg>
                    </button>
                    <div className="sel-controller-secondary-actions">
                        <button
                            type="button"
                            className="selection-option-button sel-controller-spec-action"
                            data-test-id="open-commercial-offer"
                            aria-label="Спецификация"
                            title="Спецификация"
                            onClick={() => setIsOfferModalOpen(true)}
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M6 3h9l4 4v14H6zM15 3v5h4M9 12h7m-7 4h7" />
                            </svg>
                            <span>Спецификация</span>
                        </button>
                        <button
                            type="button"
                            className="selection-option-button sel-controller-reset-action"
                            data-test-id="reset-equipment"
                            aria-label="Сбросить схему"
                            title="Сбросить схему"
                            onClick={() => setIsResetConfirmOpen(true)}
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M4 7h16M9 7V4h6v3m-9 0 1 14h10l1-14M10 11v6m4-6v6" />
                            </svg>
                        </button>
                    </div>
                </div>
            </aside>
            )}
            {selectionMode === 'manual' && <div className="sel-layout-spacer" aria-hidden="true" />}
            </div>{/* /sel-layout */}

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
