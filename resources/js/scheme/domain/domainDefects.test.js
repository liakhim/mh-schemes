import test from 'node:test';
import assert from 'node:assert/strict';
import { materializeBalancedOneWireScheme } from './oneWireMaterializer.js';
import { removeOneWireDeviceFromScheme } from './oneWireMutations.js';

const makeBoiler = (id) => ({ id, type: 'stupid', connection_type: 'relay' });
const makeServo = (id) => ({
    id: `servo-${id}`,
    type: '220servo',
    device_type: 'equipment',
    connection_type: 'double_relay',
    mixing_unit_id: id,
});
const makeMixingSensor = (id, connectionType = 'ntc') => ({
    id: `sensor-${id}`,
    type: connectionType === 'ntc' ? 'mixing-ntc-sensor' : 'flask-sensor-mixing-unit',
    device_type: 'sensor',
    connection_type: connectionType,
    mixing_unit_id: id,
});

test('Smart2 places one boiler on controller RELAY and the next on RL2', () => {
    const result = materializeBalancedOneWireScheme({
        controller: { type: 'smart2', relay_devices: [] },
        di_modules: [{ id: 'relay-2', type: 'rl2', relay_devices: [] }],
        ext_modules: [],
        boilers: [makeBoiler('boiler-1'), makeBoiler('boiler-2')],
    });

    assert.deepEqual(result.controller.relay_devices.map(({ id }) => id), ['boiler-1']);
    assert.deepEqual(result.di_modules[0].relay_devices.map(({ id }) => id), ['boiler-2']);
    assert.deepEqual(result.boilers, []);
    assert.deepEqual(materializeBalancedOneWireScheme(result), result);
});

test('ECOsmart assigns mixing sensors only for servos that were placed', () => {
    const result = materializeBalancedOneWireScheme({
        controller: { type: 'ecosmart', one_wire_devices: [], '220_servo_devices': [] },
        ext_modules: [],
        wired_devices: [makeServo('mix-1'), makeServo('mix-2'), makeServo('mix-3')],
        sensors: [
            makeMixingSensor('mix-3'),
            makeMixingSensor('mix-2'),
            makeMixingSensor('mix-1', '1-wire'),
        ],
    });

    assert.deepEqual(result.controller['220_servo_devices'].map(({ mixing_unit_id }) => mixing_unit_id), ['mix-1', 'mix-2']);
    assert.deepEqual(result.controller.mixing_ntc_devices.map(({ mixing_unit_id }) => mixing_unit_id), ['mix-2']);
    assert.deepEqual(result.controller.one_wire_devices.map(({ mixing_unit_id }) => mixing_unit_id), ['mix-1']);
    assert.deepEqual(result.wired_devices.map(({ mixing_unit_id }) => mixing_unit_id), ['mix-3']);
    assert.deepEqual(result.sensors.map(({ mixing_unit_id }) => mixing_unit_id), ['mix-3']);
    assert.deepEqual(materializeBalancedOneWireScheme(result), result);
});

test('PRO places a linked GVS boiler sensor on one-wire instead of treating it as mixing', () => {
    const result = materializeBalancedOneWireScheme({
        controller: { type: 'pro', relay_devices: [], relay_s_devices: [], one_wire_devices: [] },
        ext_modules: [],
        wired_devices: [{
            id: 'gvs-pump',
            type: 'boiler-pump',
            device_type: 'equipment',
            connection_type: 'relay|relay-s',
            mixing_unit_id: 'gvs-1',
            _group: 'gvs',
        }],
        sensors: [{
            id: 'gvs-sensor',
            type: 'flask-sensor-gvs-boiler',
            device_type: 'sensor',
            connection_type: '1-wire|ntc',
            mixing_unit_id: 'gvs-1',
            _group: 'gvs',
        }],
        one_wire_modules: [{ id: 'ntc-module', type: 'ntc-1-wire', connection_type: '1-wire' }],
    });

    assert.equal(
        result.controller.one_wire_devices.some((device) => device.id === 'gvs-sensor'),
        true,
    );
    assert.equal(result.sensors.some((device) => device.id === 'gvs-sensor'), false);
});

