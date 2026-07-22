import test from 'node:test';
import assert from 'node:assert/strict';
import { buildControllerOnlyScheme, isControllerOnlyScheme } from './controllerOnlyScheme.js';

test('creates a scheme containing only the selected controller', () => {
    const scheme = buildControllerOnlyScheme('pro');

    assert.deepEqual(Object.keys(scheme), ['controller']);
    assert.equal(scheme.controller.type, 'pro');
    assert.deepEqual(scheme.controller.relay_devices, []);
});

test('supports all five controllers', () => {
    assert.deepEqual(
        ['go', 'go+', 'smart2', 'pro', 'ecosmart'].map((type) => buildControllerOnlyScheme(type)?.controller.type),
        ['go', 'go+', 'smart2', 'pro', 'ecosmart'],
    );
});

test('rejects an unknown controller', () => {
    assert.equal(buildControllerOnlyScheme('unknown'), null);
});

test('recognizes an empty normalized controller draft', () => {
    assert.equal(isControllerOnlyScheme({ controller: { type: 'smart2' }, wireless_devices: [] }), true);
    assert.equal(isControllerOnlyScheme({ controller: { type: 'smart2' }, ext_modules: [{ type: 'io4' }] }), false);
});
