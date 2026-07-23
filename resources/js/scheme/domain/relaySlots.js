const getRelaySpan = (device) => (
    String(device?.connection_type || '').toLowerCase() === 'double_relay' ? 2 : 1
);

const findFreeSpan = (occupied, capacity, span) => {
    for (let start = 0; start + span <= capacity; start += 1) {
        let free = true;
        for (let slot = start; slot < start + span; slot += 1) {
            if (occupied.has(slot)) {
                free = false;
                break;
            }
        }
        if (free) return start;
    }
    return -1;
};

const occupySpan = (occupied, start, span, capacity) => {
    for (let slot = start; slot < start + span && slot < capacity; slot += 1) {
        if (slot >= 0) occupied.add(slot);
    }
};

const getOccupiedRelaySlots = (devices, capacity) => {
    const occupied = new Set();
    const implicitDevices = [];

    (Array.isArray(devices) ? devices : []).forEach((device) => {
        const storedStart = Number(device?.relay_slot_index);
        if (device?.relay_slot_index != null && Number.isInteger(storedStart) && storedStart >= 0 && storedStart < capacity) {
            occupySpan(occupied, storedStart, getRelaySpan(device), capacity);
        } else {
            implicitDevices.push(device);
        }
    });

    implicitDevices.forEach((device) => {
        const span = getRelaySpan(device);
        const start = findFreeSpan(occupied, capacity, span);
        if (start >= 0) occupySpan(occupied, start, span, capacity);
    });
    return occupied;
};

export const appendRelayDeviceToFreeSpan = (devices, capacity, device) => {
    if (!Array.isArray(devices)) return false;
    const span = getRelaySpan(device);
    const start = findFreeSpan(getOccupiedRelaySlots(devices, capacity), capacity, span);
    if (start < 0) return false;
    devices.push({ ...device, relay_slot_index: start });
    return true;
};
