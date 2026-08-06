import test from 'node:test';
import assert from 'node:assert/strict';
import {
    buildSmart2InstallationDiConnections,
    getGroupedRelaySupplyLabel,
    getIo4SharedTerminalDevices,
    getRelayDeviceAtPhysicalSlot,
    getRelayDevicesAtPhysicalSlots,
    getRelaySupplyLabel,
    getSmart2InstallationPowerChainHead,
} from './installationDi.js';

test('labels grouped RL6 and RL6S supply terminals as L', () => {
    assert.equal(getGroupedRelaySupplyLabel('RELAY-1-2-3-A'), 'L');
    assert.equal(getGroupedRelaySupplyLabel('RELAY-4-5-6-A'), 'L');
    assert.equal(getGroupedRelaySupplyLabel('RELAY-S-1-2-3-A'), 'L');
    assert.equal(getGroupedRelaySupplyLabel('RELAY-S-4-5-6-A'), 'L');
    assert.equal(getGroupedRelaySupplyLabel('RELAY-1-2-A'), 'L');
    assert.equal(getGroupedRelaySupplyLabel('RELAY-S-1-2-A'), 'L');
    assert.equal(getGroupedRelaySupplyLabel('RELAY-1-B'), null);
});

test('maps a double relay device to both physical relay ports', () => {
    const servo = { id: 'servo', type: '220servo', connection_type: 'double_relay' };

    assert.equal(getRelayDeviceAtPhysicalSlot([servo], 0), servo);
    assert.equal(getRelayDeviceAtPhysicalSlot([servo], 1), servo);
    assert.equal(getRelayDeviceAtPhysicalSlot([servo], 2), null);
});

test('preserves a sparse relay array index when no physical slot is stored', () => {
    const servo = { id: 'servo', type: 'zoneServo', connection_type: 'relay-s' };

    assert.equal(getRelayDeviceAtPhysicalSlot([null, null, servo], 0), null);
    assert.equal(getRelayDeviceAtPhysicalSlot([null, null, servo], 2), servo);
});

test('resolves every device connected to a mixed RL6 supply group', () => {
    const pump = { id: 'pump', type: 'pump-220v', relay_slot_index: 0 };
    const boiler = { id: 'boiler', type: 'stupid', relay_slot_index: 1 };
    const servo = { id: 'servo', type: 'zoneServo', relay_slot_index: 2 };

    assert.deepEqual(getRelayDevicesAtPhysicalSlots([pump, boiler, servo], [0, 1, 2]), [pump, boiler, servo]);
});

test('connects an IO4 shared GND terminal to NTC but not its paired 0-10V servo', () => {
    const servo = { id: 'servo', type: '010servo', connection_type: 'di' };
    const ntc = { id: 'ntc', type: 'mixing-ntc-sensor', connection_type: 'ntc' };
    const data = { channel_devices: [servo, ntc] };

    assert.deepEqual(getIo4SharedTerminalDevices(data, [0, 1], 'CHANNEL-1-2-GND'), [ntc]);
});

test('labels each occupied RL2 A terminal as an L supply', () => {
    assert.equal(getRelaySupplyLabel('RELAY-1-A', 'rl2'), 'L');
    assert.equal(getRelaySupplyLabel('RELAY-2-A', 'rl2'), 'L');
    assert.equal(getRelaySupplyLabel('RELAY-1-B', 'rl2'), null);
    assert.equal(getRelaySupplyLabel('RELAY-1-A', 'rl2s'), null);
});

test('labels individual PRO RELAY-S A terminals as L supplies', () => {
    for (let slot = 1; slot <= 4; slot += 1) {
        assert.equal(getRelaySupplyLabel(`RELAY-S-${slot}-A`, 'pro'), 'L');
        assert.equal(getRelaySupplyLabel(`RELAY-S-${slot}-B`, 'pro'), null);
    }
});

test('labels individual PRO RELAY A terminals as L supplies', () => {
    for (let slot = 1; slot <= 4; slot += 1) {
        assert.equal(getRelaySupplyLabel(`RELAY-${slot}-A`, 'pro'), 'L');
        assert.equal(getRelaySupplyLabel(`RELAY-${slot}-B`, 'pro'), null);
    }
});

test('excludes RDT2 and other 1-wire devices from the Smart2 12VDC chain', () => {
    const rdt = { type: 'rdt2' };
    const rl2 = { type: 'rl2' };

    assert.equal(getSmart2InstallationPowerChainHead([rdt]), null);
    assert.equal(getSmart2InstallationPowerChainHead([rdt, rl2]), rl2);
});

test('assigns two Smart2 DI pairs to two relay modules without UPS', () => {
    assert.deepEqual(buildSmart2InstallationDiConnections({
        hasUps: false,
        moduleLabels: ['RL2 #1', 'RL2 #2'],
    }), {
        controllerPortLabels: { 0: 'RL2 #1', 1: 'RL2 #1', 2: 'RL2 #2', 3: 'RL2 #2' },
        modulePortLabels: [{ 0: 'SMART2', 1: 'SMART2' }, { 0: 'SMART2', 1: 'SMART2' }],
        upsPortLabels: {},
    });
});

test('reserves the first Smart2 DI pair for UPS', () => {
    assert.deepEqual(buildSmart2InstallationDiConnections({
        hasUps: true,
        moduleLabels: ['RL2S'],
    }), {
        controllerPortLabels: { 0: 'UPS', 1: 'UPS', 2: 'RL2S', 3: 'RL2S' },
        modulePortLabels: [{ 0: 'SMART2', 1: 'SMART2' }],
        upsPortLabels: { 0: 'SMART2', 1: 'SMART2' },
    });
});

test('connects UPS without a relay module', () => {
    assert.deepEqual(buildSmart2InstallationDiConnections({
        hasUps: true,
        moduleLabels: [],
    }), {
        controllerPortLabels: { 0: 'UPS', 1: 'UPS' },
        modulePortLabels: [],
        upsPortLabels: { 0: 'SMART2', 1: 'SMART2' },
    });
});

test('maps direct Smart2 DI devices after the UPS pair', () => {
    const connections = buildSmart2InstallationDiConnections({
        hasUps: true,
        moduleLabels: [],
        deviceLabels: ['Бассейн', 'Вентиляция'],
    });

    assert.deepEqual(connections.controllerPortLabels, {
        0: 'UPS',
        1: 'UPS',
        2: 'Бассейн',
        3: 'Вентиляция',
    });
});

test('maps sparse direct Smart2 DI devices after a relay module pair', () => {
    const connections = buildSmart2InstallationDiConnections({
        hasUps: false,
        moduleLabels: ['RL2'],
        deviceLabels: [null, 'Сигнал'],
    });

    assert.deepEqual(connections.controllerPortLabels, {
        0: 'RL2',
        1: 'RL2',
        3: 'Сигнал',
    });
});

test('leaves relay modules beyond Smart2 DI capacity disconnected', () => {
    const connections = buildSmart2InstallationDiConnections({
        hasUps: true,
        moduleLabels: ['RL2 #1', 'RL2 #2'],
    });

    assert.deepEqual(connections.controllerPortLabels, { 0: 'UPS', 1: 'UPS', 2: 'RL2 #1', 3: 'RL2 #1' });
    assert.deepEqual(connections.modulePortLabels, [{ 0: 'SMART2', 1: 'SMART2' }, {}]);
});
