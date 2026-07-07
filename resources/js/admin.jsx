import React from 'react';
import { createRoot } from 'react-dom/client';

const controllerImagePaths = {
    pro: new URL('../assets/controllers/pro/pro.svg', import.meta.url).href,
    smart2: new URL('../assets/controllers/smart2/smart2.svg', import.meta.url).href,
    ecosmart: new URL('../assets/controllers/ecosmart/ecosmart.svg', import.meta.url).href,
    go: new URL('../assets/controllers/go/go.svg', import.meta.url).href,
    'go+': new URL('../assets/controllers/go+/go+.svg', import.meta.url).href,
};

const moduleImagePaths = {
    bl2: new URL('../assets/modules/bl2/bl2.svg', import.meta.url).href,
    ecosmartbl2: new URL('../assets/modules/bl2/ecosmartbl2.svg', import.meta.url).href,
    rl6: new URL('../assets/modules/rl6/rl6.svg', import.meta.url).href,
    rl6s: new URL('../assets/modules/rl6s/rl6s.svg', import.meta.url).href,
    io4: new URL('../assets/modules/io4/io4.svg', import.meta.url).href,
    di6: new URL('../assets/modules/di6/di6.svg', import.meta.url).href,
    rl2: new URL('../assets/modules/rl2/rl2.svg', import.meta.url).href,
    rl2s: new URL('../assets/modules/rl2s/rl2s.svg', import.meta.url).href,
    'ntc-1-wire': new URL('../assets/modules/ntc-1-wire/ntc-1-wire.svg', import.meta.url).href,
    rdt2: new URL('../assets/modules/rdt2/rdt2.svg', import.meta.url).href,
    'circuit-breaker': new URL('../assets/modules/circuit-breaker/circuit-breaker.svg', import.meta.url).href,
    'power-unit': new URL('../assets/modules/power-unit/power-unit.svg', import.meta.url).href,
    ups: new URL('../assets/modules/ups/ups.svg', import.meta.url).href,
    battery: new URL('../assets/modules/battery/battery.svg', import.meta.url).href,
};

const deviceImagePaths = {
    'wireless-thermostat': new URL('../assets/thermostats/black/thermostat_black.svg', import.meta.url).href,
    'wired-thermostat': new URL('../assets/thermostats/black/thermostat_black.svg', import.meta.url).href,
    'wireless-outdoor-sensor': new URL('../assets/sensors/wirelessOutdoorSensor.svg', import.meta.url).href,
    'wireless-wall-sensor': new URL('../assets/sensors/wirelessWallSensor.svg', import.meta.url).href,
    'flask-sensor': new URL('../assets/sensors/flaskSensor.svg', import.meta.url).href,
    'ntc-sensor': new URL('../assets/sensors/ntcSensorLeftPort.svg', import.meta.url).href,
    'wall-digital-sensor': new URL('../assets/sensors/wallDigitalSensor.svg', import.meta.url).href,
    'wall-ntc-sensor': new URL('../assets/sensors/ntcSensorLeftPort.svg', import.meta.url).href,
    'flask-sensor-gvs-boiler': new URL('../assets/sensors/flaskSensor.svg', import.meta.url).href,
    'flask-sensor-mixing-unit': new URL('../assets/sensors/flaskSensor.svg', import.meta.url).href,
    'mixing-ntc-sensor': new URL('../assets/sensors/ntcSensorLeftPort.svg', import.meta.url).href,
    'flask-sensor-strategy': new URL('../assets/sensors/flaskSensor.svg', import.meta.url).href,
    'pressure-sensor': new URL('../assets/sensors/pressureSensor.svg', import.meta.url).href,
    'smart-boiler': new URL('../assets/boilers/smartBoiler/smartBoiler.svg', import.meta.url).href,
    'stupid-boiler': new URL('../assets/boilers/stupidBoiler/stupidBoiler.svg', import.meta.url).href,
    '220servo': new URL('../assets/servo/220servoRightPorts.svg', import.meta.url).href,
    valve: new URL('../assets/modules/valve/valveRightPort.svg', import.meta.url).href,
    '010servo': new URL('../assets/servo/010servoLeftPorts.svg', import.meta.url).href,
    zoneServo: new URL('../assets/servo/zoneServoRightPort.svg', import.meta.url).href,
    '010pump': new URL('../assets/pumps/010pumpLeftPort.svg', import.meta.url).href,
    'pump-220v': new URL('../assets/pumps/220pumpRightPort.svg', import.meta.url).href,
    'boiler-pump': new URL('../assets/pumps/boilerPumpRightPort.svg', import.meta.url).href,
    'discrete-pool': new URL('../assets/discreteInputs/poolLeftPorts.svg', import.meta.url).href,
    'discrete-fire': new URL('../assets/discreteInputs/fireSignalLeftPorts.svg', import.meta.url).href,
    'discrete-signal': new URL('../assets/discreteInputs/signalLeftPorts.svg', import.meta.url).href,
    'discrete-ventilation': new URL('../assets/discreteInputs/ventilationLeftPorts.svg', import.meta.url).href,
    'leak-sensor': new URL('../assets/sensors/leakSensorRightPort.svg', import.meta.url).href,
    'other-equipment': new URL('../assets/engineerings/otherEquipment/otherEquipmentRightPort.svg', import.meta.url).href,
};

