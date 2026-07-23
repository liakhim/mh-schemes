import test from 'node:test';
import assert from 'node:assert/strict';
import {
    calculateSelectionMixedIoModules,
    getProExtPortUsage,
    hasProExtPortCapacity,
    PRO_EXT_DEVICE_CAPACITY,
    reconcileSelectionStupidBoilerSensors,
} from './selectionMixedIoCapacity.js';

test('counts PRO EXT devices, existing modules and required modules against one limit', () => {
    const scheme = {
        controller: { ext_devices: Array.from({ length: 2 }) },
        ext_modules: Array.from({ length: 9 }),
    };

    assert.equal(getProExtPortUsage(scheme, 1), PRO_EXT_DEVICE_CAPACITY);
    assert.equal(getProExtPortUsage(scheme, 2), PRO_EXT_DEVICE_CAPACITY + 1);
    assert.equal(hasProExtPortCapacity(scheme, 1), true);
    assert.equal(hasProExtPortCapacity(scheme, 2), false);
});

test('shares IO4 channels between an unplaced 0-10V group, 4-20 overflow and DI', () => {
    const result = calculateSelectionMixedIoModules({
        unplacedIo4ChannelGroups: [2],
        unplacedAnalog420Devices: 2,
        unplacedGeneralDiDevices: 3,
        controllerAnalog420Capacity: 1,
        controllerDiCapacity: 2,
    });

    assert.deepEqual(result, {
        additionalIo4Modules: 1,
        additionalDi6Modules: 0,
        io4ChannelLengths: [4],
        analog420ForIo4: 1,
    });
});

test('preserves grouped placement when existing IO4 free channels are fragmented', () => {
    const result = calculateSelectionMixedIoModules({
        unplacedIo4ChannelGroups: [2],
        existingIo4ChannelLengths: [3, 3],
    });

    assert.equal(result.additionalIo4Modules, 1);
    assert.deepEqual(result.io4ChannelLengths, [3, 3, 2]);
});

test('treats sparse IO4 holes as occupied append-only positions', () => {
    const sparseChannels = [];
    sparseChannels.length = 4;
    const result = calculateSelectionMixedIoModules({
        unplacedIo4ChannelGroups: [1],
        existingIo4ChannelLengths: [sparseChannels.length],
    });

    assert.equal(result.additionalIo4Modules, 1);
    assert.deepEqual(result.io4ChannelLengths, [4, 1]);
});

test('does not apply free controller 4-20 capacity to a sensor already occupying IO4', () => {
    const result = calculateSelectionMixedIoModules({
        unplacedAnalog420Devices: 1,
        controllerAnalog420Capacity: 1,
        existingIo4ChannelLengths: [4],
    });

    assert.equal(result.additionalIo4Modules, 0);
    assert.equal(result.analog420ForIo4, 0);
    assert.deepEqual(result.io4ChannelLengths, [4]);
});

test('uses actual existing IO4 and DI6 tails for unplaced DI', () => {
    const result = calculateSelectionMixedIoModules({
        unplacedIo4ChannelGroups: [2],
        unplacedGeneralDiDevices: 9,
        controllerDiCapacity: 2,
        existingIo4ChannelLengths: [3],
        existingDi6ChannelLengths: [5],
    });

    assert.equal(result.additionalIo4Modules, 1);
    assert.equal(result.additionalDi6Modules, 1);
    assert.deepEqual(result.io4ChannelLengths, [4, 4]);
});

test('does not add IO4 for plain DI load', () => {
    const result = calculateSelectionMixedIoModules({
        unplacedGeneralDiDevices: 3,
        controllerDiCapacity: 2,
    });

    assert.equal(result.additionalIo4Modules, 0);
    assert.equal(result.additionalDi6Modules, 1);
});

test('links one legacy sensor per boiler and creates only missing sensors', () => {
    const boilers = [{ id: 'b1' }, { id: 'b2' }];
    const legacySensor = { id: 'legacy', type: 'flask-sensor-stupid-boiler' };
    const sensors = reconcileSelectionStupidBoilerSensors(
        boilers,
        [legacySensor],
        (boiler) => ({ id: `new-${boiler.id}`, type: 'flask-sensor-stupid-boiler', boiler_id: boiler.id }),
    );

    assert.deepEqual(sensors.map((sensor) => [sensor.id, sensor.boiler_id]), [
        ['legacy', 'b1'],
        ['new-b2', 'b2'],
    ]);
});

test('keeps the remaining linked boiler sensor after the other boiler is removed', () => {
    const boilers = [{ id: 'b1' }, { id: 'b2' }];
    const initialSensors = reconcileSelectionStupidBoilerSensors(
        boilers,
        [{ id: 'legacy', type: 'flask-sensor-stupid-boiler' }],
        (boiler) => ({ id: `new-${boiler.id}`, type: 'flask-sensor-stupid-boiler', boiler_id: boiler.id }),
    );
    const remainingSensors = initialSensors.filter((sensor) => sensor.boiler_id !== 'b1');
    const result = reconcileSelectionStupidBoilerSensors(
        [boilers[1]],
        remainingSensors,
        () => assert.fail('remaining boiler must not receive a duplicate sensor'),
    );

    assert.deepEqual(result.map((sensor) => [sensor.id, sensor.boiler_id]), [['new-b2', 'b2']]);
});

test('drops duplicate linked and surplus legacy boiler sensors', () => {
    const result = reconcileSelectionStupidBoilerSensors(
        [{ id: 'b1' }],
        [
            { id: 'linked', type: 'flask-sensor-stupid-boiler', boiler_id: 'b1' },
            { id: 'duplicate', type: 'flask-sensor-stupid-boiler', boiler_id: 'b1' },
            { id: 'legacy', type: 'flask-sensor-stupid-boiler' },
            { id: 'other', type: 'other-sensor' },
        ],
        () => assert.fail('existing linked sensor must be reused'),
    );

    assert.deepEqual(result.map((sensor) => sensor.id), ['linked', 'other']);
});
