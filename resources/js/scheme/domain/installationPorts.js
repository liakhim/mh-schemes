import { ECOSMART_LEAK_SENSOR_COLORS } from '../../constants.js';
import { canonicalDeviceType } from './deviceTypes.js';
import { getDeviceStoredTitle } from './deviceTitles.js';
import {
    getDi6PhysicalDevices,
    getEcosmartMixingNtcIndex,
    getIo4SharedTerminalDevices,
    getRelayDeviceAtPhysicalSlot,
    getRelayDevicesAtPhysicalSlots,
    getRelaySupplyLabel,
} from './installationDi.js';

export const INSTALLATION_DEVICE_TYPE_TITLES = {
    'boiler-pump': 'Насос бойлера',
    'pump-220v': 'Насос 220V',
    '010pump': 'Насос 0-10V',
    '010servo': 'Сервопривод 0-10V',
    zoneServo: 'Сервопривод зоны',
    '220servo': 'Сервопривод 220',
    valve: 'Запорный клапан',
    stupid: 'Простой котёл',
    smart: 'Умный котел',
    thermostat: 'Термостат',
    'flask-sensor': 'Датчик температуры',
    'ntc-sensor': 'NTC датчик',
    'wall-ntc-sensor': 'Настенный NTC датчик',
    'leak-sensor': 'Датчик протечки',
    'leak-loop': 'Зона контроля протечки',
    pressure: 'Датчик давления',
    'pressure-sensor': 'Датчик давления',
    rdt2: 'RDT2',
    'ntc-1-wire': 'NTC-1-wire',
    io4: 'IO4',
    bl2: 'BL2',
    rl2: 'RL2',
    rl2s: 'RL2S',
    rl6: 'RL6',
    rl6s: 'RL6S',
    rl6w: 'RL6W',
    rl6sw: 'RL6SW',
    di6: 'DI6',
    'circuit-breaker': 'Авто.выключатель',
    'power-unit': 'Блок питания',
    ups: 'UPS',
    pro: 'PRO',
    smart2: 'SMART2',
    discrete_pool: 'Дискретный бассейн',
    discrete_fire_alarm: 'Дискретная пожарка',
    discrete_signal: 'Дискретный сигнал',
    discrete_ventilation: 'Дискретная вентиляция',
};

export const POWER_UNIT_LABEL = 'Блок питания';

export const getInstallationDeviceLabel = (device, fallback = 'Подключение') => {
    if (!device || typeof device !== 'object') return fallback;
    const storedTitle = getDeviceStoredTitle(device);
    if (storedTitle) return storedTitle;
    if (typeof device.name === 'string' && device.name.trim()) return device.name.trim();
    const type = canonicalDeviceType(device.type);
    return INSTALLATION_DEVICE_TYPE_TITLES[type] || type || fallback;
};

const isThermostatFloorSensorAddition = (device) => {
    const type = canonicalDeviceType(device?.type);
    return type === 'floor-sensor' || type === 'flask-sensor-floor';
};

export const hasExtThermostatFloorSensor = (device) => (
    canonicalDeviceType(device?.type) === 'thermostat'
    && Array.isArray(device?.additions)
    && device.additions.some(isThermostatFloorSensorAddition)
);

export const getControllerExtFloorThermostat = (item) => {
    const controllerType = canonicalDeviceType(item?.type || item?.data?.type);
    if (controllerType !== 'pro' && controllerType !== 'ecosmart') return null;
    const extDevices = Array.isArray(item?.data?.ext_devices) ? item.data.ext_devices : [];
    return extDevices.find((device) => {
        const connectionTypes = String(device?.connection_type || '')
            .toUpperCase()
            .split('|')
            .map((value) => value.trim());
        return connectionTypes.includes('EXT') && hasExtThermostatFloorSensor(device);
    }) || null;
};

const isStupidBoilerType = (type) => {
    const normalizedType = canonicalDeviceType(type);
    const rawType = typeof type === 'string' ? type.toLowerCase() : '';
    return normalizedType === 'stupid' || rawType === 'stupidboiler' || rawType === 'stupid-boiler';
};