test('returns controller 1-wire overflow to its public source without losses', () => {
    const sensors = Array.from({ length: 7 }, (_, index) => ({
        id: `digital-${index + 1}`,
        type: 'wall-digital-sensor',
        device_type: 'sensor',
        connection_type: '1-wire',
    }));
    const result = materializeBalancedOneWireScheme({
        controller: { type: 'smart2', one_wire_devices: sensors },
        ext_modules: [],
        sensors: [],
    });

    assert.equal(result.controller.one_wire_devices.length, 6);
    assert.deepEqual(result.sensors.map(({ id }) => id), ['digital-7']);
    assert.equal(new Set([...result.controller.one_wire_devices, ...result.sensors].map(({ id }) => id)).size, 7);
    assert.deepEqual(materializeBalancedOneWireScheme(result), result);
});

test('preserves multiplicity for id-less one-wire overflow without duplicating it on reopen', () => {
    const sensor = {
        type: 'wall-digital-sensor',
        device_type: 'sensor',
        connection_type: '1-wire',
    };
    const result = materializeBalancedOneWireScheme({
        controller: { type: 'smart2', one_wire_devices: Array.from({ length: 8 }, () => ({ ...sensor })) },
        ext_modules: [],
        sensors: [],
    });

    assert.equal(result.controller.one_wire_devices.length, 6);
    assert.equal(result.sensors.length, 2);
    const repeated = materializeBalancedOneWireScheme(result);
    assert.equal(repeated.controller.one_wire_devices.length, 6);
    assert.equal(repeated.sensors.length, 2);
    assert.deepEqual(repeated, result);
});

test('returns materialized EXT 1-wire overflow without moving or losing its owner devices', () => {
    const controllerDevices = Array.from({ length: 6 }, (_, index) => ({
        id: `controller-digital-${index + 1}`,
        type: 'wall-digital-sensor',
        device_type: 'sensor',
        connection_type: '1-wire',
    }));
    const extDevices = Array.from({ length: 7 }, (_, index) => ({
        id: `ext-digital-${index + 1}`,
        type: 'wall-digital-sensor',
        device_type: 'sensor',
        connection_type: '1-wire',
    }));
    const result = materializeBalancedOneWireScheme({
        controller: { type: 'pro', one_wire_devices: controllerDevices },
        ext_modules: [{ id: 'rl6-owner', type: 'rl6', one_wire_devices: extDevices }],
        sensors: [],
    });

    assert.deepEqual(result.controller.one_wire_devices.map(({ id }) => id), controllerDevices.map(({ id }) => id));
    assert.deepEqual(result.ext_modules[0].one_wire_devices.map(({ id }) => id), extDevices.slice(0, 6).map(({ id }) => id));
    assert.deepEqual(result.sensors.map(({ id }) => id), ['ext-digital-7']);
    assert.equal(new Set([
        ...result.controller.one_wire_devices,
        ...result.ext_modules[0].one_wire_devices,
        ...result.sensors,
    ].map(({ id }) => id)).size, 13);
    assert.deepEqual(materializeBalancedOneWireScheme(result), result);
});

test('keeps user-created empty NTC modules and removes only empty generated modules', () => {
    const result = materializeBalancedOneWireScheme({
        controller: {
            type: 'smart2',
            one_wire_devices: [
                { id: 'user-ntc', type: 'ntc-1-wire', connection_type: '1-wire' },
                { id: 'auto-ntc-1-wire-9', type: 'ntc-1-wire', connection_type: '1-wire' },
            ],
        },
        ext_modules: [],
    });

    assert.deepEqual(result.controller.one_wire_devices.map(({ id }) => id), ['user-ntc']);
    assert.deepEqual(materializeBalancedOneWireScheme(result), result);
});

