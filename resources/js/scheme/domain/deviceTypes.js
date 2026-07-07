export const normalizeDeviceType = (type) => (typeof type === 'string' ? type.toLowerCase() : type);

export const canonicalDeviceType = (type) => {
    const normalized = normalizeDeviceType(type);
    if (normalized === 'rdt') return 'rdt2';
    if (normalized === '220pump' || normalized === 'pump220v') return 'pump-220v';
    if (normalized === 'boilerpump' || normalized === 'boiler-pump') return 'boiler-pump';
    if (normalized === 'zoneservo' || normalized === 'zone-servo') return 'zoneServo';
    if (normalized === 'pressuresensor') return 'pressure-sensor';
    if (normalized === 'random_signal') return 'discrete_signal';
    if (normalized === 'ventilation') return 'discrete_ventilation';
    return normalized;
};

export const getThermostatColor = (device) => {
    const allowedColors = new Set(['black', 'white', 'gray']);
    const normalizedColor = typeof device?.color === 'string' ? device.color.toLowerCase() : 'black';
    return allowedColors.has(normalizedColor) ? normalizedColor : 'black';
};