export const parseInstallationPortSlot = (name) => {
    const tokens = String(name || '').toUpperCase().trim().split(/\s+/);
    const normalized = tokens[0];
    const tag = tokens.slice(1).join(' ');
    if (tag && /-(?:[AB]|GND|V\+)$/.test(normalized)) {
        if (tag === 'BOILER-GVS') return { line: 'ecosmartRole', key: 'relay_boiler_gvs_devices', index: 0, fallback: 'Насос бойлера ГВС' };
        if (tag === '220PUMP') {
            if (normalized.startsWith('RELAY-2-')) return { line: 'ecosmartRole', key: 'relay_220pump_devices', index: 0, fallback: 'Насос 220V' };
            if (normalized.startsWith('RELAY-5-')) return { line: 'ecosmartRole', key: 'relay_220pump5_devices', index: 0, fallback: 'Насос 220V' };
            if (normalized.startsWith('RELAY-3-')) return { line: 'ecosmartRole', key: 'relay_220pump3_devices', index: 0, fallback: 'Насос 220V' };
        }
        if (tag === 'VALVE') return { line: 'ecosmartRole', key: 'relay_s_valve_devices', index: 0, fallback: 'Запорный клапан' };
        if (tag === 'CASCADE') return { line: 'ecosmartRole', key: 'strategy_sensor_devices', index: 0, fallback: 'Датчик стратегии' };
        if (tag === 'BOILER' && normalized.startsWith('NTC-')) return { line: 'ecosmartRole', key: 'boiler_sensor_devices', index: 0, fallback: 'Датчик бойлера' };
        if (tag === 'MIXING') {
            const mixingNtcIndex = getEcosmartMixingNtcIndex(normalized);
            if (mixingNtcIndex != null) return { line: 'ecosmartRole', key: 'mixing_ntc_devices', index: mixingNtcIndex, fallback: 'NTC смесителя' };
        }
    }
    let match;
    if ((match = /^RELAY-S-(\d+)(?:-(\d+))?(?:-(\d+))?-[AB]$/.exec(normalized))) {
        const indexes = [match[1], match[2], match[3]].filter(Boolean).map((value) => Number(value) - 1);
        return indexes.length > 1 ? { line: 'relaySRange', indexes } : { line: 'relayS', index: indexes[0] };
    }
    if ((match = /^RELAY-(4|6)-(?:V\+|GND)$/.exec(normalized))) return { line: 'relay', index: Number(match[1]) - 1 };
    if ((match = /^RELAY-(\d+)(?:-(\d+))?(?:-(\d+))?-(?:[AB]|COM|NO|NC)$/.exec(normalized))) {
        const indexes = [match[1], match[2], match[3]].filter(Boolean).map((value) => Number(value) - 1);
        return indexes.length > 1 ? { line: 'relayRange', indexes } : { line: 'relay', index: indexes[0] };
    }
    if ((match = /^BUS(?:-(\d+))?-[AB]$/.exec(normalized))) return { line: 'bus', index: match[1] ? Number(match[1]) - 1 : 0 };
    if ((match = /^DI-(?:IN-)?(\d+)(?:-(\d+))?(?:-(\d+))?-COM$/.exec(normalized))) {
        return { line: 'diRange', indexes: [match[1], match[2], match[3]].filter(Boolean).map((value) => Number(value) - 1) };
    }
    if ((match = /^CHANNEL-IN-(\d+)$/.exec(normalized))) return { line: 'channel', index: Number(match[1]) - 1 };
    if ((match = /^CHANNEL-(\d+)(?:-(\d+))?-(?:V\+|GND|COM)$/.exec(normalized))) {
        const start = Number(match[1]) - 1;
        const end = match[2] ? Number(match[2]) - 1 : start;
        return { line: 'channelRange', indexes: Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index) };
    }
    if ((match = /^DI-(?:OUT|IN)-(\d+)$/.exec(normalized))) return { line: 'di', index: Number(match[1]) - 1 };
    if ((match = /^DI-(?:OUT|IN)-(\d+)-(?:DI|V\+|GND)$/.exec(normalized))) return { line: 'di', index: Number(match[1]) - 1 };
    if ((match = /^DI-(\d+)$/.exec(normalized))) return { line: 'di', index: Number(match[1]) - 1 };
    if ((match = /^AI(?:-IN)?-?(\d+)?/.exec(normalized))) return { line: 'ai', index: match[1] ? Number(match[1]) - 1 : 0 };
    if ((match = /^4-20(?:-IN|-OUT)?-?(\d+)?/.exec(normalized))) return { line: '420', index: match[1] ? Number(match[1]) - 1 : 0 };
    if (normalized === 'MODBUS-A' || normalized === 'MODBUS-B') return { line: 'modbus', index: 0 };
    if ((match = /^NTC-(\d+)-[AB]$/.exec(normalized))) return { line: 'ntcChannel', index: Number(match[1]) };
    if (normalized.startsWith('1-WIRE-')) return { line: 'oneWire', index: null };
    return null;
};

