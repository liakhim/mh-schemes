import assert from 'node:assert/strict';
import test from 'node:test';
import {
    getDiInputPort,
    getPortByNameOrClassToken,
    getPressureSensorPorts,
    getRelayInputPort,
    getRelayTerminalPort,
} from './ports.js';

test('finds the first DI input port by its semantic token', () => {
    const firstPort = { name: 'DI-IN', x: 0.2, y: 0.3 };

    assert.equal(getDiInputPort([firstPort, { name: 'DI-IN AUX', x: 0.8, y: 0.3 }]), firstPort);
    assert.equal(getDiInputPort([]), null);
});

test('prefers an exact port name over a matching class token', () => {
    const exact = { name: 'CHANNEL-IN', x: 0.2, y: 0.3 };

    assert.equal(getPortByNameOrClassToken([{ name: 'CHANNEL-IN AUX', x: 0.8, y: 0.3 }, exact], 'CHANNEL-IN'), exact);
});

test('returns both pressure sensor terminals by their semantic roles', () => {
    const vPlus = { name: '4-20-IN-V+', x: 0.2, y: 0.3 };
    const input = { name: '4-20-IN-IN', x: 0.2, y: 0.7 };

    assert.deepEqual(getPressureSensorPorts([input, vPlus]), { vPlus, input });
});

test('keeps the special pump relay input fallback', () => {
    const pumpPort = { name: 'RELAY-IN B', x: 0.4, y: 0.5 };
    const genericPort = { name: 'RELAY-IN', x: 0.6, y: 0.5 };

    assert.equal(getRelayInputPort([genericPort, pumpPort], 'pump-220v', 'pump-220v-right-port'), pumpPort);
    assert.equal(getRelayInputPort([genericPort], 'valve', 'valve-right-port'), genericPort);
});

test('preserves the requested terminal fallback order', () => {
    const relay = { name: 'RELAY-1', x: 0.2, y: 0.5 };
    const relayInput = { name: 'RELAY-IN-1', x: 0.8, y: 0.5 };

    assert.equal(getRelayTerminalPort([relayInput, relay], 1), relay);
    assert.equal(getRelayTerminalPort([relayInput, relay], 1, true), relayInput);
});