const moduleConnections = {
    bl2: 'pro',
    ecosmartbl2: 'ecosmart only, field: controller.ecosmart_bl2 or ecosmart_bl2',
    rl6: 'pro, ecosmart',
    rl6s: 'pro, ecosmart',
    io4: 'pro, ecosmart',
    di6: 'pro, ecosmart',
    rl2: 'pro',
    rl2s: 'pro',
    'ntc-1-wire': 'go, go+, smart2, pro, rl6, rl6s',
    rdt2: 'go, go+, smart2, pro, rl6, rl6s',
    'circuit-breaker': 'smart2, pro',
    'power-unit': 'smart2, pro',
    ups: 'smart2, pro',
    battery: 'ups',
};

const deviceConnections = {
    'wireless-thermostat': 'go, go+, smart2, pro, ecosmart',
    'wired-thermostat': 'go, go+, smart2, pro, rl6, rl6s',
    'wireless-outdoor-sensor': 'go, go+, smart2, pro, ecosmart',
    'wireless-wall-sensor': 'go, go+, smart2, pro, ecosmart',
    'flask-sensor': 'go, go+, smart2, pro, rl6, rl6s',
    'wall-digital-sensor': 'go, go+, smart2, pro, rl6, rl6s',
    'wall-ntc-sensor': 'ntc-1-wire, io4',
    'flask-sensor-gvs-boiler': 'go, go+, smart2, pro, rl6, rl6s, ntc-1-wire, io4',
    'flask-sensor-mixing-unit': 'go, go+, smart2, pro, rl6, rl6s',
    'mixing-ntc-sensor': 'ntc-1-wire, io4',
    'flask-sensor-strategy': 'go, go+, smart2, pro, rl6, rl6s, ntc-1-wire, io4',
    'ntc-sensor': 'ntc-1-wire, io4',
    'pressure-sensor': 'pro, io4',
    'smart-boiler': 'go, go+, smart2, pro, bl2',
    'stupid-boiler': 'go, go+, smart2, pro, rl6, rl6s, rl2, rl2s',
    '220servo': 'pro, rl6, rl6s, rl2, rl2s',
    valve: 'pro, rl6, rl6s, rl2, rl2s',
    '010servo': 'io4',
    zoneServo: 'go, go+, pro, rl6, rl6s, rl2, rl2s',
    '010pump': 'io4',
    'pump-220v': 'go, go+, pro, rl6, rl6s, rl2, rl2s',
    'boiler-pump': 'pro, rl6, rl6s, rl2, rl2s',
    'discrete-pool': 'pro, io4, di6',
    'discrete-fire': 'pro, io4, di6',
    'discrete-signal': 'pro, io4, di6',
    'discrete-ventilation': 'pro, io4, di6',
    'leak-sensor': 'pro, ecosmart, io4, di6',
    'other-equipment': 'go, go+, pro, rl6, rl2',
};

const WIRELESS_TARGETS = new Set(['go', 'go+', 'smart2', 'pro', 'ecosmart']);
const RELAY_TARGETS = new Set(['go', 'go+', 'pro', 'rl6', 'rl2']);
const RELAY_S_TARGETS = new Set(['rl6s', 'rl2s']);
const ONE_WIRE_TARGETS = new Set(['go', 'go+', 'smart2', 'pro', 'rl6', 'rl6s']);

