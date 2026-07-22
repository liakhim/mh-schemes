import { controllerImagePaths, wirelessDeviceImagePaths } from '../scheme/assets/imageRegistry';

// A pair links a port on one device to a port on another device by device index
// (into that question's `devices` array), so questions can chain 2+ devices in a row.
const pair = (deviceA, portA, deviceB, portB) => [[deviceA, portA], [deviceB, portB]];

export const QUESTIONS = [
    {
        id: 'go-ntc-1-wire',
        todo: false,
        title: 'Коммутация GO контроллера и модуля NTC-1-Wire',
        devices: [
            {
                key: 'go',
                label: 'GO',
                imagePath: controllerImagePaths.go,
                ports: ['1-WIRE-V+', '1-WIRE-DAT', '1-WIRE-GND'],
            },
            {
                key: 'ntc-1-wire',
                label: 'NTC-1-Wire',
                imagePath: wirelessDeviceImagePaths['ntc-1-wire'],
                ports: ['1-WIRE-V+ IN', '1-WIRE-DAT IN', '1-WIRE-GND IN'],
            },
        ],
        pairs: [
            pair(0, '1-WIRE-V+', 1, '1-WIRE-V+ IN'),
            pair(0, '1-WIRE-DAT', 1, '1-WIRE-DAT IN'),
            pair(0, '1-WIRE-GND', 1, '1-WIRE-GND IN'),
        ],
    },
    {
        id: 'cb-pu-smart2',
        todo: false,
        title: 'Коммутация автоматического выключателя, блока питания и smart2',
        devices: [
            {
                key: 'circuit-breaker',
                label: 'Авт. выключатель',
                imagePath: wirelessDeviceImagePaths['circuit-breaker'],
                ports: ['L-OUT'],
            },
            {
                key: 'power-unit',
                label: 'Блок питания',
                imagePath: wirelessDeviceImagePaths['power-unit'],
                ports: ['L-IN', '12VDC-OUT-V+', '12VDC-OUT-GND'],
            },
            {
                key: 'smart2',
                label: 'Smart2',
                imagePath: controllerImagePaths.smart2,
                ports: ['12VDC-IN-V+', '12VDC-IN-GND'],
            },
        ],
        pairs: [
            pair(0, 'L-OUT', 1, 'L-IN'),
            pair(1, '12VDC-OUT-V+', 2, '12VDC-IN-V+'),
            pair(1, '12VDC-OUT-GND', 2, '12VDC-IN-GND'),
        ],
    },
    {
        id: 'cb-pu-pro',
        todo: false,
        title: 'Коммутация автоматического выключателя, блока питания и PRO',
        devices: [
            {
                key: 'circuit-breaker',
                label: 'Авт. выключатель',
                imagePath: wirelessDeviceImagePaths['circuit-breaker'],
                ports: ['L-OUT'],
            },
            {
                key: 'power-unit',
                label: 'Блок питания',
                imagePath: wirelessDeviceImagePaths['power-unit'],
                ports: ['L-IN', '12VDC-OUT-V+', '12VDC-OUT-GND'],
            },
            {
                key: 'pro',
                label: 'PRO',
                imagePath: controllerImagePaths.pro,
                ports: ['12VDC-IN-V+', '12VDC-IN-GND'],
            },
        ],
        pairs: [
            pair(0, 'L-OUT', 1, 'L-IN'),
            pair(1, '12VDC-OUT-V+', 2, '12VDC-IN-V+'),
            pair(1, '12VDC-OUT-GND', 2, '12VDC-IN-GND'),
        ],
    },
    {
        id: 'cb-pu-ups-smart2',
        todo: false,
        title: 'Коммутация автоматического выключателя, блока питания, модуля UPS и smart2',
        devices: [
            {
                key: 'circuit-breaker',
                label: 'Авт. выключатель',
                imagePath: wirelessDeviceImagePaths['circuit-breaker'],
                ports: ['L-OUT'],
            },
            {
                key: 'power-unit',
                label: 'Блок питания',
                imagePath: wirelessDeviceImagePaths['power-unit'],
                ports: ['L-IN', '12VDC-OUT-V+', '12VDC-OUT-GND'],
            },
            {
                key: 'ups',
                label: 'UPS',
                imagePath: wirelessDeviceImagePaths.ups,
                ports: ['12VDC-IN-V+', '12VDC-IN-GND', '12VDC-OUT-V+', '12VDC-OUT-GND'],
            },
            {
                key: 'smart2',
                label: 'Smart2',
                imagePath: controllerImagePaths.smart2,
                ports: ['12VDC-IN-V+', '12VDC-IN-GND'],
            },
        ],
        pairs: [
            pair(0, 'L-OUT', 1, 'L-IN'),
            pair(1, '12VDC-OUT-V+', 2, '12VDC-IN-V+'),
            pair(1, '12VDC-OUT-GND', 2, '12VDC-IN-GND'),
            pair(2, '12VDC-OUT-V+', 3, '12VDC-IN-V+'),
            pair(2, '12VDC-OUT-GND', 3, '12VDC-IN-GND'),
        ],
    },
    {
        id: 'pro-bl2',
        todo: false,
        title: 'Коммутация PRO контроллера и модуля Bl2',
        devices: [
            {
                key: 'pro',
                label: 'PRO',
                imagePath: controllerImagePaths.pro,
                ports: ['EXT-OUT-A', 'EXT-OUT-B', '12VDC-OUT-V+', '12VDC-OUT-GND'],
            },
            {
                key: 'bl2',
                label: 'Bl2',
                imagePath: wirelessDeviceImagePaths.bl2,
                ports: ['EXT-IN-A', 'EXT-IN-B', '12VDC-IN-V+', '12VDC-IN-GND'],
            },
        ],
        pairs: [
            pair(0, 'EXT-OUT-A', 1, 'EXT-IN-A'),
            pair(0, 'EXT-OUT-B', 1, 'EXT-IN-B'),
            pair(0, '12VDC-OUT-V+', 1, '12VDC-IN-V+'),
            pair(0, '12VDC-OUT-GND', 1, '12VDC-IN-GND'),
        ],
    },
    {
        id: 'pro-ntc-1-wire',
        todo: false,
        title: 'Коммутация PRO контроллера и модуля NTC-1-Wire',
        devices: [
            {
                key: 'pro',
                label: 'PRO',
                imagePath: controllerImagePaths.pro,
                ports: ['1-WIRE-V+', '1-WIRE-DAT', '1-WIRE-GND'],
            },
            {
                key: 'ntc-1-wire',
                label: 'NTC-1-Wire',
                imagePath: wirelessDeviceImagePaths['ntc-1-wire'],
                ports: ['1-WIRE-V+ IN', '1-WIRE-DAT IN', '1-WIRE-GND IN'],
            },
        ],
        pairs: [
            pair(0, '1-WIRE-V+', 1, '1-WIRE-V+ IN'),
            pair(0, '1-WIRE-DAT', 1, '1-WIRE-DAT IN'),
            pair(0, '1-WIRE-GND', 1, '1-WIRE-GND IN'),
        ],
    },
    {
        id: 'thermostat-black-floor-sensor',
        todo: false,
        title: 'Коммутация термостата (чёрный) и датчика пола',
        devices: [
            {
                key: 'thermostat-black',
                label: 'Термостат (чёрный)',
                imagePath: wirelessDeviceImagePaths['thermostat:black'],
                ports: ['1-WIRE-V+', '1-WIRE-DAT', '1-WIRE-GND'],
            },
            {
                key: 'floor-sensor-thermostat-ext',
                label: 'Датчик пола',
                imagePath: wirelessDeviceImagePaths['floor-sensor-thermostat-ext'],
                ports: ['1-WIRE-V+', '1-WIRE-DAT', '1-WIRE-GND'],
            },
        ],
        pairs: [
            pair(0, '1-WIRE-V+', 1, '1-WIRE-V+'),
            pair(0, '1-WIRE-DAT', 1, '1-WIRE-DAT'),
            pair(0, '1-WIRE-GND', 1, '1-WIRE-GND'),
        ],
    },
    {
        id: 'pro-thermostat-black-floor-sensor',
        todo: false,
        title: 'Коммутация PRO контроллера и термостата (чёрный) с датчиком пола',
        devices: [
            {
                key: 'pro',
                label: 'PRO',
                imagePath: controllerImagePaths.pro,
                ports: ['EXT-OUT-A', 'EXT-OUT-B', '12VDC-OUT-V+', '12VDC-OUT-GND'],
            },
            {
                key: 'thermostat-black',
                label: 'Термостат (чёрный)',
                imagePath: wirelessDeviceImagePaths['thermostat:black'],
                ports: ['EXT-A', 'EXT-B', '1-WIRE-V+', '1-WIRE-DAT', '1-WIRE-GND'],
            },
            {
                key: 'floor-sensor-thermostat-ext',
                label: 'Датчик пола',
                imagePath: wirelessDeviceImagePaths['floor-sensor-thermostat-ext'],
                ports: ['1-WIRE-V+', '1-WIRE-DAT', '1-WIRE-GND'],
            },
        ],
        pairs: [
            // Thermostat placed on the EXT chain (like Bl2/io4/rl6): data goes over EXT-A/B,
            // V+/GND power it - see findExtDevicePort/extLinks in spa.jsx.
            pair(0, 'EXT-OUT-A', 1, 'EXT-A'),
            pair(0, 'EXT-OUT-B', 1, 'EXT-B'),
            pair(0, '12VDC-OUT-V+', 1, '1-WIRE-V+'),
            pair(0, '12VDC-OUT-GND', 1, '1-WIRE-GND'),
            // The floor sensor addition taps the thermostat's own 1-wire terminal (V+/GND
            // shared with the EXT-power link above, DAT used only here).
            pair(1, '1-WIRE-V+', 2, '1-WIRE-V+'),
            pair(1, '1-WIRE-DAT', 2, '1-WIRE-DAT'),
            pair(1, '1-WIRE-GND', 2, '1-WIRE-GND'),
        ],
    },
    {
        id: 'pro-rdt2',
        todo: false,
        title: 'Коммутация PRO контроллера и модуля RDT2',
        devices: [
            {
                key: 'pro',
                label: 'PRO',
                imagePath: controllerImagePaths.pro,
                ports: ['1-WIRE-V+', '1-WIRE-DAT', '1-WIRE-GND'],
            },
            {
                key: 'rdt2',
                label: 'RDT2',
                imagePath: wirelessDeviceImagePaths.rdt2,
                ports: ['1-WIRE-V+ IN', '1-WIRE-DAT IN', '1-WIRE-GND IN'],
            },
        ],
        pairs: [
            pair(0, '1-WIRE-V+', 1, '1-WIRE-V+ IN'),
            pair(0, '1-WIRE-DAT', 1, '1-WIRE-DAT IN'),
            pair(0, '1-WIRE-GND', 1, '1-WIRE-GND IN'),
        ],
        // RDT2 is the wireless-repeater module - these wireless devices only come alive once
        // RDT2 itself is correctly wired to the controller, so we show them locked until then.
        decorativeDevices: [
            {
                key: 'thermostat-black',
                label: 'Термостат (чёрный)',
                imagePath: wirelessDeviceImagePaths['thermostat:black'],
            },
            {
                key: 'floor-sensor-thermostat-ext',
                label: 'Датчик пола',
                imagePath: wirelessDeviceImagePaths['floor-sensor-thermostat-ext'],
            },
            {
                key: 'outdoor-temperature-sensor',
                label: 'Уличный датчик',
                imagePath: wirelessDeviceImagePaths['outdoor-temperature-sensor'],
            },
        ],
    },
    {
        id: 'ecosmart-thermostat-ext-floor-sensor',
        todo: false,
        title: 'Коммутация ecosmart и проводного термостата с датчиком пола по EXT',
        devices: [
            {
                key: 'ecosmart',
                label: 'Ecosmart',
                imagePath: controllerImagePaths.ecosmart,
                ports: ['EXT-OUT-A', 'EXT-OUT-B', '12VDC-OUT-V+', '12VDC-OUT-GND'],
                // Ecosmart's board is far denser (many relay/NTC/indicator ports) than the
                // other module-style devices, so it needs extra size to stay legible.
                heightScale: 1.7,
            },
            {
                key: 'thermostat-black',
                label: 'Термостат (чёрный)',
                imagePath: wirelessDeviceImagePaths['thermostat:black'],
                ports: ['EXT-A', 'EXT-B', '1-WIRE-V+', '1-WIRE-DAT', '1-WIRE-GND'],
            },
            {
                key: 'floor-sensor-thermostat-ext',
                label: 'Датчик пола',
                imagePath: wirelessDeviceImagePaths['floor-sensor-thermostat-ext'],
                ports: ['1-WIRE-V+', '1-WIRE-DAT', '1-WIRE-GND'],
            },
        ],
        pairs: [
            // Same EXT-chain mechanism as the PRO+thermostat question (findExtDevicePort/
            // extLinks in spa.jsx are shared across controllers, ecosmart included).
            pair(0, 'EXT-OUT-A', 1, 'EXT-A'),
            pair(0, 'EXT-OUT-B', 1, 'EXT-B'),
            pair(0, '12VDC-OUT-V+', 1, '1-WIRE-V+'),
            pair(0, '12VDC-OUT-GND', 1, '1-WIRE-GND'),
            pair(1, '1-WIRE-V+', 2, '1-WIRE-V+'),
            pair(1, '1-WIRE-DAT', 2, '1-WIRE-DAT'),
            pair(1, '1-WIRE-GND', 2, '1-WIRE-GND'),
        ],
    },
];
