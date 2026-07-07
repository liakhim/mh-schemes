import { canonicalDeviceType } from '../domain/deviceTypes';

export const getOneWireDirectionForDevice = (device, role) => {
    const normalizedType = canonicalDeviceType(device?.type);
    if (!device || (normalizedType !== 'ntc-1-wire' && normalizedType !== 'rdt2')) {
        return null;
    }
    return role === 'source' ? 'OUT' : 'IN';
};

const getOneWirePorts = (controllerPorts) => controllerPorts.filter((port) => port.name.startsWith('1-WIRE-'));

export const getOneWireLineGeometry = (controllerType, controllerImage, controllerPorts, indentSize, moduleHeightValue) => {
    if (!controllerImage) return null;
    const oneWirePorts = getOneWirePorts(controllerPorts);
    if (oneWirePorts.length === 0) return null;

    const oneWireVPlusPort = oneWirePorts.find((port) => port.name === '1-WIRE-V+');
    if (!oneWireVPlusPort) return null;

    const portXs = oneWirePorts.map((port) => port.x * controllerImage.width);
    const portYs = oneWirePorts.map((port) => port.y * controllerImage.height);
    const portsCenterX = portXs.reduce((sum, value) => sum + value, 0) / portXs.length;
    const portsBottomY = Math.max(...portYs);
    const vPlusX = oneWireVPlusPort.x * controllerImage.width;
    const baseX = portsCenterX + indentSize;
    const baseY = portsBottomY;
    let firstSlotYOffset = 0;
    if (controllerType === 'go' || controllerType === 'go+') {
        firstSlotYOffset = moduleHeightValue * 0.5;
    } else if (controllerType === 'smart2') {
        firstSlotYOffset = moduleHeightValue * 0.5;
    } else if (controllerType === 'pro') {
        firstSlotYOffset = moduleHeightValue * 1.55;
    }
    let firstSlotX = vPlusX + 2 * indentSize;
    let firstSlotY = baseY + firstSlotYOffset;

    if (controllerType === 'ecosmart') {
        firstSlotX = 0;
        firstSlotY = controllerImage.height + moduleHeightValue;
    }

    return {
        baseX,
        baseY,
        firstSlotX,
        firstSlotY,
    };
};
