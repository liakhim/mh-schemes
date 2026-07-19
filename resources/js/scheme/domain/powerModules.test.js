import test from 'node:test';
import assert from 'node:assert/strict';
import { materializePowerModules } from './powerModules.js';

test('adds mandatory power modules for PRO', () => {
    assert.deepEqual(materializePowerModules(undefined, 'pro', false), [
        'circuit-breaker',
        'power-unit',
    ]);
});

test('adds mandatory power modules before UPS for Smart2', () => {
    assert.deepEqual(materializePowerModules([], 'smart2', true), [
        'circuit-breaker',
        'power-unit',
        'ups',
    ]);
});

test('normalizes mandatory aliases and removes duplicates', () => {
    assert.deepEqual(materializePowerModules([
        'powerunit',
        'circuitbreaker',
        'power-unit',
        { type: 'circuit-breaker' },
        'custom-power-module',
        'ups',
    ], 'pro', true), [
        'circuit-breaker',
        'power-unit',
        'custom-power-module',
        'ups',
    ]);
});

test('does not add a power line to unsupported controllers', () => {
    assert.deepEqual(materializePowerModules(undefined, 'ecosmart', true), []);
});
