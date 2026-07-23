import { canonicalDeviceType } from './domain/deviceTypes.js';
import { collectConnectionLayout, getStableIdKey } from './domain/connectionAssignments.js';

const INTERNAL_METADATA_KEYS = new Set([
    'ownerThermostatId',
    'ownerThermostatKey',
    'ownerExtModuleIndex',
    'ownerExtModuleId',
    'ownerServo010Id',
    'mixing_owner_key',
    'relay_slot_index',
    'connectionAssignmentGeneratedId',
]);

const MATERIALIZED_LINE_KEYS = new Set([
    'one_wire_devices',
    'ext_devices',
    'relay_devices',
    'relay_s_devices',
    'bus_devices',
    'di_devices',
    'channel_devices',
    'ai_devices',
    'modbus_devices',
    'devices_420',
    'devices420',
    'ntc1_devices',
    'ntc2_devices',
    '220_servo_devices',
    'relay_s_valve_devices',
    'relay_boiler_gvs_devices',
    'relay_220pump_devices',
    'relay_220pump5_devices',
    'relay_220pump3_devices',
    'leak_sensor_devices',
    'strategy_sensor_devices',
    'boiler_sensor_devices',
    'mixing_ntc_devices',
]);

const ONE_WIRE_MODULE_TYPES = new Set(['ntc-1-wire', 'rdt2']);
const BOILER_TYPES = new Set(['smart', 'stupid', 'stupidboiler', 'stupid-boiler']);

const isFloorSensor = (device) => {
    const type = canonicalDeviceType(device?.type);
    return type === 'floor-sensor' || type === 'flask-sensor-floor';
};

const collapseThermostatFloorAdditions = (items) => {
    const devices = (Array.isArray(items) ? items : []).filter(Boolean);
    const consumed = new Set();

    return devices.map((device, index) => {
        if (canonicalDeviceType(device?.type) !== 'thermostat') return device;
        const ownerKey = device?.ownerThermostatKey;
        const additions = devices.filter((candidate, candidateIndex) => {
            if (candidateIndex === index || !isFloorSensor(candidate)) return false;
            const belongsByKey = ownerKey && candidate?.ownerThermostatKey === ownerKey;
            const belongsById = device?.id != null && candidate?.ownerThermostatId === device.id;
            if (!belongsByKey && !belongsById) return false;
            consumed.add(candidateIndex);
            return true;
        });
        if (additions.length === 0) return device;
        return {
            ...device,
            additions: mergePublicCopies(Array.isArray(device.additions) ? device.additions : [], additions),
        };
    }).filter((_, index) => !consumed.has(index));
};

const collapseServo010Additions = (items) => {
    const devices = collapseThermostatFloorAdditions(items);
    const consumed = new Set();

    return devices.map((device, index) => {
        const type = canonicalDeviceType(device?.type);
        if ((type !== '010servo' && type !== '010pump') || device?.id == null) return device;
        const additions = devices.filter((candidate, candidateIndex) => {
            if (candidateIndex === index) return false;
            const isOwnedMixingSensor = canonicalDeviceType(candidate?.type) === 'mixing-ntc-sensor'
                && candidate?.ownerServo010Id === device.id;
            if (isOwnedMixingSensor) consumed.add(candidateIndex);
            return isOwnedMixingSensor;
        });
        if (additions.length === 0) return device;
        return {
            ...device,
            additions: mergePublicCopies(Array.isArray(device.additions) ? device.additions : [], additions),
        };
    }).filter((_, index) => !consumed.has(index));
};

const stripInternalMetadata = (value) => {
    if (Array.isArray(value)) return value.map(stripInternalMetadata);
    if (!value || typeof value !== 'object') return value;

    return Object.fromEntries(Object.entries(value)
        .filter(([key]) => !INTERNAL_METADATA_KEYS.has(key) && !(key === 'id' && value.connectionAssignmentGeneratedId))
        .map(([key, item]) => [key, stripInternalMetadata(item)]));
};

const withoutMaterializedLines = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    return Object.fromEntries(Object.entries(value).filter(([key]) => (
        !MATERIALIZED_LINE_KEYS.has(key) && key !== 'ecosmart_bl2'
    )));
};

const isBoiler = (device) => device?.device_type === 'boiler'
    || BOILER_TYPES.has(String(device?.type || '').toLowerCase());

const isSensor = (device) => {
    if (device?.device_type === 'sensor') return true;
    const type = canonicalDeviceType(device?.type);
    return Boolean(type && (type.includes('sensor') || type === 'floor-sensor'));
};

const normalizeEcosmartSensor = (device) => {
    const type = canonicalDeviceType(device?.type);
    if (type === 'flask-sensor-strategy' || type === 'flask-sensor-gvs-boiler') {
        return { ...device, type, connection_type: '1-wire|ntc' };
    }
    return device;
};

const makeBuckets = (scheme) => ({
    root: {
        boilers: Array.isArray(scheme?.boilers) ? [...scheme.boilers] : [],
        wired_devices: Array.isArray(scheme?.wired_devices) ? [...scheme.wired_devices] : [],
        sensors: Array.isArray(scheme?.sensors) ? [...scheme.sensors] : [],
        one_wire_modules: [],
    },
    materialized: {
        boilers: [],
        wired_devices: [],
        sensors: [],
        one_wire_modules: [],
    },
});

