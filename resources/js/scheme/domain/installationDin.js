export const getInstallationDinUnits = (width, dinSize = 40) => {
    if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(dinSize) || dinSize <= 0) return 0;
    return Math.max(1, Math.round(width / dinSize));
};

export const getInstallationDinTotal = ({
    controllerWidth,
    controllerOnRail,
    moduleWidths,
    dinSize = 40,
}) => {
    const moduleTotal = moduleWidths.reduce(
        (total, width) => total + getInstallationDinUnits(width, dinSize),
        0,
    );
    return moduleTotal + (controllerOnRail ? getInstallationDinUnits(controllerWidth, dinSize) : 0);
};
