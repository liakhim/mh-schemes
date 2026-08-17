export const MIXING_OWNER_FIELD = 'mixing_owner_key';
export const CONTROLLER_MIXING_OWNER = 'controller';

export const getExtMixingOwner = (moduleItem, moduleIndex) => (
    `ext:${moduleItem?.id ?? moduleIndex}`
);

export const getMixingUnitKey = (device) => (
    device?.mixing_unit_id ?? device?._uid ?? null
);

export const isMixingUnitSensor = (device) => {
    if (device?._group != null) return device._group === 'mixing';
    return device?.mixing_unit_id != null
        || String(device?.type || '').toLowerCase().includes('mixing');
};

// NTC modules are shared across PRO 1-wire lines. Only digital mixing sensors
// require the same owner as their 220 V servo for the PID polling constraint.
export const getNtcModuleOwnerRequirement = (controllerType, ownerKey) => (
    controllerType === 'pro' && ownerKey === CONTROLLER_MIXING_OWNER ? null : ownerKey
);
