import assert from 'node:assert/strict';
import test from 'node:test';
import { restorePublicDevicesFromModules, serializePublicScheme } from './publicSchemeSerializer.js';

test('removes legacy and current render-only ecosmart_bl2 fields', () => {
    const legacy = serializePublicScheme({
        controller: { type: 'ecosmart' },
        ecosmart_bl2: [{ id: 1, type: 'ecosmartbl2' }],
    });
    assert.equal('ecosmart_bl2' in legacy, false);
    assert.equal('ecosmart_bl2' in legacy.controller, false);

    const current = serializePublicScheme({
        controller: { type: 'ecosmart', ecosmart_bl2: [{ id: 2, type: 'ecosmartbl2' }] },
    });
    assert.equal('ecosmart_bl2' in current, false);
    assert.equal('ecosmart_bl2' in current.controller, false);
});

test('collapses thermostat floor additions before recursively removing ownership metadata', () => {
    const result = serializePublicScheme({
        controller: {
            type: 'pro',
            one_wire_devices: [
                { id: 10, type: 'thermostat', ownerThermostatKey: 'thermostat:10', additions: [] },
                {
                    id: 11,
                    device_type: 'sensor',
                    type: 'floor-sensor',
                    ownerThermostatId: 10,
                    ownerThermostatKey: 'thermostat:10',
                    ownerExtModuleIndex: 0,
                },
            ],
        },
    });

    assert.equal(result.wired_devices.length, 1);
    assert.equal(result.wired_devices[0].additions[0].type, 'floor-sensor');
    assert.equal(JSON.stringify(result).includes('ownerThermostat'), false);
    assert.equal(JSON.stringify(result).includes('ownerExtModuleIndex'), false);
});

test('restores occupied EXT and DI module devices to public sources without module objects', () => {
    const extModule = {
        id: 'rl6-1',
        type: 'rl6',
        relay_devices: [{ id: 1, device_type: 'boiler', type: 'stupid', connection_type: 'relay' }],
        channel_devices: [{ id: 2, device_type: 'sensor', type: 'leak-sensor', connection_type: 'di' }],
        one_wire_devices: [{ id: 3, type: 'thermostat', connection_type: '1-wire' }],
        bus_devices: [{ id: 4, device_type: 'boiler', type: 'smart', connection_type: 'BUS' }],
    };
    const diModule = {
        id: 'rl2-1',
        type: 'rl2',
        relay_s_devices: [{ id: 5, type: 'pump-220v', connection_type: 'relay-s' }],
        di_devices: [{ id: 6, type: 'discrete_signal', connection_type: 'di' }],
    };
    const result = restorePublicDevicesFromModules({}, [extModule, diModule]);

    assert.deepEqual(result.boilers.map((item) => item.id), [1, 4]);
    assert.deepEqual(result.sensors.map((item) => item.id), [2]);
    assert.deepEqual(result.wired_devices.map((item) => item.id), [3, 5, 6]);
    assert.equal(result.wired_devices.some((item) => item.id === 'rl6-1' || item.id === 'rl2-1'), false);
});

test('returns materialized NTC assignments to sensors and their module to one_wire_modules', () => {
    const result = serializePublicScheme({
        controller: {
            type: 'pro',
            one_wire_devices: [{
                id: 'ntc-module',
                type: 'ntc-1-wire',
                ntc1_devices: [{ id: 8, device_type: 'sensor', type: 'ntc-sensor', mixing_owner_key: 'controller' }],
            }],
        },
    });

    assert.deepEqual(result.sensors.map((item) => item.id), [8]);
    assert.deepEqual(result.one_wire_modules, [{ id: 'ntc-module', type: 'ntc-1-wire' }]);
    assert.equal(JSON.stringify(result).includes('mixing_owner_key'), false);
});

test('restores an IO4 mixing NTC sensor into its 010 servo additions', () => {
    const result = serializePublicScheme({
        controller: { type: 'pro' },
        ext_modules: [{
            id: 'io4-1',
            type: 'io4',
            channel_devices: [
                { id: 20, type: '010servo', connection_type: 'di', additions: [] },
                {
                    id: 21,
                    device_type: 'sensor',
                    type: 'mixing-ntc-sensor',
                    connection_type: 'ntc',
                    ownerServo010Id: 20,
                    ownerExtModuleId: 'io4-1',
                },
            ],
        }],
    });

    assert.equal(result.sensors.length, 0);
    assert.deepEqual(result.wired_devices.map((item) => item.id), [20]);
    assert.deepEqual(result.wired_devices[0].additions.map((item) => item.id), [21]);
    assert.equal(JSON.stringify(result).includes('ownerServo010Id'), false);
    assert.equal(JSON.stringify(result).includes('ownerExtModuleId'), false);
});

test('uses the current materialized copy instead of a stale root copy', () => {
    const result = serializePublicScheme({
        controller: {
            type: 'pro',
            relay_devices: [{ id: 30, type: 'pump-220v', title: 'Current title', connection_type: 'relay' }],
        },
        wired_devices: [{ id: 30, type: 'pump-220v', title: 'Stale title', connection_type: 'relay' }],
    });

    assert.equal(result.wired_devices.length, 1);
    assert.equal(result.wired_devices[0].title, 'Current title');
});

test('deduplicates id-less copies after cleanup while preserving real multiplicity', () => {
    const rootCopy = { type: 'discrete_signal', connection_type: 'di' };
    const materializedCopy = { ...rootCopy, ownerExtModuleId: 'io4-1' };
    const result = serializePublicScheme({
        controller: { type: 'pro' },
        wired_devices: [rootCopy, { ...rootCopy }],
        ext_modules: [{ type: 'io4', channel_devices: [materializedCopy] }],
    });

    assert.equal(result.wired_devices.length, 2);
    assert.equal(JSON.stringify(result).includes('ownerExtModuleId'), false);
});

test('restores an occupied IO4 servo and owned sensor as one public device', () => {
    const result = restorePublicDevicesFromModules({}, [{
        id: 'io4-2',
        type: 'io4',
        channel_devices: [
            { id: 40, type: '010pump', connection_type: 'di', additions: [] },
            { id: 41, type: 'mixing-ntc-sensor', connection_type: 'ntc', ownerServo010Id: 40 },
        ],
    }]);

    assert.deepEqual(result.wired_devices.map((item) => item.id), [40]);
    assert.deepEqual(result.wired_devices[0].additions.map((item) => item.id), [41]);
    assert.equal(result.sensors.length, 0);
});
