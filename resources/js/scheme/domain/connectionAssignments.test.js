import assert from 'node:assert/strict';
import test from 'node:test';
import { serializePublicScheme } from '../publicSchemeSerializer.js';
import { materializeBalancedOneWireScheme } from './oneWireMaterializer.js';

const pressureSensor = (id) => ({
    id,
    type: 'pressure-sensor',
    device_type: 'sensor',
    connection_type: '4-20',
});

const relayDevice = (id) => ({
    id,
    type: 'pump-220v',
    device_type: 'equipment',
    connection_type: 'relay|relay-s',
});

const discreteDevice = (id) => ({
    id,
    type: 'discrete_signal',
    device_type: 'equipment',
    connection_type: 'di',
});

const serializeAndReopen = (materialized) => {
    const saved = serializePublicScheme(materialized);
    return { saved, reopened: materializeBalancedOneWireScheme(saved) };
};

const countDevice = (scheme, id) => {
    const lineKeys = [
        'bus_devices',
        'relay_devices',
        'relay_s_devices',
        'di_devices',
        'channel_devices',
        'devices_420',
        'devices420',
    ];
    const owners = [scheme?.controller, ...(scheme?.ext_modules || []), ...(scheme?.di_modules || [])];
    const placed = owners.reduce((count, owner) => count + lineKeys.reduce((lineCount, line) => (
        lineCount + (Array.isArray(owner?.[line]) ? owner[line].filter((device) => device?.id === id).length : 0)
    ), 0), 0);
    const publicCount = ['boilers', 'wired_devices', 'sensors'].reduce((count, bucket) => (
        count + (Array.isArray(scheme?.[bucket]) ? scheme[bucket].filter((device) => device?.id === id).length : 0)
    ), 0);
    return placed + publicCount;
};

test('round trip keeps a pressure sensor on its IO4 while controller 4-20 is free', () => {
    const sensor = pressureSensor('pressure-io4');
    const { saved, reopened } = serializeAndReopen({
        controller: { type: 'pro', devices_420: [] },
        ext_modules: [{ id: 'io4-a', type: 'io4', channel_devices: [sensor] }],
    });

    assert.deepEqual(saved.connection_layout.assignments, [{
        device_type: 'pressure-sensor',
        device_id: 'pressure-io4',
        owner_kind: 'ext_module',
        owner_id: 'io4-a',
        line: 'channel_devices',
        slot: 0,
    }]);
    assert.equal(reopened.controller.devices_420.length, 0);
    assert.equal(reopened.ext_modules[0].channel_devices[0].id, sensor.id);
    assert.equal(countDevice(reopened, sensor.id), 1);
});

test('numeric and string device ids remain distinct through serialization and reopen', () => {
    const numericSensor = pressureSensor(1);
    const stringSensor = pressureSensor('1');
    const { saved, reopened } = serializeAndReopen({
        controller: { type: 'pro', devices_420: [] },
        ext_modules: [
            { id: 'io4-numeric', type: 'io4', channel_devices: [numericSensor] },
            { id: 'io4-string', type: 'io4', channel_devices: [stringSensor] },
        ],
    });

    assert.deepEqual(saved.sensors.map((sensor) => sensor.id), [1, '1']);
    assert.deepEqual(saved.connection_layout.assignments.map((assignment) => assignment.device_id), [1, '1']);
    assert.equal(reopened.ext_modules[0].channel_devices[0].id, 1);
    assert.equal(reopened.ext_modules[1].channel_devices[0].id, '1');
    assert.equal(countDevice(reopened, 1), 1);
    assert.equal(countDevice(reopened, '1'), 1);

    const deduplicated = serializePublicScheme({
        controller: { type: 'pro', devices_420: [{ ...numericSensor, title: 'current' }] },
        sensors: [{ ...numericSensor, title: 'stale' }],
    });
    assert.equal(deduplicated.sensors.length, 1);
    assert.equal(deduplicated.sensors[0].title, 'current');
});

