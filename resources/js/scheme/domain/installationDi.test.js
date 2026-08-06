import test from 'node:test';
import assert from 'node:assert/strict';
import {
    buildSmart2InstallationDiConnections,
    getGroupedRelaySupplyLabel,
    getRelayDeviceAtPhysicalSlot,
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

test('labels each occupied RL2 A terminal as an L supply', () => {
    assert.equal(getRelaySupplyLabel('RELAY-1-A', 'rl2'), 'L');
    assert.equal(getRelaySupplyLabel('RELAY-2-A', 'rl2'), 'L');
    assert.equal(getRelaySupplyLabel('RELAY-1-B', 'rl2'), null);
    assert.equal(getRelaySupplyLabel('RELAY-1-A', 'rl2s'), null);
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

test('leaves relay modules beyond Smart2 DI capacity disconnected', () => {
    const connections = buildSmart2InstallationDiConnections({
        hasUps: true,
        moduleLabels: ['RL2 #1', 'RL2 #2'],
    });

    assert.deepEqual(connections.controllerPortLabels, { 0: 'UPS', 1: 'UPS', 2: 'RL2 #1', 3: 'RL2 #1' });
    assert.deepEqual(connections.modulePortLabels, [{ 0: 'SMART2', 1: 'SMART2' }, {}]);
});
