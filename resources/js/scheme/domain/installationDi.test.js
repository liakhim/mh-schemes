import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSmart2InstallationDiConnections } from './installationDi.js';

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
