import assert from 'node:assert/strict';
import test from 'node:test';

import {
    getInstallationPortConnectionLabel,
    getInstallationPortLineColor,
    isInstallationPortOccupied,
    parseInstallationPortSlot,
} from './installationPorts.js';

test('parses physical relay ranges and tagged ECOsmart roles', () => {
    assert.deepEqual(parseInstallationPortSlot('RELAY-1-2-3-A'), { line: 'relayRange', indexes: [0, 1, 2] });
    assert.deepEqual(parseInstallationPortSlot('RELAY-S-4-B'), { line: 'relayS', index: 3 });
    assert.deepEqual(parseInstallationPortSlot('RELAY-5-A 220PUMP'), {
        line: 'ecosmartRole',
        key: 'relay_220pump5_devices',
        index: 0,
        fallback: 'Насос 220V',
    });
});

test('maps shared IO4 and one-wire terminals', () => {
    assert.deepEqual(parseInstallationPortSlot('CHANNEL-1-2-GND'), { line: 'channelRange', indexes: [0, 1] });
    assert.deepEqual(parseInstallationPortSlot('1-WIRE-DAT OUT'), { line: 'oneWire', index: null });
    assert.equal(parseInstallationPortSlot('L-IN'), null);
});

test('detects occupied double-relay and IO4 shared terminals', () => {
    const servo = { id: 'servo', type: '220servo', title: 'Сервопривод', connection_type: 'double_relay' };
    assert.equal(isInstallationPortOccupied({ type: 'pro', data: { relay_devices: [servo] } }, { name: 'RELAY-2-B' }), true);

    const ntc = { id: 'ntc', type: 'mixing-ntc-sensor', title: 'NTC', connection_type: 'ntc' };
    assert.equal(isInstallationPortOccupied({ type: 'io4', data: { channel_devices: [null, ntc] } }, { name: 'CHANNEL-1-2-GND' }), true);
    assert.equal(isInstallationPortOccupied({ type: 'io4', data: { channel_devices: [null, ntc] } }, { name: 'CHANNEL-1-2-V+' }), false);
});

test('returns installation labels for relay, power and one-wire ports', () => {
    const pump = { id: 'pump', type: 'pump-220v', title: 'Насос кухни' };
    assert.equal(getInstallationPortConnectionLabel({ type: 'pro', data: { relay_devices: [pump] } }, { name: 'RELAY-1-B' }), 'Насос кухни');
    assert.equal(getInstallationPortConnectionLabel({ type: 'pro', data: { relay_devices: [pump] } }, { name: 'RELAY-1-A' }), 'L');
    assert.equal(getInstallationPortConnectionLabel({ type: 'circuit-breaker', data: {} }, { name: 'L-OUT' }), 'Блок питания');
    assert.equal(getInstallationPortConnectionLabel({ type: 'rdt2', data: {} }, { name: '1-WIRE-DAT OUT', x: 0.8 }, { nextLabel: 'NTC-1-wire' }), 'NTC-1-wire');
});

test('preserves installation wire colors for standard and ECOsmart terminals', () => {
    assert.equal(getInstallationPortLineColor('1-WIRE-V+', { type: 'rdt2', data: {} }), '#d32f2f');
    assert.equal(getInstallationPortLineColor('CHANNEL-IN-1', { type: 'io4', data: { channel_devices: [{ type: 'pressure-sensor' }] } }), '#f57c00');
    assert.equal(getInstallationPortLineColor('RELAY-3-A 220PUMP', { type: 'ecosmart', data: {} }), '#1565c0');
    assert.equal(getInstallationPortLineColor('DI-IN-2-DI', { type: 'ecosmart', data: {} }), '#1976d2');
});
