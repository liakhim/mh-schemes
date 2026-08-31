export const getProRelaySlotY = ({ controllerHeight, hasUps, batteryHeight, indentSize }) => (
    controllerHeight
    + 11 * indentSize
    + (hasUps ? batteryHeight + 11 * indentSize : 0)
);

export const getProEmptyBusSlotY = ({ preferredY, relaySlotY, relaySlotOffsetYs, relaySlotSize, indentSize }) => {
    const maxRelayOffsetY = Math.max(
        0,
        ...(relaySlotOffsetYs || []).map((offsetY) => Number(offsetY) || 0),
    );
    const minimumY = relaySlotY + relaySlotSize + maxRelayOffsetY + 3 * indentSize;
    return Math.max(preferredY, minimumY);
};
