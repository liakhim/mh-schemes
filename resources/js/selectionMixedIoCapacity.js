const IO4_CHANNEL_CAPACITY = 4;
const DI6_CHANNEL_CAPACITY = 6;
export const PRO_EXT_DEVICE_CAPACITY = 12;

export const getProExtPortUsage = (scheme, additionalModuleCount = 0) => {
    const extDevices = Array.isArray(scheme?.controller?.ext_devices) ? scheme.controller.ext_devices : [];
    const extModules = Array.isArray(scheme?.ext_modules) ? scheme.ext_modules : [];
    return extDevices.length + extModules.length + Math.max(0, Number(additionalModuleCount) || 0);
};

export const hasProExtPortCapacity = (scheme, additionalModuleCount = 0) => (
    getProExtPortUsage(scheme, additionalModuleCount) <= PRO_EXT_DEVICE_CAPACITY
);

/**
 * Calculates additional modules using the same append-only line semantics as domain balancers.
 * Array holes remain occupied because balancers use channel_devices.length.
 */
export const calculateSelectionMixedIoModules = ({
    unplacedIo4ChannelGroups = [],
    unplacedAnalog420Devices = 0,
    unplacedGeneralDiDevices = 0,
    controllerAnalog420Capacity = 0,
    controllerAnalog420Occupied = 0,
    controllerDiCapacity = 0,
    controllerDiOccupied = 0,
    existingIo4ChannelLengths = [],
    existingDi6ChannelLengths = [],
} = {}) => {
    const normalizeLength = (length, capacity) => Math.min(capacity, Math.max(0, Number(length) || 0));
    const io4LineLengths = (Array.isArray(existingIo4ChannelLengths) ? existingIo4ChannelLengths : [])
        .map((length) => normalizeLength(length, IO4_CHANNEL_CAPACITY));
    const di6LineLengths = (Array.isArray(existingDi6ChannelLengths) ? existingDi6ChannelLengths : [])
        .map((length) => normalizeLength(length, DI6_CHANNEL_CAPACITY));
    let additionalIo4Modules = 0;

    const appendIo4Group = (requestedSize) => {
        const size = Math.max(0, Math.min(IO4_CHANNEL_CAPACITY, Number(requestedSize) || 0));
        if (size === 0) return;
        const lineIndex = io4LineLengths.findIndex((length) => length + size <= IO4_CHANNEL_CAPACITY);
        if (lineIndex >= 0) {
            io4LineLengths[lineIndex] += size;
            return;
        }
        io4LineLengths.push(size);
        additionalIo4Modules += 1;
    };

    (Array.isArray(unplacedIo4ChannelGroups) ? unplacedIo4ChannelGroups : []).forEach(appendIo4Group);

    const freeControllerAnalog420 = Math.max(0, controllerAnalog420Capacity - controllerAnalog420Occupied);
    const analog420ForIo4 = Math.max(0, unplacedAnalog420Devices - freeControllerAnalog420);
    for (let index = 0; index < analog420ForIo4; index += 1) appendIo4Group(1);

    const freeControllerDi = Math.max(0, controllerDiCapacity - controllerDiOccupied);
    let remainingDi = Math.max(0, unplacedGeneralDiDevices - freeControllerDi);
    const appendSingles = (lineLengths, capacity) => {
        for (let lineIndex = 0; lineIndex < lineLengths.length && remainingDi > 0; lineIndex += 1) {
            const free = Math.max(0, capacity - lineLengths[lineIndex]);
            const placed = Math.min(free, remainingDi);
            lineLengths[lineIndex] += placed;
            remainingDi -= placed;
        }
    };
    appendSingles(io4LineLengths, IO4_CHANNEL_CAPACITY);
    appendSingles(di6LineLengths, DI6_CHANNEL_CAPACITY);

    const additionalDi6Modules = Math.ceil(remainingDi / DI6_CHANNEL_CAPACITY);

    return {
        additionalIo4Modules,
        additionalDi6Modules,
        io4ChannelLengths: io4LineLengths,
        analog420ForIo4,
    };
};

/** Ensures exactly one boiler sensor per boiler, reusing unlinked legacy sensors first. */
export const reconcileSelectionStupidBoilerSensors = (boilers, sensors, createSensor) => {
    const boilerItems = Array.isArray(boilers) ? boilers : [];
    const sensorItems = Array.isArray(sensors) ? sensors : [];
    const isBoilerSensor = (sensor) => String(sensor?.type || '').toLowerCase() === 'flask-sensor-stupid-boiler';
    const boilerSensors = sensorItems.filter(isBoilerSensor);
    const retainedSensors = new Map();
    const usedSensors = new Set();

    boilerItems.forEach((boiler) => {
        const linked = boilerSensors.find((sensor) => (
            !usedSensors.has(sensor)
            && sensor?.boiler_id != null
            && boiler?.id != null
            && String(sensor.boiler_id) === String(boiler.id)
        ));
        const legacy = linked || boilerSensors.find((sensor) => !usedSensors.has(sensor) && sensor?.boiler_id == null);
        if (legacy) {
            usedSensors.add(legacy);
            retainedSensors.set(legacy, legacy === linked ? legacy : { ...legacy, boiler_id: boiler?.id });
        } else {
            retainedSensors.set(boiler, createSensor(boiler));
        }
    });

    const result = [];
    sensorItems.forEach((sensor) => {
        if (!isBoilerSensor(sensor)) result.push(sensor);
        else if (retainedSensors.has(sensor)) result.push(retainedSensors.get(sensor));
    });
    boilerItems.forEach((boiler) => {
        if (retainedSensors.has(boiler)) result.push(retainedSensors.get(boiler));
    });
    return result;
};
