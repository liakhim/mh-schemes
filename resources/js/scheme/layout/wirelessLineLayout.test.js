import assert from 'node:assert/strict';
import test from 'node:test';
import { getWirelessLineLift } from './wirelessLineLayout.js';

test('lifts Smart2 wireless line for RL2-family DI modules', () => {
    assert.equal(getWirelessLineLift({ di_modules: [{ type: 'rl2s' }] }, 'smart2', 8), 96);
});

test('lifts Pro wireless line when Wi-Fi modules exist', () => {
    assert.equal(getWirelessLineLift({ wifi_modules: [{ type: 'rl6w' }] }, 'pro', 8), 56);
});
