import { canonicalDeviceType } from '../domain/deviceTypes.js';

export const WIRELESS_SLOT_GAP = 12;
export const WIRELESS_INFOBLOCK_HEIGHT = 18;
export const WIRELESS_INFOBLOCK_BOTTOM_GAP = 40;

const THERMOSTAT_IMAGE_SIZE = 118;
const THERMOSTAT_FLOOR_SLOT_SIZE = 70;
const THERMOSTAT_FLOOR_SLOT_GAP = 10;
const THERMOSTAT_SLOT_PADDING = 8;
const THERMOSTAT_BASE_SLOT_SIZE = THERMOSTAT_SLOT_PADDING * 2 + THERMOSTAT_IMAGE_SIZE;

export const getWirelessSlotWidth = (device, showEmptySlots) => {
    if (device?.type === 'outdoor-temperature-sensor') return THERMOSTAT_BASE_SLOT_SIZE;
    if (device?.type !== 'thermostat') return 80;
    const hasFloorSensor = Array.isArray(device?.additions) && device.additions.length > 0;
    return hasFloorSensor || showEmptySlots
        ? THERMOSTAT_SLOT_PADDING * 2 + THERMOSTAT_IMAGE_SIZE + THERMOSTAT_FLOOR_SLOT_GAP + THERMOSTAT_FLOOR_SLOT_SIZE
        : THERMOSTAT_BASE_SLOT_SIZE;
};

export const getWirelessSlotHeight = (device, indentSize) => (
    device?.type === 'thermostat' ? THERMOSTAT_BASE_SLOT_SIZE : 10 * indentSize
);

export const getWirelessLineGap = (controllerType, moduleHeightValue) => (
    controllerType === 'go' || controllerType === 'go+'
        ? moduleHeightValue * 0.6
        : controllerType === 'pro' ? moduleHeightValue * 1.25 : moduleHeightValue * 0.5
);

const getWirelessSlotY = (controllerType, slotHeight, moduleHeightValue) => (
    -getWirelessLineGap(controllerType, moduleHeightValue) - slotHeight
);

export const getWirelessSlotYByIndex = (devices, index, showEmptySlots, controllerType, moduleHeightValue, indentSize, slotHeight, lineLift = 0) => {
    if (controllerType !== 'ecosmart') return getWirelessSlotY(controllerType, slotHeight, moduleHeightValue) - lineLift;
    const getSlotHeight = (device) => {
        if (!device) return 10 * indentSize;
        const hasFloorSensor = Array.isArray(device?.additions) && device.additions.length > 0;
        return device?.type === 'thermostat'
            ? THERMOSTAT_SLOT_PADDING * 2 + THERMOSTAT_IMAGE_SIZE + (hasFloorSensor ? 3 * indentSize : 0)
            : getWirelessSlotHeight(device, indentSize);
    };
    const firstHeight = getSlotHeight(devices[0] || null);
    let y = getWirelessSlotY(controllerType, firstHeight, moduleHeightValue) + 54 * indentSize - lineLift;
    for (let i = 0; i < index; i += 1) y += getSlotHeight(devices[i] || null) + 4 * indentSize + WIRELESS_SLOT_GAP;
    return y;
};

export const getWirelessLineTop = (devices, showEmptySlots, controllerType, moduleHeightValue, indentSize, lineLift = 0) => {
    const slotTops = (Array.isArray(devices) ? devices : []).map((device, index) => {
        const hasFloorSensor = Array.isArray(device?.additions) && device.additions.length > 0;
        const slotHeight = device?.type === 'thermostat'
            ? THERMOSTAT_SLOT_PADDING * 2 + THERMOSTAT_IMAGE_SIZE + (hasFloorSensor ? 3 * indentSize : 0)
            : getWirelessSlotHeight(device, indentSize);
        return getWirelessSlotYByIndex(devices, index, showEmptySlots, controllerType, moduleHeightValue, indentSize, slotHeight, lineLift);
    });
    if (showEmptySlots || slotTops.length === 0) {
        slotTops.push(getWirelessSlotYByIndex(devices, (devices || []).length, showEmptySlots, controllerType, moduleHeightValue, indentSize, 10 * indentSize, lineLift));
    }
    return Math.min(...slotTops);
};

export const getWirelessInfoBlockY = (wirelessLineTop) => wirelessLineTop - WIRELESS_INFOBLOCK_BOTTOM_GAP - WIRELESS_INFOBLOCK_HEIGHT;

export const getWirelessLineLift = (schemeValue, controllerType, indentSize) => {
    const hasRelayDiModule = controllerType === 'smart2' && (Array.isArray(schemeValue?.di_modules) ? schemeValue.di_modules : [])
        .some((moduleItem) => ['rl2', 'rl2s'].includes(canonicalDeviceType(moduleItem?.type || moduleItem)));
    const smart2Lift = hasRelayDiModule ? 12 * indentSize : 0;
    const hasWifiModules = Array.isArray(schemeValue?.wifi_modules) && schemeValue.wifi_modules.length > 0;
    return smart2Lift + (controllerType === 'pro' && hasWifiModules ? 7 * indentSize : 0);
};

export const getWirelessSlotX = (devices, index, showEmptySlots, controllerType = null, indentSize = 8, slotWidth = null) => {
    if (controllerType === 'ecosmart') {
        const width = slotWidth ?? getWirelessSlotWidth(devices[index] || null, showEmptySlots);
        return -25 * indentSize - width / 2;
    }
    if (index <= 0) return 10;
    const widthBefore = devices.slice(0, index).reduce((sum, item) => sum + getWirelessSlotWidth(item, showEmptySlots), 0);
    return 10 + widthBefore + WIRELESS_SLOT_GAP * index;
};
