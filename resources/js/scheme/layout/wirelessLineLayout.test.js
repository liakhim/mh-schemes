import assert from 'node:assert/strict';
import test from 'node:test';
import { getWirelessLineLift } from './wirelessLineLayout.js';

test('lifts Smart2 wireless line for RL2-family DI modules', () => {
    assert.equal(getWirelessLineLift({ di_modules: [{ type: 'rl2s' }] }, 'smart2', 8), 96);
});

test('lifts Pro wireless line when Wi-Fi modules exist', () => {
    assert.equal(getWirelessLineLift({ wifi_modules: [{ type: 'rl6w' }] }, 'pro', 8), 160);
});

test('lifts Pro wireless line by 13 indents without Wi-Fi modules', () => {
    assert.equal(getWirelessLineLift({ wifi_modules: [] }, 'pro', 8), 104);
});

test('lifts GO and GO+ wireless lines by 24 indents for Wi-Fi modules', () => {
    assert.equal(getWirelessLineLift({ wifi_modules: [{ type: 'rl6w' }] }, 'go', 8), 192);
    assert.equal(getWirelessLineLift({ wifi_modules: ['rl6sw'] }, 'go+', 8), 192);
});

test('does not lift GO wireless line for an empty or invalid Wi-Fi line', () => {
    assert.equal(getWirelessLineLift({ wifi_modules: [] }, 'go', 8), 0);
    assert.equal(getWirelessLineLift({ wifi_modules: [{ type: 'rl6' }] }, 'go+', 8), 0);
});
