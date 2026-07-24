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
            unified_leak_loop: normalizedSelectionState?.unified_leak_loop === true,
        },
        editor: {
            wired_thermostat_color: editor?.wiredThermostatColor || 'black',
            wired_thermostat_has_floor_sensor: editor?.wiredThermostatHasFloorSensor === true,
            wireless_thermostat_color: editor?.wirelessThermostatColor || 'black',
            wireless_thermostat_has_floor_sensor: editor?.wirelessThermostatHasFloorSensor === true,
            wired_temperature_sensor_key: editor?.wiredTemperatureSensorKey || 'wired-wall-digital',
            wireless_temperature_sensor_key: editor?.wirelessTemperatureSensorKey || 'wireless-outdoor',
        },
        selection_state: normalizedSelectionState,
    };
};
