import test from 'node:test';
import assert from 'node:assert/strict';
import { materializeBalancedOneWireScheme } from './oneWireMaterializer.js';
import { MIXING_OWNER_FIELD } from './mixingUnitOwnership.js';

const makeServo = (index) => ({
    id: `servo-${index}`,
    type: '220servo',
    device_type: 'equipment',
    connection_type: 'double_relay',
    mixing_unit_id: `mix-${index}`,
});

const makeSensor = (index, connectionType = 'ntc') => ({
    id: `sensor-${index}`,
    type: connectionType === 'ntc' ? 'mixing-ntc-sensor' : 'flask-sensor-mixing-unit',
    device_type: 'sensor',
    connection_type: connectionType,
    mixing_unit_id: `mix-${index}`,
});

const makeProScheme = (sensors) => ({
    controller: {
        type: 'pro',
        relay_devices: [],
        relay_s_devices: [],
        one_wire_devices: [],
    },
    ext_modules: [{
        id: 'rl6s-1',
        type: 'rl6s',
        relay_s_devices: [],
        one_wire_devices: [],
    }],
    wired_devices: [makeServo(1), makeServo(2), makeServo(3)],
    sensors,
    one_wire_modules: [],
});

const collectNtcSensorOwners = (scheme) => {
    const result = new Map();
    const collect = (ownerKey, devices) => devices.forEach((device) => {
        if (device?.type !== 'ntc-1-wire') return;
        [...(device.ntc1_devices || []), ...(device.ntc2_devices || [])]
            .filter(Boolean)
            .forEach((sensor) => result.set(sensor.mixing_unit_id, ownerKey));
    });
    collect('controller', scheme.controller.one_wire_devices || []);
    scheme.ext_modules.forEach((moduleItem) => collect(`ext:${moduleItem.id}`, moduleItem.one_wire_devices || []));
    return result;
};

test('keeps PRO servos, NTC modules and mixing sensors on the same owner', () => {
    const result = materializeBalancedOneWireScheme(makeProScheme([
        makeSensor(1),
        makeSensor(2),
        makeSensor(3),
    ]));

    assert.deepEqual(result.controller.relay_s_devices.map((device) => device.mixing_unit_id), ['mix-1', 'mix-2']);
    assert.deepEqual(result.ext_modules[0].relay_s_devices.map((device) => device.mixing_unit_id), ['mix-3']);
    assert.deepEqual(Object.fromEntries(collectNtcSensorOwners(result)), {
        'mix-1': 'controller',
        'mix-2': 'controller',
        'mix-3': 'ext:rl6s-1',
    });
    assert.equal(result.sensors.length, 0);
    assert.deepEqual(
        Object.fromEntries(collectNtcSensorOwners(materializeBalancedOneWireScheme(result))),
        Object.fromEntries(collectNtcSensorOwners(result)),
    );
});

test('keeps digital mixing sensors on the servo owner one-wire line', () => {
    const result = materializeBalancedOneWireScheme(makeProScheme([
        makeSensor(1, '1-wire'),
        makeSensor(2, '1-wire'),
        makeSensor(3, '1-wire'),
    ]));

    assert.deepEqual(result.controller.one_wire_devices.map((device) => device.mixing_unit_id), ['mix-1', 'mix-2']);
    assert.deepEqual(result.ext_modules[0].one_wire_devices.map((device) => device.mixing_unit_id), ['mix-3']);
});

test('does not place a linked sensor when its servo has no owner capacity', () => {
    const scheme = makeProScheme([makeSensor(1), makeSensor(2), makeSensor(3), makeSensor(4)]);
    scheme.wired_devices.push(makeServo(4), makeServo(5), makeServo(6));
    scheme.sensors.push(makeSensor(5), makeSensor(6));

    const result = materializeBalancedOneWireScheme(scheme);
    const unplacedServoKeys = new Set(result.wired_devices.map((device) => device.mixing_unit_id));
    const unplacedSensorKeys = new Set(result.sensors.map((sensor) => sensor.mixing_unit_id));

    unplacedServoKeys.forEach((unitKey) => assert.equal(unplacedSensorKeys.has(unitKey), true));
    assert.equal(result.sensors.some((sensor) => sensor[MIXING_OWNER_FIELD]), false);
});

test('keeps a 0-10V servo and its NTC sensor on the same IO4', () => {
    const result = materializeBalancedOneWireScheme({
        controller: { type: 'pro', relay_devices: [], relay_s_devices: [], one_wire_devices: [] },
        ext_modules: [{ id: 'io4-1', type: 'io4', channel_devices: [] }],
        wired_devices: [{
            id: 'servo-010-1',
            type: '010servo',
            device_type: 'equipment',
            connection_type: 'di',
            additions: [makeSensor(1)],
        }],
        sensors: [],
    });

    assert.deepEqual(result.ext_modules[0].channel_devices.map((device) => device.type), ['010servo', 'mixing-ntc-sensor']);
    assert.equal(result.ext_modules[0].one_wire_devices.length, 0);
});
