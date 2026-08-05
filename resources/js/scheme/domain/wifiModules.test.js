import assert from 'node:assert/strict';
import test from 'node:test';
import { materializeBalancedOneWireScheme } from './oneWireMaterializer.js';
import { normalizeWifiModules } from './wifiModules.js';

const sensor = (id, type = 'wall-temperature-sensor') => ({
    id,
    type,
    device_type: 'sensor',
    connection_type: '1-wire',
});

test('normalizes top-level WIFI modules without depending on controller type', () => {
    assert.deepEqual(normalizeWifiModules([{ id: 'wifi-a', type: 'RL6W', connection_type: 'EXT' }]), [{
        id: 'wifi-a',
        type: 'rl6w',
        device_type: 'module',
        connection_type: 'WIFI',
        one_wire_devices: [],
        relay_devices: [],
        relay_s_devices: [],
    }]);
});

test('uses WIFI relay lines after controller lines and allows boilers only on RL6W', () => {
    const result = materializeBalancedOneWireScheme({
        controller: { type: 'go', relay_devices: [] },
        wifi_modules: [{ id: 'wifi-s', type: 'rl6sw' }, { id: 'wifi-r', type: 'rl6w' }],
        boilers: [
            { id: 'boiler-1', type: 'stupid', connection_type: 'relay' },
            { id: 'boiler-2', type: 'stupid', connection_type: 'relay' },
        ],
        wired_devices: [{ id: 'pump-1', type: 'pump-220v', connection_type: 'relay' }],
    });

    assert.deepEqual(result.controller.relay_devices.map(({ id }) => id), ['boiler-1']);
    assert.deepEqual(result.wifi_modules[0].relay_s_devices, []);
    assert.deepEqual(result.wifi_modules[1].relay_devices.map(({ id }) => id), ['boiler-2', 'pump-1']);
});

test('supports double relay WIFI lines but keeps a 220servo with its mixing sensor off WIFI', () => {
    const occupied = Array.from({ length: 4 }, (_, index) => ({
        id: `occupied-${index}`,
        type: 'zoneServo',
        connection_type: 'relay-s',
        relay_slot_index: index,
    }));
    const result = materializeBalancedOneWireScheme({
        controller: {
            type: 'pro',
            relay_s_devices: occupied,
            relay_devices: occupied.map((device, index) => ({
                ...device,
                id: `relay-${index}`,
                type: 'other-equipment',
                connection_type: 'relay',
            })),
        },
        ext_modules: [],
        wifi_modules: [{ id: 'wifi-s', type: 'rl6sw' }],
        wired_devices: [
            { id: 'servo-linked', type: '220servo', connection_type: 'double_relay', mixing_unit_id: 'mix-1' },
            { id: 'servo-free', type: '220servo', connection_type: 'double_relay' },
            { id: 'valve-1', type: 'valve', connection_type: 'double_relay' },
        ],
        sensors: [{
            id: 'mix-sensor',
            type: 'flask-sensor-mixing-unit',
            device_type: 'sensor',
            connection_type: '1-wire',
            mixing_unit_id: 'mix-1',
        }],
    });

    assert.deepEqual(result.wifi_modules[0].relay_s_devices.map(({ id }) => id), ['servo-free', 'valve-1']);
    assert.equal(result.wired_devices.some(({ id }) => id === 'servo-linked'), true);
});

test('uses WIFI one-wire only for the three supported sensor types and returns overflow to sensors', () => {
    const ordinary = Array.from({ length: 6 }, (_, index) => sensor(`ordinary-${index}`, 'flask-sensor-strategy'));
    const supported = [
        sensor('wall', 'wall-temperature-sensor'),
        sensor('legacy', 'wall-digital-sensor'),
        sensor('flask', 'flask-sensor-temperature'),
        ...Array.from({ length: 4 }, (_, index) => sensor(`extra-${index}`)),
    ];
    const result = materializeBalancedOneWireScheme({
        controller: { type: 'smart2', one_wire_devices: [] },
        wifi_modules: [{ id: 'wifi-one-wire', type: 'rl6w' }],
        sensors: [...supported, ...ordinary],
        one_wire_modules: [
            { id: 'ntc-module', type: 'ntc-1-wire', connection_type: '1-wire' },
            { id: 'rdt-module', type: 'rdt2', connection_type: '1-wire' },
        ],
        wired_devices: [{ id: 'thermostat', type: 'thermostat', connection_type: '1-wire' }],
    });

    const wifiDevices = result.wifi_modules[0].one_wire_devices;
    assert.equal(wifiDevices.length, 6);
    assert.equal(wifiDevices.every((device) => ['wall-temperature-sensor', 'wall-digital-sensor', 'flask-sensor-temperature'].includes(device.type)), true);
    assert.equal(result.sensors.some(({ id }) => id === 'extra-3'), true);
    assert.equal(wifiDevices.some(({ id }) => id === 'ntc-module' || id === 'rdt-module' || id === 'thermostat'), false);
});

test('preserves WIFI one-wire ownership by module id after reorder and repeat materialization', () => {
    const first = materializeBalancedOneWireScheme({
        controller: { type: 'go', one_wire_devices: Array.from({ length: 6 }, (_, index) => sensor(`ordinary-${index}`, 'flask-sensor-strategy')) },
        wifi_modules: [
            { id: 'wifi-a', type: 'rl6w', one_wire_devices: [sensor('owned')] },
            { id: 'wifi-b', type: 'rl6sw' },
        ],
        sensors: [],
    });
    const reordered = materializeBalancedOneWireScheme({ ...first, wifi_modules: [...first.wifi_modules].reverse() });

    assert.deepEqual(reordered.wifi_modules.find(({ id }) => id === 'wifi-a').one_wire_devices.map(({ id }) => id), ['owned']);
    assert.deepEqual(reordered.wifi_modules.find(({ id }) => id === 'wifi-b').one_wire_devices, []);
    assert.deepEqual(materializeBalancedOneWireScheme(reordered), reordered);
});
