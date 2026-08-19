import { canonicalDeviceType } from './deviceTypes.js';
import { getDeviceBaseTitle, getDeviceStoredTitle } from './deviceTitles.js';

const MODULE_LABELS = {
    bl2: 'Модуль BL2',
    ecosmartbl2: 'Модуль ECOsmart BL2',
    rl6: 'Модуль RL6',
    rl6s: 'Модуль RL6S',
    rl6w: 'Модуль RL6W',
    rl6sw: 'Модуль RL6SW',
    io4: 'Модуль IO4',
    di6: 'Модуль DI6',
    rl2: 'Модуль RL2',
    rl2s: 'Модуль RL2S',
    'ntc-1-wire': 'Модуль NTC 1-Wire',
    rdt2: 'Модуль RDT2',
};

const POWER_MODULE_LABELS = {
    'circuit-breaker': 'Автоматический выключатель',
    circuitbreaker: 'Автоматический выключатель',
    'power-unit': 'Блок питания',
    powerunit: 'Блок питания',
    ups: 'Источник бесперебойного питания',
};

const SENSOR_LABELS = {
    'ntc-sensor': 'Проводной NTC-датчик в колбе',
    'wall-ntc-sensor': 'Проводной настенный NTC-датчик',
};

const MODULE_SECTIONS = new Set(['ext_modules', 'di_modules', 'one_wire_modules', 'wifi_modules']);

export const getSelectionConfigItemLabel = (item, section) => {
    if (item && typeof item === 'object') {
        const storedTitle = getDeviceStoredTitle(item);
        if (storedTitle) return storedTitle;
        if (typeof item._label === 'string' && item._label.trim()) return item._label.trim();
        if (typeof item.name === 'string' && item.name.trim()) return item.name.trim();
    }

    const type = canonicalDeviceType(typeof item === 'string' ? item : item?.type);
    if (MODULE_SECTIONS.has(section)) return MODULE_LABELS[type] || 'Модуль расширения';
    if (section === 'power_modules') return POWER_MODULE_LABELS[type] || 'Модуль питания';
    if (SENSOR_LABELS[type]) return SENSOR_LABELS[type];
    if (section === 'wireless_devices' && type === 'thermostat') return 'Беспроводной термостат';

    return getDeviceBaseTitle({ type });
};
