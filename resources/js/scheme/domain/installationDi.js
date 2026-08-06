import { canonicalDeviceType } from './deviceTypes.js';

const SMART2_POWER_CHAIN_MODULE_TYPES = new Set(['bl2', 'rl6', 'rl6s', 'io4', 'di6', 'rl2', 'rl2s']);
const GROUPED_RELAY_SUPPLY_PORT_PATTERN = /^RELAY(?:-S)?-(?:1-2|1-2-3|4-5-6)-A$/i;

export const getGroupedRelaySupplyLabel = (portName) => (
    GROUPED_RELAY_SUPPLY_PORT_PATTERN.test(String(portName || '').trim()) ? 'L' : null
);

export const getRelayDeviceAtPhysicalSlot = (devices, targetSlot) => {
    if (!Array.isArray(devices) || !Number.isInteger(targetSlot) || targetSlot < 0) return null;
    const occupied = new Set();

    for (let index = 0; index < devices.length; index += 1) {
        const device = devices[index];
        if (!device) continue;
        const storedSlot = Number(device.relay_slot_index);
        let startSlot = device.relay_slot_index != null && Number.isInteger(storedSlot) && storedSlot >= 0
            ? storedSlot
            : 0;
        while (occupied.has(startSlot)) startSlot += 1;
        const span = String(device.connection_type || '').toLowerCase() === 'double_relay' ? 2 : 1;
        for (let slot = startSlot; slot < startSlot + span; slot += 1) occupied.add(slot);
        if (targetSlot >= startSlot && targetSlot < startSlot + span) return device;
    }

    return null;
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