test('absorbs an EXT thermostat floor sensor once and remains idempotent', () => {
    const result = materializeBalancedOneWireScheme({
        controller: { type: 'pro', one_wire_devices: [], ext_devices: [] },
        ext_modules: [],
        wired_devices: [{
            id: 'thermostat-1',
            type: 'thermostat',
            connection_type: '1-wire',
            additions: [{
                id: 'floor-1',
                type: 'floor-sensor',
                device_type: 'sensor',
                connection_type: '1-wire',
            }],
        }],
        sensors: [],
    });

    assert.equal(result.controller.ext_devices.length, 1);
    assert.deepEqual(result.controller.ext_devices[0].additions.map(({ id }) => id), ['floor-1']);
    assert.deepEqual(result.wired_devices, []);
    assert.deepEqual(result.sensors, []);
    assert.deepEqual(materializeBalancedOneWireScheme(result), result);
});

test('keeps nested EXT one-wire devices on their stable module id after reorder', () => {
    const assignedSensor = makeMixingSensor('mix-a');
    const scheme = {
        controller: { type: 'pro', relay_s_devices: [], one_wire_devices: [] },
        ext_modules: [
            {
                id: 'module-a',
                type: 'rl6s',
                relay_s_devices: [makeServo('mix-a')],
                one_wire_devices: [{
                    id: 'ntc-a',
                    type: 'ntc-1-wire',
                    connection_type: '1-wire',
                    mixing_owner_key: 'ext:module-a',
                    ntc1_devices: [assignedSensor],
                }],
            },
            { id: 'module-b', type: 'rl6s', relay_s_devices: [], one_wire_devices: [] },
        ],
        sensors: [],
        wired_devices: [],
    };
    const first = materializeBalancedOneWireScheme(scheme);
    const reordered = materializeBalancedOneWireScheme({ ...first, ext_modules: [...first.ext_modules].reverse() });
    const owner = reordered.ext_modules.find(({ id }) => id === 'module-a');

    assert.deepEqual(owner.relay_s_devices.map(({ mixing_unit_id }) => mixing_unit_id), ['mix-a']);
    assert.deepEqual(owner.one_wire_devices[0].ntc1_devices.map(({ mixing_unit_id }) => mixing_unit_id), ['mix-a']);
    assert.equal(reordered.ext_modules.find(({ id }) => id === 'module-b').one_wire_devices.length, 0);
    assert.deepEqual(materializeBalancedOneWireScheme(reordered), reordered);
});

test('does not use controller-incompatible module arrays for placement', () => {
    const smartExtDevice = { id: 'ext-device', type: 'wall-digital-sensor', device_type: 'sensor', connection_type: '1-wire' };
    const smart = materializeBalancedOneWireScheme({
        controller: { type: 'smart2', one_wire_devices: [] },
        ext_modules: [{ id: 'foreign-ext', type: 'rl6s', one_wire_devices: [smartExtDevice], relay_s_devices: [] }],
        di_modules: [],
    });
    assert.deepEqual(smart.ext_modules[0].one_wire_devices.map(({ id }) => id), ['ext-device']);
    assert.equal(smart.controller.one_wire_devices.length, 0);

    const proDi = { id: 'foreign-di-device', type: 'zoneServo', connection_type: 'relay-s' };
    const pro = materializeBalancedOneWireScheme({
        controller: { type: 'pro', relay_s_devices: [], one_wire_devices: [] },
        ext_modules: [],
        di_modules: [{ id: 'foreign-di', type: 'rl2s', relay_s_devices: [proDi] }],
        wired_devices: [],
    });
    assert.deepEqual(pro.di_modules[0].relay_s_devices.map(({ id }) => id), ['foreign-di-device']);
    assert.equal(pro.controller.relay_s_devices.length, 0);
});

