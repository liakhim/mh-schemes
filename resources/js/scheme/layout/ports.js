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
