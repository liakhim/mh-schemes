import test from 'node:test';
import assert from 'node:assert/strict';
import {
    createLeakZone,
    getLeakValves,
    getLeakZones,
    getLeakZoneSensors,
    materializeLeakZones,
} from './leakZones.js';

test('зона группирует датчики, а клапаны остаются независимыми', () => {
    const { loop, valves } = createLeakZone({ id: 'zone-1', sensors: 3, valves: 2 });

    assert.equal(loop.type, 'leak-loop');
    assert.equal(loop.connection_type, 'di');
    assert.equal(loop.device_type, 'sensor');
    assert.equal(loop.additions.length, 3);
    // Датчики шлейфа не подключаются самостоятельно.
    assert.ok(loop.additions.every((sensor) => sensor.connection_type === undefined));
    assert.ok(loop.additions.every((sensor) => sensor.type === 'leak-sensor'));

    assert.equal(valves.length, 2);
    assert.ok(valves.every((valve) => valve.connection_type === 'double_relay'));
    assert.ok(valves.every((valve) => valve.leak_zone_id === undefined));
});

test('единый шлейф старой схемы сворачивается в одну зону', () => {
    const migrated = materializeLeakZones({
        unified_leak_loop: true,
        sensors: [
            { id: 1, type: 'leak-sensor', device_type: 'sensor', connection_type: 'di' },
            { id: 2, type: 'leak-sensor', device_type: 'sensor', connection_type: 'di' },
        ],
        wired_devices: [{ id: 3, type: 'valve', connection_type: 'double_relay' }],
    });

    assert.ok(!Object.prototype.hasOwnProperty.call(migrated, 'unified_leak_loop'));
    const zones = getLeakZones(migrated);
    assert.equal(zones.length, 1);
    assert.equal(getLeakZoneSensors(zones[0]).length, 2);
    assert.equal(getLeakValves(migrated).length, 1);
    assert.equal(getLeakValves(migrated)[0].leak_zone_id, undefined);
    // Плоских датчиков в публичных массивах не остаётся.
    assert.equal(migrated.sensors.filter((item) => item.type === 'leak-sensor').length, 0);
});

test('без единого шлейфа каждый датчик даёт свою зону: загрузка DI не меняется', () => {
    const migrated = materializeLeakZones({
        sensors: [
            { id: 1, type: 'leak-sensor', device_type: 'sensor', connection_type: 'di' },
            { id: 2, type: 'leak-sensor', device_type: 'sensor', connection_type: 'di' },
        ],
        wired_devices: [],
    });

    const zones = getLeakZones(migrated);
    assert.equal(zones.length, 2);
    assert.ok(zones.every((zone) => getLeakZoneSensors(zone).length === 1));
});

test('миграция не выдумывает клапаны, которых не было в схеме', () => {
    const migrated = materializeLeakZones({
        unified_leak_loop: true,
        sensors: [{ id: 1, type: 'leak-sensor', device_type: 'sensor', connection_type: 'di' }],
        wired_devices: [],
    });

    assert.deepEqual(migrated.wired_devices, []);
});

test('схема без протечки и уже мигрированная схема не меняются', () => {
    const untouched = { sensors: [{ id: 1, type: 'pressure-sensor', connection_type: '4-20' }], wired_devices: [] };
    assert.equal(materializeLeakZones(untouched), untouched);

    const { loop, valves } = createLeakZone({ id: 'zone-1', sensors: 2, valves: 0 });
    const alreadyMigrated = { sensors: [loop], wired_devices: valves };
    assert.equal(materializeLeakZones(alreadyMigrated), alreadyMigrated);
});

test('прочие датчики и оборудование остаются на месте', () => {
    const migrated = materializeLeakZones({
        sensors: [
            { id: 1, type: 'pressure-sensor', connection_type: '4-20' },
            { id: 2, type: 'leak-sensor', device_type: 'sensor', connection_type: 'di' },
        ],
        wired_devices: [
            { id: 3, type: 'pump-220v', connection_type: 'relay' },
            { id: 4, type: 'valve', connection_type: 'double_relay' },
        ],
    });

    assert.equal(migrated.sensors.filter((item) => item.type === 'pressure-sensor').length, 1);
    assert.equal(migrated.wired_devices.filter((item) => item.type === 'pump-220v').length, 1);
    assert.equal(getLeakValves(migrated).length, 1);
    assert.equal(getLeakValves(migrated)[0].leak_zone_id, undefined);
});

test('уже сгруппированная схема отвязывает клапаны от зон без потерь', () => {
    const migrated = materializeLeakZones({
        sensors: [{ id: 'zone-1', type: 'leak-loop', connection_type: 'di', additions: [] }],
        wired_devices: [
            { id: 'valve-1', type: 'valve', connection_type: 'double_relay', leak_zone_id: 'zone-1' },
            { id: 'valve-2', type: 'valve', connection_type: 'double_relay' },
        ],
    });

    assert.equal(getLeakValves(migrated).length, 2);
    assert.ok(getLeakValves(migrated).every((valve) => valve.leak_zone_id === undefined));
});
