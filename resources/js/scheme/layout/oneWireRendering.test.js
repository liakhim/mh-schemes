import assert from 'node:assert/strict';
import test from 'node:test';
import {
    getOneWireOwnerMinBendY,
    getOneWirePortColor,
    isWallDigitalOneWireDevice,
} from './oneWireRendering.js';

test('uses stable colors for one-wire roles', () => {
    assert.equal(getOneWirePortColor('1-WIRE-V+'), '#d32f2f');
    assert.equal(getOneWirePortColor('1-WIRE-DAT'), '#fbc02d');
    assert.equal(getOneWirePortColor('1-WIRE-GND'), '#212121');
});

test('recognizes canonical and legacy wall digital one-wire devices', () => {
    assert.equal(isWallDigitalOneWireDevice({ type: 'wall-digital-sensor' }, 'wall-digital-sensor'), true);
    assert.equal(isWallDigitalOneWireDevice({ type: 'wall-temperature-sensor' }, 'wall-digital-sensor'), true);
    assert.equal(isWallDigitalOneWireDevice({ type: 'wall-temperature-sensor' }, 'wall-temperature-sensor'), false);
});

test('keeps the first module one-wire bends below its owner', () => {
    assert.equal(getOneWireOwnerMinBendY(200, '1-WIRE-V+', 8), 224);
    assert.equal(getOneWireOwnerMinBendY(200, '1-WIRE-DAT', 8), 232);
    assert.equal(getOneWireOwnerMinBendY(200, '1-WIRE-GND', 8), 240);
});

test('places module one-wire bends below an existing connection route', () => {
    assert.equal(getOneWireOwnerMinBendY(248, '1-WIRE-V+', 8, 1), 256);
    assert.equal(getOneWireOwnerMinBendY(248, '1-WIRE-DAT', 8, 1), 264);
    assert.equal(getOneWireOwnerMinBendY(248, '1-WIRE-GND', 8, 1), 272);
});
