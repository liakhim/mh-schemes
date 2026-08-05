import assert from 'node:assert/strict';
import test from 'node:test';
import { getControllerKitSensorState, isBundledSensorDevice } from './controllerKitSensors.js';

test('counts a PRO kit wall sensor placed on an EXT 1-wire line as used', () => {
    const sensor = {
        id: 'wall-sensor',
        type: 'wall-digital-sensor',
        device_type: 'sensor',
        connection_type: '1-wire',
    };
    const state = getControllerKitSensorState({
        controller: { type: 'pro', one_wire_devices: [] },
        ext_modules: [{ id: 'rl6', type: 'rl6', one_wire_devices: [sensor] }],
    }, 'pro');

    assert.equal(state.remaining.wall, 0);
    assert.equal(isBundledSensorDevice(state.bundled, sensor), true);
});

test('counts a kit sensor placed on a WIFI 1-wire line as used', () => {
    const sensor = {
        id: 'wall-sensor',
        type: 'wall-digital-sensor',
        device_type: 'sensor',
        connection_type: '1-wire',
    };
    const state = getControllerKitSensorState({
        controller: { type: 'pro', one_wire_devices: [] },
        wifi_modules: [{ id: 'rl6w', type: 'rl6w', one_wire_devices: [sensor] }],
    }, 'pro');

    assert.equal(state.remaining.wall, 0);
    assert.equal(isBundledSensorDevice(state.bundled, sensor), true);
});