const splitConnections = (value) => String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const getModulePorts = (moduleType, target) => {
    if (['bl2', 'rl6', 'rl6s', 'io4', 'di6'].includes(moduleType)) return 'EXT';
    if (moduleType === 'ecosmartbl2') return 'controller.ecosmart_bl2';
    if (moduleType === 'rl2' || moduleType === 'rl2s') return 'DI';
    if (moduleType === 'ntc-1-wire' || moduleType === 'rdt2') return '1-WIRE';
    if (moduleType === 'circuit-breaker') return target === 'smart2' || target === 'pro' ? 'L-IN / L-OUT' : '-';
    if (moduleType === 'power-unit') return target === 'smart2' || target === 'pro' ? '12VDC-IN / 12VDC-OUT' : '-';
    if (moduleType === 'ups') return target === 'smart2' || target === 'pro' ? '12VDC-IN, DI-IN-1, DI-IN-2' : '-';
    if (moduleType === 'battery') return 'ACID-BAT-V+ / ACID-BAT-GND';
    return '-';
};

const getDevicePorts = (deviceType, target) => {
    if (deviceType.startsWith('wireless-')) return WIRELESS_TARGETS.has(target) ? 'radio / RF' : '-';
    if (deviceType === 'wired-thermostat' || deviceType === 'flask-sensor' || deviceType === 'wall-digital-sensor' || deviceType === 'flask-sensor-mixing-unit') return ONE_WIRE_TARGETS.has(target) ? '1-WIRE-V+, 1-WIRE-DAT, 1-WIRE-GND' : '-';
    if (deviceType === 'ntc-sensor' || deviceType === 'wall-ntc-sensor' || deviceType === 'mixing-ntc-sensor') return 'NTC channel';
    if (deviceType === 'flask-sensor-gvs-boiler' || deviceType === 'flask-sensor-strategy') return target === 'ecosmart' ? 'NTC channel' : '1-WIRE-V+, 1-WIRE-DAT, 1-WIRE-GND';
    if (deviceType === 'pressure-sensor') return target === 'pro' ? 'AI-IN / 4-20' : 'channel_devices / 4-20';
    if (deviceType === 'smart-boiler') return target === 'bl2' ? 'BUS on BL2' : 'BUS-A / BUS-B';
    if (deviceType === 'stupid-boiler') return RELAY_S_TARGETS.has(target) ? 'RELAY-S' : 'RELAY';
    if (deviceType === '220servo' || deviceType === 'valve') return RELAY_S_TARGETS.has(target) ? '2 x RELAY-S' : '2 x RELAY';
    if (deviceType === '010servo' || deviceType === '010pump') return 'IO4 channel';
    if (deviceType === 'zoneServo') return RELAY_S_TARGETS.has(target) ? 'RELAY-S' : 'RELAY';
    if (deviceType === 'pump-220v') return target === 'pro' ? 'RELAY / RELAY-S' : (RELAY_S_TARGETS.has(target) ? 'RELAY-S' : (RELAY_TARGETS.has(target) ? 'RELAY' : '-'));
    if (deviceType === 'boiler-pump') return RELAY_S_TARGETS.has(target) ? 'RELAY-S' : 'RELAY';
    if (deviceType.startsWith('discrete-')) return target === 'pro' ? 'DI-IN-1 / DI-IN-2' : 'DI channel';
    if (deviceType === 'leak-sensor') return target === 'ecosmart' ? 'DI-IN-2-GND, DI-IN-2-DI, DI-IN-2-V+' : 'DI channel';
    if (deviceType === 'other-equipment') return RELAY_TARGETS.has(target) ? 'RELAY' : '-';
    return '-';
};

const getConnectionPorts = (rowType, target, tableKind) => (
    tableKind === 'modules' ? getModulePorts(rowType, target) : getDevicePorts(rowType, target)
);

