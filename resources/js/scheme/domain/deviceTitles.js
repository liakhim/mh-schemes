import { canonicalDeviceType } from './deviceTypes.js';

const wirelessDeviceNames = {
    thermostat: 'Беспроводной термостат',
    'outdoor-temperature-sensor': 'Беспроводной уличный датчик температуры',
    'wall-temperature-sensor': 'Беспроводной настенный датчик',
};

const oneWireDeviceNames = {
    thermostat: 'Проводной термостат',
    'flask-sensor': 'Проводной датчик',
    'flask-sensor-stupid-boiler': 'Датчик котла',
    'flask-sensor-gvs-boiler': 'Датчик бойлера',
    'flask-sensor-strategy': 'Датчик стратегии котлов',
    'flask-sensor-mixing-unit': 'Датчик смесительного узла',
    'flask-sensor-floor': 'Датчик пола',
    'flask-sensor-temperature': 'Цифровой датчик температуры в колбе',
    'wall-digital-sensor': 'Настенный цифровой датчик',
    'wall-temperature-sensor': 'Настенный проводной датчик',
    'ntc-1-wire': 'Модуль NTC-1-wire',
    rdt2: 'Модуль RDT2',
};

const materializedDeviceNames = {
    ...oneWireDeviceNames,
    discrete_pool: 'Дискретный бассейн',
    discrete_fire_alarm: 'Дискретная пожарка',
    discrete_signal: 'Дискретный сигнал',
    discrete_ventilation: 'Дискретная вентиляция',
    'leak-sensor': 'Датчик протечки',
    'pressure-sensor': 'Датчик давления',
    'mixing-ntc-sensor': 'NTC смесителя',
    'boiler-ntc-sensor': 'Датчик бойлера',
    '010pump': 'Насос 0-10V',
    '010servo': 'Сервопривод 0-10V',
    'pump-220v': 'Насос 220V',
    'boiler-pump': 'Насос бойлера',
    '220servo': 'Сервопривод 220V',
    valve: 'Запорный клапан',
    zoneServo: 'Сервопривод зоны',
    'other-equipment': 'Прочее оборудование',
    otherequipment: 'Прочее оборудование',
    smart: 'Умный котёл',
    stupid: 'Котёл',
};

export const getWirelessDeviceTitle = (devices, device, index) => {
    const baseName = wirelessDeviceNames[device.type] || 'Беспроводное устройство';
    const systemNumber = devices
        .slice(0, index + 1)
        .filter((item) => item.type === device.type)
        .length;
    return `${baseName} ${systemNumber}`;
};

export const getOneWireDeviceTitle = (devices, device, index) => {
    const normalizedType = canonicalDeviceType(device.type);
    const baseName = oneWireDeviceNames[normalizedType] || '1-wire устройство';
    const systemNumber = devices
        .slice(0, index + 1)
        .filter((item) => canonicalDeviceType(item.type) === normalizedType)
        .length;
    return `${baseName} ${systemNumber}`;
};

const makeDeviceTitle = (device, counters) => {
    const type = canonicalDeviceType(device?.type);
    const baseName = materializedDeviceNames[type] || 'Устройство';
    const nextIndex = (counters.get(type) || 0) + 1;
    counters.set(type, nextIndex);
    return `${baseName} ${nextIndex}`;
};

const withDeviceTitle = (device, counters) => {
    if (!device || typeof device !== 'object') return device;
    if (canonicalDeviceType(device.type) === 'ntc-sensor') return device;

    return {
        ...device,
        title: device.title || device.titile || makeDeviceTitle(device, counters),
    };
};

const mapDeviceLine = (line, counters) => (
    Array.isArray(line) ? line.map((device) => withDeviceTitle(device, counters)) : line
);

const mapOneWireLine = (line, counters) => (
    Array.isArray(line)
        ? line.map((device) => {
            const titledDevice = withDeviceTitle(device, counters);
            if (!titledDevice || typeof titledDevice !== 'object') return titledDevice;

            return {
                ...titledDevice,
                ntc1_devices: mapDeviceLine(titledDevice.ntc1_devices, counters),
                ntc2_devices: mapDeviceLine(titledDevice.ntc2_devices, counters),
            };
        })
        : line
);

export const assignMaterializedDeviceTitles = (scheme) => {
    const counters = new Map();
    const controller = scheme?.controller && typeof scheme.controller === 'object'
        ? { ...scheme.controller }
        : scheme?.controller;

    if (controller && typeof controller === 'object') {
        [
            'bus_devices',
            'relay_devices',
            'relay_s_devices',
            'di_devices',
            'leak_sensor_devices',
            'devices_420',
            'devices420',
            '220_servo_devices',
            'relay_s_valve_devices',
            'relay_boiler_gvs_devices',
            'relay_220pump_devices',
            'relay_220pump5_devices',
            'relay_220pump3_devices',
            'strategy_sensor_devices',
            'boiler_sensor_devices',
            'mixing_ntc_devices',
        ].forEach((lineKey) => {
            controller[lineKey] = mapDeviceLine(controller[lineKey], counters);
        });
        controller.one_wire_devices = mapOneWireLine(controller.one_wire_devices, counters);
    }

    const extModules = Array.isArray(scheme?.ext_modules)
        ? scheme.ext_modules.map((moduleItem) => {
            if (!moduleItem || typeof moduleItem !== 'object') return moduleItem;
            return {
                ...moduleItem,
                bus_devices: mapDeviceLine(moduleItem.bus_devices, counters),
                relay_devices: mapDeviceLine(moduleItem.relay_devices, counters),
                relay_s_devices: mapDeviceLine(moduleItem.relay_s_devices, counters),
                channel_devices: mapDeviceLine(moduleItem.channel_devices, counters),
                di_devices: mapDeviceLine(moduleItem.di_devices, counters),
                one_wire_devices: mapOneWireLine(moduleItem.one_wire_devices, counters),
            };
        })
        : scheme?.ext_modules;

    const diModules = Array.isArray(scheme?.di_modules)
        ? scheme.di_modules.map((moduleItem) => {
            if (!moduleItem || typeof moduleItem !== 'object') return moduleItem;
            return {
                ...moduleItem,
                relay_devices: mapDeviceLine(moduleItem.relay_devices, counters),
                relay_s_devices: mapDeviceLine(moduleItem.relay_s_devices, counters),
            };
        })
        : scheme?.di_modules;

    return {
        ...scheme,
        controller,
        ext_modules: extModules,
        di_modules: diModules,
    };
};
