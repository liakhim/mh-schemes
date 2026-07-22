import assert from 'node:assert/strict';
import test from 'node:test';

import { getOneWireSlotPosition } from '../layout/oneWireLayout.js';

const getOffsetKey = (device, index) => (device?.id != null ? `onewire:id:${device.id}` : `onewire:index:${index}`);
const getDeviceSize = (device) => (device?.type === 'ntc-1-wire'
    ? { width: 50, height: 60 }
    : { width: 40, height: 40 });

test('one-wire geometry applies the NTC top offset consistently', () => {
    const devices = [
        { id: 'ntc', type: 'ntc-1-wire' },
        { id: 'sensor', type: 'wall-temperature-sensor' },
    ];
    const offsets = {
        'onewire:id:ntc': { x: 3, y: 4 },
        'onewire:id:sensor': { x: 5, y: 6 },
    };
    const options = {
        devices,
        offsets,
        getDeviceSize,
        getOffsetKey,
        firstSlotX: 100,
        firstSlotY: 200,
        indentSize: 8,
        moduleHeightValue: 200,
    };

    assert.deepEqual(getOneWireSlotPosition({ ...options, slotIndex: 0 }), { x: 183, y: 300 });
    assert.deepEqual(getOneWireSlotPosition({ ...options, slotIndex: 1 }), { x: 334, y: 416 });
});

test('one-wire offset follows a device ID after the previous device is removed', () => {
    const retainedDevice = { id: 'retained', type: 'wall-temperature-sensor' };
    const position = getOneWireSlotPosition({
        slotIndex: 0,
        devices: [retainedDevice],
        offsets: { 'onewire:id:retained': { x: 7, y: 9 } },
        getDeviceSize,
        getOffsetKey,
        firstSlotX: 100,
        firstSlotY: 200,
        indentSize: 8,
        moduleHeightValue: 200,
    });

    assert.deepEqual(position, { x: 107, y: 209 });
});