const collectDevice = (device, buckets, source = 'materialized') => {
    if (!device || typeof device !== 'object') return;
    const target = buckets[source];
    const type = canonicalDeviceType(device.type);
    if (ONE_WIRE_MODULE_TYPES.has(type)) {
        collectMaterializedLines(device, buckets);
        target.one_wire_modules.push(withoutMaterializedLines(device));
        return;
    }
    if (isBoiler(device)) target.boilers.push(device);
    else if (isSensor(device)) target.sensors.push(normalizeEcosmartSensor(device));
    else target.wired_devices.push(device);
};

const collectMaterializedLines = (owner, buckets) => {
    if (!owner || typeof owner !== 'object') return;
    MATERIALIZED_LINE_KEYS.forEach((lineKey) => {
        collapseServo010Additions(owner[lineKey]).forEach((device) => collectDevice(device, buckets));
    });
};

const collectRootOneWireModules = (scheme, buckets) => {
    (Array.isArray(scheme?.one_wire_modules) ? scheme.one_wire_modules : []).forEach((moduleItem) => {
        if (typeof moduleItem === 'string') {
            buckets.root.one_wire_modules.push(moduleItem);
            return;
        }
        collectDevice(moduleItem, buckets, 'root');
    });
};

const getIdKey = (item) => {
    if (!item || typeof item !== 'object' || item.id == null) return null;
    return `${canonicalDeviceType(item.type) || 'unknown'}:id:${getStableIdKey(item.id)}`;
};

const getStableSignature = (value) => {
    if (Array.isArray(value)) return `[${value.map(getStableSignature).join(',')}]`;
    if (!value || typeof value !== 'object') return JSON.stringify(value);
    return `{${Object.keys(value).sort().map((key) => (
        `${JSON.stringify(key)}:${getStableSignature(value[key])}`
    )).join(',')}}`;
};

const mergePublicCopies = (rootItems, materializedItems) => {
    const root = stripInternalMetadata(rootItems);
    const materialized = stripInternalMetadata(materializedItems);
    const result = [];
    const idIndexes = new Map();
    const rootIdless = new Map();
    const materializedIdless = new Map();

    const addIdItem = (item, preferCurrent) => {
        const key = getIdKey(item);
        if (!key) return false;
        if (!idIndexes.has(key)) {
            idIndexes.set(key, result.length);
            result.push(item);
        } else if (preferCurrent) {
            result[idIndexes.get(key)] = item;
        }
        return true;
    };
    const groupIdless = (items, groups) => items.forEach((item) => {
        if (addIdItem(item, groups === materializedIdless)) return;
        const signature = getStableSignature(item);
        if (!groups.has(signature)) groups.set(signature, []);
        groups.get(signature).push(item);
    });

    groupIdless(root, rootIdless);
    groupIdless(materialized, materializedIdless);
    new Set([...rootIdless.keys(), ...materializedIdless.keys()]).forEach((signature) => {
        const rootCopies = rootIdless.get(signature) || [];
        const materializedCopies = materializedIdless.get(signature) || [];
        result.push(...materializedCopies);
        if (rootCopies.length > materializedCopies.length) {
            result.push(...rootCopies.slice(materializedCopies.length));
        }
    });
    return result;
};

const finalizeBuckets = (buckets) => Object.fromEntries(
    Object.keys(buckets.root).map((key) => [
        key,
        mergePublicCopies(buckets.root[key], buckets.materialized[key]),
    ]),
);

/** Returns devices allocated inside modules to their public root collections. */
export const restorePublicDevicesFromModules = (scheme, modules) => {
    const buckets = makeBuckets(scheme);
    collectRootOneWireModules(scheme, buckets);
    (Array.isArray(modules) ? modules : []).forEach((moduleItem) => collectMaterializedLines(moduleItem, buckets));
    return { ...scheme, ...finalizeBuckets(buckets) };
};

/** Collapses the editor's materialized model into canonical public incoming_scheme. */
export const serializePublicScheme = (scheme) => {
    if (!scheme || typeof scheme !== 'object') return scheme;
    const buckets = makeBuckets(scheme);
    collectRootOneWireModules(scheme, buckets);
    const connectionLayout = collectConnectionLayout(scheme);

    const controllerSource = scheme.controller && typeof scheme.controller === 'object'
        ? scheme.controller
        : { type: canonicalDeviceType(scheme.controller) };
    collectMaterializedLines(controllerSource, buckets);
    (Array.isArray(scheme.ext_modules) ? scheme.ext_modules : []).forEach((moduleItem) => collectMaterializedLines(moduleItem, buckets));
    (Array.isArray(scheme.di_modules) ? scheme.di_modules : []).forEach((moduleItem) => collectMaterializedLines(moduleItem, buckets));

    const controller = withoutMaterializedLines(controllerSource);
    const {
        ecosmart_bl2: removedLegacyEcosmartBl2,
        connection_layout: removedConnectionLayout,
        ...schemeWithoutLegacyEcosmartBl2
    } = scheme;
    return stripInternalMetadata({
        ...schemeWithoutLegacyEcosmartBl2,
        controller,
        ext_modules: Array.isArray(scheme.ext_modules)
            ? scheme.ext_modules.map(withoutMaterializedLines)
            : scheme.ext_modules,
        di_modules: Array.isArray(scheme.di_modules)
            ? scheme.di_modules.map(withoutMaterializedLines)
            : scheme.di_modules,
        ...(connectionLayout ? { connection_layout: connectionLayout } : {}),
        ...finalizeBuckets(buckets),
    });
};