test('places double-relay valves in free physical RELAY-S pairs', () => {
    const valve = { id: 'valve-1', type: 'valve', connection_type: 'double_relay' };
    const pro = materializeBalancedOneWireScheme({
        controller: { type: 'pro', relay_s_devices: [] },
        ext_modules: [],
        wired_devices: [valve],
    });
    assert.deepEqual(pro.controller.relay_s_devices.map(({ id }) => id), ['valve-1']);
    assert.equal(pro.controller.relay_s_devices[0].relay_slot_index, 0);

    const smart = materializeBalancedOneWireScheme({
        controller: { type: 'smart2', relay_devices: [] },
        di_modules: [{ id: 'rl2s-1', type: 'rl2s', relay_s_devices: [] }],
        ext_modules: [],
        wired_devices: [valve],
    });
    assert.deepEqual(smart.di_modules[0].relay_s_devices.map(({ id }) => id), ['valve-1']);
    assert.deepEqual(smart.wired_devices, []);

    const ext = materializeBalancedOneWireScheme({
        controller: {
            type: 'pro',
            relay_s_devices: Array.from({ length: 4 }, (_, index) => ({
                id: `occupied-${index}`,
                type: 'zoneServo',
                connection_type: 'relay-s',
            })),
        },
        ext_modules: [{ id: 'rl6s-1', type: 'rl6s', relay_s_devices: [] }],
        wired_devices: [valve],
    });
    assert.deepEqual(ext.ext_modules[0].relay_s_devices.map(({ id }) => id), ['valve-1']);
    assert.deepEqual(ext.wired_devices, []);
});

test('places double-relay devices only into a contiguous sparse RELAY-S pair', () => {
    const valve = { id: 'sparse-valve', type: 'valve', connection_type: 'double_relay' };
    const occupiedRelay = Array.from({ length: 4 }, (_, index) => ({
        id: `relay-${index}`,
        type: 'other-equipment',
        connection_type: 'relay',
        relay_slot_index: index,
    }));
    const withPair = materializeBalancedOneWireScheme({
        controller: {
            type: 'pro',
            relay_s_devices: [
                { id: 'slot-0', type: 'zoneServo', connection_type: 'relay-s', relay_slot_index: 0 },
                { id: 'slot-3', type: 'zoneServo', connection_type: 'relay-s', relay_slot_index: 3 },
            ],
            relay_devices: occupiedRelay,
        },
        ext_modules: [],
        wired_devices: [valve],
    });
    const placedValve = withPair.controller.relay_s_devices.find(({ id }) => id === 'sparse-valve');
    assert.equal(placedValve.relay_slot_index, 1);
    assert.deepEqual(withPair.wired_devices, []);
    assert.deepEqual(materializeBalancedOneWireScheme(withPair), withPair);

    const withoutPair = materializeBalancedOneWireScheme({
        controller: {
            type: 'pro',
            relay_s_devices: [
                { id: 'slot-0', type: 'zoneServo', connection_type: 'relay-s', relay_slot_index: 0 },
                { id: 'slot-2', type: 'zoneServo', connection_type: 'relay-s', relay_slot_index: 2 },
            ],
            relay_devices: occupiedRelay,
        },
        ext_modules: [],
        wired_devices: [valve],
    });
    assert.equal(withoutPair.controller.relay_s_devices.some(({ id }) => id === 'sparse-valve'), false);
    assert.deepEqual(withoutPair.wired_devices.map(({ id }) => id), ['sparse-valve']);
});

test('restores assigned sensors before deleting an NTC-1-wire module', () => {
    const sensor1 = { id: 'ntc-1', type: 'ntc-sensor', device_type: 'sensor', connection_type: 'ntc' };
    const sensor2 = { id: 'ntc-2', type: 'ntc-sensor', device_type: 'sensor', connection_type: 'ntc' };
    const result = removeOneWireDeviceFromScheme({
        controller: {
            type: 'smart2',
            one_wire_devices: [{
                id: 'ntc-module',
                type: 'ntc-1-wire',
                connection_type: '1-wire',
                ntc1_devices: [sensor1],
                ntc2_devices: [sensor2],
            }],
        },
        sensors: [{ id: 'existing', type: 'wall-temperature-sensor', device_type: 'sensor', connection_type: 'ntc' }],
    }, 0);

    assert.deepEqual(result.controller.one_wire_devices, []);
    assert.deepEqual(result.sensors.map(({ id }) => id), ['existing', 'ntc-1', 'ntc-2']);
});
