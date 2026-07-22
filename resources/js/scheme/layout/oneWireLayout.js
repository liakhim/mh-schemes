import { canonicalDeviceType } from '../domain/deviceTypes.js';

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

export const getOneWireSlotPosition = ({
    slotIndex,
    devices,
    offsets,
    getDeviceSize,
    getOffsetKey,
    firstSlotX,
    firstSlotY,
    firstSlotExtraY = 0,
    indentSize,
    moduleHeightValue,
}) => {
    const firstDevice = devices[0] || null;
    const firstOffset = offsets[getOffsetKey(firstDevice, 0)] || { x: 0, y: 0 };
    const sideGap = 10 * indentSize;
    const ntcTopOffset = 12 * indentSize;
    let x = firstSlotX + firstOffset.x;
    let y = firstSlotY + firstSlotExtraY + firstOffset.y;

    if (canonicalDeviceType(firstDevice?.type) === 'ntc-1-wire') {
        x += sideGap;
        y += ntcTopOffset;
    }

    for (let index = 1; index <= slotIndex; index += 1) {
        const previousDevice = devices[index - 1] || null;
        const currentDevice = devices[index] || null;
        const previousType = canonicalDeviceType(previousDevice?.type);
        const currentType = canonicalDeviceType(currentDevice?.type);
        const previousSize = getDeviceSize(previousDevice);
        const currentOffset = offsets[getOffsetKey(currentDevice, index)] || { x: 0, y: 0 };
        const previousIsModule = previousType === 'ntc-1-wire' || previousType === 'rdt2';
        const verticalGap = previousSize.height
            + moduleHeightValue * 0.25
            + (previousIsModule ? 0 : 3 * indentSize);

        x += previousSize.width
            + 2 * indentSize
            + (previousType === 'ntc-1-wire' ? sideGap : 0)
            + (currentType === 'ntc-1-wire' ? sideGap : 0)
            + currentOffset.x;
        y += verticalGap
            + (currentType === 'ntc-1-wire' ? ntcTopOffset : 0)
            + currentOffset.y;
    }

    return { x, y };
};
