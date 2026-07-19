const getModuleType = (moduleItem) => String(
    typeof moduleItem === 'string' ? moduleItem : moduleItem?.type || '',
).toLowerCase();

const isCircuitBreaker = (moduleItem) => {
    const type = getModuleType(moduleItem);
    return type === 'circuit-breaker' || type === 'circuitbreaker';
};

const isPowerUnit = (moduleItem) => {
    const type = getModuleType(moduleItem);
    return type === 'power-unit' || type === 'powerunit';
};

export const materializePowerModules = (currentModules, controllerType, upsRequested) => {
    const modules = (Array.isArray(currentModules) ? currentModules : [])
        .filter((moduleItem) => getModuleType(moduleItem) !== 'ups');
    const requiresPowerLine = controllerType === 'smart2' || controllerType === 'pro';
    const result = requiresPowerLine
        ? [
            'circuit-breaker',
            'power-unit',
            ...modules.filter((moduleItem) => !isCircuitBreaker(moduleItem) && !isPowerUnit(moduleItem)),
        ]
        : modules;

    if (upsRequested && requiresPowerLine) result.push('ups');
    return result;
};
