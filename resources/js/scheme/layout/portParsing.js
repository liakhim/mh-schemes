const getPortAliases = (name) => {
    const relayGroupMatch = /^(RELAY(?:-S)?)-((?:\d+-)+\d+)-B$/i.exec(name || '');
    if (relayGroupMatch) {
        const prefix = relayGroupMatch[1].toUpperCase();
        return relayGroupMatch[2]
            .split('-')
            .map((index) => `${prefix}-${index}-B`);
    }

    return [];
};

const FALLBACK_PORTS_BY_IMAGE_KEY = {
    'zoneServo-left-port': [
        { name: 'RELAY-IN', x: 0.08, y: 0.84, width: 0, height: 0 },
    ],
    'zoneServo-right-port': [
        { name: 'RELAY-IN', x: 0.92, y: 0.84, width: 0, height: 0 },
    ],
};

export const parsePorts = async (svgUrl) => {
    const res = await fetch(svgUrl);
    const svgText = await res.text();
    const wrapper = document.createElement('div');
    wrapper.innerHTML = svgText;
    const svgEl = wrapper.firstElementChild;
    document.body.appendChild(svgEl);
    const svgWidth = parseFloat(svgEl.getAttribute('width'));
    const svgHeight = parseFloat(svgEl.getAttribute('height'));
    const ports = [];

    svgEl.querySelectorAll('[class]').forEach((el) => {
        const name = el.getAttribute('class');
        const bbox = el.getBBox();
        if (bbox && bbox.width > 0) {
            const port = {
                name,
                x: (bbox.x + bbox.width / 2) / svgWidth,
                y: (bbox.y + bbox.height / 2) / svgHeight,
                width: bbox.width / svgWidth,
                height: bbox.height / svgHeight,
            };
            ports.push(port);
            getPortAliases(name).forEach((aliasName) => {
                ports.push({ ...port, name: aliasName, sourceName: name });
            });
        }
    });
    document.body.removeChild(svgEl);
    return ports;
};

export const withFallbackPorts = (imageKey, ports) => (
    ports.length > 0 ? ports : (FALLBACK_PORTS_BY_IMAGE_KEY[imageKey] || [])
);

export const getPortsByClassToken = (portsList, className) => {
    if (!Array.isArray(portsList) || !className) return null;
    const target = className.toUpperCase();
    const matched = portsList.filter((port) => {
        if (typeof port?.name !== 'string') return false;
        return port.name
            .split(/\s+/)
            .map((token) => token.trim().toUpperCase())
            .filter(Boolean)
            .includes(target);
    });
    return matched.length > 0 ? matched : null;
};
