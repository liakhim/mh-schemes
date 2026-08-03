import { canonicalDeviceType } from './deviceTypes.js';
import { getDeviceBaseTitle, getDeviceStoredTitle } from './deviceTitles.js';

const PUBLIC_DEVICE_BUCKETS = ['boilers', 'wireless_devices', 'wired_devices', 'sensors'];

const CONTROLLER_LABELS = {
    go: 'GO',
    'go+': 'GO+',
    smart2: 'SMART2',
    ecosmart: 'ECOsmart',
    pro: 'PRO',
};

const MODULE_LABELS = {
    bl2: 'BL2',
    rl6: 'RL6',
    rl6s: 'RL6S',
    io4: 'IO4',
    di6: 'DI6',
    rl2: 'RL2',
    rl2s: 'RL2S',
    'ntc-1-wire': 'NTC-1-wire',
    rdt2: 'RDT2',
};

const getComment = (device) => (
    typeof device?.comment === 'string' ? device.comment.trim() : ''
);

export const collectEquipmentTableRows = (publicScheme) => {
    const rows = [];
    const counters = new Map();
    const seenIds = new Set();

    const controllerType = canonicalDeviceType(
        typeof publicScheme?.controller === 'string'
            ? publicScheme.controller
            : publicScheme?.controller?.type,
    );
    if (controllerType) {
        rows.push({
            title: `Контроллер ${CONTROLLER_LABELS[controllerType] || controllerType}`,
            comment: '—',
        });
    }

    const moduleCounters = new Map();
    ['ext_modules', 'di_modules', 'one_wire_modules'].forEach((bucket) => {
        (Array.isArray(publicScheme?.[bucket]) ? publicScheme[bucket] : []).forEach((moduleItem) => {
            const type = canonicalDeviceType(typeof moduleItem === 'string' ? moduleItem : moduleItem?.type);
            if (!type) return;
            const index = (moduleCounters.get(type) || 0) + 1;
            moduleCounters.set(type, index);
            const sameTypeCount = ['ext_modules', 'di_modules', 'one_wire_modules']
                .flatMap((moduleBucket) => (Array.isArray(publicScheme?.[moduleBucket]) ? publicScheme[moduleBucket] : []))
                .filter((item) => canonicalDeviceType(typeof item === 'string' ? item : item?.type) === type)
                .length;
            rows.push({
                title: `Модуль расширения ${MODULE_LABELS[type] || type}${sameTypeCount > 1 ? ` ${index}` : ''}`,
                comment: '—',
            });
        });
    });

    const addDevice = (device, nested = false) => {
        if (!device || typeof device !== 'object' || !device.type) return;
        const type = canonicalDeviceType(device.type) || String(device.type);
        const idKey = device.id == null ? null : `${type}:id:${String(device.id)}`;
        if (idKey && seenIds.has(idKey)) return;

        const storedTitle = getDeviceStoredTitle(device);
        const comment = getComment(device);
        // В additions попадают также комплектные элементы без собственного инфоблока.
        if (!nested || storedTitle || comment) {
            if (idKey) seenIds.add(idKey);
            const index = (counters.get(type) || 0) + 1;
            counters.set(type, index);
            rows.push({
                title: storedTitle || `${getDeviceBaseTitle(device)} ${index}`,
                comment,
            });
        }

        (Array.isArray(device.additions) ? device.additions : [])
            .forEach((addition) => addDevice(addition, true));
    };

    PUBLIC_DEVICE_BUCKETS.forEach((bucket) => {
        (Array.isArray(publicScheme?.[bucket]) ? publicScheme[bucket] : [])
            .forEach((device) => addDevice(device));
    });

    return rows;
};
