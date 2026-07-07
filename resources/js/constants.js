export const indent = '8px';
export const module_height = '200px';
export const din = '40px';

let i = {
    type: 'ecosmart',
    one_wire_devices: [],
    bus_devices: [],
    valve_device: [],
    ecosmart_bl2: []
}

// controller: {
//     type: 'go',
//         relay_devices: [],
//         one_wire_devices: [],
//         bus_devices: []
// },

// controller: {
//     type: 'go+',
//         relay_devices: [],
//         one_wire_devices: [],
//         bus_devices: []
// },

// controller: {
//     type: 'smart2',
//         relay_devices: [],
//         one_wire_devices: [],
//         bus_devices: []
// },

// controller: {
//     type: 'smart2',
//         relay_devices: [],
//         one_wire_devices: [],
//         di_devices: [],
//         bus_devices: []
// },

// export const incomingScheme = {
//     controller: {
//         type: 'pro',
//         relay_devices: [],
//         relay_s_devices: [],
//         one_wire_devices: [],
//         ai_devices: [],
//         di_devices: [],
//         modbus_devices: [],
//         devices_420: [],
//         bus_devices: []
//     },
//     ext_modules: [
//         {
//             id: 0,
//             device_type: 'module',
//             type: 'io4',
//             connection_type: 'EXT',
//             one_wire_devices: [],
//             channel_devices: []
//         },
//         {
//             id: 1,
//             device_type: 'module',
//             type: 'io4',
//             connection_type: 'EXT',
//             one_wire_devices: [],
//             channel_devices: []
//         },
//         {
//             id: 2,
//             device_type: 'module',
//             type: 'rl6',
//             connection_type: 'EXT',
//             one_wire_devices: [],
//             relay_devices: []
//         }
//     ],
//     boilers: [
//         {
//             id: 0,
//             device_type: 'boiler',
//             type: "smart",
//             name: "Baxi Slim",
//             reserve: false,
//             connection_type: "BUS"
//         }
//     ],
//     di_modules: [],
//     one_wire_modules: [],
//     power_modules: ['circuit-breaker', 'power-unit'],
//     wifi_modules: [],
//     sensors: [
//         {
//             id: 0,
//             device_type: 'sensor',
//             type: "flask-sensor",
//             connection_type: '1-wire'
//         },
//         {
//             id: 2,
//             device_type: 'sensor',
//             type: "ntc-sensor",
//             connection_type: 'ntc'
//         },
//         {
//             id: 3,
//             device_type: 'sensor',
//             type: "ntc-sensor",
//             connection_type: 'ntc'
//         },
//         {
//             id: 4,
//             device_type: 'sensor',
//             type: "pressure-sensor",
//             connection_type: '4-20'
//         },
//         {
//             id: 5,
//             device_type: 'sensor',
//             type: "pressure-sensor",
//             connection_type: '4-20'
//         },
//         {
//             id: 6,
//             device_type: 'sensor',
//             type: "pressure-sensor",
//             connection_type: '4-20'
//         },
//         {
//             id: 7,
//             device_type: 'sensor',
//             type: "flask-sensor-stupid-boiler",
//             connection_type: '1-wire'
//         },
//         {
//             id: 8,
//             device_type: 'sensor',
//             type: "flask-sensor-gvs-boiler",
//             connection_type: '1-wire|ntc'
//         },
//         {
//             id: 9,
//             device_type: 'sensor',
//             type: "flask-sensor-strategy",
//             connection_type: '1-wire|ntc'
//         },
//         {
//             id: 10,
//             device_type: 'sensor',
//             type: "flask-sensor-mixing-unit",
//             connection_type: '1-wire'
//         },
//         {
//             id: 11,
//             device_type: 'sensor',
//             type: "flask-sensor-floor",
//             connection_type: '1-wire'
//         },
//         {
//             id: 12,
//             device_type: 'sensor',
//             type: "flask-sensor-temperature",
//             connection_type: '1-wire'
//         },
//         {
//             id: 13,
//             device_type: 'sensor',
//             type: "leak-sensor",
//             connection_type: 'di'
//         }

