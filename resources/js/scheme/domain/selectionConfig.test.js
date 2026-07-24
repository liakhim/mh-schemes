import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSelectionConfig, SELECTION_CONFIG_SCHEMA } from './selectionConfig.js';

test('builds a versioned selection snapshot with normalized IDs', () => {
    const config = buildSelectionConfig({
        selectionState: {
            controller: { type: 'go+' },
            boilers: [{ id: 10, type: 'smart' }],
        },
        requestedControllerType: 'go',
        controllerSelectionSource: 'default',
        upsRequested: true,
        upsRequestSource: 'manual',
        editor: { wiredThermostatColor: 'white' },
        createdAt: '2026-07-24T12:30:00.000Z',
    });

    assert.equal(config.schema, SELECTION_CONFIG_SCHEMA);
    assert.equal(config.intent.requested_controller_type, 'go');
    assert.equal(config.intent.resolved_controller_type, 'go+');
    assert.equal(config.intent.controller_selection_source, 'automatic');
    assert.equal(config.selection_state.boilers[0].id, '10');
    assert.equal(config.editor.wired_thermostat_color, 'white');
});

test('records a manual controller choice when it remains selected', () => {
    const config = buildSelectionConfig({
        selectionState: { controller: { type: 'pro' } },
        requestedControllerType: 'pro',
        controllerSelectionSource: 'manual',
        editor: {},
    });

    assert.equal(config.intent.controller_selection_source, 'manual');
});