test('round trip keeps relay owner and physical relay slot', () => {
    const device = { ...relayDevice('relay-rl6'), relay_slot_index: 4 };
    const { reopened } = serializeAndReopen({
        controller: { type: 'pro', relay_devices: [] },
        ext_modules: [{ id: 'rl6-a', type: 'rl6', relay_devices: [device] }],
    });

    assert.equal(reopened.controller.relay_devices.length, 0);
    assert.equal(reopened.ext_modules[0].relay_devices[0].id, device.id);
    assert.equal(reopened.ext_modules[0].relay_devices[0].relay_slot_index, 4);
    assert.equal(countDevice(reopened, device.id), 1);
});

test('round trip keeps the first physical slot of a double relay span', () => {
    const device = {
        id: 'double-relay-rl6s',
        type: 'valve',
        device_type: 'equipment',
        connection_type: 'double_relay',
        relay_slot_index: 3,
    };
    const { saved, reopened } = serializeAndReopen({
        controller: { type: 'pro', relay_s_devices: [] },
        ext_modules: [{ id: 'rl6s-a', type: 'rl6s', relay_s_devices: [device] }],
    });

    assert.equal(saved.connection_layout.assignments[0].slot, 3);
    assert.equal(reopened.ext_modules[0].relay_s_devices[0].relay_slot_index, 3);
    assert.equal(countDevice(reopened, device.id), 1);
});

test('round trip keeps discrete devices on exact DI6 and IO4 channel slots', () => {
    const di6Device = discreteDevice('di-di6');
    const io4Device = discreteDevice('di-io4');
    const di6Channels = [];
    const io4Channels = [];
    di6Channels[4] = di6Device;
    io4Channels[2] = io4Device;
    const { reopened } = serializeAndReopen({
        controller: { type: 'pro', di_devices: [] },
        ext_modules: [
            { id: 'di6-a', type: 'di6', channel_devices: di6Channels },
            { id: 'io4-a', type: 'io4', channel_devices: io4Channels },
        ],
    });

    assert.equal(reopened.controller.di_devices.length, 0);
    assert.equal(reopened.ext_modules[0].channel_devices[4].id, di6Device.id);
    assert.equal(reopened.ext_modules[1].channel_devices[2].id, io4Device.id);
    assert.equal(countDevice(reopened, di6Device.id), 1);
    assert.equal(countDevice(reopened, io4Device.id), 1);
});

test('round trip restores a 0-10V device and mixing NTC addition to exact IO4 slots', () => {
    const servo = {
        id: 'servo-group',
        type: '010servo',
        device_type: 'equipment',
        connection_type: 'di',
        additions: [],
    };
    const sensor = {
        id: 'ntc-group',
        type: 'mixing-ntc-sensor',
        device_type: 'sensor',
        connection_type: 'ntc',
        ownerServo010Id: servo.id,
    };
    const channels = [];
    channels[1] = servo;
    channels[2] = sensor;
    const { saved, reopened } = serializeAndReopen({
        controller: { type: 'pro' },
        ext_modules: [{ id: 'io4-group', type: 'io4', channel_devices: channels }],
    });

    assert.deepEqual(saved.wired_devices[0].additions.map((item) => item.id), [sensor.id]);
    assert.equal(reopened.ext_modules[0].channel_devices[1].id, servo.id);
    assert.deepEqual(reopened.ext_modules[0].channel_devices[1].additions, []);
    assert.equal(reopened.ext_modules[0].channel_devices[2].id, sensor.id);
    assert.equal(reopened.ext_modules[0].channel_devices[2].ownerServo010Id, servo.id);
    assert.equal(countDevice(reopened, servo.id), 1);
    assert.equal(countDevice(reopened, sensor.id), 1);
    const resaved = serializePublicScheme(reopened);
    assert.deepEqual(resaved.wired_devices[0].additions.map((item) => item.id), [sensor.id]);
    assert.deepEqual(resaved.connection_layout.assignments.map((assignment) => assignment.slot), [1, 2]);
});

