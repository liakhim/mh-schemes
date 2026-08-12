import { canonicalDeviceType } from '../domain/deviceTypes.js';
import { WIFI_ONE_WIRE_CAPACITY, WIFI_RELAY_CAPACITY } from '../domain/wifiModules.js';

export const getWifiModuleSize = (moduleItem, wirelessImages, getImageKey, dinSize, moduleHeightValue) => {
    const image = moduleItem ? wirelessImages[getImageKey(moduleItem)] : null;
    return { width: image?.width || 3 * dinSize, height: image?.height || moduleHeightValue };
};

export const getWifiPairHorizontalBounds = ({
    moduleItem,
    wirelessImages,
    wirelessPortsByType,
    getImageKey,
    dinSize,
    moduleHeightValue,
    indentSize,
    showEmptySlots,
    oneWireSlotSize,
    isRelayBoilerType,
    buildRelaySlotOccupancy,
}) => {
    const moduleSize = getWifiModuleSize(moduleItem, wirelessImages, getImageKey, dinSize, moduleHeightValue);
    const powerWidth = wirelessImages['power-unit']?.width || dinSize;
    const moduleX = powerWidth + 4 * indentSize;
    let left = 0;
    let right = moduleX + moduleSize.width;
    if (!moduleItem) return { left, right };

    const moduleType = canonicalDeviceType(moduleItem.type);
    const lineKey = moduleType === 'rl6sw' ? 'relay_s_devices' : 'relay_devices';
    const relayDevices = Array.isArray(moduleItem[lineKey]) ? moduleItem[lineKey] : [];
    const relayOccupancy = buildRelaySlotOccupancy(
        relayDevices,
        WIFI_RELAY_CAPACITY,
        (device) => (String(device?.connection_type || '').toLowerCase() === 'double_relay' ? 2 : 1),
    );
    const getVisibleRelayWidth = (states) => states.reduce((width, state) => {
        if (state?.covered || (!showEmptySlots && !state?.device)) return width;
        return Math.max(width, isRelayBoilerType(state?.device?.type) ? 6 * indentSize : 8 * indentSize);
    }, 0);
    const leftRelayWidth = getVisibleRelayWidth(relayOccupancy.slice(0, 3));
    const rightRelayWidth = getVisibleRelayWidth(relayOccupancy.slice(3, 6));
    if (leftRelayWidth > 0) left = Math.min(left, moduleX - 4 * indentSize - leftRelayWidth);
    if (rightRelayWidth > 0) right = Math.max(right, moduleX + moduleSize.width + 4 * indentSize + rightRelayWidth);

    const oneWireDevices = Array.isArray(moduleItem.one_wire_devices)
        ? moduleItem.one_wire_devices.slice(0, WIFI_ONE_WIRE_CAPACITY)
        : [];
    const oneWireSlotCount = oneWireDevices.length
        + (showEmptySlots && oneWireDevices.length < WIFI_ONE_WIRE_CAPACITY ? 1 : 0);
    if (oneWireSlotCount > 0) {
        const oneWireVPlus = (wirelessPortsByType[getImageKey(moduleItem)] || [])
            .find((port) => port.name === '1-WIRE-V+');
        const oneWireFirstX = moduleX + (oneWireVPlus ? oneWireVPlus.x * moduleSize.width : 0) + 2 * indentSize;
        right = Math.max(right, oneWireFirstX + (oneWireSlotCount - 1) * (oneWireSlotSize + 2 * indentSize) + oneWireSlotSize);
    }
    return { left, right };
};
