import assert from 'node:assert/strict';
import test from 'node:test';
import { getWifiPairHorizontalBounds } from './wifiLineLayout.js';

test('includes a WIFI module one-wire line in its horizontal footprint', () => {
    const bounds = getWifiPairHorizontalBounds({
        moduleItem: {
            id: 'wifi-1',
            type: 'rl6w',
            one_wire_devices: [{ id: 'sensor-1', type: 'wall-temperature-sensor' }],
        },
        wirelessImages: {
            'power-unit': { width: 40 },
            rl6w: { width: 120, height: 200 },
        },
        wirelessPortsByType: {
            rl6w: [{ name: '1-WIRE-V+', x: 0.5, y: 1 }],
        },
        getImageKey: (device) => device.type,
        dinSize: 40,
        moduleHeightValue: 200,
        indentSize: 8,
        showEmptySlots: false,
        oneWireSlotSize: 80,
        isRelayBoilerType: () => false,
        buildRelaySlotOccupancy: () => Array.from({ length: 6 }, () => ({})),
    });

    assert.equal(bounds.left, 0);
    assert.equal(bounds.right, 228);
});