const getInstallationRelayPortDevice = (item, portName) => {
    const slot = parseInstallationPortSlot(portName);
    const data = item?.data;
    if (!slot || !data || typeof data !== 'object') return null;
    if (slot.line === 'relay') return getRelayDeviceAtPhysicalSlot(data.relay_devices, slot.index);
    if (slot.line === 'relayRange') {
        const devices = getRelayDevicesAtPhysicalSlots(data.relay_devices, slot.indexes);
        return devices.find((device) => isStupidBoilerType(device?.type)) || devices[0] || null;
    }
    return null;
};

export const getInstallationPortLineColor = (name, item) => {
    const [terminal, ...tags] = String(name || '').toUpperCase().trim().split(/\s+/);
    const tag = tags.join(' ');
    const itemType = canonicalDeviceType(item?.type || item?.data?.type);
    const relayDevice = getInstallationRelayPortDevice(item, terminal);
    if (!tag && isStupidBoilerType(relayDevice?.type)) return '#2e7d32';
    if (getRelaySupplyLabel(terminal, itemType)) return '#d32f2f';
    if (itemType === 'io4') {
        if (/^CHANNEL-\d+-\d+-V\+$/.test(terminal)) return '#d32f2f';
        if (/^CHANNEL-\d+-\d+-GND$/.test(terminal)) return '#212121';
        const channelMatch = /^CHANNEL-IN-(\d+)$/.exec(terminal);
        if (channelMatch) {
            const channelIndex = Number(channelMatch[1]) - 1;
            const data = item?.data && typeof item.data === 'object' ? item.data : {};
            const device = (Array.isArray(data.channel_devices) ? data.channel_devices[channelIndex] : null)
                || (Array.isArray(data.devices_420) ? data.devices_420[channelIndex] : null)
                || (Array.isArray(data.ai_devices) ? data.ai_devices[channelIndex] : null);
            const type = canonicalDeviceType(device?.type);
            const connectionTypes = String(device?.connection_type || '').toLowerCase().split('|').map((value) => value.trim());
            return type === 'pressure-sensor' || connectionTypes.includes('4-20') ? '#f57c00' : '#1565c0';
        }
    }
    if (itemType === 'ecosmart') {
        if (/^NTC-\d+-A$/.test(terminal)) return '#212121';
        if (/^NTC-\d+-B$/.test(terminal)) return '#464EE3';
        if (/^RELAY-(?:4|6)-V\+$/.test(terminal) || terminal === 'RELAY-S-1-V+') return '#1565c0';
        if (/^RELAY-(?:4|6)-[AB]$/.test(terminal) || /^RELAY-S-1-[AB]$/.test(terminal)) return '#d32f2f';
        if (/^RELAY-(?:4|6)-GND$/.test(terminal) || terminal === 'RELAY-S-1-GND') return '#fbc02d';
        if (tag === '220PUMP' || tag === 'BOILER-GVS') {
            if (terminal.endsWith('-GND')) return '#fbc02d';
            const blueOnA = terminal.startsWith('RELAY-3-') || terminal.startsWith('RELAY-5-');
            if (terminal.endsWith('-A')) return blueOnA ? '#1565c0' : '#d32f2f';
            if (terminal.endsWith('-B')) return blueOnA ? '#d32f2f' : '#1565c0';
        }
        if (!tag && /^RELAY-1-[AB]$/.test(terminal)) return '#2e7d32';
        if (terminal === 'DI-IN-2-GND') return ECOSMART_LEAK_SENSOR_COLORS.gnd;
        if (terminal === 'DI-IN-2-DI') return ECOSMART_LEAK_SENSOR_COLORS.di;
        if (terminal === 'DI-IN-2-V+') return ECOSMART_LEAK_SENSOR_COLORS.vplus;
    }
    if (terminal === '1-WIRE-V+') return '#d32f2f';
    if (terminal === '1-WIRE-DAT') return '#fbc02d';
    if (terminal === '1-WIRE-GND') return '#212121';
    if (/^EXT-(?:IN-|OUT-)?A$/.test(terminal)) return '#fbc02d';
    if (/^EXT-(?:IN-|OUT-)?B$/.test(terminal)) return '#2e7d32';
    if (/^NTC-\d+-A$/.test(terminal)) return '#212121';
    if (/^NTC-\d+-B$/.test(terminal)) return '#464EE3';
    if (/^4-20.*-V\+$/.test(terminal)) return '#d32f2f';
    if (terminal.startsWith('4-20')) return '#f57c00';
    if (/^BUS(?:-\d+)?-[AB]$/.test(terminal) || terminal.startsWith('EXT-')) return '#2e7d32';
    if (/^MODBUS-[AB]$/.test(terminal)) return '#212121';
    if (terminal.startsWith('AI')) return '#4fc3f7';
    if (/^DI-(?:IN-|OUT-)?\d+(?:-DI)?$/.test(terminal)) return '#1565c0';
    if (/^RELAY(?:-S)?-.*-(?:A|COM)$/.test(terminal)) return '#212121';
    if (/^RELAY(?:-S)?-.*-(?:B|NO|NC)$/.test(terminal)) return '#d32f2f';
    if (terminal.includes('GND') || terminal.endsWith('-COM')) return '#212121';
    if (terminal.includes('V+') || terminal.includes('12V') || terminal.includes('VDC')) return '#d32f2f';
    return '#212121';
};

