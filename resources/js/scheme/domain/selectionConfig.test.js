import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSelectionConfig, SELECTION_CONFIG_SCHEMA } from './selectionConfig.js';

test('builds a versioned selection snapshot with normalized IDs', () => {
    const config = buildSelectionConfig({
        selectionState: {
            controller: { type: 'go+' },
            boilers: [{ id: 10, type: 'smart' }],
            wired_devices: [{ id: 20, type: 'valve' }, { id: 21, type: 'valve' }],
        },
        requestedControllerType: 'go',
        controllerSelectionSource: 'default',
        upsRequested: true,
        upsRequestSource: 'manual',
        editor: {
            thermostatConnection: 'wireless',
            wiredThermostatColor: 'white',
            mixingConnectionMode: 'wifi',
            mixingServo: '010',
            mixingSensor: 'ntc',
            pumpConnectionMode: 'wifi',
            pumpType: '010',
            zoneConnectionMode: 'wifi',
            otherEquipmentConnectionMode: 'wifi',
            temperatureSensorConnection: 'wireless',
        },
        createdAt: '2026-07-24T12:30:00.000Z',
    });

    assert.equal(config.schema, SELECTION_CONFIG_SCHEMA);
    assert.equal(config.intent.requested_controller_type, 'go');
    assert.equal(config.intent.resolved_controller_type, 'go+');
    assert.equal(config.intent.controller_selection_source, 'automatic');
    assert.equal(config.selection_state.boilers[0].id, '10');
    assert.equal(config.editor.wired_thermostat_color, 'white');
    assert.equal(config.editor.thermostat_connection, 'wireless');
    assert.equal(config.editor.mixing_connection_mode, 'wifi');
    assert.equal(config.editor.mixing_servo, '010');
    assert.equal(config.editor.mixing_sensor, 'ntc');
    assert.equal(config.editor.pump_connection_mode, 'wifi');
    assert.equal(config.editor.pump_type, '010');
    assert.equal(config.editor.zone_connection_mode, 'wifi');
    assert.equal(config.editor.other_equipment_connection_mode, 'wifi');
    assert.equal(config.editor.temperature_sensor_connection, 'wireless');
    assert.equal(config.intent.leak_valve_count, 2);
});

test('records a manual controller choice when it remains selected', () => {
    const config = buildSelectionConfig({
        selectionState: { controller: { type: 'pro' } },
        requestedControllerType: 'pro',
        controllerSelectionSource: 'manual',
        editor: {},
    });

    assert.equal(config.intent.controller_selection_source, 'manual');
    assert.equal(config.editor.wireless_temperature_sensor_key, 'wireless-wall');
    assert.equal(config.editor.mixing_connection_mode, 'wired');
});
