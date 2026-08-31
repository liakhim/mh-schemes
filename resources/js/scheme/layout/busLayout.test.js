import assert from 'node:assert/strict';
import test from 'node:test';
import { getProEmptyBusSlotY, getProRelaySlotY } from './busLayout.js';

test('places the PRO relay line below the UPS battery', () => {
    assert.equal(getProRelaySlotY({
        controllerHeight: 200,
        hasUps: true,
        batteryHeight: 64,
        indentSize: 8,
    }), 440);
});

test('preserves the existing PRO relay position without UPS', () => {
    assert.equal(getProRelaySlotY({
        controllerHeight: 200,
        hasUps: false,
        batteryHeight: 0,
        indentSize: 8,
    }), 288);
});

test('keeps an empty PRO BUS slot below the relay line and its offsets', () => {
    assert.equal(getProEmptyBusSlotY({
        preferredY: 390,
        relaySlotY: 440,
        relaySlotOffsetYs: [16, -8],
        relaySlotSize: 60,
        indentSize: 8,
    }), 540);
});
