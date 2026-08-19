import assert from 'node:assert/strict';
import test from 'node:test';
import { getOneWirePortColor } from './oneWireRendering.js';

test('uses stable colors for one-wire roles', () => {
    assert.equal(getOneWirePortColor('1-WIRE-V+'), '#d32f2f');
    assert.equal(getOneWirePortColor('1-WIRE-DAT'), '#fbc02d');
    assert.equal(getOneWirePortColor('1-WIRE-GND'), '#212121');
});
