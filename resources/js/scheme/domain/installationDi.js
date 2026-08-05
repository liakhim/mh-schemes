import { canonicalDeviceType } from './deviceTypes.js';

const SMART2_POWER_CHAIN_MODULE_TYPES = new Set(['bl2', 'rl6', 'rl6s', 'io4', 'di6', 'rl2', 'rl2s']);

export const getSmart2InstallationPowerChainHead = (items) => (
    (Array.isArray(items) ? items : []).find((item) => (
        SMART2_POWER_CHAIN_MODULE_TYPES.has(canonicalDeviceType(item?.type || item?.data?.type))
    )) || null
);

export const buildSmart2InstallationDiConnections = ({
    hasUps,
    moduleLabels,
    controllerLabel = 'SMART2',
}) => {
    const controllerPortLabels = {};
    const modulePortLabels = moduleLabels.map(() => ({}));
    const upsPortLabels = {};
    let pairIndex = 0;

    if (hasUps) {
        controllerPortLabels[0] = 'UPS';
        controllerPortLabels[1] = 'UPS';
        upsPortLabels[0] = controllerLabel;
        upsPortLabels[1] = controllerLabel;
        pairIndex = 1;
    }

    moduleLabels.forEach((label, moduleIndex) => {
        if (pairIndex >= 2) return;
        const firstPortIndex = pairIndex * 2;
        controllerPortLabels[firstPortIndex] = label;
        controllerPortLabels[firstPortIndex + 1] = label;
        modulePortLabels[moduleIndex][0] = controllerLabel;
        modulePortLabels[moduleIndex][1] = controllerLabel;
        pairIndex += 1;
    });

    return { controllerPortLabels, modulePortLabels, upsPortLabels };
};
