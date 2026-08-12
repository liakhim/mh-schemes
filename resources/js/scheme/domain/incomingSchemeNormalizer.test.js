import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeIncomingScheme } from './incomingSchemeNormalizer.js';

test('migrates legacy wireless thermostats into the public wireless bucket', () => {
    const result = normalizeIncomingScheme({
        controller: 'go',
        thermostats: [{ id: 'wireless-1', type: 'THERMOSTAT', color: 'white' }],
    });

    assert.deepEqual(result.wireless_devices, [{ id: 'wireless-1', type: 'thermostat', color: 'white' }]);
    assert.equal(Object.hasOwn(result, 'thermostats'), false);
});

test('keeps a non-empty wireless bucket instead of legacy thermostats', () => {
    const result = normalizeIncomingScheme({
        wireless_devices: [{ id: 'wireless-1', type: 'wall-temperature-sensor' }],
        thermostats: [{ id: 'legacy-1', type: 'thermostat' }],
    });

    assert.deepEqual(result.wireless_devices.map(({ id }) => id), ['wireless-1']);
});

test('normalizes Wi-Fi modules without changing their manual line assignments', () => {
    const relay = { id: 'relay-1', type: 'pump-220v', connection_type: 'relay' };
    const result = normalizeIncomingScheme({
        wifi_modules: [{ id: 'wifi-1', type: 'RL6W', relay_devices: [relay] }],
    });

    assert.deepEqual(result.wifi_modules[0].relay_devices, [relay]);
    assert.equal(result.wifi_modules[0].type, 'rl6w');
    assert.equal(result.wifi_modules[0].connection_type, 'WIFI');
});
