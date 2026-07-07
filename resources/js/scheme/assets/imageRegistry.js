import { canonicalDeviceType, getThermostatColor } from '../domain/deviceTypes';

export const controllerImagePaths = {
    'go': new URL('../../../assets/controllers/go/go.svg', import.meta.url).href,
    'go+': new URL('../../../assets/controllers/go+/go+.svg', import.meta.url).href,
    'smart2': new URL('../../../assets/controllers/smart2/smart2.svg', import.meta.url).href,
    'ecosmart': new URL('../../../assets/controllers/ecosmart/ecosmart.svg', import.meta.url).href,
    'pro': new URL('../../../assets/controllers/pro/pro.svg', import.meta.url).href,
};

export const wirelessDeviceImagePaths = {
    'thermostat:black': new URL('../../../assets/thermostats/black/thermostat_black.svg', import.meta.url).href,
    'thermostat:white': new URL('../../../assets/thermostats/white/thermostat_white.svg', import.meta.url).href,
    'thermostat:gray': new URL('../../../assets/thermostats/gray/thermostat_gray.svg', import.meta.url).href,
    'outdoor-temperature-sensor': new URL('../../../assets/sensors/wirelessOutdoorSensor.svg', import.meta.url).href,
    'wall-temperature-sensor': new URL('../../../assets/sensors/wirelessWallSensor.svg', import.meta.url).href,
    'flask-sensor': new URL('../../../assets/sensors/flaskSensor.svg', import.meta.url).href,
    'flask-sensor-stupid-boiler': new URL('../../../assets/sensors/flaskSensor.svg', import.meta.url).href,
    'flask-sensor-gvs-boiler': new URL('../../../assets/sensors/flaskSensor.svg', import.meta.url).href,
    'flask-sensor-strategy': new URL('../../../assets/sensors/flaskSensor.svg', import.meta.url).href,
    'flask-sensor-mixing-unit': new URL('../../../assets/sensors/flaskSensor.svg', import.meta.url).href,
    'flask-sensor-floor': new URL('../../../assets/sensors/flaskSensor.svg', import.meta.url).href,
    'flask-sensor-temperature': new URL('../../../assets/sensors/flaskSensor.svg', import.meta.url).href,
    'floor-sensor': new URL('../../../assets/sensors/flaskSensor.svg', import.meta.url).href,
    'floor-sensor-thermostat-ext': new URL('../../../assets/sensors/flaskSensorForThermostatExt.svg', import.meta.url).href,
    'wall-digital-sensor': new URL('../../../assets/sensors/wallDigitalSensor.svg', import.meta.url).href,
    'ntc-sensor': new URL('../../../assets/sensors/ntcSensorRightPort.svg', import.meta.url).href,
    'ntc-sensor-left': new URL('../../../assets/sensors/ntcSensorLeftPort.svg', import.meta.url).href,
    'boiler-ntc-sensor': new URL('../../../assets/sensors/ntcSensorLeftPort.svg', import.meta.url).href,
    'mixing-ntc-sensor': new URL('../../../assets/sensors/ntcSensorLeftPort.svg', import.meta.url).href,
    'pressure-sensor': new URL('../../../assets/sensors/pressureSensor.svg', import.meta.url).href,
    'pressure-sensor-right-ports': new URL('../../../assets/sensors/pressureSensorRightPorts.svg', import.meta.url).href,
    'ntc-1-wire': new URL('../../../assets/modules/ntc-1-wire/ntc-1-wire.svg', import.meta.url).href,
    rdt2: new URL('../../../assets/modules/rdt2/rdt2.svg', import.meta.url).href,
    smart: new URL('../../../assets/boilers/smartBoiler/smartBoiler.svg', import.meta.url).href,
    stupid: new URL('../../../assets/boilers/stupidBoiler/stupidBoiler.svg', import.meta.url).href,
    bl2: new URL('../../../assets/modules/bl2/bl2.svg', import.meta.url).href,
    ecosmartbl2: new URL('../../../assets/modules/bl2/ecosmartbl2.svg', import.meta.url).href,
    rl6: new URL('../../../assets/modules/rl6/rl6.svg', import.meta.url).href,
    rl6s: new URL('../../../assets/modules/rl6s/rl6s.svg', import.meta.url).href,
    io4: new URL('../../../assets/modules/io4/io4.svg', import.meta.url).href,
    di6: new URL('../../../assets/modules/di6/di6.svg', import.meta.url).href,
    rl2: new URL('../../../assets/modules/rl2/rl2.svg', import.meta.url).href,
    rl2s: new URL('../../../assets/modules/rl2s/rl2s.svg', import.meta.url).href,
    discrete_pool: new URL('../../../assets/discreteInputs/poolLeftPorts.svg', import.meta.url).href,
    'discrete_pool-right-port': new URL('../../../assets/discreteInputs/poolRightPorts.svg', import.meta.url).href,
    discrete_fire_alarm: new URL('../../../assets/discreteInputs/fireSignalLeftPorts.svg', import.meta.url).href,
    'discrete_fire_alarm-right-port': new URL('../../../assets/discreteInputs/fireSignalRightPorts.svg', import.meta.url).href,
    discrete_signal: new URL('../../../assets/discreteInputs/signalLeftPorts.svg', import.meta.url).href,
    'discrete_signal-right-port': new URL('../../../assets/discreteInputs/fireSignalRightPorts.svg', import.meta.url).href,
    discrete_ventilation: new URL('../../../assets/discreteInputs/ventilationLeftPorts.svg', import.meta.url).href,
    'discrete_ventilation-right-port': new URL('../../../assets/discreteInputs/ventillationRightPorts.svg', import.meta.url).href,
    'leak-sensor': new URL('../../../assets/sensors/leakSensorLeftPort.svg', import.meta.url).href,
    'leak-sensor-right-port': new URL('../../../assets/sensors/leakSensorRightPort.svg', import.meta.url).href,
    'circuit-breaker': new URL('../../../assets/modules/circuit-breaker/circuit-breaker.svg', import.meta.url).href,
    'power-unit': new URL('../../../assets/modules/power-unit/power-unit.svg', import.meta.url).href,
    battery: new URL('../../../assets/modules/battery/battery.svg', import.meta.url).href,
    ups: new URL('../../../assets/modules/ups/ups.svg', import.meta.url).href,
    'other-equipment-right-port': new URL('../../../assets/engineerings/otherEquipment/otherEquipmentRightPort.svg', import.meta.url).href,
    'other-equipment-left-port': new URL('../../../assets/engineerings/otherEquipment/otherEquipmentLeftPort.svg', import.meta.url).href,
    'pump-220v-right-port': new URL('../../../assets/pumps/220pumpRightPort.svg', import.meta.url).href,
    'pump-220v-left-port': new URL('../../../assets/pumps/220pumpLeftPort.svg', import.meta.url).href,
    'boiler-pump-right-port': new URL('../../../assets/pumps/boilerPumpRightPort.svg', import.meta.url).href,
    'boiler-pump-left-port': new URL('../../../assets/pumps/boilerPumpLeftPort.svg', import.meta.url).href,
    'zoneServo-right-port': new URL('../../../assets/servo/zoneServoRightPort.svg', import.meta.url).href,
    'zoneServo-left-port': new URL('../../../assets/servo/zoneServoLeftPort.svg', import.meta.url).href,
    '010pump': new URL('../../../assets/pumps/010pumpLeftPort.svg', import.meta.url).href,
    '010servo': new URL('../../../assets/servo/010servoLeftPorts.svg', import.meta.url).href,
    '220servo-right-ports': new URL('../../../assets/servo/220servoRightPorts.svg', import.meta.url).href,
    '220servo-left-ports': new URL('../../../assets/servo/220servoLeftPorts.svg', import.meta.url).href,
    'valve-right-port': new URL('../../../assets/modules/valve/valveRightPort.svg', import.meta.url).href,
    'valve-left-port': new URL('../../../assets/modules/valve/valveLeftPort.svg', import.meta.url).href,
};

