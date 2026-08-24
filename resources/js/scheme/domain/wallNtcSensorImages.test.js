import assert from 'node:assert/strict';
import test from 'node:test';
import { getWirelessDeviceImageKey, wirelessDeviceImagePaths } from '../assets/imageRegistry.js';

const wallNtc = { type: 'wall-ntc-sensor', connection_type: 'ntc' };

test('selects the right-port wall NTC image for the left NTC-1-wire line', () => {
    const key = getWirelessDeviceImageKey({ ...wallNtc, port_side: 'right' });

    assert.equal(key, 'wall-ntc-sensor');
    assert.match(wirelessDeviceImagePaths[key], /ntcWallSensorRightPort\.svg$/);
});

test('selects the left-port wall NTC image for the right line and IO4', () => {
    const key = getWirelessDeviceImageKey({ ...wallNtc, port_side: 'left' });

    assert.equal(key, 'wall-ntc-sensor-left');
    assert.match(wirelessDeviceImagePaths[key], /ntcWallSensorLeftPort\.svg$/);
});