export const isInstallationPortOccupied = (item, port) => {
    const slot = parseInstallationPortSlot(port?.name);
    if (slot?.line === 'di' && item?.installationDiPortLabels && Object.prototype.hasOwnProperty.call(item.installationDiPortLabels, slot.index)) return true;
    if (slot && slot.line === 'di' && canonicalDeviceType(item?.type) === 'ups') return true;
    if (!slot) {
        const itemType = canonicalDeviceType(item?.type);
        const normalizedPortName = String(port?.name || '').toUpperCase();
        if (normalizedPortName.startsWith('ACID-BAT')) return true;
        if (itemType === 'power-unit') return normalizedPortName === 'L-IN' || /(?:EXT|VDC)-(?:IN|OUT)/.test(normalizedPortName);
        if (itemType === 'circuit-breaker') return normalizedPortName === 'L-IN' || normalizedPortName === 'L-OUT';
        return /(?:EXT|VDC)-(?:IN|OUT)/.test(normalizedPortName);
    }
    const data = item?.data;
    if (!data || typeof data !== 'object') return true;
    const hasAtIndex = (lineArray, index) => Array.isArray(lineArray) && (index == null ? lineArray.some(Boolean) : Boolean(lineArray[index]));
    const isEcosmartData = canonicalDeviceType(data?.type) === 'ecosmart';
    if (slot.line === 'ecosmartRole') return hasAtIndex(data[slot.key], slot.index);
    if (slot.line === 'relay') {
        if (isEcosmartData && slot.index === 5) return hasAtIndex(data['220_servo_devices'], 0);
        if (isEcosmartData && slot.index === 3) return hasAtIndex(data['220_servo_devices'], 1);
        return Boolean(getRelayDeviceAtPhysicalSlot(data.relay_devices, slot.index));
    }
    if (slot.line === 'relayRange') return slot.indexes.some((index) => getRelayDeviceAtPhysicalSlot(data.relay_devices, index));
    if (slot.line === 'relayS') return Boolean(getRelayDeviceAtPhysicalSlot(data.relay_s_devices, slot.index));
    if (slot.line === 'relaySRange') return slot.indexes.some((index) => getRelayDeviceAtPhysicalSlot(data.relay_s_devices, index));
    if (slot.line === 'bus') return hasAtIndex(data.bus_devices, slot.index);
    if (slot.line === 'diRange') {
        if (canonicalDeviceType(item?.type) === 'di6') return false;
        return slot.indexes.some((index) => hasAtIndex(data.di_devices, index) || hasAtIndex(data.channel_devices, index));
    }
    if (slot.line === 'di') {
        if (isEcosmartData && slot.index === 1) return hasAtIndex(data.leak_sensor_devices, 0);
        if (canonicalDeviceType(item?.type) === 'di6') return Boolean(getDi6PhysicalDevices(data)[slot.index]);
        if (hasAtIndex(data.di_devices, slot.index) || hasAtIndex(data.channel_devices, slot.index)) return true;
        return Array.isArray(item?.upsDiPortIndexes) && item.upsDiPortIndexes.includes(slot.index);
    }
    if (slot.line === 'channel') return hasAtIndex(data.channel_devices, slot.index) || hasAtIndex(data.devices_420, slot.index) || hasAtIndex(data.ai_devices, slot.index);
    if (slot.line === 'channelRange') {
        if (canonicalDeviceType(item?.type) === 'io4') return getIo4SharedTerminalDevices(data, slot.indexes, port?.name).length > 0;
        return slot.indexes.some((index) => hasAtIndex(data.channel_devices, index) || hasAtIndex(data.devices_420, index) || hasAtIndex(data.ai_devices, index));
    }
    if (slot.line === '420') return hasAtIndex(data.devices_420, slot.index);
    if (slot.line === 'ai') return hasAtIndex(data.ai_devices, slot.index);
    if (slot.line === 'modbus') return hasAtIndex(data.modbus_devices, null);
    if (slot.line === 'ntcChannel') return slot.index <= 3 ? hasAtIndex(data.ntc1_devices, slot.index - 1) : hasAtIndex(data.ntc2_devices, slot.index - 4);
    if (slot.line === 'oneWire') return !Array.isArray(data.one_wire_devices) || hasAtIndex(data.one_wire_devices, null);
    return true;
};

