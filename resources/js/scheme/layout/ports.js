import { getPortsByClassToken } from './portParsing.js';

const getFirstPortByClassToken = (portsList, className) => (
    getPortsByClassToken(portsList, className)?.[0] || null
);

export const getPortByNameOrClassToken = (portsList, name) => (
    portsList?.find((port) => port.name === name) || getFirstPortByClassToken(portsList, name)
);

export const getPortByNames = (portsList, names) => (
    names.map((name) => portsList?.find((port) => port.name === name)).find(Boolean) || null
);

export const getPortPosition = (ports, portName, imageX, imageY, imageWidth, imageHeight) => {
    const port = ports.find((item) => item.name === portName);
    if (!port) return null;
    return {
        x: imageX + port.x * imageWidth,
        y: imageY + port.y * imageHeight,
    };
};

export const getOneWirePortByRole = (portsList, baseName, preferredDirection) => {
    if (!Array.isArray(portsList)) return null;
    const tokenize = (name) => (typeof name === 'string' ? name.split(/\s+/).map((token) => token.trim().toUpperCase()).filter(Boolean) : []);
    const baseToken = baseName.toUpperCase();
    const directionToken = preferredDirection ? preferredDirection.toUpperCase() : null;

    if (directionToken) {
        const directed = portsList.find((port) => {
            const tokens = tokenize(port?.name);
            return tokens.includes(baseToken) && tokens.includes(directionToken);
        });
        if (directed) return directed;
    }

    const plain = portsList.find((port) => {
        const tokens = tokenize(port?.name);
        return tokens.includes(baseToken) && !tokens.includes('IN') && !tokens.includes('OUT');
    });
    if (plain) return plain;

    return portsList.find((port) => tokenize(port?.name).includes(baseToken)) || null;
};

export const getDiInputPort = (portsList) => getPortByNameOrClassToken(portsList, 'DI-IN');

export const getPressureSensorPorts = (portsList) => ({
    vPlus: getPortByNameOrClassToken(portsList, '4-20-IN-V+'),
    input: getPortByNameOrClassToken(portsList, '4-20-IN-IN'),
});

export const getRelayInputPort = (portsList, deviceType, imageKey) => {
    if (deviceType === 'pump-220v' && imageKey === 'pump-220v-right-port') {
        return portsList.find((port) => port.name === 'RELAY-IN B') || null;
    }

    return getPortByNameOrClassToken(portsList, 'RELAY-IN');
};

export const getRelayTerminalPort = (portsList, terminalIndex, preferRelayInput = false) => {
    const names = preferRelayInput
        ? [`RELAY-IN-${terminalIndex}`, `RELAY-${terminalIndex}`]
        : [`RELAY-${terminalIndex}`, `RELAY-IN-${terminalIndex}`];

    return names
        .map((name) => getPortByNameOrClassToken(portsList, name))
        .find(Boolean) || null;
};