export const aerialImagePath = new URL('../../../assets/other/aerial.svg', import.meta.url).href;
export const goAerialImagePath = new URL('../../../assets/other/go-aerial.svg', import.meta.url).href;

export const getWirelessDeviceImageKey = (device) => {
    const normalizedType = canonicalDeviceType(device?.type);
    if (normalizedType === 'thermostat') {
        return `thermostat:${getThermostatColor(device)}`;
    }
    if (normalizedType === 'other-equipment' || normalizedType === 'otherequipment') {
        const side = device?.port_side === 'left' ? 'left' : 'right';
        return `other-equipment-${side}-port`;
    }
    if (normalizedType === 'pump-220v') {
        const side = device?.port_side === 'left' ? 'left' : 'right';
        return `pump-220v-${side}-port`;
    }
    if (normalizedType === 'boiler-pump') {
        const side = device?.port_side === 'left' ? 'left' : 'right';
        return `boiler-pump-${side}-port`;
    }
    if (normalizedType === 'zoneServo') {
        const side = device?.port_side === 'left' ? 'left' : 'right';
        return `zoneServo-${side}-port`;
    }
    if (normalizedType === '220servo') {
        const side = device?.port_side === 'left' ? 'left' : 'right';
        return side === 'left' ? '220servo-left-ports' : '220servo-right-ports';
    }
    if (normalizedType === 'valve') {
        const side = device?.port_side === 'left' ? 'left' : 'right';
        return `valve-${side}-port`;
    }
    if (normalizedType === 'pressure-sensor') {
        return device?.port_side === 'right' ? 'pressure-sensor-right-ports' : 'pressure-sensor';
    }
    if (normalizedType === 'ntc-sensor' || normalizedType === 'mixing-ntc-sensor') {
        return device?.port_side === 'left' ? 'ntc-sensor-left' : 'ntc-sensor';
    }
    if (
        normalizedType === 'discrete_pool'
        || normalizedType === 'discrete_fire_alarm'
        || normalizedType === 'discrete_signal'
        || normalizedType === 'discrete_ventilation'
        || normalizedType === 'leak-sensor'
    ) {
        return device?.port_side === 'right' ? `${normalizedType}-right-port` : normalizedType;
    }
    return normalizedType;
};
