import assert from 'node:assert/strict';
import test from 'node:test';
import { getDeviceStoredTitle } from './deviceTitles.js';

test('uses an edited boiler title before its catalog name', () => {
    assert.equal(getDeviceStoredTitle({
        type: 'smart',
        name: 'Baxi Luna',
        title: 'Котёл первого этажа',
    }), 'Котёл первого этажа');
});

test('uses the boiler catalog name when no custom title is set', () => {
    assert.equal(getDeviceStoredTitle({ type: 'stupid', name: 'Baxi Slim' }), 'Baxi Slim');
});