test('corrupted mixing NTC assignment falls back with the complete 0-10V group', () => {
    const servo = {
        id: 'pump-fallback',
        type: '010pump',
        device_type: 'equipment',
        connection_type: 'di',
        additions: [],
    };
    const sensor = {
        id: 'ntc-fallback',
        type: 'mixing-ntc-sensor',
        device_type: 'sensor',
        connection_type: 'ntc',
        ownerServo010Id: servo.id,
    };
    const saved = serializePublicScheme({
        controller: { type: 'pro' },
        ext_modules: [{ id: 'io4-group', type: 'io4', channel_devices: [servo, sensor] }],
    });
    const childAssignment = saved.connection_layout.assignments
        .find((assignment) => assignment.device_id === sensor.id);
    childAssignment.slot = 3;

    const reopened = materializeBalancedOneWireScheme(saved);
    assert.equal(reopened.ext_modules[0].channel_devices[0].id, servo.id);
    assert.deepEqual(reopened.ext_modules[0].channel_devices[0].additions, []);
    assert.equal(reopened.ext_modules[0].channel_devices[1].id, sensor.id);
    assert.equal(reopened.ext_modules[0].channel_devices[1].ownerServo010Id, servo.id);
    assert.equal(countDevice(reopened, servo.id), 1);
    assert.equal(countDevice(reopened, sensor.id), 1);
});

test('round trip keeps a BUS boiler on BL2', () => {
    const boiler = {
        id: 'bus-bl2',
        type: 'smart',
        device_type: 'boiler',
        connection_type: 'BUS',
    };
    const { reopened } = serializeAndReopen({
        controller: { type: 'pro', bus_devices: [] },
        ext_modules: [{ id: 'bl2-a', type: 'bl2', bus_devices: [boiler] }],
    });

    assert.equal(reopened.controller.bus_devices.length, 0);
    assert.equal(reopened.ext_modules[0].bus_devices[0].id, boiler.id);
    assert.equal(countDevice(reopened, boiler.id), 1);
});

test('ECOsmart does not place BUS overflow on an ordinary EXT BL2', () => {
    const boilers = ['eco-bus-1', 'eco-bus-2', 'eco-bus-overflow'].map((id) => ({
        id,
        type: 'smart',
        device_type: 'boiler',
        connection_type: 'BUS',
    }));
    const saved = serializePublicScheme({
        controller: { type: 'ecosmart', bus_devices: boilers.slice(0, 2) },
        ext_modules: [{ id: 'ordinary-bl2', type: 'bl2', bus_devices: [boilers[2]] }],
    });

    assert.deepEqual(saved.connection_layout.assignments.map((assignment) => assignment.device_id), [
        'eco-bus-1',
        'eco-bus-2',
    ]);
    saved.connection_layout.assignments.push({
        device_type: 'smart',
        device_id: 'eco-bus-overflow',
        owner_kind: 'ext_module',
        owner_id: 'ordinary-bl2',
        line: 'bus_devices',
        slot: 0,
    });

    const reopened = materializeBalancedOneWireScheme(saved);
    assert.deepEqual(reopened.controller.bus_devices.map((boiler) => boiler.id), ['eco-bus-1', 'eco-bus-2']);
    assert.equal(reopened.ext_modules[0].id, 'ordinary-bl2');
    assert.equal(reopened.ext_modules[0].bus_devices.length, 0);
    assert.deepEqual(reopened.boilers.map((boiler) => boiler.id), ['eco-bus-overflow']);
    assert.equal(countDevice(reopened, 'eco-bus-overflow'), 1);

    const resaved = serializePublicScheme(reopened);
    assert.equal(resaved.connection_layout.assignments.some((assignment) => (
        assignment.device_id === 'eco-bus-overflow'
    )), false);
});

test('module reordering does not change assignment owner selected by id', () => {
    const sensor = pressureSensor('pressure-reordered');
    const saved = serializePublicScheme({
        controller: { type: 'pro' },
        ext_modules: [
            { id: 'io4-target', type: 'io4', channel_devices: [sensor] },
            { id: 'io4-other', type: 'io4', channel_devices: [] },
        ],
    });
    saved.ext_modules.reverse();

    const reopened = materializeBalancedOneWireScheme(saved);
    assert.equal(reopened.ext_modules.find((item) => item.id === 'io4-target').channel_devices[0].id, sensor.id);
    assert.equal(reopened.ext_modules.find((item) => item.id === 'io4-other').channel_devices.length, 0);
});

