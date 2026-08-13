const getRelaySpan = (device) => (
    String(device?.connection_type || '').toLowerCase() === 'double_relay' ? 2 : 1
);

const getStoredRelaySlotIndex = (device, fallbackIndex) => {
    const rawIndex = Number(device?.relay_slot_index);
    return Number.isInteger(rawIndex) && rawIndex >= 0 ? rawIndex : fallbackIndex;
};

const isSameDevice = (a, b) => {
    if (!a || !b) return false;
    if (a?.id != null && b?.id != null) return a.id === b.id;
    return a === b;
};

export const buildRelaySlotOccupancyPreserveIndexes = (devices, slotCount, getSpan = getRelaySpan) => {
    const slots = Array.from({ length: slotCount }, () => null);
    (Array.isArray(devices) ? devices : []).slice(0, slotCount).forEach((device, index) => {
        if (!device) return;
        const spanRaw = Number(getSpan?.(device) || 1);
        const span = Math.max(1, Math.round(spanRaw));
        let targetIndex = getStoredRelaySlotIndex(device, index);
        if (targetIndex >= slotCount) return;
        while (targetIndex < slotCount && slots[targetIndex]) targetIndex += 1;
        if (targetIndex + span > slotCount) return;
        slots[targetIndex] = { device, span, startSlot: targetIndex, covered: false };
        for (let offset = 1; offset < span; offset += 1) {
            slots[targetIndex + offset] = { device, span, startSlot: targetIndex, covered: true };
        }
    });
    return slots;
};

export const compactRelayLinePreserveIndexes = (currentLine) => (Array.isArray(currentLine) ? currentLine : [])
    .map((item, index) => (item ? { ...item, relay_slot_index: getStoredRelaySlotIndex(item, index) } : null))
    .filter(Boolean);

export const upsertRelayDeviceAtSlot = (currentLine, slotIndex, payload, slotCount) => {
    if (!Number.isInteger(slotIndex)) return currentLine;
    const nextLine = compactRelayLinePreserveIndexes(currentLine);
    const payloadWithSlot = { ...payload, relay_slot_index: slotIndex };
    const existingIndex = nextLine.findIndex((item, index) => getStoredRelaySlotIndex(item, index) === slotIndex);
    if (existingIndex >= 0) nextLine[existingIndex] = payloadWithSlot;
    else nextLine.push(payloadWithSlot);
    return nextLine.slice(0, slotCount);
};

export const removeRelayDeviceAtSlotFromLine = (currentLine, relaySlotIndex, slotCount, targetDevice = null) => {
    const occupancy = buildRelaySlotOccupancyPreserveIndexes(currentLine, slotCount);
    const startSlot = occupancy[relaySlotIndex]?.startSlot ?? relaySlotIndex;
    return compactRelayLinePreserveIndexes(currentLine)
        .filter((item, index) => {
            if (targetDevice) return !isSameDevice(item, targetDevice);
            return getStoredRelaySlotIndex(item, index) !== startSlot;
        })
        .slice(0, slotCount);
};

export const getRl6RelayTerminalNames = (prefix, relayIndex) => {
    const normalizedPrefix = String(prefix || '').toUpperCase();
    const normalizedIndex = Number(relayIndex);
    if (!['RELAY', 'RELAY-S'].includes(normalizedPrefix)
        || !Number.isInteger(normalizedIndex)
        || normalizedIndex < 1
        || normalizedIndex > 6) return null;

    const group = normalizedIndex <= 3 ? '1-2-3' : '4-5-6';
    return {
        a: `${normalizedPrefix}-${group}-A`,
        b: `${normalizedPrefix}-${normalizedIndex}-B`,
    };
};

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
