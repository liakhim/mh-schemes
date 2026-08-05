import assert from 'node:assert/strict';
import test from 'node:test';

import { getRl6RelayTerminalNames } from './relaySlots.js';

test('maps all RL6 slots to their grouped A terminal and current B terminal', () => {
    for (let relayIndex = 1; relayIndex <= 6; relayIndex += 1) {
        assert.deepEqual(getRl6RelayTerminalNames('RELAY', relayIndex), {
            a: `RELAY-${relayIndex <= 3 ? '1-2-3' : '4-5-6'}-A`,
            b: `RELAY-${relayIndex}-B`,
        });
    }
});

test('supports the equivalent grouped RELAY-S terminal names', () => {
    assert.deepEqual(getRl6RelayTerminalNames('RELAY-S', 4), {
        a: 'RELAY-S-4-5-6-A',
        b: 'RELAY-S-4-B',
    });
});
