import { canonicalDeviceType } from './deviceTypes.js';

const SMART2_POWER_CHAIN_MODULE_TYPES = new Set(['bl2', 'rl6', 'rl6s', 'io4', 'di6', 'rl2', 'rl2s']);
const GROUPED_RELAY_SUPPLY_PORT_PATTERN = /^RELAY(?:-S)?-(?:1-2|1-2-3|4-5-6)-A$/i;

export const getGroupedRelaySupplyLabel = (portName) => (
    GROUPED_RELAY_SUPPLY_PORT_PATTERN.test(String(portName || '').trim()) ? 'L' : null
);

export const getRelaySupplyLabel = (portName, ownerType) => {
    if (getGroupedRelaySupplyLabel(portName)) return 'L';
    const normalizedPortName = String(portName || '').trim().toUpperCase();
    if (canonicalDeviceType(ownerType) === 'pro' && /^RELAY-S-[1-4]-A$/.test(normalizedPortName)) return 'L';
    return canonicalDeviceType(ownerType) === 'rl2' && /^RELAY-[12]-A$/.test(normalizedPortName) ? 'L' : null;
};

export const getRelayDeviceAtPhysicalSlot = (devices, targetSlot) => {
    if (!Array.isArray(devices) || !Number.isInteger(targetSlot) || targetSlot < 0) return null;
    const occupied = new Set();

    for (let index = 0; index < devices.length; index += 1) {
        const device = devices[index];
        if (!device) continue;
        const storedSlot = Number(device.relay_slot_index);
        let startSlot = device.relay_slot_index != null && Number.isInteger(storedSlot) && storedSlot >= 0
            ? storedSlot
            : index;
        while (occupied.has(startSlot)) startSlot += 1;
        const span = String(device.connection_type || '').toLowerCase() === 'double_relay' ? 2 : 1;
        for (let slot = startSlot; slot < startSlot + span; slot += 1) occupied.add(slot);
        if (targetSlot >= startSlot && targetSlot < startSlot + span) return device;
    }

    return null;
};

export const getRelayDevicesAtPhysicalSlots = (devices, targetSlots) => (
    (Array.isArray(targetSlots) ? targetSlots : [])
        .map((targetSlot) => getRelayDeviceAtPhysicalSlot(devices, targetSlot))
        .filter(Boolean)
);

export const getIo4SharedTerminalDevices = (data, indexes, portName) => {
    const normalizedPortName = String(portName || '').toUpperCase();
    const devices = (Array.isArray(indexes) ? indexes : [])
        .map((index) => (
            (Array.isArray(data?.channel_devices) ? data.channel_devices[index] : null)
            || (Array.isArray(data?.devices_420) ? data.devices_420[index] : null)
            || (Array.isArray(data?.ai_devices) ? data.ai_devices[index] : null)
        ))
        .filter(Boolean);
    const uniqueDevices = devices.filter((device, index, items) => items.findIndex((candidate) => (
        candidate === device
        || (candidate?.id != null && device?.id != null && candidate.id === device.id)
    )) === index);

    return uniqueDevices.filter((device) => {
        const type = canonicalDeviceType(device?.type);
        const connectionTypes = String(device?.connection_type || '')
            .toLowerCase()
            .split('|')
            .map((value) => value.trim());
        if (normalizedPortName.endsWith('-V+')) {
            return type === 'pressure-sensor' || connectionTypes.includes('4-20');
        }
        if (normalizedPortName.endsWith('-GND')) {
            return type === 'ntc-sensor'
                || type === 'boiler-ntc-sensor'
                || type === 'mixing-ntc-sensor'
                || connectionTypes.includes('ntc');
        }
        return true;
    });
};

export const getSmart2InstallationPowerChainHead = (items) => (
    (Array.isArray(items) ? items : []).find((item) => (
        SMART2_POWER_CHAIN_MODULE_TYPES.has(canonicalDeviceType(item?.type || item?.data?.type))
    )) || null
);

export const buildSmart2InstallationDiConnections = ({
    hasUps,
    moduleLabels,
    controllerLabel = 'SMART2',
}) => {
    const controllerPortLabels = {};
    const modulePortLabels = moduleLabels.map(() => ({}));
    const upsPortLabels = {};
    let pairIndex = 0;

    if (hasUps) {
        controllerPortLabels[0] = 'UPS';
        controllerPortLabels[1] = 'UPS';
        upsPortLabels[0] = controllerLabel;
        upsPortLabels[1] = controllerLabel;
        pairIndex = 1;
    }

    moduleLabels.forEach((label, moduleIndex) => {
        if (pairIndex >= 2) return;
        const firstPortIndex = pairIndex * 2;
        controllerPortLabels[firstPortIndex] = label;
        controllerPortLabels[firstPortIndex + 1] = label;
        modulePortLabels[moduleIndex][0] = controllerLabel;
        modulePortLabels[moduleIndex][1] = controllerLabel;
        pairIndex += 1;
    });

    return { controllerPortLabels, modulePortLabels, upsPortLabels };
};