test('removed owner module falls back to automatic placement without loss or duplication', () => {
    const device = relayDevice('relay-missing-owner');
    const saved = serializePublicScheme({
        controller: { type: 'pro', relay_devices: [] },
        ext_modules: [{ id: 'rl6-removed', type: 'rl6', relay_devices: [device] }],
    });
    saved.ext_modules = [];

    const reopened = materializeBalancedOneWireScheme(saved);
    assert.equal(reopened.controller.relay_devices[0].id, device.id);
    assert.equal(reopened.controller.relay_devices[0].relay_slot_index, 0);
    assert.equal(countDevice(reopened, device.id), 1);
});

test('corrupted assignment falls back to automatic placement without losing the device', () => {
    const sensor = pressureSensor('pressure-corrupt');
    const saved = serializePublicScheme({
        controller: { type: 'pro', devices_420: [] },
        ext_modules: [{ id: 'io4-a', type: 'io4', channel_devices: [sensor] }],
    });
    saved.connection_layout.assignments[0].slot = 99;

    const reopened = materializeBalancedOneWireScheme(saved);
    assert.equal(reopened.controller.devices_420[0].id, sensor.id);
    assert.equal(countDevice(reopened, sensor.id), 1);
});

test('legacy scheme without connection_layout keeps automatic balancing behavior', () => {
    const sensor = pressureSensor('pressure-legacy');
    const legacy = {
        controller: { type: 'pro' },
        ext_modules: [{ id: 'io4-a', type: 'io4' }],
        sensors: [sensor],
    };

    const reopened = materializeBalancedOneWireScheme(serializePublicScheme(legacy));
    assert.equal(reopened.controller.devices_420[0].id, sensor.id);
    assert.equal(reopened.ext_modules[0].channel_devices.length, 0);
    assert.equal(countDevice(reopened, sensor.id), 1);
});

test('serialization rebuilds stale layout and omits an empty layout', () => {
    const device = { ...relayDevice('relay-current'), relay_slot_index: 2 };
    const saved = serializePublicScheme({
        controller: { type: 'pro', relay_devices: [device] },
        connection_layout: {
            version: 1,
            assignments: [{
                device_type: 'pressure-sensor',
                device_id: 'stale',
                owner_kind: 'controller',
                line: 'devices_420',
                slot: 0,
            }],
        },
    });

    assert.deepEqual(saved.connection_layout.assignments, [{
        device_type: 'pump-220v',
        device_id: 'relay-current',
        owner_kind: 'controller',
        line: 'relay_devices',
        slot: 2,
    }]);
    assert.equal('connection_layout' in serializePublicScheme({
        controller: { type: 'pro' },
        connection_layout: { version: 1, assignments: [] },
    }), false);
});

test('generated balancing ids are not persisted or used for assignments', () => {
    const materialized = materializeBalancedOneWireScheme({
        controller: { type: 'pro' },
        ext_modules: [{ id: 'io4-a', type: 'io4' }],
        sensors: [pressureSensor(undefined)],
    });
    const saved = serializePublicScheme(materialized);

    assert.equal('connection_layout' in saved, false);
    assert.equal('id' in saved.sensors[0], false);
    assert.equal(JSON.stringify(saved).includes('connectionAssignmentGeneratedId'), false);
});

test('round trip restores relay assignment to a smart2 DI module', () => {
    const device = { ...relayDevice('relay-rl2'), relay_slot_index: 1 };
    const { reopened } = serializeAndReopen({
        controller: { type: 'smart2', relay_devices: [] },
        di_modules: [{ id: 'rl2-a', type: 'rl2', relay_devices: [device] }],
    });

    assert.equal(reopened.controller.relay_devices.length, 0);
    assert.equal(reopened.di_modules[0].relay_devices[0].id, device.id);
    assert.equal(reopened.di_modules[0].relay_devices[0].relay_slot_index, 1);
    assert.equal(countDevice(reopened, device.id), 1);
});