export const getInstallationPortConnectionLabel = (item, port, options = {}) => {
    const slot = parseInstallationPortSlot(port?.name);
    const data = item?.data;
    const normalizedPortName = String(port?.name || '').toUpperCase();
    const relayPortDevice = getInstallationRelayPortDevice(item, normalizedPortName);
    const relaySupplyLabel = isStupidBoilerType(relayPortDevice?.type) ? null : getRelaySupplyLabel(normalizedPortName, item?.type || item?.data?.type);
    if (relaySupplyLabel) return relaySupplyLabel;
    if (slot?.line === 'di' && item?.installationDiPortLabels && Object.prototype.hasOwnProperty.call(item.installationDiPortLabels, slot.index)) return item.installationDiPortLabels[slot.index] || null;
    if (slot && slot.line === 'di' && canonicalDeviceType(item?.type) === 'ups') return options.upsDiTargetLabel || 'DI контроллера';
    if (!slot) {
        const itemType = canonicalDeviceType(item?.type);
        if (normalizedPortName.startsWith('ACID-BAT')) return 'Батарея';
        if (itemType === 'power-unit' && normalizedPortName === 'L-IN') return 'Авто.выключатель';
        if (itemType === 'circuit-breaker' && normalizedPortName === 'L-IN') return 'Линия';
        if (itemType === 'circuit-breaker' && normalizedPortName === 'L-OUT') return POWER_UNIT_LABEL;
        if (normalizedPortName.includes('12VDC-OUT') || normalizedPortName.includes('VDC-OUT')) {
            if (options.powerNextLabel) return options.powerNextLabel;
            const extFloorThermostat = getControllerExtFloorThermostat(item);
            return extFloorThermostat ? getInstallationDeviceLabel(extFloorThermostat, 'Термостат EXT') : null;
        }
        if (normalizedPortName.includes('12VDC-IN') || normalizedPortName.includes('VDC-IN')) return options.powerPreviousLabel || null;
        if (normalizedPortName.includes('EXT-OUT')) {
            if (options.nextLabel) return options.nextLabel;
            const extDevices = Array.isArray(data?.ext_devices) ? data.ext_devices.filter(Boolean) : [];
            return extDevices.length > 0 ? getInstallationDeviceLabel(extDevices[0], 'Термостат EXT') : null;
        }
        if (normalizedPortName.includes('EXT-IN')) return options.previousLabel || null;
        return null;
    }
    if (!data || typeof data !== 'object') return null;
    const getAtIndex = (lineArray, index) => {
        if (!Array.isArray(lineArray)) return null;
        return index == null ? lineArray.find(Boolean) || null : lineArray[index] || null;
    };
    const getLabel = (device, fallback) => (device ? getInstallationDeviceLabel(device, fallback) : null);
    const isEcosmartData = canonicalDeviceType(data?.type) === 'ecosmart';
    if (slot.line === 'ecosmartRole') return getLabel(getAtIndex(data[slot.key], slot.index), slot.fallback);
    if (slot.line === 'relay') {
        if (isEcosmartData && slot.index === 5) return getLabel(getAtIndex(data['220_servo_devices'], 0), 'Сервопривод смесителя');
        if (isEcosmartData && slot.index === 3) return getLabel(getAtIndex(data['220_servo_devices'], 1), 'Сервопривод смесителя');
        return getLabel(getRelayDeviceAtPhysicalSlot(data.relay_devices, slot.index), `Реле ${slot.index + 1}`);
    }
    if (slot.line === 'relayRange') return getLabel(slot.indexes.map((index) => getRelayDeviceAtPhysicalSlot(data.relay_devices, index)).find(Boolean), 'Реле');
    if (slot.line === 'relayS') return getLabel(getRelayDeviceAtPhysicalSlot(data.relay_s_devices, slot.index), `Реле S ${slot.index + 1}`);
    if (slot.line === 'relaySRange') return getLabel(slot.indexes.map((index) => getRelayDeviceAtPhysicalSlot(data.relay_s_devices, index)).find(Boolean), 'Реле S');
    if (slot.line === 'bus') return getLabel(getAtIndex(data.bus_devices, slot.index), 'BUS');
    if (slot.line === 'diRange') {
        if (canonicalDeviceType(item?.type) === 'di6') return null;
        return getLabel(slot.indexes.map((index) => getAtIndex(data.di_devices, index) || getAtIndex(data.channel_devices, index)).find(Boolean), 'DI COM');
    }
    if (slot.line === 'di') {
        if (isEcosmartData && slot.index === 1) return getLabel(getAtIndex(data.leak_sensor_devices, 0), 'Датчик протечки');
        if (canonicalDeviceType(item?.type) === 'di6') return getLabel(getDi6PhysicalDevices(data)[slot.index], `DI ${slot.index + 1}`);
        return getLabel(getAtIndex(data.di_devices, slot.index), `DI ${slot.index + 1}`)
            || getLabel(getAtIndex(data.channel_devices, slot.index), `DI ${slot.index + 1}`)
            || (Array.isArray(item?.upsDiPortIndexes) && item.upsDiPortIndexes.includes(slot.index) ? 'UPS' : null);
    }
    if (slot.line === 'channel') return getLabel(getAtIndex(data.channel_devices, slot.index), 'Канал') || getLabel(getAtIndex(data.devices_420, slot.index), '4-20 mA') || getLabel(getAtIndex(data.ai_devices, slot.index), 'AI');
    if (slot.line === 'channelRange') {
        if (canonicalDeviceType(item?.type) === 'io4') {
            const connections = slot.indexes.flatMap((index) => getIo4SharedTerminalDevices(data, [index], port?.name).map((device) => ({ device, channel: index + 1 })));
            const labels = connections.map(({ device, channel }) => {
                const label = getInstallationDeviceLabel(device, 'Канал');
                return connections.length > 1 ? `CH${channel}: ${label}` : label;
            });
            return labels.join(' / ') || null;
        }
        return getLabel(slot.indexes.map((index) => getAtIndex(data.channel_devices, index) || getAtIndex(data.devices_420, index) || getAtIndex(data.ai_devices, index)).find(Boolean), 'Канал');
    }
    if (slot.line === '420') return getLabel(getAtIndex(data.devices_420, slot.index), '4-20 mA');
    if (slot.line === 'ai') return getLabel(getAtIndex(data.ai_devices, slot.index), `AI ${slot.index + 1}`);
    if (slot.line === 'modbus') return getLabel(getAtIndex(data.modbus_devices, null), 'Modbus');
    if (slot.line === 'ntcChannel') {
        const device = slot.index <= 3 ? getAtIndex(data.ntc1_devices, slot.index - 1) : getAtIndex(data.ntc2_devices, slot.index - 4);
        return getLabel(device, `NTC ${slot.index}`);
    }
    if (slot.line === 'oneWire') {
        if (!Array.isArray(data.one_wire_devices)) {
            if (normalizedPortName.includes(' OUT')) return options.nextLabel || 'Шина 1-wire';
            if (normalizedPortName.includes(' IN')) return options.previousLabel || 'Шина 1-wire';
            return port?.x >= 0.5 ? options.nextLabel || 'Шина 1-wire' : options.previousLabel || 'Шина 1-wire';
        }
        return getLabel(getAtIndex(data.one_wire_devices, null), '1-wire');
    }
    return null;
};
