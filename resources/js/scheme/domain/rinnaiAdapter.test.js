import assert from 'node:assert/strict';
import test from 'node:test';
import {
    countRinnaiAdapters,
    getRinnaiBusSlotYOffset,
    RINNAI_ADAPTER_PRICE,
    usesRinnaiAdapter,
    withRinnaiAdapter,
} from './rinnaiAdapter.js';

test('recognizes Rinnai boiler names case-insensitively', () => {
    assert.equal(usesRinnaiAdapter({ name: 'RINNAI BR-R' }), true);
    assert.equal(usesRinnaiAdapter({ name: 'Baxi Eco' }), false);
});

test('recognizes and normalizes an explicit Rinnai adapter', () => {
    const boiler = { name: 'Legacy boiler', adapter: { type: 'RINNAI', revision: 2 } };
    const normalized = withRinnaiAdapter(boiler);

    assert.equal(usesRinnaiAdapter(boiler), true);
    assert.deepEqual(normalized.adapter, { type: 'rinnai', revision: 2 });
});

test('moves Rinnai BUS slots down by ten indents only for GO controllers', () => {
    const boiler = { name: 'Rinnai BR-R' };

    assert.equal(getRinnaiBusSlotYOffset('go', boiler, 8), 80);
    assert.equal(getRinnaiBusSlotYOffset('go+', boiler, 8), 80);
    assert.equal(getRinnaiBusSlotYOffset('ecosmart', boiler, 8), 0);
    assert.equal(getRinnaiBusSlotYOffset('go', { name: 'Baxi Eco' }, 8), 0);
});

test('counts one Rinnai adapter per matching boiler', () => {
    assert.equal(countRinnaiAdapters([
        { name: 'Rinnai BR-R' },
        { name: 'Legacy boiler', adapter: { type: 'rinnai' } },
        { name: 'Baxi Eco' },
    ]), 2);
    assert.equal(RINNAI_ADAPTER_PRICE, 4990);
});