const ConnectionMatrix = ({ rowType, value, tableKind }) => {
    const targets = splitConnections(value);
    if (targets.length === 0) return '-';

    return (
        <table className="connection-matrix">
            <thead>
                <tr>
                    <th>К чему</th>
                    <th>Порты / линия</th>
                </tr>
            </thead>
            <tbody>
                {targets.map((target) => (
                    <tr key={target}>
                        <td>{target}</td>
                        <td>{getConnectionPorts(rowType, target, tableKind)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

const controllers = [
    {
        type: 'pro',
        title: 'pro',
        compactImage: true,
        bundledDevices: [
            'Датчик температуры настенный - 1',
            'Датчик температуры в колбе - 2',
        ],
        object: `controller: {
    type: 'pro',
    relay_devices: [],
    relay_s_devices: [],
    one_wire_devices: [],
    ai_devices: [],
    di_devices: [],
    modbus_devices: [],
    di_devices: [],
    devices_420: [],
    bus_devices: []
}`,
    },
    {
        type: 'smart2',
        title: 'smart2',
        compactImage: true,
        bundledDevices: [
            'Датчик температуры настенный проводной - 1',
        ],
        object: `controller: {
    type: 'smart2',
    relay_devices: [],
    one_wire_devices: [],
    bus_devices: []
}`,
    },
    {
        type: 'ecosmart',
        title: 'ecosmart',
        compactImage: true,
        bundledDevices: [
            'Датчик температуры в колбе NTC - 3',
        ],
        object: `controller: {
    type: 'ecosmart',
    relay_devices: [],
    '220_servo_devices': [],
    relay_s_valve_devices: [],
    relay_boiler_gvs_devices: [],
    relay_220pump_devices: [],
    relay_220pump5_devices: [],
    relay_220pump3_devices: [],
    one_wire_devices: [],
    modbus_devices: [],
    devices_420: [],
    leak_sensor_devices: [],
    bus_devices: [],
    ecosmart_bl2: []
}`,
    },
    {
        type: 'go',
        title: 'go',
        compactImage: true,
        bundledDevices: [
            'Датчик температуры настенный проводной - 1',
        ],
        object: `controller: {
    type: 'go',
    relay_devices: [],
    one_wire_devices: [],
    bus_devices: []
}`,
    },
    {
        type: 'go+',
        title: 'go+',
        compactImage: true,
        bundledDevices: [
            'Радиодатчик температуры и влажность комнатный Myheat - 1',
        ],
        object: `controller: {
    type: 'go+',
    relay_devices: [],
    one_wire_devices: [],
    bus_devices: []
}`,
    },
];

const modules = [
    {
        type: 'bl2',
        title: 'BL2',
        group: 'EXT',
        object: `{
    id: 0,
    device_type: 'module',
    type: 'bl2',
    connection_type: 'EXT',
    one_wire_devices: [],
    bus_devices: []
}`,
    },
    {
        type: 'ecosmartbl2',
        title: 'Ecosmart BL2',
        group: 'ecosmart overlay',
        object: `{
    id: 0,
    device_type: 'module',
    type: 'ecosmartbl2',
    connection_type: 'ecosmartbl2'
}`,
    },
    {
        type: 'rl6',
        title: 'RL6',
        group: 'EXT',
        object: `{
    id: 0,
    device_type: 'module',
    type: 'rl6',
    connection_type: 'EXT',
    one_wire_devices: [],
    relay_devices: []
}`,
    },
    {
        type: 'rl6s',
        title: 'RL6S',
        group: 'EXT',
        object: `{
    id: 0,
    device_type: 'module',
    type: 'rl6s',
    connection_type: 'EXT',
    one_wire_devices: [],
    relay_s_devices: []
}`,
    },
    {
        type: 'io4',
        title: 'IO4',
        group: 'EXT',
        object: `{
    id: 0,
    device_type: 'module',
    type: 'io4',
    connection_type: 'EXT',
    one_wire_devices: [],
    channel_devices: []
}`,
    },
    {
        type: 'di6',
        title: 'DI6',
        group: 'EXT',
        object: `{
    id: 0,
    device_type: 'module',
    type: 'di6',
    connection_type: 'EXT',
    one_wire_devices: [],
    channel_devices: [],
    di_devices: []
}`,
    },
    {
        type: 'rl2',
        title: 'RL2',
        group: 'DI',
        object: `{
    id: 0,
    device_type: 'module',
    type: 'rl2',
    connection_type: 'DI',
    relay_devices: []
}`,
    },
    {
        type: 'rl2s',
        title: 'RL2S',
        group: 'DI',
        object: `{
    id: 0,
    device_type: 'module',
    type: 'rl2s',
    connection_type: 'DI',
    relay_s_devices: []
}`,
    },
    {
        type: 'ntc-1-wire',
        title: 'NTC-1-wire',
        group: '1-wire',
        object: `{
    id: 0,
    device_type: 'module',
    type: 'ntc-1-wire',
    connection_type: '1-wire',
    ntc1_devices: [],
    ntc2_devices: []
}`,
    },
    {
        type: 'rdt2',
        title: 'RDT2',
        group: '1-wire',
        object: `{
    id: 0,
    device_type: 'module',
    type: 'rdt2',
    connection_type: '1-wire'
}`,
    },
    {
        type: 'circuit-breaker',
        title: 'Автомат',
        group: 'power',
        powerImage: true,
        object: `{
    type: 'circuit-breaker'
}`,
    },
    {
        type: 'power-unit',
        title: 'Блок питания',
        group: 'power',
        powerImage: true,
        object: `{
    type: 'power-unit'
}`,
    },
    {
        type: 'ups',
        title: 'UPS',
        group: 'power',
        powerImage: true,
        object: `{
    type: 'ups'
}`,
    },
    {
        type: 'battery',
        title: 'Аккумулятор',
        group: 'power',
        powerImage: true,
        object: `{
    type: 'battery'
}`,
    },
];

const devices = [
    {
        type: 'wireless-thermostat',
        title: 'Беспроводной термостат',
        group: 'термостат',
        deviceImage: true,
        object: `{
    id: 0,
    device_type: 'thermostat',
    type: 'thermostat',
    color: 'black',
    additions: []
}`,
    },
    {
        type: 'wired-thermostat',
        title: 'Проводной термостат',
        group: 'термостат / 1-wire',
        deviceImage: true,
        object: `{
    id: 0,
    device_type: 'thermostat',
    type: 'thermostat',
    connection_type: '1-wire',
    color: 'black',
    additions: []
}`,
    },
    {
        type: 'wireless-outdoor-sensor',
        title: 'Беспроводной уличный датчик',
        group: 'датчик',
        deviceImage: true,
        object: `{
    id: 0,
    device_type: 'sensor',
    type: 'outdoor-temperature-sensor',
    additions: []
}`,
    },
    {
        type: 'wireless-wall-sensor',
        title: 'Беспроводной настенный датчик',
        group: 'датчик',
        deviceImage: true,
        object: `{
    id: 0,
    device_type: 'sensor',
    type: 'wall-temperature-sensor',
    additions: []
}`,
    },
    {
        type: 'flask-sensor',
        title: '1-wire датчик в колбе',
        group: 'датчик / 1-wire',
        deviceImage: true,
        object: `{
    id: 0,
    device_type: 'sensor',
    type: 'flask-sensor-temperature',
    connection_type: '1-wire'
}`,
    },
    {
        type: 'ntc-sensor',
        title: 'NTC датчик',
        group: 'датчик / ntc',
        deviceImage: true,
        object: `{
    id: 0,
    device_type: 'sensor',
    type: 'ntc-sensor',
    connection_type: 'ntc'
}`,
    },
    {
        type: 'wall-digital-sensor',
        title: 'Настенный цифровой датчик',
        group: 'датчик / 1-wire',
        deviceImage: true,
        object: `{
    id: 0,
    device_type: 'sensor',
    type: 'wall-digital-sensor',
    connection_type: '1-wire'
}`,
    },
    {
        type: 'wall-ntc-sensor',
        title: 'Настенный NTC датчик',
        group: 'датчик / ntc',
        deviceImage: true,
        object: `{
    id: 0,
    device_type: 'sensor',
    type: 'wall-ntc-sensor',
    connection_type: 'ntc'
}`,
    },
    {
        type: 'flask-sensor-gvs-boiler',
        title: 'Датчик бойлера ГВС',
        group: 'датчик / 1-wire|ntc',
        deviceImage: true,
        object: `{
    id: 0,
    device_type: 'sensor',
    type: 'flask-sensor-gvs-boiler',
    connection_type: '1-wire|ntc'
}`,
    },
    {
        type: 'flask-sensor-mixing-unit',
        title: 'Датчик смесительного узла',
        group: 'датчик / 1-wire',
        deviceImage: true,
        object: `{
    id: 0,
    device_type: 'sensor',
    type: 'flask-sensor-mixing-unit',
    connection_type: '1-wire'
}`,
    },
    {
        type: 'mixing-ntc-sensor',
        title: 'NTC датчик смесительного узла',
        group: 'датчик / ntc',
        deviceImage: true,
        object: `{
    id: 0,
    device_type: 'sensor',
    type: 'mixing-ntc-sensor',
    connection_type: 'ntc'
}`,
    },
    {
        type: 'flask-sensor-strategy',
        title: 'Датчик стратегии котлов',
        group: 'датчик / 1-wire|ntc',
        deviceImage: true,
        object: `{
    id: 0,
    device_type: 'sensor',
    type: 'flask-sensor-strategy',
    connection_type: '1-wire|ntc'
}`,
    },
    {
        type: 'pressure-sensor',
        title: 'Датчик давления',
        group: 'датчик / 4-20',
        deviceImage: true,
        object: `{
    id: 0,
    device_type: 'sensor',
    type: 'pressure-sensor',
    connection_type: '4-20'
}`,
    },
    {
        type: 'smart-boiler',
        title: 'Котёл BUS',
        group: 'котёл',
        deviceImage: true,
        object: `{
    id: 0,
    device_type: 'boiler',
    type: 'smart',
    name: 'Baxi Slim',
    reserve: false,
    connection_type: 'BUS'
}`,
    },
    {
        type: 'stupid-boiler',
        title: 'Котёл RELAY',
        group: 'котёл',
        deviceImage: true,
        object: `{
    id: 0,
    device_type: 'boiler',
    type: 'stupid',
    name: 'Baxi HT',
    reserve: false,
    connection_type: 'RELAY'
}`,
    },
    {
        type: '220servo',
        title: 'Сервопривод 220V',
        group: 'сервопривод',
        deviceImage: true,
        object: `{
    id: 0,
    device_type: 'equipment',
    type: '220servo',
    connection_type: 'double_relay',
    additions: []
}`,
    },
    {
        type: 'valve',
        title: 'Запорный клапан',
        group: 'запорный клапан',
        deviceImage: true,
        object: `{
    id: 0,
    device_type: 'equipment',
    type: 'valve',
    connection_type: 'double_relay',
    additions: []
}`,
    },
    {
        type: '010servo',
        title: 'Сервопривод 0-10V',
        group: 'сервопривод',
        deviceImage: true,
        object: `{
    id: 0,
    device_type: 'equipment',
    type: '010servo',
    connection_type: 'di',
    additions: []
}`,
    },
    {
        type: 'zoneServo',
        title: 'Сервопривод зоны',
        group: 'сервопривод',
        deviceImage: true,
        object: `{
    id: 0,
    device_type: 'equipment',
    type: 'zoneServo',
    connection_type: 'relay | relay-s',
    additions: []
}`,
    },
    {
        type: '010pump',
        title: 'Насос 0-10V',
        group: 'насос',
        deviceImage: true,
        object: `{
    id: 0,
    device_type: 'equipment',
    type: '010pump',
    connection_type: 'di',
    additions: []
}`,
    },
    {
        type: 'pump-220v',
        title: 'Насос 220V',
        group: 'насос',
        deviceImage: true,
        object: `{
    id: 0,
    device_type: 'equipment',
    type: 'pump-220v',
    connection_type: 'relay|relay-s',
    additions: []
}`,
    },
    {
        type: 'boiler-pump',
        title: 'Насос бойлера',
        group: 'насос',
        deviceImage: true,
        object: `{
    id: 0,
    device_type: 'equipment',
    type: 'boiler-pump',
    connection_type: 'relay|relay-s',
    additions: []
}`,
    },
    {
        type: 'discrete-pool',
        title: 'Дискретный бассейн',
        group: 'дискретный вход',
        deviceImage: true,
        object: `{
    id: 0,
    device_type: 'equipment',
    type: 'discrete_pool',
    connection_type: 'di'
}`,
    },
    {
        type: 'discrete-fire',
        title: 'Дискретная пожарка',
        group: 'дискретный вход',
        deviceImage: true,
        object: `{
    id: 0,
    device_type: 'equipment',
    type: 'discrete_fire_alarm',
    connection_type: 'di'
}`,
    },
    {
        type: 'discrete-signal',
        title: 'Дискретный сигнал',
        group: 'дискретный вход',
        deviceImage: true,
        object: `{
    id: 0,
    device_type: 'equipment',
    type: 'discrete_signal',
    connection_type: 'di'
}`,
    },
    {
        type: 'discrete-ventilation',
        title: 'Дискретная вентиляция',
        group: 'дискретный вход',
        deviceImage: true,
        object: `{
    id: 0,
    device_type: 'equipment',
    type: 'discrete_ventilation',
    connection_type: 'di'
}`,
    },
    {
        type: 'leak-sensor',
        title: 'Датчик протечки',
        group: 'дискретный вход',
        deviceImage: true,
        object: `{
    id: 13,
    device_type: 'sensor',
    type: 'leak-sensor',
    connection_type: 'di'
}`,
    },
    {
        type: 'other-equipment',
        title: 'Прочее оборудование',
        group: 'оборудование',
        deviceImage: true,
        object: `{
    id: 0,
    device_type: 'equipment',
    type: 'otherEquipment',
    connection_type: 'relay',
    additions: []
}`,
    },
];

const ReferenceTable = ({ rows, title, description, imagePaths, connections = null, tableKind = 'devices' }) => (
    <section className="admin-section">
        <header className="admin-section-header">
            <h2>{title}</h2>
            <p>{description}</p>
        </header>
        <div className="admin-table-wrap">
            <table className="controllers-table">
                <thead>
                    <tr>
                        <th>Изображение</th>
                        <th>Название</th>
                        {connections && <th>Подключается к</th>}
                        <th>Объект с линиями</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={row.type}>
                            <td className="controller-image-cell">
                                <img
                                    className={row.deviceImage ? 'device-image' : (row.powerImage ? 'power-module-image' : (row.compactImage ? 'controller-image-compact' : 'module-image'))}
                                    src={imagePaths[row.type]}
                                    alt={row.title}
                                />
                            </td>
                            <td className="controller-title-cell">
                                <span>{row.title}</span>
                                {row.group && <small>{row.group}</small>}
                            </td>
                            {connections && (
                                <td>
                                    <ConnectionMatrix rowType={row.type} value={connections[row.type]} tableKind={tableKind} />
                                </td>
                            )}
                            <td>
                                <pre className="controller-object"><code>{row.object}</code></pre>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </section>
);

const controllerImageMaxWidth = {
    pro: 350,
    ecosmart: 300,
};

const ControllerTable = ({ rows, title, description, imagePaths }) => (
    <section className="admin-section">
        <header className="admin-section-header">
            <h2>{title}</h2>
            <p>{description}</p>
        </header>
        <div className="admin-table-wrap">
            <table className="controllers-table controller-table-transposed">
                <thead>
                    <tr>
                        {rows.map((row) => (
                            <th key={row.type} className="controller-transposed-header">
                                <span>{row.title}</span>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        {rows.map((row) => (
                            <td key={row.type} className="controller-image-cell">
                                <img
                                    style={{ maxWidth: (controllerImageMaxWidth[row.type] || 250) + 'px' }}
                                    src={imagePaths[row.type]}
                                    alt={row.title}
                                />
                            </td>
                        ))}
                    </tr>
                    <tr>
                        {rows.map((row) => (
                            <td key={row.type}>
                                {row.bundledDevices?.length > 0 && (
                                    <table className="bundled-devices-table">
                                        <tbody>
                                            {row.bundledDevices.map((device, i) => (
                                                <tr key={i}>
                                                    <td>{device}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </td>
                        ))}
                    </tr>
                    <tr>
                        {rows.map((row) => (
                            <td key={row.type}>
                                <pre className="controller-object"><code>{row.object}</code></pre>
                            </td>
                        ))}
                    </tr>
                </tbody>
            </table>
        </div>
    </section>
);

const AdminApp = () => (
    <main className="admin-page">
        <header className="admin-header">
            <div>
                <h1>Справочник</h1>
                <p>Справочник объектов контроллеров и их линий.</p>
            </div>
            <a href="/scheme">Go to SPA</a>
        </header>
        <ControllerTable
            rows={controllers}
            title="Контроллеры"
            description="Объекты controller и доступные линии."
            imagePaths={controllerImagePaths}
        />
        <ReferenceTable
            rows={modules}
            title="Модули"
            description="EXT, DI, 1-wire и power-модули с возможными линиями."
            imagePaths={moduleImagePaths}
            connections={moduleConnections}
            tableKind="modules"
        />
        <ReferenceTable
            rows={devices}
            title="Устройства"
            description="Датчики, котлы, термостаты, сервоприводы, запорные клапаны, насосы и оборудование."
            imagePaths={deviceImagePaths}
            connections={deviceConnections}
            tableKind="devices"
        />
    </main>
);

createRoot(document.getElementById('admin-app')).render(<AdminApp />);
