import { canonicalDeviceType } from '../domain/deviceTypes.js';

export const getOneWirePortColor = (name) => {
    if (name === '1-WIRE-V+') return '#d32f2f';
    if (name === '1-WIRE-DAT') return '#fbc02d';
    return '#212121';
};

export const isWallDigitalOneWireDevice = (device, imageKey) => (
    canonicalDeviceType(device?.type) === 'wall-digital-sensor'
    || imageKey === 'wall-digital-sensor'
);

export const getOneWireOwnerMinBendY = (ownerBottomY, role, indentSize, firstOffset = 3) => {
    const roleOffset = role === '1-WIRE-GND' ? 2 : (role === '1-WIRE-DAT' ? 1 : 0);
    return ownerBottomY + (firstOffset + roleOffset) * indentSize;
};
