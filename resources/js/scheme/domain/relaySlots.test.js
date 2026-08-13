import assert from 'node:assert/strict';
import test from 'node:test';

import {
    buildRelaySlotOccupancyPreserveIndexes,
    compactRelayLinePreserveIndexes,
    getRl6RelayTerminalNames,
    removeRelayDeviceAtSlotFromLine,
    upsertRelayDeviceAtSlot,
} from './relaySlots.js';

test('maps all RL6 slots to their grouped A terminal and current B terminal', () => {
    for (let relayIndex = 1; relayIndex <= 6; relayIndex += 1) {
        assert.deepEqual(getRl6RelayTerminalNames('RELAY', relayIndex), {
            a: `RELAY-${relayIndex <= 3 ? '1-2-3' : '4-5-6'}-A`,
            b: `RELAY-${relayIndex}-B`,
        });
    }
});

test('supports the equivalent grouped RELAY-S terminal names', () => {
    assert.deepEqual(getRl6RelayTerminalNames('RELAY-S', 4), {
        a: 'RELAY-S-4-5-6-A',
        b: 'RELAY-S-4-B',
    });
});

test('builds sparse relay occupancy and marks slots covered by double relay', () => {
    const first = { id: 1, type: 'pump-220v', relay_slot_index: 1 };
    const doubleRelay = { id: 2, type: '220servo', connection_type: 'double_relay', relay_slot_index: 2 };

    const occupancy = buildRelaySlotOccupancyPreserveIndexes([first, doubleRelay], 4);

    assert.equal(occupancy[0], null);
    assert.deepEqual(occupancy[1], { device: first, span: 1, startSlot: 1, covered: false });
    assert.deepEqual(occupancy[2], { device: doubleRelay, span: 2, startSlot: 2, covered: false });
    assert.deepEqual(occupancy[3], { device: doubleRelay, span: 2, startSlot: 2, covered: true });
});

test('moves a conflicting stored relay index to the next free slot', () => {
    const first = { id: 1, relay_slot_index: 1 };
    const second = { id: 2, relay_slot_index: 1 };

    const occupancy = buildRelaySlotOccupancyPreserveIndexes([first, second], 4);

    assert.equal(occupancy[1].device, first);
    assert.equal(occupancy[2].device, second);
    assert.equal(occupancy[2].startSlot, 2);
});

test('compacts holes while preserving explicit and fallback relay indexes', () => {
    assert.deepEqual(compactRelayLinePreserveIndexes([
        { id: 1 },
        null,
        { id: 2, relay_slot_index: 3 },
    ]), [
        { id: 1, relay_slot_index: 0 },
        { id: 2, relay_slot_index: 3 },
    ]);
});

test('upserts a relay device at its physical slot without reordering other slots', () => {
    const current = [
        { id: 1, relay_slot_index: 0 },
        { id: 2, relay_slot_index: 3 },
    ];

    assert.deepEqual(upsertRelayDeviceAtSlot(current, 3, { id: 4, type: 'valve' }, 4), [
        { id: 1, relay_slot_index: 0 },
        { id: 4, type: 'valve', relay_slot_index: 3 },
    ]);
});

test('removes a double relay device through either its start or covered slot', () => {
    const first = { id: 1, relay_slot_index: 0 };
    const doubleRelay = { id: 2, connection_type: 'double_relay', relay_slot_index: 1 };
    const line = [first, doubleRelay];

    assert.deepEqual(removeRelayDeviceAtSlotFromLine(line, 2, 4), [
        { id: 1, relay_slot_index: 0 },
    ]);
    assert.deepEqual(removeRelayDeviceAtSlotFromLine(line, 0, 4, { id: 1 }), [
        { id: 2, connection_type: 'double_relay', relay_slot_index: 1 },
    ]);
});
