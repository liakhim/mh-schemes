import { canonicalDeviceType } from './deviceTypes.js';
import { normalizeSchemeIds } from './schemeIds.js';

export const SELECTION_CONFIG_SCHEMA = 'mh.selection-config';
export const SELECTION_CONFIG_VERSION = 1;

export const buildSelectionConfig = ({
    selectionState,
    requestedControllerType,
    controllerSelectionSource,
    upsRequested,
    upsRequestSource,
    editor,
    createdAt = new Date().toISOString(),
}) => {
    const normalizedSelectionState = normalizeSchemeIds(selectionState);
    const resolvedControllerType = canonicalDeviceType(
        typeof normalizedSelectionState?.controller === 'string'
            ? normalizedSelectionState.controller
            : normalizedSelectionState?.controller?.type,
    );
    const requestedType = canonicalDeviceType(requestedControllerType) || resolvedControllerType;

    return {
        schema: SELECTION_CONFIG_SCHEMA,
        version: SELECTION_CONFIG_VERSION,
        created_at: createdAt,
        source: {
            page: 'selection',
            draft_version: 1,
        },
        intent: {
            requested_controller_type: requestedType,
            resolved_controller_type: resolvedControllerType,
            controller_selection_source: requestedType !== resolvedControllerType
                ? 'automatic'
                : (controllerSelectionSource || 'default'),
            ups_requested: upsRequested === true,
            ups_request_source: upsRequestSource || null,
            // Число зон контроля протечки: каждая зона занимает один DI.
            // Заменило булев unified_leak_loop прежней модели.
            leak_zone_count: (Array.isArray(normalizedSelectionState?.sensors) ? normalizedSelectionState.sensors : [])
                .filter((sensor) => String(sensor?.type || '').toLowerCase() === 'leak-loop').length,
            leak_valve_count: (Array.isArray(normalizedSelectionState?.wired_devices) ? normalizedSelectionState.wired_devices : [])
                .filter((device) => canonicalDeviceType(device?.type) === 'valve').length,
        },
        editor: {
            thermostat_connection: editor?.thermostatConnection === 'wireless' ? 'wireless' : 'wired',
            wired_thermostat_color: editor?.wiredThermostatColor || 'black',
            wired_thermostat_has_floor_sensor: editor?.wiredThermostatHasFloorSensor === true,
            wireless_thermostat_color: editor?.wirelessThermostatColor || 'black',
            wireless_thermostat_has_floor_sensor: editor?.wirelessThermostatHasFloorSensor === true,
            mixing_connection_mode: editor?.mixingConnectionMode === 'wifi' ? 'wifi' : 'wired',
            mixing_servo: editor?.mixingServo === '010' ? '010' : '220',
            mixing_sensor: editor?.mixingSensor === 'ntc' ? 'ntc' : 'digital',
            pump_connection_mode: editor?.pumpConnectionMode === 'wifi' ? 'wifi' : 'wired',
            pump_type: editor?.pumpType === '010' ? '010' : '220',
            zone_connection_mode: editor?.zoneConnectionMode === 'wifi' ? 'wifi' : 'wired',
            other_equipment_connection_mode: editor?.otherEquipmentConnectionMode === 'wifi' ? 'wifi' : 'wired',
            wired_temperature_sensor_key: editor?.wiredTemperatureSensorKey || 'wired-wall-digital',
            wireless_temperature_sensor_key: editor?.wirelessTemperatureSensorKey || 'wireless-wall',
            temperature_sensor_connection: editor?.temperatureSensorConnection === 'wireless' ? 'wireless' : 'wired',
        },
        selection_state: normalizedSelectionState,
    };
};
