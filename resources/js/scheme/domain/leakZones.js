import { canonicalDeviceType } from './deviceTypes.js';

/**
 * Зона контроля протечки — шлейф датчиков. Физически все датчики зоны сидят
 * на одном дискретном входе, поэтому
 * в схеме зона представлена ОДНИМ устройством `leak-loop` в публичном `sensors`:
 * так «одно устройство = один слот» остаётся верным для DI-балансировщика,
 * `connection_layout` и отрисовки слотов.
 *
 * Датчики лежат внутри `additions` и намеренно не имеют `connection_type`:
 * самостоятельного подключения у них нет. Клапаны остаются независимыми
 * устройствами в `wired_devices` и каждый занимает два соседних relay-порта.
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

/** Все независимые запорные клапаны схемы. */
export const getLeakValves = (scheme) => asArray(scheme?.wired_devices).filter(isLeakValve);

/** Все зоны схемы в порядке их появления в `sensors`. */
export const getLeakZones = (scheme) => asArray(scheme?.sensors).filter(isLeakLoop);

export const createLeakSensor = (id = null) => ({
    id: id ?? generateLeakId(),
    device_type: 'sensor',
    type: LEAK_SENSOR_TYPE,
});

export const createLeakValve = (id = null) => ({
    id: id ?? generateLeakId(),
    device_type: 'equipment',
    type: LEAK_VALVE_TYPE,
    connection_type: 'double_relay',
    additions: [],
});

/**
 * Собирает шлейф датчиков и, при необходимости, независимые клапаны.
 * @param {object} options Состав зоны.
 * @returns {{loop: object, valves: Array<object>}} Шлейф и клапаны зоны.
 */
export const createLeakZone = ({ id = null, sensors = 1, valves = 0, sensorItems = null, valveItems = null } = {}) => {
    const zoneId = id ?? generateLeakId();
    const loopSensors = Array.isArray(sensorItems) && sensorItems.length > 0
        ? sensorItems.map((sensor) => ({ ...createLeakSensor(sensor?.id ?? null), ...sensor, connection_type: undefined }))
        : Array.from({ length: Math.max(1, sensors) }, () => createLeakSensor());
    // valves: 0 допустимо и означает «клапаны не создавать» — так мигрируют
    // старые схемы, где клапанов не было: выдумывать оборудование нельзя.
    const zoneValves = Array.isArray(valveItems) && valveItems.length > 0
        ? valveItems.map((valve) => {
            const { leak_zone_id: removedZoneId, ...independentValve } = valve;
            return independentValve;
        })
        : Array.from({ length: Math.max(0, valves) }, () => createLeakValve());

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
 * Клапаны не входят в зоны; устаревшая ссылка `leak_zone_id` удаляется.
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
    const hasAttachedValves = wiredDevices.some((device) => isLeakValve(device) && device?.leak_zone_id != null);
    if (legacySensors.length === 0 && !hasLegacyFlag && !hasAttachedValves) return scheme;

    const { unified_leak_loop: legacyUnifiedLoop, ...restScheme } = scheme;
    const independentWiredDevices = wiredDevices.map((device) => {
        if (!isLeakValve(device) || device?.leak_zone_id == null) return device;
        const { leak_zone_id: removedZoneId, ...independentValve } = device;
        return independentValve;
    });
    if (legacySensors.length === 0) return { ...restScheme, wired_devices: independentWiredDevices };

    const zoneSensorGroups = legacyUnifiedLoop === true
        ? [legacySensors]
        : legacySensors.map((sensor) => [sensor]);
    const zones = zoneSensorGroups.map((groupSensors) => createLeakZone({
        sensorItems: groupSensors,
        valves: 0,
    }));

    return {
        ...restScheme,
        sensors: [
            ...sensors.filter((sensor) => !isLeakSensor(sensor)),
            ...zones.map(({ loop }) => loop),
        ],
        wired_devices: independentWiredDevices.filter((device) => !isLeakSensor(device)),
    };
};
