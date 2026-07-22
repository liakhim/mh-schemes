const CONTROLLER_TEMPLATES = {
    go: { type: 'go', relay_devices: [], one_wire_devices: [], bus_devices: [] },
    'go+': { type: 'go+', relay_devices: [], one_wire_devices: [], bus_devices: [] },
    smart2: { type: 'smart2', relay_devices: [], one_wire_devices: [], bus_devices: [] },
    pro: {
        type: 'pro',
        relay_devices: [],
        relay_s_devices: [],
        one_wire_devices: [],
        ai_devices: [],
        di_devices: [],
        modbus_devices: [],
        devices_420: [],
        bus_devices: [],
    },
    ecosmart: { type: 'ecosmart', one_wire_devices: [], bus_devices: [], ecosmart_bl2: [] },
};

export const buildControllerOnlyScheme = (controllerType) => {
    const template = CONTROLLER_TEMPLATES[String(controllerType || '').toLowerCase()];
    return template ? { controller: structuredClone(template) } : null;
};

export const isControllerOnlyScheme = (scheme) => Object.entries(scheme || {}).every(([key, value]) => (
    key === 'controller' || value == null || (Array.isArray(value) && value.length === 0)
));
