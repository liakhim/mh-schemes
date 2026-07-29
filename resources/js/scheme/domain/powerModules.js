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
        .filter((moduleItem) => (
            getModuleType(moduleItem) !== 'ups'
            && !isCircuitBreaker(moduleItem)
            && !isPowerUnit(moduleItem)
        ));
    const requiresPowerLine = controllerType === 'smart2' || controllerType === 'pro';
    if (!requiresPowerLine) return modules;

    const result = ['circuit-breaker', 'power-unit', ...modules];
    if (upsRequested) result.push('ups');
    return result;
};
