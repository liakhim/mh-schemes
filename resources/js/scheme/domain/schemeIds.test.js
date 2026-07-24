import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeSchemeIds, SCHEME_ID_VERSION } from './schemeIds.js';

test('normalizes device IDs and references to strings', () => {
    const result = normalizeSchemeIds({
        boilers: [{ id: 42, type: 'stupid' }],
        sensors: [{ id: 43, boiler_id: 42 }],
        connection_layout: {
            version: 1,
            assignments: [{ device_id: 43, owner_id: 44 }],
        },
    });

    assert.equal(result.id_schema_version, SCHEME_ID_VERSION);
    assert.equal(result.boilers[0].id, '42');
    assert.equal(result.sensors[0].id, '43');
    assert.equal(result.sensors[0].boiler_id, '42');
    assert.equal(result.connection_layout.assignments[0].device_id, '43');
    assert.equal(result.connection_layout.assignments[0].owner_id, '44');
});

test('renames a colliding numeric ID and all of its typed references', () => {
    const result = normalizeSchemeIds({
        sensors: [
            { id: 1, type: 'pressure-sensor' },
            { id: '1', type: 'pressure-sensor' },
        ],
        connection_layout: {
            version: 1,
            assignments: [
                { device_id: 1 },
                { device_id: '1' },
            ],
        },
        installation_layout: {
            version: 1,
            items: [{ key: 'ext:io4:id:1', column: 2, row: 0 }],
        },
    });

    assert.deepEqual(result.sensors.map((item) => item.id), ['legacy-number:1', '1']);
    assert.deepEqual(
        result.connection_layout.assignments.map((item) => item.device_id),
        ['legacy-number:1', '1'],
    );
    assert.deepEqual(
        result.installation_layout.items.map((item) => item.key),
        ['ext:io4:id:1', 'ext:io4:id:legacy-number:1'],
    );
});

test('normalization is idempotent', () => {
    const once = normalizeSchemeIds({ wired_devices: [{ id: 10, ownerThermostatId: 11 }] });
    assert.deepEqual(normalizeSchemeIds(once), once);
});
