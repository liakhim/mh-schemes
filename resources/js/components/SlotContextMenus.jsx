import React from 'react';
import { buildRelaySlotOccupancyPreserveIndexes } from '../scheme/domain/relaySlots';
import SlotContextMenu from './SlotContextMenu';

const SlotContextMenus = ({
    scheme,
    setScheme,
    slotMenuPos,
    setSlotMenuPos,
    thermostatMenuPos,
    setThermostatMenuPos,
    oneWireMenuPos,
    setOneWireMenuPos,
    powerMenuPos,
    setPowerMenuPos,
    relayMenuPos,
    setRelayMenuPos,
    rl2sRelayMenuPos,
    setRl2sRelayMenuPos,
    extMenuPos,
    setExtMenuPos,
    diMenuPos,
    setDiMenuPos,
    busMenuPos,
    setBusMenuPos,
    extOneWireMenuPos,
    setExtOneWireMenuPos,
    io4ChannelMenuPos,
    setIo4ChannelMenuPos,
    di6ChannelMenuPos,
    setDi6ChannelMenuPos,
    controllerDiMenuPos,
    setControllerDiMenuPos,
    addOneWireDeviceAtSlot,
    normalizePowerModuleType,
    getControllerType,
    getSmart2DiPortUsage,
    addRelayDeviceFromMenu,
    canAddDoubleRelayToControllerRelay,
    canAddDoubleRelayToExtModule,
    canAddDoubleRelayToDiModule,
    getControllerLineDevices,
    getRelaySPreferredDevices,
    addRl2sRelayDeviceFromMenu,
    wifiLineMenus,
    isExtModuleAllowedForController,
    controllerType,
    addExtModuleAtSlot,
    addDiModuleAtSlot,
    setBusDeviceAtLine,
    addExtOneWireDeviceAtSlot,
    addIo4ChannelDevice,
    addDi6ChannelDevice,
    addControllerDiDeviceFromMenu,
}) => (
    <>
        {slotMenuPos && <SlotContextMenu
            position={slotMenuPos}
            onClose={() => setSlotMenuPos(null)}
        >
            <div
                className="ctx-menu-item"
                onClick={() => {
                    setScheme((s) => ({
                        ...s,
                        wireless_devices: [
                            ...s.wireless_devices.slice(0, slotMenuPos.slotIndex),
                            { id: Date.now(), type: 'outdoor-temperature-sensor', additions: [] },
                            ...s.wireless_devices.slice(slotMenuPos.slotIndex),
                        ],
                    }));
                    setSlotMenuPos(null);
                }}
            >
                Беспроводной уличный датчик температуры
            </div>
            <div
                className="ctx-menu-item"
                onClick={() => {
                    setScheme((s) => ({
                        ...s,
                        wireless_devices: [
                            ...s.wireless_devices.slice(0, slotMenuPos.slotIndex),
                            { id: Date.now(), type: 'wall-temperature-sensor', additions: [] },
                            ...s.wireless_devices.slice(slotMenuPos.slotIndex),
                        ],
                    }));
                    setSlotMenuPos(null);
                }}
            >
                Беспроводной настенный датчик
            </div>
            <div
                className="ctx-menu-item"
                onClick={() => {
                    setScheme((s) => ({
                        ...s,
                        wireless_devices: [
                            ...s.wireless_devices.slice(0, slotMenuPos.slotIndex),
                            {
                                id: Date.now(),
                                type: 'thermostat',
                                color: 'black',
                                additions: [],
                            },
                            ...s.wireless_devices.slice(slotMenuPos.slotIndex),
                        ],
                    }));
                    setSlotMenuPos(null);
                }}
            >
                Беспроводной термостат
            </div>
        </SlotContextMenu>}
        {thermostatMenuPos && <SlotContextMenu
            position={thermostatMenuPos}
            onClose={() => setThermostatMenuPos(null)}
        >
            <div
                className="ctx-menu-item"
                onClick={() => {
                    setScheme((s) => ({
                        ...s,
                        wireless_devices: s.wireless_devices.map((wirelessDevice, deviceIndex) => (
                            deviceIndex === thermostatMenuPos.deviceIndex
                                ? {
                                    ...wirelessDevice,
                                    additions: [{ id: Date.now(), type: 'floor-sensor' }],
                                }
                                : wirelessDevice
                        )),
                    }));
                    setThermostatMenuPos(null);
                }}
            >
                Датчик пола
            </div>
        </SlotContextMenu>}
        {oneWireMenuPos && <SlotContextMenu
            position={oneWireMenuPos}
            onClose={() => setOneWireMenuPos(null)}
        >
            <div
                className="ctx-menu-item"
                onClick={() => addOneWireDeviceAtSlot({
                    id: Date.now(),
                    type: 'thermostat',
                    connection_type: '1-wire',
                    color: 'black',
                    additions: [],
                })}
            >
                Проводной термостат
            </div>
            <div
                className="ctx-menu-item"
                onClick={() => addOneWireDeviceAtSlot({
                    id: Date.now(),
                    device_type: 'sensor',
                    type: 'flask-sensor-temperature',
                    connection_type: '1-wire',
                    additions: [],
                })}
            >
                Датчик температуры в колбе проводной
            </div>
            <div
                className="ctx-menu-item"
                onClick={() => addOneWireDeviceAtSlot({
                    id: Date.now(),
                    device_type: 'sensor',
                    type: 'wall-digital-sensor',
                    connection_type: '1-wire',
                })}
            >
                Настенный проводной датчик
            </div>
            <div
                className="ctx-menu-item"
                onClick={() => addOneWireDeviceAtSlot({
                    id: Date.now(),
                    type: 'ntc-1-wire',
                    connection_type: '1-wire',
                })}
            >
                Модуль NTC-1-wire
            </div>
            <div
                className="ctx-menu-item"
                onClick={() => addOneWireDeviceAtSlot({
                    id: Date.now(),
                    type: 'rdt2',
                    connection_type: '1-wire',
                })}
            >
                Модуль RDT2
            </div>
        </SlotContextMenu>}
        {powerMenuPos && <SlotContextMenu
            position={powerMenuPos}
            onClose={() => setPowerMenuPos(null)}
        >
            <div
                className="ctx-menu-item"
                onClick={() => {
                    setScheme((s) => {
                        const current = Array.isArray(s.power_modules) ? s.power_modules : [];
                        const normalized = current.map((item) => normalizePowerModuleType(
                            typeof item === 'string' ? item : item?.type
                        ));
                        if (normalized.includes('ups')) return s;
                        if (getControllerType(s) === 'smart2' && getSmart2DiPortUsage(s).free < 2) return s;
                        return { ...s, power_modules: [...current, 'ups'] };
                    });
                    setPowerMenuPos(null);
                }}
            >
                ИБП (UPS)
            </div>
        </SlotContextMenu>}
        {relayMenuPos && <SlotContextMenu
            position={relayMenuPos}
            onClose={() => setRelayMenuPos(null)}
        >
            {(() => {
                const isEcosmartRelayBoilerSlot = getControllerType(scheme) === 'ecosmart'
                    && !relayMenuPos.lineKey
                    && relayMenuPos.slotIndex === 0;
                if (isEcosmartRelayBoilerSlot) return null;
                return relayMenuPos.lineKey !== 'relay_s_devices' && (
                    <>
                        <div
                            className="ctx-menu-item"
                            onClick={() => addRelayDeviceFromMenu('otherEquipment')}
                        >
                            Прочее оборудование
                        </div>
                        {(() => {
                            if (getControllerType(scheme) === 'smart2'
                                && relayMenuPos.moduleGroup !== 'di'
                                && (relayMenuPos.lineKey || 'relay_devices') === 'relay_devices') return false;
                            if (getControllerType(scheme) === 'pro'
                                && relayMenuPos.moduleGroup == null
                                && !Number.isInteger(relayMenuPos.moduleIndex)
                                && (relayMenuPos.lineKey || 'relay_devices') === 'relay_devices') return canAddDoubleRelayToControllerRelay(scheme, relayMenuPos.slotIndex);
                            if (Number.isInteger(relayMenuPos.moduleIndex) && relayMenuPos.moduleGroup !== 'di') return canAddDoubleRelayToExtModule(scheme, relayMenuPos.moduleIndex, 'relay_devices', relayMenuPos.relaySlotIndex);
                            if (relayMenuPos.moduleGroup !== 'di') return true;
                            const moduleItem = Array.isArray(scheme?.di_modules) ? scheme.di_modules[relayMenuPos.moduleIndex] : null;
                            return canAddDoubleRelayToDiModule(moduleItem, 'relay_devices');
                        })() && (
                            <div
                                className="ctx-menu-item"
                                onClick={() => addRelayDeviceFromMenu('valve')}
                            >
                                Запорный клапан
                            </div>
                        )}
                    </>
                );
            })()}
            {relayMenuPos.lineKey !== 'relay_s_devices' && (
                <div
                    className="ctx-menu-item"
                    onClick={() => addRelayDeviceFromMenu('stupid')}
                >
                    Тупой котёл
                </div>
            )}
            {(() => {
                const isEcosmartRelayBoilerSlot = getControllerType(scheme) === 'ecosmart'
                    && !relayMenuPos.lineKey
                    && relayMenuPos.slotIndex === 0;
                if (isEcosmartRelayBoilerSlot) return null;
                return (
                    <>
                        <div
                            className="ctx-menu-item"
                            onClick={() => addRelayDeviceFromMenu('boiler-pump')}
                        >
                            Насос бойлера
                        </div>
                        <div
                            className="ctx-menu-item"
                            onClick={() => addRelayDeviceFromMenu('pump-220v')}
                        >
                            Насос 220V
                        </div>
                        <div
                            className="ctx-menu-item"
                            onClick={() => addRelayDeviceFromMenu('zoneServo')}
                        >
                            Сервопривод зоны
                        </div>
                        {relayMenuPos.lineKey === 'relay_s_devices' && (() => {
                            if (Number.isInteger(relayMenuPos.moduleIndex)) return canAddDoubleRelayToExtModule(scheme, relayMenuPos.moduleIndex, 'relay_s_devices', relayMenuPos.relaySlotIndex);
                            const slotIndex = relayMenuPos.slotIndex;
                            if (!Number.isInteger(slotIndex) || slotIndex % 2 !== 0) return false;
                            const controllerDevices = getControllerLineDevices(scheme, 'relay_s_devices', getRelaySPreferredDevices(scheme));
                            const occupancy = buildRelaySlotOccupancyPreserveIndexes(controllerDevices, 4, (relayDevice) => (String(relayDevice?.connection_type || '').toLowerCase() === 'double_relay' ? 2 : 1));
                            return slotIndex < 3 && !occupancy[slotIndex] && !occupancy[slotIndex + 1];
                        })() && (
                            <>
                                <div className="ctx-menu-sep" />
                                <div
                                    className="ctx-menu-item"
                                    onClick={() => addRelayDeviceFromMenu('220servo')}
                                >
                                    Сервопривод 220
                                </div>
                                {Number.isInteger(relayMenuPos.moduleIndex) && relayMenuPos.moduleGroup !== 'di' && (
                                    <div
                                        className="ctx-menu-item"
                                        onClick={() => addRelayDeviceFromMenu('valve')}
                                    >
                                        Запорный клапан
                                    </div>
                                )}
                            </>
                        )}
                    </>
                );
            })()}
        </SlotContextMenu>}
        {rl2sRelayMenuPos && <SlotContextMenu
            position={rl2sRelayMenuPos}
            onClose={() => setRl2sRelayMenuPos(null)}
        >
            <div
                className="ctx-menu-item"
                onClick={() => addRl2sRelayDeviceFromMenu('boiler-pump')}
            >
                Насос бойлера
            </div>
            <div
                className="ctx-menu-item"
                onClick={() => addRl2sRelayDeviceFromMenu('pump-220v')}
            >
                Насос 220V
            </div>
            <div
                className="ctx-menu-item"
                onClick={() => addRl2sRelayDeviceFromMenu('zoneServo')}
            >
                Сервопривод зоны
            </div>
            {(() => {
                const moduleItem = Array.isArray(scheme?.di_modules)
                    ? scheme.di_modules[rl2sRelayMenuPos.moduleIndex]
                    : null;
                return canAddDoubleRelayToDiModule(moduleItem, 'relay_s_devices');
            })() && (
                <>
                    <div
                        className="ctx-menu-item"
                        onClick={() => addRl2sRelayDeviceFromMenu('220servo')}
                    >
                        Сервопривод 220
                    </div>
                    <div
                        className="ctx-menu-item"
                        onClick={() => addRl2sRelayDeviceFromMenu('valve')}
                    >
                        Запорный клапан
                    </div>
                </>
            )}
        </SlotContextMenu>}
        {wifiLineMenus}
        {extMenuPos && <SlotContextMenu
            position={extMenuPos}
            onClose={() => setExtMenuPos(null)}
        >
            {isExtModuleAllowedForController('bl2', controllerType) && (
                <div
                    className="ctx-menu-item"
                    onClick={() => addExtModuleAtSlot('bl2', extMenuPos.slotIndex)}
                >
                    Модуль BL2
                </div>
            )}
            <div className="ctx-menu-item" onClick={() => addExtModuleAtSlot('rl6', extMenuPos.slotIndex)}>
                Модуль RL6
            </div>
            <div className="ctx-menu-item" onClick={() => addExtModuleAtSlot('rl6s', extMenuPos.slotIndex)}>
                Модуль RL6S
            </div>
            <div className="ctx-menu-item" onClick={() => addExtModuleAtSlot('io4', extMenuPos.slotIndex)}>
                Модуль IO4
            </div>
            <div className="ctx-menu-item" onClick={() => addExtModuleAtSlot('di6', extMenuPos.slotIndex)}>
                Модуль DI6
            </div>
        </SlotContextMenu>}
        {diMenuPos && <SlotContextMenu position={diMenuPos} onClose={() => setDiMenuPos(null)}>
            <div className="ctx-menu-item" onClick={() => addDiModuleAtSlot('rl2', diMenuPos.slotIndex)}>
                Модуль RL2
            </div>
            <div className="ctx-menu-item" onClick={() => addDiModuleAtSlot('rl2s', diMenuPos.slotIndex)}>
                Модуль RL2S
            </div>
        </SlotContextMenu>}
        {busMenuPos && <SlotContextMenu position={busMenuPos} onClose={() => setBusMenuPos(null)}>
            <div className="ctx-menu-item" onClick={() => setBusDeviceAtLine(busMenuPos.lineIndex, { type: 'boiler' })}>
                Котел
            </div>
        </SlotContextMenu>}
        {extOneWireMenuPos && <SlotContextMenu
            position={extOneWireMenuPos}
            onClose={() => setExtOneWireMenuPos(null)}
        >
            <div
                className="ctx-menu-item"
                onClick={() => addExtOneWireDeviceAtSlot(
                    extOneWireMenuPos.moduleIndex,
                    extOneWireMenuPos.slotIndex,
                    {
                        id: Date.now(),
                        type: 'thermostat',
                        connection_type: '1-wire',
                        color: 'black',
                        additions: [],
                    }
                )}
            >
                Проводной термостат
            </div>
            <div
                className="ctx-menu-item"
                onClick={() => addExtOneWireDeviceAtSlot(
                    extOneWireMenuPos.moduleIndex,
                    extOneWireMenuPos.slotIndex,
                    {
                        id: Date.now(),
                        device_type: 'sensor',
                        type: 'flask-sensor-temperature',
                        connection_type: '1-wire',
                        additions: [],
                    }
                )}
            >
                Датчик температуры в колбе проводной
            </div>
            <div
                className="ctx-menu-item"
                onClick={() => addExtOneWireDeviceAtSlot(
                    extOneWireMenuPos.moduleIndex,
                    extOneWireMenuPos.slotIndex,
                    {
                        id: Date.now(),
                        device_type: 'sensor',
                        type: 'wall-digital-sensor',
                        connection_type: '1-wire',
                    }
                )}
            >
                Настенный проводной датчик
            </div>
            <div
                className="ctx-menu-item"
                onClick={() => addExtOneWireDeviceAtSlot(
                    extOneWireMenuPos.moduleIndex,
                    extOneWireMenuPos.slotIndex,
                    { id: Date.now(), type: 'ntc-1-wire', connection_type: '1-wire' }
                )}
            >
                Модуль NTC-1-wire
            </div>
            <div
                className="ctx-menu-item"
                onClick={() => addExtOneWireDeviceAtSlot(
                    extOneWireMenuPos.moduleIndex,
                    extOneWireMenuPos.slotIndex,
                    { id: Date.now(), type: 'rdt2', connection_type: '1-wire' }
                )}
            >
                Модуль RDT2
            </div>
        </SlotContextMenu>}
        {io4ChannelMenuPos && <SlotContextMenu
            position={io4ChannelMenuPos}
            onClose={() => setIo4ChannelMenuPos(null)}
        >
            <div className="ctx-menu-item" onClick={() => addIo4ChannelDevice('discrete_pool')}>
                Дискретный бассейн
            </div>
            <div className="ctx-menu-item" onClick={() => addIo4ChannelDevice('discrete_fire_alarm')}>
                Дискретная пожарка
            </div>
            <div className="ctx-menu-item" onClick={() => addIo4ChannelDevice('discrete_signal')}>
                Дискретный сигнал
            </div>
            <div className="ctx-menu-item" onClick={() => addIo4ChannelDevice('discrete_ventilation')}>
                Дискретная вентиляция
            </div>
            <div className="ctx-menu-item" onClick={() => addIo4ChannelDevice('leak-sensor')}>
                Датчик протечки
            </div>
            <div className="ctx-menu-item" onClick={() => addIo4ChannelDevice('010pump')}>
                Насос 0-10V
            </div>
            <div className="ctx-menu-item" onClick={() => addIo4ChannelDevice('010servo')}>
                Сервопривод 0-10V
            </div>
            <div className="ctx-menu-item" onClick={() => addIo4ChannelDevice('pressure-sensor')}>
                Датчик давления
            </div>
            <div className="ctx-menu-item" onClick={() => addIo4ChannelDevice('ntc-sensor')}>
                NTC датчик
            </div>
        </SlotContextMenu>}
        {di6ChannelMenuPos && <SlotContextMenu
            position={di6ChannelMenuPos}
            onClose={() => setDi6ChannelMenuPos(null)}
        >
            <div className="ctx-menu-item" onClick={() => addDi6ChannelDevice('discrete_pool')}>
                Дискретный бассейн
            </div>
            <div className="ctx-menu-item" onClick={() => addDi6ChannelDevice('discrete_fire_alarm')}>
                Дискретная пожарка
            </div>
            <div className="ctx-menu-item" onClick={() => addDi6ChannelDevice('discrete_signal')}>
                Дискретный сигнал
            </div>
            <div className="ctx-menu-item" onClick={() => addDi6ChannelDevice('discrete_ventilation')}>
                Дискретная вентиляция
            </div>
            <div className="ctx-menu-item" onClick={() => addDi6ChannelDevice('leak-sensor')}>
                Датчик протечки
            </div>
        </SlotContextMenu>}
        {controllerDiMenuPos && <SlotContextMenu
            position={controllerDiMenuPos}
            onClose={() => setControllerDiMenuPos(null)}
        >
            <div className="ctx-menu-item" onClick={() => addControllerDiDeviceFromMenu('discrete_pool')}>
                Дискретный бассейн
            </div>
            <div className="ctx-menu-item" onClick={() => addControllerDiDeviceFromMenu('discrete_fire_alarm')}>
                Дискретная пожарка
            </div>
            <div className="ctx-menu-item" onClick={() => addControllerDiDeviceFromMenu('discrete_signal')}>
                Дискретный сигнал
            </div>
            <div className="ctx-menu-item" onClick={() => addControllerDiDeviceFromMenu('discrete_ventilation')}>
                Дискретная вентиляция
            </div>
            {!(controllerType === 'ecosmart' && controllerDiMenuPos.slotIndex === 0) && (
                <div className="ctx-menu-item" onClick={() => addControllerDiDeviceFromMenu('leak-sensor')}>
                    Датчик протечки
                </div>
            )}
        </SlotContextMenu>}
    </>
);

export default SlotContextMenus;
