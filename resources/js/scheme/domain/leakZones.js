import { canonicalDeviceType } from './deviceTypes.js';

/**
 * Зона контроля протечки — шлейф датчиков плюс привязанные к нему запорные
 * клапаны. Физически все датчики зоны сидят на одном дискретном входе, поэтому
 * в схеме зона представлена ОДНИМ устройством `leak-loop` в публичном `sensors`:
 * так «одно устройство = один слот» остаётся верным для DI-балансировщика,
 * `connection_layout` и отрисовки слотов.
 *
 * Датчики лежат внутри `additions` и намеренно не имеют `connection_type`:
 * самостоятельного подключения у них нет. Клапаны остаются в `wired_devices`
 * (каждый занимает два соседних relay-порта) и ссылаются на зону через
 * `leak_zone_id`.
 */
export const LEAK_LOOP_TYPE = 'leak-loop';
export const LEAK_SENSOR_TYPE = 'leak-sensor';
export const LEAK_VALVE_TYPE = 'valve';

let generatedIdCounter = 0;

const generateLeakId = () => {
    generatedIdCounter += 1;
    return `leak-${Date.now().toString(36)}-${generatedIdCounter}`;
};

const asArray = (value) => (Array.isArray(value) ? value : []);

export const isLeakLoop = (device) => canonicalDeviceType(device?.type) === LEAK_LOOP_TYPE;

export const isLeakSensor = (device) => canonicalDeviceType(device?.type) === LEAK_SENSOR_TYPE;

export const isLeakValve = (device) => canonicalDeviceType(device?.type) === LEAK_VALVE_TYPE;

/** Датчики внутри шлейфа зоны. */
export const getLeakZoneSensors = (loop) => asArray(loop?.additions).filter(isLeakSensor);

/** Клапаны схемы, привязанные к зоне. */
export const getLeakZoneValves = (scheme, zoneId) => asArray(scheme?.wired_devices)
    .filter((device) => isLeakValve(device) && String(device?.leak_zone_id ?? '') === String(zoneId));

/** Все зоны схемы в порядке их появления в `sensors`. */
export const getLeakZones = (scheme) => asArray(scheme?.sensors).filter(isLeakLoop);

export const createLeakSensor = (id = null) => ({
    id: id ?? generateLeakId(),
    device_type: 'sensor',
    type: LEAK_SENSOR_TYPE,
});

export const createLeakValve = (zoneId, id = null) => ({
    id: id ?? generateLeakId(),
    device_type: 'equipment',
    type: LEAK_VALVE_TYPE,
    connection_type: 'double_relay',
    leak_zone_id: zoneId,
    additions: [],
});

/**
 * Собирает объект зоны. Датчиков и клапанов минимум по одному: зона без датчика
 * не имеет источника сигнала, а без клапана — исполнительного механизма.
 * @param {object} options Состав зоны.
 * @returns {{loop: object, valves: Array<object>}} Шлейф и клапаны зоны.
 */
export const createLeakZone = ({ id = null, sensors = 1, valves = 1, sensorItems = null, valveItems = null } = {}) => {
    const zoneId = id ?? generateLeakId();
    const loopSensors = Array.isArray(sensorItems) && sensorItems.length > 0
        ? sensorItems.map((sensor) => ({ ...createLeakSensor(sensor?.id ?? null), ...sensor, connection_type: undefined }))
        : Array.from({ length: Math.max(1, sensors) }, () => createLeakSensor());
    // valves: 0 допустимо и означает «клапаны не создавать» — так мигрируют
    // старые схемы, где клапанов не было: выдумывать оборудование нельзя.
    const zoneValves = Array.isArray(valveItems) && valveItems.length > 0
        ? valveItems.map((valve) => ({ ...valve, leak_zone_id: zoneId }))
        : Array.from({ length: Math.max(0, valves) }, () => createLeakValve(zoneId));

    return {
        loop: {
            id: zoneId,
            device_type: 'sensor',
            type: LEAK_LOOP_TYPE,
            connection_type: 'di',
            additions: loopSensors.map((sensor) => {
                const { connection_type: droppedConnectionType, ...rest } = sensor;
                return rest;
            }),
        },
        valves: zoneValves,
    };
};

/**
 * Приводит старую модель протечки к зонам.
 *
 * Legacy-вход: плоские `leak-sensor` в `sensors`/`wired_devices` плюс флаг
 * `unified_leak_loop`. При включённом флаге все датчики физически сидели на
 * одном входе — это одна зона. Без флага каждый датчик занимал свой вход, то
 * есть каждому соответствует своя зона: так сохраняется исходная загрузка DI.
 * Клапаны старых схем ни к чему не привязаны — они уходят в первую зону.
 *
 * @param {object} scheme Схема во входном или уже новом формате.
 * @returns {object} Схема с зонами и без legacy-полей протечки.
 */
export const materializeLeakZones = (scheme) => {
    if (!scheme || typeof scheme !== 'object') return scheme;

    const sensors = asArray(scheme.sensors);
    const wiredDevices = asArray(scheme.wired_devices);
    const legacySensors = [
        ...sensors.filter(isLeakSensor),
        ...wiredDevices.filter(isLeakSensor),
    ];
    const hasLegacyFlag = Object.prototype.hasOwnProperty.call(scheme, 'unified_leak_loop');
    if (legacySensors.length === 0 && !hasLegacyFlag) return scheme;

    const { unified_leak_loop: legacyUnifiedLoop, ...restScheme } = scheme;
    if (legacySensors.length === 0) return restScheme;

    const unattachedValves = wiredDevices.filter((device) => isLeakValve(device) && device?.leak_zone_id == null);
    const zoneSensorGroups = legacyUnifiedLoop === true
        ? [legacySensors]
        : legacySensors.map((sensor) => [sensor]);
    const zones = zoneSensorGroups.map((groupSensors, index) => createLeakZone({
        sensorItems: groupSensors,
        valveItems: index === 0 ? unattachedValves : [],
        valves: 0,
    }));

    const attachedValveIds = new Set(zones.flatMap(({ valves }) => valves.map((valve) => String(valve.id))));

    return {
        ...restScheme,
        sensors: [
            ...sensors.filter((sensor) => !isLeakSensor(sensor)),
            ...zones.map(({ loop }) => loop),
        ],
        wired_devices: [
            ...wiredDevices.filter((device) => (
                !isLeakSensor(device)
                && !(isLeakValve(device) && attachedValveIds.has(String(device.id)))
            )),
            ...zones.flatMap(({ valves }) => valves),
        ],
    };
};