//     ],
//     wired_devices: [
//         {
//             id: 0,
//             device_type: 'thermostat',
//             type: "thermostat",
//             connection_type: "1-wire",
//             color: "black",
//             additions: [
//                 {
//                     id: 0,
//                     type: "flask-sensor-floor",
//                     connection_type: '1-wire'
//                 }
//             ]
//         },
//         {
//             id: 1,
//             device_type: 'thermostat',
//             type: "thermostat",
//             connection_type: "1-wire",
//             color: "black",
//             additions: []
//         },
//         {
//             id: 3,
//             device_type: 'thermostat',
//             type: "otherEquipment",
//             connection_type: "relay",
//             additions: []
//         },
//         {
//             id: 4,
//             device_type: 'equipment',
//             type: "otherEquipment",
//             connection_type: "relay",
//             additions: []
//         },
//         {
//             id: 5,
//             device_type: 'equipment',
//             type: "220servo",
//             connection_type: "double_relay",
//             additions: []
//         },
//         {
//             id: 6,
//             device_type: 'equipment',
//             type: "220servo",
//             connection_type: "double_relay",
//             additions: []
//         },
//         {
//             id: 7,
//             device_type: 'equipment',
//             type: "220servo",
//             connection_type: "double_relay",
//             additions: []
//         },
//         {
//             id: 8,
//             device_type: 'equipment',
//             type: "discrete_pool",
//             connection_type: "di"
//         },
//         {
//             id: 9,
//             device_type: 'equipment',
//             type: "discrete_fire_alarm",
//             connection_type: "di"
//         },
//         {
//             id: 10,
//             device_type: 'equipment',
//             type: "discrete_signal",
//             connection_type: "di"
//         },
//         {
//             id: 11,
//             device_type: 'equipment',
//             type: "discrete_ventilation",
//             connection_type: "di"
//         },
//         {
//             id: 12,
//             device_type: 'equipment',
//             type: "220pump",
//             connection_type: "relay",
//             additions: []
//         },
//         {
//             id: 13,
//             device_type: 'equipment',
//             type: "010pump",
//             connection_type: "di",
//             additions: [
//                 {
//                     id: 1,
//                     device_type: 'sensor',
//                     type: "mixing-ntc-sensor",
//                     connection_type: 'ntc'
//                 }
//             ]
//         },
//         {
//             id: 12,
//             device_type: 'equipment',
//             type: "valve",
//             connection_type: "double_relay",
//             additions: []
//         },
//         {
//             id: 18,
//             device_type: 'equipment',
//             type: "010servo",
//             connection_type: "di",
//             additions: [
//                 {
//                     id: 0,
//                     device_type: 'sensor',
//                     type: "mixing-ntc-sensor",
//                     connection_type: 'ntc'
//                 }
//             ]
//         },
//         {
//             id: 28,
//             device_type: 'equipment',
//             type: "010servo",
//             connection_type: "di",
//             additions: [
//                 {
//                     id: 0,
//                     device_type: 'sensor',
//                     type: "mixing-ntc-sensor",
//                     connection_type: 'ntc'
//                 }
//             ]
//         },
//         {
//             id: 17,
//             device_type: 'equipment',
//             type: "220servo",
//             connection_type: "double_relay",
//             additions: []
//         },
//         {
//             id: 14,
//             device_type: 'equipment',
//             type: "boilerPump",
//             connection_type: "relay|relay-s",
//             additions: []
//         },
//         {
//             id: 15,
//             device_type: 'equipment',
//             type: "boilerPump",
//             connection_type: "relay|relay-s",
//             additions: []
//         },
//         {
//             id: 16,
//             device_type: 'equipment',
//             type: "boilerPump",
//             connection_type: "relay|relay-s",
//             additions: []
//         },
//         {
//             id: 20,
//             device_type: 'equipment',
//             type: "zoneServo",
//             connection_type: "relay | relay-s",
//             additions: []
//         },
//     ],
//     wireless_devices: [
//         {
//             id: 0,
//             device_type: 'thermostat',
//             type: "thermostat",
//             color: "black",
//             additions: [
//                 {
//                     id: 0,
//                     device_type: 'sensor',
//                     type: "flask-sensor-floor",
//                     connection_type: '1-wire'
//                 }
//             ]
//         },
//         // {
//         //     id: 1,
//         //     device_type: 'thermostat',
//         //     type: "thermostat",
//         //     color: "white",
//         //     additions: []
//         // },
//         // {
//         //     id: 2,
//         //     device_type: 'thermostat',
//         //     type: "thermostat",
//         //     color: "gray",
//         //     additions: []
//         // },
//         // {
//         //     id: 3,
//         //     device_type: 'sensor',
//         //     type: "outdoor-temperature-sensor",
//         //     additions: []
//         // },
//         // {
//         //     id: 4,
//         //     device_type: 'sensor',
//         //     type: "wall-temperature-sensor",
//         //     additions: []
//         // }
//     ]
// };

export const incomingScheme = {
    "controller": {
        "type": "pro",
        "relay_devices": [],
        "relay_s_devices": [],
        "one_wire_devices": [],
        "ai_devices": [],
        "di_devices": [],
        "modbus_devices": [],
        "devices_420": [],
        "bus_devices": []
    },
    "ext_modules": [
        {
            "id": 0,
            "device_type": "module",
            "type": "io4",
            "connection_type": "EXT",
            "one_wire_devices": [],
            "channel_devices": []
        },
    ],
    "wired_devices": [
        {
            "id": 13,
            "device_type": "equipment",
            "type": "010pump",
            "connection_type": "di",
            "additions": [
                {
                    "id": 1,
                    "device_type": "sensor",
                    "type": "mixing-ntc-sensor",
                    "connection_type": "ntc"
                }
            ]
        },

    ],
    "sensors": []
}
