import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldIncludeCollisionSlot, translateRect, unionRects } from './collisionGeometry.js';

test('builds a module footprint from its body and connected devices', () => {
    assert.deepEqual(unionRects([
        { left: 100, top: 100, right: 180, bottom: 300 },
        { left: 20, top: 40, right: 84, bottom: 104 },
        { left: 212, top: 130, right: 276, bottom: 194 },
    ]), {
        left: 20,
        top: 40,
        right: 276,
        bottom: 300,
    });
});

test('moves the complete footprint with its module', () => {
    assert.deepEqual(translateRect(
        { left: 20, top: 40, right: 276, bottom: 300 },
        16,
        -8,
    ), {
        left: 36,
        top: 32,
        right: 292,
        bottom: 292,
    });
});

test('includes occupied slots always and empty slots only when displayed', () => {
    assert.equal(shouldIncludeCollisionSlot({ occupied: true }, false), true);
    assert.equal(shouldIncludeCollisionSlot({ occupied: false }, false), false);
    assert.equal(shouldIncludeCollisionSlot({ occupied: false }, true), true);
});

test('can exclude a nested slot from its parent during drag', () => {
    assert.equal(shouldIncludeCollisionSlot({ occupied: true, collisionKey: 'ow:1' }, true, 'ow:1'), false);
});
