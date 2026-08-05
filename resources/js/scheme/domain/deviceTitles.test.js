import assert from 'node:assert/strict';
import test from 'node:test';
import { assignMaterializedDeviceTitles, getDeviceStoredTitle } from './deviceTitles.js';

test('uses an edited boiler title before its catalog name', () => {
    assert.equal(getDeviceStoredTitle({
        type: 'smart',
        name: 'Baxi Luna',
        title: 'Котёл первого этажа',
    }), 'Котёл первого этажа');
});

test('uses the boiler catalog name when no custom title is set', () => {
    assert.equal(getDeviceStoredTitle({ type: 'stupid', name: 'Baxi Slim' }), 'Baxi Slim');
});

test('assigns titles to devices materialized on WIFI modules', () => {
    const result = assignMaterializedDeviceTitles({
        wifi_modules: [{
            type: 'rl6w',
            relay_devices: [{ id: 'pump', type: 'pump-220v' }],
            one_wire_devices: [{ id: 'sensor', type: 'wall-temperature-sensor', device_type: 'sensor' }],
        }],
    });

    assert.equal(result.wifi_modules[0].relay_devices[0].title, 'Насос 220V 1');
    assert.equal(result.wifi_modules[0].one_wire_devices[0].title, 'Настенный проводной датчик 1');
});
