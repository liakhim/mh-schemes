import test from 'node:test';
import assert from 'node:assert/strict';
import { getInstallationDinTotal, getInstallationDinUnits } from './installationDin.js';

test('converts rendered equipment width to DIN units', () => {
    assert.equal(getInstallationDinUnits(41), 1);
    assert.equal(getInstallationDinUnits(81), 2);
    assert.equal(getInstallationDinUnits(121), 3);
    assert.equal(getInstallationDinUnits(161), 4);
    assert.equal(getInstallationDinUnits(361), 9);
});

test('includes a rail-mounted controller in the total', () => {
    assert.equal(getInstallationDinTotal({
        controllerWidth: 161,
        controllerOnRail: true,
        moduleWidths: [40, 41, 81, 121],
    }), 11);
});

test('does not count a controller mounted outside the DIN rail', () => {
    assert.equal(getInstallationDinTotal({
        controllerWidth: 200,
        controllerOnRail: false,
        moduleWidths: [40, 81],
    }), 3);
});
