import React from 'react';
import { Group, Image, Layer, Rect, Text } from 'react-konva';
import { Line, RealisticConnectionLines } from '../scheme/rendering/SharpLine';
import {
    AERIAL_HEIGHT,
    AERIAL_WIDTH,
    ADD_ACTION_FILL,
    ADD_ACTION_TEXT_FILL,
    EMPTY_SLOT_FILL,
    EMPTY_SLOT_STROKE,
    ECOSMART_LEAK_SENSOR_COLORS,
    INFO_BLOCK_FILL,
    INFO_BLOCK_FONT_SIZE,
    INFO_BLOCK_HEIGHT,
    INFO_BLOCK_STROKE,
    INFO_BLOCK_STROKE_WIDTH,
    INFO_BLOCK_TEXT_COLOR,
    ONE_WIRE_SLOT_SIZE,
    TRANSPARENT_FILL,
} from '../constants';
import {
    BUS_SLOT_SIZE,
    DI_SLOT_MIN_GAP_MULTIPLIER,
    DI_SLOT_SIZE,
    EXT_SLOT_MIN_GAP_MULTIPLIER,
    EXT_SLOT_SIZE,
    LEAK_DI_DEVICE_IMAGE_SCALE,
    NTC_LINE_SLOTS_COUNT,
    ONE_WIRE_SLOT_FAKE_PORTS,
    ONE_WIRE_THERMOSTAT_SIZE,
    RELAY_SLOT_SIZE,
    SERVO_SLOT_SIZE,
    THERMOSTAT_FLOOR_SLOT_GAP,
    THERMOSTAT_FLOOR_SLOT_SIZE,
    THERMOSTAT_IMAGE_SIZE,
    THERMOSTAT_SLOT_PADDING,
    VALVE_SLOT_HEIGHT,
    VALVE_SLOT_WIDTH,
} from '../scheme/layout/renderConstants';
import { WIRELESS_INFOBLOCK_HEIGHT } from '../scheme/layout/wirelessLineLayout';
import {
    getDiInputPort,
    getPortByNameOrClassToken,
    getPressureSensorPorts,
    getRelayInputPort,
    getRelayTerminalPort,
} from '../scheme/layout/ports';
import {
    buildRelaySlotOccupancyPreserveIndexes,
    removeRelayDeviceAtSlotFromLine,
} from '../scheme/domain/relaySlots';
import DeviceIndicator from './DeviceIndicator';
import KitBadge from './KitBadge';
import SlotDeleteButton from './SlotDeleteButton';
import PortDotCircle from './PortDotCircle';
import WifiLine from './WifiLine';
import OneWireLine from './OneWireLine';
import { DeviceInfoBlock as EditableInfoTitle } from './DeviceInfoBlock';

const Circle = PortDotCircle;

const SchemeCanvas = ({
    addController420PressureSensor,
    addControllerLeakSensorAtSlot,
    addControllerNtcLineSensorAtSlot,
    addEcosmartExtThermostatWithFloorSlot,
    addEcosmartPump,
    addEcosmartServo,
    addEcosmartValve,
    addExtThermostatFloorSensor,
    aerialImage,
    busDragStartOffsetsRef,
    busSlotOffsets,
    canonicalDeviceType,
    canvasSize,
    controller420DragStartOffsetRef,
    controller420SlotOffset,
    controllerImage,
    controllerType,
    diDragStartOffsetsRef,
    diSlotOffsets,
    dinSize,
    extBodyNodeRefs,
    extDragStartOffsetsRef,
    extOneWireDragStartOffsetsRef,
    extOneWireOffsets,
    extSlotOffsets,
    getAllOccupiedRects,
    getAnchoredOneWirePort,
    getAnchoredOneWirePortsForDisplay,
    getBusDevices,
    getBusLineCount,
    getConnectionTypes,
    getContainSize,
    getControllerBodyBottomY,
    getControllerLineDevices,
    getDeviceBaseTitle,
    getDeviceStoredTitle,
    getDi6PhysicalDevices,
    getDiDeviceTitle,
    getDiModules,
    getDiOffsetKey,
    getDiWiredDevices,
    getDoubleRelayDevices,
    getEcosmartBl2OverlayGeometry,
    getEcosmartFirstOneWireExtraDown,
    getExtDiLineCapacityByType,
    getExtOffsetKey,
    getExtOneWireOffsetKey,
    getFullWidthSize,
    getIo4OnlyWiredDevices,
    getLeakSensorDisplayIndex,
    getLeakZoneSensors,
    getModuleLineDevices,
    getModuleObjectCollisionRects,
    getModuleObjectFootprint,
    getMorphImageKey,
    getNtcChannelBySlot,
    getNtcSensorFromDeviceLine,
    getNtcSensorTitle,
    getNtcSensorsFromScheme,
    getOneWireBendY,
    getOneWireDeviceTitle,
    getOneWireDirectionForDevice,
    getOneWireLineGeometry,
    getOneWireOffsetKey,
    getOneWirePortByRole,
    getOneWireSlotPosition,
    getOrthogonalLinkPoints,
    getPortPosition,
    getPortsByClassToken,
    getPressureSensorFromScheme,
    getPressureSensorsFromScheme,
    getProAuxLineOccupancy,
    getRelayDevicesForController,
    getRelayLineConfig,
    getRelayLinkPointsFromDevice,
    getRelayLinkPointsToDevice,
    getRelaySAssignedDevices,
    getRelaySLineConfig,
    getRelaySPreferredDevices,
    getRinnaiBusSlotYOffset,
    getRl6RelayTerminalNames,
    getRuntimeOffsetKey,
    getSmart2DiModuleExtraSpacing,
    getSmart2DiPortUsage,
    getWifiCapacity,
    getWifiOffsetKey,
    getWirelessDeviceImageKey,
    getWirelessDeviceKey,
    getWirelessDeviceTitle,
    getWirelessInfoBlockY,
    getWirelessLineLift,
    getWirelessLineTop,
    getWirelessSlotHeight,
    getWirelessSlotWidth,
    getWirelessSlotX,
    getWirelessSlotYByIndex,
    goAerialImage,
    hasCollisionFor,
    hasExtThermostatFloorSensor,
    hoveredBusLineIndex,
    hoveredExtOneWireKey,
    hoveredExtSlotIndex,
    hoveredNtcSlotKey,
    hoveredOneWireSlotIndex,
    hoveredRelaySlotIndex,
    hoveredWifiOneWireSlotKey,
    hoveredWifiSlotKey,
    hoveredWirelessDeviceKey,
    indentSize,
    invalidDiDragMap,
    invalidExtDragMap,
    invalidExtOneWireDragMap,
    invalidOneWireDragMap,
    invalidWifiDragMap,
    isBundledSensorDevice,
    isControllerOnlyScheme,
    isDiscreteDiDeviceType,
    isDoubleRelaySignalPort,
    isFlaskSensorType,
    isLeakDiDeviceType,
    isLeakLoop,
    isOtherEquipmentType,
    isRelayBoilerType,
    isSameDevice,
    isStupidBoilerType,
    isThermostatFloorSensorAddition,
    memoBalancedOneWire,
    memoBundledSensorDevices,
    memoExtLineThermostatDevices,
    memoExtModules,
    memoOneWireDevices,
    memoWifiModules,
    memoWirelessDevices,
    memoWirelessOffsetsByLine,
    memoWirelessPlusSlotX,
    memoWirelessSlotX,
    moduleCollisionNodeRefs,
    moduleHeightValue,
    normalizePowerModuleType,
    oneWireDragDraftOffsetsRef,
    oneWireDragFrameRef,
    oneWireDragNodeRefs,
    oneWireDragStartOffsetsRef,
    oneWireDragStartPointerRef,
    oneWireSlotOffsets,
    patchControllerLine,
    ports,
    rectsOverlap,
    relayDragStartOffsetsRef,
    relaySlotOffsets,
    removeBusDeviceAtLine,
    removeController420PressureSensor,
    removeControllerDiDeviceAtSlot,
    removeControllerLeakSensorAtSlot,
    removeControllerNtcLineSensorAtSlot,
    removeControllerRelaySDevice,
    removeDi6ChannelDeviceAtSlot,
    removeDiModuleAtSlot,
    removeDiModuleRelayDeviceAtSlot,
    removeEcosmartPump,
    removeEcosmartServo,
    removeEcosmartValve,
    removeExtModuleAtSlot,
    removeExtModuleRelayDeviceAtSlot,
    removeExtNtcSensorAtSlot,
    removeExtOneWireDeviceAtSlot,
    removeExtThermostatAtSlot,
    removeIo4ChannelDeviceAtSlot,
    removeOneWireDeviceAtSlot,
    removeOneWireNtcSensorAtSlot,
    removeWifiModuleAtSlot,
    removeWifiModuleRelayDeviceAtSlot,
    removeWifiOneWireDeviceAtSlot,
    renderedProExtRight,
    scheme,
    setBusMenuPos,
    setBusSlotOffsets,
    setController420SlotOffset,
    setControllerDiMenuPos,
    setDi6ChannelMenuPos,
    setDiMenuPos,
    setDiSlotOffsets,
    setExtMenuPos,
    setExtOneWireMenuPos,
    setExtOneWireOffsets,
    setExtSlotOffsets,
    setHoveredBusLineIndex,
    setHoveredExtOneWireKey,
    setHoveredExtSlotIndex,
    setHoveredNtcSlotKey,
    setHoveredOneWireSlotIndex,
    setHoveredRelaySlotIndex,
    setHoveredWifiOneWireSlotKey,
    setHoveredWifiSlotKey,
    setHoveredWirelessDeviceKey,
    setInvalidDiDragMap,
    setInvalidExtDragMap,
    setInvalidExtOneWireDragMap,
    setInvalidOneWireDragMap,
    setInvalidWifiDragMap,
    setIo4ChannelMenuPos,
    setNtcSlotMenuPos,
    setOneWireMenuPos,
    setOneWireSlotOffsets,
    setPowerMenuPos,
    setRelayMenuPos,
    setRelaySlotOffsets,
    setRl2sRelayMenuPos,
    setScheme,
    setSlotMenuPos,
    setThermostatMenuPos,
    setWifiMenuPos,
    setWifiOneWireMenuPos,
    setWifiOneWireSlotOffsets,
    setWifiSlotOffsets,
    shouldShowDiDeviceInfoBlock,
    showEmptySlots,
    showLineFrames,
    showPorts,
    snapToGrid,
    useInitialOneWireBalance,
    usesRinnaiAdapter,
    wifiDragStartOffsetsRef,
    wifiLineEnabled,
    wifiOneWireSlotOffsets,
    wifiSlotOffsets,
    wirelessImages,
    wirelessPortsByType,
}) => (
<RealisticConnectionLines>
                    <Layer>
                        {controllerImage && (
                            (() => {
                                const initialX = canvasSize.width / 2 - controllerImage.width / 2;
                                const initialY = canvasSize.height / 2 - controllerImage.height / 2;
                                const topOverlayHeight = controllerType === 'ecosmart'
                                    ? Math.max(RELAY_SLOT_SIZE + 4 * indentSize, 21 * indentSize)
                                    : 0;
                                const safeInitialY = topOverlayHeight > 0
                                    ? Math.max(initialY, topOverlayHeight + 2 * indentSize)
                                    : initialY;
                                const snappedInitialX = Math.round(initialX / indentSize) * indentSize;
                                const snappedInitialY = Math.round(safeInitialY / indentSize) * indentSize;
                                return (
                            <Group
                                x={snappedInitialX}
                                y={snappedInitialY}
                                draggable
                                onDragEnd={(event) => {
                                    const node = event.target;
                                    const snappedX = Math.round(node.x() / indentSize) * indentSize;
                                    const snappedY = Math.round(node.y() / indentSize) * indentSize;
                                    node.position({ x: snappedX, y: snappedY });
                                    node.getLayer()?.batchDraw();
                                }}
                            >
                                <Image
                                    name="morph:controller"
                                    image={controllerImage}
                                />
                                {(() => {
                                    if (controllerType !== 'ecosmart') return null;
                                    const ecosmartBl2Modules = Array.isArray(scheme?.controller?.ecosmart_bl2)
                                        ? scheme.controller.ecosmart_bl2
                                        : [];
                                    if (ecosmartBl2Modules.length === 0) return null;

                                    const ecosmartBl2Image = wirelessImages.ecosmartbl2 || null;
                                    const ecosmartBl2Ports = wirelessPortsByType.ecosmartbl2 || [];
                                    if (!ecosmartBl2Image?.width || !ecosmartBl2Image?.height) return null;

                                    const geometry = getEcosmartBl2OverlayGeometry({
                                        controllerWidth: controllerImage.width,
                                        controllerHeight: controllerImage.height,
                                        controllerPorts: ports,
                                        modulePorts: ecosmartBl2Ports,
                                    });
                                    if (!geometry) return null;

                                    return (
                                        <Image
                                            name={`morph:${getMorphImageKey(ecosmartBl2Modules[0])}`}
                                            image={ecosmartBl2Image}
                                            {...geometry}
                                            shadowColor="blue"
                                            shadowBlur={5}
                                            draggable
                                            onDragEnd={(event) => {
                                                event.target.position({ x: geometry.x, y: geometry.y });
                                                event.target.getLayer()?.batchDraw();
                                            }}
                                        />
                                    );
                                })()}
                                {(() => {
                                    if ((controllerType !== 'go' && controllerType !== 'go+') || !goAerialImage) return null;
                                    const width = goAerialImage.width || AERIAL_WIDTH;
                                    const height = goAerialImage.height || AERIAL_HEIGHT;
                                    return (
                                        <Image
                                            image={goAerialImage}
                                            x={controllerImage.width - 5 * indentSize - width}
                                            y={-height}
                                            width={width}
                                            height={height}
                                            listening={false}
                                        />
                                    );
                                })()}
                                {(() => {
                                    const supportsAerial = controllerType === 'smart2' || controllerType === 'pro';
                                    if (!supportsAerial || !aerialImage) return null;
                                    const aerialPorts = getPortsByClassToken(ports, 'AERIAL');
                                    if (!aerialPorts) return null;
                                    return aerialPorts.map((aerialPort, idx) => {
                                        const x = aerialPort.x * controllerImage.width;
                                        const centerY = aerialPort.y * controllerImage.height;
                                        const portHeight = (aerialPort.height || 0) * controllerImage.height;
                                        const portTopY = centerY - portHeight / 2;
                                        const width = aerialImage.width || AERIAL_WIDTH;
                                        const height = aerialImage.height || AERIAL_HEIGHT;
                                        return (
                                            <Image
                                                key={`controller-aerial-${idx}`}
                                                image={aerialImage}
                                                x={x - width / 2}
                                                y={portTopY - height}
                                                width={width}
                                                height={height}
                                                listening={false}
                                            />
                                        );
                                    });
                                })()}
                                {(() => {
                                    if (controllerType !== 'pro') return null;
                                    const relayLines = getRelayLineConfig('pro', ports);
                                    if (relayLines.length === 0) return null;
                                    const relaySAssignedDevices = getRelaySAssignedDevices(scheme, getRelaySLineConfig('pro', ports).length || 4);
                                    const controllerRelayDevices = getRelayDevicesForController(scheme);
                                    const relaySOverflowToRelay = getControllerLineDevices(scheme, 'relay_s_devices', getRelaySPreferredDevices(scheme))
                                        .filter((device) => {
                                            if (relaySAssignedDevices.some((item) => isSameDevice(item, device))) return false;
                                            if (controllerRelayDevices.some((item) => isSameDevice(item, device))) return false;
                                            const connectionTypes = getConnectionTypes(device);
                                            return connectionTypes.includes('relay') || connectionTypes.includes('double_relay');
                                        });
                                     const relayDevices = [
                                         ...controllerRelayDevices,
                                         ...relaySOverflowToRelay,
                                     ];
                                     const relayOccupancy = buildRelaySlotOccupancyPreserveIndexes(
                                         relayDevices,
                                         relayLines.length,
                                         (device) => (String(device?.connection_type || '').toLowerCase() === 'double_relay' ? 2 : 1),
                                     );
                                     return relayLines.map((relayLine, slotIndex) => {
                                         const indicatorPort = ports.find((port) => port.name === `RELAY-INDICATOR-${relayLine.index}`);
                                         if (!indicatorPort) return null;
                                         const isOccupied = !!relayOccupancy[slotIndex];
                                         return (
                                            <DeviceIndicator
                                                key={`relay-indicator-${relayLine.index}`}
                                                port={indicatorPort}
                                                imageWidth={controllerImage.width}
                                                imageHeight={controllerImage.height}
                                                active={isOccupied}
                                            />
                                        );
                                    });
                                })()}
                                {(() => {
                                    if (controllerType !== 'pro') return null;
                                    const relaySLines = getRelaySLineConfig('pro', ports);
                                    if (relaySLines.length === 0) return null;
                                    const relaySDevices = getControllerLineDevices(scheme, 'relay_s_devices', getRelaySPreferredDevices(scheme));
                                    const relaySOccupancy = buildRelaySlotOccupancyPreserveIndexes(
                                        relaySDevices,
                                        relaySLines.length,
                                        (device) => (String(device?.connection_type || '').toLowerCase() === 'double_relay' ? 2 : 1),
                                    );
                                    return relaySLines.map((relayLine, slotIndex) => {
                                        const indicatorPort = ports.find((port) => port.name === `RELAY-S-INDICATOR-${relayLine.index}`);
                                        if (!indicatorPort) return null;
                                        const isOccupied = !!relaySOccupancy[slotIndex];
                                         return (
                                             <DeviceIndicator
                                                 key={`relay-s-indicator-${relayLine.index}`}
                                                 port={indicatorPort}
                                                 imageWidth={controllerImage.width}
                                                 imageHeight={controllerImage.height}
                                                 active={isOccupied}
                                             />
                                        );
                                    });
                                })()}
                                {(() => {
                                    const alwaysOnIndicators = ['POWER-INDICATOR', 'NETWORK-INDICATOR', 'WI-FI-INDICATOR'];
                                    return alwaysOnIndicators.flatMap((indicatorName) => ports
                                        .filter((port) => String(port?.name || '').toUpperCase() === indicatorName)
                                        .map((indicatorPort, index) => {
                                             return (
                                                 <DeviceIndicator
                                                     key={`always-on-indicator-${indicatorName}-${index}`}
                                                     port={indicatorPort}
                                                     imageWidth={controllerImage.width}
                                                     imageHeight={controllerImage.height}
                                                     active
                                                 />
                                            );
                                        }));
                                })()}
                                {(() => {
                                    if (controllerType !== 'ecosmart') return null;
                                    const indicatorPort = ports.find((port) => String(port?.name || '').toUpperCase() === 'BOILER-RELAY-INDICATOR');
                                    if (!indicatorPort) return null;
                                    const active = Boolean(getControllerLineDevices(scheme, 'relay_devices')[0]);
                                    return (
                                        <DeviceIndicator
                                            key="ecosmart-boiler-relay-indicator"
                                            port={indicatorPort}
                                            imageWidth={controllerImage.width}
                                            imageHeight={controllerImage.height}
                                            active={active}
                                        />
                                    );
                                })()}
                                {(() => {
                                    if (controllerType !== 'ecosmart') return null;
                                    const indicatorPort = ports.find((port) => String(port?.name || '').toUpperCase() === 'VALVE-INDICATOR');
                                    if (!indicatorPort) return null;
                                    const active = Boolean(getControllerLineDevices(scheme, 'relay_s_valve_devices')[0]);
                                    return (
                                        <DeviceIndicator
                                            key="ecosmart-valve-indicator"
                                            port={indicatorPort}
                                            imageWidth={controllerImage.width}
                                            imageHeight={controllerImage.height}
                                            active={active}
                                        />
                                    );
                                })()}
                                {(() => {
                                    if (controllerType !== 'ecosmart') return null;
                                    const indicatorPort = ports.find((port) => String(port?.name || '').toUpperCase() === 'BOILER-GVS-INDICATOR');
                                    if (!indicatorPort) return null;
                                    const active = Boolean(getControllerLineDevices(scheme, 'relay_boiler_gvs_devices')[0]);
                                    return (
                                        <DeviceIndicator
                                            key="ecosmart-boiler-gvs-indicator"
                                            port={indicatorPort}
                                            imageWidth={controllerImage.width}
                                            imageHeight={controllerImage.height}
                                            active={active}
                                        />
                                    );
                                })()}
                                {(() => {
                                    if (controllerType !== 'ecosmart') return null;
                                    const active = Boolean(getControllerLineDevices(scheme, '220_servo_devices')[0]);
                                    return ['MIXING-INDICATOR-1', 'MIXING-INDICATOR-2'].map((indicatorName) => {
                                        const indicatorPort = ports.find((port) => String(port?.name || '').toUpperCase() === indicatorName);
                                        if (!indicatorPort) return null;
                                        return (
                                            <DeviceIndicator
                                                key={`ecosmart-${indicatorName.toLowerCase()}`}
                                                port={indicatorPort}
                                                imageWidth={controllerImage.width}
                                                imageHeight={controllerImage.height}
                                                active={active}
                                            />
                                        );
                                    });
                                })()}
                                {(() => {
                                    if (controllerType !== 'ecosmart') return null;
                                    const indicatorPort = ports.find((port) => String(port?.name || '').toUpperCase() === 'MIXING-PUMP-INDICATOR');
                                    if (!indicatorPort) return null;
                                    const active = Boolean(getControllerLineDevices(scheme, 'relay_220pump5_devices')[0]);
                                    return (
                                        <DeviceIndicator
                                            key="ecosmart-mixing-pump-indicator"
                                            port={indicatorPort}
                                            imageWidth={controllerImage.width}
                                            imageHeight={controllerImage.height}
                                            active={active}
                                        />
                                    );
                                })()}
                                {(() => {
                                    if (controllerType !== 'ecosmart') return null;
                                    const indicatorPort = ports.find((port) => String(port?.name || '').toUpperCase() === 'CIRCUIT-PUMP-INDICATOR');
                                    if (!indicatorPort) return null;
                                    const active = Boolean(getControllerLineDevices(scheme, 'relay_220pump_devices')[0]);
                                    return (
                                        <DeviceIndicator
                                            key="ecosmart-circuit-pump-indicator"
                                            port={indicatorPort}
                                            imageWidth={controllerImage.width}
                                            imageHeight={controllerImage.height}
                                            active={active}
                                        />
                                    );
                                })()}
                                {(() => {
                                    if (controllerType !== 'ecosmart') return null;
                                    const active = Boolean(getControllerLineDevices(scheme, '220_servo_devices')[1]);
                                    return ['MIXING-INDICATOR-3', 'MIXING-INDICATOR-4'].map((indicatorName) => {
                                        const indicatorPort = ports.find((port) => String(port?.name || '').toUpperCase() === indicatorName);
                                        if (!indicatorPort) return null;
                                        return (
                                            <DeviceIndicator
                                                key={`ecosmart-${indicatorName.toLowerCase()}`}
                                                port={indicatorPort}
                                                imageWidth={controllerImage.width}
                                                imageHeight={controllerImage.height}
                                                active={active}
                                            />
                                        );
                                    });
                                })()}
                                {(() => {
                                    if (controllerType !== 'ecosmart') return null;
                                    const indicatorPort = ports.find((port) => String(port?.name || '').toUpperCase() === 'MIXING-PUMP-INDICATOR-2');
                                    if (!indicatorPort) return null;
                                    const active = Boolean(getControllerLineDevices(scheme, 'relay_220pump3_devices')[0]);
                                    return (
                                        <DeviceIndicator
                                            key="ecosmart-mixing-pump-indicator-2"
                                            port={indicatorPort}
                                            imageWidth={controllerImage.width}
                                            imageHeight={controllerImage.height}
                                            active={active}
                                        />
                                    );
                                })()}
                                {(() => {
                                    if (controllerType !== 'smart2') return null;
                                    const indicatorPort = ports.find((port) => String(port?.name || '').toUpperCase() === 'BUS-INDICATOR');
                                    if (!indicatorPort) return null;
                                    const active = getBusDevices(scheme).length > 0;
                                    return (
                                        <DeviceIndicator
                                            key="smart2-bus-indicator"
                                            port={indicatorPort}
                                            imageWidth={controllerImage.width}
                                            imageHeight={controllerImage.height}
                                            active={active}
                                        />
                                    );
                                })()}
                                {(() => {
                                    if (controllerType !== 'go' && controllerType !== 'go+') return null;
                                    const busDevices = getBusDevices(scheme);
                                    const indicators = [
                                        { name: 'WI-FI-INDICATOR', active: true },
                                        { name: 'BUS-INDICATOR', active: busDevices.length > 0 },
                                    ];
                                    return indicators.map((indicator) => {
                                        const indicatorPort = ports.find((port) => String(port?.name || '').toUpperCase() === indicator.name);
                                        if (!indicatorPort) return null;
                                        return (
                                            <DeviceIndicator
                                                key={`go-indicator-${indicator.name}`}
                                                port={indicatorPort}
                                                imageWidth={controllerImage.width}
                                                imageHeight={controllerImage.height}
                                                active={indicator.active}
                                            />
                                        );
                                    });
                                })()}
                                {showPorts && ports.map((port) => (
                                    <Circle
                                        key={port.name}
                                        x={port.x * controllerImage.width}
                                        y={port.y * controllerImage.height}
                                        radius={3}
                                        fill="red"


                                    />
                                ))}
                                {(() => {
                                    if (controllerType !== 'pro') return null;
                                    const { modbusOccupied } = getProAuxLineOccupancy(scheme);
                                    if (!modbusOccupied && !showEmptySlots) return null;

                                    const modbusAPort = getPortPosition(ports, 'MODBUS-A', 0, 0, controllerImage.width, controllerImage.height);
                                    const modbusBPort = getPortPosition(ports, 'MODBUS-B', 0, 0, controllerImage.width, controllerImage.height);
                                    if (!modbusAPort || !modbusBPort) return null;

                                    const slotWidth = 8 * indentSize;
                                    const slotHeight = 4 * indentSize;
                                    const slotX = controllerImage.width - slotWidth;
                                    const slotY = controllerImage.height + 8 * indentSize;
                                    const targetAX = slotX;
                                    const targetAY = slotY + slotHeight * 0.35;
                                    const targetBX = slotX;
                                    const targetBY = slotY + slotHeight * 0.65;

                                    return (
                                        <Group>
                                                    <Line
                                                        points={[modbusAPort.x, modbusAPort.y, modbusAPort.x, targetBY, targetBX, targetBY]}
                                                        stroke="#212121"
                                                        strokeWidth={1}
                                                        lineCap="round"
                                                        lineJoin="round"
                                                        listening={false}
                                                    />
                                                    <Line
                                                        points={[modbusBPort.x, modbusBPort.y, modbusBPort.x, targetAY, targetAX, targetAY]}
                                                        stroke="#212121"
                                                        strokeWidth={1}
                                                        lineCap="round"
                                                        lineJoin="round"
                                                        listening={false}
                                                    />
                                            <Rect
                                                name="device-preview-slot-body"
                                                x={slotX}
                                                y={slotY}
                                                width={slotWidth}
                                                height={slotHeight}
                                                cornerRadius={6}
                                                fill={EMPTY_SLOT_FILL}
                                                stroke={EMPTY_SLOT_STROKE}
                                                strokeWidth={1.2}
                                            />
                                                        {showPorts && (
                                                            <>
                                                                <Circle x={targetAX} y={targetAY} radius={2.5} fill="red" listening={false} />
                                                                <Circle x={targetBX} y={targetBY} radius={2.5} fill="red" listening={false} />
                                                            </>
                                                        )}
                                        </Group>
                                    );
                                })()}
                                {(() => {
                                    if (controllerType !== 'pro') return null;

                                    const diIn1Port = getPortPosition(ports, 'DI-IN-1', 0, 0, controllerImage.width, controllerImage.height);
                                    const diIn2Port = getPortPosition(ports, 'DI-IN-2', 0, 0, controllerImage.width, controllerImage.height);
                                    if (!diIn1Port || !diIn2Port) return null;

                                    const modbusSlotWidth = 8 * indentSize;
                                    const modbusSlotHeight = 4 * indentSize;
                                    const modbusSlotX = controllerImage.width - modbusSlotWidth;
                                    const modbusSlotY = controllerImage.height + 8 * indentSize;

                                    const diSlotWidth = 9 * indentSize;
                                    const diSlotHeight = 3 * indentSize;
                                    const diSlotX = controllerImage.width - diSlotWidth;
                                    const diTopGap = 3 * indentSize;
                                    const diSlot1Y = modbusSlotY + modbusSlotHeight + diTopGap;
                                    const diSlot2Y = diSlot1Y + diSlotHeight + 3 * indentSize;

                                    const diSlot1TargetX = diSlotX;
                                    const diSlot1TargetY = diSlot1Y + diSlotHeight / 2;
                                    const diSlot2TargetX = diSlotX;
                                    const diSlot2TargetY = diSlot2Y + diSlotHeight / 2;

                                    const normalizedPowerModules = Array.isArray(scheme.power_modules)
                                        ? scheme.power_modules
                                            .map((item) => normalizePowerModuleType(typeof item === 'string' ? item : item?.type))
                                            .filter(Boolean)
                                        : [];
                                    const hasUpsInPower = normalizedPowerModules.includes('ups');
                                     const proDiDevices = hasUpsInPower
                                         ? []
                                         : getControllerLineDevices(scheme, 'di_devices')
                                            .slice(0, 2)
                                            .map((device) => (device ? {
                                                ...device,
                                                type: canonicalDeviceType(device?.type),
                                            } : null));
                                     const isDiIn1Occupied = hasUpsInPower || Boolean(proDiDevices[0]);
                                     const isDiIn2Occupied = hasUpsInPower || Boolean(proDiDevices[1]);

                                    return (
                                        <Group>
                                            {!isDiIn1Occupied && showEmptySlots && (
                                                <>
                                                    <Line
                                                        points={[diIn1Port.x, diIn1Port.y, diIn1Port.x, diSlot2TargetY, diSlot2TargetX, diSlot2TargetY]}
                                                        stroke="#1565c0"
                                                        strokeWidth={1}
                                                        lineCap="round"
                                                        lineJoin="round"
                                                        listening={false}
                                                    />
                                                     <Rect
                                                         x={diSlotX}
                                                         y={diSlot2Y}
                                                         width={diSlotWidth}
                                                         height={diSlotHeight}
                                                        cornerRadius={6}
                                                        fill={EMPTY_SLOT_FILL}
                                                         stroke={EMPTY_SLOT_STROKE}
                                                         strokeWidth={1.2}
                                                     />
                                                     <Circle
                                                         x={diSlotX + diSlotWidth / 2}
                                                         y={diSlot2Y + diSlotHeight / 2}
                                                         radius={10}
                                                         fill={ADD_ACTION_FILL}
                                                         onClick={(e) => {
                                                             const pos = e.target.getAbsolutePosition();
                                                             setControllerDiMenuPos({ x: pos.x, y: pos.y, slotIndex: 0 });
                                                         }}
                                                         onTap={(e) => {
                                                             const pos = e.target.getAbsolutePosition();
                                                             setControllerDiMenuPos({ x: pos.x, y: pos.y, slotIndex: 0 });
                                                         }}
                                                     />
                                                     <Text
                                                         x={diSlotX + diSlotWidth / 2}
                                                         y={diSlot2Y + diSlotHeight / 2}
                                                         text="+"
                                                         fontSize={15}
                                                         fill={ADD_ACTION_TEXT_FILL}
                                                         offsetX={4.5}
                                                         offsetY={6}
                                                         listening={false}
                                                     />
                                                 </>
                                             )}
                                            {!isDiIn2Occupied && showEmptySlots && (
                                                <>
                                                    <Line
                                                        points={[diIn2Port.x, diIn2Port.y, diIn2Port.x, diSlot1TargetY, diSlot1TargetX, diSlot1TargetY]}
                                                        stroke="#1565c0"
                                                        strokeWidth={1}
                                                        lineCap="round"
                                                        lineJoin="round"
                                                        listening={false}
                                                    />
                                                     <Rect
                                                         x={diSlotX}
                                                         y={diSlot1Y}
                                                         width={diSlotWidth}
                                                         height={diSlotHeight}
                                                        cornerRadius={6}
                                                        fill={EMPTY_SLOT_FILL}
                                                         stroke={EMPTY_SLOT_STROKE}
                                                         strokeWidth={1.2}
                                                     />
                                                     <Circle
                                                         x={diSlotX + diSlotWidth / 2}
                                                         y={diSlot1Y + diSlotHeight / 2}
                                                         radius={10}
                                                         fill={ADD_ACTION_FILL}
                                                         onClick={(e) => {
                                                             const pos = e.target.getAbsolutePosition();
                                                             setControllerDiMenuPos({ x: pos.x, y: pos.y, slotIndex: 1 });
                                                         }}
                                                         onTap={(e) => {
                                                             const pos = e.target.getAbsolutePosition();
                                                             setControllerDiMenuPos({ x: pos.x, y: pos.y, slotIndex: 1 });
                                                         }}
                                                     />
                                                     <Text
                                                         x={diSlotX + diSlotWidth / 2}
                                                         y={diSlot1Y + diSlotHeight / 2}
                                                         text="+"
                                                         fontSize={15}
                                                         fill={ADD_ACTION_TEXT_FILL}
                                                         offsetX={4.5}
                                                         offsetY={6}
                                                         listening={false}
                                                     />
                                                 </>
                                             )}
                                             {isDiIn1Occupied && proDiDevices[0] && (() => {
                                                 const device = proDiDevices[0];
                                                 const offsetKey = getRuntimeOffsetKey(device, 0, 'controller-di');
                                                 const offset = diSlotOffsets[offsetKey] || { x: 0, y: 0 };
                                                 const slotX = diSlotX + offset.x;
                                                 const slotY = diSlot2Y + offset.y;
                                                 const hoverKey = 'controller-di:0';
                                                const isHovered = hoveredNtcSlotKey === hoverKey;
                                                 const deviceType = canonicalDeviceType(device?.type);
                                                 const isLeakDevice = isLeakDiDeviceType(deviceType);
                                                 const visualDevice = isDiscreteDiDeviceType(deviceType) || isLeakDevice
                                                     ? { ...device, port_side: 'left' }
                                                     : device;
                                                 const imageKey = getWirelessDeviceImageKey(visualDevice);
                                                const image = imageKey ? wirelessImages[imageKey] : null;
                                                if (!image) return null;
                                                const portsForDevice = wirelessPortsByType[imageKey] || [];
                                                const diInputPort = getDiInputPort(portsForDevice);
                                                 const imageBoxWidth = isLeakDevice
                                                     ? diSlotWidth * LEAK_DI_DEVICE_IMAGE_SCALE
                                                     : diSlotWidth;
                                                 const imageBoxHeight = isLeakDevice
                                                     ? diSlotHeight * LEAK_DI_DEVICE_IMAGE_SCALE
                                                     : diSlotHeight;
                                                 const size = getContainSize(image, imageBoxWidth, imageBoxHeight);
                                                 const x = slotX + (diSlotWidth - size.width) / 2;
                                                 const y = slotY + (diSlotHeight - size.height) / 2;
                                                 const toX = diInputPort ? (x + diInputPort.x * size.width) : slotX;
                                                 const toY = diInputPort ? (y + diInputPort.y * size.height) : slotY + diSlotHeight / 2;
                                                 const diInfoTitle = getDiDeviceTitle(scheme, device);
                                                 const showDiInfoBlock = shouldShowDiDeviceInfoBlock(device);
                                                 return (
                                                     <Group
                                                         draggable
                                                         onDragStart={() => {
                                                             diDragStartOffsetsRef.current[offsetKey] = diSlotOffsets[offsetKey] || { x: 0, y: 0 };
                                                         }}
                                                         onDragMove={(event) => {
                                                             const delta = event.target.position();
                                                             const startOffset = diDragStartOffsetsRef.current[offsetKey] || { x: 0, y: 0 };
                                                             setDiSlotOffsets((prev) => ({
                                                                 ...prev,
                                                                 [offsetKey]: {
                                                                     x: startOffset.x + delta.x,
                                                                     y: startOffset.y + delta.y,
                                                                 },
                                                             }));
                                                             event.target.position({ x: 0, y: 0 });
                                                         }}
                                                         onDragEnd={(event) => {
                                                             delete diDragStartOffsetsRef.current[offsetKey];
                                                             event.target.position({ x: 0, y: 0 });
                                                         }}
                                                     >
                                                        <Line
                                                            points={[diIn1Port.x, diIn1Port.y, diIn1Port.x, toY, toX, toY]}
                                                            stroke="#1565c0"
                                                            strokeWidth={1}
                                                            lineCap="round"
                                                            lineJoin="round"
                                                            listening={false}
                                                         />
                                                          <Image image={image} x={x} y={y} width={size.width} height={size.height} listening={false} />
                                                          <Rect
                                                               x={isLeakDevice ? x : slotX}
                                                               y={isLeakDevice ? y : slotY}
                                                               width={isLeakDevice ? size.width : diSlotWidth}
                                                               height={isLeakDevice ? size.height : diSlotHeight}
                                                              cornerRadius={6}
                                                              fill={TRANSPARENT_FILL}
                                                              stroke={TRANSPARENT_FILL}
                                                              strokeWidth={1.2}
                                                              onMouseEnter={() => setHoveredNtcSlotKey(hoverKey)}
                                                              onMouseLeave={() => setHoveredNtcSlotKey((prev) => (prev === hoverKey ? null : prev))}
                                                          />
                                                          {showDiInfoBlock && (
                                                             <>
                                                                  <Rect x={slotX} y={slotY - (INFO_BLOCK_HEIGHT + 4)} width={diSlotWidth} height={INFO_BLOCK_HEIGHT} cornerRadius={1} fill={INFO_BLOCK_FILL} stroke={INFO_BLOCK_STROKE} strokeWidth={INFO_BLOCK_STROKE_WIDTH} />
                                                                  <EditableInfoTitle x={slotX + 3} y={slotY - (INFO_BLOCK_HEIGHT + 4)} width={Math.max(30, diSlotWidth - 6)} height={INFO_BLOCK_HEIGHT} text={diInfoTitle} fontSize={4} fill={INFO_BLOCK_TEXT_COLOR} align="center" verticalAlign="middle" device={visualDevice} title={diInfoTitle} />
                                                             </>
                                                         )}
                                                         {showPorts && portsForDevice.map((port) => (
                                                            <Circle
                                                                key={`pro-di-port-0-${port.name}`}
                                                                x={x + port.x * size.width}
                                                                y={y + port.y * size.height}
                                                                radius={2.5}
                                                                fill="red"
                                                                listening={false}


                                                             />
                                                         ))}
                                                         {isHovered && (
                                                             <SlotDeleteButton compact x={slotX + diSlotWidth - 2.5} y={slotY + 1.5} onRemove={() => removeControllerDiDeviceAtSlot(0)} />
                                                         )}
                                                     </Group>
                                                );
                                            })()}
                                             {isDiIn2Occupied && proDiDevices[1] && (() => {
                                                 const device = proDiDevices[1];
                                                 const offsetKey = getRuntimeOffsetKey(device, 1, 'controller-di');
                                                 const offset = diSlotOffsets[offsetKey] || { x: 0, y: 0 };
                                                 const slotX = diSlotX + offset.x;
                                                 const slotY = diSlot1Y + offset.y;
                                                 const hoverKey = 'controller-di:1';
                                                const isHovered = hoveredNtcSlotKey === hoverKey;
                                                 const deviceType = canonicalDeviceType(device?.type);
                                                 const isLeakDevice = isLeakDiDeviceType(deviceType);
                                                 const visualDevice = isDiscreteDiDeviceType(deviceType) || isLeakDevice
                                                     ? { ...device, port_side: 'left' }
                                                     : device;
                                                 const imageKey = getWirelessDeviceImageKey(visualDevice);
                                                const image = imageKey ? wirelessImages[imageKey] : null;
                                                if (!image) return null;
                                                const portsForDevice = wirelessPortsByType[imageKey] || [];
                                                const diInputPort = getDiInputPort(portsForDevice);
                                                 const imageBoxWidth = isLeakDevice
                                                     ? diSlotWidth * LEAK_DI_DEVICE_IMAGE_SCALE
                                                     : diSlotWidth;
                                                 const imageBoxHeight = isLeakDevice
                                                     ? diSlotHeight * LEAK_DI_DEVICE_IMAGE_SCALE
                                                     : diSlotHeight;
                                                 const size = getContainSize(image, imageBoxWidth, imageBoxHeight);
                                                 const x = slotX + (diSlotWidth - size.width) / 2;
                                                 const y = slotY + (diSlotHeight - size.height) / 2;
                                                 const toX = diInputPort ? (x + diInputPort.x * size.width) : slotX;
                                                 const toY = diInputPort ? (y + diInputPort.y * size.height) : slotY + diSlotHeight / 2;
                                                 const diInfoTitle = getDiDeviceTitle(scheme, device);
                                                 const showDiInfoBlock = shouldShowDiDeviceInfoBlock(device);
                                                 return (
                                                     <Group
                                                         draggable
                                                         onDragStart={() => {
                                                             diDragStartOffsetsRef.current[offsetKey] = diSlotOffsets[offsetKey] || { x: 0, y: 0 };
                                                         }}
                                                         onDragMove={(event) => {
                                                             const delta = event.target.position();
                                                             const startOffset = diDragStartOffsetsRef.current[offsetKey] || { x: 0, y: 0 };
                                                             setDiSlotOffsets((prev) => ({
                                                                 ...prev,
                                                                 [offsetKey]: {
                                                                     x: startOffset.x + delta.x,
                                                                     y: startOffset.y + delta.y,
                                                                 },
                                                             }));
                                                             event.target.position({ x: 0, y: 0 });
                                                         }}
                                                         onDragEnd={(event) => {
                                                             delete diDragStartOffsetsRef.current[offsetKey];
                                                             event.target.position({ x: 0, y: 0 });
                                                         }}
                                                     >
                                                        <Line
                                                            points={[diIn2Port.x, diIn2Port.y, diIn2Port.x, toY, toX, toY]}
                                                            stroke="#1565c0"
                                                            strokeWidth={1}
                                                            lineCap="round"
                                                            lineJoin="round"
                                                            listening={false}
                                                         />
                                                          <Image image={image} x={x} y={y} width={size.width} height={size.height} listening={false} />
                                                          <Rect
                                                               x={isLeakDevice ? x : slotX}
                                                               y={isLeakDevice ? y : slotY}
                                                               width={isLeakDevice ? size.width : diSlotWidth}
                                                               height={isLeakDevice ? size.height : diSlotHeight}
                                                              cornerRadius={6}
                                                              fill={TRANSPARENT_FILL}
                                                              stroke={TRANSPARENT_FILL}
                                                              strokeWidth={1.2}
                                                              onMouseEnter={() => setHoveredNtcSlotKey(hoverKey)}
                                                              onMouseLeave={() => setHoveredNtcSlotKey((prev) => (prev === hoverKey ? null : prev))}
                                                          />
                                                          {showDiInfoBlock && (
                                                             <>
                                                                  <Rect x={slotX} y={slotY - (INFO_BLOCK_HEIGHT + 4)} width={diSlotWidth} height={INFO_BLOCK_HEIGHT} cornerRadius={1} fill={INFO_BLOCK_FILL} stroke={INFO_BLOCK_STROKE} strokeWidth={INFO_BLOCK_STROKE_WIDTH} />
                                                                  <EditableInfoTitle x={slotX + 3} y={slotY - (INFO_BLOCK_HEIGHT + 4)} width={Math.max(30, diSlotWidth - 6)} height={INFO_BLOCK_HEIGHT} text={diInfoTitle} fontSize={4} fill={INFO_BLOCK_TEXT_COLOR} align="center" verticalAlign="middle" device={visualDevice} title={diInfoTitle} />
                                                             </>
                                                         )}
                                                         {showPorts && portsForDevice.map((port) => (
                                                            <Circle
                                                                key={`pro-di-port-1-${port.name}`}
                                                                x={x + port.x * size.width}
                                                                y={y + port.y * size.height}
                                                                radius={2.5}
                                                                fill="red"
                                                                listening={false}


                                                             />
                                                         ))}
                                                         {isHovered && (
                                                             <SlotDeleteButton compact x={slotX + diSlotWidth - 2.5} y={slotY + 1.5} onRemove={() => removeControllerDiDeviceAtSlot(1)} />
                                                         )}
                                                     </Group>
                                                );
                                            })()}
                                        </Group>
                                    );
                                })()}
                                {(() => {
                                    if (controllerType !== 'pro') return null;
                                    if (!showEmptySlots) return null;

                                    const aiInPort = getPortPosition(ports, 'AI-IN-1', 0, 0, controllerImage.width, controllerImage.height);
                                    if (!aiInPort) return null;

                                    const slotWidth = 9 * indentSize;
                                    const slotHeight = 2 * indentSize;
                                    const slotX = controllerImage.width - slotWidth;
                                    const slot4_20Y = controllerImage.height + 1.15 * moduleHeightValue;
                                    const slotY = slot4_20Y - slotHeight;
                                    const targetX = slotX;
                                    const targetY = slotY + slotHeight / 2;

                                    return (
                                        <Group>
                                            <Line
                                                points={[aiInPort.x, aiInPort.y, aiInPort.x, targetY, targetX, targetY]}
                                                stroke="#4fc3f7"
                                                strokeWidth={1}
                                                lineCap="round"
                                                lineJoin="round"
                                                listening={false}
                                            />
                                            <Rect
                                                x={slotX}
                                                y={slotY}
                                                width={slotWidth}
                                                height={slotHeight}
                                                cornerRadius={6}
                                                fill={EMPTY_SLOT_FILL}
                                                stroke={EMPTY_SLOT_STROKE}
                                                strokeWidth={1.2}
                                            />
                                        </Group>
                                    );
                                })()}
                                {(() => {
                                    if (controllerType !== 'ecosmart') return null;
                                    const leakPorts = {
                                        gnd: getPortPosition(ports, 'DI-IN-2-GND', 0, 0, controllerImage.width, controllerImage.height),
                                        di: getPortPosition(ports, 'DI-IN-2-DI', 0, 0, controllerImage.width, controllerImage.height),
                                        vplus: getPortPosition(ports, 'DI-IN-2-V+', 0, 0, controllerImage.width, controllerImage.height),
                                    };
                                    if (!leakPorts.gnd || !leakPorts.di || !leakPorts.vplus) return null;

                                    const leakSensor = getControllerLineDevices(scheme, 'leak_sensor_devices')[0] || null;
                                    if (!leakSensor && !showEmptySlots) return null;

                                    const controllerPortCenterX = (leakPorts.gnd.x + leakPorts.di.x + leakPorts.vplus.x) / 3;
                                    const controllerPortCenterY = (leakPorts.gnd.y + leakPorts.di.y + leakPorts.vplus.y) / 3;
                                    const slotWidth = 7 * indentSize;
                                    const slotHeight = 7 * indentSize;
                                    const slotX = controllerPortCenterX - slotWidth - 2 * indentSize;
                                    const slotY = -slotHeight - 12 * indentSize;
                                    const imageKey = controllerPortCenterX > slotX + slotWidth / 2 ? 'leak-sensor-right-port' : 'leak-sensor';
                                    const image = wirelessImages[imageKey] || null;
                                    const leakSensorPorts = wirelessPortsByType[imageKey] || [];
                                    const renderSize = image
                                        ? getContainSize(image, slotWidth, slotHeight)
                                        : { width: slotWidth, height: slotHeight };
                                    const renderX = slotX + (slotWidth - renderSize.width) / 2;
                                    const renderY = slotY + (slotHeight - renderSize.height) / 2;
                                    const getLeakSensorPort = (name, fallbackY) => {
                                        const port = leakSensorPorts.find((item) => item.name === name) || null;
                                        return port
                                            ? { x: renderX + port.x * renderSize.width, y: renderY + port.y * renderSize.height }
                                            : { x: slotX + slotWidth, y: fallbackY };
                                    };
                                    const targetPorts = {
                                        gnd: getLeakSensorPort('DI-GND', slotY + slotHeight * 0.3),
                                        di: getLeakSensorPort('DI-IN', slotY + slotHeight * 0.5),
                                        vplus: getLeakSensorPort('DI-V+', slotY + slotHeight * 0.7),
                                    };
                                    const hoverKey = 'ecosmart-leak-sensor';
                                    const isHovered = hoveredNtcSlotKey === hoverKey;
                                    const leakSensorDisplayIndex = getLeakSensorDisplayIndex(scheme, leakSensor);
                                    const leakSensorBaseTitle = isLeakLoop(leakSensor) ? 'Зона контроля протечки' : 'Датчик протечки';
                                    const leakZoneSensorCount = isLeakLoop(leakSensor) ? getLeakZoneSensors(leakSensor).length : 0;
                                    const leakSensorTitle = getDeviceStoredTitle(leakSensor) || [
                                        leakSensorDisplayIndex > 0 ? `${leakSensorBaseTitle} ${leakSensorDisplayIndex}` : leakSensorBaseTitle,
                                        leakZoneSensorCount > 0 ? `(${leakZoneSensorCount} датч.)` : null,
                                    ].filter(Boolean).join(' ');

                                    return (
                                        <Group
                                            onMouseEnter={() => setHoveredNtcSlotKey(hoverKey)}
                                            onMouseLeave={() => setHoveredNtcSlotKey((prev) => (prev === hoverKey ? null : prev))}
                                        >
                                            {(leakSensor || showEmptySlots) && (
                                                <>
                                                    <Line points={[targetPorts.gnd.x, targetPorts.gnd.y, leakPorts.gnd.x, targetPorts.gnd.y, leakPorts.gnd.x, leakPorts.gnd.y]} stroke={ECOSMART_LEAK_SENSOR_COLORS.gnd} strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                    <Line points={[targetPorts.di.x, targetPorts.di.y, leakPorts.di.x, targetPorts.di.y, leakPorts.di.x, leakPorts.di.y]} stroke={ECOSMART_LEAK_SENSOR_COLORS.di} strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                    <Line points={[targetPorts.vplus.x, targetPorts.vplus.y, leakPorts.vplus.x, targetPorts.vplus.y, leakPorts.vplus.x, leakPorts.vplus.y]} stroke={ECOSMART_LEAK_SENSOR_COLORS.vplus} strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                </>
                                            )}
                                            <Rect
                                                x={slotX}
                                                y={slotY}
                                                width={slotWidth}
                                                height={slotHeight}
                                                cornerRadius={6}
                                                fill={leakSensor ? TRANSPARENT_FILL : EMPTY_SLOT_FILL}
                                                stroke={leakSensor ? TRANSPARENT_FILL : EMPTY_SLOT_STROKE}
                                                strokeWidth={1.2}
                                                onClick={!leakSensor ? addControllerLeakSensorAtSlot : undefined}
                                                onTap={!leakSensor ? addControllerLeakSensorAtSlot : undefined}
                                            />
                                            {leakSensor && image && (
                                                <Image image={image} x={renderX} y={renderY} width={renderSize.width} height={renderSize.height} listening={false} />
                                            )}
                                            {showPorts && leakSensor && (
                                                <>
                                                    <Circle x={leakPorts.gnd.x} y={leakPorts.gnd.y} radius={2.5} fill="red" listening={false} />
                                                    <Circle x={leakPorts.di.x} y={leakPorts.di.y} radius={2.5} fill="red" listening={false} />
                                                    <Circle x={leakPorts.vplus.x} y={leakPorts.vplus.y} radius={2.5} fill="red" listening={false} />
                                                    {leakSensorPorts.map((port) => (
                                                        <Circle key={`ecosmart-leak-port-${port.name}`} x={renderX + port.x * renderSize.width} y={renderY + port.y * renderSize.height} radius={2.5} fill="red" listening={false} />
                                                    ))}
                                                </>
                                            )}
                                            {leakSensor && (
                                                <>
                                                    <Rect x={slotX} y={slotY - (INFO_BLOCK_HEIGHT + 4)} width={slotWidth} height={INFO_BLOCK_HEIGHT} cornerRadius={1} fill={INFO_BLOCK_FILL} stroke={INFO_BLOCK_STROKE} strokeWidth={INFO_BLOCK_STROKE_WIDTH} />
                                                    <EditableInfoTitle x={slotX + 3} y={slotY - (INFO_BLOCK_HEIGHT + 4)} width={Math.max(30, slotWidth - 6)} height={INFO_BLOCK_HEIGHT} text={leakSensorTitle} fontSize={4} fill={INFO_BLOCK_TEXT_COLOR} align="center" verticalAlign="middle" device={leakSensor} title={leakSensorTitle} />
                                                </>
                                            )}
                                            {leakSensor && isHovered && (
                                                <SlotDeleteButton compact x={slotX + slotWidth - 2.5} y={slotY + 1.5} onRemove={removeControllerLeakSensorAtSlot} />
                                            )}
                                            {!leakSensor && showEmptySlots && (
                                                <>
                                                    <Circle x={slotX + slotWidth / 2} y={slotY + slotHeight / 2} radius={10} fill={ADD_ACTION_FILL} onClick={addControllerLeakSensorAtSlot} onTap={addControllerLeakSensorAtSlot} />
                                                    <EditableInfoTitle x={slotX + slotWidth / 2} y={slotY + slotHeight / 2} text="+" fontSize={15} fill={ADD_ACTION_TEXT_FILL} offsetX={4.5} offsetY={6} listening={false} />
                                                </>
                                            )}
                                        </Group>
                                    );
                                })()}
                                {(() => {
                                    if (controllerType !== 'ecosmart') return null;
                                    const diPort = getPortPosition(ports, 'DI-IN-1', 0, 0, controllerImage.width, controllerImage.height);
                                    const leakDiPorts = [
                                        getPortPosition(ports, 'DI-IN-2-GND', 0, 0, controllerImage.width, controllerImage.height),
                                        getPortPosition(ports, 'DI-IN-2-DI', 0, 0, controllerImage.width, controllerImage.height),
                                        getPortPosition(ports, 'DI-IN-2-V+', 0, 0, controllerImage.width, controllerImage.height),
                                    ].filter(Boolean);
                                    if (!diPort || leakDiPorts.length === 0) return null;

                                    const diDevice = getControllerLineDevices(scheme, 'di_devices')[0] || null;
                                    if (!diDevice && !showEmptySlots) return null;

                                    const leakCenterX = leakDiPorts.reduce((sum, port) => sum + port.x, 0) / leakDiPorts.length;
                                    const leakSlotWidth = 7 * indentSize;
                                    const leakSlotHeight = 7 * indentSize;
                                    const leakSlotX = leakCenterX - leakSlotWidth - 2 * indentSize;
                                    const leakSlotY = -leakSlotHeight - 12 * indentSize;
                                    const slotWidth = 7 * indentSize;
                                    const slotHeight = 2 * indentSize;
                                    const slotX = leakSlotX + leakSlotWidth - slotWidth - indentSize;
                                    const slotY = leakSlotY + leakSlotHeight + 2 * indentSize;
                                    const imageDevice = diDevice ? { ...diDevice, port_side: 'right' } : null;
                                    const imageKey = imageDevice ? getWirelessDeviceImageKey(imageDevice) : null;
                                    const image = imageKey ? wirelessImages[imageKey] : null;
                                    const devicePorts = imageKey ? (wirelessPortsByType[imageKey] || []) : [];
                                    const renderSize = image ? getContainSize(image, slotWidth, slotHeight) : { width: slotWidth, height: slotHeight };
                                    const renderX = slotX + (slotWidth - renderSize.width) / 2;
                                    const renderY = slotY + (slotHeight - renderSize.height) / 2;
                                    const deviceDiPort = getDiInputPort(devicePorts);
                                    const targetX = deviceDiPort ? renderX + deviceDiPort.x * renderSize.width : slotX + slotWidth;
                                     const targetY = deviceDiPort ? renderY + deviceDiPort.y * renderSize.height : slotY + slotHeight / 2;
                                     const hoverKey = 'ecosmart-discrete-di';
                                     const isHovered = hoveredNtcSlotKey === hoverKey;
                                     const openControllerDiMenu = (event) => {
                                         const pos = event.target.getAbsolutePosition();
                                         setControllerDiMenuPos({ x: pos.x, y: pos.y, slotIndex: 0 });
                                     };

                                     return (
                                         <Group
                                             onMouseEnter={() => setHoveredNtcSlotKey(hoverKey)}
                                             onMouseLeave={() => setHoveredNtcSlotKey((prev) => (prev === hoverKey ? null : prev))}
                                         >
                                             {diDevice && (
                                                 <Line
                                                     points={[targetX, targetY, diPort.x, targetY, diPort.x, diPort.y]}
                                                     stroke="#1565c0"
                                                     strokeWidth={1}
                                                    lineCap="round"
                                                    lineJoin="round"
                                                     listening={false}
                                                 />
                                             )}
                                             {!diDevice && showEmptySlots && (
                                                 <Line
                                                     points={[slotX + slotWidth, slotY + slotHeight / 2, diPort.x, slotY + slotHeight / 2, diPort.x, diPort.y]}
                                                     stroke="#1565c0"
                                                     strokeWidth={1}
                                                     lineCap="round"
                                                     lineJoin="round"
                                                     listening={false}
                                                 />
                                             )}
                                             <Rect
                                                 x={slotX}
                                                 y={slotY}
                                                 width={slotWidth}
                                                 height={slotHeight}
                                                cornerRadius={6}
                                                 fill={diDevice ? TRANSPARENT_FILL : EMPTY_SLOT_FILL}
                                                 stroke={diDevice ? TRANSPARENT_FILL : EMPTY_SLOT_STROKE}
                                                 strokeWidth={1.2}
                                                 onClick={!diDevice ? openControllerDiMenu : undefined}
                                                 onTap={!diDevice ? openControllerDiMenu : undefined}
                                             />
                                             {!diDevice && showEmptySlots && (
                                                 <>
                                                     <Circle
                                                         x={slotX + slotWidth / 2}
                                                         y={slotY + slotHeight / 2}
                                                         radius={10}
                                                         fill={ADD_ACTION_FILL}
                                                         onClick={openControllerDiMenu}
                                                         onTap={openControllerDiMenu}
                                                     />
                                                     <Text
                                                         x={slotX + slotWidth / 2}
                                                         y={slotY + slotHeight / 2}
                                                         text="+"
                                                         fontSize={15}
                                                          fill={ADD_ACTION_TEXT_FILL}
                                                         offsetX={4.5}
                                                         offsetY={6}
                                                         listening={false}
                                                     />
                                                 </>
                                             )}
                                             {diDevice && image && <Image image={image} x={renderX} y={renderY} width={renderSize.width} height={renderSize.height} listening={false} />}
                                             {showPorts && diDevice && (
                                                 <>
                                                     <Circle x={diPort.x} y={diPort.y} radius={2.5} fill="red" listening={false} />
                                                     {devicePorts.map((port) => (
                                                         <Circle key={`ecosmart-discrete-di-port-${port.name}`} x={renderX + port.x * renderSize.width} y={renderY + port.y * renderSize.height} radius={2.5} fill="red" listening={false} />
                                                     ))}
                                                 </>
                                             )}
                                             {diDevice && isHovered && (
                                                 <SlotDeleteButton compact x={slotX + slotWidth - 2.5} y={slotY + 1.5} onRemove={() => removeControllerDiDeviceAtSlot(0)} />
                                             )}
                                         </Group>
                                     );
                                 })()}
                                {(() => {
                                    if (controllerType !== 'pro' && controllerType !== 'ecosmart') return null;
                                    const pressureSensor = getPressureSensorFromScheme(scheme);
                                    const pressureSensors = getPressureSensorsFromScheme(scheme);
                                    if (!pressureSensor && !showEmptySlots) return null;

                                    const outInPort = getPortPosition(ports, '4-20-OUT-IN', 0, 0, controllerImage.width, controllerImage.height);
                                    const outVPlusPort = getPortPosition(ports, '4-20-OUT-V+', 0, 0, controllerImage.width, controllerImage.height);
                                    if (!outInPort || !outVPlusPort) return null;

                                    const occupiedSlotWidth = 8 * indentSize;
                                    const occupiedSlotHeight = 1.5 * indentSize;
                                    const emptySlotWidth = 9 * indentSize;
                                    const emptySlotHeight = 2 * indentSize;
                                    const slotWidth = pressureSensor ? occupiedSlotWidth : emptySlotWidth;
                                    const slotHeight = pressureSensor ? occupiedSlotHeight : emptySlotHeight;
                                    const isController420SlotDraggable = controllerType === 'pro' || controllerType === 'ecosmart';
                                    const slotDragOffset = isController420SlotDraggable ? controller420SlotOffset : { x: 0, y: 0 };
                                    const baseSlotX = controllerType === 'ecosmart'
                                        ? controllerImage.width + 4 * indentSize
                                        : controllerImage.width - slotWidth;
                                    const slotX = baseSlotX + slotDragOffset.x;
                                    const { aiOccupied, diOccupied, modbusOccupied } = getProAuxLineOccupancy(scheme);
                                    let slotOffsetIndent = 14;
                                    if (showEmptySlots) {
                                        slotOffsetIndent = 32;
                                    } else if (diOccupied && !aiOccupied) {
                                        slotOffsetIndent = 28;
                                    } else if (!aiOccupied && !diOccupied && !modbusOccupied) {
                                        slotOffsetIndent = 14;
                                    } else {
                                        slotOffsetIndent = 32;
                                    }
                                    const baseSlotY = controllerType === 'ecosmart'
                                        ? 9 * indentSize
                                        : controllerImage.height + slotOffsetIndent * indentSize;
                                    const slotY = baseSlotY + slotDragOffset.y;

                                    const pressureSensorImageKey = 'pressure-sensor';
                                    const pressureSensorImage = wirelessImages[pressureSensorImageKey] || null;
                                    const pressureSensorPorts = wirelessPortsByType[pressureSensorImageKey] || [];
                                    const { vPlus: pressureInVPlus, input: pressureInIn } = getPressureSensorPorts(pressureSensorPorts);

                                    const sensorSize = pressureSensorImage
                                        ? getContainSize(pressureSensorImage, slotWidth, slotHeight)
                                        : { width: slotWidth, height: slotHeight };
                                    const sensorX = slotX + (slotWidth - sensorSize.width) / 2;
                                    const sensorY = slotY + (slotHeight - sensorSize.height) / 2;

                                    const inVPlusX = pressureInVPlus ? sensorX + pressureInVPlus.x * sensorSize.width : slotX;
                                    const inVPlusY = pressureInVPlus ? sensorY + pressureInVPlus.y * sensorSize.height : slotY + slotHeight / 2;
                                    const inInX = pressureInIn ? sensorX + pressureInIn.x * sensorSize.width : slotX;
                                    const inInY = pressureInIn ? sensorY + pressureInIn.y * sensorSize.height : slotY + slotHeight / 2;
                                    const emptyVPlusX = slotX;
                                    const emptyVPlusY = slotY + slotHeight / 2 - indentSize / 2;
                                    const emptyInX = slotX;
                                    const emptyInY = slotY + slotHeight / 2 + indentSize / 2;
                                    const pressureSensorIndex = pressureSensor
                                        ? Math.max(0, pressureSensors.findIndex((item) => {
                                            if (pressureSensor?.id != null && item?.id != null) return item.id === pressureSensor.id;
                                            return item === pressureSensor;
                                        })) + 1
                                        : 0;
                                    const pressureInfoTitle = getDeviceStoredTitle(pressureSensor) || `Датчик давления ${pressureSensorIndex}`;
                                    const isController420Hovered = hoveredNtcSlotKey === 'controller-420';

                                    return (
                                        <Group
                                            draggable={isController420SlotDraggable}
                                            onMouseEnter={() => setHoveredNtcSlotKey('controller-420')}
                                            onMouseLeave={() => setHoveredNtcSlotKey((current) => (current === 'controller-420' ? null : current))}
                                            onDragStart={() => {
                                                if (!isController420SlotDraggable) return;
                                                controller420DragStartOffsetRef.current = controller420SlotOffset;
                                            }}
                                            onDragMove={(event) => {
                                                if (!isController420SlotDraggable) return;
                                                const delta = event.target.position();
                                                const startOffset = controller420DragStartOffsetRef.current || { x: 0, y: 0 };
                                                setController420SlotOffset({
                                                    x: startOffset.x + delta.x,
                                                    y: startOffset.y + delta.y,
                                                });
                                                event.target.position({ x: 0, y: 0 });
                                            }}
                                            onDragEnd={(event) => {
                                                if (!isController420SlotDraggable) return;
                                                event.target.position({ x: 0, y: 0 });
                                            }}
                                        >
                                             {pressureSensor && (
                                                 <>
                                                    <Line
                                                        points={[outVPlusPort.x, outVPlusPort.y, outVPlusPort.x, inVPlusY, inVPlusX, inVPlusY]}
                                                        stroke="#d32f2f"
                                                        strokeWidth={1}
                                                        lineCap="round"
                                                        lineJoin="round"
                                                        listening={false}
                                                    />
                                                    <Line
                                                        points={[outInPort.x, outInPort.y, outInPort.x, inInY, inInX, inInY]}
                                                        stroke="#f57c00"
                                                        strokeWidth={1}
                                                        lineCap="round"
                                                        lineJoin="round"
                                                        listening={false}
                                                    />
                                                </>
                                            )}
                                            {!pressureSensor && showEmptySlots && (
                                                <>
                                                    <Line
                                                        points={[outVPlusPort.x, outVPlusPort.y, outVPlusPort.x, emptyVPlusY, emptyVPlusX, emptyVPlusY]}
                                                        stroke="#d32f2f"
                                                        strokeWidth={1}
                                                        lineCap="round"
                                                        lineJoin="round"
                                                        listening={false}
                                                    />
                                                    <Line
                                                        points={[outInPort.x, outInPort.y, outInPort.x, emptyInY, emptyInX, emptyInY]}
                                                        stroke="#f57c00"
                                                        strokeWidth={1}
                                                        lineCap="round"
                                                        lineJoin="round"
                                                        listening={false}
                                                    />
                                                </>
                                            )}
                                              <Rect
                                                  x={slotX}
                                                  y={slotY}
                                                 width={slotWidth}
                                                 height={slotHeight}
                                                 cornerRadius={6}
                                                 fill={pressureSensor ? TRANSPARENT_FILL : EMPTY_SLOT_FILL}
                                                 stroke={pressureSensor ? TRANSPARENT_FILL : EMPTY_SLOT_STROKE}
                                                 strokeWidth={1.2}
                                                 onClick={!pressureSensor ? addController420PressureSensor : undefined}
                                                 onTap={!pressureSensor ? addController420PressureSensor : undefined}
                                             />
                                             {!pressureSensor && showEmptySlots && (
                                                 <>
                                                     <Circle
                                                         x={slotX + slotWidth / 2}
                                                         y={slotY + slotHeight / 2}
                                                         radius={10}
                                                         fill={ADD_ACTION_FILL}
                                                         onClick={addController420PressureSensor}
                                                         onTap={addController420PressureSensor}
                                                     />
                                                     <Text
                                                         x={slotX + slotWidth / 2}
                                                         y={slotY + slotHeight / 2}
                                                         text="+"
                                                         fontSize={15}
                                                         fill={INFO_BLOCK_FILL}
                                                         offsetX={4.5}
                                                         offsetY={6}
                                                         listening={false}
                                                     />
                                                 </>
                                             )}
                                             {pressureSensor && pressureSensorImage && (
                                                 <Image
                                                     image={pressureSensorImage}
                                                     x={sensorX}
                                                     y={sensorY}
                                                    width={sensorSize.width}
                                                    height={sensorSize.height}
                                                />
                                            )}
                                            {pressureSensor && (
                                                <>
                                                    <Rect
                                                        x={slotX}
                                                        y={slotY - (INFO_BLOCK_HEIGHT + 4)}
                                                        width={slotWidth}
                                                        height={INFO_BLOCK_HEIGHT}
                                                        cornerRadius={1}
                                                        fill={INFO_BLOCK_FILL}
                                                        stroke={INFO_BLOCK_STROKE}
                                                        strokeWidth={INFO_BLOCK_STROKE_WIDTH}
                                                    />
                                                    <EditableInfoTitle
                                                        x={slotX + 3}
                                                        y={slotY - (INFO_BLOCK_HEIGHT + 4)}
                                                        width={Math.max(40, slotWidth - 6)}
                                                        height={INFO_BLOCK_HEIGHT}
                                                        text={pressureInfoTitle}
                                                        fontSize={4}
                                                        fill={INFO_BLOCK_TEXT_COLOR}
                                                        align="center"
                                                         verticalAlign="middle" device={pressureSensor} title={pressureInfoTitle} />
                                                 </>
                                             )}
                                             {pressureSensor && isController420Hovered && (
                                                 <SlotDeleteButton compact x={slotX + slotWidth - 2.5} y={slotY + 1.5} onRemove={removeController420PressureSensor} />
                                             )}
                                                         {showPorts && pressureSensor && pressureSensorPorts.map((port) => (
                                                            <Circle
                                                                key={`pressure-sensor-port-${port.name}`}
                                                                x={sensorX + port.x * sensorSize.width}
                                                                y={sensorY + port.y * sensorSize.height}
                                                                radius={2.5}
                                                                fill="red"
                                                                listening={false}


                                                            />
                                                        ))}
                                        </Group>
                                    );
                                })()}
                                {(() => {
                                    if (controllerType !== 'ecosmart') return null;
                                    const controller420SlotWidth = 9 * indentSize;
                                    const controller420SlotHeight = 2 * indentSize;
                                      // The boiler relay has its own drag offset and must not inherit
                                      // movement from the neighbouring controller 4-20 slot.
                                      const controller420SlotX = controllerImage.width + 4 * indentSize;
                                      const controller420SlotY = 9 * indentSize;
                                     const relayDevice = getRelayDevicesForController(scheme)[0] || null;
                                     if (!relayDevice && !showEmptySlots) return null;
                                     const relayType = canonicalDeviceType(relayDevice?.type);
                                    const relayVisualDevice = relayDevice
                                        ? {
                                            ...relayDevice,
                                            port_side: 'left',
                                        }
                                        : null;
                                    const relayImageKey = relayVisualDevice ? getWirelessDeviceImageKey(relayVisualDevice) : null;
                                    const relayImage = relayImageKey ? wirelessImages[relayImageKey] : null;
                                    const relaySlotWidth = relayDevice && isRelayBoilerType(relayType)
                                        ? (relayImage?.width || BUS_SLOT_SIZE)
                                        : RELAY_SLOT_SIZE;
                                    const relaySlotHeight = relayDevice && isRelayBoilerType(relayType)
                                        ? (relayImage?.height || BUS_SLOT_SIZE)
                                        : RELAY_SLOT_SIZE;
                                    const relayOffset = relayDevice ? (relaySlotOffsets[0] || { x: 0, y: 0 }) : { x: 0, y: 0 };
                                    const relaySlotX = controller420SlotX + (controller420SlotWidth - relaySlotWidth) / 2 + relayOffset.x;
                                    const relaySlotY = controller420SlotY - relaySlotHeight - 5 * indentSize + relayOffset.y;
                                    const relayImageSize = relayImage
                                        ? getContainSize(relayImage, relaySlotWidth, relaySlotHeight)
                                        : { width: relaySlotWidth, height: relaySlotHeight };
                                    const relayImageX = relaySlotX + (relaySlotWidth - relayImageSize.width) / 2;
                                    const relayImageY = relaySlotY + (relaySlotHeight - relayImageSize.height) / 2;
                                    const relayPorts = relayImageKey ? (wirelessPortsByType[relayImageKey] || []) : [];
                                    const boilerBusAPort = relayPorts.find((port) => port.name === 'BUS-A') || null;
                                    const boilerBusBPort = relayPorts.find((port) => port.name === 'BUS-B') || null;
                                    const controllerRelayAPort = ports.find((port) => port.name === 'RELAY-1-A') || null;
                                    const controllerRelayBPort = ports.find((port) => port.name === 'RELAY-1-B') || null;
                                    const relayAPort = controllerRelayAPort
                                        ? {
                                            x: controllerRelayAPort.x * controllerImage.width,
                                            y: controllerRelayAPort.y * controllerImage.height,
                                        }
                                        : {
                                            x: relaySlotX,
                                            y: relaySlotY + relaySlotHeight / 2 - indentSize / 2,
                                        };
                                    const relayBPort = controllerRelayBPort
                                        ? {
                                            x: controllerRelayBPort.x * controllerImage.width,
                                            y: controllerRelayBPort.y * controllerImage.height,
                                        }
                                        : {
                                            x: relaySlotX,
                                            y: relaySlotY + relaySlotHeight / 2 + indentSize / 2,
                                        };
                                    const relayTypeDevicesInSystem = relayType
                                        ? getRelayDevicesForController(scheme).filter((device) => canonicalDeviceType(device?.type) === relayType)
                                        : [];
                                    const relaySystemIndex = relayDevice
                                        ? Math.max(0, relayTypeDevicesInSystem.findIndex((device) => {
                                            if (relayDevice?.id != null && device?.id != null) return device.id === relayDevice.id;
                                            return device === relayDevice;
                                        })) + 1
                                        : 0;
                                    const relayBaseTitle = isRelayBoilerType(relayType)
                                        ? (relayDevice?.name || 'Котел')
                                        : (relayType === 'pump-220v'
                                            ? 'Насос 220V'
                                            : (relayType === 'boiler-pump'
                                                ? 'Насос бойлера'
                                                : (relayType === 'zoneServo' ? 'Сервопривод зоны' : 'Прочее оборудование')));
                                    const relayInfoTitle = getDeviceStoredTitle(relayDevice) || (relaySystemIndex > 0
                                        ? `${relayBaseTitle} ${relaySystemIndex}`
                                        : relayBaseTitle);
                                    const relayHoverKey = 'ecosmart-relay-boiler';
                                    const isRelayHovered = hoveredNtcSlotKey === relayHoverKey;
                                    const removeEcosmartRelayDevice = () => {
                                        setScheme((s) => {
                                            const targetId = relayDevice?.id;
                                            if (targetId == null) return s;
                                            const nextScheme = patchControllerLine(s, 'relay_devices', (currentLine) => currentLine.filter((item) => item?.id !== targetId)) || s;
                                            const currentBoilers = Array.isArray(nextScheme.boilers) ? nextScheme.boilers : [];
                                            const currentWired = Array.isArray(nextScheme.wired_devices) ? nextScheme.wired_devices : [];
                                            return {
                                                ...nextScheme,
                                                boilers: currentBoilers.filter((item) => item?.id !== targetId),
                                                wired_devices: currentWired.filter((item) => item?.id !== targetId),
                                            };
                                        });
                                        setHoveredNtcSlotKey((prev) => (prev === relayHoverKey ? null : prev));
                                    };

                                    return (
                                        <Group
                                            onMouseEnter={() => setHoveredNtcSlotKey(relayHoverKey)}
                                            onMouseLeave={() => setHoveredNtcSlotKey((prev) => (prev === relayHoverKey ? null : prev))}
                                            draggable={!!relayDevice}
                                            onDragStart={() => {
                                                if (!relayDevice) return;
                                                relayDragStartOffsetsRef.current[0] = relaySlotOffsets[0] || { x: 0, y: 0 };
                                            }}
                                            onDragMove={(event) => {
                                                if (!relayDevice) return;
                                                const delta = event.target.position();
                                                const startOffset = relayDragStartOffsetsRef.current[0] || { x: 0, y: 0 };
                                                setRelaySlotOffsets((prev) => ({
                                                    ...prev,
                                                    0: {
                                                        x: startOffset.x + delta.x,
                                                        y: startOffset.y + delta.y,
                                                    },
                                                }));
                                                event.target.position({ x: 0, y: 0 });
                                            }}
                                            onDragEnd={(event) => {
                                                if (!relayDevice) return;
                                                delete relayDragStartOffsetsRef.current[0];
                                                event.target.position({ x: 0, y: 0 });
                                            }}
                                        >
                                            <Rect
                                                x={relaySlotX}
                                                y={relaySlotY}
                                                width={relaySlotWidth}
                                                height={relaySlotHeight}
                                                cornerRadius={10}
                                                fill={relayDevice ? TRANSPARENT_FILL : EMPTY_SLOT_FILL}
                                                stroke={relayDevice ? TRANSPARENT_FILL : EMPTY_SLOT_STROKE}
                                                strokeWidth={1.5}
                                            />
                                            {relayDevice && relayImage && (
                                                <Image
                                                    image={relayImage}
                                                    x={relayImageX}
                                                    y={relayImageY}
                                                    width={relayImageSize.width}
                                                    height={relayImageSize.height}
                                                />
                                            )}
                                                                          {relayDevice && (
                                                                              <>
                                                                                  <Rect
                                                        x={relaySlotX}
                                                        y={relaySlotY - (INFO_BLOCK_HEIGHT + 8)}
                                                        width={relaySlotWidth}
                                                        height={INFO_BLOCK_HEIGHT}
                                                        cornerRadius={1}
                                                        fill={INFO_BLOCK_FILL}
                                                        stroke={INFO_BLOCK_STROKE}
                                                        strokeWidth={INFO_BLOCK_STROKE_WIDTH}
                                                    />
                                                    <EditableInfoTitle x={relaySlotX + 4}
                                                        y={relaySlotY - (INFO_BLOCK_HEIGHT + 8)}
                                                        text={relayInfoTitle}
                                                        fontSize={4}
                                                        fill={INFO_BLOCK_TEXT_COLOR}
                                                        width={relaySlotWidth - 8}
                                                        height={INFO_BLOCK_HEIGHT}
                                                        align="center"
                                                        verticalAlign="middle" device={relayDevice} title={relayInfoTitle} />
                                                </>
                                            )}
                                            {relayDevice && isRelayHovered && (
                                                <SlotDeleteButton compact x={relaySlotX + relaySlotWidth - 2.5} y={relaySlotY + 1.5} onRemove={removeEcosmartRelayDevice} />
                                            )}
                                             {relayDevice && isRelayBoilerType(relayType) && boilerBusAPort && boilerBusBPort && (
                                                 <>
                                                    <Line
                                                        points={getOrthogonalLinkPoints(
                                                            relayAPort.x,
                                                            relayAPort.y,
                                                            relaySlotY + relaySlotHeight + indentSize,
                                                            relayImageX + boilerBusAPort.x * relayImageSize.width,
                                                            relayImageY + boilerBusAPort.y * relayImageSize.height,
                                                        )}
                                                        stroke="#2e7d32"
                                                        strokeWidth={1}
                                                        lineCap="round"
                                                        lineJoin="round"
                                                        listening={false}
                                                    />
                                                    <Line
                                                        points={getOrthogonalLinkPoints(
                                                            relayBPort.x,
                                                            relayBPort.y,
                                                            relaySlotY + relaySlotHeight + 2 * indentSize,
                                                            relayImageX + boilerBusBPort.x * relayImageSize.width,
                                                            relayImageY + boilerBusBPort.y * relayImageSize.height,
                                                        )}
                                                        stroke="#2e7d32"
                                                        strokeWidth={1}
                                                        lineCap="round"
                                                        lineJoin="round"
                                                        listening={false}
                                                    />
                                                    {showPorts && (
                                                        <>
                                                            <Circle x={relayAPort.x} y={relayAPort.y} radius={2.5} fill="red" listening={false} />
                                                            <Circle x={relayBPort.x} y={relayBPort.y} radius={2.5} fill="red" listening={false} />
                                                        </>
                                                    )}
                                                 </>
                                             )}
                                             {!relayDevice && showEmptySlots && controllerRelayAPort && controllerRelayBPort && (
                                                 <>
                                                     <Line
                                                         points={getOrthogonalLinkPoints(
                                                             relayAPort.x,
                                                             relayAPort.y,
                                                             relaySlotY + relaySlotHeight + indentSize,
                                                             relaySlotX + indentSize,
                                                             relaySlotY + relaySlotHeight,
                                                         )}
                                                         stroke="#9e9e9e"
                                                         strokeWidth={1}
                                                         lineCap="round"
                                                         lineJoin="round"
                                                         listening={false}
                                                     />
                                                     <Line
                                                         points={getOrthogonalLinkPoints(
                                                             relayBPort.x,
                                                             relayBPort.y,
                                                             relaySlotY + relaySlotHeight + 2 * indentSize,
                                                             relaySlotX + 2 * indentSize,
                                                             relaySlotY + relaySlotHeight,
                                                         )}
                                                         stroke="#9e9e9e"
                                                         strokeWidth={1}
                                                         lineCap="round"
                                                         lineJoin="round"
                                                         listening={false}
                                                     />
                                                     {showPorts && (
                                                         <>
                                                             <Circle x={relayAPort.x} y={relayAPort.y} radius={2.5} fill="red" listening={false} />
                                                             <Circle x={relayBPort.x} y={relayBPort.y} radius={2.5} fill="red" listening={false} />
                                                         </>
                                                     )}
                                                 </>
                                             )}
                                             {!relayDevice && (
                                                 <>
                                                    <Circle
                                                        x={relaySlotX + relaySlotWidth / 2}
                                                        y={relaySlotY + relaySlotHeight / 2}
                                                        radius={16}
                                                        fill={ADD_ACTION_FILL}
                                                        onClick={(e) => {
                                                            const pos = e.target.getAbsolutePosition();
                                                            setRelayMenuPos({ x: pos.x, y: pos.y, slotIndex: 0 });
                                                        }}
                                                        onTap={(e) => {
                                                            const pos = e.target.getAbsolutePosition();
                                                            setRelayMenuPos({ x: pos.x, y: pos.y, slotIndex: 0 });
                                                        }}
                                                    />
                                                    <EditableInfoTitle x={relaySlotX + relaySlotWidth / 2}
                                                        y={relaySlotY + relaySlotHeight / 2}
                                                        text="+"
                                                        fontSize={22}
                                                        fill={INFO_BLOCK_FILL}
                                                        offsetX={6.5}
                                                        offsetY={9}
                                                        listening={false}
                                                    />
                                                </>
                                            )}
                                        </Group>
                                    );
                                })()}
                                {(() => {
                                    if (controllerType !== 'ecosmart') return null;
                                    const slotWidth = 9 * indentSize;
                                    const slotHeight = 2 * indentSize;
                                    const slotGap = 3 * indentSize;
                                    const slotX = controllerImage.width - slotWidth;
                                     const bottomSlotY = 4 * indentSize - slotHeight;
                                     const slots = [
                                         {
                                             key: 'mixing-ntc-1',
                                             lineKey: 'mixing_ntc_devices',
                                             lineIndex: 0,
                                             type: 'mixing-ntc-sensor',
                                             title: 'NTC смесителя 1',
                                             controllerPortA: 'NTC-4-A MIXING',
                                             controllerPortB: 'NTC-4-B MIXING',
                                         },
                                         {
                                             key: 'mixing-ntc-2',
                                             lineKey: 'mixing_ntc_devices',
                                             lineIndex: 1,
                                             type: 'mixing-ntc-sensor',
                                             title: 'NTC смесителя 2',
                                             controllerPortA: 'NTC-3-A MIXING',
                                             controllerPortB: 'NTC-3-B MIXING',
                                         },
                                        {
                                            key: 'boiler-sensor-line',
                                            lineKey: 'boiler_sensor_devices',
                                            lineIndex: 0,
                                            type: 'flask-sensor-gvs-boiler',
                                            title: 'Датчик бойлера',
                                            controllerPortA: 'NTC-2-A BOILER',
                                            controllerPortB: 'NTC-2-B BOILER',
                                        },
                                        {
                                            key: 'strategy-sensor-line',
                                            lineKey: 'strategy_sensor_devices',
                                            lineIndex: 0,
                                            type: 'flask-sensor-strategy',
                                            title: 'Датчик стратегии',
                                            controllerPortA: 'NTC-1-A CASCADE',
                                            controllerPortB: 'NTC-1-B CASCADE',
                                        },
                                    ];

                                     return slots.map((slot, visualIndex) => {
                                         const line = getControllerLineDevices(scheme, slot.lineKey);
                                         const sensor = line[slot.lineIndex] || null;
                                         if (!sensor && !showEmptySlots) return null;
                                         const y = bottomSlotY - (slots.length - 1 - visualIndex) * (slotHeight + slotGap);
                                        const hoverKey = `ecosmart-ntc:${slot.key}`;
                                        const isHovered = hoveredNtcSlotKey === hoverKey;
                                        const sensorImageKey = 'ntc-sensor-left';
                                        const sensorImage = wirelessImages[sensorImageKey] || null;
                                        const sensorPorts = wirelessPortsByType[sensorImageKey] || [];
                                        const sensorRenderSize = sensorImage
                                            ? getContainSize(sensorImage, slotWidth, slotHeight)
                                            : { width: slotWidth, height: slotHeight };
                                        const sensorRenderX = slotX + (slotWidth - sensorRenderSize.width) / 2;
                                        const sensorRenderY = y + (slotHeight - sensorRenderSize.height) / 2;
                                        const sensorTitle = getDeviceStoredTitle(sensor) || slot.title;
                                        const sensorPortA = sensorPorts.find((port) => port.name === 'NTC-A') || null;
                                        const sensorPortB = sensorPorts.find((port) => port.name === 'NTC-B') || sensorPortA;
                                        const controllerPortA = getPortPosition(ports, slot.controllerPortA, 0, 0, controllerImage.width, controllerImage.height);
                                        const controllerPortB = getPortPosition(ports, slot.controllerPortB, 0, 0, controllerImage.width, controllerImage.height);
                                        const sensorPortAPos = sensorPortA
                                            ? { x: sensorRenderX + sensorPortA.x * sensorRenderSize.width, y: sensorRenderY + sensorPortA.y * sensorRenderSize.height }
                                            : { x: sensorRenderX, y: sensorRenderY + sensorRenderSize.height / 2 };
                                        const sensorPortBPos = sensorPortB
                                            ? { x: sensorRenderX + sensorPortB.x * sensorRenderSize.width, y: sensorRenderY + sensorPortB.y * sensorRenderSize.height }
                                            : sensorPortAPos;

                                        return (
                                            <Group
                                                key={`ecosmart-ntc-line-${slot.key}`}
                                                onMouseEnter={() => setHoveredNtcSlotKey(hoverKey)}
                                                onMouseLeave={() => setHoveredNtcSlotKey((prev) => (prev === hoverKey ? null : prev))}
                                            >
                                                {(sensor || showEmptySlots) && controllerPortA && controllerPortB && (
                                                    <>
                                                        <Line
                                                            points={[sensorPortAPos.x, sensorPortAPos.y, controllerPortA.x, sensorPortAPos.y, controllerPortA.x, controllerPortA.y]}
                                                            stroke="#212121"
                                                            strokeWidth={1}
                                                            lineCap="round"
                                                            lineJoin="round"
                                                            listening={false}
                                                        />
                                                        <Line
                                                            points={[sensorPortBPos.x, sensorPortBPos.y, controllerPortB.x, sensorPortBPos.y, controllerPortB.x, controllerPortB.y]}
                                                            stroke="#464EE3"
                                                            strokeWidth={1}
                                                            lineCap="round"
                                                            lineJoin="round"
                                                            listening={false}
                                                        />
                                                    </>
                                                )}
                                                <Rect
                                                    x={slotX}
                                                    y={y}
                                                    width={slotWidth}
                                                    height={slotHeight}
                                                    cornerRadius={6}
                                                    fill={sensor ? TRANSPARENT_FILL : EMPTY_SLOT_FILL}
                                                    stroke={sensor ? TRANSPARENT_FILL : EMPTY_SLOT_STROKE}
                                                    strokeWidth={1.2}
                                                    onClick={!sensor ? () => addControllerNtcLineSensorAtSlot(slot.lineKey, slot.lineIndex, slot.type) : undefined}
                                                    onTap={!sensor ? () => addControllerNtcLineSensorAtSlot(slot.lineKey, slot.lineIndex, slot.type) : undefined}
                                                />
                                                {sensor && sensorImage && (
                                                    <Image
                                                        image={sensorImage}
                                                        x={sensorRenderX}
                                                        y={sensorRenderY}
                                                        width={sensorRenderSize.width}
                                                        height={sensorRenderSize.height}
                                                        listening={false}
                                                    />
                                                )}
                                                {showPorts && sensor && sensorPorts.map((port) => (
                                                    <Circle
                                                        key={`ecosmart-ntc-port-${slot.key}-${port.name}`}
                                                        x={sensorRenderX + port.x * sensorRenderSize.width}
                                                        y={sensorRenderY + port.y * sensorRenderSize.height}
                                                        radius={2.5}
                                                        fill="red"
                                                        listening={false}
                                                    />
                                                ))}
                                                {showPorts && sensor && controllerPortA && controllerPortB && (
                                                    <>
                                                        <Circle x={controllerPortA.x} y={controllerPortA.y} radius={2.5} fill="red" listening={false} />
                                                        <Circle x={controllerPortB.x} y={controllerPortB.y} radius={2.5} fill="red" listening={false} />
                                                    </>
                                                )}
                                                 {sensor && (
                                                     <>
                                                         <Rect x={slotX} y={y - (INFO_BLOCK_HEIGHT + 4)} width={slotWidth} height={INFO_BLOCK_HEIGHT} cornerRadius={1} fill={INFO_BLOCK_FILL} stroke={INFO_BLOCK_STROKE} strokeWidth={INFO_BLOCK_STROKE_WIDTH} />
                                                         <EditableInfoTitle x={slotX + 3} y={y - (INFO_BLOCK_HEIGHT + 4)} width={Math.max(30, slotWidth - 6)} height={INFO_BLOCK_HEIGHT} text={sensorTitle} fontSize={4} fill={INFO_BLOCK_TEXT_COLOR} align="center" verticalAlign="middle" device={sensor} title={sensorTitle} />
                                                         {isBundledSensorDevice(memoBundledSensorDevices, sensor) && <KitBadge x={slotX} y={y + 1} />}
                                                     </>
                                                 )}
                                                {sensor && isHovered && (
                                                    <SlotDeleteButton compact x={slotX + slotWidth - 2.5} y={y + 1.5} onRemove={() => removeControllerNtcLineSensorAtSlot(slot.lineKey, slot.lineIndex)} />
                                                )}
                                                 {!sensor && showEmptySlots && (
                                                     <>
                                                         <Circle
                                                            x={slotX + slotWidth / 2}
                                                            y={y + slotHeight / 2}
                                                            radius={10}
                                                            fill={ADD_ACTION_FILL}
                                                            onClick={() => addControllerNtcLineSensorAtSlot(slot.lineKey, slot.lineIndex, slot.type)}
                                                            onTap={() => addControllerNtcLineSensorAtSlot(slot.lineKey, slot.lineIndex, slot.type)}
                                                        />
                                                        <EditableInfoTitle x={slotX + slotWidth / 2} y={y + slotHeight / 2} text="+" fontSize={15} fill={ADD_ACTION_TEXT_FILL} offsetX={4.5} offsetY={6} listening={false} />
                                                    </>
                                                )}
                                            </Group>
                                        );
                                    });
                                })()}
                                {(() => {
                                    if (controllerType !== 'ecosmart') return null;
                                    const servoDevice = getControllerLineDevices(scheme, '220_servo_devices')[0] || null;
                                    if (!servoDevice && !showEmptySlots) return null;

                                    const controllerServoPorts = {
                                        vplus: getPortPosition(ports, 'RELAY-6-V+', 0, 0, controllerImage.width, controllerImage.height),
                                        a: getPortPosition(ports, 'RELAY-6-A', 0, 0, controllerImage.width, controllerImage.height),
                                        b: getPortPosition(ports, 'RELAY-6-B', 0, 0, controllerImage.width, controllerImage.height),
                                        gnd: getPortPosition(ports, 'RELAY-6-GND', 0, 0, controllerImage.width, controllerImage.height),
                                    };
                                    if (!controllerServoPorts.vplus || !controllerServoPorts.a || !controllerServoPorts.b || !controllerServoPorts.gnd) return null;

                                    const imageKey = '220servo-right-ports';
                                    const image = wirelessImages[imageKey] || null;
                                    const servoPorts = wirelessPortsByType[imageKey] || [];
                                    const slotWidth = 8 * indentSize;
                                    const slotHeight = image?.width && image?.height
                                        ? image.height * (slotWidth / image.width)
                                        : 7 * indentSize;
                                    const slotX = -slotWidth + 4 * indentSize;
                                    const slotY = controllerImage.height - slotHeight - 8 * indentSize;
                                    const renderSize = { width: slotWidth, height: slotHeight };
                                    const renderX = slotX + (slotWidth - renderSize.width) / 2;
                                    const renderY = slotY + (slotHeight - renderSize.height) / 2;
                                    const getServoPortPos = (name, fallbackY) => {
                                        const port = servoPorts.find((item) => item.name === name) || null;
                                        return port
                                            ? { x: renderX + port.x * renderSize.width, y: renderY + port.y * renderSize.height }
                                            : { x: renderX + renderSize.width, y: fallbackY };
                                    };
                                    const targetPorts = {
                                        vplus: getServoPortPos('RELAY-IN-V+', slotY + slotHeight * 0.25),
                                        a: getServoPortPos('RELAY-IN-1', slotY + slotHeight * 0.45),
                                        b: getServoPortPos('RELAY-IN-2', slotY + slotHeight * 0.6),
                                        gnd: getServoPortPos('RELAY-IN-GND', slotY + slotHeight * 0.75),
                                    };
                                    const servoDevices = [
                                        ...getControllerLineDevices(scheme, '220_servo_devices'),
                                        ...(Array.isArray(scheme?.wired_devices) ? scheme.wired_devices : []).filter((device) => canonicalDeviceType(device?.type) === '220servo'),
                                    ];
                                     const servoIndex = servoDevice
                                         ? Math.max(0, servoDevices.findIndex((item) => {
                                             if (servoDevice?.id != null && item?.id != null) return servoDevice.id === item.id;
                                             return servoDevice === item;
                                         })) + 1
                                         : 0;
                                     const servoTitle = getDeviceStoredTitle(servoDevice) || (servoIndex > 0 ? `Сервопривод смесителя ${servoIndex}` : 'Сервопривод смесителя');
                                     const hoverKey = 'ecosmart-220servo6';
                                     const isHovered = hoveredNtcSlotKey === hoverKey;

                                     return (
                                         <Group
                                             onMouseEnter={() => setHoveredNtcSlotKey(hoverKey)}
                                             onMouseLeave={() => setHoveredNtcSlotKey((prev) => (prev === hoverKey ? null : prev))}
                                         >
                                            {(servoDevice || showEmptySlots) && (
                                                <>
                                                    <Line points={[targetPorts.vplus.x, targetPorts.vplus.y, targetPorts.vplus.x + indentSize, targetPorts.vplus.y, controllerServoPorts.vplus.x, targetPorts.vplus.y, controllerServoPorts.vplus.x, controllerServoPorts.vplus.y]} stroke="#1565c0" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                    <Line points={[targetPorts.a.x, targetPorts.a.y, targetPorts.a.x + indentSize, targetPorts.a.y, controllerServoPorts.a.x, targetPorts.a.y, controllerServoPorts.a.x, controllerServoPorts.a.y]} stroke="#d32f2f" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                    <Line points={[targetPorts.b.x, targetPorts.b.y, targetPorts.b.x + indentSize, targetPorts.b.y, controllerServoPorts.b.x, targetPorts.b.y, controllerServoPorts.b.x, controllerServoPorts.b.y]} stroke="#d32f2f" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                    <Line points={[targetPorts.gnd.x, targetPorts.gnd.y, targetPorts.gnd.x + indentSize, targetPorts.gnd.y, controllerServoPorts.gnd.x, targetPorts.gnd.y, controllerServoPorts.gnd.x, controllerServoPorts.gnd.y]} stroke="#fbc02d" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                </>
                                            )}
                                             <Rect x={slotX} y={slotY} width={slotWidth} height={slotHeight} cornerRadius={6} fill={servoDevice ? TRANSPARENT_FILL : EMPTY_SLOT_FILL} stroke={servoDevice ? TRANSPARENT_FILL : EMPTY_SLOT_STROKE} strokeWidth={1.2} onClick={!servoDevice ? () => addEcosmartServo(0) : undefined} onTap={!servoDevice ? () => addEcosmartServo(0) : undefined} />
                                             {!servoDevice && showEmptySlots && (
                                                 <>
                                                     <Circle x={slotX + slotWidth / 2} y={slotY + slotHeight / 2} radius={10} fill={ADD_ACTION_FILL} onClick={() => addEcosmartServo(0)} onTap={() => addEcosmartServo(0)} />
                                                     <Text x={slotX + slotWidth / 2} y={slotY + slotHeight / 2} text="+" fontSize={15} fill={ADD_ACTION_TEXT_FILL} offsetX={4.5} offsetY={6} listening={false} />
                                                 </>
                                             )}
                                             {servoDevice && image && <Image image={image} x={renderX} y={renderY} width={renderSize.width} height={renderSize.height} listening={false} />}
                                             {servoDevice && isHovered && (
                                                 <SlotDeleteButton compact x={slotX + slotWidth - 2.5} y={slotY + 1.5} onRemove={() => removeEcosmartServo(0, hoverKey)} />
                                             )}
                                            {servoDevice && (
                                                <>
                                                    <Rect x={slotX} y={slotY - (INFO_BLOCK_HEIGHT + 4)} width={slotWidth} height={INFO_BLOCK_HEIGHT} cornerRadius={1} fill={INFO_BLOCK_FILL} stroke={INFO_BLOCK_STROKE} strokeWidth={INFO_BLOCK_STROKE_WIDTH} />
                                                    <EditableInfoTitle x={slotX + 3} y={slotY - (INFO_BLOCK_HEIGHT + 4)} width={Math.max(30, slotWidth - 6)} height={INFO_BLOCK_HEIGHT} text={servoTitle} fontSize={4} fill={INFO_BLOCK_TEXT_COLOR} align="center" verticalAlign="middle" device={servoDevice} title={servoTitle} />
                                                </>
                                            )}
                                            {showPorts && servoDevice && (
                                                <>
                                                    {Object.entries(controllerServoPorts).map(([key, port]) => <Circle key={`ecosmart-220servo-controller-port-${key}`} x={port.x} y={port.y} radius={2.5} fill="red" listening={false} />)}
                                                    {servoPorts.map((port) => <Circle key={`ecosmart-220servo-port-${port.name}`} x={renderX + port.x * renderSize.width} y={renderY + port.y * renderSize.height} radius={2.5} fill="red" listening={false} />)}
                                                </>
                                            )}
                                        </Group>
                                    );
                                })()}
                                {(() => {
                                     if (controllerType !== 'ecosmart') return null;
                                     const pumpDevice = getControllerLineDevices(scheme, 'relay_220pump5_devices')[0] || null;
                                     if (!pumpDevice && !showEmptySlots) return null;

                                    const controllerPumpPorts = {
                                        a: getPortPosition(ports, 'RELAY-5-A 220PUMP', 0, 0, controllerImage.width, controllerImage.height),
                                        b: getPortPosition(ports, 'RELAY-5-B 220PUMP', 0, 0, controllerImage.width, controllerImage.height),
                                        gnd: getPortPosition(ports, 'RELAY-5-GND 220PUMP', 0, 0, controllerImage.width, controllerImage.height),
                                    };
                                    if (!controllerPumpPorts.a || !controllerPumpPorts.b || !controllerPumpPorts.gnd) return null;

                                    const servoImage = wirelessImages['220servo-right-ports'] || null;
                                    const imageKey = 'pump-220v-right-port';
                                    const image = wirelessImages[imageKey] || null;
                                    const pumpPorts = wirelessPortsByType[imageKey] || [];
                                    const slotWidth = 8 * indentSize;
                                    const servoSlotHeight = servoImage?.width && servoImage?.height
                                        ? servoImage.height * (slotWidth / servoImage.width)
                                        : 7 * indentSize;
                                    const slotHeight = image?.width && image?.height
                                        ? image.height * (slotWidth / image.width)
                                        : 8 * indentSize;
                                    const slotX = -slotWidth + 4 * indentSize;
                                    const slotY = controllerImage.height - 4 * indentSize;
                                    const renderSize = { width: slotWidth, height: slotHeight };
                                    const renderX = slotX + (slotWidth - renderSize.width) / 2;
                                    const renderY = slotY + (slotHeight - renderSize.height) / 2;
                                    const getPumpPortPos = (name, fallbackY) => {
                                        const port = pumpPorts.find((item) => item.name === name) || null;
                                        return port
                                            ? { x: renderX + port.x * renderSize.width, y: renderY + port.y * renderSize.height }
                                            : { x: renderX + renderSize.width, y: fallbackY };
                                    };
                                    const targetPorts = {
                                        a: getPumpPortPos('RELAY-IN A', slotY + slotHeight * 0.45),
                                        b: getPumpPortPos('RELAY-IN B', slotY + slotHeight * 0.6),
                                        gnd: getPumpPortPos('RELAY-IN-GND', slotY + slotHeight * 0.3),
                                    };
                                    const pumpDevices = [
                                        ...getControllerLineDevices(scheme, 'relay_220pump_devices'),
                                        ...getControllerLineDevices(scheme, 'relay_220pump5_devices'),
                                        ...(Array.isArray(scheme?.wired_devices) ? scheme.wired_devices : []).filter((device) => canonicalDeviceType(device?.type) === 'pump-220v'),
                                    ];
                                     const pumpIndex = pumpDevice
                                         ? Math.max(0, pumpDevices.findIndex((item) => {
                                             if (pumpDevice?.id != null && item?.id != null) return pumpDevice.id === item.id;
                                             return pumpDevice === item;
                                         })) + 1
                                         : 0;
                                     const pumpTitle = getDeviceStoredTitle(pumpDevice) || (pumpIndex > 0 ? `Насос 220V ${pumpIndex}` : 'Насос 220V');
                                     const hoverKey = 'ecosmart-220pump5';
                                     const isHovered = hoveredNtcSlotKey === hoverKey;

                                     return (
                                         <Group
                                             onMouseEnter={() => setHoveredNtcSlotKey(hoverKey)}
                                             onMouseLeave={() => setHoveredNtcSlotKey((prev) => (prev === hoverKey ? null : prev))}
                                         >
                                            {(pumpDevice || showEmptySlots) && (
                                                <>
                                                    <Line points={[targetPorts.a.x, targetPorts.a.y, targetPorts.a.x + indentSize, targetPorts.a.y, controllerPumpPorts.a.x, targetPorts.a.y, controllerPumpPorts.a.x, controllerPumpPorts.a.y]} stroke="#1565c0" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                    <Line points={[targetPorts.b.x, targetPorts.b.y, targetPorts.b.x + indentSize, targetPorts.b.y, controllerPumpPorts.b.x, targetPorts.b.y, controllerPumpPorts.b.x, controllerPumpPorts.b.y]} stroke="#d32f2f" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                    <Line points={[targetPorts.gnd.x, targetPorts.gnd.y, targetPorts.gnd.x + indentSize, targetPorts.gnd.y, controllerPumpPorts.gnd.x, targetPorts.gnd.y, controllerPumpPorts.gnd.x, controllerPumpPorts.gnd.y]} stroke="#fbc02d" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                </>
                                            )}
                                             <Rect x={slotX} y={slotY} width={slotWidth} height={slotHeight} cornerRadius={6} fill={pumpDevice ? TRANSPARENT_FILL : EMPTY_SLOT_FILL} stroke={pumpDevice ? TRANSPARENT_FILL : EMPTY_SLOT_STROKE} strokeWidth={1.2} onClick={!pumpDevice ? () => addEcosmartPump('relay_220pump5_devices', 'pump-220v') : undefined} onTap={!pumpDevice ? () => addEcosmartPump('relay_220pump5_devices', 'pump-220v') : undefined} />
                                             {!pumpDevice && showEmptySlots && (
                                                 <>
                                                     <Circle x={slotX + slotWidth / 2} y={slotY + slotHeight / 2} radius={10} fill={ADD_ACTION_FILL} onClick={() => addEcosmartPump('relay_220pump5_devices', 'pump-220v')} onTap={() => addEcosmartPump('relay_220pump5_devices', 'pump-220v')} />
                                                     <Text x={slotX + slotWidth / 2} y={slotY + slotHeight / 2} text="+" fontSize={15} fill={ADD_ACTION_TEXT_FILL} offsetX={4.5} offsetY={6} listening={false} />
                                                 </>
                                             )}
                                             {pumpDevice && image && <Image image={image} x={renderX} y={renderY} width={renderSize.width} height={renderSize.height} listening={false} />}
                                             {pumpDevice && isHovered && (
                                                 <SlotDeleteButton compact x={slotX + slotWidth - 2.5} y={slotY + 1.5} onRemove={() => removeEcosmartPump('relay_220pump5_devices', hoverKey)} />
                                             )}
                                            {pumpDevice && (
                                                <>
                                                    <Rect x={slotX} y={slotY - (INFO_BLOCK_HEIGHT + 4)} width={slotWidth} height={INFO_BLOCK_HEIGHT} cornerRadius={1} fill={INFO_BLOCK_FILL} stroke={INFO_BLOCK_STROKE} strokeWidth={INFO_BLOCK_STROKE_WIDTH} />
                                                    <EditableInfoTitle x={slotX + 3} y={slotY - (INFO_BLOCK_HEIGHT + 4)} width={Math.max(30, slotWidth - 6)} height={INFO_BLOCK_HEIGHT} text={pumpTitle} fontSize={4} fill={INFO_BLOCK_TEXT_COLOR} align="center" verticalAlign="middle" device={pumpDevice} title={pumpTitle} />
                                                </>
                                            )}
                                            {showPorts && pumpDevice && (
                                                <>
                                                    {Object.entries(controllerPumpPorts).map(([key, port]) => <Circle key={`ecosmart-220pump5-controller-port-${key}`} x={port.x} y={port.y} radius={2.5} fill="red" listening={false} />)}
                                                    {pumpPorts.map((port) => <Circle key={`ecosmart-220pump5-port-${port.name}`} x={renderX + port.x * renderSize.width} y={renderY + port.y * renderSize.height} radius={2.5} fill="red" listening={false} />)}
                                                </>
                                            )}
                                        </Group>
                                    );
                                })()}
                                {(() => {
                                     if (controllerType !== 'ecosmart') return null;
                                     const servoLine = getControllerLineDevices(scheme, '220_servo_devices');
                                     const servoDevice = servoLine[1] || null;
                                     if (!servoDevice && !showEmptySlots) return null;

                                    const relay5Ports = {
                                        a: getPortPosition(ports, 'RELAY-5-A 220PUMP', 0, 0, controllerImage.width, controllerImage.height),
                                        b: getPortPosition(ports, 'RELAY-5-B 220PUMP', 0, 0, controllerImage.width, controllerImage.height),
                                        gnd: getPortPosition(ports, 'RELAY-5-GND 220PUMP', 0, 0, controllerImage.width, controllerImage.height),
                                    };
                                    if (!relay5Ports.a || !relay5Ports.b || !relay5Ports.gnd) return null;
                                    const relayStep = relay5Ports.b.x - relay5Ports.a.x;
                                    const controllerServoPorts = {
                                        vplus: getPortPosition(ports, 'RELAY-4-V+', 0, 0, controllerImage.width, controllerImage.height) || { x: relay5Ports.gnd.x + 2 * relayStep, y: relay5Ports.gnd.y },
                                        a: getPortPosition(ports, 'RELAY-4-A', 0, 0, controllerImage.width, controllerImage.height) || { x: relay5Ports.gnd.x + 3 * relayStep, y: relay5Ports.a.y },
                                        b: getPortPosition(ports, 'RELAY-4-B', 0, 0, controllerImage.width, controllerImage.height) || { x: relay5Ports.gnd.x + 4 * relayStep, y: relay5Ports.b.y },
                                        gnd: getPortPosition(ports, 'RELAY-4-GND', 0, 0, controllerImage.width, controllerImage.height) || { x: relay5Ports.gnd.x + 5 * relayStep, y: relay5Ports.gnd.y },
                                    };

                                    const imageKey = '220servo-right-ports';
                                    const image = wirelessImages[imageKey] || null;
                                    const servoPorts = wirelessPortsByType[imageKey] || [];
                                    const slotWidth = 8 * indentSize;
                                    const slotHeight = image?.width && image?.height
                                        ? image.height * (slotWidth / image.width)
                                        : 7 * indentSize;
                                    const slotX = -slotWidth + 4 * indentSize;
                                    const slotY = controllerImage.height + 8 * indentSize;
                                    const renderSize = image ? getContainSize(image, slotWidth, slotHeight) : { width: slotWidth, height: slotHeight };
                                    const renderX = slotX + (slotWidth - renderSize.width) / 2;
                                    const renderY = slotY + (slotHeight - renderSize.height) / 2;
                                    const getServoPortPos = (name, fallbackY) => {
                                        const port = servoPorts.find((item) => item.name === name) || null;
                                        return port
                                            ? { x: renderX + port.x * renderSize.width, y: renderY + port.y * renderSize.height }
                                            : { x: renderX + renderSize.width, y: fallbackY };
                                    };
                                    const targetPorts = {
                                        vplus: getServoPortPos('RELAY-IN-V+', slotY + slotHeight * 0.25),
                                        a: getServoPortPos('RELAY-IN-1', slotY + slotHeight * 0.45),
                                        b: getServoPortPos('RELAY-IN-2', slotY + slotHeight * 0.6),
                                        gnd: getServoPortPos('RELAY-IN-GND', slotY + slotHeight * 0.75),
                                    };
                                    const servoDevices = [
                                        ...servoLine,
                                        ...(Array.isArray(scheme?.wired_devices) ? scheme.wired_devices : []).filter((device) => canonicalDeviceType(device?.type) === '220servo'),
                                    ];
                                     const servoIndex = servoDevice
                                         ? Math.max(0, servoDevices.findIndex((item) => {
                                             if (servoDevice?.id != null && item?.id != null) return servoDevice.id === item.id;
                                             return servoDevice === item;
                                         })) + 1
                                         : 0;
                                     const servoTitle = getDeviceStoredTitle(servoDevice) || (servoIndex > 0 ? `Сервопривод смесителя ${servoIndex}` : 'Сервопривод смесителя');
                                     const hoverKey = 'ecosmart-220servo4';
                                     const isHovered = hoveredNtcSlotKey === hoverKey;

                                     return (
                                         <Group
                                             onMouseEnter={() => setHoveredNtcSlotKey(hoverKey)}
                                             onMouseLeave={() => setHoveredNtcSlotKey((prev) => (prev === hoverKey ? null : prev))}
                                         >
                                            {(servoDevice || showEmptySlots) && (
                                                <>
                                                    <Line points={[targetPorts.vplus.x, targetPorts.vplus.y, targetPorts.vplus.x + indentSize, targetPorts.vplus.y, controllerServoPorts.vplus.x, targetPorts.vplus.y, controllerServoPorts.vplus.x, controllerServoPorts.vplus.y]} stroke="#1565c0" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                    <Line points={[targetPorts.a.x, targetPorts.a.y, targetPorts.a.x + indentSize, targetPorts.a.y, controllerServoPorts.a.x, targetPorts.a.y, controllerServoPorts.a.x, controllerServoPorts.a.y]} stroke="#d32f2f" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                    <Line points={[targetPorts.b.x, targetPorts.b.y, targetPorts.b.x + indentSize, targetPorts.b.y, controllerServoPorts.b.x, targetPorts.b.y, controllerServoPorts.b.x, controllerServoPorts.b.y]} stroke="#d32f2f" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                    <Line points={[targetPorts.gnd.x, targetPorts.gnd.y, targetPorts.gnd.x + indentSize, targetPorts.gnd.y, controllerServoPorts.gnd.x, targetPorts.gnd.y, controllerServoPorts.gnd.x, controllerServoPorts.gnd.y]} stroke="#fbc02d" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                </>
                                            )}
                                             <Rect x={slotX} y={slotY} width={slotWidth} height={slotHeight} cornerRadius={6} fill={servoDevice ? TRANSPARENT_FILL : EMPTY_SLOT_FILL} stroke={servoDevice ? TRANSPARENT_FILL : EMPTY_SLOT_STROKE} strokeWidth={1.2} onClick={!servoDevice ? () => addEcosmartServo(1) : undefined} onTap={!servoDevice ? () => addEcosmartServo(1) : undefined} />
                                             {!servoDevice && showEmptySlots && (
                                                 <>
                                                     <Circle x={slotX + slotWidth / 2} y={slotY + slotHeight / 2} radius={10} fill={ADD_ACTION_FILL} onClick={() => addEcosmartServo(1)} onTap={() => addEcosmartServo(1)} />
                                                     <Text x={slotX + slotWidth / 2} y={slotY + slotHeight / 2} text="+" fontSize={15} fill={ADD_ACTION_TEXT_FILL} offsetX={4.5} offsetY={6} listening={false} />
                                                 </>
                                             )}
                                             {servoDevice && image && <Image image={image} x={renderX} y={renderY} width={renderSize.width} height={renderSize.height} listening={false} />}
                                             {servoDevice && isHovered && (
                                                 <SlotDeleteButton compact x={slotX + slotWidth - 2.5} y={slotY + 1.5} onRemove={() => removeEcosmartServo(1, hoverKey)} />
                                             )}
                                            {servoDevice && (
                                                <>
                                                    <Rect x={slotX} y={slotY - (INFO_BLOCK_HEIGHT + 4)} width={slotWidth} height={INFO_BLOCK_HEIGHT} cornerRadius={1} fill={INFO_BLOCK_FILL} stroke={INFO_BLOCK_STROKE} strokeWidth={INFO_BLOCK_STROKE_WIDTH} />
                                                    <EditableInfoTitle x={slotX + 3} y={slotY - (INFO_BLOCK_HEIGHT + 4)} width={Math.max(30, slotWidth - 6)} height={INFO_BLOCK_HEIGHT} text={servoTitle} fontSize={4} fill={INFO_BLOCK_TEXT_COLOR} align="center" verticalAlign="middle" device={servoDevice} title={servoTitle} />
                                                </>
                                            )}
                                            {showPorts && servoDevice && (
                                                <>
                                                    {Object.entries(controllerServoPorts).map(([key, port]) => <Circle key={`ecosmart-220servo4-controller-port-${key}`} x={port.x} y={port.y} radius={2.5} fill="red" listening={false} />)}
                                                    {servoPorts.map((port) => <Circle key={`ecosmart-220servo4-port-${port.name}`} x={renderX + port.x * renderSize.width} y={renderY + port.y * renderSize.height} radius={2.5} fill="red" listening={false} />)}
                                                </>
                                            )}
                                        </Group>
                                    );
                                })()}
                                {(() => {
                                     if (controllerType !== 'ecosmart') return null;
                                     const pumpDevice = getControllerLineDevices(scheme, 'relay_220pump3_devices')[0] || null;
                                     if (!pumpDevice && !showEmptySlots) return null;

                                    const relay5Ports = {
                                        a: getPortPosition(ports, 'RELAY-5-A 220PUMP', 0, 0, controllerImage.width, controllerImage.height),
                                        b: getPortPosition(ports, 'RELAY-5-B 220PUMP', 0, 0, controllerImage.width, controllerImage.height),
                                        gnd: getPortPosition(ports, 'RELAY-5-GND 220PUMP', 0, 0, controllerImage.width, controllerImage.height),
                                    };
                                    if (!relay5Ports.a || !relay5Ports.b || !relay5Ports.gnd) return null;
                                    const relayStep = relay5Ports.b.x - relay5Ports.a.x;
                                    const controllerPumpPorts = {
                                        a: getPortPosition(ports, 'RELAY-3-A 220PUMP', 0, 0, controllerImage.width, controllerImage.height) || { x: relay5Ports.gnd.x + 6 * relayStep, y: relay5Ports.a.y },
                                        b: getPortPosition(ports, 'RELAY-3-B 220PUMP', 0, 0, controllerImage.width, controllerImage.height) || { x: relay5Ports.gnd.x + 7 * relayStep, y: relay5Ports.b.y },
                                        gnd: getPortPosition(ports, 'RELAY-3-GND 220PUMP', 0, 0, controllerImage.width, controllerImage.height) || { x: relay5Ports.gnd.x + 8 * relayStep, y: relay5Ports.gnd.y },
                                    };

                                    const servoImage = wirelessImages['220servo-right-ports'] || null;
                                    const imageKey = 'pump-220v-right-port';
                                    const image = wirelessImages[imageKey] || null;
                                    const pumpPorts = wirelessPortsByType[imageKey] || [];
                                    const slotWidth = 8 * indentSize;
                                    const servoSlotHeight = servoImage?.width && servoImage?.height
                                        ? servoImage.height * (slotWidth / servoImage.width)
                                        : 7 * indentSize;
                                    const slotHeight = image?.width && image?.height
                                        ? image.height * (slotWidth / image.width)
                                        : 8 * indentSize;
                                    const slotX = -slotWidth + 4 * indentSize;
                                    const slotY = controllerImage.height + 8 * indentSize + servoSlotHeight + 4 * indentSize;
                                    const renderSize = image ? getContainSize(image, slotWidth, slotHeight) : { width: slotWidth, height: slotHeight };
                                    const renderX = slotX + (slotWidth - renderSize.width) / 2;
                                    const renderY = slotY + (slotHeight - renderSize.height) / 2;
                                    const getPumpPortPos = (name, fallbackY) => {
                                        const port = pumpPorts.find((item) => item.name === name) || null;
                                        return port
                                            ? { x: renderX + port.x * renderSize.width, y: renderY + port.y * renderSize.height }
                                            : { x: renderX + renderSize.width, y: fallbackY };
                                    };
                                    const targetPorts = {
                                        a: getPumpPortPos('RELAY-IN A', slotY + slotHeight * 0.45),
                                        b: getPumpPortPos('RELAY-IN B', slotY + slotHeight * 0.6),
                                        gnd: getPumpPortPos('RELAY-IN-GND', slotY + slotHeight * 0.3),
                                    };
                                    const pumpDevices = [
                                        ...getControllerLineDevices(scheme, 'relay_220pump_devices'),
                                        ...getControllerLineDevices(scheme, 'relay_220pump5_devices'),
                                        ...getControllerLineDevices(scheme, 'relay_220pump3_devices'),
                                        ...(Array.isArray(scheme?.wired_devices) ? scheme.wired_devices : []).filter((device) => canonicalDeviceType(device?.type) === 'pump-220v'),
                                    ];
                                     const pumpIndex = pumpDevice
                                         ? Math.max(0, pumpDevices.findIndex((item) => {
                                             if (pumpDevice?.id != null && item?.id != null) return pumpDevice.id === item.id;
                                             return pumpDevice === item;
                                         })) + 1
                                         : 0;
                                     const pumpTitle = getDeviceStoredTitle(pumpDevice) || (pumpIndex > 0 ? `Насос 220V ${pumpIndex}` : 'Насос 220V');
                                     const hoverKey = 'ecosmart-220pump3';
                                     const isHovered = hoveredNtcSlotKey === hoverKey;

                                     return (
                                         <Group
                                             onMouseEnter={() => setHoveredNtcSlotKey(hoverKey)}
                                             onMouseLeave={() => setHoveredNtcSlotKey((prev) => (prev === hoverKey ? null : prev))}
                                         >
                                            {(pumpDevice || showEmptySlots) && (
                                                <>
                                                     <Line points={[targetPorts.a.x, targetPorts.a.y, targetPorts.a.x + indentSize, targetPorts.a.y, controllerPumpPorts.a.x, targetPorts.a.y, controllerPumpPorts.a.x, controllerPumpPorts.a.y]} stroke="#1565c0" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                     <Line points={[targetPorts.b.x, targetPorts.b.y, targetPorts.b.x + indentSize, targetPorts.b.y, controllerPumpPorts.b.x, targetPorts.b.y, controllerPumpPorts.b.x, controllerPumpPorts.b.y]} stroke="#d32f2f" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                     <Line points={[targetPorts.gnd.x, targetPorts.gnd.y, targetPorts.gnd.x + indentSize, targetPorts.gnd.y, controllerPumpPorts.gnd.x, targetPorts.gnd.y, controllerPumpPorts.gnd.x, controllerPumpPorts.gnd.y]} stroke="#fbc02d" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                </>
                                            )}
                                             <Rect x={slotX} y={slotY} width={slotWidth} height={slotHeight} cornerRadius={6} fill={pumpDevice ? TRANSPARENT_FILL : EMPTY_SLOT_FILL} stroke={pumpDevice ? TRANSPARENT_FILL : EMPTY_SLOT_STROKE} strokeWidth={1.2} onClick={!pumpDevice ? () => addEcosmartPump('relay_220pump3_devices', 'pump-220v') : undefined} onTap={!pumpDevice ? () => addEcosmartPump('relay_220pump3_devices', 'pump-220v') : undefined} />
                                             {!pumpDevice && showEmptySlots && (
                                                 <>
                                                     <Circle x={slotX + slotWidth / 2} y={slotY + slotHeight / 2} radius={10} fill={ADD_ACTION_FILL} onClick={() => addEcosmartPump('relay_220pump3_devices', 'pump-220v')} onTap={() => addEcosmartPump('relay_220pump3_devices', 'pump-220v')} />
                                                     <Text x={slotX + slotWidth / 2} y={slotY + slotHeight / 2} text="+" fontSize={15} fill={ADD_ACTION_TEXT_FILL} offsetX={4.5} offsetY={6} listening={false} />
                                                 </>
                                             )}
                                             {pumpDevice && image && <Image image={image} x={renderX} y={renderY} width={renderSize.width} height={renderSize.height} listening={false} />}
                                             {pumpDevice && isHovered && (
                                                 <SlotDeleteButton compact x={slotX + slotWidth - 2.5} y={slotY + 1.5} onRemove={() => removeEcosmartPump('relay_220pump3_devices', hoverKey)} />
                                             )}
                                            {pumpDevice && (
                                                <>
                                                    <Rect x={slotX} y={slotY - (INFO_BLOCK_HEIGHT + 4)} width={slotWidth} height={INFO_BLOCK_HEIGHT} cornerRadius={1} fill={INFO_BLOCK_FILL} stroke={INFO_BLOCK_STROKE} strokeWidth={INFO_BLOCK_STROKE_WIDTH} />
                                                    <EditableInfoTitle x={slotX + 3} y={slotY - (INFO_BLOCK_HEIGHT + 4)} width={Math.max(30, slotWidth - 6)} height={INFO_BLOCK_HEIGHT} text={pumpTitle} fontSize={4} fill={INFO_BLOCK_TEXT_COLOR} align="center" verticalAlign="middle" device={pumpDevice} title={pumpTitle} />
                                                </>
                                            )}
                                            {showPorts && pumpDevice && (
                                                <>
                                                    {Object.entries(controllerPumpPorts).map(([key, port]) => <Circle key={`ecosmart-220pump3-controller-port-${key}`} x={port.x} y={port.y} radius={2.5} fill="red" listening={false} />)}
                                                    {pumpPorts.map((port) => <Circle key={`ecosmart-220pump3-port-${port.name}`} x={renderX + port.x * renderSize.width} y={renderY + port.y * renderSize.height} radius={2.5} fill="red" listening={false} />)}
                                                </>
                                            )}
                                        </Group>
                                    );
                                })()}
                                {(() => {
                                    if (controllerType !== 'ecosmart') return null;
                                    const valveDevice = getControllerLineDevices(scheme, 'relay_s_valve_devices')[0] || null;
                                    if (!valveDevice && !showEmptySlots) return null;

                                    const controllerValvePorts = {
                                        vplus: getPortPosition(ports, 'RELAY-S-1-V+ VALVE', 0, 0, controllerImage.width, controllerImage.height),
                                        a: getPortPosition(ports, 'RELAY-S-1-A VALVE', 0, 0, controllerImage.width, controllerImage.height),
                                        b: getPortPosition(ports, 'RELAY-S-1-B VALVE', 0, 0, controllerImage.width, controllerImage.height),
                                        gnd: getPortPosition(ports, 'RELAY-S-1-GND VALVE', 0, 0, controllerImage.width, controllerImage.height),
                                    };
                                    if (!controllerValvePorts.vplus || !controllerValvePorts.a || !controllerValvePorts.b || !controllerValvePorts.gnd) return null;

                                    const imageKey = 'valve-left-port';
                                    const image = wirelessImages[imageKey] || null;
                                    const valvePorts = wirelessPortsByType[imageKey] || [];
                                    const slotWidth = 80;
                                    const slotHeight = 50;
                                    const slotX = controllerImage.width;
                                    const slotY = controllerImage.height - slotHeight - 6 * indentSize;
                                    const renderSize = { width: slotWidth, height: slotHeight };
                                    const renderX = slotX + (slotWidth - renderSize.width) / 2;
                                    const renderY = slotY + (slotHeight - renderSize.height) / 2;
                                    const getValvePort = (name, fallbackY) => {
                                        const port = valvePorts.find((item) => item.name === name) || null;
                                        return port
                                            ? {
                                                x: renderX + port.x * renderSize.width,
                                                y: renderY + port.y * renderSize.height,
                                            }
                                            : { x: slotX, y: fallbackY };
                                    };
                                    const targetPorts = {
                                        vplus: getValvePort('RELAY-IN-V+', slotY + slotHeight * 0.25),
                                        a: getValvePort('RELAY-IN-1', slotY + slotHeight * 0.42),
                                        b: getValvePort('RELAY-IN-2', slotY + slotHeight * 0.58),
                                        gnd: getValvePort('RELAY-IN-GND', slotY + slotHeight * 0.75),
                                    };
                                    const valveIndex = valveDevice
                                        ? Math.max(0, getControllerLineDevices(scheme, 'relay_s_valve_devices').findIndex((item) => {
                                            if (valveDevice?.id != null && item?.id != null) return valveDevice.id === item.id;
                                            return valveDevice === item;
                                        })) + 1
                                        : 0;
                                     const valveTitle = getDeviceStoredTitle(valveDevice) || (valveIndex > 0 ? `Запорный клапан ${valveIndex}` : 'Запорный клапан');
                                     const hoverKey = 'ecosmart-valve';
                                     const isHovered = hoveredNtcSlotKey === hoverKey;

                                     return (
                                         <Group
                                             onMouseEnter={() => setHoveredNtcSlotKey(hoverKey)}
                                             onMouseLeave={() => setHoveredNtcSlotKey((prev) => (prev === hoverKey ? null : prev))}
                                         >
                                            {(valveDevice || showEmptySlots) && (
                                                <>
                                                    <Line points={getOrthogonalLinkPoints(controllerValvePorts.vplus.x, controllerValvePorts.vplus.y, targetPorts.vplus.y, targetPorts.vplus.x, targetPorts.vplus.y)} stroke="#1565c0" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                    <Line points={getOrthogonalLinkPoints(controllerValvePorts.a.x, controllerValvePorts.a.y, targetPorts.a.y, targetPorts.a.x, targetPorts.a.y)} stroke="#d32f2f" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                    <Line points={getOrthogonalLinkPoints(controllerValvePorts.b.x, controllerValvePorts.b.y, targetPorts.b.y, targetPorts.b.x, targetPorts.b.y)} stroke="#d32f2f" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                    <Line points={getOrthogonalLinkPoints(controllerValvePorts.gnd.x, controllerValvePorts.gnd.y, targetPorts.gnd.y, targetPorts.gnd.x, targetPorts.gnd.y)} stroke="#fbc02d" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                </>
                                            )}
                                             <Rect
                                                 x={slotX}
                                                 y={slotY}
                                                 width={slotWidth}
                                                 height={slotHeight}
                                                 cornerRadius={6}
                                                 fill={valveDevice ? TRANSPARENT_FILL : EMPTY_SLOT_FILL}
                                                 stroke={valveDevice ? TRANSPARENT_FILL : EMPTY_SLOT_STROKE}
                                                 strokeWidth={1.2}
                                                 onClick={!valveDevice ? addEcosmartValve : undefined}
                                                 onTap={!valveDevice ? addEcosmartValve : undefined}
                                             />
                                             {!valveDevice && showEmptySlots && (
                                                 <>
                                                     <Circle
                                                         x={slotX + slotWidth / 2}
                                                         y={slotY + slotHeight / 2}
                                                         radius={10}
                                                         fill={ADD_ACTION_FILL}
                                                         onClick={addEcosmartValve}
                                                         onTap={addEcosmartValve}
                                                     />
                                                     <Text
                                                         x={slotX + slotWidth / 2}
                                                         y={slotY + slotHeight / 2}
                                                         text="+"
                                                         fontSize={15}
                                                         fill={INFO_BLOCK_FILL}
                                                         offsetX={4.5}
                                                         offsetY={6}
                                                         listening={false}
                                                     />
                                                 </>
                                             )}
                                              {valveDevice && image && <Image image={image} x={renderX} y={renderY} width={renderSize.width} height={renderSize.height} listening={false} />}
                                             {valveDevice && isHovered && (
                                                 <SlotDeleteButton compact x={slotX + slotWidth - 2.5} y={slotY + 1.5} onRemove={removeEcosmartValve} />
                                             )}
                                             {valveDevice && (
                                                <>
                                                    <Rect x={slotX} y={slotY - (INFO_BLOCK_HEIGHT + 4)} width={slotWidth} height={INFO_BLOCK_HEIGHT} cornerRadius={1} fill={INFO_BLOCK_FILL} stroke={INFO_BLOCK_STROKE} strokeWidth={INFO_BLOCK_STROKE_WIDTH} />
                                                    <EditableInfoTitle x={slotX + 3} y={slotY - (INFO_BLOCK_HEIGHT + 4)} width={Math.max(30, slotWidth - 6)} height={INFO_BLOCK_HEIGHT} text={valveTitle} fontSize={4} fill={INFO_BLOCK_TEXT_COLOR} align="center" verticalAlign="middle" device={valveDevice} title={valveTitle} />
                                                </>
                                            )}
                                            {showPorts && valveDevice && (
                                                <>
                                                    {Object.entries(controllerValvePorts).map(([key, port]) => <Circle key={`ecosmart-valve-controller-port-${key}`} x={port.x} y={port.y} radius={2.5} fill="red" listening={false} />)}
                                                    {valvePorts.map((port) => <Circle key={`ecosmart-valve-port-${port.name}`} x={renderX + port.x * renderSize.width} y={renderY + port.y * renderSize.height} radius={2.5} fill="red" listening={false} />)}
                                                </>
                                            )}
                                        </Group>
                                    );
                                })()}
                                {(() => {
                                    if (controllerType !== 'ecosmart') return null;
                                    const pumpDevice = getControllerLineDevices(scheme, 'relay_boiler_gvs_devices')[0] || null;
                                    if (!pumpDevice && !showEmptySlots) return null;

                                    const controllerPumpPorts = {
                                        a: getPortPosition(ports, 'RELAY-1-A BOILER-GVS', 0, 0, controllerImage.width, controllerImage.height),
                                        b: getPortPosition(ports, 'RELAY-1-B BOILER-GVS', 0, 0, controllerImage.width, controllerImage.height),
                                        gnd: getPortPosition(ports, 'RELAY-1-GND BOILER-GVS', 0, 0, controllerImage.width, controllerImage.height),
                                    };
                                    if (!controllerPumpPorts.a || !controllerPumpPorts.b || !controllerPumpPorts.gnd) return null;

                                    const valveImage = wirelessImages['valve-left-port'] || null;
                                    const valveSlotWidth = valveImage?.width || 6 * indentSize;
                                    const valveSlotHeight = valveImage?.height || 8 * indentSize;
                                    const valveSlotX = controllerImage.width;
                                    const valveSlotY = controllerImage.height - valveSlotHeight - 6 * indentSize;
                                    const imageKey = 'boiler-pump-left-port';
                                    const image = wirelessImages[imageKey] || null;
                                    const pumpPorts = wirelessPortsByType[imageKey] || [];
                                    const slotWidth = 8 * indentSize;
                                    const slotHeight = image?.width && image?.height
                                        ? image.height * (slotWidth / image.width)
                                        : 8 * indentSize;
                                    const slotX = valveSlotX;
                                    const slotY = valveSlotY + valveSlotHeight + 4 * indentSize;
                                    const renderSize = image ? getContainSize(image, slotWidth, slotHeight) : { width: slotWidth, height: slotHeight };
                                    const renderX = slotX + (slotWidth - renderSize.width) / 2;
                                    const renderY = slotY + (slotHeight - renderSize.height) / 2;
                                    const pumpPortA = pumpPorts.find((port) => port.name === 'RELAY-IN A') || null;
                                    const pumpPortB = pumpPorts.find((port) => port.name === 'RELAY-IN B') || null;
                                    const pumpPortGnd = pumpPorts.find((port) => port.name === 'RELAY-IN-GND') || null;
                                    const getPumpPortPos = (port, fallbackY) => (pumpDevice && port
                                        ? { x: renderX + port.x * renderSize.width, y: renderY + port.y * renderSize.height }
                                        : { x: slotX, y: fallbackY });
                                    const targetPorts = {
                                        a: getPumpPortPos(pumpPortA, slotY + slotHeight * 0.45),
                                        b: getPumpPortPos(pumpPortB, slotY + slotHeight * 0.6),
                                        gnd: getPumpPortPos(pumpPortGnd, slotY + slotHeight * 0.3),
                                    };
                                    const boilerPumpDevices = [
                                        ...getControllerLineDevices(scheme, 'relay_boiler_gvs_devices'),
                                        ...(Array.isArray(scheme?.wired_devices) ? scheme.wired_devices : []).filter((device) => canonicalDeviceType(device?.type) === 'boiler-pump'),
                                    ];
                                     const pumpIndex = pumpDevice
                                         ? Math.max(0, boilerPumpDevices.findIndex((item) => {
                                             if (pumpDevice?.id != null && item?.id != null) return pumpDevice.id === item.id;
                                             return pumpDevice === item;
                                         })) + 1
                                         : 0;
                                     const pumpTitle = getDeviceStoredTitle(pumpDevice) || (pumpIndex > 0 ? `Насос бойлера ${pumpIndex}` : 'Насос бойлера');
                                     const hoverKey = 'ecosmart-boiler-gvs-pump';
                                     const isHovered = hoveredNtcSlotKey === hoverKey;

                                     return (
                                         <Group
                                             onMouseEnter={() => setHoveredNtcSlotKey(hoverKey)}
                                             onMouseLeave={() => setHoveredNtcSlotKey((prev) => (prev === hoverKey ? null : prev))}
                                         >
                                            {(pumpDevice || showEmptySlots) && (
                                                <>
                                                    <Line points={[targetPorts.a.x, targetPorts.a.y, targetPorts.a.x - indentSize, targetPorts.a.y, controllerPumpPorts.a.x, targetPorts.a.y, controllerPumpPorts.a.x, controllerPumpPorts.a.y]} stroke="#d32f2f" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                    <Line points={[targetPorts.b.x, targetPorts.b.y, targetPorts.b.x - indentSize, targetPorts.b.y, controllerPumpPorts.b.x, targetPorts.b.y, controllerPumpPorts.b.x, controllerPumpPorts.b.y]} stroke="#1565c0" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                    <Line points={[targetPorts.gnd.x, targetPorts.gnd.y, targetPorts.gnd.x - indentSize, targetPorts.gnd.y, controllerPumpPorts.gnd.x, targetPorts.gnd.y, controllerPumpPorts.gnd.x, controllerPumpPorts.gnd.y]} stroke="#fbc02d" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                </>
                                            )}
                                             <Rect x={slotX} y={slotY} width={slotWidth} height={slotHeight} cornerRadius={6} fill={pumpDevice ? TRANSPARENT_FILL : EMPTY_SLOT_FILL} stroke={pumpDevice ? TRANSPARENT_FILL : EMPTY_SLOT_STROKE} strokeWidth={1.2} onClick={!pumpDevice ? () => addEcosmartPump('relay_boiler_gvs_devices', 'boiler-pump') : undefined} onTap={!pumpDevice ? () => addEcosmartPump('relay_boiler_gvs_devices', 'boiler-pump') : undefined} />
                                             {!pumpDevice && showEmptySlots && (
                                                 <>
                                                     <Circle x={slotX + slotWidth / 2} y={slotY + slotHeight / 2} radius={10} fill={ADD_ACTION_FILL} onClick={() => addEcosmartPump('relay_boiler_gvs_devices', 'boiler-pump')} onTap={() => addEcosmartPump('relay_boiler_gvs_devices', 'boiler-pump')} />
                                                     <Text x={slotX + slotWidth / 2} y={slotY + slotHeight / 2} text="+" fontSize={15} fill={ADD_ACTION_TEXT_FILL} offsetX={4.5} offsetY={6} listening={false} />
                                                 </>
                                             )}
                                             {pumpDevice && image && <Image image={image} x={renderX} y={renderY} width={renderSize.width} height={renderSize.height} listening={false} />}
                                             {pumpDevice && isHovered && (
                                                 <SlotDeleteButton compact x={slotX + slotWidth - 2.5} y={slotY + 1.5} onRemove={() => removeEcosmartPump('relay_boiler_gvs_devices', hoverKey)} />
                                             )}
                                            {pumpDevice && (
                                                <>
                                                    <Rect x={slotX} y={slotY - (INFO_BLOCK_HEIGHT + 4)} width={slotWidth} height={INFO_BLOCK_HEIGHT} cornerRadius={1} fill={INFO_BLOCK_FILL} stroke={INFO_BLOCK_STROKE} strokeWidth={INFO_BLOCK_STROKE_WIDTH} />
                                                    <EditableInfoTitle x={slotX + 3} y={slotY - (INFO_BLOCK_HEIGHT + 4)} width={Math.max(30, slotWidth - 6)} height={INFO_BLOCK_HEIGHT} text={pumpTitle} fontSize={4} fill={INFO_BLOCK_TEXT_COLOR} align="center" verticalAlign="middle" device={pumpDevice} title={pumpTitle} />
                                                </>
                                            )}
                                            {showPorts && pumpDevice && (
                                                <>
                                                    {Object.entries(controllerPumpPorts).map(([key, port]) => <Circle key={`ecosmart-boiler-gvs-controller-port-${key}`} x={port.x} y={port.y} radius={2.5} fill="red" listening={false} />)}
                                                    {pumpPorts.map((port) => <Circle key={`ecosmart-boiler-gvs-pump-port-${port.name}`} x={renderX + port.x * renderSize.width} y={renderY + port.y * renderSize.height} radius={2.5} fill="red" listening={false} />)}
                                                </>
                                            )}
                                        </Group>
                                    );
                                })()}
                                {(() => {
                                    if (controllerType !== 'ecosmart') return null;
                                    const pumpDevice = getControllerLineDevices(scheme, 'relay_220pump_devices')[0] || null;
                                    if (!pumpDevice && !showEmptySlots) return null;

                                    const controllerPumpPorts = {
                                        a: getPortPosition(ports, 'RELAY-2-A 220PUMP', 0, 0, controllerImage.width, controllerImage.height),
                                        b: getPortPosition(ports, 'RELAY-2-B 220PUMP', 0, 0, controllerImage.width, controllerImage.height),
                                        gnd: getPortPosition(ports, 'RELAY-2-GND 220PUMP', 0, 0, controllerImage.width, controllerImage.height),
                                    };
                                    if (!controllerPumpPorts.a || !controllerPumpPorts.b || !controllerPumpPorts.gnd) return null;

                                    const valveImage = wirelessImages['valve-left-port'] || null;
                                    const valveSlotHeight = valveImage?.height || 8 * indentSize;
                                    const valveSlotY = controllerImage.height - valveSlotHeight - 6 * indentSize;
                                    const boilerPumpImage = wirelessImages['boiler-pump-left-port'] || null;
                                    const boilerPumpSlotWidth = 8 * indentSize;
                                    const boilerPumpSlotHeight = boilerPumpImage?.width && boilerPumpImage?.height
                                        ? boilerPumpImage.height * (boilerPumpSlotWidth / boilerPumpImage.width)
                                        : 8 * indentSize;
                                    const boilerPumpSlotY = valveSlotY + valveSlotHeight + 4 * indentSize;
                                    const imageKey = 'pump-220v-left-port';
                                    const image = wirelessImages[imageKey] || null;
                                    const pumpPorts = wirelessPortsByType[imageKey] || [];
                                    const slotWidth = 8 * indentSize;
                                    const slotHeight = image?.width && image?.height
                                        ? image.height * (slotWidth / image.width)
                                        : 8 * indentSize;
                                    const slotX = controllerImage.width;
                                    const slotY = boilerPumpSlotY + boilerPumpSlotHeight + 2 * indentSize;
                                    const renderSize = image ? getContainSize(image, slotWidth, slotHeight) : { width: slotWidth, height: slotHeight };
                                    const renderX = slotX + (slotWidth - renderSize.width) / 2;
                                    const renderY = slotY + (slotHeight - renderSize.height) / 2;
                                    const pumpPortA = pumpPorts.find((port) => port.name === 'RELAY-IN A') || null;
                                    const pumpPortB = pumpPorts.find((port) => port.name === 'RELAY-IN B') || null;
                                    const pumpPortGnd = pumpPorts.find((port) => port.name === 'RELAY-IN-GND') || null;
                                    const getPumpPortPos = (port, fallbackY) => (pumpDevice && port
                                        ? { x: renderX + port.x * renderSize.width, y: renderY + port.y * renderSize.height }
                                        : { x: slotX, y: fallbackY });
                                    const targetPorts = {
                                        a: getPumpPortPos(pumpPortA, slotY + slotHeight * 0.45),
                                        b: getPumpPortPos(pumpPortB, slotY + slotHeight * 0.6),
                                        gnd: getPumpPortPos(pumpPortGnd, slotY + slotHeight * 0.3),
                                    };
                                    const pumpDevices = [
                                        ...getControllerLineDevices(scheme, 'relay_220pump_devices'),
                                        ...(Array.isArray(scheme?.wired_devices) ? scheme.wired_devices : []).filter((device) => canonicalDeviceType(device?.type) === 'pump-220v'),
                                    ];
                                     const pumpIndex = pumpDevice
                                         ? Math.max(0, pumpDevices.findIndex((item) => {
                                             if (pumpDevice?.id != null && item?.id != null) return pumpDevice.id === item.id;
                                             return pumpDevice === item;
                                         })) + 1
                                         : 0;
                                     const pumpTitle = getDeviceStoredTitle(pumpDevice) || (pumpIndex > 0 ? `Насос 220V ${pumpIndex}` : 'Насос 220V');
                                     const hoverKey = 'ecosmart-220pump';
                                     const isHovered = hoveredNtcSlotKey === hoverKey;

                                     return (
                                         <Group
                                             onMouseEnter={() => setHoveredNtcSlotKey(hoverKey)}
                                             onMouseLeave={() => setHoveredNtcSlotKey((prev) => (prev === hoverKey ? null : prev))}
                                         >
                                            {(pumpDevice || showEmptySlots) && (
                                                <>
                                                    <Line points={[targetPorts.a.x, targetPorts.a.y, targetPorts.a.x - indentSize, targetPorts.a.y, controllerPumpPorts.a.x, targetPorts.a.y, controllerPumpPorts.a.x, controllerPumpPorts.a.y]} stroke="#d32f2f" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                    <Line points={[targetPorts.b.x, targetPorts.b.y, targetPorts.b.x - indentSize, targetPorts.b.y, controllerPumpPorts.b.x, targetPorts.b.y, controllerPumpPorts.b.x, controllerPumpPorts.b.y]} stroke="#1565c0" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                    <Line points={[targetPorts.gnd.x, targetPorts.gnd.y, targetPorts.gnd.x - indentSize, targetPorts.gnd.y, controllerPumpPorts.gnd.x, targetPorts.gnd.y, controllerPumpPorts.gnd.x, controllerPumpPorts.gnd.y]} stroke="#fbc02d" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                </>
                                            )}
                                             <Rect x={slotX} y={slotY} width={slotWidth} height={slotHeight} cornerRadius={6} fill={pumpDevice ? TRANSPARENT_FILL : EMPTY_SLOT_FILL} stroke={pumpDevice ? TRANSPARENT_FILL : EMPTY_SLOT_STROKE} strokeWidth={1.2} onClick={!pumpDevice ? () => addEcosmartPump('relay_220pump_devices', 'pump-220v') : undefined} onTap={!pumpDevice ? () => addEcosmartPump('relay_220pump_devices', 'pump-220v') : undefined} />
                                             {!pumpDevice && showEmptySlots && (
                                                 <>
                                                     <Circle x={slotX + slotWidth / 2} y={slotY + slotHeight / 2} radius={10} fill={ADD_ACTION_FILL} onClick={() => addEcosmartPump('relay_220pump_devices', 'pump-220v')} onTap={() => addEcosmartPump('relay_220pump_devices', 'pump-220v')} />
                                                     <Text x={slotX + slotWidth / 2} y={slotY + slotHeight / 2} text="+" fontSize={15} fill={ADD_ACTION_TEXT_FILL} offsetX={4.5} offsetY={6} listening={false} />
                                                 </>
                                             )}
                                             {pumpDevice && image && <Image image={image} x={renderX} y={renderY} width={renderSize.width} height={renderSize.height} listening={false} />}
                                             {pumpDevice && isHovered && (
                                                 <SlotDeleteButton compact x={slotX + slotWidth - 2.5} y={slotY + 1.5} onRemove={() => removeEcosmartPump('relay_220pump_devices', hoverKey)} />
                                             )}
                                            {pumpDevice && (
                                                <>
                                                    <Rect x={slotX} y={slotY - (INFO_BLOCK_HEIGHT + 4)} width={slotWidth} height={INFO_BLOCK_HEIGHT} cornerRadius={1} fill={INFO_BLOCK_FILL} stroke={INFO_BLOCK_STROKE} strokeWidth={INFO_BLOCK_STROKE_WIDTH} />
                                                    <EditableInfoTitle x={slotX + 3} y={slotY - (INFO_BLOCK_HEIGHT + 4)} width={Math.max(30, slotWidth - 6)} height={INFO_BLOCK_HEIGHT} text={pumpTitle} fontSize={4} fill={INFO_BLOCK_TEXT_COLOR} align="center" verticalAlign="middle" device={pumpDevice} title={pumpTitle} />
                                                </>
                                            )}
                                            {showPorts && pumpDevice && (
                                                <>
                                                    {Object.entries(controllerPumpPorts).map(([key, port]) => <Circle key={`ecosmart-220pump-controller-port-${key}`} x={port.x} y={port.y} radius={2.5} fill="red" listening={false} />)}
                                                    {pumpPorts.map((port) => <Circle key={`ecosmart-220pump-port-${port.name}`} x={renderX + port.x * renderSize.width} y={renderY + port.y * renderSize.height} radius={2.5} fill="red" listening={false} />)}
                                                </>
                                            )}
                                        </Group>
                                    );
                                })()}
                                {(() => {
                                    const supportsPowerLine = (controllerType === 'pro' || controllerType === 'smart2') && !isControllerOnlyScheme(scheme);
                                    if (!supportsPowerLine) return null;

                                    const rawPowerModules = Array.isArray(scheme.power_modules) ? scheme.power_modules : [];
                                    const normalizedRaw = rawPowerModules
                                        .map((item, index) => {
                                            const type = normalizePowerModuleType(typeof item === 'string' ? item : item?.type);
                                            if (!type) return null;
                                            return { id: typeof item === 'object' && item?.id ? item.id : `${type}-${index}`, type };
                                        })
                                        .filter(Boolean);

                                    const upsModules = normalizedRaw.filter((item) => item.type === 'ups');
                                    const hasUps = upsModules.length > 0;
                                    const powerModules = [
                                        ...upsModules,
                                        { id: 'required-power-unit', type: 'power-unit' },
                                        { id: 'required-circuit-breaker', type: 'circuit-breaker' },
                                        ...(hasUps ? [{ id: 'required-battery', type: 'battery' }] : []),
                                    ];

                                    const minGap = 4 * indentSize;
                                    const getPowerModuleSize = (moduleDevice) => {
                                        const key = getWirelessDeviceImageKey(moduleDevice);
                                        const image = key ? wirelessImages[key] : null;
                                        if (!image?.width || !image?.height) return { width: 80, height: 80 };
                                        return { width: image.width, height: image.height };
                                    };

                                    const placements = [];
                                    let cursorX = -minGap;
                                    const inlinePowerModules = powerModules.filter((moduleDevice) => moduleDevice.type !== 'battery');
                                    inlinePowerModules.forEach((moduleDevice, index) => {
                                        const size = getPowerModuleSize(moduleDevice);
                                        cursorX -= size.width;
                                        placements.push({
                                            moduleDevice,
                                            index,
                                            x: cursorX,
                                            y: controllerImage.height - size.height,
                                            width: size.width,
                                            height: size.height,
                                        });
                                        cursorX -= minGap;
                                    });

                                    const upsPlacement = placements.find((item) => item.moduleDevice.type === 'ups');
                                    if (upsPlacement) {
                                        const batteryModule = powerModules.find((moduleDevice) => moduleDevice.type === 'battery');
                                        if (batteryModule) {
                                            const batterySize = getPowerModuleSize(batteryModule);
                                            placements.push({
                                                moduleDevice: batteryModule,
                                                index: placements.length,
                                                x: upsPlacement.x + (upsPlacement.width - batterySize.width) / 2,
                                                y: upsPlacement.y + upsPlacement.height + 11 * indentSize,
                                                width: batterySize.width,
                                                height: batterySize.height,
                                            });
                                        }
                                    }

                                    return (
                                        <>
                                            {showLineFrames && placements.length > 0 && (() => {
                                                const minX = Math.min(...placements.map((item) => item.x));
                                                const minY = Math.min(...placements.map((item) => item.y));
                                                const maxX = Math.max(...placements.map((item) => item.x + item.width));
                                                const maxY = Math.max(...placements.map((item) => item.y + item.height));
                                                return (
                                                    <Rect
                                                        x={minX - 10}
                                                        y={minY - 10}
                                                        width={maxX - minX + 20}
                                                        height={maxY - minY + 20}
                                                        cornerRadius={8}
                                                        fill="rgba(140,111,92,0.2)"
                                                        stroke="#8c6f5c"
                                                        strokeWidth={1}
                                                        dash={[10, 5]}
                                                        opacity={0.68}
                                                        listening={false}
                                                    />
                                                );
                                            })()}
                                            {placements.map((item) => {
                                                const key = getWirelessDeviceImageKey(item.moduleDevice);
                                                const image = key ? wirelessImages[key] : null;
                                                return (
                                                    <Group key={`power-module-${item.moduleDevice.id ?? item.index}`}>
                                                        <Rect
                                                            x={item.x}
                                                            y={item.y}
                                                            width={item.width}
                                                            height={item.height}
                                                            cornerRadius={10}
                                                            fill={TRANSPARENT_FILL}
                                                            stroke={TRANSPARENT_FILL}
                                                            strokeWidth={1.5}
                                                        />
                                                         {image && (
                                                             <Image
                                                                 name={`morph:${getMorphImageKey(item.moduleDevice)}`}
                                                                 image={image}
                                                                 x={item.x}
                                                                 y={item.y}
                                                                 width={item.width}
                                                                 height={item.height}
                                                             />
                                                         )}
                                                          {['power-unit', 'ups'].includes(item.moduleDevice.type) && key && (() => {
                                                              const indicatorNames = item.moduleDevice.type === 'ups'
                                                                  ? ['STATUS-INDICATOR', 'POWER-INDICATOR']
                                                                  : ['POWER-INDICATOR'];
                                                              const indicatorPort = (wirelessPortsByType[key] || [])
                                                                  .find((port) => indicatorNames.includes(String(port?.name || '').toUpperCase()));
                                                             if (!indicatorPort) return null;
                                                              return (
                                                                  <DeviceIndicator
                                                                      port={indicatorPort}
                                                                      imageWidth={item.width}
                                                                      imageHeight={item.height}
                                                                      offsetX={item.x}
                                                                      offsetY={item.y}
                                                                      active
                                                                 />
                                                             );
                                                         })()}
                                                         {showPorts && key && (wirelessPortsByType[key] || []).map((port) => (
                                                             <Circle
                                                                 key={`power-port-${item.index}-${port.name}`}
                                                                x={item.x + port.x * item.width}
                                                                y={item.y + port.y * item.height}
                                                                radius={2.5}
                                                                fill="red"


                                                            />
                                                        ))}
                                                    </Group>
                                                );
                                            })}
                                            {showEmptySlots && !upsModules.length && placements.length > 0 && (() => {
                                                const smart2DiUsage = controllerType === 'smart2' ? getSmart2DiPortUsage(scheme) : { free: 4 };
                                                const hasUpsInPower = Array.isArray(scheme.power_modules)
                                                    && scheme.power_modules
                                                        .map((item) => normalizePowerModuleType(typeof item === 'string' ? item : item?.type))
                                                        .includes('ups');
                                                const allSmart2DiPortsOccupied = controllerType === 'smart2'
                                                    && (hasUpsInPower || smart2DiUsage.free < 2);
                                                const proDiOccupied = controllerType === 'pro'
                                                    && getProAuxLineOccupancy(scheme).diOccupied;
                                                if (allSmart2DiPortsOccupied) return null;
                                                if (proDiOccupied) return null;
                                                const last = placements[placements.length - 1];
                                                const plusX = last.x - minGap - 80;
                                                const plusY = controllerImage.height - 80;
                                                return (
                                                    <Group>
                                                        <Rect
                                                            x={plusX}
                                                            y={plusY}
                                                            width={80}
                                                            height={80}
                                                            cornerRadius={10}
                                                            fill={EMPTY_SLOT_FILL}
                                                            stroke={EMPTY_SLOT_STROKE}
                                                            strokeWidth={1.5}
                                                        />
                                                        <Circle
                                                            x={plusX + 40}
                                                            y={plusY + 40}
                                                            radius={16}
                                                            fill={ADD_ACTION_FILL}
                                                            onClick={(e) => {
                                                                const pos = e.target.getAbsolutePosition();
                                                                setPowerMenuPos({ x: pos.x, y: pos.y });
                                                            }}
                                                            onTap={(e) => {
                                                                const pos = e.target.getAbsolutePosition();
                                                                setPowerMenuPos({ x: pos.x, y: pos.y });
                                                            }}
                                                        />
                                                        <EditableInfoTitle x={plusX + 40}
                                                            y={plusY + 40}
                                                            text="+"
                                                            fontSize={22}
                                                            fill={INFO_BLOCK_FILL}
                                                            offsetX={6.5}
                                                            offsetY={9}
                                                            listening={false}
                                                        />
                                                    </Group>
                                                );
                                            })()}
                                            {(() => {
                                                const powerUnit = placements.find((item) => item.moduleDevice.type === 'power-unit');
                                                if (!powerUnit) return null;
                                                const puKey = getWirelessDeviceImageKey(powerUnit.moduleDevice);
                                                const puPorts = puKey ? (wirelessPortsByType[puKey] || []) : [];
                                                const nPort = puPorts.find((port) => port.name === 'N');
                                                if (!nPort) return null;
                                                const fromX = powerUnit.x + nPort.x * powerUnit.width;
                                                const fromY = powerUnit.y + nPort.y * powerUnit.height;
                                                const endY = powerUnit.y + powerUnit.height + 2 * indentSize;
                                                return (
                                                    <>
                                                        <Line
                                                            points={[fromX, fromY, fromX, endY]}
                                                            stroke="#212121"
                                                            strokeWidth={1}
                                                            lineCap="round"
                                                            lineJoin="round"
                                                            listening={false}
                                                        />
                                                        <Text
                                                            x={fromX - 8}
                                                            y={endY + 2}
                                                            width={16}
                                                            text="N"
                                                            fontSize={10}
                                                            align="center"
                                                            fill="#212121"
                                                            listening={false}
                                                        />
                                                    </>
                                                );
                                            })()}
                                            {(() => {
                                                const circuitBreaker = placements.find((item) => item.moduleDevice.type === 'circuit-breaker');
                                                if (!circuitBreaker) return null;
                                                const cbKey = getWirelessDeviceImageKey(circuitBreaker.moduleDevice);
                                                const cbPorts = cbKey ? (wirelessPortsByType[cbKey] || []) : [];
                                                const lInPort = cbPorts.find((port) => port.name === 'L-IN');
                                                if (!lInPort) return null;
                                                const fromX = circuitBreaker.x + lInPort.x * circuitBreaker.width;
                                                const fromY = circuitBreaker.y + lInPort.y * circuitBreaker.height;
                                                const endY = circuitBreaker.y - 2 * indentSize;
                                                return (
                                                    <>
                                                        <Line
                                                            points={[fromX, fromY, fromX, endY]}
                                                            stroke="#212121"
                                                            strokeWidth={1}
                                                            lineCap="round"
                                                            lineJoin="round"
                                                            listening={false}
                                                        />
                                                        <Text
                                                            x={fromX - 8}
                                                            y={endY - 12}
                                                            width={16}
                                                            text="L"
                                                            fontSize={10}
                                                            align="center"
                                                            fill="#212121"
                                                            listening={false}
                                                        />
                                                    </>
                                                );
                                            })()}
                                            {(() => {
                                                const circuitBreaker = placements.find((item) => item.moduleDevice.type === 'circuit-breaker');
                                                const powerUnit = placements.find((item) => item.moduleDevice.type === 'power-unit');
                                                if (!circuitBreaker || !powerUnit) return null;
                                                const cbKey = getWirelessDeviceImageKey(circuitBreaker.moduleDevice);
                                                const puKey = getWirelessDeviceImageKey(powerUnit.moduleDevice);
                                                const cbPorts = cbKey ? (wirelessPortsByType[cbKey] || []) : [];
                                                const puPorts = puKey ? (wirelessPortsByType[puKey] || []) : [];
                                                const fromPort = cbPorts.find((port) => port.name === 'L-OUT');
                                                const toPort = puPorts.find((port) => port.name === 'L-IN');
                                                if (!fromPort || !toPort) return null;
                                                const fromX = circuitBreaker.x + fromPort.x * circuitBreaker.width;
                                                const fromY = circuitBreaker.y + fromPort.y * circuitBreaker.height;
                                                const toX = powerUnit.x + toPort.x * powerUnit.width;
                                                const toY = powerUnit.y + toPort.y * powerUnit.height;
                                                const lowerEdge = Math.max(circuitBreaker.y + circuitBreaker.height, powerUnit.y + powerUnit.height);
                                                const bendY = Math.max(fromY, toY, lowerEdge) + indentSize;
                                                return <Line key="power-link-lout-lin" points={getOrthogonalLinkPoints(fromX, fromY, bendY, toX, toY)} stroke="#800020" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />;
                                            })()}
                                            {(() => {
                                                const upsModule = placements.find((item) => item.moduleDevice.type === 'ups');
                                                if (!upsModule) return null;
                                                const upsKey = getWirelessDeviceImageKey(upsModule.moduleDevice);
                                                const upsPorts = upsKey ? (wirelessPortsByType[upsKey] || []) : [];
                                                const isSmart2Controller = controllerType === 'smart2';
                                                const diModules = isSmart2Controller ? getDiModules(scheme) : [];
                                                const hasDiModules = diModules.length > 0;
                                                const getDiModuleSize = (device) => {
                                                    const imageKey = getWirelessDeviceImageKey(device);
                                                    const image = imageKey ? wirelessImages[imageKey] : null;
                                                    if (!image?.width || !image?.height) return { width: DI_SLOT_SIZE, height: DI_SLOT_SIZE };
                                                    return { width: image.width, height: image.height };
                                                };
                                                const getDiSlotX = (slotIndex) => {
                                                    const minGap = DI_SLOT_MIN_GAP_MULTIPLIER * indentSize;
                                                    const baseX = controllerImage.width + minGap;
                                                    let x = baseX;
                                                    for (let i = 0; i < slotIndex; i += 1) {
                                                        const currentDevice = diModules[i] || null;
                                                        const currentWidth = getDiModuleSize(currentDevice).width;
                                                        const spacing = getSmart2DiModuleExtraSpacing(currentDevice, indentSize);
                                                        x += spacing.left + currentWidth + spacing.right + minGap;
                                                    }
                                                    const currentSpacing = getSmart2DiModuleExtraSpacing(diModules[slotIndex] || null, indentSize);
                                                    return x + currentSpacing.left;
                                                };
                                                const getDiSlotPosition = (slotIndex) => {
                                                    const device = diModules[slotIndex] || null;
                                                    const size = device ? getDiModuleSize(device) : { width: DI_SLOT_SIZE, height: DI_SLOT_SIZE };
                                                    const offset = diSlotOffsets[getDiOffsetKey(device, slotIndex)] || { x: 0, y: 0 };
                                                    const baseX = getDiSlotX(slotIndex);
                                                    const baseY = controllerImage.height - size.height;
                                                    const isInitialPosition = offset.x === 0 && offset.y === 0;
                                                    return {
                                                        x: isInitialPosition ? snapToGrid(baseX, indentSize) : baseX + offset.x,
                                                        y: isInitialPosition ? snapToGrid(baseY, indentSize) : baseY + offset.y,
                                                    };
                                                };
                                                const links = [
                                                    {
                                                        from: '12VDC-IN-V+',
                                                        to: '12VDC-OUT-V+',
                                                        color: '#d32f2f',
                                                        offset: (isSmart2Controller ? 4 : 1) * indentSize,
                                                        controllerBendWithDi: 7,
                                                        controllerBendWithSingleDi: 5,
                                                    },
                                                    {
                                                        from: '12VDC-IN-GND',
                                                        to: '12VDC-OUT-GND',
                                                        color: '#212121',
                                                        offset: (isSmart2Controller ? 3 : 2) * indentSize,
                                                        controllerBendWithDi: 8,
                                                        controllerBendWithSingleDi: 6,
                                                    },
                                                    {
                                                        from: 'DI-IN-1',
                                                        fromCandidatesSmart2: ['DI-OUT-1', 'DI-OUT-2', 'DI-OUT-3', 'DI-OUT-4'],
                                                        to: 'DI-OUT-1',
                                                        color: '#1565c0',
                                                        offset: (isSmart2Controller ? 2 : 3) * indentSize,
                                                    },
                                                    {
                                                        from: 'DI-IN-2',
                                                        fromCandidatesSmart2: ['DI-OUT-2', 'DI-OUT-1', 'DI-OUT-3', 'DI-OUT-4'],
                                                        to: 'DI-OUT-2',
                                                        color: '#1565c0',
                                                        offset: (isSmart2Controller ? 1 : 4) * indentSize,
                                                    },
                                                ];
                                                const lowerEdge = Math.max(upsModule.y + upsModule.height, controllerImage.height);

                                                return links.map((link) => {
                                                    const isPowerLink = link.from === '12VDC-IN-V+' || link.from === '12VDC-IN-GND';
                                                    if (isSmart2Controller && hasDiModules && isPowerLink) return null;
                                                    let fromPort = null;
                                                    let fromX;
                                                    let fromY;
                                                    if (isSmart2Controller && hasDiModules && isPowerLink) {
                                                        const lastIndex = diModules.length - 1;
                                                        const lastDevice = diModules[lastIndex];
                                                        const lastKey = getWirelessDeviceImageKey(lastDevice);
                                                        const lastPorts = lastKey ? (wirelessPortsByType[lastKey] || []) : [];
                                                        fromPort = lastPorts.find((port) => port.name === link.from);
                                                        if (!fromPort) return null;
                                                        const lastPos = getDiSlotPosition(lastIndex);
                                                        const lastSize = getDiModuleSize(lastDevice);
                                                        fromX = lastPos.x + fromPort.x * lastSize.width;
                                                        fromY = lastPos.y + fromPort.y * lastSize.height;
                                                    } else {
                                                        if (isSmart2Controller && Array.isArray(link.fromCandidatesSmart2)) {
                                                            fromPort = link.fromCandidatesSmart2
                                                                .map((name) => ports.find((port) => port.name === name))
                                                                .find(Boolean) || null;
                                                        } else {
                                                            fromPort = ports.find((port) => port.name === link.from);
                                                        }
                                                        if (!fromPort) return null;
                                                        fromX = fromPort.x * controllerImage.width;
                                                        fromY = fromPort.y * controllerImage.height;
                                                    }
                                                    const toPort = upsPorts.find((port) => port.name === link.to);
                                                    if (!toPort) return null;
                                                    const toX = upsModule.x + toPort.x * upsModule.width;
                                                    const toY = upsModule.y + toPort.y * upsModule.height;
                                                    const diCount = diModules.length;
                                                    const bendMultiplierForDi = diCount === 1
                                                        ? (link.controllerBendWithSingleDi || link.controllerBendWithDi || 0)
                                                        : (link.controllerBendWithDi || 0);
                                                    const bendY = (isSmart2Controller && hasDiModules && isPowerLink)
                                                        ? (controllerImage.height + bendMultiplierForDi * indentSize)
                                                        : (Math.max(fromY, toY, lowerEdge) + link.offset);
                                                    return <Line key={`power-link-ups-${link.from}-${link.to}`} points={getOrthogonalLinkPoints(fromX, fromY, bendY, toX, toY)} stroke={link.color} strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />;
                                                });
                                            })()}
                                            {(() => {
                                                const upsModule = placements.find((item) => item.moduleDevice.type === 'ups');
                                                const powerUnit = placements.find((item) => item.moduleDevice.type === 'power-unit');
                                                if (!upsModule || !powerUnit) return null;
                                                const upsKey = getWirelessDeviceImageKey(upsModule.moduleDevice);
                                                const puKey = getWirelessDeviceImageKey(powerUnit.moduleDevice);
                                                const upsPorts = upsKey ? (wirelessPortsByType[upsKey] || []) : [];
                                                const puPorts = puKey ? (wirelessPortsByType[puKey] || []) : [];
                                                const links = [
                                                    { upsPort: '12VDC-IN-GND', puPort: '12VDC-OUT-GND', color: '#212121', offset: 1 * indentSize },
                                                    { upsPort: '12VDC-IN-V+', puPort: '12VDC-OUT-V+', color: '#d32f2f', offset: 2 * indentSize },
                                                ];
                                                return links.map((link) => {
                                                    const fromPort = upsPorts.find((port) => port.name === link.upsPort);
                                                    const toPort = puPorts.find((port) => port.name === link.puPort);
                                                    if (!fromPort || !toPort) return null;
                                                    const fromX = upsModule.x + fromPort.x * upsModule.width;
                                                    const fromY = upsModule.y + fromPort.y * upsModule.height;
                                                    const toX = powerUnit.x + toPort.x * powerUnit.width;
                                                    const toY = powerUnit.y + toPort.y * powerUnit.height;
                                                    const upperEdge = Math.min(upsModule.y, powerUnit.y);
                                                    const bendY = Math.min(fromY, toY, upperEdge) - link.offset;
                                                    return <Line key={`power-link-ups-pu-${link.upsPort}-${link.puPort}`} points={getOrthogonalLinkPoints(fromX, fromY, bendY, toX, toY)} stroke={link.color} strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />;
                                                });
                                            })()}
                                            {(() => {
                                                const upsModule = placements.find((item) => item.moduleDevice.type === 'ups');
                                                const batteryModule = placements.find((item) => item.moduleDevice.type === 'battery');
                                                if (!upsModule || !batteryModule) return null;
                                                const upsKey = getWirelessDeviceImageKey(upsModule.moduleDevice);
                                                const batteryKey = getWirelessDeviceImageKey(batteryModule.moduleDevice);
                                                const upsPorts = upsKey ? (wirelessPortsByType[upsKey] || []) : [];
                                                const batteryPorts = batteryKey ? (wirelessPortsByType[batteryKey] || []) : [];
                                                const links = [
                                                    { upsPort: 'ACID-BAT-V+', batteryPort: 'ACID-BAT-V+', color: '#d32f2f', upOffset: 2 * indentSize },
                                                    { upsPort: 'ACID-BAT-GND', batteryPort: 'ACID-BAT-GND', color: '#212121', upOffset: 1 * indentSize },
                                                ];
                                                return links.map((link) => {
                                                    const upsPort = upsPorts.find((port) => port.name === link.upsPort);
                                                    const batteryPort = batteryPorts.find((port) => port.name === link.batteryPort);
                                                    if (!upsPort || !batteryPort) return null;
                                                    const fromX = batteryModule.x + batteryPort.x * batteryModule.width;
                                                    const fromY = batteryModule.y + batteryPort.y * batteryModule.height;
                                                    const toX = upsModule.x + upsPort.x * upsModule.width;
                                                    const toY = upsModule.y + upsPort.y * upsModule.height;
                                                    const upY = batteryModule.y - link.upOffset;
                                                    return (
                                                        <Line
                                                            key={`power-link-ups-battery-${link.upsPort}-${link.batteryPort}`}
                                                            points={[fromX, fromY, fromX, upY, toX, upY, toX, toY]}
                                                            stroke={link.color}
                                                            strokeWidth={1}
                                                            lineCap="round"
                                                            lineJoin="round"
                                                            listening={false}
                                                        />
                                                    );
                                                });
                                            })()}
                                            {(() => {
                                                const hasUps = placements.some((item) => item.moduleDevice.type === 'ups');
                                                if (hasUps) return null;
                                                const powerUnit = placements.find((item) => item.moduleDevice.type === 'power-unit');
                                                if (!powerUnit) return null;
                                                const isSmart2Controller = controllerType === 'smart2';
                                                const diModules = isSmart2Controller ? getDiModules(scheme) : [];
                                                const hasDiModules = diModules.length > 0;
                                                if (isSmart2Controller && hasDiModules) return null;
                                                const puKey = getWirelessDeviceImageKey(powerUnit.moduleDevice);
                                                const puPorts = puKey ? (wirelessPortsByType[puKey] || []) : [];
                                                const getDiModuleSize = (device) => {
                                                    const imageKey = getWirelessDeviceImageKey(device);
                                                    const image = imageKey ? wirelessImages[imageKey] : null;
                                                    if (!image?.width || !image?.height) return { width: DI_SLOT_SIZE, height: DI_SLOT_SIZE };
                                                    return { width: image.width, height: image.height };
                                                };
                                                const getDiSlotX = (slotIndex) => {
                                                    const minGap = DI_SLOT_MIN_GAP_MULTIPLIER * indentSize;
                                                    const baseX = controllerImage.width + minGap;
                                                    let x = baseX;
                                                    for (let i = 0; i < slotIndex; i += 1) {
                                                        const currentDevice = diModules[i] || null;
                                                        const currentWidth = getDiModuleSize(currentDevice).width;
                                                        const spacing = getSmart2DiModuleExtraSpacing(currentDevice, indentSize);
                                                        x += spacing.left + currentWidth + spacing.right + minGap;
                                                    }
                                                    const currentSpacing = getSmart2DiModuleExtraSpacing(diModules[slotIndex] || null, indentSize);
                                                    return x + currentSpacing.left;
                                                };
                                                const getDiSlotPosition = (slotIndex) => {
                                                    const device = diModules[slotIndex] || null;
                                                    const size = device ? getDiModuleSize(device) : { width: DI_SLOT_SIZE, height: DI_SLOT_SIZE };
                                                    const offset = diSlotOffsets[getDiOffsetKey(device, slotIndex)] || { x: 0, y: 0 };
                                                    const baseX = getDiSlotX(slotIndex);
                                                    const baseY = controllerImage.height - size.height;
                                                    const isInitialPosition = offset.x === 0 && offset.y === 0;
                                                    return {
                                                        x: isInitialPosition ? snapToGrid(baseX, indentSize) : baseX + offset.x,
                                                        y: isInitialPosition ? snapToGrid(baseY, indentSize) : baseY + offset.y,
                                                    };
                                                };
                                                const links = [
                                                    {
                                                        puPort: '12VDC-OUT-V+',
                                                        controllerPort: '12VDC-IN-V+',
                                                        upOffset: 2 * indentSize,
                                                        sideOffset: 2 * indentSize,
                                                        underOffset: 1 * indentSize,
                                                        underOffsetWithDi: 7 * indentSize,
                                                        underOffsetWithSingleDi: 5 * indentSize,
                                                        color: '#d32f2f',
                                                    },
                                                    {
                                                        puPort: '12VDC-OUT-GND',
                                                        controllerPort: '12VDC-IN-GND',
                                                        upOffset: 1 * indentSize,
                                                        sideOffset: 1 * indentSize,
                                                        underOffset: 2 * indentSize,
                                                        underOffsetWithDi: 8 * indentSize,
                                                        underOffsetWithSingleDi: 6 * indentSize,
                                                        color: '#212121',
                                                    },
                                                ];
                                                return links.map((link) => {
                                                    const fromPort = puPorts.find((port) => port.name === link.puPort);
                                                    let toPort;
                                                    let toX;
                                                    let toY;
                                                    let currentTargetLowerEdgeY = controllerImage.height;
                                                    let baseTargetLowerEdgeY = controllerImage.height;
                                                    if (isSmart2Controller && hasDiModules) {
                                                        const lastIndex = diModules.length - 1;
                                                        const lastDevice = diModules[lastIndex];
                                                        const lastKey = getWirelessDeviceImageKey(lastDevice);
                                                        const lastPorts = lastKey ? (wirelessPortsByType[lastKey] || []) : [];
                                                        toPort = lastPorts.find((port) => port.name === link.controllerPort);
                                                        if (!toPort) return null;
                                                        const lastPos = getDiSlotPosition(lastIndex);
                                                        const lastSize = getDiModuleSize(lastDevice);
                                                        toX = lastPos.x + toPort.x * lastSize.width;
                                                        toY = lastPos.y + toPort.y * lastSize.height;
                                                        currentTargetLowerEdgeY = lastPos.y + lastSize.height;

                                                        const lastBaseX = getDiSlotX(lastIndex);
                                                        const lastBaseY = controllerImage.height - lastSize.height;
                                                        const lastBasePos = {
                                                            x: snapToGrid(lastBaseX, indentSize),
                                                            y: snapToGrid(lastBaseY, indentSize),
                                                        };
                                                        baseTargetLowerEdgeY = lastBasePos.y + lastSize.height;
                                                    } else {
                                                        toPort = ports.find((port) => port.name === link.controllerPort);
                                                        if (!toPort) return null;
                                                        toX = toPort.x * controllerImage.width;
                                                        toY = toPort.y * controllerImage.height;
                                                    }
                                                    if (!fromPort || !toPort) return null;
                                                    const fromX = powerUnit.x + fromPort.x * powerUnit.width;
                                                    const fromY = powerUnit.y + fromPort.y * powerUnit.height;
                                                    const upY = powerUnit.y - link.upOffset;
                                                    const rightX = powerUnit.x + powerUnit.width + link.sideOffset;
                                                    const downBaseY = controllerImage.height;
                                                    const diCount = diModules.length;
                                                    const underOffsetForDi = diCount === 1
                                                        ? (link.underOffsetWithSingleDi || link.underOffsetWithDi)
                                                        : link.underOffsetWithDi;
                                                    const staticDownY = downBaseY + ((isSmart2Controller && hasDiModules) ? underOffsetForDi : link.underOffset);
                                                    const dynamicDownY = isSmart2Controller && hasDiModules
                                                        ? (currentTargetLowerEdgeY + underOffsetForDi)
                                                        : staticDownY;
                                                    const baseMinDownY = isSmart2Controller && hasDiModules
                                                        ? (baseTargetLowerEdgeY + underOffsetForDi)
                                                        : staticDownY;
                                                    const downY = Math.max(staticDownY, dynamicDownY, baseMinDownY);
                                                    return <Line key={`power-link-pu-controller-${link.puPort}-${link.controllerPort}`} points={[fromX, fromY, fromX, upY, rightX, upY, rightX, downY, toX, downY, toX, toY]} stroke={link.color} strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />;
                                                });
                                            })()}
                                        </>
                                    );
                                })()}
                                {(() => {
                                    if (controllerType !== 'pro') return null;
                                    const relaySLines = getRelaySLineConfig(controllerType, ports);
                                    if (relaySLines.length === 0) return null;
                                    const relaySDevices = getControllerLineDevices(scheme, 'relay_s_devices', getRelaySPreferredDevices(scheme));
                                    const relaySOccupancy = buildRelaySlotOccupancyPreserveIndexes(
                                        relaySDevices,
                                        relaySLines.length,
                                        (device) => (String(device?.connection_type || '').toLowerCase() === 'double_relay' ? 2 : 1),
                                    );
                                    const doubleRelayDevicesInSystem = relaySDevices.filter((device) => String(device?.connection_type || '').toLowerCase() === 'double_relay');
                                    const hasRelaySOccupancy = relaySOccupancy.some(Boolean);
                                    if (!showEmptySlots && !hasRelaySOccupancy) return null;

                                    const relaySRightEdgeX = -6 * indentSize;
                                    const relaySBottomSlotY = -RELAY_SLOT_SIZE - 10 * indentSize;
                                    const relaySSlotGap = 4 * indentSize;
                                     const relayS4BPort = ports.find((port) => String(port?.name || '').toUpperCase() === 'RELAY-S-4-B');
                                     const relayS4BPortX = relayS4BPort ? relayS4BPort.x * controllerImage.width : 0;
                                     const getRelaySSlotPosition = (slotIndex) => {
                                        const visualSlotIndex = slotIndex === 2 ? 3 : (slotIndex === 3 ? 2 : slotIndex);
                                        const rowOffsetY = visualSlotIndex % 2 === 0 ? 0 : -(RELAY_SLOT_SIZE + relaySSlotGap);
                                         if (slotIndex === 0) {
                                             return { x: -RELAY_SLOT_SIZE, y: relaySBottomSlotY + rowOffsetY };
                                         }
                                        if (slotIndex === 1) {
                                            return { x: -RELAY_SLOT_SIZE, y: relaySBottomSlotY + rowOffsetY };
                                        }
                                        if (slotIndex === 2) {
                                            return { x: relayS4BPortX + 2 * indentSize, y: relaySBottomSlotY + rowOffsetY };
                                        }
                                        return { x: relayS4BPortX + 2 * indentSize, y: relaySBottomSlotY + rowOffsetY };
                                    };

                                    return (
                                        <Group>
                                            {showLineFrames && (
                                                (() => {
                                                    const positions = relaySLines.map((_, idx) => getRelaySSlotPosition(idx));
                                                    const minX = Math.min(...positions.map((pos) => pos.x));
                                                    const minY = Math.min(...positions.map((pos) => pos.y));
                                                    const maxX = Math.max(...positions.map((pos) => pos.x + RELAY_SLOT_SIZE));
                                                    const maxY = Math.max(...positions.map((pos) => pos.y + RELAY_SLOT_SIZE));
                                                    return (
                                                        <Rect
                                                            x={minX - 10}
                                                            y={minY - 10}
                                                            width={maxX - minX + 20}
                                                            height={maxY - minY + 20}
                                                            cornerRadius={8}
                                                            fill="rgba(120,102,148,0.2)"
                                                            stroke="#786694"
                                                            strokeWidth={1}
                                                            dash={[8, 4]}
                                                            opacity={0.68}
                                                            listening={false}
                                                        />
                                                    );
                                                })()
                                            )}
                                            {relaySLines.map((relayLine, slotIndex) => {
                                                const slotState = relaySOccupancy[slotIndex];
                                                const isRelaySOccupied = !!slotState;
                                                const isCoveredRelaySSlot = !!slotState?.covered;
                                                if (!showEmptySlots && !isRelaySOccupied) return null;
                                                 const relaySDevice = slotState?.device || null;
                                                 const isDoubleRelayDevice = String(relaySDevice?.connection_type || '').toLowerCase() === 'double_relay';
                                                 const relaySTypeForInfo = canonicalDeviceType(relaySDevice?.type);
                                                 const slotSpan = Math.max(1, slotState?.span || 1);
                                                 const relaySVisualSlotWidth = isDoubleRelayDevice
                                                     ? (relaySTypeForInfo === 'valve' ? VALVE_SLOT_WIDTH : SERVO_SLOT_SIZE)
                                                     : (RELAY_SLOT_SIZE * slotSpan + relaySSlotGap * (slotSpan - 1));
                                                 const relaySVisualSlotHeight = isDoubleRelayDevice
                                                     ? (relaySTypeForInfo === 'valve' ? VALVE_SLOT_HEIGHT : SERVO_SLOT_SIZE)
                                                     : RELAY_SLOT_SIZE;
                                                 const slotPos = getRelaySSlotPosition(slotIndex);
                                                let slotX = slotPos.x;
                                                let slotY = slotPos.y;
                                                 if (isDoubleRelayDevice && !isCoveredRelaySSlot && slotSpan > 1) {
                                                     const nextPos = getRelaySSlotPosition(slotIndex + 1);
                                                    if (nextPos) {
                                                        const centerX = (slotPos.x + nextPos.x + RELAY_SLOT_SIZE) / 2;
                                                        const bottomY = Math.max(slotPos.y, nextPos.y);
                                                        const centerY = bottomY + RELAY_SLOT_SIZE / 2;
                                                        slotX = centerX - relaySVisualSlotWidth / 2;
                                                         slotY = centerY - relaySVisualSlotHeight / 2;
                                                     }
                                                 }
                                                 const relaySOffsetKey = `relay-s:${slotState?.startSlot ?? slotIndex}`;
                                                 const relaySOffset = isRelaySOccupied && !isCoveredRelaySSlot
                                                     ? (relaySlotOffsets[relaySOffsetKey] || { x: 0, y: 0 })
                                                     : { x: 0, y: 0 };
                                                 slotX += relaySOffset.x;
                                                 slotY += relaySOffset.y;
                                                 const bPort = ports.find((port) => port.name === relayLine.bPortName);
                                                const aPort = ports.find((port) => port.name === relayLine.aPortName);
                                                const relaySBStub = bPort
                                                    ? {
                                                        fromX: bPort.x * controllerImage.width,
                                                        fromY: bPort.y * controllerImage.height,
                                                    }
                                                    : null;
                                                const relaySAStub = aPort
                                                    ? {
                                                        fromX: aPort.x * controllerImage.width,
                                                        fromY: aPort.y * controllerImage.height,
                                                    }
                                                    : null;
                                                const relaySVisualImageKey = (() => {
                                                    if (!relaySDevice) return null;
                                                    const relaySType = canonicalDeviceType(relaySDevice?.type);
                                                    if (relaySType === 'boiler-pump') {
                                                        return slotIndex < 2 ? 'boiler-pump-right-port' : 'boiler-pump-left-port';
                                                    }
                                                    if (relaySType === 'pump-220v') {
                                                        return slotIndex < 2 ? 'pump-220v-right-port' : 'pump-220v-left-port';
                                                    }
                                                    if (relaySType === 'zoneServo') {
                                                        return slotIndex < 2 ? 'zoneServo-right-port' : 'zoneServo-left-port';
                                                    }
                                                    const isDoubleRelay = String(relaySDevice?.connection_type || '').toLowerCase() === 'double_relay';
                                                    if (!isDoubleRelay) return getWirelessDeviceImageKey(relaySDevice);
                                                    if (relaySType === 'valve') {
                                                        return slotIndex < 2 ? 'valve-right-port' : 'valve-left-port';
                                                    }
                                                    return slotIndex < 2 ? '220servo-right-ports' : '220servo-left-ports';
                                                })();
                                                const relaySVisualImage = relaySVisualImageKey ? wirelessImages[relaySVisualImageKey] : null;
                                                const relaySPorts = relaySVisualImageKey ? (wirelessPortsByType[relaySVisualImageKey] || []) : [];
                                                const relaySDoubleRelayDevicesByType = relaySTypeForInfo
                                                    ? doubleRelayDevicesInSystem.filter((item) => canonicalDeviceType(item?.type) === relaySTypeForInfo)
                                                    : [];
                                                const relaySDoubleRelaySystemIndex = isDoubleRelayDevice
                                                    ? Math.max(0, relaySDoubleRelayDevicesByType.findIndex((item) => {
                                                        if (relaySDevice?.id != null && item?.id != null) return item.id === relaySDevice.id;
                                                        return item === relaySDevice;
                                                    })) + 1
                                                    : 0;
                                                const relaySDoubleRelayBaseTitle = relaySTypeForInfo === 'valve' ? 'Запорный клапан' : 'Сервопривод';
                                                const relaySDoubleRelayTitle = getDeviceStoredTitle(relaySDevice) || (relaySDoubleRelaySystemIndex > 0
                                                    ? `${relaySDoubleRelayBaseTitle} ${relaySDoubleRelaySystemIndex}`
                                                    : relaySDoubleRelayBaseTitle);
                                                const relaySBoilerPumpsInSystem = relaySTypeForInfo === 'boiler-pump'
                                                    ? (Array.isArray(scheme?.wired_devices)
                                                        ? scheme.wired_devices.filter((item) => canonicalDeviceType(item?.type) === 'boiler-pump')
                                                        : [])
                                                    : [];
                                                const relaySBoilerPumpIndex = relaySTypeForInfo === 'boiler-pump'
                                                    ? Math.max(0, relaySBoilerPumpsInSystem.findIndex((item) => {
                                                        if (relaySDevice?.id != null && item?.id != null) return item.id === relaySDevice.id;
                                                        return item === relaySDevice;
                                                    })) + 1
                                                    : 0;
                                                const relaySBoilerPumpTitle = getDeviceStoredTitle(relaySDevice) || (relaySBoilerPumpIndex > 0 ? `Насос бойлера ${relaySBoilerPumpIndex}` : 'Насос бойлера');
                                                const relaySSingleDevicesByType = relaySTypeForInfo
                                                    ? relaySDevices.filter((item) => canonicalDeviceType(item?.type) === relaySTypeForInfo)
                                                    : [];
                                                const relaySSingleDeviceIndex = relaySDevice
                                                    ? Math.max(0, relaySSingleDevicesByType.findIndex((item) => {
                                                        if (relaySDevice?.id != null && item?.id != null) return item.id === relaySDevice.id;
                                                        return item === relaySDevice;
                                                    })) + 1
                                                    : 0;
                                                const relaySSingleBaseTitle = relaySTypeForInfo === 'boiler-pump'
                                                    ? 'Насос бойлера'
                                                    : (relaySTypeForInfo === 'pump-220v'
                                                        ? 'Насос 220V'
                                                        : (relaySTypeForInfo === 'zoneServo' ? 'Сервопривод зоны' : 'Relay-S устройство'));
                                                const relaySSingleTitle = getDeviceStoredTitle(relaySDevice) || (relaySSingleDeviceIndex > 0
                                                    ? `${relaySSingleBaseTitle} ${relaySSingleDeviceIndex}`
                                                    : relaySSingleBaseTitle);
                                                const relaySImageSize = relaySVisualImage
                                                    ? (relaySTypeForInfo === 'valve' || relaySTypeForInfo === 'zoneServo'
                                                        ? getFullWidthSize(relaySVisualImage, relaySVisualSlotWidth, relaySVisualSlotHeight)
                                                        : getContainSize(relaySVisualImage, relaySVisualSlotWidth, relaySVisualSlotHeight))
                                                    : { width: relaySVisualSlotWidth, height: relaySVisualSlotHeight };
                                                const relaySImageX = slotX + (relaySVisualSlotWidth - relaySImageSize.width) / 2;
                                                const relaySImageY = slotY + (relaySVisualSlotHeight - relaySImageSize.height) / 2;
                                                const relaySHoverKey = `controller-relay-s:${slotIndex}`;
                                                const isRelaySHovered = hoveredRelaySlotIndex === relaySHoverKey;

                                                return (
                                                     <Group
                                                         key={`relay-s-slot-${slotIndex}`}
                                                         draggable={isRelaySOccupied && !isCoveredRelaySSlot}
                                                         onMouseEnter={() => setHoveredRelaySlotIndex(relaySHoverKey)}
                                                         onMouseLeave={() => setHoveredRelaySlotIndex((prev) => (prev === relaySHoverKey ? null : prev))}
                                                         onDragStart={() => {
                                                             if (!isRelaySOccupied || isCoveredRelaySSlot) return;
                                                             relayDragStartOffsetsRef.current[relaySOffsetKey] = relaySlotOffsets[relaySOffsetKey] || { x: 0, y: 0 };
                                                         }}
                                                         onDragMove={(event) => {
                                                             if (!isRelaySOccupied || isCoveredRelaySSlot) return;
                                                             const delta = event.target.position();
                                                             const startOffset = relayDragStartOffsetsRef.current[relaySOffsetKey] || { x: 0, y: 0 };
                                                             setRelaySlotOffsets((prev) => ({
                                                                 ...prev,
                                                                 [relaySOffsetKey]: {
                                                                     x: startOffset.x + delta.x,
                                                                     y: startOffset.y + delta.y,
                                                                 },
                                                             }));
                                                             event.target.position({ x: 0, y: 0 });
                                                         }}
                                                         onDragEnd={(event) => {
                                                             if (!isRelaySOccupied || isCoveredRelaySSlot) return;
                                                             delete relayDragStartOffsetsRef.current[relaySOffsetKey];
                                                             event.target.position({ x: 0, y: 0 });
                                                         }}
                                                     >
                                                        {isRelaySOccupied && relaySAStub && !isDoubleRelayDevice && (() => {
                                                            const endY = relaySAStub.fromY - 5 * indentSize;
                                                            return (
                                                                <Group>
                                                                    <Line points={[relaySAStub.fromX, relaySAStub.fromY, relaySAStub.fromX, endY]} stroke="#d32f2f" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                                    <Text x={relaySAStub.fromX - 8} y={endY - 12} width={16} text="L" fontSize={10} align="center" fill="#212121" listening={false} />
                                                                </Group>
                                                            );
                                                        })()}
                                                        {!isCoveredRelaySSlot && (
                                                            <>
                                                                 {isDoubleRelayDevice && (() => {
                                                                      const lineA = relayLine;
                                                                      const lineB = relaySLines[slotIndex + 1] || null;
                                                                      const controllerAPort = lineA?.bPortName ? ports.find((port) => port.name === lineA.bPortName) : null;
                                                                      const controllerBPort = lineB?.bPortName ? ports.find((port) => port.name === lineB.bPortName) : null;
                                                                      const controllerAFeedPort = lineA?.aPortName ? ports.find((port) => port.name === lineA.aPortName) : null;
                                                                      const controllerBFeedPort = lineB?.aPortName ? ports.find((port) => port.name === lineB.aPortName) : null;
                                                                      const relaySTypeForPorts = canonicalDeviceType(relaySDevice?.type);
                                                                      const servoRelay1 = getRelayTerminalPort(relaySPorts, 1, relaySTypeForPorts === 'valve');
                                                                      const servoRelay2 = getRelayTerminalPort(relaySPorts, 2, relaySTypeForPorts === 'valve');
                                                                     if (!controllerAPort || !controllerBPort || !servoRelay1 || !servoRelay2) return null;

                                                                     const from1X = relaySImageX + servoRelay1.x * relaySImageSize.width;
                                                                     const from1Y = relaySImageY + servoRelay1.y * relaySImageSize.height;
                                                                     const to1X = controllerAPort.x * controllerImage.width;
                                                                     const to1Y = controllerAPort.y * controllerImage.height;

                                                                     const from2X = relaySImageX + servoRelay2.x * relaySImageSize.width;
                                                                     const from2Y = relaySImageY + servoRelay2.y * relaySImageSize.height;
                                                                     const to2X = controllerBPort.x * controllerImage.width;
                                                                     const to2Y = controllerBPort.y * controllerImage.height;

                                                                     const isLeftPart = slotIndex < 2;
                                                                     const relay1HorizontalX = isLeftPart
                                                                         ? Math.max(from1X, to1X)
                                                                         : Math.min(from1X, to1X);
                                                                      const relay2HorizontalX = isLeftPart
                                                                          ? Math.max(from2X, to2X)
                                                                          : Math.min(from2X, to2X);
                                                                      const relaySLineStroke = relaySTypeForPorts === '220servo' || relaySTypeForPorts === 'valve' ? '#d32f2f' : '#2e7d32';

                                                                        return (
                                                                           <>
                                                                              {controllerAFeedPort && (() => {
                                                                                  const feedX = controllerAFeedPort.x * controllerImage.width;
                                                                                  const feedY = controllerAFeedPort.y * controllerImage.height;
                                                                                  const endY = feedY - 5 * indentSize;
                                                                                  return (
                                                                                      <>
                                                                                          <Line points={[feedX, feedY, feedX, endY]} stroke="#d32f2f" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                                                          <Text x={feedX - 8} y={endY - 12} width={16} text="L" fontSize={10} align="center" fill="#212121" listening={false} />
                                                                                      </>
                                                                                  );
                                                                              })()}
                                                                              {controllerBFeedPort && (() => {
                                                                                  const feedX = controllerBFeedPort.x * controllerImage.width;
                                                                                  const feedY = controllerBFeedPort.y * controllerImage.height;
                                                                                  const endY = feedY - 5 * indentSize;
                                                                                  return (
                                                                                      <>
                                                                                          <Line points={[feedX, feedY, feedX, endY]} stroke="#d32f2f" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                                                          <Text x={feedX - 8} y={endY - 12} width={16} text="L" fontSize={10} align="center" fill="#212121" listening={false} />
                                                                                      </>
                                                                                  );
                                                                              })()}
                                                                               <Line
                                                                                   points={[from1X, from1Y, relay1HorizontalX, from1Y, relay1HorizontalX, to1Y, to1X, to1Y]}
                                                                                   stroke={relaySLineStroke}
                                                                                   strokeWidth={1}
                                                                                   lineCap="round"
                                                                                   lineJoin="round"
                                                                                  listening={false}
                                                                              />
                                                                               <Line
                                                                                  points={[from2X, from2Y, relay2HorizontalX, from2Y, relay2HorizontalX, to2Y, to2X, to2Y]}
                                                                                  stroke={relaySLineStroke}
                                                                                  strokeWidth={1}
                                                                                 lineCap="round"
                                                                                 lineJoin="round"
                                                                                listening={false}
                                                                            />
                                                                        </>
                                                                    );
                                                                })()}
                                                                {!isRelaySOccupied && showEmptySlots && !isCoveredRelaySSlot && relaySBStub && (() => {
                                                                    const slotCenterX = slotX + relaySVisualSlotWidth / 2;
                                                                    const slotCenterY = slotY + relaySVisualSlotHeight / 2;
                                                                    const direction = slotCenterX < relaySBStub.fromX ? 1 : -1;
                                                                    const fromX = direction > 0 ? slotX + relaySVisualSlotWidth : slotX;
                                                                    const fromY = slotCenterY;
                                                                    const toX = relaySBStub.fromX;
                                                                    const toY = relaySBStub.fromY;

                                                                    return (
                                                                        <Line
                                                                            points={[fromX, fromY, toX, fromY, toX, toY]}
                                                                            stroke="#9e9e9e"
                                                                            strokeWidth={1}
                                                                            lineCap="round"
                                                                            lineJoin="round"
                                                                            listening={false}
                                                                        />
                                                                    );
                                                                })()}
                                                                <Rect
                                                                    x={slotX}
                                                                    y={slotY}
                                                                    width={relaySVisualSlotWidth}
                                                                    height={relaySVisualSlotHeight}
                                                                    cornerRadius={10}
                                                                    fill={isRelaySOccupied ? TRANSPARENT_FILL : EMPTY_SLOT_FILL}
                                                                    stroke={isRelaySOccupied ? TRANSPARENT_FILL : EMPTY_SLOT_STROKE}
                                                                    strokeWidth={1.5}
                                                                />
                                                                {isRelaySOccupied && relaySVisualImage && (() => {
                                                                    return <Image image={relaySVisualImage} x={relaySImageX} y={relaySImageY} width={relaySImageSize.width} height={relaySImageSize.height} listening={false} />;
                                                                })()}
                                                                {isRelaySOccupied && !isDoubleRelayDevice && relaySBStub && (() => {
                                                                    const relayInPort = getRelayInputPort(relaySPorts, relaySTypeForInfo, relaySVisualImageKey);
                                                                    if (!relayInPort) return null;
                                                                    const fromX = relaySBStub.fromX;
                                                                    const fromY = relaySBStub.fromY;
                                                                      const toX = relaySImageX + relayInPort.x * relaySImageSize.width;
                                                                      const toY = relaySImageY + relayInPort.y * relaySImageSize.height;
                                                                       if (relaySTypeForInfo === 'zoneServo') {
                                                                           return (
                                                                               <Line
                                                                                   points={[toX, toY, fromX, toY, fromX, fromY]}
                                                                                  stroke="#d32f2f"
                                                                                  strokeWidth={1}
                                                                                  lineCap="round"
                                                                                  lineJoin="round"
                                                                                  listening={false}
                                                                               />
                                                                           );
                                                                       }
                                                                        if (controllerType === 'pro' && relaySTypeForInfo === 'pump-220v') {
                                                                              return (
                                                                                  <Line
                                                                                      points={[toX, toY, fromX, toY, fromX, fromY]}
                                                                                      stroke="#d32f2f"
                                                                                     strokeWidth={1}
                                                                                     lineCap="round"
                                                                                    lineJoin="round"
                                                                                    listening={false}
                                                                                />
                                                                            );
                                                                        }
                                                                         if (controllerType === 'pro' && relaySTypeForInfo === '220servo') {
                                                                             return (
                                                                                 <Line
                                                                                     points={[toX, toY, fromX, toY, fromX, fromY]}
                                                                                     stroke="#d32f2f"
                                                                                     strokeWidth={1}
                                                                                     lineCap="round"
                                                                                     lineJoin="round"
                                                                                     listening={false}
                                                                                 />
                                                                             );
                                                                         }
                                                                         if (relaySTypeForInfo === 'boiler-pump') {
                                                                            return (
                                                                                <Line
                                                                                    points={[toX, toY, fromX, toY, fromX, fromY]}
                                                                                   stroke="#d32f2f"
                                                                                   strokeWidth={1}
                                                                                   lineCap="round"
                                                                                   lineJoin="round"
                                                                                   listening={false}
                                                                               />
                                                                           );
                                                                       }
                                                                       const bendY = Math.max(fromY, toY) + indentSize;
                                                                      return (
                                                                         <Line
                                                                             points={getRelayLinkPointsToDevice({
                                                                                 fromX,
                                                                                 fromY,
                                                                                 bendY,
                                                                                 toX,
                                                                                 toY,
                                                                                 device: relaySDevice,
                                                                                 imageKey: relaySVisualImageKey,
                                                                                 indentSize,
                                                                             })}
                                                                             stroke="#d32f2f"
                                                                             strokeWidth={1}
                                                                             lineCap="round"
                                                                            lineJoin="round"
                                                                            listening={false}
                                                                        />
                                                                    );
                                                                })()}
                                                                  {showPorts && isRelaySOccupied && relaySVisualImageKey && (() => {
                                                                      const relayPorts = isDoubleRelayDevice
                                                                          ? (wirelessPortsByType[relaySVisualImageKey] || []).filter(isDoubleRelaySignalPort)
                                                                          : (wirelessPortsByType[relaySVisualImageKey] || []);
                                                                      return relayPorts.map((port) => (
                                                                         <Circle
                                                                            key={`relay-s-slot-port-${slotIndex}-${port.name}`}
                                                                            x={relaySImageX + port.x * relaySImageSize.width}
                                                                            y={relaySImageY + port.y * relaySImageSize.height}
                                                                            radius={2.5}
                                                                            fill="red"
                                                                            listening={false}


                                                                        />
                                                                     ));
                                                                 })()}
                                                                 {!isRelaySOccupied && showEmptySlots && !isCoveredRelaySSlot && (
                                                                     <>
                                                                         <Text
                                                                             x={slotX + relaySVisualSlotWidth - 13}
                                                                             y={slotY + 2}
                                                                             width={10}
                                                                             height={10}
                                                                             text={String(slotIndex + 1)}
                                                                             fontSize={7}
                                                                             fill="#7b8494"
                                                                             align="right"
                                                                             listening={false}
                                                                         />
                                                                         <Circle
                                                                             x={slotX + relaySVisualSlotWidth / 2}
                                                                             y={slotY + relaySVisualSlotHeight / 2}
                                                                             radius={16}
                                                                             fill={ADD_ACTION_FILL}
                                                                             onClick={(e) => {
                                                                                 const pos = e.target.getAbsolutePosition();
                                                                                 setRelayMenuPos({ x: pos.x, y: pos.y, slotIndex, lineKey: 'relay_s_devices' });
                                                                             }}
                                                                             onTap={(e) => {
                                                                                 const pos = e.target.getAbsolutePosition();
                                                                                 setRelayMenuPos({ x: pos.x, y: pos.y, slotIndex, lineKey: 'relay_s_devices' });
                                                                             }}
                                                                         />
                                                                         <Text x={slotX + relaySVisualSlotWidth / 2} y={slotY + relaySVisualSlotHeight / 2} text="+" fontSize={22} fill={ADD_ACTION_TEXT_FILL} offsetX={6.5} offsetY={9} listening={false} />
                                                                     </>
                                                                 )}
                                                                 {isRelaySOccupied && isDoubleRelayDevice && (
                                                                    <>
                                                                        <Rect
                                                                            x={slotX}
                                                                            y={slotY - (INFO_BLOCK_HEIGHT + 4)}
                                                                            width={relaySVisualSlotWidth}
                                                                            height={INFO_BLOCK_HEIGHT}
                                                                            cornerRadius={1}
                                                                            fill={INFO_BLOCK_FILL}
                                                                            stroke={INFO_BLOCK_STROKE}
                                                                            strokeWidth={INFO_BLOCK_STROKE_WIDTH}
                                                                        />
                                                                        <EditableInfoTitle
                                                                            x={slotX + 3}
                                                                            y={slotY - (INFO_BLOCK_HEIGHT + 4)}
                                                                            width={Math.max(40, relaySVisualSlotWidth - 6)}
                                                                            height={INFO_BLOCK_HEIGHT}
                                                                            text={relaySDoubleRelayTitle}
                                                                            fontSize={4}
                                                                            fill={INFO_BLOCK_TEXT_COLOR}
                                                                            align="center"
                                                                            verticalAlign="middle" device={relaySDevice} title={relaySDoubleRelayTitle} />
                                                                    </>
                                                                )}
                                                                {isRelaySOccupied && !isDoubleRelayDevice && (relaySTypeForInfo === 'boiler-pump' || relaySTypeForInfo === 'pump-220v' || relaySTypeForInfo === 'zoneServo') && (
                                                                    <>
                                                                        <Rect
                                                                            x={slotX}
                                                                            y={slotY - (INFO_BLOCK_HEIGHT + 4)}
                                                                            width={relaySVisualSlotWidth}
                                                                            height={INFO_BLOCK_HEIGHT}
                                                                            cornerRadius={1}
                                                                            fill={INFO_BLOCK_FILL}
                                                                            stroke={INFO_BLOCK_STROKE}
                                                                            strokeWidth={INFO_BLOCK_STROKE_WIDTH}
                                                                        />
                                                                        <EditableInfoTitle x={slotX + 3}
                                                                            y={slotY - (INFO_BLOCK_HEIGHT + 4)}
                                                                            width={Math.max(40, relaySVisualSlotWidth - 6)}
                                                                            height={INFO_BLOCK_HEIGHT}
                                                                            text={relaySTypeForInfo === 'boiler-pump' ? relaySBoilerPumpTitle : relaySSingleTitle}
                                                                            fontSize={4}
                                                                            fill={INFO_BLOCK_TEXT_COLOR}
                                                                            align="center"
                                                                            verticalAlign="middle" device={relaySDevice} title={relaySTypeForInfo === 'boiler-pump' ? relaySBoilerPumpTitle : relaySSingleTitle} />
                                                                    </>
                                                                )}
                                                                {isRelaySOccupied && !isCoveredRelaySSlot && isRelaySHovered && (
                                                                    <SlotDeleteButton compact x={slotX + relaySVisualSlotWidth - 2.5} y={slotY + 1.5} onRemove={() => removeControllerRelaySDevice(relaySDevice, slotState?.startSlot ?? slotIndex)} />
                                                                )}
                                                            </>
                                                        )}
                                                    </Group>
                                                );
                                            })}
                                        </Group>
                                    );
                                })()}
                                {(() => {
                                    const supportsRelayLine = controllerType === 'smart2'
                                        || controllerType === 'pro'
                                        || controllerType === 'go'
                                        || controllerType === 'go+';
                                    if (!supportsRelayLine) return null;
                                    const relaySAssignedDevices = controllerType === 'pro'
                                        ? getRelaySAssignedDevices(scheme, getRelaySLineConfig('pro', ports).length || 4)
                                        : [];
                                    const relaySOverflowToRelay = getControllerLineDevices(scheme, 'relay_s_devices', getRelaySPreferredDevices(scheme))
                                        .filter((device) => {
                                            if (relaySAssignedDevices.some((item) => isSameDevice(item, device))) return false;
                                            const connectionTypes = getConnectionTypes(device);
                                            return connectionTypes.includes('relay') || connectionTypes.includes('double_relay');
                                        });
                                    const relayDevices = [
                                        ...getRelayDevicesForController(scheme),
                                        ...relaySOverflowToRelay,
                                    ];
                                    const relayLines = getRelayLineConfig(controllerType, ports);
                                    const relaySlotsCount = relayLines.length;
                                    if (relaySlotsCount === 0) return null;
                                    const relayDevicesByTypeInSystem = relayDevices;
                                     const relayOccupancy = buildRelaySlotOccupancyPreserveIndexes(
                                        relayDevices,
                                        relaySlotsCount,
                                        (device) => (String(device?.connection_type || '').toLowerCase() === 'double_relay' ? 2 : 1),
                                     );
                                     const hasOccupiedRelaySlot = relayOccupancy.some(Boolean);
                                     if (!showEmptySlots && !hasOccupiedRelaySlot) return null;

                                    let rightMostRelaySlotX;
                                    let relaySlotY;
                                    if (controllerType === 'go' || controllerType === 'go+') {
                                        rightMostRelaySlotX = controllerImage.width + 4 * indentSize;
                                        relaySlotY = controllerImage.height - RELAY_SLOT_SIZE + 3 * indentSize;
                                    } else if (controllerType === 'ecosmart') {
                                        const controller420SlotHeight = 2 * indentSize;
                                        const controller420SlotY = -(controller420SlotHeight + 2 * indentSize);
                                        rightMostRelaySlotX = controllerImage.width - RELAY_SLOT_SIZE;
                                        relaySlotY = controller420SlotY - RELAY_SLOT_SIZE;
                                    } else {
                                        const rawPowerModules = Array.isArray(scheme.power_modules) ? scheme.power_modules : [];
                                        const normalizedRaw = rawPowerModules
                                            .map((item, index) => {
                                                const type = normalizePowerModuleType(typeof item === 'string' ? item : item?.type);
                                                if (!type) return null;
                                                return { id: typeof item === 'object' && item?.id ? item.id : `${type}-${index}`, type };
                                            })
                                            .filter(Boolean);
                                        const upsModules = normalizedRaw.filter((item) => item.type === 'ups');
                                        const hasUps = upsModules.length > 0;
                                        const powerModules = [
                                            ...upsModules,
                                            { id: 'required-power-unit', type: 'power-unit' },
                                            { id: 'required-circuit-breaker', type: 'circuit-breaker' },
                                            ...(hasUps ? [{ id: 'required-battery', type: 'battery' }] : []),
                                        ];
                                        const minGap = 4 * indentSize;
                                        const getPowerModuleSize = (moduleDevice) => {
                                            const key = getWirelessDeviceImageKey(moduleDevice);
                                            const image = key ? wirelessImages[key] : null;
                                            if (!image?.width || !image?.height) return { width: 80, height: 80 };
                                            return { width: image.width, height: image.height };
                                        };
                                        const placements = [];
                                        let cursorX = -minGap;
                                        const inlinePowerModules = powerModules.filter((moduleDevice) => moduleDevice.type !== 'battery');
                                        inlinePowerModules.forEach((moduleDevice, index) => {
                                            const size = getPowerModuleSize(moduleDevice);
                                            cursorX -= size.width;
                                            placements.push({
                                                moduleDevice,
                                                index,
                                                x: cursorX,
                                                y: controllerImage.height - size.height,
                                                width: size.width,
                                                height: size.height,
                                            });
                                            cursorX -= minGap;
                                        });
                                        const upsPlacement = placements.find((item) => item.moduleDevice.type === 'ups');
                                        if (upsPlacement) {
                                            const batteryModule = powerModules.find((moduleDevice) => moduleDevice.type === 'battery');
                                            if (batteryModule) {
                                                const batterySize = getPowerModuleSize(batteryModule);
                                                placements.push({
                                                    moduleDevice: batteryModule,
                                                    index: placements.length,
                                                    x: upsPlacement.x + (upsPlacement.width - batterySize.width) / 2,
                                                    y: upsPlacement.y + upsPlacement.height + 11 * indentSize,
                                                    width: batterySize.width,
                                                    height: batterySize.height,
                                                });
                                            }
                                        }
                                        if (placements.length === 0) return null;
                                        const powerMaxX = Math.max(...placements.map((item) => item.x + item.width));
                                        const batteryPlacement = placements.find((item) => item.moduleDevice.type === 'battery');
                                        const powerUnitPlacement = placements.find((item) => item.moduleDevice.type === 'power-unit');
                                        const powerRelayBaseY = batteryPlacement
                                            ? (batteryPlacement.y + batteryPlacement.height)
                                            : (powerUnitPlacement ? (powerUnitPlacement.y + powerUnitPlacement.height) : Math.max(...placements.map((item) => item.y + item.height)));
                                        rightMostRelaySlotX = powerMaxX - RELAY_SLOT_SIZE;
                                        relaySlotY = powerRelayBaseY + 7 * indentSize;
                                    }
                                    if (controllerType === 'pro') {
                                        relaySlotY += 4 * indentSize;
                                    }
                                    const relaySlotGap = 2 * indentSize;
                                    const getRelaySlotX = (slotIndex) => {
                                        if (controllerType === 'pro') {
                                            return rightMostRelaySlotX - slotIndex * (RELAY_SLOT_SIZE + relaySlotGap);
                                        }
                                        return rightMostRelaySlotX - (relaySlotsCount - 1 - slotIndex) * (RELAY_SLOT_SIZE + relaySlotGap);
                                    };
                                    const getRelaySlotMetrics = (slotIndex) => {
                                        const slotState = relayOccupancy[slotIndex] || null;
                                        const relayDevice = slotState?.device || null;
                                        const isDoubleRelayRelayDevice = String(relayDevice?.connection_type || '').toLowerCase() === 'double_relay';
                                        let relaySlotX = getRelaySlotX(slotIndex);
                                        const relayType = canonicalDeviceType(relayDevice?.type);
                                        const relayVisualDevice = relayDevice
                                            ? {
                                                ...relayDevice,
                                                port_side: relaySlotX >= controllerImage.width ? 'left' : 'right',
                                            }
                                            : null;
                                        const relayVisualImageKey = relayVisualDevice ? getWirelessDeviceImageKey(relayVisualDevice) : null;
                                        const relayVisualImage = relayVisualImageKey ? wirelessImages[relayVisualImageKey] : null;
                                         const relayVisualSlotWidth = isDoubleRelayRelayDevice
                                            ? (relayType === 'valve' ? VALVE_SLOT_WIDTH : SERVO_SLOT_SIZE)
                                            : (isRelayBoilerType(relayType)
                                            ? (relayVisualImage?.width || BUS_SLOT_SIZE)
                                            : RELAY_SLOT_SIZE);
                                         const relayVisualSlotHeight = isDoubleRelayRelayDevice
                                            ? (relayType === 'valve' ? VALVE_SLOT_HEIGHT : SERVO_SLOT_SIZE)
                                            : (isRelayBoilerType(relayType)
                                            ? (relayVisualImage?.height || BUS_SLOT_SIZE)
                                            : RELAY_SLOT_SIZE);
                                        if (isDoubleRelayRelayDevice && !slotState?.covered) {
                                            const nextRelaySlotX = getRelaySlotX(slotIndex + 1);
                                            const centerX = (relaySlotX + nextRelaySlotX + RELAY_SLOT_SIZE) / 2;
                                            relaySlotX = centerX - relayVisualSlotWidth / 2;
                                        }
                                        const relaySlotRenderY = relaySlotY
                                            + (RELAY_SLOT_SIZE - relayVisualSlotHeight)
                                            - (isRelayBoilerType(relayType) ? indentSize : 0);
                                        const relayOffset = relayDevice && !slotState?.covered
                                            ? (relaySlotOffsets[slotIndex] || { x: 0, y: 0 })
                                            : { x: 0, y: 0 };
                                        return {
                                            x: relaySlotX + relayOffset.x,
                                            y: relaySlotRenderY + relayOffset.y,
                                            width: relayVisualSlotWidth,
                                            height: relayVisualSlotHeight,
                                        };
                                    };

                                    return (
                                        <Group>
                                            {showLineFrames && (
                                                (() => {
                                                    const visibleSlotIndexes = Array.from({ length: relaySlotsCount })
                                                        .map((_, idx) => idx)
                                                        .filter((idx) => showEmptySlots || !!relayOccupancy[idx]);
                                                    if (visibleSlotIndexes.length === 0) return null;
                                                    const metrics = visibleSlotIndexes.map((idx) => getRelaySlotMetrics(idx));
                                                    const minX = Math.min(...metrics.map((item) => item.x));
                                                    const minY = Math.min(...metrics.map((item) => item.y));
                                                    const maxX = Math.max(...metrics.map((item) => item.x + item.width));
                                                    const maxY = Math.max(...metrics.map((item) => item.y + item.height));
                                                    return (
                                                        <Rect
                                                            x={minX - 10}
                                                            y={minY - 10}
                                                            width={maxX - minX + 20}
                                                            height={maxY - minY + 20}
                                                            cornerRadius={8}
                                                            fill="rgba(120,102,148,0.2)"
                                                            stroke="#786694"
                                                            strokeWidth={1}
                                                            dash={[8, 4]}
                                                            opacity={0.68}
                                                            listening={false}
                                                        />
                                                    );
                                                })()
                                            )}
                                            {Array.from({ length: relaySlotsCount }).map((_, slotIndex) => {
                                                const relayLine = relayLines[slotIndex] || null;
                                                const slotState = relayOccupancy[slotIndex] || null;
                                                const relayDevice = slotState?.device || null;
                                                const isCoveredRelaySlot = !!slotState?.covered;
                                                const isRelayOccupied = !!relayDevice;
                                                if (controllerType !== 'ecosmart' && !showEmptySlots && !isRelayOccupied) return null;
                                                let relaySlotX = getRelaySlotX(slotIndex);
                                                const relayVisualDevice = relayDevice
                                                    ? {
                                                        ...relayDevice,
                                                        port_side: relaySlotX >= controllerImage.width ? 'left' : 'right',
                                                    }
                                                    : null;
                                                const relayVisualImageKey = relayVisualDevice ? getWirelessDeviceImageKey(relayVisualDevice) : null;
                                                const relayVisualImage = relayVisualImageKey ? wirelessImages[relayVisualImageKey] : null;
                                                const isRelaySlotHovered = hoveredRelaySlotIndex === slotIndex;
                                                const relayType = canonicalDeviceType(relayDevice?.type);
                                                const isDualRelayOccupancyDevice = isRelayBoilerType(relayType);
                                                const isDoubleRelayRelayDevice = String(relayDevice?.connection_type || '').toLowerCase() === 'double_relay';
                                                 const relayVisualSlotWidth = isDoubleRelayRelayDevice
                                                    ? (relayType === 'valve' ? VALVE_SLOT_WIDTH : SERVO_SLOT_SIZE)
                                                    : (isRelayBoilerType(relayType)
                                                    ? (relayVisualImage?.width || BUS_SLOT_SIZE)
                                                    : RELAY_SLOT_SIZE);
                                                 const relayVisualSlotHeight = isDoubleRelayRelayDevice
                                                    ? (relayType === 'valve' ? VALVE_SLOT_HEIGHT : SERVO_SLOT_SIZE)
                                                    : (isRelayBoilerType(relayType)
                                                    ? (relayVisualImage?.height || BUS_SLOT_SIZE)
                                                    : RELAY_SLOT_SIZE);
                                                if (isDoubleRelayRelayDevice && !isCoveredRelaySlot) {
                                                    const nextRelaySlotX = getRelaySlotX(slotIndex + 1);
                                                    const centerX = (relaySlotX + nextRelaySlotX + RELAY_SLOT_SIZE) / 2;
                                                    relaySlotX = centerX - relayVisualSlotWidth / 2;
                                                }
                                                const relaySlotRenderY = relaySlotY
                                                    + (RELAY_SLOT_SIZE - relayVisualSlotHeight)
                                                    - (isRelayBoilerType(relayType) ? indentSize : 0);
                                                const relayOffset = isRelayOccupied && !isCoveredRelaySlot
                                                    ? (relaySlotOffsets[slotIndex] || { x: 0, y: 0 })
                                                    : { x: 0, y: 0 };
                                                relaySlotX += relayOffset.x;
                                                const relaySlotRenderYOffset = relaySlotRenderY + relayOffset.y;
                                                const relayImageSize = relayVisualImage
                                                    ? (relayType === 'valve' || relayType === 'zoneServo'
                                                        ? getFullWidthSize(relayVisualImage, relayVisualSlotWidth, relayVisualSlotHeight)
                                                        : getContainSize(relayVisualImage, relayVisualSlotWidth, relayVisualSlotHeight))
                                                    : { width: relayVisualSlotWidth, height: relayVisualSlotHeight };
                                                const relayImageX = relaySlotX + (relayVisualSlotWidth - relayImageSize.width) / 2;
                                                const relayImageY = relaySlotRenderYOffset + (relayVisualSlotHeight - relayImageSize.height) / 2;
                                                const relayTypeDevices = relayDevicesByTypeInSystem.filter((device) => canonicalDeviceType(device?.type) === relayType);
                                                const boilerPumpDevicesInSystem = relayType === 'boiler-pump'
                                                    ? (Array.isArray(scheme?.wired_devices)
                                                        ? scheme.wired_devices.filter((device) => canonicalDeviceType(device?.type) === 'boiler-pump')
                                                        : [])
                                                    : [];
                                                const relayTypeDevicesInSystem = (relayType === '220servo' || relayType === 'valve')
                                                    ? getDoubleRelayDevices(scheme).filter((device) => canonicalDeviceType(device?.type) === relayType)
                                                    : (relayType === 'boiler-pump'
                                                        ? boilerPumpDevicesInSystem
                                                        : relayTypeDevices);
                                                const relaySystemIndex = relayDevice
                                                    ? Math.max(0, relayTypeDevicesInSystem.findIndex((device) => {
                                                        if (relayDevice?.id != null && device?.id != null) return device.id === relayDevice.id;
                                                        return device === relayDevice;
                                                    })) + 1
                                                    : 0;
                                                const relayBaseTitle = relayType === 'pump-220v'
                                                    ? 'Насос 220V'
                                                    : (relayType === 'boiler-pump'
                                                        ? 'Насос бойлера'
                                                    : (isRelayBoilerType(relayType)
                                                        ? (relayDevice?.name || 'Котел')
                                                        : (relayType === '220servo'
                                                            ? 'Сервопривод'
                                                            : (relayType === 'valve'
                                                                ? 'Запорный клапан'
                                                                : (relayType === 'zoneServo' ? 'Сервопривод зоны' : 'Прочее оборудование')))));
                                                const relayInfoTitle = getDeviceStoredTitle(relayDevice) || (relaySystemIndex > 0
                                                    ? `${relayBaseTitle} ${relaySystemIndex}`
                                                    : relayBaseTitle);

                                                return (
                                                    <Group
                                                        key={`relay-slot-${slotIndex}`}
                                                        draggable={isRelayOccupied && !isCoveredRelaySlot}
                                                        onMouseEnter={() => setHoveredRelaySlotIndex(slotIndex)}
                                                        onMouseLeave={() => setHoveredRelaySlotIndex((prev) => (prev === slotIndex ? null : prev))}
                                                        onDragStart={() => {
                                                            if (!isRelayOccupied || isCoveredRelaySlot) return;
                                                            relayDragStartOffsetsRef.current[slotIndex] = relaySlotOffsets[slotIndex] || { x: 0, y: 0 };
                                                        }}
                                                        onDragMove={(event) => {
                                                            if (!isRelayOccupied || isCoveredRelaySlot) return;
                                                            const delta = event.target.position();
                                                            const startOffset = relayDragStartOffsetsRef.current[slotIndex] || { x: 0, y: 0 };
                                                            setRelaySlotOffsets((prev) => ({
                                                                ...prev,
                                                                [slotIndex]: {
                                                                    x: startOffset.x + delta.x,
                                                                    y: startOffset.y + delta.y,
                                                                },
                                                            }));
                                                            event.target.position({ x: 0, y: 0 });
                                                        }}
                                                        onDragEnd={(event) => {
                                                            if (!isRelayOccupied || isCoveredRelaySlot) return;
                                                            delete relayDragStartOffsetsRef.current[slotIndex];
                                                            event.target.position({ x: 0, y: 0 });
                                                        }}
                                                    >
                                                        {relayLine?.aPortName && isRelayOccupied && !isDualRelayOccupancyDevice && (() => {
                                                             const aPort = ports.find((port) => port.name === relayLine.aPortName);
                                                             if (!aPort) return null;
                                                             const fromX = aPort.x * controllerImage.width;
                                                             const fromY = aPort.y * controllerImage.height;
                                                             const feedIndent = controllerType === 'pro'
                                                                 ? 5
                                                                 : (controllerType === 'go' || controllerType === 'go+' ? 2 : 3);
                                                             const endY = controllerImage.height + feedIndent * indentSize;
                                                            return (
                                                                <Group>
                                                                    <Line points={[fromX, fromY, fromX, endY]} stroke="#d32f2f" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                                    <EditableInfoTitle x={fromX - 8} y={endY + 2} width={16} text="L" fontSize={10} align="center" fill="#212121" listening={false} />
                                                                </Group>
                                                            );
                                                        })()}
                                                        {!isCoveredRelaySlot && (
                                                            <>
                                                                    <Rect
                                                                        x={relaySlotX}
                                                                    y={relaySlotRenderYOffset}
                                                                    width={relayVisualSlotWidth}
                                                                    height={relayVisualSlotHeight}
                                                                    cornerRadius={10}
                                                                    fill={isRelayOccupied ? TRANSPARENT_FILL : EMPTY_SLOT_FILL}
                                                                    stroke={isRelayOccupied ? TRANSPARENT_FILL : EMPTY_SLOT_STROKE}
                                                                    strokeWidth={1.5}
                                                                />
                                                                {isRelayOccupied && relayVisualImage && (() => {
                                                                    return (
                                                                        <Image
                                                                            image={relayVisualImage}
                                                                            x={relayImageX}
                                                                            y={relayImageY}
                                                                            width={relayImageSize.width}
                                                                            height={relayImageSize.height}
                                                                            listening={false}
                                                                        />
                                                                    );
                                                                })()}
                                                                {!isRelayOccupied && !isCoveredRelaySlot && showEmptySlots && (
                                                                    <EditableInfoTitle
                                                                        x={relaySlotX + relayVisualSlotWidth - 13}
                                                                        y={relaySlotRenderYOffset + 2}
                                                                        width={10}
                                                                        height={10}
                                                                        text={String(slotIndex + 1)}
                                                                        fontSize={7}
                                                                        fill="#7b8494"
                                                                        align="right"
                                                                        listening={false}
                                                                    />
                                                                )}
                                                                {!isRelayOccupied && (controllerType === 'pro' || controllerType === 'smart2') && relayLine?.bPortName && (() => {
                                                                    const relayBPort = ports.find((port) => port.name === relayLine.bPortName);
                                                                    if (!relayBPort) return null;
                                                                    const slotCenterY = relaySlotRenderYOffset + relayVisualSlotHeight / 2;
                                                                    const toX = relayBPort.x * controllerImage.width;
                                                                    const toY = relayBPort.y * controllerImage.height;
                                                                    const fromX = relaySlotX + relayVisualSlotWidth;
                                                                    const fromY = slotCenterY;
                                                                    const outX = fromX + indentSize;
                                                                    const bendY = relaySlotRenderYOffset + relayVisualSlotHeight + (slotIndex + 1) * indentSize;
                                                                    return (
                                                                        <Line
                                                                            points={[fromX, fromY, outX, fromY, outX, bendY, toX, bendY, toX, toY]}
                                                                            stroke="#9e9e9e"
                                                                            strokeWidth={1}
                                                                            lineCap="round"
                                                                            lineJoin="round"
                                                                            listening={false}
                                                                        />
                                                                    );
                                                                })()}
                                                                {!isRelayOccupied && (controllerType === 'go' || controllerType === 'go+') && relayLine?.bPortName && (() => {
                                                                    const relayBPort = ports.find((port) => port.name === relayLine.bPortName);
                                                                    if (!relayBPort) return null;
                                                                    const fromX = relaySlotX;
                                                                    const fromY = relaySlotRenderYOffset + relayVisualSlotHeight / 2;
                                                                    const toX = relayBPort.x * controllerImage.width;
                                                                    const toY = relayBPort.y * controllerImage.height;
                                                                    const relayOutX = fromX - indentSize;
                                                                    const bendY = Math.max(controllerImage.height + 2 * indentSize, relaySlotRenderYOffset + relayVisualSlotHeight + indentSize);
                                                                    return (
                                                                        <Line
                                                                            points={[fromX, fromY, relayOutX, fromY, relayOutX, bendY, toX, bendY, toX, toY]}
                                                                            stroke="#9e9e9e"
                                                                            strokeWidth={1}
                                                                            lineCap="round"
                                                                            lineJoin="round"
                                                                            listening={false}
                                                                        />
                                                                    );
                                                                })()}
                                                            </>
                                                        )}
                                                        {showPorts && isRelayOccupied && relayVisualImageKey && !isCoveredRelaySlot && (() => {
                                                            const relayPorts = isDoubleRelayRelayDevice
                                                                ? (wirelessPortsByType[relayVisualImageKey] || []).filter(isDoubleRelaySignalPort)
                                                                : (wirelessPortsByType[relayVisualImageKey] || []);
                                                            return relayPorts.map((port) => (
                                                                <Circle
                                                                    key={`relay-slot-port-${slotIndex}-${port.name}`}
                                                                    x={relayImageX + port.x * relayImageSize.width}
                                                                    y={relayImageY + port.y * relayImageSize.height}
                                                                    radius={2.5}
                                                                    fill="red"
                                                                    listening={false}


                                                                />
                                                            ));
                                                        })()}
                                                        {isRelayOccupied && !isCoveredRelaySlot && (
                                                            <>
                                                                <Rect x={relaySlotX} y={relaySlotRenderYOffset - (INFO_BLOCK_HEIGHT + 8)} width={relayVisualSlotWidth} height={INFO_BLOCK_HEIGHT} cornerRadius={1} fill={INFO_BLOCK_FILL} stroke={INFO_BLOCK_STROKE} strokeWidth={INFO_BLOCK_STROKE_WIDTH} />
                                                                <EditableInfoTitle x={relaySlotX + 4} y={relaySlotRenderYOffset - (INFO_BLOCK_HEIGHT + 8)} text={relayInfoTitle} fontSize={4} fill={INFO_BLOCK_TEXT_COLOR} width={Math.max(40, relayVisualSlotWidth - 8)} height={INFO_BLOCK_HEIGHT} align="center" verticalAlign="middle" device={relayDevice} title={relayInfoTitle} />
                                                            </>
                                                        )}
                                                         {isRelayOccupied && relayVisualImageKey && relayLine?.bPortName && !isCoveredRelaySlot && (() => {
                                                             const relayPorts = wirelessPortsByType[relayVisualImageKey] || [];
                                                             const controllerRelayBPort = ports.find((port) => port.name === relayLine.bPortName);
                                                             if (!controllerRelayBPort) return null;

                                                             if (isDoubleRelayRelayDevice) {
                                                                const nextRelayLine = relayLines[slotIndex + 1] || null;
                                                                const controllerRelayBPort1 = relayLine?.bPortName
                                                                    ? ports.find((port) => port.name === relayLine.bPortName)
                                                                    : null;
                                                                const controllerRelayBPort2 = nextRelayLine?.bPortName
                                                                    ? ports.find((port) => port.name === nextRelayLine.bPortName)
                                                                    : null;
                                                                const servoRelay1 = getRelayTerminalPort(relayPorts, 1, relayType === 'valve');
                                                                const servoRelay2 = getRelayTerminalPort(relayPorts, 2, relayType === 'valve');
                                                                if (!controllerRelayBPort1 || !controllerRelayBPort2 || !servoRelay1 || !servoRelay2) return null;

                                                                const from1X = relayImageX + servoRelay1.x * relayImageSize.width;
                                                                const from1Y = relayImageY + servoRelay1.y * relayImageSize.height;
                                                                const from2X = relayImageX + servoRelay2.x * relayImageSize.width;
                                                                const from2Y = relayImageY + servoRelay2.y * relayImageSize.height;

                                                                const to1X = controllerRelayBPort1.x * controllerImage.width;
                                                                const to1Y = controllerRelayBPort1.y * controllerImage.height;
                                                                const to2X = controllerRelayBPort2.x * controllerImage.width;
                                                                const to2Y = controllerRelayBPort2.y * controllerImage.height;

                                                                const relay1OutX = from1X + 2 * indentSize;
                                                                const relay2OutX = from2X + indentSize;
                                                                const slotBasedOffset = (slotIndex + 1) * indentSize;
                                                                const minRouteY = Math.max(
                                                                    controllerImage.height + 3 * indentSize,
                                                                    relaySlotRenderYOffset + relayVisualSlotHeight + slotBasedOffset + 3 * indentSize,
                                                                );
                                                                const shouldLiftValveOnFirstProRelays = controllerType === 'pro'
                                                                    && relayType === 'valve'
                                                                    && relayLine.index === 1
                                                                    && nextRelayLine?.index === 2;
                                                                const routeLiftY = (relayLine.index === 2 && nextRelayLine?.index === 3) || shouldLiftValveOnFirstProRelays
                                                                    ? 3 * indentSize
                                                                    : 0;
                                                                const relay1RouteY = Math.max(from2Y + 4 * indentSize, minRouteY) - routeLiftY;
                                                                const relay2RouteY = Math.max(from1Y + 3 * indentSize, minRouteY + indentSize) - routeLiftY;
                                                                const relayLineStroke = relayType === '220servo' || relayType === 'valve' ? '#d32f2f' : '#2e7d32';

                                                                return (
                                                                    <>
                                                                        <Line
                                                                            points={[from1X, from1Y, relay1OutX, from1Y, relay1OutX, relay1RouteY, to1X, relay1RouteY, to1X, to1Y]}
                                                                            stroke={relayLineStroke}
                                                                            strokeWidth={1}
                                                                            lineCap="round"
                                                                            lineJoin="round"
                                                                            listening={false}
                                                                        />
                                                                        <Line
                                                                            points={[from2X, from2Y, relay2OutX, from2Y, relay2OutX, relay2RouteY, to2X, relay2RouteY, to2X, to2Y]}
                                                                            stroke={relayLineStroke}
                                                                            strokeWidth={1}
                                                                            lineCap="round"
                                                                            lineJoin="round"
                                                                            listening={false}
                                                                        />
                                                                    </>
                                                                );
                                                            }

                                                            if (isDualRelayOccupancyDevice) {
                                                                const controllerRelayAPort = relayLine?.aPortName
                                                                    ? ports.find((port) => port.name === relayLine.aPortName)
                                                                    : null;
                                                                const boilerBusAPort = relayPorts.find((port) => port.name === 'BUS-A');
                                                                const boilerBusBPort = relayPorts.find((port) => port.name === 'BUS-B');
                                                                if (!controllerRelayAPort || !boilerBusAPort || !boilerBusBPort) return null;

                                                                const aFromX = controllerRelayAPort.x * controllerImage.width;
                                                                const aFromY = controllerRelayAPort.y * controllerImage.height;
                                                                const aToX = relayImageX + boilerBusAPort.x * relayImageSize.width;
                                                                const aToY = relayImageY + boilerBusAPort.y * relayImageSize.height;

                                                                const bFromX = controllerRelayBPort.x * controllerImage.width;
                                                                const bFromY = controllerRelayBPort.y * controllerImage.height;
                                                                const bToX = relayImageX + boilerBusBPort.x * relayImageSize.width;
                                                                const bToY = relayImageY + boilerBusBPort.y * relayImageSize.height;

                                                                 const stupidBoilerBusARouteY = relayImageY + relayImageSize.height + (slotIndex + 2.5) * indentSize;
                                                                 const stupidBoilerBusBRouteY = relayImageY + relayImageSize.height + (slotIndex + 2) * indentSize;
                                                                 const slotBasedOffset = controllerType === 'pro'
                                                                     ? (slotIndex + 1) * indentSize
                                                                     : indentSize;
                                                                 const bendY = Math.max(controllerImage.height + 2 * indentSize, relaySlotRenderYOffset + relayVisualSlotHeight + slotBasedOffset);

                                                                 return (
                                                                     <>
                                                                         <Line points={controllerType === 'pro' && isStupidBoilerType(relayType)
                                                                             ? [aToX, aToY, aToX, stupidBoilerBusARouteY, bFromX, stupidBoilerBusARouteY, bFromX, bFromY]
                                                                             : getOrthogonalLinkPoints(aFromX, aFromY, bendY, aToX, aToY)} stroke="#2e7d32" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                                         <Line points={controllerType === 'pro' && isStupidBoilerType(relayType)
                                                                             ? [bToX, bToY, bToX, stupidBoilerBusBRouteY, aFromX, stupidBoilerBusBRouteY, aFromX, aFromY]
                                                                             : getOrthogonalLinkPoints(bFromX, bFromY, bendY + indentSize, bToX, bToY)} stroke="#2e7d32" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                                     </>
                                                                 );
                                                            }

                                                            const relayInPort = getRelayInputPort(relayPorts, relayType, relayVisualImageKey);
                                                            if (!relayInPort) return null;
                                                            const fromX = controllerRelayBPort.x * controllerImage.width;
                                                            const fromY = controllerRelayBPort.y * controllerImage.height;
                                                            const toX = relayImageX + relayInPort.x * relayImageSize.width;
                                                            const toY = relayImageY + relayInPort.y * relayImageSize.height;
                                                              const slotBasedOffset = controllerType === 'pro'
                                                                  ? (slotIndex + 1) * indentSize
                                                                  : indentSize;
                                                                const bendY = Math.max(controllerImage.height + 2 * indentSize, relaySlotRenderYOffset + relayVisualSlotHeight + slotBasedOffset);
                                                                if (controllerType === 'go' || controllerType === 'go+') {
                                                                    const relayOutX = toX - indentSize;
                                                                    return (
                                                                        <>
                                                                            <Line
                                                                                points={[toX, toY, relayOutX, toY, relayOutX, bendY, fromX, bendY, fromX, fromY]}
                                                                                stroke="#d32f2f"
                                                                                strokeWidth={1}
                                                                                lineCap="round"
                                                                                lineJoin="round"
                                                                                listening={false}
                                                                            />
                                                                            {showPorts && <Circle x={toX} y={toY} radius={2.5} fill="red" listening={false} />}
                                                                        </>
                                                                    );
                                                                }
                                                                 if ((controllerType === 'pro' || controllerType === 'smart2') && relayType === 'pump-220v') {
                                                                     const relayOutX = toX + indentSize;
                                                                    return (
                                                                        <>
                                                                            <Line
                                                                                points={[toX, toY, relayOutX, toY, relayOutX, bendY, fromX, bendY, fromX, fromY]}
                                                                                stroke="#d32f2f"
                                                                                strokeWidth={1}
                                                                                lineCap="round"
                                                                                lineJoin="round"
                                                                                listening={false}
                                                                            />
                                                                            {showPorts && <Circle x={toX} y={toY} radius={2.5} fill="red" listening={false} />}
                                                                        </>
                                                                    );
                                                                }
                                                                if (relayType === 'boiler-pump') {
                                                                    const relayOutX = toX + indentSize;
                                                                    return (
                                                                       <>
                                                                           <Line
                                                                               points={[toX, toY, relayOutX, toY, relayOutX, bendY, fromX, bendY, fromX, fromY]}
                                                                               stroke="#d32f2f"
                                                                               strokeWidth={1}
                                                                               lineCap="round"
                                                                               lineJoin="round"
                                                                               listening={false}
                                                                           />
                                                                           {showPorts && <Circle x={toX} y={toY} radius={2.5} fill="red" listening={false} />}
                                                                       </>
                                                                   );
                                                               }
                                                                 if ((controllerType === 'pro' || controllerType === 'smart2') && relayType === 'zoneServo') {
                                                                     const relayOutX = toX + indentSize;
                                                                    return (
                                                                      <>
                                                                          <Line
                                                                              points={[toX, toY, relayOutX, toY, relayOutX, bendY, fromX, bendY, fromX, fromY]}
                                                                              stroke="#d32f2f"
                                                                              strokeWidth={1}
                                                                              lineCap="round"
                                                                              lineJoin="round"
                                                                              listening={false}
                                                                          />
                                                                          {showPorts && <Circle x={toX} y={toY} radius={2.5} fill="red" listening={false} />}
                                                                      </>
                                                                   );
                                                               }
                                                               if (controllerType === 'pro' && relayType === 'valve') {
                                                                   const relayOutX = toX + indentSize;
                                                                   return (
                                                                       <>
                                                                           <Line
                                                                               points={[toX, toY, relayOutX, toY, relayOutX, bendY, fromX, bendY, fromX, fromY]}
                                                                               stroke="#d32f2f"
                                                                               strokeWidth={1}
                                                                               lineCap="round"
                                                                               lineJoin="round"
                                                                               listening={false}
                                                                           />
                                                                           {showPorts && <Circle x={toX} y={toY} radius={2.5} fill="red" listening={false} />}
                                                                       </>
                                                                   );
                                                               }
                                                               return (
                                                                  <>
                                                                     <Line
                                                                         points={getRelayLinkPointsToDevice({
                                                                             fromX,
                                                                             fromY,
                                                                             bendY,
                                                                             toX,
                                                                             toY,
                                                                             device: relayVisualDevice,
                                                                             imageKey: relayVisualImageKey,
                                                                             indentSize,
                                                                         })}
                                                                         stroke="#d32f2f"
                                                                         strokeWidth={1}
                                                                         lineCap="round"
                                                                         lineJoin="round"
                                                                         listening={false}
                                                                     />
                                                                     {showPorts && <Circle x={toX} y={toY} radius={2.5} fill="red" listening={false} />}
                                                                 </>
                                                             );
                                                        })()}
                                                        {isRelayOccupied && isRelaySlotHovered && !isCoveredRelaySlot && (
                                                            <SlotDeleteButton
                                                                compact
                                                                x={relaySlotX + relayVisualSlotWidth - 2.5}
                                                                y={relaySlotRenderYOffset + 1.5}
                                                                onRemove={() => {
                                                                    setScheme((s) => {
                                                                        const targetId = relayDevice?.id;
                                                                        if (targetId == null) return s;
                                                                        const controllerPatched = patchControllerLine(s, 'relay_devices', (currentLine) => removeRelayDeviceAtSlotFromLine(currentLine, slotIndex, relaySlotsCount, relayDevice));
                                                                        if (controllerPatched) return controllerPatched;
                                                                        if (isRelayBoilerType(relayType)) {
                                                                            const currentBoilers = Array.isArray(s.boilers) ? s.boilers : [];
                                                                            return { ...s, boilers: currentBoilers.filter((item) => item?.id !== targetId) };
                                                                        }
                                                                        const currentWired = Array.isArray(s.wired_devices) ? s.wired_devices : [];
                                                                        return { ...s, wired_devices: currentWired.filter((item) => item?.id !== targetId) };
                                                                    });
                                                                    setHoveredRelaySlotIndex((prev) => (prev === slotIndex ? null : prev));
                                                                }}
                                                            />
                                                        )}
                                                         {!isRelayOccupied && showEmptySlots && !isCoveredRelaySlot && (
                                                            <>
                                                                <Circle
                                                                    x={relaySlotX + relayVisualSlotWidth / 2}
                                                                    y={relaySlotRenderYOffset + relayVisualSlotHeight / 2}
                                                                    radius={16}
                                                                    fill={ADD_ACTION_FILL}
                                                                    onClick={(e) => {
                                                                        const pos = e.target.getAbsolutePosition();
                                                                        setRelayMenuPos({ x: pos.x, y: pos.y, slotIndex, lineKey: 'relay_devices' });
                                                                    }}
                                                                    onTap={(e) => {
                                                                        const pos = e.target.getAbsolutePosition();
                                                                        setRelayMenuPos({ x: pos.x, y: pos.y, slotIndex, lineKey: 'relay_devices' });
                                                                    }}
                                                                />
                                                                <EditableInfoTitle x={relaySlotX + relayVisualSlotWidth / 2} y={relaySlotRenderYOffset + relayVisualSlotHeight / 2} text="+" fontSize={22} fill={ADD_ACTION_TEXT_FILL} offsetX={6.5} offsetY={9} listening={false} />
                                                            </>
                                                        )}
                                                    </Group>
                                                );
                                            })}
                                        </Group>
                                    );
                                })()}
                                {(() => {
                                    if (controllerType !== 'smart2') return null;

                                    const normalizedPowerModules = Array.isArray(scheme.power_modules)
                                        ? scheme.power_modules
                                            .map((item) => normalizePowerModuleType(typeof item === 'string' ? item : item?.type))
                                            .filter(Boolean)
                                        : [];
                                    const hasUpsInPower = normalizedPowerModules.includes('ups');
                                    const smart2DiModules = getDiModules(scheme);
                                    const usedDiPorts = new Set();
                                    if (hasUpsInPower) {
                                        usedDiPorts.add(1);
                                        usedDiPorts.add(2);
                                    }
                                    const modulePairOrder = hasUpsInPower ? [[3, 4], [1, 2]] : [[1, 2], [3, 4]];
                                    smart2DiModules.forEach((_, moduleIndex) => {
                                        const pair = modulePairOrder[moduleIndex] || [];
                                        pair.forEach((portIndex) => usedDiPorts.add(portIndex));
                                    });
                                    const availableDiPorts = [1, 2, 3, 4].filter((portIndex) => !usedDiPorts.has(portIndex));
                                    if (availableDiPorts.length === 0 && !showEmptySlots) return null;

                                    const rawPowerModules = Array.isArray(scheme.power_modules) ? scheme.power_modules : [];
                                    const normalizedRaw = rawPowerModules
                                        .map((item, index) => {
                                            const type = normalizePowerModuleType(typeof item === 'string' ? item : item?.type);
                                            if (!type) return null;
                                            return { id: typeof item === 'object' && item?.id ? item.id : `${type}-${index}`, type };
                                        })
                                        .filter(Boolean);
                                    const upsModules = normalizedRaw.filter((item) => item.type === 'ups');
                                    const hasUps = upsModules.length > 0;
                                    const powerModules = [
                                        ...upsModules,
                                        { id: 'required-power-unit', type: 'power-unit' },
                                        { id: 'required-circuit-breaker', type: 'circuit-breaker' },
                                        ...(hasUps ? [{ id: 'required-battery', type: 'battery' }] : []),
                                    ];
                                    const minGap = 4 * indentSize;
                                    const getPowerModuleSize = (moduleDevice) => {
                                        const key = getWirelessDeviceImageKey(moduleDevice);
                                        const image = key ? wirelessImages[key] : null;
                                        if (!image?.width || !image?.height) return { width: 80, height: 80 };
                                        return { width: image.width, height: image.height };
                                    };
                                    const placements = [];
                                    let cursorX = -minGap;
                                    powerModules.filter((moduleDevice) => moduleDevice.type !== 'battery').forEach((moduleDevice, index) => {
                                        const size = getPowerModuleSize(moduleDevice);
                                        cursorX -= size.width;
                                        placements.push({
                                            moduleDevice,
                                            index,
                                            x: cursorX,
                                            y: controllerImage.height - size.height,
                                            width: size.width,
                                            height: size.height,
                                        });
                                        cursorX -= minGap;
                                    });
                                    const upsPlacement = placements.find((item) => item.moduleDevice.type === 'ups');
                                    if (upsPlacement) {
                                        const batteryModule = powerModules.find((moduleDevice) => moduleDevice.type === 'battery');
                                        if (batteryModule) {
                                            const batterySize = getPowerModuleSize(batteryModule);
                                            placements.push({
                                                moduleDevice: batteryModule,
                                                index: placements.length,
                                                x: upsPlacement.x + (upsPlacement.width - batterySize.width) / 2,
                                                y: upsPlacement.y + upsPlacement.height + 11 * indentSize,
                                                width: batterySize.width,
                                                height: batterySize.height,
                                            });
                                        }
                                    }
                                    if (placements.length === 0) return null;

                                    const powerMaxX = Math.max(...placements.map((item) => item.x + item.width));
                                    const batteryPlacement = placements.find((item) => item.moduleDevice.type === 'battery');
                                    const powerUnitPlacement = placements.find((item) => item.moduleDevice.type === 'power-unit');
                                    const powerRelayBaseY = batteryPlacement
                                        ? (batteryPlacement.y + batteryPlacement.height)
                                        : (powerUnitPlacement ? (powerUnitPlacement.y + powerUnitPlacement.height) : Math.max(...placements.map((item) => item.y + item.height)));
                                    const relaySlotX = powerMaxX - RELAY_SLOT_SIZE;
                                    const relaySlotY = powerRelayBaseY + 7 * indentSize;
                                    const diSlotWidth = 9 * indentSize;
                                    const diSlotHeight = 3 * indentSize;
                                    const diSlotGap = 2 * indentSize;
                                    const diSlotX = relaySlotX + RELAY_SLOT_SIZE / 2 - diSlotWidth / 2;
                                     const firstDiSlotY = relaySlotY + RELAY_SLOT_SIZE + 3 * indentSize;
                                     const smart2DiDevices = getControllerLineDevices(scheme, 'di_devices')
                                        .map((device) => (device ? { ...device, type: canonicalDeviceType(device?.type) } : null))
                                        .slice(0, availableDiPorts.length);
                                    const visibleSlots = availableDiPorts
                                        .map((portIndex, slotIndex) => ({ portIndex, device: smart2DiDevices[slotIndex] || null }))
                                        .filter((slot) => slot.device || showEmptySlots);

                                    if (visibleSlots.length === 0) return null;

                                    return (
                                        <Group>
                                            {visibleSlots.map(({ portIndex, device }, slotIndex) => {
                                                const controllerPort = ports.find((port) => port.name === `DI-OUT-${portIndex}`) || null;
                                                if (!controllerPort) return null;
                                                const slotYOffset = portIndex === 1
                                                    ? indentSize
                                                    : (portIndex === 2
                                                        ? 3 * indentSize
                                                        : (portIndex === 3 ? 5 * indentSize : (portIndex === 4 ? 6 * indentSize : 0)));
                                                const baseSlotY = firstDiSlotY + slotIndex * (diSlotHeight + diSlotGap) + slotYOffset;
                                                const offsetKey = getRuntimeOffsetKey(device, slotIndex, 'controller-di');
                                                const offset = device ? (diSlotOffsets[offsetKey] || { x: 0, y: 0 }) : { x: 0, y: 0 };
                                                const slotX = diSlotX + offset.x;
                                                const slotY = baseSlotY + offset.y;
                                                const slotTargetX = slotX;
                                                const slotTargetY = slotY + diSlotHeight / 2;
                                                const visualDevice = device
                                                    ? {
                                                        ...device,
                                                        port_side: slotX < controllerImage.width ? 'right' : 'left',
                                                    }
                                                    : null;
                                                const imageKey = visualDevice ? getWirelessDeviceImageKey(visualDevice) : null;
                                                const image = imageKey ? wirelessImages[imageKey] : null;
                                                const devicePorts = imageKey ? (wirelessPortsByType[imageKey] || []) : [];
                                                const diInputPort = getDiInputPort(devicePorts);
                                                const imageSize = image ? getContainSize(image, diSlotWidth, diSlotHeight) : { width: diSlotWidth, height: diSlotHeight };
                                                const imageX = slotX + (diSlotWidth - imageSize.width) / 2;
                                                const imageY = slotY + (diSlotHeight - imageSize.height) / 2;
                                                 const toX = device && diInputPort ? imageX + diInputPort.x * imageSize.width : slotTargetX;
                                                 const toY = device && diInputPort ? imageY + diInputPort.y * imageSize.height : slotTargetY;
                                                  const diInfoTitle = device ? getDiDeviceTitle(scheme, device) : '';
                                                  const showDiInfoBlock = device && shouldShowDiDeviceInfoBlock(device);
                                                  const hoverKey = `controller-di:${slotIndex}`;
                                                  const isHovered = hoveredNtcSlotKey === hoverKey;

                                                return (
                                                    <Group
                                                        key={`smart2-controller-di-${portIndex}`}
                                                        draggable={Boolean(device)}
                                                        onDragStart={() => {
                                                            if (!device) return;
                                                            diDragStartOffsetsRef.current[offsetKey] = diSlotOffsets[offsetKey] || { x: 0, y: 0 };
                                                        }}
                                                        onDragMove={(event) => {
                                                            if (!device) return;
                                                            const delta = event.target.position();
                                                            const startOffset = diDragStartOffsetsRef.current[offsetKey] || { x: 0, y: 0 };
                                                            setDiSlotOffsets((prev) => ({
                                                                ...prev,
                                                                [offsetKey]: {
                                                                    x: startOffset.x + delta.x,
                                                                    y: startOffset.y + delta.y,
                                                                },
                                                            }));
                                                            event.target.position({ x: 0, y: 0 });
                                                        }}
                                                        onDragEnd={(event) => {
                                                            if (!device) return;
                                                            delete diDragStartOffsetsRef.current[offsetKey];
                                                            event.target.position({ x: 0, y: 0 });
                                                        }}
                                                    >
                                                        <Line
                                                            points={[controllerPort.x * controllerImage.width, controllerPort.y * controllerImage.height, controllerPort.x * controllerImage.width, toY, toX, toY]}
                                                            stroke="#1565c0"
                                                            strokeWidth={1}
                                                            lineCap="round"
                                                            lineJoin="round"
                                                            listening={false}
                                                        />
                                                         <Rect
                                                             x={slotX}
                                                             y={slotY}
                                                             width={diSlotWidth}
                                                             height={diSlotHeight}
                                                            cornerRadius={6}
                                                            fill={device ? TRANSPARENT_FILL : EMPTY_SLOT_FILL}
                                                             stroke={device ? TRANSPARENT_FILL : EMPTY_SLOT_STROKE}
                                                              strokeWidth={1.2}
                                                              onMouseEnter={() => setHoveredNtcSlotKey(hoverKey)}
                                                              onMouseLeave={() => setHoveredNtcSlotKey((prev) => (prev === hoverKey ? null : prev))}
                                                          />
                                                         {!device && (
                                                             <>
                                                                 <Circle
                                                                     x={slotX + diSlotWidth / 2}
                                                                     y={slotY + diSlotHeight / 2}
                                                                     radius={10}
                                                                     fill={ADD_ACTION_FILL}
                                                                     onClick={(e) => {
                                                                         const pos = e.target.getAbsolutePosition();
                                                                         setControllerDiMenuPos({ x: pos.x, y: pos.y, slotIndex });
                                                                     }}
                                                                     onTap={(e) => {
                                                                         const pos = e.target.getAbsolutePosition();
                                                                         setControllerDiMenuPos({ x: pos.x, y: pos.y, slotIndex });
                                                                     }}
                                                                 />
                                                                 <Text
                                                                     x={slotX + diSlotWidth / 2}
                                                                     y={slotY + diSlotHeight / 2}
                                                                     text="+"
                                                                     fontSize={15}
                                                                     fill={INFO_BLOCK_FILL}
                                                                     offsetX={4.5}
                                                                     offsetY={6}
                                                                     listening={false}
                                                                 />
                                                             </>
                                                         )}
                                                         {device && image && <Image image={image} x={imageX} y={imageY} width={imageSize.width} height={imageSize.height} listening={false} />}
                                                         {showDiInfoBlock && (
                                                             <>
                                                                  <Rect x={slotX} y={slotY - (INFO_BLOCK_HEIGHT + 4)} width={diSlotWidth} height={INFO_BLOCK_HEIGHT} cornerRadius={1} fill={INFO_BLOCK_FILL} stroke={INFO_BLOCK_STROKE} strokeWidth={INFO_BLOCK_STROKE_WIDTH} />
                                                                  <EditableInfoTitle x={slotX + 3} y={slotY - (INFO_BLOCK_HEIGHT + 4)} width={Math.max(30, diSlotWidth - 6)} height={INFO_BLOCK_HEIGHT} text={diInfoTitle} fontSize={4} fill={INFO_BLOCK_TEXT_COLOR} align="center" verticalAlign="middle" device={device} title={diInfoTitle} />
                                                            </>
                                                        )}
                                                         {showPorts && devicePorts.map((port) => (
                                                            <Circle
                                                                key={`smart2-controller-di-port-${portIndex}-${port.name}`}
                                                                x={imageX + port.x * imageSize.width}
                                                                y={imageY + port.y * imageSize.height}
                                                                radius={2.5}
                                                                fill="red"
                                                                listening={false}
                                                             />
                                                         ))}
                                                         {device && isHovered && (
                                                             <SlotDeleteButton compact x={slotX + diSlotWidth - 2.5} y={slotY + 1.5} onRemove={() => removeControllerDiDeviceAtSlot(slotIndex)} />
                                                         )}
                                                     </Group>
                                                );
                                            })}
                                        </Group>
                                    );
                                })()}
                                {(() => {
                                    const busLineCount = getBusLineCount(controllerType);
                                    const busDevices = getBusDevices(scheme);
                                    return (
                                        <>
                                            {Array.from({ length: busLineCount }).map((_, lineIndex) => {
                                                const busDevice = busDevices[lineIndex] || null;
                                                const busImageKey = busDevice ? getWirelessDeviceImageKey(busDevice) : null;
                                                const busImage = busImageKey ? wirelessImages[busImageKey] : null;
                                                const busPorts = busImageKey ? (wirelessPortsByType[busImageKey] || []) : [];
                                                const slotWidth = busImage?.width || BUS_SLOT_SIZE;
                                                const slotHeight = busImage?.height || BUS_SLOT_SIZE;
                                                const getBusSlotPosition = () => {
                                                    const busAPort = ports.find((p) => p.name === 'BUS-A');
                                                    const getAlignedXByBusA = (fallbackX) => {
                                                        if (!busAPort || controllerType === 'ecosmart') return fallbackX;
                                                        const busALineX = busAPort.x * controllerImage.width;
                                                        const targetRightEdgeX = busALineX - 0.5 * indentSize;
                                                        return targetRightEdgeX - slotWidth;
                                                    };
                                                    if (controllerType === 'go' || controllerType === 'go+') {
                                                        const fallbackX = -slotWidth - 4 * indentSize;
                                                        const alignedX = getAlignedXByBusA(fallbackX);
                                                        const maxAllowedX = -slotWidth - 2 * indentSize;
                                                        return { x: Math.min(alignedX, maxAllowedX), y: controllerImage.height - slotHeight };
                                                    }
                                                    if (controllerType === 'smart2') {
                                                        return { x: getAlignedXByBusA(0), y: controllerImage.height + 1.5 * moduleHeightValue + 7 * indentSize };
                                                    }
                                                    if (controllerType === 'pro') {
                                                        const relaySAssignedDevices = getRelaySAssignedDevices(scheme, getRelaySLineConfig('pro', ports).length || 4);
                                                        const controllerRelayDevices = getRelayDevicesForController(scheme);
                                                        const relaySOverflowToRelay = getControllerLineDevices(scheme, 'relay_s_devices', getRelaySPreferredDevices(scheme))
                                                            .filter((device) => {
                                                                if (relaySAssignedDevices.some((item) => isSameDevice(item, device))) return false;
                                                                if (controllerRelayDevices.some((item) => isSameDevice(item, device))) return false;
                                                                const connectionTypes = getConnectionTypes(device);
                                                                return connectionTypes.includes('relay') || connectionTypes.includes('double_relay');
                                                            });
                                                        const relayDevices = [
                                                            ...controllerRelayDevices,
                                                            ...relaySOverflowToRelay,
                                                        ];
                                                        const relayLines = getRelayLineConfig('pro', ports);
                                                        const relayOccupancy = buildRelaySlotOccupancyPreserveIndexes(
                                                            relayDevices,
                                                            relayLines.length,
                                                            (device) => (String(device?.connection_type || '').toLowerCase() === 'double_relay' ? 2 : 1),
                                                        );
                                                        const occupiedRelayPortsCount = relayOccupancy.filter(Boolean).length;
                                                        const hasRelayOccupancy = occupiedRelayPortsCount > 0;
                                                        const normalizedPowerModules = Array.isArray(scheme.power_modules)
                                                            ? scheme.power_modules
                                                                .map((item) => normalizePowerModuleType(typeof item === 'string' ? item : item?.type))
                                                                .filter(Boolean)
                                                            : [];
                                                        const hasUpsInPower = normalizedPowerModules.includes('ups');
                                                        let busOffsetMultiplier = 0.95;
                                                        if (occupiedRelayPortsCount >= 1 && occupiedRelayPortsCount <= 2) {
                                                            busOffsetMultiplier = 0.95;
                                                        } else if (occupiedRelayPortsCount >= 3) {
                                                            busOffsetMultiplier = hasUpsInPower ? 1.9 : 0.95;
                                                         } else if (hasRelayOccupancy) {
                                                             busOffsetMultiplier = 0.5;
                                                         }
                                                         const relaySlot4Index = relayLines.findIndex((relayLine) => relayLine.index === 4);
                                                         const relaySlot4Occupied = relaySlot4Index >= 0 && Boolean(relayOccupancy[relaySlot4Index]);
                                                         const relaySlot4Offset = relaySlot4Occupied ? 5 * indentSize : 0;
                                                         return {
                                                             x: getAlignedXByBusA(0),
                                                             y: controllerImage.height + moduleHeightValue * busOffsetMultiplier + relaySlot4Offset,
                                                         };
                                                     }
                                                    if (controllerType === 'ecosmart') {
                                                        const p1a = ports.find((p) => p.name === 'BUS-1-A');
                                                        const p1b = ports.find((p) => p.name === 'BUS-1-B');
                                                        if (p1a && p1b) {
                                                            const firstCenterX = ((p1a.x + p1b.x) / 2) * controllerImage.width;
                                                            const firstY = Math.min(p1a.y, p1b.y) * controllerImage.height - moduleHeightValue - slotHeight - 6 * indentSize;
                                                            const firstX = firstCenterX - slotWidth / 2 + 6 * indentSize - 4.5 * indentSize;
                                                            if (lineIndex === 0) {
                                                                return { x: firstX, y: firstY };
                                                            }
                                                            return { x: firstX + slotWidth + 2 * indentSize, y: firstY };
                                                        }
                                                        return { x: lineIndex * (slotWidth + 2 * indentSize), y: -moduleHeightValue - slotHeight - 6 * indentSize };
                                                    }
                                                    return { x: getAlignedXByBusA(0), y: controllerImage.height + moduleHeightValue * 0.25 };
                                                 };
                                                 const slotPos = getBusSlotPosition();
                                                 const busOffset = busSlotOffsets[lineIndex] || { x: 0, y: 0 };
                                                 const hasRinnaiAdapter = usesRinnaiAdapter(busDevice);
                                                 const useEcosmartRinnaiLayout = hasRinnaiAdapter && controllerType === 'ecosmart';
                                                 const slotX = slotPos.x + busOffset.x
                                                     - (hasRinnaiAdapter ? (useEcosmartRinnaiLayout ? 5.5 : 5) * indentSize : 0)
                                                     - (useEcosmartRinnaiLayout && lineIndex === 0 ? indentSize : 0)
                                                     + (useEcosmartRinnaiLayout && lineIndex === 1 ? 6 * indentSize : 0);
                                                 const slotY = slotPos.y + busOffset.y + getRinnaiBusSlotYOffset(controllerType, busDevice, indentSize);
                                                 const isOccupied = !!busDevice;
                                                const rinnaiAdapterImage = hasRinnaiAdapter ? wirelessImages['rinnai-adapter'] : null;
                                                const rinnaiAdapterPorts = hasRinnaiAdapter ? (wirelessPortsByType['rinnai-adapter'] || []) : [];
                                                const rinnaiAdapterWidth = rinnaiAdapterImage?.width || 27;
                                                const rinnaiAdapterHeight = rinnaiAdapterImage?.height || 47;
                                                 const rinnaiAdapterX = slotX + slotWidth + (useEcosmartRinnaiLayout ? 4 : 2) * indentSize;
                                                 const rinnaiAdapterY = slotY + (slotHeight - rinnaiAdapterHeight) / 2
                                                     + (useEcosmartRinnaiLayout && lineIndex === 1 ? 5 * indentSize : 0);
                                                if (!isOccupied && !showEmptySlots) return null;
                                                const isHovered = hoveredBusLineIndex === lineIndex;
                                                const busTitle = getDeviceStoredTitle(busDevice) || (typeof busDevice?.name === 'string' && busDevice.name.trim().length > 0
                                                    ? busDevice.name
                                                    : 'Котел');
                                                return (
                                                    <Group
                                                        key={`bus-line-${lineIndex}`}
                                                        draggable={isOccupied}
                                                        onMouseEnter={() => setHoveredBusLineIndex(lineIndex)}
                                                        onMouseLeave={() => setHoveredBusLineIndex(null)}
                                                        onDragStart={() => {
                                                            busDragStartOffsetsRef.current[lineIndex] = busSlotOffsets[lineIndex] || { x: 0, y: 0 };
                                                        }}
                                                        onDragMove={(event) => {
                                                            if (!isOccupied) return;
                                                            const delta = event.target.position();
                                                            const startOffset = busDragStartOffsetsRef.current[lineIndex] || { x: 0, y: 0 };
                                                            setBusSlotOffsets((prev) => ({
                                                                ...prev,
                                                                [lineIndex]: {
                                                                    x: startOffset.x + delta.x,
                                                                    y: startOffset.y + delta.y,
                                                                },
                                                            }));
                                                            event.target.position({ x: 0, y: 0 });
                                                        }}
                                                        onDragEnd={(event) => {
                                                            if (!isOccupied) return;
                                                            delete busDragStartOffsetsRef.current[lineIndex];
                                                            event.target.position({ x: 0, y: 0 });
                                                        }}
                                                    >
                                                        {isOccupied && (controllerType === 'smart2' || controllerType === 'pro' || controllerType === 'ecosmart' || controllerType === 'go' || controllerType === 'go+') && (() => {
                                                            const links = controllerType === 'ecosmart'
                                                                ? (lineIndex === 1
                                                                    ? [
                                                                        { controllerPort: 'BUS-2-A', boilerPort: 'BUS-A', offset: 4 * indentSize, color: '#2e7d32' },
                                                                        { controllerPort: 'BUS-2-B', boilerPort: 'BUS-B', offset: 3 * indentSize, color: '#2e7d32' },
                                                                    ]
                                                                    : [
                                                                        { controllerPort: 'BUS-1-A', boilerPort: 'BUS-A', offset: 2 * indentSize, color: '#2e7d32' },
                                                                        { controllerPort: 'BUS-1-B', boilerPort: 'BUS-B', offset: 1 * indentSize, color: '#2e7d32' },
                                                                    ])
                                                                : ((controllerType === 'go' || controllerType === 'go+')
                                                                    ? [
                                                                        { controllerPort: 'BUS-A', boilerPort: 'BUS-A', offset: 1 * indentSize, color: '#2e7d32' },
                                                                        { controllerPort: 'BUS-B', boilerPort: 'BUS-B', offset: 2 * indentSize, color: '#2e7d32' },
                                                                    ]
                                                                    : [
                                                                        { controllerPort: 'BUS-A', boilerPort: 'BUS-A', offset: 1 * indentSize, color: '#2e7d32' },
                                                                        { controllerPort: 'BUS-B', boilerPort: 'BUS-B', offset: 2 * indentSize, color: '#2e7d32' },
                                                                    ]);
                                                             const fallbackBusPorts = busPorts.filter((port) => port.name === 'BUS' || port.name.startsWith('BUS'));
                                                             return links.map((link) => {
                                                                 const fromPort = ports.find((port) => port.name === link.controllerPort);
                                                                let toPort = busPorts.find((port) => port.name === link.boilerPort);
                                                                if (!toPort) {
                                                                    toPort = link.boilerPort === 'BUS-A'
                                                                        ? (fallbackBusPorts[0] || null)
                                                                        : (fallbackBusPorts[1] || fallbackBusPorts[0] || null);
                                                                 }
                                                                 if (!fromPort || !toPort) return null;
                                                                 const fromX = fromPort.x * controllerImage.width;
                                                                 const fromY = fromPort.y * controllerImage.height;
                                                                  const toX = slotX + toPort.x * slotWidth;
                                                                  const toY = slotY + toPort.y * slotHeight;
                                                                  if (hasRinnaiAdapter) {
                                                                      if (useEcosmartRinnaiLayout) {
                                                                          const isLeftBoilerLine = link.boilerPort === 'BUS-B';
                                                                          const adapterOutPort = rinnaiAdapterPorts.find((port) => port.name === `BUS-OUT-${isLeftBoilerLine ? 'A' : 'B'}`);
                                                                          const adapterInPort = rinnaiAdapterPorts.find((port) => port.name === `BUS-IN-${link.controllerPort.slice(-1)}`);
                                                                          if (!adapterOutPort || !adapterInPort) return null;
                                                                          const adapterOutX = rinnaiAdapterX + adapterOutPort.x * rinnaiAdapterWidth;
                                                                          const adapterOutY = rinnaiAdapterY + adapterOutPort.y * rinnaiAdapterHeight;
                                                                          const adapterInX = rinnaiAdapterX + adapterInPort.x * rinnaiAdapterWidth;
                                                                          const adapterInY = rinnaiAdapterY + adapterInPort.y * rinnaiAdapterHeight;
                                                                          const boilerBendY = slotY + slotHeight + (isLeftBoilerLine ? 1 : 0.5) * indentSize;
                                                                          const boilerBendX = slotX + slotWidth + (isLeftBoilerLine ? 1 : 0.5) * indentSize;
                                                                          return (
                                                                              <Group key={`ecosmart-rinnai-bus-link-${lineIndex}-${link.controllerPort}`}>
                                                                                  <Line points={[toX, toY, toX, boilerBendY, boilerBendX, boilerBendY, boilerBendX, adapterOutY, adapterOutX, adapterOutY]} stroke={link.color} strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                                                  <Line points={[adapterInX, adapterInY, adapterInX - indentSize, adapterInY, fromX, adapterInY, fromX, fromY]} stroke={link.color} strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                                              </Group>
                                                                          );
                                                                      }
                                                                      const adapterOutPort = rinnaiAdapterPorts.find((port) => port.name === `BUS-OUT-${link.controllerPort.slice(-1)}`);
                                                                     const adapterInPort = rinnaiAdapterPorts.find((port) => port.name === `BUS-IN-${link.boilerPort.slice(-1)}`);
                                                                     if (!adapterOutPort || !adapterInPort) return null;
                                                                      const adapterOutX = rinnaiAdapterX + adapterOutPort.x * rinnaiAdapterWidth;
                                                                      const adapterOutY = rinnaiAdapterY + adapterOutPort.y * rinnaiAdapterHeight;
                                                                      const adapterInX = rinnaiAdapterX + adapterInPort.x * rinnaiAdapterWidth;
                                                                      const adapterInY = rinnaiAdapterY + adapterInPort.y * rinnaiAdapterHeight;
                                                                      const boilerBendY = Math.max(slotY + slotHeight, rinnaiAdapterY + rinnaiAdapterHeight) + link.offset + 2 * indentSize;
                                                                      const adapterInApproachX = adapterInX - (link.boilerPort === 'BUS-B' ? 0.5 : 1) * indentSize;
                                                                      const adapterOutLeftX = adapterOutX - (link.boilerPort === 'BUS-A' ? 1 : 0.5) * indentSize;
                                                                      const adapterOutBendY = adapterOutY - (link.boilerPort === 'BUS-A' ? 4 : 3) * indentSize;
                                                                      return (
                                                                          <Group key={`rinnai-bus-link-${lineIndex}-${link.controllerPort}`}>
                                                                              <Line points={[toX, toY, toX, boilerBendY, adapterInApproachX, boilerBendY, adapterInApproachX, adapterInY, adapterInX, adapterInY]} stroke={link.color} strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                                              <Line points={[adapterOutX, adapterOutY, adapterOutLeftX, adapterOutY, adapterOutLeftX, adapterOutBendY, fromX, adapterOutBendY, fromX, fromY]} stroke={link.color} strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                                          </Group>
                                                                      );
                                                                 }
                                                                 const bendYFromBoiler = slotY + slotHeight + link.offset;
                                                                const controllerMinOffset = controllerType === 'pro'
                                                                    ? (link.boilerPort === 'BUS-B' ? 4 * indentSize : 3 * indentSize)
                                                                    : (link.boilerPort === 'BUS-B' ? 2 * indentSize : 1 * indentSize);
                                                                const controllerMinBendY = controllerImage.height + controllerMinOffset;
                                                                const bendY = controllerType === 'ecosmart'
                                                                    ? bendYFromBoiler
                                                                    : Math.max(bendYFromBoiler, controllerMinBendY);
                                                                return (
                                                                    <Line
                                                                        key={`bus-link-${lineIndex}-${link.controllerPort}-${link.boilerPort}`}
                                                                        points={getOrthogonalLinkPoints(fromX, fromY, bendY, toX, toY)}
                                                                        stroke={link.color}
                                                                        strokeWidth={1}
                                                                        lineCap="round"
                                                                        lineJoin="round"
                                                                        listening={false}
                                                                    />
                                                                );
                                                            });
                                                        })()}
                                                        {isOccupied && (
                                                            <>
                                                                <Rect
                                                                    x={slotX}
                                                                    y={slotY - (INFO_BLOCK_HEIGHT + 14)}
                                                                    width={slotWidth}
                                                                    height={INFO_BLOCK_HEIGHT}
                                                                    cornerRadius={1}
                                                                    fill={INFO_BLOCK_FILL}
                                                                     stroke={INFO_BLOCK_STROKE}
                                                                     strokeWidth={INFO_BLOCK_STROKE_WIDTH}
                                                                />
                                                                <EditableInfoTitle x={slotX + 4}
                                                                    y={slotY - (INFO_BLOCK_HEIGHT + 14)}
                                                                    text={busTitle}
                                                                    fontSize={4}
                                                                    fill={INFO_BLOCK_TEXT_COLOR}
                                                                    width={slotWidth - 8}
                                                                    height={INFO_BLOCK_HEIGHT}
                                                                    align="center"
                                                                    verticalAlign="middle" device={busDevice} title={busTitle} />
                                                            </>
                                                        )}
                                                        <Rect
                                                            x={slotX}
                                                            y={slotY}
                                                            width={slotWidth}
                                                            height={slotHeight}
                                                            cornerRadius={10}
                                                            fill={isOccupied ? TRANSPARENT_FILL : EMPTY_SLOT_FILL}
                                                            stroke={isOccupied ? TRANSPARENT_FILL : EMPTY_SLOT_STROKE}
                                                            strokeWidth={1.5}
                                                        />
                                                        {isOccupied && busImage && (
                                                            <Image
                                                                image={busImage}
                                                                x={slotX}
                                                                y={slotY}
                                                                listening={false}
                                                            />
                                                        )}
                                                        {hasRinnaiAdapter && rinnaiAdapterImage && (
                                                            <Image image={rinnaiAdapterImage} x={rinnaiAdapterX} y={rinnaiAdapterY} width={rinnaiAdapterWidth} height={rinnaiAdapterHeight} listening={false} />
                                                        )}
                                                        {showPorts && isOccupied && busPorts.map((port, portIndex) => (
                                                            <Circle
                                                                key={`bus-port-${lineIndex}-${port.name}-${portIndex}`}
                                                                x={slotX + port.x * slotWidth}
                                                                y={slotY + port.y * slotHeight}
                                                                radius={2.5}
                                                                fill="red"


                                                            />
                                                        ))}
                                                        {!isOccupied && (controllerType === 'smart2' || controllerType === 'pro' || controllerType === 'go' || controllerType === 'go+') && (() => {
                                                            const emptyLinks = controllerType === 'pro'
                                                                ? [
                                                                    { controllerPort: 'BUS-B', slotX: slotX + slotWidth * 0.4, offset: 2 * indentSize },
                                                                    { controllerPort: 'BUS-A', slotX: slotX + slotWidth * 0.6, offset: 1 * indentSize },
                                                                ]
                                                                : [
                                                                    { controllerPort: 'BUS-A', slotX: slotX + slotWidth * 0.4, offset: 1 * indentSize },
                                                                    { controllerPort: 'BUS-B', slotX: slotX + slotWidth * 0.6, offset: 2 * indentSize },
                                                                ];
                                                            return emptyLinks.map((link) => {
                                                                const fromPort = ports.find((port) => port.name === link.controllerPort);
                                                                if (!fromPort) return null;
                                                                const fromX = fromPort.x * controllerImage.width;
                                                                const fromY = fromPort.y * controllerImage.height;
                                                                const toX = link.slotX;
                                                                const toY = slotY + slotHeight;
                                                                const bendY = Math.max(slotY + slotHeight + link.offset, controllerImage.height + link.offset);
                                                                return (
                                                                    <Line
                                                                        key={`bus-empty-link-${lineIndex}-${link.controllerPort}`}
                                                                        points={getOrthogonalLinkPoints(fromX, fromY, bendY, toX, toY)}
                                                                        stroke="#2e7d32"
                                                                        strokeWidth={1}
                                                                        lineCap="round"
                                                                        lineJoin="round"
                                                                        listening={false}
                                                                    />
                                                                );
                                                            });
                                                        })()}
                                                        {isOccupied && !busImage && (
                                                            <EditableInfoTitle x={slotPos.x}
                                                                y={slotY + 30}
                                                                width={slotWidth}
                                                                text="Котел"
                                                                fontSize={12}
                                                                fill={INFO_BLOCK_TEXT_COLOR}
                                                                align="center"
                                                            />
                                                        )}
                                                        {!isOccupied && (
                                                            <>
                                                                <Circle
                                                                    x={slotX + slotWidth / 2}
                                                                    y={slotY + slotHeight / 2}
                                                                    radius={16}
                                                                    fill={ADD_ACTION_FILL}
                                                                    onClick={(e) => {
                                                                        const pos = e.target.getAbsolutePosition();
                                                                        setBusMenuPos({ x: pos.x, y: pos.y, lineIndex });
                                                                    }}
                                                                    onTap={(e) => {
                                                                        const pos = e.target.getAbsolutePosition();
                                                                        setBusMenuPos({ x: pos.x, y: pos.y, lineIndex });
                                                                    }}
                                                                />
                                                                <Text
                                                                    x={slotX + slotWidth / 2}
                                                                    y={slotY + slotHeight / 2}
                                                                    text="+"
                                                                    fontSize={22}
                                                                    fill={INFO_BLOCK_FILL}
                                                                    offsetX={6.5}
                                                                    offsetY={9}
                                                                    listening={false}
                                                                />
                                                            </>
                                                        )}
                                                        {isOccupied && isHovered && (
                                                            <SlotDeleteButton compact x={slotX + slotWidth - 2.5} y={slotY + 1.5} onRemove={() => removeBusDeviceAtLine(lineIndex)} />
                                                        )}
                                                    </Group>
                                                );
                                            })}
                                        </>
                                    );
                                })()}
                                {(() => {
                                    const supportsDiLine = controllerType === 'smart2';
                                    if (!supportsDiLine) return null;
                                    const diModules = getDiModules(scheme);
                                    const smart2DiUsage = getSmart2DiPortUsage(scheme);
                                    const allSmart2DiPortsOccupied = smart2DiUsage.free < 2;
                                    const diCanAddMore = !allSmart2DiPortsOccupied;
                                    const diSlotsCount = diModules.length + ((showEmptySlots && diCanAddMore) ? 1 : 0);
                                    const getDiModuleSize = (device) => {
                                        const imageKey = getWirelessDeviceImageKey(device);
                                        const image = imageKey ? wirelessImages[imageKey] : null;
                                        if (!image?.width || !image?.height) {
                                            return { width: DI_SLOT_SIZE, height: DI_SLOT_SIZE };
                                        }
                                        return { width: image.width, height: image.height };
                                    };
                                    const getDiSlotX = (slotIndex) => {
                                        const minGap = DI_SLOT_MIN_GAP_MULTIPLIER * indentSize;
                                        const baseX = controllerImage.width + minGap;
                                        let x = baseX;
                                        for (let i = 0; i < slotIndex; i += 1) {
                                            const currentDevice = diModules[i] || null;
                                            const currentWidth = getDiModuleSize(currentDevice).width;
                                            const spacing = getSmart2DiModuleExtraSpacing(currentDevice, indentSize);
                                            x += spacing.left + currentWidth + spacing.right + minGap;
                                        }
                                        const currentSpacing = getSmart2DiModuleExtraSpacing(diModules[slotIndex] || null, indentSize);
                                        return x + currentSpacing.left;
                                    };
                                    const getDiSlotPosition = (slotIndex) => {
                                        const device = diModules[slotIndex] || null;
                                        const size = device ? getDiModuleSize(device) : { width: DI_SLOT_SIZE, height: DI_SLOT_SIZE };
                                        const offset = diSlotOffsets[getDiOffsetKey(device, slotIndex)] || { x: 0, y: 0 };
                                        const baseX = getDiSlotX(slotIndex);
                                        const baseY = controllerImage.height - size.height;
                                        const isInitialPosition = offset.x === 0 && offset.y === 0;
                                        return {
                                            x: isInitialPosition ? snapToGrid(baseX, indentSize) : baseX + offset.x,
                                            y: isInitialPosition ? snapToGrid(baseY, indentSize) : baseY + offset.y,
                                        };
                                    };
                                    const getDiSlotPositionByOffsets = (slotIndex, offsets) => {
                                        const device = diModules[slotIndex] || null;
                                        const size = device ? getDiModuleSize(device) : { width: DI_SLOT_SIZE, height: DI_SLOT_SIZE };
                                        const offset = offsets[getDiOffsetKey(device, slotIndex)] || { x: 0, y: 0 };
                                        const baseX = getDiSlotX(slotIndex);
                                        const baseY = controllerImage.height - size.height;
                                        const isInitialPosition = offset.x === 0 && offset.y === 0;
                                        return {
                                            x: isInitialPosition ? snapToGrid(baseX, indentSize) : baseX + offset.x,
                                            y: isInitialPosition ? snapToGrid(baseY, indentSize) : baseY + offset.y,
                                        };
                                    };
                                    const getDiPorts = (device) => {
                                        const key = getWirelessDeviceImageKey(device);
                                        return key ? (wirelessPortsByType[key] || []) : [];
                                    };
                                    return (
                                        <>
                                            {showLineFrames && diSlotsCount > 0 && (() => {
                                                const diRects = Array.from({ length: diSlotsCount }).map((_, slotIndex) => {
                                                    const device = diModules[slotIndex] || null;
                                                    const size = device ? getDiModuleSize(device) : { width: DI_SLOT_SIZE, height: DI_SLOT_SIZE };
                                                    const slotPos = getDiSlotPosition(slotIndex);
                                                    const slotX = slotPos.x;
                                                    const slotY = slotPos.y;
                                                    return { left: slotX, top: slotY, right: slotX + size.width, bottom: slotY + size.height };
                                                });
                                                const minX = Math.min(...diRects.map((r) => r.left));
                                                const minY = Math.min(...diRects.map((r) => r.top));
                                                const maxX = Math.max(...diRects.map((r) => r.right));
                                                const maxY = Math.max(...diRects.map((r) => r.bottom));
                                                return (
                                                    <Rect
                                                        x={minX - 10}
                                                        y={minY - 10}
                                                        width={maxX - minX + 20}
                                                        height={maxY - minY + 20}
                                                        cornerRadius={8}
                                                        fill="rgba(129,110,148,0.2)"
                                                        stroke="#6f6282"
                                                        strokeWidth={1}
                                                        dash={[7, 4]}
                                                        opacity={0.68}
                                                        listening={false}
                                                    />
                                                );
                                            })()}
                                            {Array.from({ length: diSlotsCount }).map((_, slotIndex) => {
                                                const device = diModules[slotIndex] || null;
                                                const offsetKey = getDiOffsetKey(device, slotIndex);
                                                const collisionId = `di:${offsetKey}`;
                                                const isOccupied = !!device;
                                                const imageKey = device ? getWirelessDeviceImageKey(device) : null;
                                                const image = imageKey ? wirelessImages[imageKey] : null;
                                                const diPorts = imageKey ? (wirelessPortsByType[imageKey] || []) : [];
                                                const size = isOccupied ? getDiModuleSize(device) : { width: DI_SLOT_SIZE, height: DI_SLOT_SIZE };
                                                const slotPos = getDiSlotPosition(slotIndex);
                                                const slotX = slotPos.x;
                                                const slotY = slotPos.y;
                                                return (
                                                    <Group
                                                        key={`di-slot-${slotIndex}`}
                                                        ref={(node) => {
                                                            if (node) moduleCollisionNodeRefs.current[collisionId] = node;
                                                            else delete moduleCollisionNodeRefs.current[collisionId];
                                                        }}
                                                        draggable={isOccupied}
                                                        onMouseEnter={() => setHoveredExtSlotIndex(`di:${slotIndex}`)}
                                                        onMouseLeave={() => setHoveredExtSlotIndex(null)}
                                                        onDragStart={() => {
                                                            diDragStartOffsetsRef.current[offsetKey] = diSlotOffsets[offsetKey] || { x: 0, y: 0 };
                                                            setInvalidDiDragMap((prev) => ({ ...prev, [offsetKey]: false }));
                                                        }}
                                                        onDragMove={(event) => {
                                                            if (!isOccupied) return;
                                                            const position = event.target.position();
                                                            const startOffset = diDragStartOffsetsRef.current[offsetKey] || { x: 0, y: 0 };
                                                            const draftOffset = {
                                                                x: startOffset.x + position.x,
                                                                y: startOffset.y + position.y,
                                                            };
                                                            const draftOffsets = {
                                                                ...diSlotOffsets,
                                                                [offsetKey]: draftOffset,
                                                            };
                                                            setDiSlotOffsets((prev) => ({ ...prev, [offsetKey]: draftOffset }));
                                                             const collisionData = getAllOccupiedRects(
                                                                 controllerImage,
                                                                scheme,
                                                                showEmptySlots,
                                                                memoWirelessOffsetsByLine,
                                                                oneWireSlotOffsets,
                                                                extSlotOffsets,
                                                                draftOffsets,
                                                                useInitialOneWireBalance ? memoBalancedOneWire.extDevicesByModuleIndex : null,
                                                            );
                                                            const draftPos = getDiSlotPositionByOffsets(slotIndex, draftOffsets);
                                                            const targetBodyRect = {
                                                                left: draftPos.x,
                                                                top: draftPos.y,
                                                                right: draftPos.x + size.width,
                                                                bottom: draftPos.y + size.height,
                                                            };
                                                            const targetRect = getModuleObjectFootprint(collisionId, {
                                                                left: slotX,
                                                                top: slotY,
                                                                right: slotX + size.width,
                                                                bottom: slotY + size.height,
                                                            }, targetBodyRect);
                                                            const collides = Boolean(collisionData) && (
                                                                rectsOverlap(targetRect, collisionData.controllerRect)
                                                                || collisionData.rects.some((rect) => rect.id !== collisionId && rectsOverlap(targetRect, rect))
                                                            );
                                                            setInvalidDiDragMap((prev) => ({ ...prev, [offsetKey]: collides }));
                                                            event.target.position({ x: 0, y: 0 });
                                                        }}
                                                        onDragEnd={(event) => {
                                                            if (!isOccupied) return;
                                                            const startOffset = diDragStartOffsetsRef.current[offsetKey] || { x: 0, y: 0 };
                                                            const nextOffset = diSlotOffsets[offsetKey] || { x: 0, y: 0 };
                                                            const nextOffsets = { ...diSlotOffsets, [offsetKey]: nextOffset };
                                                            const collisionData = getAllOccupiedRects(
                                                                controllerImage,
                                                                scheme,
                                                                showEmptySlots,
                                                                memoWirelessOffsetsByLine,
                                                                oneWireSlotOffsets,
                                                                extSlotOffsets,
                                                                nextOffsets,
                                                                useInitialOneWireBalance ? memoBalancedOneWire.extDevicesByModuleIndex : null,
                                                            );
                                                            const nextPos = getDiSlotPositionByOffsets(slotIndex, nextOffsets);
                                                            const targetBodyRect = {
                                                                left: nextPos.x,
                                                                top: nextPos.y,
                                                                right: nextPos.x + size.width,
                                                                bottom: nextPos.y + size.height,
                                                            };
                                                            const targetRect = getModuleObjectFootprint(collisionId, {
                                                                left: slotX,
                                                                top: slotY,
                                                                right: slotX + size.width,
                                                                bottom: slotY + size.height,
                                                            }, targetBodyRect);
                                                            const collides = Boolean(collisionData) && (
                                                                rectsOverlap(targetRect, collisionData.controllerRect)
                                                                || collisionData.rects.some((rect) => rect.id !== collisionId && rectsOverlap(targetRect, rect))
                                                            );
                                                            if (collides) {
                                                                setDiSlotOffsets((prev) => ({ ...prev, [offsetKey]: startOffset }));
                                                            }
                                                            setInvalidDiDragMap((prev) => ({ ...prev, [offsetKey]: false }));
                                                            delete diDragStartOffsetsRef.current[offsetKey];
                                                            event.target.position({ x: 0, y: 0 });
                                                        }}
                                                    >
                                                        <Rect
                                                            x={slotX}
                                                            y={slotY}
                                                            width={size.width}
                                                            height={size.height}
                                                            cornerRadius={10}
                                                            fill={invalidDiDragMap[offsetKey] ? 'rgba(211, 47, 47, 0.08)' : (isOccupied ? TRANSPARENT_FILL : EMPTY_SLOT_FILL)}
                                                            stroke={invalidDiDragMap[offsetKey] ? '#d32f2f' : (isOccupied ? TRANSPARENT_FILL : EMPTY_SLOT_STROKE)}
                                                            strokeWidth={1.5}
                                                        />
                                                          {isOccupied && image && (
                                                               <Image
                                                                   name={`morph:${getMorphImageKey(device)}`}
                                                                   image={image}
                                                                   x={slotX}
                                                                   y={slotY}
                                                                   width={size.width}
                                                                   height={size.height}
                                                                   listening={false}
                                                               />
                                                          )}
                                                          {isOccupied && (() => {
                                                              const modulePorts = diPorts;
                                                              const modulePos = { x: slotX, y: slotY };
                                                              const moduleSize = size;
                                                                const moduleBasePos = (() => {
                                                                    const baseX = getDiSlotX(slotIndex);
                                                                    const baseY = controllerImage.height - moduleSize.height;
                                                                    return { x: snapToGrid(baseX, indentSize), y: snapToGrid(baseY, indentSize) };
                                                                })();
                                                                const overlayLines = [];
                                                               const hasUpsInPowerLine = Array.isArray(scheme.power_modules)
                                                                   && scheme.power_modules
                                                                       .map((item) => normalizePowerModuleType(typeof item === 'string' ? item : item?.type))
                                                                       .includes('ups');

                                                               if (slotIndex === diModules.length - 1) {
                                                                    if (hasUpsInPowerLine) {
                                                                        const minGap = 4 * indentSize;
                                                                        const upsDevice = { id: 'required-ups', type: 'ups' };
                                                                        const upsKey = getWirelessDeviceImageKey(upsDevice);
                                                                        const upsImage = upsKey ? wirelessImages[upsKey] : null;
                                                                       const upsModule = {
                                                                            x: -minGap - (upsImage?.width || 80),
                                                                            y: controllerImage.height - (upsImage?.height || 80),
                                                                            width: upsImage?.width || 80,
                                                                            height: upsImage?.height || 80,
                                                                       };
                                                                       const upsPorts = upsKey ? (wirelessPortsByType[upsKey] || []) : [];
                                                                        const singleDiModuleRouteOffset = diModules.length === 1 ? -2 * indentSize : 0;
                                                                       [
                                                                            { upsPort: '12VDC-OUT-V+', modulePort: '12VDC-IN-V+', color: '#d32f2f', offset: 7 * indentSize + singleDiModuleRouteOffset },
                                                                            { upsPort: '12VDC-OUT-GND', modulePort: '12VDC-IN-GND', color: '#212121', offset: 8 * indentSize + singleDiModuleRouteOffset },
                                                                       ].forEach((link) => {
                                                                            const fromPort = upsPorts.find((port) => port.name === link.upsPort);
                                                                            const toPort = modulePorts.find((port) => port.name === link.modulePort)
                                                                                || (getPortsByClassToken(modulePorts, link.modulePort) || [])[0]
                                                                                || null;
                                                                            if (!fromPort || !toPort) return;
                                                                            const fromX = upsModule.x + fromPort.x * upsModule.width;
                                                                            const fromY = upsModule.y + fromPort.y * upsModule.height;
                                                                            const toX = modulePos.x + toPort.x * moduleSize.width;
                                                                            const toY = modulePos.y + toPort.y * moduleSize.height;
                                                                            const staticDownY = controllerImage.height + link.offset;
                                                                            const dynamicDownY = modulePos.y + moduleSize.height + link.offset;
                                                                            const baseDownY = moduleBasePos.y + moduleSize.height + link.offset;
                                                                            const downY = Math.max(staticDownY, dynamicDownY, baseDownY);
                                                                            overlayLines.push(
                                                                                <Line key={`di-overlay-ups-${slotIndex}-${link.upsPort}-${link.modulePort}`} points={getOrthogonalLinkPoints(fromX, fromY, downY, toX, toY)} stroke={link.color} strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />,
                                                                            );
                                                                        });
                                                                    } else {
                                                                        const minGap = 4 * indentSize;
                                                                        const powerUnitDevice = { id: 'required-power-unit', type: 'power-unit' };
                                                                        const powerUnitKey = getWirelessDeviceImageKey(powerUnitDevice);
                                                                        const powerUnitImage = powerUnitKey ? wirelessImages[powerUnitKey] : null;
                                                                        const powerUnit = {
                                                                            x: -minGap - (powerUnitImage?.width || 80),
                                                                            y: controllerImage.height - (powerUnitImage?.height || 80),
                                                                            width: powerUnitImage?.width || 80,
                                                                            height: powerUnitImage?.height || 80,
                                                                        };
                                                                        const powerUnitPorts = powerUnitKey ? (wirelessPortsByType[powerUnitKey] || []) : [];
                                                                        [
                                                                            {
                                                                                puPort: '12VDC-OUT-V+',
                                                                                modulePort: '12VDC-IN-V+',
                                                                                upOffset: 2 * indentSize,
                                                                                sideOffset: 2 * indentSize,
                                                                                underOffsetWithDi: 7 * indentSize,
                                                                                underOffsetWithSingleDi: 5 * indentSize,
                                                                                color: '#d32f2f',
                                                                            },
                                                                            {
                                                                                puPort: '12VDC-OUT-GND',
                                                                                modulePort: '12VDC-IN-GND',
                                                                                upOffset: 1 * indentSize,
                                                                                sideOffset: 1 * indentSize,
                                                                                underOffsetWithDi: 8 * indentSize,
                                                                                underOffsetWithSingleDi: 6 * indentSize,
                                                                                color: '#212121',
                                                                            },
                                                                       ].forEach((link) => {
                                                                            const fromPort = powerUnitPorts.find((port) => port.name === link.puPort);
                                                                            const toPort = modulePorts.find((port) => port.name === link.modulePort);
                                                                            if (!fromPort || !toPort) return;
                                                                            const fromX = powerUnit.x + fromPort.x * powerUnit.width;
                                                                            const fromY = powerUnit.y + fromPort.y * powerUnit.height;
                                                                            const toX = modulePos.x + toPort.x * moduleSize.width;
                                                                            const toY = modulePos.y + toPort.y * moduleSize.height;
                                                                            const upY = powerUnit.y - link.upOffset;
                                                                            const rightX = powerUnit.x + powerUnit.width + link.sideOffset;
                                                                            const underOffsetForDi = diModules.length === 1
                                                                                ? (link.underOffsetWithSingleDi || link.underOffsetWithDi)
                                                                                : link.underOffsetWithDi;
                                                                            const staticDownY = controllerImage.height + underOffsetForDi;
                                                                            const dynamicDownY = modulePos.y + moduleSize.height + underOffsetForDi;
                                                                            const baseDownY = moduleBasePos.y + moduleSize.height + underOffsetForDi;
                                                                            const downY = Math.max(staticDownY, dynamicDownY, baseDownY);
                                                                            overlayLines.push(
                                                                                <Line key={`di-overlay-pu-power-${slotIndex}-${link.puPort}-${link.modulePort}`} points={[fromX, fromY, fromX, upY, rightX, upY, rightX, downY, toX, downY, toX, toY]} stroke={link.color} strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />,
                                                                            );
                                                                       });
                                                                   }
                                                                }

                                                               if (slotIndex > 0) {
                                                                  const previousDevice = diModules[slotIndex - 1];
                                                                  if (previousDevice) {
                                                                      const previousPos = getDiSlotPosition(slotIndex - 1);
                                                                      const previousSize = getDiModuleSize(previousDevice);
                                                                      const previousPorts = getDiPorts(previousDevice);
                                                                      const previousBasePos = (() => {
                                                                          const baseX = getDiSlotX(slotIndex - 1);
                                                                          const baseY = controllerImage.height - previousSize.height;
                                                                          return { x: snapToGrid(baseX, indentSize), y: snapToGrid(baseY, indentSize) };
                                                                      })();
                                                                      [
                                                                          { from: '12VDC-IN-V+', to: '12VDC-OUT-V+', color: '#d32f2f', offset: 2 * indentSize },
                                                                          { from: '12VDC-IN-GND', to: '12VDC-OUT-GND', color: '#212121', offset: 1 * indentSize },
                                                                      ].forEach((link) => {
                                                                          const fromPort = previousPorts.find((port) => port.name === link.from);
                                                                          const toPort = modulePorts.find((port) => port.name === link.to);
                                                                          if (!fromPort || !toPort) return;
                                                                          const fromX = previousPos.x + fromPort.x * previousSize.width;
                                                                          const fromY = previousPos.y + fromPort.y * previousSize.height;
                                                                          const toX = modulePos.x + toPort.x * moduleSize.width;
                                                                          const toY = modulePos.y + toPort.y * moduleSize.height;
                                                                          const lowerEdge = Math.max(previousPos.y + previousSize.height, modulePos.y + moduleSize.height);
                                                                          const bendY = lowerEdge + link.offset;
                                                                          const baseFromY = previousBasePos.y + fromPort.y * previousSize.height;
                                                                          const baseToY = moduleBasePos.y + toPort.y * moduleSize.height;
                                                                          const baseLowerEdge = Math.max(previousBasePos.y + previousSize.height, moduleBasePos.y + moduleSize.height);
                                                                          const baseBendY = Math.max(baseFromY, baseToY, baseLowerEdge) + link.offset;
                                                                          overlayLines.push(
                                                                              <Line key={`di-overlay-power-${slotIndex}-${link.from}-${link.to}`} points={getOrthogonalLinkPoints(fromX, fromY, Math.max(bendY, baseBendY), toX, toY)} stroke={link.color} strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />,
                                                                          );
                                                                      });
                                                                  }
                                                              } else {
                                                                  [
                                                                      { fromController: '12VDC-IN-V+', toModule: '12VDC-OUT-V+', color: '#d32f2f', controllerBendMultiplier: 2 },
                                                                      { fromController: '12VDC-IN-GND', toModule: '12VDC-OUT-GND', color: '#212121', controllerBendMultiplier: 1 },
                                                                  ].forEach((link) => {
                                                                      const fromPort = ports.find((port) => port.name === link.fromController);
                                                                      const toPort = modulePorts.find((port) => port.name === link.toModule);
                                                                      if (!fromPort || !toPort) return;
                                                                      const fromX = fromPort.x * controllerImage.width;
                                                                      const fromY = fromPort.y * controllerImage.height;
                                                                      const toX = modulePos.x + toPort.x * moduleSize.width;
                                                                      const toY = modulePos.y + toPort.y * moduleSize.height;
                                                                      const bendY = controllerImage.height + link.controllerBendMultiplier * indentSize;
                                                                      const targetHopBendY = modulePos.y + moduleSize.height + link.controllerBendMultiplier * indentSize;
                                                                      const dynamicBendY = Math.max(bendY, targetHopBendY);
                                                                      const baseToY = moduleBasePos.y + toPort.y * moduleSize.height;
                                                                      const baseTargetHopBendY = moduleBasePos.y + moduleSize.height + link.controllerBendMultiplier * indentSize;
                                                                      const baseBendY = Math.max(Math.max(fromY, baseToY, controllerImage.height) + link.controllerBendMultiplier * indentSize, baseTargetHopBendY);
                                                                      overlayLines.push(
                                                                          <Line key={`di-overlay-first-power-${slotIndex}-${link.fromController}-${link.toModule}`} points={getOrthogonalLinkPoints(fromX, fromY, Math.max(dynamicBendY, baseBendY), toX, toY)} stroke={link.color} strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />,
                                                                      );
                                                                  });
                                                              }

                                                               const controllerPairOrder = hasUpsInPowerLine ? [[3, 4], [1, 2]] : [[1, 2], [3, 4]];
                                                              const selectedPair = controllerPairOrder[Math.min(slotIndex, controllerPairOrder.length - 1)];
                                                              const findFirstPort = (portsList, names) => names.map((name) => portsList.find((port) => port.name === name)).find(Boolean);
                                                              const findDiInputPort = (portsList, preferredNames, fallbackIndex = 0) => {
                                                                  const exactMatch = findFirstPort(portsList, preferredNames);
                                                                  if (exactMatch) return exactMatch;
                                                                  const byToken = getPortsByClassToken(portsList, 'DI-IN') || [];
                                                                  if (byToken.length === 0) return null;
                                                                  return byToken[Math.min(Math.max(0, fallbackIndex), byToken.length - 1)] || byToken[0];
                                                              };
                                                              [
                                                                  { controllerPorts: [`DI-OUT-${selectedPair[0]}`], modulePorts: ['DI-IN-1'], color: '#1565c0', controllerBendMultiplier: selectedPair[0] === 1 ? 3 : 5, controllerBendMultiplierSingleDi: 3, fallbackDiInIndex: 0 },
                                                                  { controllerPorts: [`DI-OUT-${selectedPair[1]}`], modulePorts: ['DI-IN-2'], color: '#1565c0', controllerBendMultiplier: selectedPair[1] === 2 ? 4 : 6, controllerBendMultiplierSingleDi: 4, fallbackDiInIndex: 1 },
                                                              ].forEach((link, linkIndex) => {
                                                                  const fromPort = findFirstPort(ports, link.controllerPorts);
                                                                  const toPort = findDiInputPort(modulePorts, link.modulePorts, link.fallbackDiInIndex);
                                                                  if (!fromPort || !toPort) return;
                                                                  const fromX = fromPort.x * controllerImage.width;
                                                                  const fromY = fromPort.y * controllerImage.height;
                                                                  const toX = modulePos.x + toPort.x * moduleSize.width;
                                                                  const toY = modulePos.y + toPort.y * moduleSize.height;
                                                                  const diCount = diModules.length;
                                                                  const bendMultiplier = diCount === 1 ? (link.controllerBendMultiplierSingleDi || link.controllerBendMultiplier) : link.controllerBendMultiplier;
                                                                  const bendY = controllerImage.height + bendMultiplier * indentSize;
                                                                  const targetHopBendY = modulePos.y + moduleSize.height + bendMultiplier * indentSize;
                                                                  const dynamicBendY = Math.max(bendY, targetHopBendY);
                                                                  const baseToY = moduleBasePos.y + toPort.y * moduleSize.height;
                                                                  const baseTargetHopBendY = moduleBasePos.y + moduleSize.height + bendMultiplier * indentSize;
                                                                  const baseBendY = Math.max(Math.max(fromY, baseToY, controllerImage.height) + bendMultiplier * indentSize, baseTargetHopBendY);
                                                                  overlayLines.push(
                                                                      <Line key={`di-overlay-signal-${slotIndex}-${linkIndex}`} points={getOrthogonalLinkPoints(fromX, fromY, Math.max(dynamicBendY, baseBendY), toX, toY)} stroke={link.color} strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />,
                                                                  );
                                                              });

                                                              return overlayLines;
                                                          })()}
                                                          {isOccupied && canonicalDeviceType(device?.type) === 'rl2' && (() => {
                                                             const relayDevices = getModuleLineDevices(device, 'relay_devices').slice(0, 2);
                                                              const relayOccupancy = buildRelaySlotOccupancyPreserveIndexes(
                                                                  relayDevices,
                                                                  2,
                                                                  (relayDevice) => (String(relayDevice?.connection_type || '').toLowerCase() === 'double_relay' ? 2 : 1),
                                                              );
                                                             const relaySlotSize = 8 * indentSize;
                                                             const relaySlotGap = 4 * indentSize;
                                                             const relayLineHeight = relaySlotSize * 2 + relaySlotGap;
                                                             const relaySlotX = slotX + size.width + 4 * indentSize;
                                                             const firstRelaySlotY = slotY - relayLineHeight;

                                                             return [0, 1].map((relaySlotIndex) => {
                                                                 const slotState = relayOccupancy[relaySlotIndex] || null;
                                                                 const relayDevice = slotState?.device || null;
                                                                 if (!relayDevice && !showEmptySlots) return null;
                                                                  const relayIndex = relaySlotIndex + 1;
                                                                  const relaySlotY = firstRelaySlotY + relaySlotIndex * (relaySlotSize + relaySlotGap);
                                                                  const sourceRelaySlotIndex = slotState?.startSlot ?? relaySlotIndex;
                                                                  const sourceRelaySlotY = firstRelaySlotY + sourceRelaySlotIndex * (relaySlotSize + relaySlotGap);
                                                                  const shouldRenderRelayDevice = relayDevice && !slotState?.covered;
                                                                  const aPort = diPorts.find((port) => port.name === `RELAY-${relayIndex}-A`) || null;
                                                                 const bPort = diPorts.find((port) => port.name === `RELAY-${relayIndex}-B`) || null;
                                                                  const visualDevice = relayDevice ? { ...relayDevice, port_side: 'left' } : null;
                                                                  const relayImageKey = visualDevice ? getWirelessDeviceImageKey(visualDevice) : null;
                                                                  const relayImage = relayImageKey ? wirelessImages[relayImageKey] : null;
                                                                  const relayType = canonicalDeviceType(relayDevice?.type);
                                                                   const relayVisualSlotWidth = relaySlotSize;
                                                                   const relayVisualSlotHeight = relaySlotSize;
                                                                   const relayImageSize = relayImage
                                                                       ? (relayType === 'valve'
                                                                           ? getContainSize(relayImage, relayVisualSlotWidth, relayVisualSlotHeight)
                                                                           : relayType === 'zoneServo'
                                                                               ? getFullWidthSize(relayImage, relayVisualSlotWidth, relayVisualSlotHeight)
                                                                          : getContainSize(relayImage, relayVisualSlotWidth, relayVisualSlotHeight))
                                                                      : { width: relayVisualSlotWidth, height: relayVisualSlotHeight };
                                                                  const relayImageX = relaySlotX + (relayVisualSlotWidth - relayImageSize.width) / 2;
                                                                   const relayImageY = sourceRelaySlotY + (relayVisualSlotHeight - relayImageSize.height) / 2;
                                                                   const relayPorts = relayImageKey ? (wirelessPortsByType[relayImageKey] || []) : [];
                                                                   const boilerBusAPort = relayPorts.find((port) => port.name === 'BUS-A') || null;
                                                                   const boilerBusBPort = relayPorts.find((port) => port.name === 'BUS-B') || null;
                                                                  const isDoubleRelayDevice = String(relayDevice?.connection_type || '').toLowerCase() === 'double_relay';
                                                                  const relayInPort = isDoubleRelayDevice
                                                                      ? (relayPorts.find((port) => port.name === `RELAY-IN-${relayIndex}`)
                                                                          || (getPortsByClassToken(relayPorts, `RELAY-IN-${relayIndex}`) || [])[0]
                                                                          || relayPorts.find((port) => port.name === `RELAY-${relayIndex}`)
                                                                          || (getPortsByClassToken(relayPorts, `RELAY-${relayIndex}`) || [])[0]
                                                                          || null)
                                                                       : getRelayInputPort(relayPorts, relayType, relayImageKey);
                                                                 const moduleAPortX = aPort ? slotX + aPort.x * size.width : null;
                                                                 const moduleAPortY = aPort ? slotY + aPort.y * size.height : null;
                                                                 const moduleBPortX = bPort ? slotX + bPort.x * size.width : null;
                                                                 const moduleBPortY = bPort ? slotY + bPort.y * size.height : null;
                                                                  const getRelayImagePortPoint = (port) => {
                                                                      if (!port || !relayImage) return null;
                                                                      const imageWidth = relayImage.width || relayImageSize.width;
                                                                      const imageHeight = relayImage.height || relayImageSize.height;
                                                                       const crop = { x: 0, y: 0, width: imageWidth, height: imageHeight };
                                                                      return {
                                                                          x: relayImageX + (((port.x * imageWidth) - crop.x) / crop.width) * relayImageSize.width,
                                                                          y: relayImageY + (((port.y * imageHeight) - crop.y) / crop.height) * relayImageSize.height,
                                                                      };
                                                                  };
                                                                  const relayInPortPoint = getRelayImagePortPoint(relayInPort);
                                                                  const relayInPortX = relayInPortPoint ? relayInPortPoint.x : relaySlotX;
                                                                  const relayInPortY = relayInPortPoint ? relayInPortPoint.y : relaySlotY + relayVisualSlotHeight / 2;
                                                                 const relayTypeDevices = [
                                                                     ...getRelayDevicesForController(scheme),
                                                                     ...getRelaySPreferredDevices(scheme),
                                                                     ...diModules.flatMap((moduleItem) => [
                                                                         ...(Array.isArray(moduleItem?.relay_devices) ? moduleItem.relay_devices : []),
                                                                         ...(Array.isArray(moduleItem?.relay_s_devices) ? moduleItem.relay_s_devices : []),
                                                                     ]),
                                                                 ].filter((item) => canonicalDeviceType(item?.type) === relayType);
                                                                 const relaySystemIndex = relayDevice
                                                                     ? Math.max(0, relayTypeDevices.findIndex((item) => {
                                                                         if (relayDevice?.id != null && item?.id != null) return relayDevice.id === item.id;
                                                                         return relayDevice === item;
                                                                     })) + 1
                                                                     : 0;
                                                                 const relayBaseTitle = relayType === 'pump-220v'
                                                                     ? 'Насос 220V'
                                                                     : (relayType === 'boiler-pump'
                                                                         ? 'Насос бойлера'
                                                                         : (isRelayBoilerType(relayType)
                                                                             ? (relayDevice?.name || 'Котел')
                                                                             : (relayType === '220servo'
                                                                                 ? 'Сервопривод'
                                                                                 : (relayType === 'valve'
                                                                                     ? 'Запорный клапан'
                                                                                     : (relayType === 'zoneServo' ? 'Сервопривод зоны' : 'Прочее оборудование')))));
                                                                  const relayInfoIndex = relaySystemIndex > 0 ? relaySystemIndex : relaySlotIndex + 1;
                                                                    const relayInfoTitle = getDeviceStoredTitle(relayDevice) || `${relayBaseTitle} ${relayInfoIndex}`;
                                                                   const infoBlockWidth = relayVisualSlotWidth;
                                                                    const infoBlockHeight = INFO_BLOCK_HEIGHT;
                                                                    const infoBlockX = relaySlotX + relayVisualSlotWidth / 2 - infoBlockWidth / 2;
                                                                     const infoBlockY = sourceRelaySlotY - infoBlockHeight - 8;
                                                                  const relayHoverKey = `rl2:${slotIndex}:${relaySlotIndex}`;
                                                                  const isRelayHovered = hoveredRelaySlotIndex === relayHoverKey;

                                                                  return (
                                                                      <Group
                                                                          key={`rl2-relay-${slotIndex}-${relaySlotIndex}`}
                                                                          onMouseEnter={() => setHoveredRelaySlotIndex(relayHoverKey)}
                                                                          onMouseLeave={() => setHoveredRelaySlotIndex((prev) => (prev === relayHoverKey ? null : prev))}
                                                                      >
                                                                           {shouldRenderRelayDevice && !isStupidBoilerType(relayType) && aPort && (() => {
                                                                               const lRouteY = slotY - 3 * indentSize;
                                                                               const nextAPort = relayType === 'valve' && sourceRelaySlotIndex === 0
                                                                                   ? diPorts.find((port) => port.name === `RELAY-${relayIndex + 1}-A`) || null
                                                                                   : null;
                                                                               const nextModuleAPortX = nextAPort ? slotX + nextAPort.x * size.width : null;
                                                                               const nextModuleAPortY = nextAPort ? slotY + nextAPort.y * size.height : null;
                                                                                const relayContactStroke = '#d32f2f';
                                                                                return (
                                                                                    <>
                                                                                        <Line points={[moduleAPortX, moduleAPortY, moduleAPortX, lRouteY]} stroke={relayContactStroke} strokeWidth={1} lineCap="round" listening={false} />
                                                                                        {nextAPort && <Line points={[nextModuleAPortX, nextModuleAPortY, nextModuleAPortX, lRouteY]} stroke={relayContactStroke} strokeWidth={1} lineCap="round" listening={false} />}
                                                                                        <Text x={moduleAPortX - 8} y={lRouteY - 14} width={16} text="L" fontSize={10} align="center" fill="#212121" listening={false} />
                                                                                        {nextAPort && <Text x={nextModuleAPortX - 8} y={lRouteY - 14} width={16} text="L" fontSize={10} align="center" fill="#212121" listening={false} />}
                                                                                    </>
                                                                                );
                                                                           })()}
                                                                            {relayDevice && relayType !== 'valve' && !isStupidBoilerType(relayType) && bPort && relayInPort && (() => {
                                                                               const routeY = isDoubleRelayDevice && relayType === 'valve' && sourceRelaySlotIndex === 0
                                                                                  ? relayInPortY - 3 * indentSize
                                                                                   : relayInPortY;
                                                                               const relayStroke = relayType === '220servo'
                                                                                   || relayType === 'boiler-pump'
                                                                                   || relayType === 'pump-220v'
                                                                                   || relayType === 'zoneServo'
                                                                                   || isOtherEquipmentType(relayType)
                                                                                   ? '#d32f2f'
                                                                                   : '#212121';
                                                                               return (
                                                                                   <Line points={[relayInPortX, relayInPortY, relayInPortX, routeY, moduleBPortX, routeY, moduleBPortX, moduleBPortY]} stroke={relayStroke} strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                                               );
                                                                           })()}
                                                                          {!relayDevice && bPort && moduleBPortX !== null && moduleBPortY !== null && (
                                                                              <Line
                                                                                  points={[relaySlotX + relaySlotSize, relaySlotY + relaySlotSize / 2, moduleBPortX, relaySlotY + relaySlotSize / 2, moduleBPortX, moduleBPortY]}
                                                                                  stroke="#9e9e9e"
                                                                                  strokeWidth={1}
                                                                                  lineCap="round"
                                                                                  lineJoin="round"
                                                                                  listening={false}
                                                                              />
                                                                          )}
                                                                           {!slotState?.covered && (
                                                                               <Rect
                                                                                   name="module-device-slot"
                                                                                   collisionOccupied={Boolean(relayDevice)}
                                                                                   x={relaySlotX}
                                                                                   y={relaySlotY}
                                                                                    width={relayVisualSlotWidth}
                                                                                    height={relayVisualSlotHeight}
                                                                                    cornerRadius={10}
                                                                                    fill={relayDevice ? TRANSPARENT_FILL : EMPTY_SLOT_FILL}
                                                                                    stroke={relayDevice ? TRANSPARENT_FILL : EMPTY_SLOT_STROKE}
                                                                                   strokeWidth={1.5}
                                                                               />
                                                                           )}
                                                                            {shouldRenderRelayDevice && relayImage && (
                                                                                <Image image={relayImage} x={relayImageX} y={relayImageY} width={relayImageSize.width} height={relayImageSize.height} listening={false} />
                                                                           )}
                                                                           {shouldRenderRelayDevice && relayType === 'valve' && bPort && (() => {
                                                                               const nextBPort = sourceRelaySlotIndex === 0
                                                                                   ? diPorts.find((port) => port.name === `RELAY-${relayIndex + 1}-B`) || null
                                                                                   : null;
                                                                               const relay1Port = relayPorts.find((port) => port.name === 'RELAY-IN-1')
                                                                                   || (getPortsByClassToken(relayPorts, 'RELAY-IN-1') || [])[0]
                                                                                   || null;
                                                                               const relay2Port = relayPorts.find((port) => port.name === 'RELAY-IN-2')
                                                                                   || (getPortsByClassToken(relayPorts, 'RELAY-IN-2') || [])[0]
                                                                                   || null;
                                                                               if (!nextBPort || !relay1Port || !relay2Port) return null;
                                                                               const relay1Point = getRelayImagePortPoint(relay1Port);
                                                                               const relay2Point = getRelayImagePortPoint(relay2Port);
                                                                               if (!relay1Point || !relay2Point) return null;
                                                                               const from1X = relay1Point.x;
                                                                               const from1Y = relay1Point.y;
                                                                               const from2X = relay2Point.x;
                                                                               const from2Y = relay2Point.y;
                                                                               const to2X = slotX + nextBPort.x * size.width;
                                                                               const to2Y = slotY + nextBPort.y * size.height;
                                                                               return (
                                                                                   <>
                                                                                        <Line points={[from1X, from1Y, moduleBPortX, from1Y, moduleBPortX, moduleBPortY]} stroke="#d32f2f" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                                                        <Line points={[from2X, from2Y, to2X, from2Y, to2X, to2Y]} stroke="#d32f2f" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                                                   </>
                                                                               );
                                                                           })()}
                                                                           {shouldRenderRelayDevice && isStupidBoilerType(relayType) && aPort && bPort && boilerBusAPort && boilerBusBPort && (() => {
                                                                               const aFromX = relayImageX + boilerBusAPort.x * relayImageSize.width;
                                                                               const aFromY = relayImageY + boilerBusAPort.y * relayImageSize.height;
                                                                               const bFromX = relayImageX + boilerBusBPort.x * relayImageSize.width;
                                                                               const bFromY = relayImageY + boilerBusBPort.y * relayImageSize.height;
                                                                               const imageBottomY = relayImageY + relayImageSize.height;
                                                                               const aRouteY = imageBottomY + 0.5 * indentSize;
                                                                               const bRouteY = imageBottomY + indentSize;
                                                                               return (
                                                                                   <>
                                                                                       <Line points={[aFromX, aFromY, aFromX, aRouteY, moduleAPortX, aRouteY, moduleAPortX, moduleAPortY]} stroke="#2e7d32" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                                                       <Line points={[bFromX, bFromY, bFromX, bRouteY, moduleBPortX, bRouteY, moduleBPortX, moduleBPortY]} stroke="#2e7d32" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                                                   </>
                                                                               );
                                                                           })()}
                                                                          {!relayDevice && showEmptySlots && (
                                                                              <>
                                                                                  <Circle
                                                                                      x={relaySlotX + relaySlotSize / 2}
                                                                                      y={relaySlotY + relaySlotSize / 2}
                                                                                      radius={16}
                                                                                      fill={ADD_ACTION_FILL}
                                                                                      onClick={(e) => {
                                                                                          const pos = e.target.getAbsolutePosition();
                                                                                          setRelayMenuPos({ x: pos.x, y: pos.y, moduleGroup: 'di', moduleIndex: slotIndex, relaySlotIndex, lineKey: 'relay_devices' });
                                                                                      }}
                                                                                      onTap={(e) => {
                                                                                          const pos = e.target.getAbsolutePosition();
                                                                                          setRelayMenuPos({ x: pos.x, y: pos.y, moduleGroup: 'di', moduleIndex: slotIndex, relaySlotIndex, lineKey: 'relay_devices' });
                                                                                      }}
                                                                                  />
                                                                                  <Text
                                                                                      x={relaySlotX + relaySlotSize / 2}
                                                                                      y={relaySlotY + relaySlotSize / 2}
                                                                                      text="+"
                                                                                      fontSize={22}
                                                                                      fill={INFO_BLOCK_FILL}
                                                                                      offsetX={6.5}
                                                                                      offsetY={9}
                                                                                      listening={false}
                                                                                  />
                                                                              </>
                                                                          )}
                                                                           {shouldRenderRelayDevice && (
                                                                             <>
                                                                                 <Rect
                                                                                     x={infoBlockX}
                                                                                     y={infoBlockY}
                                                                                     width={infoBlockWidth}
                                                                                     height={infoBlockHeight}
                                                                                     cornerRadius={1}
                                                                                     fill={INFO_BLOCK_FILL}
                                                                                     stroke={INFO_BLOCK_STROKE}
                                                                                     strokeWidth={INFO_BLOCK_STROKE_WIDTH}
                                                                                     listening={false}
                                                                                  />
                                                                                  <EditableInfoTitle
                                                                                      x={infoBlockX}
                                                                                       y={infoBlockY}
                                                                                       text={relayInfoTitle}
                                                                                       fontSize={4}
                                                                                       fill={INFO_BLOCK_TEXT_COLOR}
                                                                                       width={infoBlockWidth}
                                                                                       height={infoBlockHeight}
                                                                                      align="center"
                                                                                      verticalAlign="middle" device={relayDevice} title={relayInfoTitle} />
                                                                              </>
                                                                          )}
                                                                           {shouldRenderRelayDevice && isRelayHovered && (
                                                                              <SlotDeleteButton compact x={relaySlotX + relaySlotSize - 2.5} y={sourceRelaySlotY + 1.5} onRemove={(event) => {
                                                                                  event.cancelBubble = true;
                                                                                  removeDiModuleRelayDeviceAtSlot(slotIndex, 'relay_devices', sourceRelaySlotIndex);
                                                                              }} />
                                                                          )}
                                                                      </Group>
                                                                  );
                                                              });
                                                         })()}
                                                         {isOccupied && canonicalDeviceType(device?.type) === 'rl2s' && (() => {
                                                             const relayDevices = getModuleLineDevices(device, 'relay_s_devices').slice(0, 2);
                                                              const relayOccupancy = buildRelaySlotOccupancyPreserveIndexes(
                                                                  relayDevices,
                                                                  2,
                                                                  (relayDevice) => (String(relayDevice?.connection_type || '').toLowerCase() === 'double_relay' ? 2 : 1),
                                                              );
                                                             const relaySlotSize = 8 * indentSize;
                                                             const relaySlotGap = 4 * indentSize;
                                                             const relayLineHeight = relaySlotSize * 2 + relaySlotGap;
                                                             const relaySlotX = slotX + size.width + 4 * indentSize;
                                                             const firstRelaySlotY = slotY - relayLineHeight;
                                                             const groupedAPort = diPorts.find((port) => port.name === 'RELAY-S-1-2-A') || null;
                                                             const groupedBPort = diPorts.find((port) => port.name === 'RELAY-S-1-2-B') || null;
                                                              const hasOccupiedRelaySlot = relayOccupancy.some((slotState) => !!slotState?.device);
                                                              const hasOccupiedNonBoilerRelaySlot = relayOccupancy.some((slotState) => {
                                                                  const slotDevice = slotState?.device || null;
                                                                  return slotDevice && !isStupidBoilerType(slotDevice?.type);
                                                              });
                                                              return (
                                                                 <>
                                                                      {hasOccupiedNonBoilerRelaySlot && groupedAPort && (() => {
                                                                         const moduleAPortX = slotX + groupedAPort.x * size.width;
                                                                         const moduleAPortY = slotY + groupedAPort.y * size.height;
                                                                          return (
                                                                              <>
                                                                                  <Line points={[moduleAPortX, moduleAPortY, moduleAPortX, slotY - 3 * indentSize]} stroke="#d32f2f" strokeWidth={1} lineCap="round" listening={false} />
                                                                                  <EditableInfoTitle x={moduleAPortX - 8} y={slotY - 3 * indentSize - 14} width={16} text="L" fontSize={10} align="center" fill="#212121" listening={false} />
                                                                              </>
                                                                         );
                                                                     })()}
                                                                     {[0, 1].map((relaySlotIndex) => {
                                                                  const slotState = relayOccupancy[relaySlotIndex] || null;
                                                                  const relayDevice = slotState?.device || null;
                                                                  if (!relayDevice && !showEmptySlots) return null;
                                                                  const relayIndex = relaySlotIndex + 1;
                                                                  const relaySlotY = firstRelaySlotY + relaySlotIndex * (relaySlotSize + relaySlotGap);
                                                                  const sourceRelaySlotIndex = slotState?.startSlot ?? relaySlotIndex;
                                                                  const sourceRelaySlotY = firstRelaySlotY + sourceRelaySlotIndex * (relaySlotSize + relaySlotGap);
                                                                  const shouldRenderRelayDevice = relayDevice && !slotState?.covered;
                                                                  const bPort = diPorts.find((port) => port.name === `RELAY-S-${relayIndex}-B`) || groupedBPort;
                                                                  const visualDevice = relayDevice ? { ...relayDevice, port_side: 'left' } : null;
                                                                  const relayImageKey = visualDevice ? getWirelessDeviceImageKey(visualDevice) : null;
                                                                  const relayImage = relayImageKey ? wirelessImages[relayImageKey] : null;
                                                                  const relayType = canonicalDeviceType(relayDevice?.type);
                                                                   const relayVisualSlotWidth = relaySlotSize;
                                                                   const relayVisualSlotHeight = relaySlotSize;
                                                                   const relayImageSize = relayImage
                                                                       ? (relayType === 'valve'
                                                                           ? getContainSize(relayImage, relayVisualSlotWidth, relayVisualSlotHeight)
                                                                           : relayType === 'zoneServo'
                                                                               ? getFullWidthSize(relayImage, relayVisualSlotWidth, relayVisualSlotHeight)
                                                                          : getContainSize(relayImage, relayVisualSlotWidth, relayVisualSlotHeight))
                                                                      : { width: relayVisualSlotWidth, height: relayVisualSlotHeight };
                                                                  const relayImageX = relaySlotX + (relayVisualSlotWidth - relayImageSize.width) / 2;
                                                                   const relayImageY = sourceRelaySlotY + (relayVisualSlotHeight - relayImageSize.height) / 2;
                                                                   const relayPorts = relayImageKey ? (wirelessPortsByType[relayImageKey] || []) : [];
                                                                   const boilerBusAPort = relayPorts.find((port) => port.name === 'BUS-A') || null;
                                                                   const boilerBusBPort = relayPorts.find((port) => port.name === 'BUS-B') || null;
                                                                   const isDoubleRelayDevice = String(relayDevice?.connection_type || '').toLowerCase() === 'double_relay';
                                                                  const relayInPort = isDoubleRelayDevice
                                                                      ? (relayPorts.find((port) => port.name === `RELAY-IN-${relayIndex}`)
                                                                          || (getPortsByClassToken(relayPorts, `RELAY-IN-${relayIndex}`) || [])[0]
                                                                          || relayPorts.find((port) => port.name === `RELAY-${relayIndex}`)
                                                                          || (getPortsByClassToken(relayPorts, `RELAY-${relayIndex}`) || [])[0]
                                                                          || null)
                                                                       : getRelayInputPort(relayPorts, relayType, relayImageKey);
                                                                  const moduleBPortX = bPort ? slotX + bPort.x * size.width : null;
                                                                  const moduleBPortY = bPort ? slotY + bPort.y * size.height : null;
                                                                  const getRelayImagePortPoint = (port) => {
                                                                      if (!port || !relayImage) return null;
                                                                      const imageWidth = relayImage.width || relayImageSize.width;
                                                                      const imageHeight = relayImage.height || relayImageSize.height;
                                                                       const crop = { x: 0, y: 0, width: imageWidth, height: imageHeight };
                                                                      return {
                                                                          x: relayImageX + (((port.x * imageWidth) - crop.x) / crop.width) * relayImageSize.width,
                                                                          y: relayImageY + (((port.y * imageHeight) - crop.y) / crop.height) * relayImageSize.height,
                                                                      };
                                                                  };
                                                                  const relayInPortPoint = getRelayImagePortPoint(relayInPort);
                                                                  const relayInPortX = relayInPortPoint ? relayInPortPoint.x : relaySlotX;
                                                                  const relayInPortY = relayInPortPoint ? relayInPortPoint.y : relaySlotY + relayVisualSlotHeight / 2;
                                                                  const relayTypeDevices = [
                                                                      ...getRelayDevicesForController(scheme),
                                                                      ...getRelaySPreferredDevices(scheme),
                                                                      ...diModules.flatMap((moduleItem) => [
                                                                          ...(Array.isArray(moduleItem?.relay_devices) ? moduleItem.relay_devices : []),
                                                                          ...(Array.isArray(moduleItem?.relay_s_devices) ? moduleItem.relay_s_devices : []),
                                                                      ]),
                                                                  ].filter((item) => canonicalDeviceType(item?.type) === relayType);
                                                                  const relaySystemIndex = relayDevice
                                                                      ? Math.max(0, relayTypeDevices.findIndex((item) => {
                                                                          if (relayDevice?.id != null && item?.id != null) return relayDevice.id === item.id;
                                                                          return relayDevice === item;
                                                                      })) + 1
                                                                      : 0;
                                                                  const relayBaseTitle = relayType === 'pump-220v'
                                                                      ? 'Насос 220V'
                                                                      : (relayType === 'boiler-pump'
                                                                          ? 'Насос бойлера'
                                                                          : (isRelayBoilerType(relayType)
                                                                              ? (relayDevice?.name || 'Котел')
                                                                              : (relayType === '220servo'
                                                                                  ? 'Сервопривод'
                                                                                  : (relayType === 'valve'
                                                                                      ? 'Запорный клапан'
                                                                                      : (relayType === 'zoneServo' ? 'Сервопривод зоны' : 'Прочее оборудование')))));
                                                                   const relayInfoIndex = relaySystemIndex > 0 ? relaySystemIndex : relaySlotIndex + 1;
                                                                   const relayInfoTitle = getDeviceStoredTitle(relayDevice) || `${relayBaseTitle} ${relayInfoIndex}`;
                                                                   const infoBlockWidth = relayVisualSlotWidth;
                                                                   const infoBlockHeight = INFO_BLOCK_HEIGHT;
                                                                   const infoBlockX = relaySlotX + relayVisualSlotWidth / 2 - infoBlockWidth / 2;
                                                                    const infoBlockY = sourceRelaySlotY - infoBlockHeight - 8;
                                                                   const relayHoverKey = `rl2s:${slotIndex}:${sourceRelaySlotIndex}`;
                                                                   const isRelayHovered = hoveredRelaySlotIndex === relayHoverKey;
                                                                   const relayStroke = relayType === '220servo'
                                                                       || relayType === 'valve'
                                                                       || relayType === 'boiler-pump'
                                                                       || relayType === 'pump-220v'
                                                                       || relayType === 'zoneServo'
                                                                       || isOtherEquipmentType(relayType)
                                                                       ? '#d32f2f'
                                                                       : '#212121';

                                                                   return (
                                                                       <Group
                                                                           key={`rl2s-relay-s-${slotIndex}-${relaySlotIndex}`}
                                                                           onMouseEnter={() => setHoveredRelaySlotIndex(relayHoverKey)}
                                                                           onMouseLeave={() => setHoveredRelaySlotIndex((prev) => (prev === relayHoverKey ? null : prev))}
                                                                       >
                                                                           {relayDevice && relayType !== 'valve' && !isStupidBoilerType(relayType) && bPort && relayInPort && (
                                                                                 <Line points={[relayInPortX, relayInPortY, moduleBPortX, relayInPortY, moduleBPortX, moduleBPortY]} stroke={relayStroke} strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                                           )}
                                                                          {!relayDevice && bPort && moduleBPortX !== null && moduleBPortY !== null && (
                                                                              <Line
                                                                                  points={[relaySlotX, relaySlotY + relaySlotSize / 2, moduleBPortX, relaySlotY + relaySlotSize / 2, moduleBPortX, moduleBPortY]}
                                                                                  stroke="#9e9e9e"
                                                                                  strokeWidth={1}
                                                                                  lineCap="round"
                                                                                  lineJoin="round"
                                                                                  listening={false}
                                                                              />
                                                                          )}
                                                                           {!slotState?.covered && (
                                                                               <Rect
                                                                                   name="module-device-slot"
                                                                                   collisionOccupied={Boolean(relayDevice)}
                                                                                   x={relaySlotX}
                                                                              y={relaySlotY}
                                                                              width={relayVisualSlotWidth}
                                                                              height={relayVisualSlotHeight}
                                                                              cornerRadius={10}
                                                                              fill={relayDevice ? TRANSPARENT_FILL : EMPTY_SLOT_FILL}
                                                                              stroke={relayDevice ? TRANSPARENT_FILL : EMPTY_SLOT_STROKE}
                                                                               strokeWidth={1.5}
                                                                           />
                                                                           )}
                                                                          {!relayDevice && (
                                                                              <>
                                                                                  <Circle
                                                                                      x={relaySlotX + relaySlotSize / 2}
                                                                                      y={relaySlotY + relaySlotSize / 2}
                                                                                      radius={16}
                                                                                      fill={ADD_ACTION_FILL}
                                                                                      onClick={(e) => {
                                                                                          const pos = e.target.getAbsolutePosition();
                                                                                          setRl2sRelayMenuPos({ x: pos.x, y: pos.y, moduleIndex: slotIndex, relaySlotIndex });
                                                                                      }}
                                                                                      onTap={(e) => {
                                                                                          const pos = e.target.getAbsolutePosition();
                                                                                          setRl2sRelayMenuPos({ x: pos.x, y: pos.y, moduleIndex: slotIndex, relaySlotIndex });
                                                                                      }}
                                                                                  />
                                                                                  <Text
                                                                                      x={relaySlotX + relaySlotSize / 2}
                                                                                      y={relaySlotY + relaySlotSize / 2}
                                                                                      text="+"
                                                                                      fontSize={22}
                                                                                      fill={INFO_BLOCK_FILL}
                                                                                      offsetX={6.5}
                                                                                      offsetY={9}
                                                                                      listening={false}
                                                                                  />
                                                                              </>
                                                                          )}
                                                                              {shouldRenderRelayDevice && relayImage && (
                                                                                   <Image image={relayImage} x={relayImageX} y={relayImageY} width={relayImageSize.width} height={relayImageSize.height} listening={false} />
                                                                              )}
                                                                             {shouldRenderRelayDevice && relayType === 'valve' && bPort && (() => {
                                                                                 const nextBPort = sourceRelaySlotIndex === 0
                                                                                     ? diPorts.find((port) => port.name === 'RELAY-S-2-B') || null
                                                                                     : null;
                                                                                 const relay1Port = relayPorts.find((port) => port.name === 'RELAY-IN-1')
                                                                                     || (getPortsByClassToken(relayPorts, 'RELAY-IN-1') || [])[0]
                                                                                     || null;
                                                                                 const relay2Port = relayPorts.find((port) => port.name === 'RELAY-IN-2')
                                                                                     || (getPortsByClassToken(relayPorts, 'RELAY-IN-2') || [])[0]
                                                                                     || null;
                                                                                 if (!nextBPort || !relay1Port || !relay2Port) return null;
                                                                                 const relay1Point = getRelayImagePortPoint(relay1Port);
                                                                                 const relay2Point = getRelayImagePortPoint(relay2Port);
                                                                                 if (!relay1Point || !relay2Point) return null;
                                                                                 const nextModuleBPortX = slotX + nextBPort.x * size.width;
                                                                                 const nextModuleBPortY = slotY + nextBPort.y * size.height;
                                                                                 return (
                                                                                     <>
                                                                                         <Line points={[relay1Point.x, relay1Point.y, moduleBPortX, relay1Point.y, moduleBPortX, moduleBPortY]} stroke="#d32f2f" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                                                         <Line points={[relay2Point.x, relay2Point.y, nextModuleBPortX, relay2Point.y, nextModuleBPortX, nextModuleBPortY]} stroke="#d32f2f" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                                                     </>
                                                                                 );
                                                                             })()}
                                                                            {shouldRenderRelayDevice && isStupidBoilerType(relayType) && groupedAPort && bPort && boilerBusAPort && boilerBusBPort && (() => {
                                                                                const groupedModulePortX = slotX + groupedAPort.x * size.width;
                                                                                const groupedModulePortY = slotY + groupedAPort.y * size.height;
                                                                                const boilerBusAPoint = getRelayImagePortPoint(boilerBusAPort);
                                                                                const boilerBusBPoint = getRelayImagePortPoint(boilerBusBPort);
                                                                                if (!boilerBusAPoint || !boilerBusBPoint) return null;
                                                                                const aFromX = boilerBusAPoint.x;
                                                                                const aFromY = boilerBusAPoint.y;
                                                                                const bFromX = boilerBusBPoint.x;
                                                                                const bFromY = boilerBusBPoint.y;
                                                                                const imageBottomY = relayImageY + relayImageSize.height;
                                                                                const aRouteY = imageBottomY + 0.5 * indentSize;
                                                                                const bRouteY = imageBottomY + indentSize;
                                                                                return (
                                                                                    <>
                                                                                        <Line points={[aFromX, aFromY, aFromX, aRouteY, moduleBPortX, aRouteY, moduleBPortX, moduleBPortY]} stroke="#2e7d32" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                                                        <Line points={[bFromX, bFromY, bFromX, bRouteY, groupedModulePortX, bRouteY, groupedModulePortX, groupedModulePortY]} stroke="#2e7d32" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                                                    </>
                                                                                );
                                                                            })()}
                                                                           {shouldRenderRelayDevice && (
                                                                               <>
                                                                                   <Rect
                                                                                      x={infoBlockX}
                                                                                      y={infoBlockY}
                                                                                      width={infoBlockWidth}
                                                                                      height={infoBlockHeight}
                                                                                       cornerRadius={1}
                                                                                       fill={INFO_BLOCK_FILL}
                                                                                       stroke={INFO_BLOCK_STROKE}
                                                                                       strokeWidth={INFO_BLOCK_STROKE_WIDTH}
                                                                                      listening={false}
                                                                                  />
                                                                                   <EditableInfoTitle
                                                                                       x={infoBlockX}
                                                                                       y={infoBlockY}
                                                                                       text={relayInfoTitle}
                                                                                       fontSize={4}
                                                                                       fill={INFO_BLOCK_TEXT_COLOR}
                                                                                        width={infoBlockWidth}
                                                                                        height={infoBlockHeight}
                                                                                        align="center"
                                                                                        verticalAlign="middle" device={relayDevice} title={relayInfoTitle} />
                                                                               </>
                                                                           )}
                                                                           {shouldRenderRelayDevice && isRelayHovered && (
                                                                               <SlotDeleteButton compact x={relaySlotX + relayVisualSlotWidth - 2.5} y={sourceRelaySlotY + 1.5} onRemove={(event) => {
                                                                                   event.cancelBubble = true;
                                                                                   removeDiModuleRelayDeviceAtSlot(slotIndex, 'relay_s_devices', sourceRelaySlotIndex);
                                                                               }} />
                                                                           )}
                                                                       </Group>
                                                                   );
                                                                     })}
                                                                 </>
                                                             );
                                                         })()}
                                                         {showPorts && isOccupied && diPorts.map((port) => (
                                                             <Circle
                                                                 key={`di-slot-${slotIndex}-${port.name}`}
                                                                x={slotX + port.x * size.width}
                                                                y={slotY + port.y * size.height}
                                                                radius={2.5}
                                                                fill="red"


                                                            />
                                                        ))}
                                                        {!isOccupied && (
                                                            <>
                                                                <Circle
                                                                    x={slotX + size.width / 2}
                                                                    y={slotY + size.height / 2}
                                                                    radius={16}
                                                                    fill={ADD_ACTION_FILL}
                                                                    onClick={(e) => {
                                                                        const pos = e.target.getAbsolutePosition();
                                                                        setDiMenuPos({ x: pos.x, y: pos.y, slotIndex });
                                                                    }}
                                                                    onTap={(e) => {
                                                                        const pos = e.target.getAbsolutePosition();
                                                                        setDiMenuPos({ x: pos.x, y: pos.y, slotIndex });
                                                                    }}
                                                                />
                                                                <EditableInfoTitle x={slotX + size.width / 2}
                                                                    y={slotY + size.height / 2}
                                                                    text="+"
                                                                    fontSize={22}
                                                                    fill={INFO_BLOCK_FILL}
                                                                    offsetX={6.5}
                                                                    offsetY={9}
                                                                    listening={false}
                                                                />
                                                            </>
                                                        )}
                                                        {isOccupied && hoveredExtSlotIndex === `di:${slotIndex}` && (
                                                            <SlotDeleteButton compact name="scheme-delete-control" x={slotX + size.width - 2.5} y={slotY + 1.5} onRemove={() => removeDiModuleAtSlot(slotIndex)} />
                                                        )}
                                                    </Group>
                                                );
                                            })}
                                        </>
                                    );
                                })()}
                                <WifiLine
                                    wifiLineEnabled={wifiLineEnabled}
                                    memoWifiModules={memoWifiModules}
                                    getWifiCapacity={getWifiCapacity}
                                    controllerType={controllerType}
                                    showEmptySlots={showEmptySlots}
                                    wirelessImages={wirelessImages}
                                    wirelessPortsByType={wirelessPortsByType}
                                    dinSize={dinSize}
                                    indentSize={indentSize}
                                    moduleHeightValue={moduleHeightValue}
                                    scheme={scheme}
                                    getDiModules={getDiModules}
                                    controllerImage={controllerImage}
                                    getSmart2DiModuleExtraSpacing={getSmart2DiModuleExtraSpacing}
                                    diSlotOffsets={diSlotOffsets}
                                    getDiOffsetKey={getDiOffsetKey}
                                    renderedProExtRight={renderedProExtRight}
                                    memoExtModules={memoExtModules}
                                    memoExtLineThermostatDevices={memoExtLineThermostatDevices}
                                    extSlotOffsets={extSlotOffsets}
                                    getExtOffsetKey={getExtOffsetKey}
                                    isRelayBoilerType={isRelayBoilerType}
                                    wifiSlotOffsets={wifiSlotOffsets}
                                    wifiOneWireSlotOffsets={wifiOneWireSlotOffsets}
                                    getWifiOffsetKey={getWifiOffsetKey}
                                    snapToGrid={snapToGrid}
                                    showLineFrames={showLineFrames}
                                    setHoveredWifiSlotKey={setHoveredWifiSlotKey}
                                    wifiDragStartOffsetsRef={wifiDragStartOffsetsRef}
                                    rectsOverlap={rectsOverlap}
                                    setInvalidWifiDragMap={setInvalidWifiDragMap}
                                    invalidWifiDragMap={invalidWifiDragMap}
                                    setWifiSlotOffsets={setWifiSlotOffsets}
                                    setWifiOneWireSlotOffsets={setWifiOneWireSlotOffsets}
                                    getMorphImageKey={getMorphImageKey}
                                    getFullWidthSize={getFullWidthSize}
                                    getContainSize={getContainSize}
                                    getDoubleRelayDevices={getDoubleRelayDevices}
                                    getRelayLinkPointsFromDevice={getRelayLinkPointsFromDevice}
                                    setRelayMenuPos={setRelayMenuPos}
                                    removeWifiModuleRelayDeviceAtSlot={removeWifiModuleRelayDeviceAtSlot}
                                    getOneWireBendY={getOneWireBendY}
                                    getOrthogonalLinkPoints={getOrthogonalLinkPoints}
                                    setHoveredWifiOneWireSlotKey={setHoveredWifiOneWireSlotKey}
                                    hoveredWifiOneWireSlotKey={hoveredWifiOneWireSlotKey}
                                    setWifiOneWireMenuPos={setWifiOneWireMenuPos}
                                    removeWifiOneWireDeviceAtSlot={removeWifiOneWireDeviceAtSlot}
                                    showPorts={showPorts}
                                    setWifiMenuPos={setWifiMenuPos}
                                    hoveredWifiSlotKey={hoveredWifiSlotKey}
                                    removeWifiModuleAtSlot={removeWifiModuleAtSlot}
                                />
                                {(() => {
                                    const supportsExtLine = controllerType === 'pro' || controllerType === 'ecosmart';
                                    if (!supportsExtLine) return null;
                                     const extModules = [...memoExtModules, ...memoExtLineThermostatDevices];
                                     const hasNonEmptyControllerOneWireLine = memoOneWireDevices.length > 0;
                                     const canAddMoreExt = extModules.length < 12;
                                     const showExtAddSlot = controllerType !== 'ecosmart' && canAddMoreExt && showEmptySlots;
                                     const showEcosmartExtThermostatAddSlot = controllerType === 'ecosmart' && canAddMoreExt && showEmptySlots;
                                     const extSlotsCount = extModules.length + (showExtAddSlot ? 1 : 0) + (showEcosmartExtThermostatAddSlot ? 1 : 0);
                                     const isEcosmartThermostatExtLine = controllerType === 'ecosmart'
                                         && (showEcosmartExtThermostatAddSlot || extModules.some((moduleDevice) => canonicalDeviceType(moduleDevice?.type) === 'thermostat'));
                                     const ecosmartExtThermostatPlaceholder = {
                                         type: 'thermostat',
                                         connection_type: 'EXT',
                                         color: 'black',
                                         additions: [],
                                     };
                                    const getExtModuleSize = (device) => {
                                        const imageKey = getWirelessDeviceImageKey(device);
                                        const image = imageKey ? wirelessImages[imageKey] : null;
                                        if (!image?.width || !image?.height) {
                                            return { width: EXT_SLOT_SIZE, height: EXT_SLOT_SIZE };
                                        }
                                        return { width: image.width, height: image.height };
                                    };
                                    const hasRealExtOneWireDevices = (moduleDevice, moduleIndex) => {
                                        if (canonicalDeviceType(moduleDevice?.type) !== 'rl6') return false;
                                        const devices = useInitialOneWireBalance
                                            ? memoBalancedOneWire.extDevicesByModuleIndex[moduleIndex]
                                            : moduleDevice?.one_wire_devices;
                                        return Array.isArray(devices) && devices.some(Boolean);
                                    };
                                    const getRl6RelayDevicesForModule = (moduleIndex) => {
                                        const moduleDevice = extModules[moduleIndex] || null;
                                        if (moduleDevice && Object.prototype.hasOwnProperty.call(moduleDevice, 'relay_devices')) {
                                            return getModuleLineDevices(moduleDevice, 'relay_devices').slice(0, 6);
                                        }
                                        const moduleOrder = extModules
                                            .slice(0, moduleIndex)
                                            .filter((item) => canonicalDeviceType(item?.type) === 'rl6')
                                            .length;
                                        const controllerRelayCapacity = getRelayLineConfig(controllerType, ports).length;
                                        return getRelayDevicesForController(scheme)
                                            .slice(controllerRelayCapacity + moduleOrder * 6, controllerRelayCapacity + (moduleOrder + 1) * 6);
                                    };
                                    const getRl6RightExtraGap = (moduleDevice, moduleIndex) => (
                                        canonicalDeviceType(moduleDevice?.type) === 'rl6'
                                            ? 20 * indentSize
                                            : 0
                                    );
                                     const getExtModuleLayoutWidth = (moduleDevice) => getExtModuleSize(moduleDevice).width
                                         + (hasExtThermostatFloorSensor(moduleDevice) ? 7 * indentSize : 0);
                                     const getRl6sLeftExtraGap = (moduleDevice) => (canonicalDeviceType(moduleDevice?.type) === 'rl6s' ? 9 * indentSize : 0);
                                     const hasOccupiedDi6Slot = (moduleDevice) => (
                                         canonicalDeviceType(moduleDevice?.type) === 'di6'
                                         && (
                                             (Array.isArray(moduleDevice?.channel_devices) && moduleDevice.channel_devices.some(Boolean))
                                             || (Array.isArray(moduleDevice?.di_devices) && moduleDevice.di_devices.some(Boolean))
                                         )
                                     );
                                     const getExtSlotX = (slotIndex) => {
                                          const minGap = EXT_SLOT_MIN_GAP_MULTIPLIER * indentSize;
                                          const controllerExtraGap = hasNonEmptyControllerOneWireLine ? 8 * indentSize : 0;
                                          const ecosmartExtLineLeftOffset = controllerType === 'ecosmart' ? 45 * indentSize : 0;
                                          const ecosmartThermostatLeftOffset = isEcosmartThermostatExtLine ? 20 * indentSize : 0;
                                          const baseX = controllerImage.width + minGap + controllerExtraGap - ecosmartExtLineLeftOffset - ecosmartThermostatLeftOffset;
                                        const hasNonEmptyExtOneWire = (moduleDevice, moduleIndex) => (
                                            !!moduleDevice
                                            && (canonicalDeviceType(moduleDevice?.type) === 'rl6' || canonicalDeviceType(moduleDevice?.type) === 'rl6s')
                                            && (
                                                    useInitialOneWireBalance
                                                        ? Array.isArray(memoBalancedOneWire.extDevicesByModuleIndex[moduleIndex])
                                                            && memoBalancedOneWire.extDevicesByModuleIndex[moduleIndex].some(Boolean)
                                                        : (Array.isArray(moduleDevice?.one_wire_devices) && moduleDevice.one_wire_devices.some(Boolean))
                                            )
                                        );
                                        const getRl6RelayDevices = (moduleIndex) => {
                                            const moduleDevice = extModules[moduleIndex] || null;
                                            if (moduleDevice && Object.prototype.hasOwnProperty.call(moduleDevice, 'relay_devices')) {
                                                return getModuleLineDevices(moduleDevice, 'relay_devices').slice(0, 6);
                                            }
                                            const moduleOrder = extModules
                                                .slice(0, moduleIndex)
                                                .filter((item) => canonicalDeviceType(item?.type) === 'rl6')
                                                .length;
                                            const controllerRelayCapacity = getRelayLineConfig(controllerType, ports).length;
                                            return getRelayDevicesForController(scheme)
                                                .slice(controllerRelayCapacity + moduleOrder * 6, controllerRelayCapacity + (moduleOrder + 1) * 6);
                                        };
                                        const hasVisibleRl6RelayLine = (moduleDevice, moduleIndex) => (
                                            canonicalDeviceType(moduleDevice?.type) === 'rl6'
                                            && (showEmptySlots || getRl6RelayDevices(moduleIndex).length > 0)
                                        );
                                        const needsRl6RightGap = (moduleDevice, moduleIndex) => (
                                            hasVisibleRl6RelayLine(moduleDevice, moduleIndex)
                                        );
                                        const getRl6LeftExtraGap = (moduleDevice, moduleIndex) => (hasVisibleRl6RelayLine(moduleDevice, moduleIndex) ? 11 * indentSize : 0);
                                        if (slotIndex <= 0) {
                                            const firstModule = extModules[0] || null;
                                            const di6OccupiedLeftGap = hasOccupiedDi6Slot(firstModule) ? 10 * indentSize : 0;
                                            return baseX + getRl6LeftExtraGap(firstModule, 0) + getRl6sLeftExtraGap(firstModule) + di6OccupiedLeftGap;
                                        }
                                        const getDynamicGap = (leftDevice, rightDevice, leftIndex) => {
                                            const leftWidth = getExtModuleSize(leftDevice).width;
                                            const rightWidth = getExtModuleSize(rightDevice).width;
                                            const largerWidth = Math.max(leftWidth, rightWidth);
                                            const extraGap = largerWidth > 100 ? indentSize : 0;
                                            const oneWireExtraGap = hasNonEmptyExtOneWire(leftDevice, leftIndex)
                                                ? 24 * indentSize
                                                : 0;
                                            const io4ExtraGap = canonicalDeviceType(leftDevice?.type) === 'io4'
                                                ? 12 * indentSize
                                                : 0;
                                            const di6ExtraGapLeft = canonicalDeviceType(leftDevice?.type) === 'di6'
                                                ? 9 * indentSize
                                                : 0;
                                            const di6ExtraGapRight = canonicalDeviceType(rightDevice?.type) === 'di6'
                                                ? 9 * indentSize
                                                : 0;
                                            const di6OccupiedLeftGap = hasOccupiedDi6Slot(rightDevice)
                                                ? 10 * indentSize
                                                : 0;
                                            const di6OccupiedRightGap = hasOccupiedDi6Slot(leftDevice)
                                                ? 7 * indentSize
                                                : 0;
                                            const leftType = canonicalDeviceType(leftDevice?.type);
                                            const rl6RightExtraGap = leftType === 'rl6'
                                                ? 20 * indentSize
                                                : 0;
                                            const rl6sRightExtraGap = leftType === 'rl6s'
                                                ? 9 * indentSize
                                                : 0;
                                            const rl6LeftExtraGap = getRl6LeftExtraGap(rightDevice, leftIndex + 1);
                                            const rl6sLeftExtraGap = getRl6sLeftExtraGap(rightDevice);
                                            return minGap + extraGap + oneWireExtraGap + io4ExtraGap + di6ExtraGapLeft + di6ExtraGapRight + di6OccupiedLeftGap + di6OccupiedRightGap + rl6RightExtraGap + rl6sRightExtraGap + rl6LeftExtraGap + rl6sLeftExtraGap;
                                        };
                                        let x = baseX;
                                        for (let i = 0; i < slotIndex; i += 1) {
                                            const currentDevice = extModules[i] || null;
                                            const currentWidth = getExtModuleLayoutWidth(currentDevice);
                                            x += currentWidth;
                                            if (i < slotIndex - 1) {
                                                const nextDevice = extModules[i + 1] || null;
                                                x += getDynamicGap(currentDevice, nextDevice, i);
                                            }
                                        }
                                        return x + getDynamicGap(extModules[slotIndex - 1] || null, extModules[slotIndex] || null, slotIndex - 1);
                                    };
                                    const getExtOccupiedSlotPosition = (slotIndex) => {
                                        const slotDevice = extModules[slotIndex] || null;
                                        const slotSize = slotDevice ? getExtModuleSize(slotDevice) : { width: EXT_SLOT_SIZE, height: EXT_SLOT_SIZE };
                                        const offset = extSlotOffsets[getExtOffsetKey(slotDevice, slotIndex)] || { x: 0, y: 0 };
                                        const baseX = getExtSlotX(slotIndex);
                                          const baseY = isEcosmartThermostatExtLine
                                               ? -2.25 * moduleHeightValue - 25 * indentSize + slotIndex * 10 * indentSize
                                             : controllerImage.height - slotSize.height;
                                        const isInitialPosition = offset.x === 0 && offset.y === 0;
                                        return {
                                            x: isInitialPosition ? snapToGrid(baseX, indentSize) : baseX + offset.x,
                                            y: isInitialPosition ? snapToGrid(baseY, indentSize) : baseY + offset.y,
                                        };
                                    };
                                    const getExtBaseSlotPosition = (slotIndex) => {
                                        const slotDevice = extModules[slotIndex] || null;
                                        const slotSize = slotDevice ? getExtModuleSize(slotDevice) : { width: EXT_SLOT_SIZE, height: EXT_SLOT_SIZE };
                                        const baseX = getExtSlotX(slotIndex);
                                          const baseY = isEcosmartThermostatExtLine
                                               ? -2.25 * moduleHeightValue - 25 * indentSize + slotIndex * 10 * indentSize
                                             : controllerImage.height - slotSize.height;
                                        return {
                                            x: snapToGrid(baseX, indentSize),
                                            y: snapToGrid(baseY, indentSize),
                                        };
                                    };
                                     const getExtSlotPosition = (slotIndex) => {
                                         const slotDevice = extModules[slotIndex]
                                             || (showEcosmartExtThermostatAddSlot && slotIndex === extModules.length ? ecosmartExtThermostatPlaceholder : null);
                                         const slotSize = slotDevice ? getExtModuleSize(slotDevice) : { width: EXT_SLOT_SIZE, height: EXT_SLOT_SIZE };
                                        const isAddSlot = !slotDevice && slotIndex === extModules.length;
                                        if (isAddSlot && extModules.length > 0) {
                                            const minGap = EXT_SLOT_MIN_GAP_MULTIPLIER * indentSize;
                                            const lastIndex = extModules.length - 1;
                                            const lastDevice = extModules[lastIndex];
                                            const lastSize = getExtModuleSize(lastDevice);
                                            const lastType = canonicalDeviceType(lastDevice?.type);
                                            const lastRightExtraGap = getRl6RightExtraGap(lastDevice, lastIndex)
                                                + (lastType === 'rl6s' ? 9 * indentSize : 0)
                                                + (hasOccupiedDi6Slot(lastDevice) ? 7 * indentSize : 0);
                                            const lastLayoutWidth = getExtModuleLayoutWidth(lastDevice) + lastRightExtraGap;
                                            const lastPos = getExtOccupiedSlotPosition(lastIndex);
                                             return {
                                                 x: lastPos.x + lastLayoutWidth + minGap,
                                                  y: lastPos.y + (lastSize.height - slotSize.height) + (isEcosmartThermostatExtLine ? 10 * indentSize : 0),
                                             };
                                        }
                                        const offset = extSlotOffsets[getExtOffsetKey(slotDevice, slotIndex)] || { x: 0, y: 0 };
                                        const baseX = getExtSlotX(slotIndex);
                                         const baseY = isEcosmartThermostatExtLine
                                               ? -2.25 * moduleHeightValue - 25 * indentSize + slotIndex * 10 * indentSize
                                             : controllerImage.height - slotSize.height;
                                        const isInitialPosition = offset.x === 0 && offset.y === 0;
                                        return {
                                            x: isInitialPosition ? snapToGrid(baseX, indentSize) : baseX + offset.x,
                                            y: isInitialPosition ? snapToGrid(baseY, indentSize) : baseY + offset.y,
                                        };
                                    };
                                     const extLinks = [
                                        {
                                            color: '#d32f2f',
                                            controllerFrom: ['12VDC-OUT-V+', '12VDC-IN-V+'],
                                            moduleFrom: '12VDC-OUT-V+',
                                            moduleTo: '12VDC-IN-V+',
                                            firstHopBendIndent: 4,
                                            moduleHopBendIndent: 6,
                                        },
                                        {
                                            color: '#212121',
                                            controllerFrom: ['12VDC-OUT-GND', '12VDC-IN-GND'],
                                            moduleFrom: '12VDC-OUT-GND',
                                            moduleTo: '12VDC-IN-GND',
                                            firstHopBendIndent: 3,
                                            moduleHopBendIndent: 5,
                                        },
                                        {
                                            color: '#fbc02d',
                                            controllerFrom: ['EXT-OUT-A'],
                                            moduleFrom: 'EXT-OUT-A',
                                            moduleTo: 'EXT-IN-A',
                                            firstHopBendIndent: 6,
                                            moduleHopBendIndent: 4,
                                        },
                                        {
                                            color: '#2e7d32',
                                            controllerFrom: ['EXT-OUT-B'],
                                            moduleFrom: 'EXT-OUT-B',
                                            moduleTo: 'EXT-IN-B',
                                            firstHopBendIndent: 5,
                                            moduleHopBendIndent: 3,
                                         },
                                     ];
                                     const emptyExtSlotInputPorts = {
                                         '12VDC-IN-V+': { x: 7.25 / EXT_SLOT_SIZE, y: 1 },
                                         '12VDC-IN-GND': { x: 16 / EXT_SLOT_SIZE, y: 1 },
                                         'EXT-IN-A': { x: 24.75 / EXT_SLOT_SIZE, y: 1 },
                                         'EXT-IN-B': { x: 33.25 / EXT_SLOT_SIZE, y: 1 },
                                     };
                                     const findPortByNames = (portsList, names) => {
                                         for (let i = 0; i < names.length; i += 1) {
                                             const found = portsList.find((port) => port.name === names[i]);
                                             if (found) return found;
                                         }
                                         return null;
                                     };
                                     const findExtDevicePort = (deviceItem, portsList, portName) => {
                                         if (canonicalDeviceType(deviceItem?.type) === 'thermostat') {
                                             if (portName === '12VDC-IN-V+' || portName === '12VDC-OUT-V+') return findPortByNames(portsList, ['1-WIRE-V+']);
                                             if (portName === '12VDC-IN-GND' || portName === '12VDC-OUT-GND') return findPortByNames(portsList, ['1-WIRE-GND']);
                                             if (portName === 'EXT-IN-A' || portName === 'EXT-OUT-A') return findPortByNames(portsList, ['EXT-A']);
                                             if (portName === 'EXT-IN-B' || portName === 'EXT-OUT-B') return findPortByNames(portsList, ['EXT-B']);
                                         }
                                         return findPortByNames(portsList, [portName, portName.replace('EXT-IN', 'EXT'), portName.replace('EXT-OUT', 'EXT'), portName.replace('12VDC-IN', '12VDC'), portName.replace('12VDC-OUT', '12VDC')]);
                                     };
                                     return (
                                        <>
                                             {showLineFrames && extSlotsCount > 0 && (() => {
                                                  const extRects = Array.from({ length: extSlotsCount }).map((_, slotIndex) => {
                                                      const device = extModules[slotIndex]
                                                          || (showEcosmartExtThermostatAddSlot && slotIndex === extModules.length ? ecosmartExtThermostatPlaceholder : null);
                                                      const size = device ? getExtModuleSize(device) : { width: EXT_SLOT_SIZE, height: EXT_SLOT_SIZE };
                                                     const layoutWidth = device ? getExtModuleLayoutWidth(device) : size.width;
                                                     const pos = getExtSlotPosition(slotIndex);
                                                     return { left: pos.x, top: pos.y, right: pos.x + layoutWidth, bottom: pos.y + size.height };
                                                 });
                                                const minX = Math.min(...extRects.map((r) => r.left));
                                                const minY = Math.min(...extRects.map((r) => r.top));
                                                const maxX = Math.max(...extRects.map((r) => r.right));
                                                const maxY = Math.max(...extRects.map((r) => r.bottom));
                                                return (
                                                    <Rect
                                                        x={minX - 10}
                                                        y={minY - 10}
                                                        width={maxX - minX + 20}
                                                        height={maxY - minY + 20}
                                                        cornerRadius={8}
                                                        fill="rgba(95,138,114,0.2)"
                                                        stroke="#5f8a72"
                                                        strokeWidth={1}
                                                        dash={[6, 4]}
                                                        opacity={0.68}
                                                        listening={false}
                                                    />
                                                );
                                            })()}
                                             {Array.from({ length: extSlotsCount }).map((_, slotIndex) => {
                                                 const device = extModules[slotIndex] || null;
                                                 const offsetKey = getExtOffsetKey(device, slotIndex);
                                                 const collisionId = `ext:${offsetKey}`;
                                                 const isEcosmartExtThermostatAddSlot = !device && showEcosmartExtThermostatAddSlot && slotIndex === extModules.length;
                                                  const renderDevice = device || (isEcosmartExtThermostatAddSlot ? ecosmartExtThermostatPlaceholder : null);
                                                  const isOccupied = !!device;
                                                  const isProExtAddSlot = controllerType === 'pro'
                                                      && !isOccupied
                                                      && showExtAddSlot
                                                      && slotIndex === extModules.length;
                                                 const imageKey = renderDevice ? getWirelessDeviceImageKey(renderDevice) : null;
                                                 const image = imageKey ? wirelessImages[imageKey] : null;
                                                 const extPorts = imageKey ? (wirelessPortsByType[imageKey] || []) : [];
                                                 const size = renderDevice ? getExtModuleSize(renderDevice) : { width: EXT_SLOT_SIZE, height: EXT_SLOT_SIZE };
                                                const slotWidth = size.width;
                                                const slotHeight = size.height;
                                                const slotPos = getExtSlotPosition(slotIndex);
                                                const slotX = slotPos.x;
                                                const slotY = slotPos.y;
                                                  const isHovered = hoveredExtSlotIndex === slotIndex;
                                                  const extNormalizedType = canonicalDeviceType(renderDevice?.type);
                                                  const isExtThermostat = extNormalizedType === 'thermostat';
                                                   const extThermostatIndex = isExtThermostat && isOccupied
                                                       ? extModules.slice(0, slotIndex + 1).filter((item) => canonicalDeviceType(item?.type) === 'thermostat').length
                                                       : 0;
                                                   const hasExtThermostatFloorSensor = isExtThermostat && (Array.isArray(device?.additions) ? device.additions : [])
                                                       .some((addition) => {
                                                           const additionType = canonicalDeviceType(addition?.type);
                                                           return additionType === 'floor-sensor' || additionType === 'flask-sensor-floor';
                                                       });
                                                   const extThermostatTitle = getDeviceStoredTitle(device) || (hasExtThermostatFloorSensor
                                                       ? `Проводной термостат с датчиком пола${extThermostatIndex > 0 ? ` ${extThermostatIndex}` : ''}`
                                                       : (extThermostatIndex > 0 ? `Проводной термостат ${extThermostatIndex}` : 'Проводной термостат'));
                                                  const hasAlwaysOnPowerIndicator = isOccupied && ['rl6', 'rl6s', 'rl6w', 'rl6sw'].includes(extNormalizedType);
                                                const supportsOwnOneWire = isOccupied && (device.type === 'rl6' || device.type === 'rl6s');
                                                const supportsOwnChannelLine = isOccupied && extNormalizedType === 'io4';
                                                const extOneWireDevices = supportsOwnOneWire
                                                    ? (useInitialOneWireBalance
                                                        ? (memoBalancedOneWire.extDevicesByModuleIndex[slotIndex] || [])
                                                        : (Array.isArray(device.one_wire_devices) ? device.one_wire_devices : []))
                                                    : [];
                                                const extOneWireSlotsCount = extOneWireDevices.length + ((showEmptySlots && extOneWireDevices.length < 6) ? 1 : 0);
                                                const pressureSensorsInSystem = getPressureSensorsFromScheme(scheme);
                                                const pumps010InSystem = getIo4OnlyWiredDevices(scheme)
                                                    .filter((item) => canonicalDeviceType(item?.type) === '010pump');
                                                const servos010InSystem = getIo4OnlyWiredDevices(scheme)
                                                    .filter((item) => canonicalDeviceType(item?.type) === '010servo');
                                                const diControllerCapacity = controllerType === 'pro' ? 2 : 0;
                                                const availableExtDiDevices = getDiWiredDevices(scheme).slice(diControllerCapacity);
                                                const extDiOffsetBefore = extModules
                                                    .slice(0, slotIndex)
                                                    .reduce((sum, item) => sum + getExtDiLineCapacityByType(item?.type), 0);
                                                const moduleExtDiCapacity = getExtDiLineCapacityByType(extNormalizedType);
                                                const legacyExtDiAssignedDevices = availableExtDiDevices.slice(extDiOffsetBefore, extDiOffsetBefore + moduleExtDiCapacity);
                                                 const extDiAssignedDevices = (extNormalizedType === 'di6'
                                                     ? getDi6PhysicalDevices(device, legacyExtDiAssignedDevices)
                                                     : getModuleLineDevices(device, 'di_devices', legacyExtDiAssignedDevices)).slice(0, moduleExtDiCapacity);
                                                const pressureSensorsForIo4 = getPressureSensorsFromScheme(scheme).slice(1).map((sensor, index) => ({
                                                    ...sensor,
                                                    id: sensor?.id ?? `channel-pressure-${index}`,
                                                    type: 'pressure-sensor',
                                                    connection_type: '4-20',
                                                }));
                                                const ntcSensorsForIo4 = getNtcSensorsFromScheme(scheme).map((sensor, index) => ({
                                                    ...sensor,
                                                    id: sensor?.id ?? `channel-ntc-${index}`,
                                                    type: 'ntc-sensor',
                                                    connection_type: 'ntc',
                                                }));
                                                const legacyChannelDevices = [...extDiAssignedDevices, ...pressureSensorsForIo4, ...ntcSensorsForIo4].slice(0, moduleExtDiCapacity);
                                                const channelDevices = supportsOwnChannelLine
                                                    ? getModuleLineDevices(device, 'channel_devices', legacyChannelDevices).slice(0, moduleExtDiCapacity)
                                                    : [];
                                                const supportsOwnDi6Lines = isOccupied && extNormalizedType === 'di6';
                                                const channelSlotWidth = 9 * indentSize;
                                                const channelSlotHeight = 3 * indentSize;
                                                const channelSlotGap = 8 * indentSize;
                                                const channelLineBaseX = slotX + slotWidth + 3 * indentSize;
                                                const channelBottomSlotY = slotY - channelSlotHeight - 2 * indentSize;
                                                const channelTopSlotY = channelBottomSlotY - 3 * (channelSlotHeight + channelSlotGap);
                                                const getChannelSlotY = (channelIndex) => channelTopSlotY + channelIndex * (channelSlotHeight + channelSlotGap);
                                                const occupiedChannelIndexes = channelDevices
                                                    .map((channelDevice, channelIndex) => (channelDevice ? channelIndex : -1))
                                                    .filter((channelIndex) => channelIndex >= 0);
                                                const getChannelVisualIndex = (channelIndex) => {
                                                    if (showEmptySlots) return channelIndex;
                                                    const occupiedOrder = occupiedChannelIndexes.indexOf(channelIndex);
                                                    if (occupiedOrder < 0) return channelIndex;
                                                    return 4 - occupiedChannelIndexes.length + occupiedOrder;
                                                };
                                                const busBoilers = getBusDevices(scheme);
                                                const controllerBusCount = getBusLineCount(controllerType);
                                                const isBl2 = isOccupied && canonicalDeviceType(device?.type) === 'bl2';
                                                const bl2Order = isBl2
                                                    ? extModules
                                                        .slice(0, slotIndex + 1)
                                                        .filter((item) => canonicalDeviceType(item?.type) === 'bl2')
                                                        .length - 1
                                                    : -1;
                                                const legacyBl2Boiler = isBl2 ? (busBoilers[controllerBusCount + bl2Order] || null) : null;
                                                const bl2Boiler = isBl2 ? (getModuleLineDevices(device, 'bus_devices', legacyBl2Boiler ? [legacyBl2Boiler] : [])[0] || null) : null;
                                                const bl2BoilerKey = bl2Boiler ? getWirelessDeviceImageKey(bl2Boiler) : null;
                                                const bl2BoilerImage = bl2BoilerKey ? wirelessImages[bl2BoilerKey] : null;
                                                const bl2BoilerPorts = bl2BoilerKey ? (wirelessPortsByType[bl2BoilerKey] || []) : [];
                                                const bl2BoilerTitle = getDeviceStoredTitle(bl2Boiler) || (typeof bl2Boiler?.name === 'string' && bl2Boiler.name.trim().length > 0
                                                    ? bl2Boiler.name
                                                    : 'Котел');
                                                const bl2BoilerWidth = bl2BoilerImage?.width || BUS_SLOT_SIZE;
                                                const bl2BoilerHeight = bl2BoilerImage?.height || BUS_SLOT_SIZE;
                                                const getBusPairCenterX = (portsList) => {
                                                    const busA = portsList.find((port) => port.name === 'BUS-A');
                                                    const busB = portsList.find((port) => port.name === 'BUS-B');
                                                    if (busA && busB) return (busA.x + busB.x) / 2;
                                                    const singleBus = portsList.find((port) => port.name === 'BUS')
                                                        || portsList.find((port) => port.name.startsWith('BUS'))
                                                        || null;
                                                    return singleBus ? singleBus.x : null;
                                                };
                                                  const moduleBusCenterX = getBusPairCenterX(extPorts);
                                                  const boilerBusCenterX = getBusPairCenterX(bl2BoilerPorts);
                                                  const bl2BusSlotBaseX = (moduleBusCenterX !== null && boilerBusCenterX !== null)
                                                      ? (slotX + moduleBusCenterX * slotWidth - boilerBusCenterX * bl2BoilerWidth)
                                                      : (slotX + slotWidth - bl2BoilerWidth);
                                                  const bl2BusSlotY = slotY - bl2BoilerHeight - 2 * indentSize;
                                                  const hasBl2RinnaiAdapter = bl2Boiler?.adapter?.type === 'rinnai';
                                                  const bl2BusSlotX = bl2BusSlotBaseX - (hasBl2RinnaiAdapter ? 5.5 * indentSize : 0);
                                                 const bl2RinnaiAdapterImage = hasBl2RinnaiAdapter ? wirelessImages['rinnai-adapter'] : null;
                                                 const bl2RinnaiAdapterPorts = hasBl2RinnaiAdapter ? (wirelessPortsByType['rinnai-adapter'] || []) : [];
                                                 const bl2RinnaiAdapterWidth = bl2RinnaiAdapterImage?.width || 27;
                                                 const bl2RinnaiAdapterHeight = bl2RinnaiAdapterImage?.height || 47;
                                                  const bl2RinnaiAdapterX = bl2BusSlotX + bl2BoilerWidth + 4 * indentSize;
                                                 const bl2RinnaiAdapterY = bl2BusSlotY + (bl2BoilerHeight - bl2RinnaiAdapterHeight) / 2;
                                                const extOneWireGap = 2 * indentSize;
                                                const extNtcTopExtraOffset = 22 * indentSize;
                                                const extNtcSideExtraGap = 10 * indentSize;
                                                const getExtOneWireSlotSize = (owDevice) => {
                                                    if (!owDevice) return { width: ONE_WIRE_SLOT_SIZE, height: ONE_WIRE_SLOT_SIZE };
                                                    const owType = canonicalDeviceType(owDevice?.type);
                                                    if (owType === 'thermostat') {
                                                        return { width: ONE_WIRE_THERMOSTAT_SIZE, height: ONE_WIRE_THERMOSTAT_SIZE };
                                                    }
                                                    const isModuleWithNativeSize = owType === 'ntc-1-wire' || owType === 'rdt2';
                                                    if (!isModuleWithNativeSize) {
                                                        return { width: ONE_WIRE_SLOT_SIZE, height: ONE_WIRE_SLOT_SIZE };
                                                    }
                                                    const owImageKey = getWirelessDeviceImageKey(owDevice);
                                                    const owImage = owImageKey ? wirelessImages[owImageKey] : null;
                                                    if (!owImage?.width || !owImage?.height) {
                                                        return { width: ONE_WIRE_SLOT_SIZE, height: ONE_WIRE_SLOT_SIZE };
                                                    }
                                                    return { width: owImage.width, height: owImage.height };
                                                };
                                                const getExtOneWireSlotPositionByOffsets = (owIndex, offsetsMap) => {
                                                    const moduleOneWirePorts = extPorts.filter((port) => port.name.startsWith('1-WIRE-'));
                                                    const moduleOneWireVPlus = moduleOneWirePorts.find((port) => port.name === '1-WIRE-V+');
                                                    const defaultFirstSlotX = slotX + 2 * indentSize;
                                                    const firstSlotX = moduleOneWireVPlus
                                                        ? (slotX + moduleOneWireVPlus.x * slotWidth + 2 * indentSize)
                                                        : defaultFirstSlotX;
                                                    let x = firstSlotX;
                                                    const moduleOneWireBottomY = moduleOneWirePorts.length > 0
                                                        ? Math.max(...moduleOneWirePorts.map((port) => slotY + port.y * slotHeight))
                                                        : (slotY + slotHeight);
                                                    let y = moduleOneWireBottomY + moduleHeightValue;
                                                    const firstDeviceForSideGap = extOneWireDevices[0] || null;
                                                    if (canonicalDeviceType(firstDeviceForSideGap?.type) === 'ntc-1-wire') {
                                                        x += extNtcSideExtraGap;
                                                    }
                                                    const firstDevice = extOneWireDevices[0] || null;
                                                    if (owIndex >= 0 && canonicalDeviceType(firstDevice?.type) === 'ntc-1-wire') {
                                                        y += extNtcTopExtraOffset;
                                                    }
                                                    if (owIndex === 0) {
                                                        const key = getExtOneWireOffsetKey(device, slotIndex, extOneWireDevices[owIndex] || null, owIndex);
                                                        const offset = offsetsMap[key] || { x: 0, y: 0 };
                                                        return { x: x + offset.x, y: y + offset.y };
                                                    }
                                                    for (let i = 1; i <= owIndex; i += 1) {
                                                        const prevDevice = extOneWireDevices[i - 1] || null;
                                                        const currentDevice = extOneWireDevices[i] || null;
                                                        const prevSize = getExtOneWireSlotSize(prevDevice);
                                                        const prevType = canonicalDeviceType(prevDevice?.type);
                                                        const currentType = canonicalDeviceType(currentDevice?.type);
                                                        const isPrevModule = prevType === 'ntc-1-wire' || prevType === 'rdt2';
                                                        const stepY = moduleHeightValue * 0.25;
                                                        const defaultVerticalGap = prevSize.height + 3 * indentSize + stepY;
                                                        const moduleVerticalGap = prevSize.height + stepY;
                                                        const currentNtcTopOffset = currentType === 'ntc-1-wire' ? extNtcTopExtraOffset : 0;
                                                        const prevNtcRightGap = prevType === 'ntc-1-wire' ? extNtcSideExtraGap : 0;
                                                        const currentNtcLeftGap = currentType === 'ntc-1-wire' ? extNtcSideExtraGap : 0;
                                                        x += prevSize.width + extOneWireGap + prevNtcRightGap + currentNtcLeftGap;
                                                        y += (isPrevModule ? moduleVerticalGap : defaultVerticalGap) + currentNtcTopOffset;
                                                    }
                                                    const key = getExtOneWireOffsetKey(device, slotIndex, extOneWireDevices[owIndex] || null, owIndex);
                                                    const offset = offsetsMap[key] || { x: 0, y: 0 };
                                                    return { x: x + offset.x, y: y + offset.y };
                                                };
                                                const getExtOneWireSlotPosition = (owIndex) => (
                                                    getExtOneWireSlotPositionByOffsets(owIndex, extOneWireOffsets)
                                                );
                                                const getExtOwPorts = (owDevice) => {
                                                    if (!owDevice) return ONE_WIRE_SLOT_FAKE_PORTS;
                                                    const owImageKey = getWirelessDeviceImageKey(owDevice);
                                                    return wirelessPortsByType[owImageKey] || [];
                                                };
                                                const getExtOwPortMap = (owDevice, portsList, preferredDirection = null) => ({
                                                    '1-WIRE-V+': getAnchoredOneWirePort(owDevice, '1-WIRE-V+', preferredDirection) || getOneWirePortByRole(portsList, '1-WIRE-V+', preferredDirection),
                                                    '1-WIRE-DAT': getAnchoredOneWirePort(owDevice, '1-WIRE-DAT', preferredDirection) || getOneWirePortByRole(portsList, '1-WIRE-DAT', preferredDirection),
                                                    '1-WIRE-GND': getAnchoredOneWirePort(owDevice, '1-WIRE-GND', preferredDirection) || getOneWirePortByRole(portsList, '1-WIRE-GND', preferredDirection),
                                                });
                                                const extOwLinks = [
                                                    { name: '1-WIRE-V+', offset: 1 * indentSize, color: '#d32f2f' },
                                                    { name: '1-WIRE-DAT', offset: 2 * indentSize, color: '#fbc02d' },
                                                    { name: '1-WIRE-GND', offset: 3 * indentSize, color: '#212121' },
                                                ];
                                                return (
                                                    <Group
                                                        key={`ext-slot-${offsetKey}`}
                                                        ref={(node) => {
                                                            if (node) moduleCollisionNodeRefs.current[collisionId] = node;
                                                            else delete moduleCollisionNodeRefs.current[collisionId];
                                                        }}
                                                        draggable
                                                        onDragStart={() => {
                                                            extDragStartOffsetsRef.current[offsetKey] = extSlotOffsets[offsetKey] || { x: 0, y: 0 };
                                                            setInvalidExtDragMap((prev) => ({ ...prev, [offsetKey]: false }));
                                                        }}
                                                        onMouseEnter={() => setHoveredExtSlotIndex(slotIndex)}
                                                        onMouseLeave={() => setHoveredExtSlotIndex(null)}
                                                        onDragMove={(event) => {
                                                            const position = event.target.position();
                                                            const startOffset = extDragStartOffsetsRef.current[offsetKey] || { x: 0, y: 0 };
                                                            const draftOffset = {
                                                                x: startOffset.x + position.x,
                                                                y: startOffset.y + position.y,
                                                            };
                                                            const draftOffsets = {
                                                                ...extSlotOffsets,
                                                                [offsetKey]: draftOffset,
                                                            };
                                                            setExtSlotOffsets((prev) => ({
                                                                ...prev,
                                                                [offsetKey]: draftOffset,
                                                            }));
                                                            const collisionData = getAllOccupiedRects(
                                                                controllerImage,
                                                                scheme,
                                                                showEmptySlots,
                                                                memoWirelessOffsetsByLine,
                                                                oneWireSlotOffsets,
                                                                draftOffsets,
                                                                diSlotOffsets,
                                                                useInitialOneWireBalance ? memoBalancedOneWire.extDevicesByModuleIndex : null,
                                                            );
                                                              const layoutWidth = getExtModuleLayoutWidth(device);
                                                              const baseSlotPos = getExtBaseSlotPosition(slotIndex);
                                                              const targetBodyRect = {
                                                                   left: baseSlotPos.x + draftOffset.x,
                                                                   top: baseSlotPos.y + draftOffset.y,
                                                                   right: baseSlotPos.x + draftOffset.x + layoutWidth,
                                                                   bottom: baseSlotPos.y + draftOffset.y + slotHeight,
                                                               };
                                                              const targetRect = getModuleObjectFootprint(collisionId, {
                                                                  left: slotX,
                                                                  top: slotY,
                                                                  right: slotX + layoutWidth,
                                                                  bottom: slotY + slotHeight,
                                                              }, targetBodyRect);
                                                            const collides = Boolean(collisionData) && (
                                                                rectsOverlap(targetRect, collisionData.controllerRect)
                                                                || collisionData.rects.some((rect) => rect.id !== collisionId && rectsOverlap(targetRect, rect))
                                                            );
                                                            setInvalidExtDragMap((prev) => ({ ...prev, [offsetKey]: collides }));
                                                            event.target.position({ x: 0, y: 0 });
                                                        }}
                                                        onDragEnd={(event) => {
                                                            const startOffset = extDragStartOffsetsRef.current[offsetKey] || { x: 0, y: 0 };
                                                            const nextOffset = extSlotOffsets[offsetKey] || { x: 0, y: 0 };
                                                            const nextOffsets = { ...extSlotOffsets, [offsetKey]: nextOffset };
                                                             const collisionData = getAllOccupiedRects(
                                                                 controllerImage,
                                                                scheme,
                                                                showEmptySlots,
                                                                memoWirelessOffsetsByLine,
                                                                oneWireSlotOffsets,
                                                                nextOffsets,
                                                                diSlotOffsets,
                                                                useInitialOneWireBalance ? memoBalancedOneWire.extDevicesByModuleIndex : null,
                                                            );
                                                              const layoutWidth = getExtModuleLayoutWidth(device);
                                                              const baseSlotPos = getExtBaseSlotPosition(slotIndex);
                                                              const targetBodyRect = {
                                                                   left: baseSlotPos.x + nextOffset.x,
                                                                   top: baseSlotPos.y + nextOffset.y,
                                                                   right: baseSlotPos.x + nextOffset.x + layoutWidth,
                                                                   bottom: baseSlotPos.y + nextOffset.y + slotHeight,
                                                               };
                                                              const targetRect = getModuleObjectFootprint(collisionId, {
                                                                  left: slotX,
                                                                  top: slotY,
                                                                  right: slotX + layoutWidth,
                                                                  bottom: slotY + slotHeight,
                                                              }, targetBodyRect);
                                                            const collides = Boolean(collisionData) && (
                                                                rectsOverlap(targetRect, collisionData.controllerRect)
                                                                || collisionData.rects.some((rect) => rect.id !== collisionId && rectsOverlap(targetRect, rect))
                                                            );
                                                            if (collides) {
                                                                setExtSlotOffsets((prev) => ({ ...prev, [offsetKey]: startOffset }));
                                                                event.target.position(startOffset);
                                                                event.target.getLayer()?.batchDraw();
                                                            }
                                                            setInvalidExtDragMap((prev) => ({ ...prev, [offsetKey]: false }));
                                                            delete extDragStartOffsetsRef.current[offsetKey];
                                                            event.target.position({ x: 0, y: 0 });
                                                        }}
                                                    >
                                                        <Rect
                                                            ref={(node) => {
                                                                if (node) extBodyNodeRefs.current[collisionId] = node;
                                                                else delete extBodyNodeRefs.current[collisionId];
                                                            }}
                                                            x={slotX}
                                                            y={slotY}
                                                            width={slotWidth}
                                                            height={slotHeight}
                                                            cornerRadius={10}
                                                            fill={invalidExtDragMap[offsetKey] ? 'rgba(211, 47, 47, 0.08)' : (isOccupied ? TRANSPARENT_FILL : EMPTY_SLOT_FILL)}
                                                            stroke={invalidExtDragMap[offsetKey] ? '#d32f2f' : (isOccupied ? TRANSPARENT_FILL : EMPTY_SLOT_STROKE)}
                                                            strokeWidth={1.5}
                                                        />
                                                         {isOccupied && image && (
                                                               <Image
                                                                name={`morph:${getMorphImageKey(device)}`}
                                                                 image={image}
                                                                x={slotX}
                                                                y={slotY}
                                                                 width={slotWidth}
                                                                  height={slotHeight}
                                                                  listening={false}
                                                              />
                                                         )}
                                                          {renderDevice && isExtThermostat && (() => {
                                                              const floorSensor = (Array.isArray(device?.additions) ? device.additions : [])
                                                                 .find((addition) => {
                                                                     const additionType = canonicalDeviceType(addition?.type);
                                                                     return additionType === 'floor-sensor' || additionType === 'flask-sensor-floor';
                                                                 });
                                                             if (!floorSensor && !showEmptySlots) return null;
                                                             const floorSensorImage = wirelessImages['floor-sensor-thermostat-ext'];
                                                             const floorSensorPorts = wirelessPortsByType['floor-sensor-thermostat-ext'] || [];
                                                             const floorSlotSize = THERMOSTAT_FLOOR_SLOT_SIZE;
                                                             const floorSlotX = slotX + slotWidth + THERMOSTAT_FLOOR_SLOT_GAP;
                                                             const floorSlotY = slotY + (slotHeight - floorSlotSize) / 2 - 2.5 * indentSize;
                                                             return (
                                                                  <>
                                                                      {!floorSensor && showEmptySlots && (
                                                                          <>
                                                                               <Rect
                                                                                   name="module-device-slot"
                                                                                   collisionOccupied={false}
                                                                                   x={floorSlotX}
                                                                                  y={floorSlotY}
                                                                                  width={floorSlotSize}
                                                                                  height={floorSlotSize}
                                                                                  cornerRadius={5}
                                                                                  fill="#ffffff"
                                                                                  stroke="#8ab4d6"
                                                                                  strokeWidth={1}
                                                                                  onClick={() => addExtThermostatFloorSensor(slotIndex, memoExtModules.length)}
                                                                                  onTap={() => addExtThermostatFloorSensor(slotIndex, memoExtModules.length)}
                                                                              />
                                                                              <Circle
                                                                                  x={floorSlotX + floorSlotSize / 2}
                                                                                  y={floorSlotY + floorSlotSize / 2}
                                                                                  radius={10}
                                                                                  fill={ADD_ACTION_FILL}
                                                                                  onClick={() => addExtThermostatFloorSensor(slotIndex, memoExtModules.length)}
                                                                                  onTap={() => addExtThermostatFloorSensor(slotIndex, memoExtModules.length)}
                                                                              />
                                                                              <Text x={floorSlotX + floorSlotSize / 2} y={floorSlotY + floorSlotSize / 2} text="+" fontSize={15} fill={ADD_ACTION_TEXT_FILL} offsetX={4.5} offsetY={6} listening={false} />
                                                                          </>
                                                                      )}
                                                                      {floorSensor && (
                                                                          <Rect
                                                                              name="module-device-slot"
                                                                              collisionOccupied
                                                                              x={floorSlotX}
                                                                              y={floorSlotY}
                                                                              width={floorSlotSize}
                                                                              height={floorSlotSize}
                                                                              fill={TRANSPARENT_FILL}
                                                                              listening={false}
                                                                          />
                                                                      )}
                                                                      {floorSensor && floorSensorImage && (
                                                                          <Image image={floorSensorImage} x={floorSlotX} y={floorSlotY} width={floorSlotSize} height={floorSlotSize} listening={false} />
                                                                     )}
                                                                     {floorSensor && (() => {
                                                                          const thermostatGnd = getPortPosition(extPorts, '1-WIRE-GND', slotX, slotY, slotWidth, slotHeight);
                                                                          const thermostatDat = getPortPosition(extPorts, '1-WIRE-DAT', slotX, slotY, slotWidth, slotHeight);
                                                                          const floorGnd = getPortPosition(floorSensorPorts, '1-WIRE-GND', floorSlotX, floorSlotY, floorSlotSize, floorSlotSize);
                                                                          const floorDat = getPortPosition(floorSensorPorts, '1-WIRE-DAT', floorSlotX, floorSlotY, floorSlotSize, floorSlotSize);
                                                                          const floorVPlus = getPortPosition(floorSensorPorts, '1-WIRE-V+', floorSlotX, floorSlotY, floorSlotSize, floorSlotSize);
                                                                          const lines = [
                                                                              { from: thermostatGnd, to: floorGnd, offset: 3 * indentSize, color: '#212121' },
                                                                              { from: thermostatGnd ? { ...thermostatGnd, y: thermostatGnd.y + 0.2 * indentSize } : null, to: floorVPlus, offset: 2 * indentSize, color: '#d32f2f' },
                                                                              { from: thermostatDat, to: floorDat, offset: 1 * indentSize, color: '#fbc02d' },
                                                                          ];
                                                                         return lines
                                                                             .filter((item) => item.from && item.to)
                                                                             .map((item, lineIndex) => (
                                                                                 <Line
                                                                                     key={`ext-thermostat-floor-${slotIndex}-${lineIndex}`}
                                                                                     points={[item.from.x, item.from.y, item.to.x, item.from.y, item.to.x, item.to.y]}
                                                                                     stroke={item.color}
                                                                                     strokeWidth={1}
                                                                                     lineCap="round"
                                                                                     lineJoin="round"
                                                                                     listening={false}
                                                                                 />
                                                                             ));
                                                                     })()}
                                                                 </>
                                                             );
                                                          })()}
                                                          {isOccupied && isExtThermostat && isHovered && (
                                                              <SlotDeleteButton compact x={slotX + slotWidth - 2.5} y={slotY + 1.5} onRemove={() => removeExtThermostatAtSlot(slotIndex, memoExtModules.length)} />
                                                          )}
                                                          {isOccupied && isExtThermostat && (
                                                              <>
                                                                  <Rect
                                                                      x={slotX}
                                                                      y={slotY - (INFO_BLOCK_HEIGHT + 4)}
                                                                      width={slotWidth}
                                                                      height={INFO_BLOCK_HEIGHT}
                                                                      cornerRadius={1}
                                                                      fill={INFO_BLOCK_FILL}
                                                                      stroke={INFO_BLOCK_STROKE}
                                                                      strokeWidth={INFO_BLOCK_STROKE_WIDTH}
                                                                  />
                                                                  <EditableInfoTitle
                                                                      x={slotX + 3}
                                                                      y={slotY - (INFO_BLOCK_HEIGHT + 4)}
                                                                      width={Math.max(30, slotWidth - 6)}
                                                                      height={INFO_BLOCK_HEIGHT}
                                                                      text={extThermostatTitle}
                                                                      fontSize={4}
                                                                      fill={INFO_BLOCK_TEXT_COLOR}
                                                                      align="center"
                                                                      verticalAlign="middle"
                                                                      device={device}
                                                                      title={extThermostatTitle}
                                                                  />
                                                              </>
                                                          )}
                                                          {hasAlwaysOnPowerIndicator && (() => {
                                                             const indicatorPort = extPorts.find((port) => String(port?.name || '').toUpperCase() === 'POWER-INDICATOR');
                                                             if (!indicatorPort) return null;
                                                             return (
                                                                 <DeviceIndicator
                                                                     port={indicatorPort}
                                                                     imageWidth={slotWidth}
                                                                     imageHeight={slotHeight}
                                                                     offsetX={slotX}
                                                                     offsetY={slotY}
                                                                     active
                                                                 />
                                                             );
                                                         })()}
                                                         {isOccupied && (extNormalizedType === 'rl6' || extNormalizedType === 'rl6s') && (() => {
                                                             const isRelaySModule = extNormalizedType === 'rl6s';
                                                             const controllerRelayCapacity = isRelaySModule
                                                                 ? getRelaySLineConfig(controllerType, ports).length
                                                                 : getRelayLineConfig(controllerType, ports).length;
                                                             const moduleOrder = extModules
                                                                 .slice(0, slotIndex)
                                                                 .filter((item) => canonicalDeviceType(item?.type) === extNormalizedType)
                                                                 .length;
                                                             const legacyModuleRelayDevices = (isRelaySModule ? getRelaySPreferredDevices(scheme) : getRelayDevicesForController(scheme))
                                                                 .slice(controllerRelayCapacity + moduleOrder * 6, controllerRelayCapacity + (moduleOrder + 1) * 6);
                                                             const moduleRelayDevices = getModuleLineDevices(
                                                                 device,
                                                                 isRelaySModule ? 'relay_s_devices' : 'relay_devices',
                                                                 legacyModuleRelayDevices,
                                                             ).slice(0, 6);
                                                              const moduleRelayOccupancy = buildRelaySlotOccupancyPreserveIndexes(
                                                                  moduleRelayDevices,
                                                                  6,
                                                                  (relayDevice) => (String(relayDevice?.connection_type || '').toLowerCase() === 'double_relay' ? 2 : 1),
                                                              );
                                                             const indicatorPrefix = isRelaySModule ? 'RELAY-S-INDICATOR' : 'RELAY-INDICATOR';

                                                             return [1, 2, 3, 4, 5, 6].map((relayIndex) => {
                                                                 const indicatorPort = extPorts.find((port) => String(port?.name || '').toUpperCase() === `${indicatorPrefix}-${relayIndex}`);
                                                                 if (!indicatorPort) return null;
                                                                 const isRelayOccupied = !!moduleRelayOccupancy[relayIndex - 1];
                                                                  return (
                                                                      <DeviceIndicator
                                                                          key={`${extNormalizedType}-relay-indicator-${slotIndex}-${relayIndex}`}
                                                                          port={indicatorPort}
                                                                          imageWidth={slotWidth}
                                                                          imageHeight={slotHeight}
                                                                          offsetX={slotX}
                                                                          offsetY={slotY}
                                                                          active={isRelayOccupied}
                                                                     />
                                                                 );
                                                             });
                                                         })()}
                                                         {showPorts && isOccupied && extPorts.map((port) => (
                                                             <Circle
                                                                 key={`ext-slot-${slotIndex}-${port.name}`}
                                                                 x={slotX + port.x * slotWidth}
                                                                y={slotY + port.y * slotHeight}
                                                                radius={2.5}
                                                                fill="red"


                                                            />
                                                        ))}
                                                        {isOccupied && (extNormalizedType === 'rl6' || extNormalizedType === 'rl6s') && (() => {
                                                            const isRelaySModule = extNormalizedType === 'rl6s';
                                                            const controllerRelayCapacity = isRelaySModule
                                                                ? getRelaySLineConfig(controllerType, ports).length
                                                                : getRelayLineConfig(controllerType, ports).length;
                                                            const moduleOrder = extModules
                                                                .slice(0, slotIndex)
                                                                .filter((item) => canonicalDeviceType(item?.type) === extNormalizedType)
                                                                .length;
                                                            const legacyModuleRelayDevices = (isRelaySModule ? getRelaySPreferredDevices(scheme) : getRelayDevicesForController(scheme))
                                                                .slice(controllerRelayCapacity + moduleOrder * 6, controllerRelayCapacity + (moduleOrder + 1) * 6);
                                                             const moduleRelayDevices = getModuleLineDevices(
                                                                 device,
                                                                 isRelaySModule ? 'relay_s_devices' : 'relay_devices',
                                                                 legacyModuleRelayDevices,
                                                             ).slice(0, 6);
                                                            const moduleRelayOccupancy = buildRelaySlotOccupancyPreserveIndexes(
                                                                moduleRelayDevices,
                                                                6,
                                                                (relayDevice) => (String(relayDevice?.connection_type || '').toLowerCase() === 'double_relay' ? 2 : 1),
                                                            );
                                                            const relayPortPrefix = isRelaySModule ? 'RELAY-S' : 'RELAY';
                                                            const slotGap = 4 * indentSize;
                                                            const defaultSlotSize = 8 * indentSize;
                                                            const stupidSlotWidth = 6 * indentSize;
                                                            const stupidSlotHeight = 10 * indentSize;
                                                            const lineSideGap = 4 * indentSize;
                                                            const getRelaySlotSize = (relayDevice) => {
                                                                const relayType = canonicalDeviceType(relayDevice?.type);
                                                                if (isRelayBoilerType(relayType)) {
                                                                    return { width: stupidSlotWidth, height: stupidSlotHeight };
                                                                }
                                                                return { width: defaultSlotSize, height: defaultSlotSize };
                                                            };
                                                            const getRelaySlotY = (lineDevices, lineSlotIndex) => {
                                                                const sizes = [0, 1, 2].map((idx) => getRelaySlotSize(lineDevices[idx] || null));
                                                                const totalHeight = sizes.reduce((sum, size) => sum + size.height, 0) + slotGap * 2;
                                                                let y = slotY - totalHeight;
                                                                for (let idx = 0; idx < lineSlotIndex; idx += 1) {
                                                                    y += sizes[idx].height + slotGap;
                                                                }
                                                                return y;
                                                            };
                                                             const renderRelayLine = (side, lineOccupancy, relayIndexOffset) => [0, 1, 2].map((lineSlotIndex) => {
                                                                  const relayIndex = relayIndexOffset + lineSlotIndex + 1;
                                                                  const slotState = lineOccupancy[lineSlotIndex] || null;
                                                                  const relayDevice = slotState?.device || null;
                                                                 const isCoveredRelaySlot = !!slotState?.covered;
                                                                 if (isCoveredRelaySlot) return null;
                                                                 if (!showEmptySlots && !relayDevice) return null;
                                                                const relayType = canonicalDeviceType(relayDevice?.type);
                                                                const isDoubleRelayModuleDevice = String(relayDevice?.connection_type || '').toLowerCase() === 'double_relay';
                                                                const slotSize = getRelaySlotSize(relayDevice);
                                                                  const lineDevicesForLayout = lineOccupancy.map((item) => item?.device || null);
                                                                  const visualSlotIndex = side === 'left' ? 2 - lineSlotIndex : lineSlotIndex;
                                                                  const slotRelayY = getRelaySlotY(side === 'left' ? [...lineDevicesForLayout].reverse() : lineDevicesForLayout, visualSlotIndex);
                                                                const sideGap = lineSideGap;
                                                                const slotRelayX = side === 'left'
                                                                    ? slotX - sideGap - slotSize.width
                                                                    : slotX + slotWidth + sideGap;
                                                                const visualDevice = relayDevice
                                                                    ? {
                                                                        ...relayDevice,
                                                                        port_side: side === 'left' ? 'right' : 'left',
                                                                    }
                                                                    : null;
                                                                const imageKeyRelay = visualDevice ? getWirelessDeviceImageKey(visualDevice) : null;
                                                                const imageRelay = imageKeyRelay ? wirelessImages[imageKeyRelay] : null;
                                                                const imageSizeRelay = imageRelay
                                                                    ? (relayType === 'zoneServo'
                                                                        ? getFullWidthSize(imageRelay, slotSize.width, slotSize.height)
                                                                        : getContainSize(imageRelay, slotSize.width, slotSize.height))
                                                                    : slotSize;
                                                                const imageRelayX = slotRelayX + (slotSize.width - imageSizeRelay.width) / 2;
                                                                const imageRelayY = slotRelayY + (slotSize.height - imageSizeRelay.height) / 2;
                                                                const isHoveredRelay = hoveredRelaySlotIndex === `rl6:${slotIndex}:${relayIndex}`;
                                                                 const extRelayDevicesInSystem = extModules.flatMap((moduleItem) => [
                                                                    ...(Array.isArray(moduleItem?.relay_devices) ? moduleItem.relay_devices : []),
                                                                    ...(Array.isArray(moduleItem?.relay_s_devices) ? moduleItem.relay_s_devices : []),
                                                                ]);
                                                                const relayTypeDevices = [
                                                                    ...getRelayDevicesForController(scheme),
                                                                    ...getRelaySPreferredDevices(scheme),
                                                                    ...extRelayDevicesInSystem,
                                                                ].filter((item) => canonicalDeviceType(item?.type) === relayType);
                                                                const relaySystemIndex = relayDevice
                                                                    ? Math.max(0, relayTypeDevices.findIndex((item) => {
                                                                        if (relayDevice?.id != null && item?.id != null) return relayDevice.id === item.id;
                                                                        return relayDevice === item;
                                                                    })) + 1
                                                                    : 0;
                                                                const relayBaseTitle = relayType === 'pump-220v'
                                                                    ? 'Насос 220V'
                                                                    : (relayType === 'boiler-pump'
                                                                        ? 'Насос бойлера'
                                                                        : (isRelayBoilerType(relayType)
                                                                        ? (relayDevice?.name || 'Котел')
                                                                        : (relayType === '220servo'
                                                                            ? 'Сервопривод'
                                                                            : (relayType === 'valve'
                                                                                ? 'Запорный клапан'
                                                                                : (relayType === 'zoneServo' ? 'Сервопривод зоны' : 'Прочее оборудование')))));
                                                                const relayInfoTitle = getDeviceStoredTitle(relayDevice) || (relaySystemIndex > 0 ? `${relayBaseTitle} ${relaySystemIndex}` : relayBaseTitle);
                                                                const aPort = extPorts.find((port) => port.name === `${relayPortPrefix}-${relayIndex}-A`)
                                                                    || extPorts.find((port) => port.name === `${relayPortPrefix}-${relayIndex}`);
                                                                const bPort = extPorts.find((port) => port.name === `${relayPortPrefix}-${relayIndex}-B`);
                                                                const relayPorts = imageKeyRelay ? (wirelessPortsByType[imageKeyRelay] || []) : [];
                                                                const relayInPort = getRelayInputPort(relayPorts, relayType, imageKeyRelay);
                                                                 const boilerBusAPort = relayPorts.find((port) => port.name === 'BUS-A') || null;
                                                                 const boilerBusBPort = relayPorts.find((port) => port.name === 'BUS-B') || null;
                                                                 const boilerTerminalNames = getRl6RelayTerminalNames(relayPortPrefix, relayIndex);
                                                                 const boilerModuleAPort = boilerTerminalNames
                                                                     ? extPorts.find((port) => port.name === boilerTerminalNames.a) || null
                                                                     : null;
                                                                 const moduleAPortX = aPort ? slotX + aPort.x * slotWidth : null;
                                                                const moduleAPortY = aPort ? slotY + aPort.y * slotHeight : null;
                                                                const moduleBPortX = bPort ? slotX + bPort.x * slotWidth : null;
                                                                const moduleBPortY = bPort ? slotY + bPort.y * slotHeight : null;
                                                                return (
                                                                    <Group
                                                                        key={`${extNormalizedType}-relay-${slotIndex}-${side}-${lineSlotIndex}`}
                                                                        onMouseEnter={() => setHoveredRelaySlotIndex(`rl6:${slotIndex}:${relayIndex}`)}
                                                                        onMouseLeave={() => setHoveredRelaySlotIndex((prev) => (prev === `rl6:${slotIndex}:${relayIndex}` ? null : prev))}
                                                                    >
                                                                        <Rect
                                                                            name="module-device-slot"
                                                                            collisionOccupied={Boolean(relayDevice)}
                                                                            x={slotRelayX}
                                                                            y={slotRelayY}
                                                                            width={slotSize.width}
                                                                            height={slotSize.height}
                                                                            cornerRadius={10}
                                                                            fill={relayDevice ? TRANSPARENT_FILL : EMPTY_SLOT_FILL}
                                                                            stroke={relayDevice ? TRANSPARENT_FILL : EMPTY_SLOT_STROKE}
                                                                            strokeWidth={1.5}
                                                                        />
                                                                        {!relayDevice && (
                                                                            <Text
                                                                                x={slotRelayX + slotSize.width - 13}
                                                                                y={slotRelayY + 2}
                                                                                width={10}
                                                                                height={10}
                                                                                text={String(relayIndex)}
                                                                                fontSize={7}
                                                                                fill="#7b8494"
                                                                                align="right"
                                                                                listening={false}
                                                                            />
                                                                        )}
                                                                        {relayDevice && imageRelay && (
                                                                            <Image image={imageRelay} x={imageRelayX} y={imageRelayY} width={imageSizeRelay.width} height={imageSizeRelay.height} listening={false} />
                                                                        )}
                                                                        {relayDevice && isHoveredRelay && !isCoveredRelaySlot && (
                                                                            <SlotDeleteButton compact x={slotRelayX + slotSize.width - 2.5} y={slotRelayY + 1.5} onRemove={() => removeExtModuleRelayDeviceAtSlot(slotIndex, isRelaySModule ? 'relay_s_devices' : 'relay_devices', relayIndex - 1)} />
                                                                        )}
                                                                        {!relayDevice && bPort && moduleBPortX !== null && moduleBPortY !== null && (() => {
                                                                            const fromX = side === 'left' ? slotRelayX + slotSize.width : slotRelayX;
                                                                            const fromY = slotRelayY + slotSize.height / 2;
                                                                            return (
                                                                                <Line
                                                                                    points={[fromX, fromY, moduleBPortX, fromY, moduleBPortX, moduleBPortY]}
                                                                                    stroke="#9e9e9e"
                                                                                    strokeWidth={1}
                                                                                    lineCap="round"
                                                                                    lineJoin="round"
                                                                                    listening={false}
                                                                                />
                                                                            );
                                                                        })()}
                                                                        {relayDevice && imageRelay && isDoubleRelayModuleDevice && (() => {
                                                                            const nextBPort = extPorts.find((port) => port.name === `${relayPortPrefix}-${relayIndex + 1}-B`);
                                                                            const relay1Port = getRelayTerminalPort(relayPorts, 1, relayType === 'valve');
                                                                            const relay2Port = getRelayTerminalPort(relayPorts, 2, relayType === 'valve');
                                                                            if (!bPort || !nextBPort || !relay1Port || !relay2Port) return null;

                                                                            const from1X = imageRelayX + relay1Port.x * imageSizeRelay.width;
                                                                            const from1Y = imageRelayY + relay1Port.y * imageSizeRelay.height;
                                                                            const from2X = imageRelayX + relay2Port.x * imageSizeRelay.width;
                                                                            const from2Y = imageRelayY + relay2Port.y * imageSizeRelay.height;
                                                                            const to1X = slotX + bPort.x * slotWidth;
                                                                            const to1Y = slotY + bPort.y * slotHeight;
                                                                            const to2X = slotX + nextBPort.x * slotWidth;
                                                                            const to2Y = slotY + nextBPort.y * slotHeight;
                                                                            const relayStroke = relayType === '220servo' || relayType === 'valve' ? '#d32f2f' : '#2e7d32';

                                                                            return (
                                                                                <>
                                                                                    <Line points={[from1X, from1Y, to1X, from1Y, to1X, to1Y]} stroke={relayStroke} strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                                                    <Line points={[from2X, from2Y, to2X, from2Y, to2X, to2Y]} stroke={relayStroke} strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                                                </>
                                                                            );
                                                                        })()}
                                                                        {relayDevice && (
                                                                            <>
                                                                                <Rect x={slotRelayX} y={slotRelayY - (INFO_BLOCK_HEIGHT + 8)} width={slotSize.width} height={INFO_BLOCK_HEIGHT} cornerRadius={1} fill={INFO_BLOCK_FILL} stroke={INFO_BLOCK_STROKE} strokeWidth={INFO_BLOCK_STROKE_WIDTH} />
                                                                                <EditableInfoTitle x={slotRelayX + 3} y={slotRelayY - (INFO_BLOCK_HEIGHT + 8)} text={relayInfoTitle} fontSize={4} fill={INFO_BLOCK_TEXT_COLOR} width={Math.max(34, slotSize.width - 6)} height={INFO_BLOCK_HEIGHT} align="center" verticalAlign="middle" device={relayDevice} title={relayInfoTitle} />
                                                                            </>
                                                                        )}
                                                                         {relayDevice && bPort && imageRelay && relayType !== 'stupid' && !isDoubleRelayModuleDevice && relayInPort && (() => {
                                                                             const fromX = imageRelayX + relayInPort.x * imageSizeRelay.width;
                                                                             const fromY = imageRelayY + relayInPort.y * imageSizeRelay.height;
                                                                             return (
                                                                                 <Line
                                                                                     points={getRelayLinkPointsFromDevice({
                                                                                         fromX,
                                                                                         fromY,
                                                                                         toX: moduleBPortX,
                                                                                         toY: moduleBPortY,
                                                                                         device: visualDevice,
                                                                                         imageKey: imageKeyRelay,
                                                                                         indentSize,
                                                                                     })}
                                                                                     stroke="#d32f2f"
                                                                                     strokeWidth={1}
                                                                                     lineCap="round"
                                                                                     lineJoin="round"
                                                                                     listening={false}
                                                                                 />
                                                                             );
                                                                         })()}
                                                                        {relayDevice && boilerModuleAPort && bPort && isRelayBoilerType(relayType) && boilerBusAPort && boilerBusBPort && (() => {
                                                                            const firstModulePort = boilerModuleAPort;
                                                                            const secondModulePort = bPort;
                                                                            const firstModulePortX = slotX + firstModulePort.x * slotWidth;
                                                                            const firstModulePortY = slotY + firstModulePort.y * slotHeight;
                                                                            const secondModulePortX = slotX + secondModulePort.x * slotWidth;
                                                                            const secondModulePortY = slotY + secondModulePort.y * slotHeight;
                                                                            const aFromX = imageRelayX + boilerBusAPort.x * imageSizeRelay.width;
                                                                            const aFromY = imageRelayY + boilerBusAPort.y * imageSizeRelay.height;
                                                                            const bFromX = imageRelayX + boilerBusBPort.x * imageSizeRelay.width;
                                                                            const bFromY = imageRelayY + boilerBusBPort.y * imageSizeRelay.height;
                                                                            if (relayType === 'stupid') {
                                                                                const imageBottomY = imageRelayY + imageSizeRelay.height;
                                                                                const aRouteY = imageBottomY + 0.5 * indentSize;
                                                                                const bRouteY = imageBottomY + indentSize;
                                                                                return (
                                                                                    <>
                                                                                        <Line points={[aFromX, aFromY, aFromX, aRouteY, firstModulePortX, aRouteY, firstModulePortX, firstModulePortY]} stroke="#2e7d32" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                                                        <Line points={[bFromX, bFromY, bFromX, bRouteY, secondModulePortX, bRouteY, secondModulePortX, secondModulePortY]} stroke="#2e7d32" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                                                    </>
                                                                                );
                                                                            }
                                                                            return (
                                                                                <>
                                                                                    <Line points={[aFromX, aFromY, firstModulePortX, aFromY, firstModulePortX, firstModulePortY]} stroke="#2e7d32" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                                                    <Line points={[bFromX, bFromY, secondModulePortX, bFromY, secondModulePortX, secondModulePortY]} stroke="#2e7d32" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                                                </>
                                                                            );
                                                                        })()}
                                                                        {!relayDevice && showEmptySlots && (
                                                                            <>
                                                                                <Circle
                                                                                    x={slotRelayX + slotSize.width / 2}
                                                                                    y={slotRelayY + slotSize.height / 2}
                                                                                    radius={16}
                                                                                    fill={ADD_ACTION_FILL}
                                                                                    onClick={(e) => {
                                                                                        const pos = e.target.getAbsolutePosition();
                                                                                        setRelayMenuPos({ x: pos.x, y: pos.y, moduleIndex: slotIndex, relaySlotIndex: relayIndex - 1, lineKey: isRelaySModule ? 'relay_s_devices' : 'relay_devices' });
                                                                                    }}
                                                                                    onTap={(e) => {
                                                                                        const pos = e.target.getAbsolutePosition();
                                                                                        setRelayMenuPos({ x: pos.x, y: pos.y, moduleIndex: slotIndex, relaySlotIndex: relayIndex - 1, lineKey: isRelaySModule ? 'relay_s_devices' : 'relay_devices' });
                                                                                    }}
                                                                                />
                                                                                <EditableInfoTitle x={slotRelayX + slotSize.width / 2} y={slotRelayY + slotSize.height / 2} text="+" fontSize={22} fill={ADD_ACTION_TEXT_FILL} offsetX={6.5} offsetY={9} listening={false} />
                                                                            </>
                                                                        )}
                                                                        {showPorts && relayDevice && imageKeyRelay && relayPorts.map((port) => (
                                                                            <Circle
                                                                                key={`${extNormalizedType}-relay-port-${slotIndex}-${relayIndex}-${port.name}`}
                                                                                x={imageRelayX + port.x * imageSizeRelay.width}
                                                                                y={imageRelayY + port.y * imageSizeRelay.height}
                                                                                radius={2.5}
                                                                                fill="red"
                                                                                listening={false}


                                                                            />
                                                                        ))}
                                                                     </Group>
                                                                 );
                                                             });
                                                             const renderRelayGroupPowerFeed = (groupPortName, lineOccupancy) => {
                                                                 if (!lineOccupancy.some(Boolean)) return null;
                                                                 const groupAPort = extPorts.find((port) => port.name === groupPortName);
                                                                 if (!groupAPort) return null;
                                                                 const fromX = slotX + groupAPort.x * slotWidth;
                                                                 const fromY = slotY + groupAPort.y * slotHeight;
                                                                 const endY = fromY - 3 * indentSize;
                                                                 return (
                                                                     <Group key={`${extNormalizedType}-relay-power-feed-${slotIndex}-${groupPortName}`}>
                                                                         <Line
                                                                             points={[fromX, fromY, fromX, endY]}
                                                                             stroke="#d32f2f"
                                                                             strokeWidth={1}
                                                                             lineCap="round"
                                                                             listening={false}
                                                                         />
                                                                         <Text
                                                                             x={fromX - 8}
                                                                             y={endY - 14}
                                                                             width={16}
                                                                             text="L"
                                                                             fontSize={10}
                                                                             align="center"
                                                                             fill="#212121"
                                                                             listening={false}
                                                                         />
                                                                     </Group>
                                                                 );
                                                             };
                                                             return (
                                                                 <>
                                                                     {renderRelayGroupPowerFeed(`${relayPortPrefix}-1-2-3-A`, moduleRelayOccupancy.slice(0, 3))}
                                                                     {renderRelayGroupPowerFeed(`${relayPortPrefix}-4-5-6-A`, moduleRelayOccupancy.slice(3, 6))}
                                                                     {renderRelayLine('left', moduleRelayOccupancy.slice(0, 3), 0)}
                                                                     {renderRelayLine('right', moduleRelayOccupancy.slice(3, 6), 3)}
                                                                 </>
                                                            );
                                                        })()}
                                                        {supportsOwnChannelLine && Array.from({ length: 4 }).map((_, channelIndex) => {
                                                            const slotYChannel = getChannelSlotY(getChannelVisualIndex(channelIndex));
                                                            const portName = `CHANNEL-IN-${channelIndex + 1}`;
                                                            const fromPort = extPorts.find((port) => port.name === portName);
                                                            const slotDevice = channelDevices[channelIndex] || null;
                                                            const hasDevice = !!slotDevice;
                                                            const slotVisualDevice = slotDevice
                                                                ? {
                                                                    ...slotDevice,
                                                                    port_side: canonicalDeviceType(slotDevice?.type) === 'ntc-sensor' || canonicalDeviceType(slotDevice?.type) === 'wall-ntc-sensor' || canonicalDeviceType(slotDevice?.type) === 'boiler-ntc-sensor' || canonicalDeviceType(slotDevice?.type) === 'mixing-ntc-sensor'
                                                                        ? 'left'
                                                                        : slotDevice?.port_side,
                                                                }
                                                                : null;
                                                            const slotDeviceKey = slotVisualDevice ? getWirelessDeviceImageKey(slotVisualDevice) : null;
                                                            const slotDeviceImage = slotDeviceKey ? wirelessImages[slotDeviceKey] : null;
                                                            const slotDevicePorts = slotDeviceKey ? (wirelessPortsByType[slotDeviceKey] || []) : [];
                                                            const slotDeviceType = canonicalDeviceType(slotDevice?.type);
                                                            const isNtcLikeChannelSensor = slotDeviceType === 'ntc-sensor' || slotDeviceType === 'wall-ntc-sensor' || slotDeviceType === 'boiler-ntc-sensor' || slotDeviceType === 'mixing-ntc-sensor';
                                                            const pressureSensorIndex = slotDeviceType === 'pressure-sensor'
                                                                ? (pressureSensorsInSystem.findIndex((sensor) => {
                                                                    if (slotDevice?.id != null && sensor?.id != null) return slotDevice.id === sensor.id;
                                                                    return sensor === slotDevice;
                                                                }) + 1)
                                                                : 0;
                                                            const pressureInfoTitle = getDeviceStoredTitle(slotDevice) || (pressureSensorIndex > 0 ? `Датчик давления ${pressureSensorIndex}` : 'Датчик давления');
                                                            const ntcInfoTitle = slotDeviceType === 'ntc-sensor' || slotDeviceType === 'wall-ntc-sensor'
                                                                ? getNtcSensorTitle(scheme, slotDevice)
                                                                : getDeviceStoredTitle(slotDevice);
                                                            const pump010Index = slotDeviceType === '010pump'
                                                                ? (pumps010InSystem.findIndex((pump) => {
                                                                    if (slotDevice?.id != null && pump?.id != null) return slotDevice.id === pump.id;
                                                                    return pump === slotDevice;
                                                                }) + 1)
                                                                : 0;
                                                            const pump010InfoTitle = getDeviceStoredTitle(slotDevice) || (pump010Index > 0 ? `Насос 0-10V ${pump010Index}` : 'Насос 0-10V');
                                                             const servo010Index = slotDeviceType === '010servo'
                                                                 ? (servos010InSystem.findIndex((servo) => {
                                                                     if (slotDevice?.id != null && servo?.id != null) return slotDevice.id === servo.id;
                                                                     return servo === slotDevice;
                                                                 }) + 1)
                                                                 : 0;
                                                             const servo010InfoTitle = getDeviceStoredTitle(slotDevice) || (servo010Index > 0 ? `Сервопривод 0-10V ${servo010Index}` : 'Сервопривод 0-10V');
                                                              const showDiInfoBlock = shouldShowDiDeviceInfoBlock(slotDevice);
                                                             const diInfoTitle = showDiInfoBlock ? getDiDeviceTitle(scheme, slotDevice) : '';
                                                             const slotDeviceInPort = slotDeviceType === 'pressure-sensor'
                                                                 ? ((getPortsByClassToken(slotDevicePorts, 'CHANNEL') || [])[0]
                                                                     || slotDevicePorts.find((port) => port.name === '4-20-IN-IN')
                                                                     || slotDevicePorts.find((port) => port.name === '4-20-IN-V+')
                                                                    || null)
                                                                 : isNtcLikeChannelSensor
                                                                     ? (slotDevicePorts.find((port) => port.name === 'NTC-B')
                                                                         || (getPortsByClassToken(slotDevicePorts, 'NTC') || [])[0]
                                                                         || slotDevicePorts.find((port) => String(port?.name || '').startsWith('NTC-'))
                                                                         || null)
                                                                : slotDeviceType === '010servo'
                                                                     ? getPortByNameOrClassToken(slotDevicePorts, 'CHANNEL-IN')
                                                                     : getDiInputPort(slotDevicePorts);
                                                            const moduleChannelVPlusPortName = channelIndex < 2 ? 'CHANNEL-1-2-V+' : 'CHANNEL-3-4-V+';
                                                            const moduleChannelVPlusPort = extPorts.find((port) => port.name === moduleChannelVPlusPortName);
                                                            const slotDeviceVPlusPort = slotDeviceType === 'pressure-sensor'
                                                                ? (slotDevicePorts.find((port) => port.name === '4-20-IN-V+') || null)
                                                                : null;
                                                            const moduleChannelGndPortName = channelIndex < 2 ? 'CHANNEL-1-2-GND' : 'CHANNEL-3-4-GND';
                                                            const moduleChannelGndPort = extPorts.find((port) => port.name === moduleChannelGndPortName);
                                                             const slotDeviceGndPort = isNtcLikeChannelSensor
                                                                 ? (slotDevicePorts.find((port) => port.name === 'NTC-A')
                                                                     || slotDevicePorts.find((port) => port.name === 'NTC-B')
                                                                     || (getPortsByClassToken(slotDevicePorts, 'NTC') || [])[0]
                                                                    || null)
                                                                : null;
                                                            const visualSlotWidth = slotDeviceType === 'pressure-sensor'
                                                                ? 7 * indentSize
                                                                : (slotDeviceType === '010pump' ? 8 * indentSize : channelSlotWidth);
                                                            const visualSlotHeight = slotDeviceType === 'pressure-sensor'
                                                                ? 2 * indentSize
                                                                : (slotDeviceType === '010pump' || slotDeviceType === '010servo'
                                                                    ? 8 * indentSize
                                                                    : (slotDeviceType === 'wall-ntc-sensor' ? 7 * indentSize : channelSlotHeight));
                                                            const imageBoxWidth = isLeakDiDeviceType(slotDeviceType)
                                                                ? visualSlotWidth * LEAK_DI_DEVICE_IMAGE_SCALE
                                                                : (slotDeviceType === '010servo' ? visualSlotWidth - indentSize : visualSlotWidth);
                                                            const imageBoxHeight = isLeakDiDeviceType(slotDeviceType) ? visualSlotHeight * LEAK_DI_DEVICE_IMAGE_SCALE : visualSlotHeight;
                                                            const renderSize = (hasDevice && slotDeviceImage)
                                                                ? getContainSize(slotDeviceImage, imageBoxWidth, imageBoxHeight)
                                                                : { width: visualSlotWidth, height: visualSlotHeight };
                                                            const slotRenderX = channelLineBaseX + (channelSlotWidth - visualSlotWidth) / 2;
                                                            const slotRenderY = slotYChannel + (channelSlotHeight - visualSlotHeight) / 2;
                                                            const renderX = slotRenderX + (visualSlotWidth - renderSize.width) / 2;
                                                            const renderY = slotRenderY + (visualSlotHeight - renderSize.height) / 2;
                                                            const targetX = slotDeviceInPort ? (renderX + slotDeviceInPort.x * renderSize.width) : channelLineBaseX;
                                                            const targetY = slotDeviceInPort ? (renderY + slotDeviceInPort.y * renderSize.height) : (slotYChannel + channelSlotHeight / 2);
                                                            const targetVPlusX = slotDeviceVPlusPort
                                                                ? (renderX + slotDeviceVPlusPort.x * renderSize.width)
                                                                : targetX;
                                                            const targetVPlusY = slotDeviceVPlusPort
                                                                ? (renderY + slotDeviceVPlusPort.y * renderSize.height)
                                                                : targetY;
                                                            const targetGndX = slotDeviceGndPort
                                                                ? (renderX + slotDeviceGndPort.x * renderSize.width)
                                                                : targetX;
                                                            const targetGndY = slotDeviceGndPort
                                                                ? (renderY + slotDeviceGndPort.y * renderSize.height)
                                                                : targetY;
                                                            if (!hasDevice && !showEmptySlots) return null;
                                                            const channelHoverKey = `io4-channel:${slotIndex}:${channelIndex}`;
                                                            const isChannelHovered = hoveredNtcSlotKey === channelHoverKey;
                                                            return (
                                                                <Group
                                                                    key={`io4-channel-slot-${slotIndex}-${channelIndex}`}
                                                                    onMouseEnter={() => setHoveredNtcSlotKey(channelHoverKey)}
                                                                    onMouseLeave={() => setHoveredNtcSlotKey((prev) => (prev === channelHoverKey ? null : prev))}
                                                                >
                                                                    {hasDevice && slotDeviceImage && (
                                                                        <Image
                                                                            image={slotDeviceImage}
                                                                            x={renderX}
                                                                            y={renderY}
                                                                            width={renderSize.width}
                                                                            height={renderSize.height}
                                                                            listening={false}
                                                                        />
                                                                    )}
                                                                    {fromPort && (
                                                                        <Line
                                                                            points={[
                                                                                slotX + fromPort.x * slotWidth,
                                                                                slotY + fromPort.y * slotHeight,
                                                                                slotX + fromPort.x * slotWidth,
                                                                                targetY,
                                                                                targetX,
                                                                                targetY,
                                                                            ]}
                                                                             stroke={slotDeviceType === 'pressure-sensor'
                                                                                 ? '#f57c00'
                                                                                 : '#1565c0'}
                                                                            strokeWidth={1}
                                                                            lineCap="round"
                                                                            lineJoin="round"
                                                                            listening={false}
                                                                        />
                                                                    )}
                                                                    {slotDeviceType === 'pressure-sensor' && moduleChannelVPlusPort && (
                                                                        <Line
                                                                            points={[
                                                                                slotX + moduleChannelVPlusPort.x * slotWidth,
                                                                                slotY + moduleChannelVPlusPort.y * slotHeight,
                                                                                slotX + moduleChannelVPlusPort.x * slotWidth,
                                                                                targetVPlusY,
                                                                                targetVPlusX,
                                                                                targetVPlusY,
                                                                            ]}
                                                                            stroke="#d32f2f"
                                                                            strokeWidth={1}
                                                                            lineCap="round"
                                                                            lineJoin="round"
                                                                            listening={false}
                                                                        />
                                                                    )}
                                                                    {isNtcLikeChannelSensor && moduleChannelGndPort && (
                                                                        <Line
                                                                            points={[
                                                                                slotX + moduleChannelGndPort.x * slotWidth,
                                                                                slotY + moduleChannelGndPort.y * slotHeight,
                                                                                slotX + moduleChannelGndPort.x * slotWidth,
                                                                                targetGndY,
                                                                                targetGndX,
                                                                                targetGndY,
                                                                            ]}
                                                                             stroke="#212121"
                                                                            strokeWidth={1}
                                                                            lineCap="round"
                                                                            lineJoin="round"
                                                                            listening={false}
                                                                        />
                                                                    )}
                                                                    <Rect
                                                                        name="module-device-slot"
                                                                        collisionOccupied={Boolean(hasDevice)}
                                                                        x={slotRenderX}
                                                                        y={slotRenderY}
                                                                        width={visualSlotWidth}
                                                                        height={visualSlotHeight}
                                                                        cornerRadius={6}
                                                                        fill={hasDevice ? TRANSPARENT_FILL : EMPTY_SLOT_FILL}
                                                                        stroke={hasDevice ? TRANSPARENT_FILL : EMPTY_SLOT_STROKE}
                                                                        strokeWidth={1.2}
                                                                    />
                                                                    {!hasDevice && showEmptySlots && supportsOwnChannelLine && (
                                                                        <>
                                                                            <Text
                                                                                x={slotRenderX + visualSlotWidth - 13}
                                                                                y={slotRenderY + 2}
                                                                                width={10}
                                                                                height={10}
                                                                                text={String(channelIndex + 1)}
                                                                                fontSize={7}
                                                                                fill="#7b8494"
                                                                                align="right"
                                                                                listening={false}
                                                                            />
                                                                            <Circle
                                                                                x={slotRenderX + visualSlotWidth / 2}
                                                                                y={slotRenderY + visualSlotHeight / 2}
                                                                                radius={12}
                                                                                fill={ADD_ACTION_FILL}
                                                                                onClick={(e) => {
                                                                                    const pos = e.target.getAbsolutePosition();
                                                                                    setIo4ChannelMenuPos({ x: pos.x, y: pos.y, slotIndex, channelIndex });
                                                                                }}
                                                                                onTap={(e) => {
                                                                                    const pos = e.target.getAbsolutePosition();
                                                                                    setIo4ChannelMenuPos({ x: pos.x, y: pos.y, slotIndex, channelIndex });
                                                                                }}
                                                                            />
                                                                            <Text
                                                                                x={slotRenderX + visualSlotWidth / 2}
                                                                                y={slotRenderY + visualSlotHeight / 2}
                                                                                text="+"
                                                                                fontSize={18}
                                                                                fill={INFO_BLOCK_FILL}
                                                                                offsetX={5}
                                                                                offsetY={8}
                                                                                listening={false}
                                                                            />
                                                                        </>
                                                                    )}
                                                                    {slotDeviceType === 'pressure-sensor' && (
                                                                        <>
                                                                            <Rect
                                                                                x={slotRenderX}
                                                                                y={slotRenderY - (INFO_BLOCK_HEIGHT + 4)}
                                                                                width={visualSlotWidth}
                                                                                height={INFO_BLOCK_HEIGHT}
                                                                                cornerRadius={1}
                                                                                fill={INFO_BLOCK_FILL}
                                                                                stroke={INFO_BLOCK_STROKE}
                                                                                strokeWidth={INFO_BLOCK_STROKE_WIDTH}
                                                                            />
                                                                            <EditableInfoTitle
                                                                                x={slotRenderX + 3}
                                                                                y={slotRenderY - (INFO_BLOCK_HEIGHT + 4)}
                                                                                width={Math.max(30, visualSlotWidth - 6)}
                                                                                height={INFO_BLOCK_HEIGHT}
                                                                                text={pressureInfoTitle}
                                                                                fontSize={4}
                                                                                fill={INFO_BLOCK_TEXT_COLOR}
                                                                                align="center"
                                                                                verticalAlign="middle" device={slotDevice} title={pressureInfoTitle} />
                                                                        </>
                                                                    )}
                                                                    {isNtcLikeChannelSensor && (
                                                                        <>
                                                                            <Rect
                                                                                x={slotRenderX}
                                                                                y={slotRenderY - (INFO_BLOCK_HEIGHT + 4)}
                                                                                width={visualSlotWidth}
                                                                                height={INFO_BLOCK_HEIGHT}
                                                                                cornerRadius={1}
                                                                                fill={INFO_BLOCK_FILL}
                                                                                stroke={INFO_BLOCK_STROKE}
                                                                                strokeWidth={INFO_BLOCK_STROKE_WIDTH}
                                                                            />
                                                                            <EditableInfoTitle x={slotRenderX + 3}
                                                                                y={slotRenderY - (INFO_BLOCK_HEIGHT + 4)}
                                                                                width={Math.max(30, visualSlotWidth - 6)}
                                                                                height={INFO_BLOCK_HEIGHT}
                                                                                text={ntcInfoTitle}
                                                                                fontSize={4}
                                                                                fill={INFO_BLOCK_TEXT_COLOR}
                                                                                align="center"
                                                                                verticalAlign="middle" device={slotDevice} title={ntcInfoTitle} />
                                                                        </>
                                                                    )}
                                                                    {slotDeviceType === '010pump' && (
                                                                        <>
                                                                            <Rect
                                                                                x={slotRenderX}
                                                                                y={slotRenderY - (INFO_BLOCK_HEIGHT + 4)}
                                                                                width={visualSlotWidth}
                                                                                height={INFO_BLOCK_HEIGHT}
                                                                                cornerRadius={1}
                                                                                fill={INFO_BLOCK_FILL}
                                                                                stroke={INFO_BLOCK_STROKE}
                                                                                strokeWidth={INFO_BLOCK_STROKE_WIDTH}
                                                                            />
                                                                            <EditableInfoTitle x={slotRenderX + 3}
                                                                                y={slotRenderY - (INFO_BLOCK_HEIGHT + 4)}
                                                                                width={Math.max(30, visualSlotWidth - 6)}
                                                                                height={INFO_BLOCK_HEIGHT}
                                                                                text={pump010InfoTitle}
                                                                                fontSize={4}
                                                                                fill={INFO_BLOCK_TEXT_COLOR}
                                                                                align="center"
                                                                                verticalAlign="middle" device={slotDevice} title={pump010InfoTitle} />
                                                                        </>
                                                                    )}
                                                                     {slotDeviceType === '010servo' && (
                                                                         <>
                                                                             <Rect
                                                                                x={slotRenderX}
                                                                                y={slotRenderY - (INFO_BLOCK_HEIGHT + 4)}
                                                                                width={visualSlotWidth}
                                                                                height={INFO_BLOCK_HEIGHT}
                                                                                cornerRadius={1}
                                                                                fill={INFO_BLOCK_FILL}
                                                                                stroke={INFO_BLOCK_STROKE}
                                                                                strokeWidth={INFO_BLOCK_STROKE_WIDTH}
                                                                            />
                                                                            <EditableInfoTitle x={slotRenderX + 3}
                                                                                y={slotRenderY - (INFO_BLOCK_HEIGHT + 4)}
                                                                                width={Math.max(30, visualSlotWidth - 6)}
                                                                                height={INFO_BLOCK_HEIGHT}
                                                                                text={servo010InfoTitle}
                                                                                fontSize={4}
                                                                                fill={INFO_BLOCK_TEXT_COLOR}
                                                                                align="center"
                                                                                verticalAlign="middle" device={slotDevice} title={servo010InfoTitle} />
                                                                         </>
                                                                     )}
                                                                     {showDiInfoBlock && (
                                                                         <>
                                                                             <Rect
                                                                                 x={slotRenderX}
                                                                                 y={slotRenderY - (INFO_BLOCK_HEIGHT + 4)}
                                                                                 width={visualSlotWidth}
                                                                                 height={INFO_BLOCK_HEIGHT}
                                                                                 cornerRadius={1}
                                                                                 fill={INFO_BLOCK_FILL}
                                                                                 stroke={INFO_BLOCK_STROKE}
                                                                                 strokeWidth={INFO_BLOCK_STROKE_WIDTH}
                                                                             />
                                                                             <EditableInfoTitle x={slotRenderX + 3}
                                                                                 y={slotRenderY - (INFO_BLOCK_HEIGHT + 4)}
                                                                                 width={Math.max(30, visualSlotWidth - 6)}
                                                                                 height={INFO_BLOCK_HEIGHT}
                                                                                 text={diInfoTitle}
                                                                                 fontSize={4}
                                                                                 fill={INFO_BLOCK_TEXT_COLOR}
                                                                                 align="center"
                                                                                 verticalAlign="middle" device={slotDevice} title={diInfoTitle} />
                                                                         </>
                                                                     )}
                                                                    {showPorts && hasDevice && slotDevicePorts.map((port, pIdx) => (
                                                                        <Circle
                                                                            key={`io4-channel-port-${slotIndex}-${channelIndex}-${port.name}-${pIdx}`}
                                                                            x={renderX + port.x * renderSize.width}
                                                                            y={renderY + port.y * renderSize.height}
                                                                            radius={2.5}
                                                                            fill="red"
                                                                            listening={false}


                                                                        />
                                                                    ))}
                                                                    {hasDevice && isChannelHovered && (
                                                                        <SlotDeleteButton compact x={slotRenderX + visualSlotWidth - 2.5} y={slotRenderY + 1.5} onRemove={(event) => {
                                                                            event.cancelBubble = true;
                                                                            removeIo4ChannelDeviceAtSlot(slotIndex, channelIndex);
                                                                        }} />
                                                                    )}
                                                                </Group>
                                                            );
                                                        })}
                                                        {supportsOwnDi6Lines && (() => {
                                                            const leftLineDevices = extDiAssignedDevices.slice(0, 3);
                                                            const rightLineDevices = extDiAssignedDevices.slice(3, 6);
                                                            const di6SlotWidth = 9 * indentSize;
                                                            const di6SlotHeight = 3 * indentSize;
                                                            const di6SlotGap = 5 * indentSize;
                                                            const leftLineX = slotX - di6SlotWidth - 3 * indentSize;
                                                            const rightLineX = slotX + slotWidth + 3 * indentSize;
                                                            const bottomSlotY = slotY - di6SlotHeight;
                                                            const topSlotY = bottomSlotY - 2 * (di6SlotHeight + di6SlotGap);
                                                            const getDi6SlotY = (lineIndex) => topSlotY + lineIndex * (di6SlotHeight + di6SlotGap);
                                                            const renderDi6Line = (lineDevices, lineX, channelPortStart, lineKey) => Array.from({ length: 3 }).map((_, localIndex) => {
                                                                const visualIndex = lineKey === 'left' ? 2 - localIndex : localIndex;
                                                                const deviceInSlot = lineDevices[localIndex] || null;
                                                                const hasDevice = !!deviceInSlot;
                                                                if (!hasDevice && !showEmptySlots) return null;
                                                                const slotDeviceType = canonicalDeviceType(deviceInSlot?.type);
                                                                const slotVisualDevice = deviceInSlot
                                                                    ? {
                                                                        ...deviceInSlot,
                                                                        port_side: lineKey === 'left' ? 'right' : deviceInSlot?.port_side,
                                                                    }
                                                                    : null;
                                                                const slotDeviceKey = slotVisualDevice ? getWirelessDeviceImageKey(slotVisualDevice) : null;
                                                                const slotDeviceImage = slotDeviceKey ? wirelessImages[slotDeviceKey] : null;
                                                                const slotDevicePorts = slotDeviceKey ? (wirelessPortsByType[slotDeviceKey] || []) : [];
                                                                const slotDeviceInPort = slotDeviceType === 'pressure-sensor'
                                                                    ? ((getPortsByClassToken(slotDevicePorts, 'CHANNEL') || [])[0]
                                                                        || slotDevicePorts.find((port) => port.name === '4-20-IN-IN')
                                                                        || slotDevicePorts.find((port) => port.name === '4-20-IN-V+')
                                                                        || null)
                                                                    : slotDeviceType === '010servo'
                                                                         ? getPortByNameOrClassToken(slotDevicePorts, 'CHANNEL-IN')
                                                                         : getDiInputPort(slotDevicePorts);
                                                                const modulePortName = `DI-IN-${channelPortStart + localIndex}`;
                                                                const channelIndex = channelPortStart + localIndex - 1;
                                                                const fromPort = extPorts.find((port) => port.name === modulePortName);
                                                                const slotYLine = getDi6SlotY(visualIndex);
                                                                const imageBoxWidth = isLeakDiDeviceType(slotDeviceType) ? di6SlotWidth * LEAK_DI_DEVICE_IMAGE_SCALE : di6SlotWidth;
                                                                const imageBoxHeight = isLeakDiDeviceType(slotDeviceType) ? di6SlotHeight * LEAK_DI_DEVICE_IMAGE_SCALE : di6SlotHeight;
                                                                const renderSize = (hasDevice && slotDeviceImage)
                                                                    ? getContainSize(slotDeviceImage, imageBoxWidth, imageBoxHeight)
                                                                    : { width: di6SlotWidth, height: di6SlotHeight };
                                                                const renderX = lineX + (di6SlotWidth - renderSize.width) / 2;
                                                                const renderY = slotYLine + (di6SlotHeight - renderSize.height) / 2;
                                                                 const targetX = slotDeviceInPort ? (renderX + slotDeviceInPort.x * renderSize.width) : lineX;
                                                                 const targetY = slotDeviceInPort ? (renderY + slotDeviceInPort.y * renderSize.height) : (slotYLine + di6SlotHeight / 2);
                                                                 const diInfoTitle = hasDevice ? getDiDeviceTitle(scheme, deviceInSlot) : '';
                                                                 const showDiInfoBlock = hasDevice && shouldShowDiDeviceInfoBlock(deviceInSlot);
                                                                 return (
                                                                    <Group key={`di6-line-${lineKey}-${slotIndex}-${localIndex}`}>
                                                                        {fromPort && (
                                                                            <Line
                                                                                points={[
                                                                                    slotX + fromPort.x * slotWidth,
                                                                                    slotY + fromPort.y * slotHeight,
                                                                                    slotX + fromPort.x * slotWidth,
                                                                                    targetY,
                                                                                    targetX,
                                                                                    targetY,
                                                                                ]}
                                                                                stroke={slotDeviceType === 'pressure-sensor' ? '#f57c00' : '#1565c0'}
                                                                                strokeWidth={1}
                                                                                lineCap="round"
                                                                                lineJoin="round"
                                                                                listening={false}
                                                                            />
                                                                        )}
                                                                        <Rect
                                                                            name="module-device-slot"
                                                                            collisionOccupied={Boolean(hasDevice)}
                                                                            x={lineX}
                                                                            y={slotYLine}
                                                                            width={di6SlotWidth}
                                                                            height={di6SlotHeight}
                                                                            cornerRadius={6}
                                                                            fill={hasDevice ? TRANSPARENT_FILL : EMPTY_SLOT_FILL}
                                                                            stroke={hasDevice ? TRANSPARENT_FILL : EMPTY_SLOT_STROKE}
                                                                            strokeWidth={1.2}
                                                                        />
                                                                        {!hasDevice && (
                                                                            <EditableInfoTitle x={lineX + di6SlotWidth - 13}
                                                                                y={slotYLine + 2}
                                                                                width={10}
                                                                                height={10}
                                                                                text={String(channelPortStart + localIndex)}
                                                                                fontSize={7}
                                                                                fill="#7b8494"
                                                                                align="right"
                                                                                listening={false}
                                                                            />
                                                                        )}
                                                                        {!hasDevice && showEmptySlots && (
                                                                            <>
                                                                                <Circle
                                                                                    x={lineX + di6SlotWidth / 2}
                                                                                    y={slotYLine + di6SlotHeight / 2}
                                                                                    radius={12}
                                                                                    fill={ADD_ACTION_FILL}
                                                                                    onClick={(event) => {
                                                                                        event.cancelBubble = true;
                                                                                        const pos = event.target.getAbsolutePosition();
                                                                                        setDi6ChannelMenuPos({ x: pos.x, y: pos.y, slotIndex, channelIndex });
                                                                                    }}
                                                                                    onTap={(event) => {
                                                                                        event.cancelBubble = true;
                                                                                        const pos = event.target.getAbsolutePosition();
                                                                                        setDi6ChannelMenuPos({ x: pos.x, y: pos.y, slotIndex, channelIndex });
                                                                                    }}
                                                                                />
                                                                                <Text
                                                                                    x={lineX + di6SlotWidth / 2}
                                                                                    y={slotYLine + di6SlotHeight / 2}
                                                                                    text="+"
                                                                                    fontSize={18}
                                                                                    fill={INFO_BLOCK_FILL}
                                                                                    offsetX={5}
                                                                                    offsetY={8}
                                                                                    listening={false}
                                                                                />
                                                                            </>
                                                                        )}
                                                                        {hasDevice && slotDeviceImage && (
                                                                            <Image image={slotDeviceImage} x={renderX} y={renderY} width={renderSize.width} height={renderSize.height} listening={false} />
                                                                        )}
                                                                         {showDiInfoBlock && (
                                                                             <>
                                                                                 <Rect x={lineX} y={slotYLine - (INFO_BLOCK_HEIGHT + 4)} width={di6SlotWidth} height={INFO_BLOCK_HEIGHT} cornerRadius={1} fill={INFO_BLOCK_FILL} stroke={INFO_BLOCK_STROKE} strokeWidth={INFO_BLOCK_STROKE_WIDTH} />
                                                                                 <EditableInfoTitle x={lineX + 3} y={slotYLine - (INFO_BLOCK_HEIGHT + 4)} width={Math.max(30, di6SlotWidth - 6)} height={INFO_BLOCK_HEIGHT} text={diInfoTitle} fontSize={4} fill={INFO_BLOCK_TEXT_COLOR} align="center" verticalAlign="middle" device={deviceInSlot} title={diInfoTitle} />
                                                                             </>
                                                                         )}
                                                                        {hasDevice && isHovered && (
                                                                            <SlotDeleteButton compact x={lineX + di6SlotWidth - 2.5} y={slotYLine + 1.5} onRemove={(event) => {
                                                                                event.cancelBubble = true;
                                                                                removeDi6ChannelDeviceAtSlot(slotIndex, channelIndex);
                                                                            }} />
                                                                        )}
                                                                    </Group>
                                                                );
                                                            });
                                                            return (
                                                                <>
                                                                    {renderDi6Line(leftLineDevices, leftLineX, 1, 'left')}
                                                                    {renderDi6Line(rightLineDevices, rightLineX, 4, 'right')}
                                                                </>
                                                            );
                                                        })()}
                                                        {isBl2 && (bl2Boiler || showEmptySlots) && (
                                                            <>
                                                                {bl2Boiler && (
                                                                    <>
                                                                        <Rect
                                                                            x={bl2BusSlotX}
                                                                            y={bl2BusSlotY - (INFO_BLOCK_HEIGHT + 14)}
                                                                            width={bl2BoilerWidth}
                                                                            height={INFO_BLOCK_HEIGHT}
                                                                            cornerRadius={1}
                                                                            fill={INFO_BLOCK_FILL}
                                                                            stroke={INFO_BLOCK_STROKE}
                                                                            strokeWidth={INFO_BLOCK_STROKE_WIDTH}
                                                                        />
                                                                        <EditableInfoTitle x={bl2BusSlotX + 4}
                                                                            y={bl2BusSlotY - (INFO_BLOCK_HEIGHT + 14)}
                                                                            text={bl2BoilerTitle}
                                                                            fontSize={4}
                                                                            fill={INFO_BLOCK_TEXT_COLOR}
                                                                            width={bl2BoilerWidth - 8}
                                                                            height={INFO_BLOCK_HEIGHT}
                                                                            align="center"
                                                                            verticalAlign="middle" device={bl2Boiler} title={bl2BoilerTitle} />
                                                                    </>
                                                                )}
                                                                <Rect
                                                                    name="module-device-slot"
                                                                    collisionOccupied={Boolean(bl2Boiler)}
                                                                    x={bl2BusSlotX}
                                                                    y={bl2BusSlotY}
                                                                    width={bl2BoilerWidth}
                                                                    height={bl2BoilerHeight}
                                                                    cornerRadius={10}
                                                                    fill={bl2Boiler ? TRANSPARENT_FILL : EMPTY_SLOT_FILL}
                                                                    stroke={bl2Boiler ? TRANSPARENT_FILL : EMPTY_SLOT_STROKE}
                                                                    strokeWidth={1.5}
                                                                />
                                                                 {!bl2Boiler && showEmptySlots && (
                                                                     <>
                                                                         <Circle
                                                                             x={bl2BusSlotX + bl2BoilerWidth / 2}
                                                                             y={bl2BusSlotY + bl2BoilerHeight / 2}
                                                                             radius={16}
                                                                             fill={ADD_ACTION_FILL}
                                                                             onClick={(e) => {
                                                                                 const pos = e.target.getAbsolutePosition();
                                                                                 setBusMenuPos({ x: pos.x, y: pos.y, moduleIndex: slotIndex });
                                                                             }}
                                                                             onTap={(e) => {
                                                                                 const pos = e.target.getAbsolutePosition();
                                                                                 setBusMenuPos({ x: pos.x, y: pos.y, moduleIndex: slotIndex });
                                                                             }}
                                                                         />
                                                                         <EditableInfoTitle x={bl2BusSlotX + bl2BoilerWidth / 2}
                                                                             y={bl2BusSlotY + bl2BoilerHeight / 2}
                                                                             text="+"
                                                                             fontSize={22}
                                                                             fill={INFO_BLOCK_FILL}
                                                                             offsetX={6.5}
                                                                             offsetY={9}
                                                                             listening={false}
                                                                         />
                                                                     </>
                                                                 )}
                                                                  {bl2Boiler && (() => {
                                                                    const links = [
                                                                        { controllerPort: 'BUS-A', boilerPort: 'BUS-A', offset: 1 * indentSize, color: '#2e7d32' },
                                                                        { controllerPort: 'BUS-B', boilerPort: 'BUS-B', offset: 2 * indentSize, color: '#2e7d32' },
                                                                    ];
                                                                    const fallbackBusPorts = bl2BoilerPorts.filter((port) => port.name === 'BUS' || port.name.startsWith('BUS'));
                                                                    return links.map((link) => {
                                                                        const fromPort = extPorts.find((port) => port.name === link.controllerPort);
                                                                        let toPort = bl2BoilerPorts.find((port) => port.name === link.boilerPort);
                                                                        if (!toPort) {
                                                                            toPort = link.boilerPort === 'BUS-A'
                                                                                ? (fallbackBusPorts[0] || null)
                                                                                : (fallbackBusPorts[1] || fallbackBusPorts[0] || null);
                                                                        }
                                                                        if (!fromPort || !toPort) return null;
                                                                         const fromX = slotX + fromPort.x * slotWidth;
                                                                         const fromY = slotY + fromPort.y * slotHeight;
                                                                          const toX = bl2BusSlotX + toPort.x * bl2BoilerWidth;
                                                                          const toY = bl2BusSlotY + toPort.y * bl2BoilerHeight;
                                                                          if (hasBl2RinnaiAdapter) {
                                                                             const isLeftBoilerLine = link.boilerPort === 'BUS-B';
                                                                             const adapterOutPort = bl2RinnaiAdapterPorts.find((port) => port.name === `BUS-OUT-${isLeftBoilerLine ? 'A' : 'B'}`);
                                                                             const adapterInPort = bl2RinnaiAdapterPorts.find((port) => port.name === `BUS-IN-${link.controllerPort.slice(-1)}`);
                                                                             if (!adapterOutPort || !adapterInPort) return null;
                                                                             const adapterOutX = bl2RinnaiAdapterX + adapterOutPort.x * bl2RinnaiAdapterWidth;
                                                                             const adapterOutY = bl2RinnaiAdapterY + adapterOutPort.y * bl2RinnaiAdapterHeight;
                                                                             const adapterInX = bl2RinnaiAdapterX + adapterInPort.x * bl2RinnaiAdapterWidth;
                                                                             const adapterInY = bl2RinnaiAdapterY + adapterInPort.y * bl2RinnaiAdapterHeight;
                                                                             const boilerBendY = bl2BusSlotY + bl2BoilerHeight + (isLeftBoilerLine ? 1 : 0.5) * indentSize;
                                                                             const boilerBendX = bl2BusSlotX + bl2BoilerWidth + (isLeftBoilerLine ? 1 : 0.5) * indentSize;
                                                                             return (
                                                                                 <Group key={`bl2-rinnai-bus-link-${slotIndex}-${link.controllerPort}`}>
                                                                                     <Line points={[toX, toY, toX, boilerBendY, boilerBendX, boilerBendY, boilerBendX, adapterOutY, adapterOutX, adapterOutY]} stroke={link.color} strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                                                     <Line points={[adapterInX, adapterInY, adapterInX - indentSize, adapterInY, fromX, adapterInY, fromX, fromY]} stroke={link.color} strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
                                                                                 </Group>
                                                                             );
                                                                         }
                                                                         return (
                                                                            <Line
                                                                                key={`bl2-bus-link-${slotIndex}-${link.controllerPort}-${link.boilerPort}`}
                                                                                points={[toX, toY, toX, fromY]}
                                                                                stroke={link.color}
                                                                                strokeWidth={1}
                                                                                lineCap="round"
                                                                                lineJoin="round"
                                                                                listening={false}
                                                                            />
                                                                        );
                                                                      });
                                                                  })()}
                                                                  {!bl2Boiler && showEmptySlots && (() => {
                                                                      return ['BUS-A', 'BUS-B'].map((portName) => {
                                                                          const fromPort = extPorts.find((port) => port.name === portName);
                                                                          if (!fromPort) return null;
                                                                          const fromX = slotX + fromPort.x * slotWidth;
                                                                          const fromY = slotY + fromPort.y * slotHeight;
                                                                          const toY = bl2BusSlotY + bl2BoilerHeight;
                                                                          return (
                                                                              <Line
                                                                                  key={`bl2-empty-bus-link-${slotIndex}-${portName}`}
                                                                                  points={[fromX, fromY, fromX, toY]}
                                                                                  stroke="#2e7d32"
                                                                                  strokeWidth={1}
                                                                                  lineCap="round"
                                                                                  lineJoin="round"
                                                                                  listening={false}
                                                                              />
                                                                          );
                                                                      });
                                                                  })()}
                                                                  {bl2Boiler && bl2BoilerImage && (
                                                                      <Image
                                                                          image={bl2BoilerImage}
                                                                          x={bl2BusSlotX}
                                                                          y={bl2BusSlotY}
                                                                          listening={false}
                                                                      />
                                                                  )}
                                                                  {hasBl2RinnaiAdapter && bl2RinnaiAdapterImage && (
                                                                      <Image image={bl2RinnaiAdapterImage} x={bl2RinnaiAdapterX} y={bl2RinnaiAdapterY} width={bl2RinnaiAdapterWidth} height={bl2RinnaiAdapterHeight} listening={false} />
                                                                  )}
                                                                  {bl2Boiler && isHovered && (
                                                                     <SlotDeleteButton compact x={bl2BusSlotX + bl2BoilerWidth - 2.5} y={bl2BusSlotY + 1.5} onRemove={() => removeBusDeviceAtLine({ moduleIndex: slotIndex })} />
                                                                 )}
                                                             {showPorts && bl2Boiler && bl2BoilerPorts.map((port, portIndex) => (
                                                                <Circle
                                                                    key={`bl2-bus-port-${slotIndex}-${port.name}-${portIndex}`}
                                                                    x={bl2BusSlotX + port.x * bl2BoilerWidth}
                                                                    y={bl2BusSlotY + port.y * bl2BoilerHeight}
                                                                    radius={2.5}
                                                                    fill="red"


                                                                />
                                                            ))}
                                                            </>
                                                        )}
                                                        {showLineFrames && supportsOwnOneWire && extOneWireSlotsCount > 0 && (() => {
                                                            const oneWireRects = Array.from({ length: extOneWireSlotsCount }).map((_, extOneWireIndex) => {
                                                                const owDevice = extOneWireDevices[extOneWireIndex] || null;
                                                                const owSize = getExtOneWireSlotSize(owDevice);
                                                                const owPos = getExtOneWireSlotPosition(extOneWireIndex);
                                                                return {
                                                                    left: owPos.x,
                                                                    top: owPos.y,
                                                                    right: owPos.x + owSize.width,
                                                                    bottom: owPos.y + owSize.height,
                                                                };
                                                            });
                                                            const minX = Math.min(...oneWireRects.map((r) => r.left));
                                                            const minY = Math.min(...oneWireRects.map((r) => r.top));
                                                            const maxX = Math.max(...oneWireRects.map((r) => r.right));
                                                            const maxY = Math.max(...oneWireRects.map((r) => r.bottom));
                                                            return (
                                                                <Rect
                                                                    x={minX - 8}
                                                                    y={minY - 8}
                                                                    width={maxX - minX + 16}
                                                                    height={maxY - minY + 16}
                                                                    cornerRadius={8}
                                                                    fill="rgba(155,122,79,0.2)"
                                                                    stroke="#9b7a4f"
                                                                    strokeWidth={1}
                                                                    dash={[8, 4]}
                                                                    opacity={0.68}
                                                                    listening={false}
                                                                />
                                                            );
                                                        })()}
                                                        {supportsOwnOneWire && Array.from({ length: extOneWireSlotsCount }).map((_, extOneWireIndex) => {
                                                            const owDevice = extOneWireDevices[extOneWireIndex] || null;
                                                            const owType = canonicalDeviceType(owDevice?.type);
                                                            const isOwModuleWithNativeSize = owType === 'ntc-1-wire' || owType === 'rdt2';
                                                            const owImageKey = owDevice ? getWirelessDeviceImageKey(owDevice) : null;
                                                            const owImage = owImageKey ? wirelessImages[owImageKey] : null;
                                                            const owSize = getExtOneWireSlotSize(owDevice);
                                                            const owWidth = owSize.width;
                                                            const owHeight = owSize.height;
                                                            const owPos = getExtOneWireSlotPosition(extOneWireIndex);
                                                            const owX = owPos.x;
                                                            const owY = owPos.y;
                                                            const extOwKey = getExtOneWireOffsetKey(device, slotIndex, owDevice, extOneWireIndex);
                                                            const isOwHovered = hoveredExtOneWireKey === extOwKey;
                                                            const owPorts = getExtOwPorts(owDevice);
                                                            const owPortMap = getExtOwPortMap(
                                                                owDevice,
                                                                owPorts,
                                                                getOneWireDirectionForDevice(owDevice, 'target'),
                                                            );
                                                            return (
                                                                <Group
                                                                    key={`ext-ow-${extOwKey}`}
                                                                    draggable
                                                                    onMouseDown={(event) => {
                                                                        event.cancelBubble = true;
                                                                    }}
                                                                    onTouchStart={(event) => {
                                                                        event.cancelBubble = true;
                                                                    }}
                                                                    onMouseEnter={() => setHoveredExtOneWireKey(extOwKey)}
                                                                    onMouseLeave={() => setHoveredExtOneWireKey(null)}
                                                                    onDragStart={(event) => {
                                                                        event.cancelBubble = true;
                                                                        extOneWireDragStartOffsetsRef.current[extOwKey] = extOneWireOffsets[extOwKey] || { x: 0, y: 0 };
                                                                        setInvalidExtOneWireDragMap((prev) => ({ ...prev, [extOwKey]: false }));
                                                                    }}
                                                                    onDragMove={(event) => {
                                                                        event.cancelBubble = true;
                                                                        const position = event.target.position();
                                                                        const startOffset = extOneWireDragStartOffsetsRef.current[extOwKey] || { x: 0, y: 0 };
                                                                        const draftOffsets = {
                                                                            ...extOneWireOffsets,
                                                                            [extOwKey]: {
                                                                                x: startOffset.x + position.x,
                                                                                y: startOffset.y + position.y,
                                                                            },
                                                                        };
                                                                        setExtOneWireOffsets((prev) => ({
                                                                            ...prev,
                                                                            [extOwKey]: draftOffsets[extOwKey],
                                                                        }));
                                                                        const collisionData = getAllOccupiedRects(
                                                                            controllerImage,
                                                                            scheme,
                                                                            showEmptySlots,
                                                                            memoWirelessOffsetsByLine,
                                                                            oneWireSlotOffsets,
                                                                            extSlotOffsets,
                                                                            diSlotOffsets,
                                                                            useInitialOneWireBalance ? memoBalancedOneWire.extDevicesByModuleIndex : null,
                                                                        );
                                                                        const draftPos = getExtOneWireSlotPositionByOffsets(extOneWireIndex, draftOffsets);
                                                                        const targetRect = {
                                                                            left: draftPos.x,
                                                                            top: draftPos.y,
                                                                            right: draftPos.x + owWidth,
                                                                            bottom: draftPos.y + owHeight,
                                                                        };
                                                                        const siblingRects = extOneWireDevices
                                                                            .map((item, idx) => {
                                                                                const pos = getExtOneWireSlotPositionByOffsets(idx, draftOffsets);
                                                                                const size = getExtOneWireSlotSize(item);
                                                                                return {
                                                                                    id: getExtOneWireOffsetKey(device, slotIndex, item, idx),
                                                                                    left: pos.x,
                                                                                    top: pos.y,
                                                                                    right: pos.x + size.width,
                                                                                    bottom: pos.y + size.height,
                                                                                };
                                                                            });
                                                                        const parentModuleId = collisionId;
                                                                        const parentBodyRect = {
                                                                            left: slotX,
                                                                            top: slotY,
                                                                            right: slotX + slotWidth,
                                                                            bottom: slotY + slotHeight,
                                                                        };
                                                                        const parentCollisionRects = getModuleObjectCollisionRects(
                                                                            parentModuleId,
                                                                            parentBodyRect,
                                                                            parentBodyRect,
                                                                            showEmptySlots,
                                                                            extOwKey,
                                                                        );
                                                                        const collides = Boolean(collisionData) && (
                                                                            rectsOverlap(targetRect, collisionData.controllerRect)
                                                                            || collisionData.rects.some((rect) => rect.id !== parentModuleId && rectsOverlap(targetRect, rect))
                                                                            || parentCollisionRects.some((rect) => rectsOverlap(targetRect, rect))
                                                                            || siblingRects.some((rect) => rect.id !== extOwKey && rectsOverlap(targetRect, rect))
                                                                        );
                                                                        setInvalidExtOneWireDragMap((prev) => ({ ...prev, [extOwKey]: collides }));
                                                                        event.target.position({ x: 0, y: 0 });
                                                                    }}
                                                                    onDragEnd={(event) => {
                                                                        event.cancelBubble = true;
                                                                        const startOffset = extOneWireDragStartOffsetsRef.current[extOwKey] || { x: 0, y: 0 };
                                                                        const nextOffset = extOneWireOffsets[extOwKey] || { x: 0, y: 0 };
                                                                        const nextOffsets = { ...extOneWireOffsets, [extOwKey]: nextOffset };
                                                                        const collisionData = getAllOccupiedRects(
                                                                            controllerImage,
                                                                            scheme,
                                                                            showEmptySlots,
                                                                            memoWirelessOffsetsByLine,
                                                                            oneWireSlotOffsets,
                                                                            extSlotOffsets,
                                                                            diSlotOffsets,
                                                                            useInitialOneWireBalance ? memoBalancedOneWire.extDevicesByModuleIndex : null,
                                                                        );
                                                                        const nextPos = getExtOneWireSlotPositionByOffsets(extOneWireIndex, nextOffsets);
                                                                        const targetRect = {
                                                                            left: nextPos.x,
                                                                            top: nextPos.y,
                                                                            right: nextPos.x + owWidth,
                                                                            bottom: nextPos.y + owHeight,
                                                                        };
                                                                        const siblingRects = extOneWireDevices
                                                                            .map((item, idx) => {
                                                                                const pos = getExtOneWireSlotPositionByOffsets(idx, nextOffsets);
                                                                                const size = getExtOneWireSlotSize(item);
                                                                                return {
                                                                                    id: getExtOneWireOffsetKey(device, slotIndex, item, idx),
                                                                                    left: pos.x,
                                                                                    top: pos.y,
                                                                                    right: pos.x + size.width,
                                                                                    bottom: pos.y + size.height,
                                                                                };
                                                                            });
                                                                        const parentModuleId = collisionId;
                                                                        const parentBodyRect = {
                                                                            left: slotX,
                                                                            top: slotY,
                                                                            right: slotX + slotWidth,
                                                                            bottom: slotY + slotHeight,
                                                                        };
                                                                        const parentCollisionRects = getModuleObjectCollisionRects(
                                                                            parentModuleId,
                                                                            parentBodyRect,
                                                                            parentBodyRect,
                                                                            showEmptySlots,
                                                                            extOwKey,
                                                                        );
                                                                        const collides = Boolean(collisionData) && (
                                                                            rectsOverlap(targetRect, collisionData.controllerRect)
                                                                            || collisionData.rects.some((rect) => rect.id !== parentModuleId && rectsOverlap(targetRect, rect))
                                                                            || parentCollisionRects.some((rect) => rectsOverlap(targetRect, rect))
                                                                            || siblingRects.some((rect) => rect.id !== extOwKey && rectsOverlap(targetRect, rect))
                                                                        );
                                                                        if (collides) {
                                                                            setExtOneWireOffsets((prev) => ({ ...prev, [extOwKey]: startOffset }));
                                                                        }
                                                                        setInvalidExtOneWireDragMap((prev) => ({ ...prev, [extOwKey]: false }));
                                                                        delete extOneWireDragStartOffsetsRef.current[extOwKey];
                                                                        event.target.position({ x: 0, y: 0 });
                                                                    }}
                                                                >
                                                                    <Rect
                                                                        name="module-device-slot"
                                                                        collisionOccupied={Boolean(owDevice)}
                                                                        collisionKey={extOwKey}
                                                                        x={owX}
                                                                        y={owY}
                                                                        width={owWidth}
                                                                        height={owHeight}
                                                                        cornerRadius={10}
                                                                        fill={invalidExtOneWireDragMap[extOwKey] ? 'rgba(211, 47, 47, 0.08)' : (owDevice ? TRANSPARENT_FILL : EMPTY_SLOT_FILL)}
                                                                        stroke={invalidExtOneWireDragMap[extOwKey] ? '#d32f2f' : (owDevice ? TRANSPARENT_FILL : EMPTY_SLOT_STROKE)}
                                                                        strokeWidth={1.5}
                                                                    />
                                                                    {owDevice && owImage && (
                                                                        <Image image={owImage} x={owX} y={owY} width={owWidth} height={owHeight} listening={false} />
                                                                    )}
                                                                    {owDevice && isBundledSensorDevice(memoBundledSensorDevices, owDevice) && (
                                                                        <KitBadge x={owX} y={owY + 1} />
                                                                    )}
                                                                    {canonicalDeviceType(owDevice?.type) === 'ntc-1-wire' && (() => {
                                                                        const ntcSlotWidth = 11 * indentSize;
                                                                        const ntcSlotHeight = 7 * indentSize;
                                                                        const ntcSlotGap = 3 * indentSize;
                                                                        const lineX = owX - ntcSlotWidth;
                                                                        const lineTotalHeight = NTC_LINE_SLOTS_COUNT * ntcSlotHeight + (NTC_LINE_SLOTS_COUNT - 1) * ntcSlotGap;
                                                                        const lineY = owY - lineTotalHeight;
                                                                        return Array.from({ length: NTC_LINE_SLOTS_COUNT }).map((_, ntcIndex) => {
                                                                            const sensor = getNtcSensorFromDeviceLine(owDevice, scheme, ntcIndex, 'ntc1_devices');
                                                                            if (!sensor && !showEmptySlots) return null;
                                                                            const ntcSensorKey = getWirelessDeviceImageKey({ ...(sensor || { type: 'ntc-sensor' }), port_side: 'right' });
                                                                            const ntcSensorImage = wirelessImages[ntcSensorKey] || null;
                                                                            const ntcSensorPorts = wirelessPortsByType[ntcSensorKey] || [];
                                                                            const slotVisualWidth = canonicalDeviceType(sensor?.type) === 'wall-ntc-sensor' ? ntcSlotHeight : ntcSlotWidth;
                                                                            const slotX = lineX + ntcSlotWidth - slotVisualWidth;
                                                                            const slotY = lineY + (NTC_LINE_SLOTS_COUNT - 1 - ntcIndex) * (ntcSlotHeight + ntcSlotGap);
                                                                            const ntcHoverKey = `ext:${slotIndex}:${extOneWireIndex}:${ntcIndex}`;
                                                                            const isNtcHovered = hoveredNtcSlotKey === ntcHoverKey;
                                                                            const ntcChannel = getNtcChannelBySlot(ntcIndex, 'ntc1_devices');
                                                                            const sensorTitle = getNtcSensorTitle(scheme, sensor, ntcChannel);
                                                                            const sensorPortA = ntcSensorPorts.find((port) => port.name === 'NTC-A') || ntcSensorPorts.find((port) => String(port?.name || '').startsWith('NTC-')) || null;
                                                                            const sensorPortB = ntcSensorPorts.find((port) => port.name === 'NTC-B') || sensorPortA;
                                                                            const sensorRenderSize = ntcSensorImage
                                                                                ? getContainSize(ntcSensorImage, slotVisualWidth, ntcSlotHeight)
                                                                                : { width: slotVisualWidth, height: ntcSlotHeight };
                                                                            const sensorRenderX = slotX + (slotVisualWidth - sensorRenderSize.width) / 2;
                                                                            const sensorRenderY = slotY + (ntcSlotHeight - sensorRenderSize.height) / 2;
                                                                            const sensorPortAX = sensorPortA ? sensorRenderX + sensorPortA.x * sensorRenderSize.width : slotX + slotVisualWidth;
                                                                            const sensorPortAY = sensorPortA ? sensorRenderY + sensorPortA.y * sensorRenderSize.height : slotY + ntcSlotHeight / 2;
                                                                            const sensorPortBX = sensorPortB ? sensorRenderX + sensorPortB.x * sensorRenderSize.width : slotX + slotVisualWidth;
                                                                            const sensorPortBY = sensorPortB ? sensorRenderY + sensorPortB.y * sensorRenderSize.height : slotY + ntcSlotHeight / 2;
                                                                            const modulePortA = owPorts.find((port) => port.name === `NTC-${ntcChannel}-A`);
                                                                            const modulePortB = owPorts.find((port) => port.name === `NTC-${ntcChannel}-B`);
                                                                            return (
                                                                                <Group
                                                                                    key={`ext-ntc1-slot-${slotIndex}-${extOneWireIndex}-${ntcIndex}`}
                                                                                    onMouseEnter={() => setHoveredNtcSlotKey(ntcHoverKey)}
                                                                                    onMouseLeave={() => setHoveredNtcSlotKey((prev) => (prev === ntcHoverKey ? null : prev))}
                                                                                >
                                                                                    {sensor && ntcSensorImage && (
                                                                                        <Image image={ntcSensorImage} x={sensorRenderX} y={sensorRenderY} width={sensorRenderSize.width} height={sensorRenderSize.height} listening={false} />
                                                                                    )}
                                                                                    {sensor && modulePortA && (
                                                                                        <Line
                                                                                            points={[
                                                                                                sensorPortAX,
                                                                                                sensorPortAY,
                                                                                                owX + modulePortA.x * owWidth,
                                                                                                sensorPortAY,
                                                                                                owX + modulePortA.x * owWidth,
                                                                                                owY + modulePortA.y * owHeight,
                                                                                            ]}
                                                                                            stroke="#212121"
                                                                                            strokeWidth={1}
                                                                                            lineCap="round"
                                                                                            lineJoin="round"
                                                                                            listening={false}
                                                                                        />
                                                                                    )}
                                                                                    {sensor && modulePortB && (
                                                                                        <Line
                                                                                            points={[
                                                                                                sensorPortBX,
                                                                                                sensorPortBY,
                                                                                                owX + modulePortB.x * owWidth,
                                                                                                sensorPortBY,
                                                                                                owX + modulePortB.x * owWidth,
                                                                                                owY + modulePortB.y * owHeight,
                                                                                            ]}
                                                                                            stroke="#464EE3"
                                                                                            strokeWidth={1}
                                                                                            lineCap="round"
                                                                                            lineJoin="round"
                                                                                            listening={false}
                                                                                        />
                                                                                    )}
                                                                                    <Rect
                                                                                        name="module-device-slot"
                                                                                        collisionOccupied={Boolean(sensor)}
                                                                                        x={slotX}
                                                                                        y={slotY}
                                                                                        width={slotVisualWidth}
                                                                                        height={ntcSlotHeight}
                                                                                        cornerRadius={6}
                                                                                        fill={sensor ? TRANSPARENT_FILL : EMPTY_SLOT_FILL}
                                                                                        stroke={sensor ? TRANSPARENT_FILL : EMPTY_SLOT_STROKE}
                                                                                        strokeWidth={1.2}
                                                                                    />
                                                                                    {showPorts && sensor && ntcSensorPorts.map((port) => (
                                                                                        <Circle
                                                                                            key={`ext-ntc1-port-${slotIndex}-${extOneWireIndex}-${ntcIndex}-${port.name}`}
                                                                                            x={sensorRenderX + port.x * sensorRenderSize.width}
                                                                                            y={sensorRenderY + port.y * sensorRenderSize.height}
                                                                                            radius={2.5}
                                                                                            fill="red"
                                                                                            listening={false}


                                                                                        />
                                                                                    ))}
                                                                                    {sensor && (
                                                                                        <>
                                                                                            <Rect x={slotX} y={slotY - (INFO_BLOCK_HEIGHT + 4)} width={slotVisualWidth} height={INFO_BLOCK_HEIGHT} cornerRadius={1} fill={INFO_BLOCK_FILL} stroke={INFO_BLOCK_STROKE} strokeWidth={INFO_BLOCK_STROKE_WIDTH} />
                                                                                            <EditableInfoTitle x={slotX + 3} y={slotY - (INFO_BLOCK_HEIGHT + 4)} width={Math.max(30, slotVisualWidth - 6)} height={INFO_BLOCK_HEIGHT} text={sensorTitle} fontSize={4} fill={INFO_BLOCK_TEXT_COLOR} align="center" verticalAlign="middle" device={sensor} title={sensorTitle} />
                                                                                        </>
                                                                                    )}
                                                                                    {sensor && isNtcHovered && (
                                                                                        <SlotDeleteButton
                                                                                            x={slotX + slotVisualWidth - 2.5}
                                                                                            y={slotY + 1.5}
                                                                                            onRemove={() => removeExtNtcSensorAtSlot(slotIndex, extOneWireIndex, ntcIndex)}
                                                                                        />
                                                                                    )}
                                                                                     {!sensor && showEmptySlots && (
                                                                                         <>
                                                                                            <EditableInfoTitle x={slotX + ntcSlotWidth - 13}
                                                                                                y={slotY + 2}
                                                                                                width={10}
                                                                                                height={10}
                                                                                                text={String(ntcChannel)}
                                                                                                fontSize={7}
                                                                                                fill="#7b8494"
                                                                                                align="right"
                                                                                                listening={false}
                                                                                            />
                                                                                             <Circle
                                                                                                 x={slotX + ntcSlotWidth / 2}
                                                                                                 y={slotY + ntcSlotHeight / 2}
                                                                                                radius={10}
                                                                                                fill={ADD_ACTION_FILL}
                                                                                                onClick={(event) => {
                                                                                                    const pos = event.target.getAbsolutePosition();
                                                                                                    setNtcSlotMenuPos({ x: pos.x, y: pos.y, owner: 'ext', moduleIndex: slotIndex, slotIndex: extOneWireIndex, ntcSlotIndex: ntcIndex, lineKey: 'ntc1_devices' });
                                                                                                }}
                                                                                                onTap={(event) => {
                                                                                                    const pos = event.target.getAbsolutePosition();
                                                                                                    setNtcSlotMenuPos({ x: pos.x, y: pos.y, owner: 'ext', moduleIndex: slotIndex, slotIndex: extOneWireIndex, ntcSlotIndex: ntcIndex, lineKey: 'ntc1_devices' });
                                                                                                }}
                                                                                            />
                                                                                            <Text
                                                                                                x={slotX + ntcSlotWidth / 2}
                                                                                                y={slotY + ntcSlotHeight / 2}
                                                                                                text="+"
                                                                                                fontSize={15}
                                                                                                fill={INFO_BLOCK_FILL}
                                                                                                offsetX={4.5}
                                                                                                offsetY={6}
                                                                                                listening={false}
                                                                                            />
                                                                                        </>
                                                                                    )}
                                                                                </Group>
                                                                            );
                                                                        });
                                                                    })()}
                                                                    {canonicalDeviceType(owDevice?.type) === 'ntc-1-wire' && (() => {
                                                                        const ntcSlotWidth = 11 * indentSize;
                                                                        const ntcSlotHeight = 7 * indentSize;
                                                                        const ntcSlotGap = 3 * indentSize;
                                                                        const lineX = owX + owWidth;
                                                                        const lineTotalHeight = NTC_LINE_SLOTS_COUNT * ntcSlotHeight + (NTC_LINE_SLOTS_COUNT - 1) * ntcSlotGap;
                                                                        const lineY = owY - lineTotalHeight;
                                                                        return Array.from({ length: NTC_LINE_SLOTS_COUNT }).map((_, ntcIndex) => {
                                                                            const sensor = getNtcSensorFromDeviceLine(owDevice, scheme, ntcIndex, 'ntc2_devices');
                                                                            if (!sensor && !showEmptySlots) return null;
                                                                            const ntcSensorKey = getWirelessDeviceImageKey({ ...(sensor || { type: 'ntc-sensor' }), port_side: 'left' });
                                                                            const ntcSensorImage = wirelessImages[ntcSensorKey] || null;
                                                                            const ntcSensorPorts = wirelessPortsByType[ntcSensorKey] || [];
                                                                            const slotVisualWidth = canonicalDeviceType(sensor?.type) === 'wall-ntc-sensor' ? ntcSlotHeight : ntcSlotWidth;
                                                                            const slotX = lineX;
                                                                            const slotY = lineY + ntcIndex * (ntcSlotHeight + ntcSlotGap);
                                                                            const ntcHoverKey = `ext2:${slotIndex}:${extOneWireIndex}:${ntcIndex}`;
                                                                            const isNtcHovered = hoveredNtcSlotKey === ntcHoverKey;
                                                                            const ntcChannel = getNtcChannelBySlot(ntcIndex, 'ntc2_devices');
                                                                            const sensorTitle = getNtcSensorTitle(scheme, sensor, ntcChannel);
                                                                            const sensorPortA = ntcSensorPorts.find((port) => port.name === 'NTC-A') || ntcSensorPorts.find((port) => String(port?.name || '').startsWith('NTC-')) || null;
                                                                            const sensorPortB = ntcSensorPorts.find((port) => port.name === 'NTC-B') || sensorPortA;
                                                                            const sensorRenderSize = ntcSensorImage
                                                                                ? getContainSize(ntcSensorImage, slotVisualWidth, ntcSlotHeight)
                                                                                : { width: slotVisualWidth, height: ntcSlotHeight };
                                                                            const sensorRenderX = slotX + (slotVisualWidth - sensorRenderSize.width) / 2;
                                                                            const sensorRenderY = slotY + (ntcSlotHeight - sensorRenderSize.height) / 2;
                                                                            const sensorPortAX = sensorPortA ? sensorRenderX + sensorPortA.x * sensorRenderSize.width : slotX;
                                                                            const sensorPortAY = sensorPortA ? sensorRenderY + sensorPortA.y * sensorRenderSize.height : slotY + ntcSlotHeight / 2;
                                                                            const sensorPortBX = sensorPortB ? sensorRenderX + sensorPortB.x * sensorRenderSize.width : slotX;
                                                                            const sensorPortBY = sensorPortB ? sensorRenderY + sensorPortB.y * sensorRenderSize.height : slotY + ntcSlotHeight / 2;
                                                                            const modulePortA = owPorts.find((port) => port.name === `NTC-${ntcChannel}-A`);
                                                                            const modulePortB = owPorts.find((port) => port.name === `NTC-${ntcChannel}-B`);
                                                                            return (
                                                                                <Group
                                                                                    key={`ext-ntc2-slot-${slotIndex}-${extOneWireIndex}-${ntcIndex}`}
                                                                                    onMouseEnter={() => setHoveredNtcSlotKey(ntcHoverKey)}
                                                                                    onMouseLeave={() => setHoveredNtcSlotKey((prev) => (prev === ntcHoverKey ? null : prev))}
                                                                                >
                                                                                    {sensor && ntcSensorImage && <Image image={ntcSensorImage} x={sensorRenderX} y={sensorRenderY} width={sensorRenderSize.width} height={sensorRenderSize.height} listening={false} />}
                                                                                    {sensor && modulePortA && <Line points={[sensorPortAX, sensorPortAY, owX + modulePortA.x * owWidth, sensorPortAY, owX + modulePortA.x * owWidth, owY + modulePortA.y * owHeight]} stroke="#212121" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />}
                                                                                    {sensor && modulePortB && <Line points={[sensorPortBX, sensorPortBY, owX + modulePortB.x * owWidth, sensorPortBY, owX + modulePortB.x * owWidth, owY + modulePortB.y * owHeight]} stroke="#464EE3" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />}
                                                                                    <Rect name="module-device-slot" collisionOccupied={Boolean(sensor)} x={slotX} y={slotY} width={slotVisualWidth} height={ntcSlotHeight} cornerRadius={6} fill={sensor ? TRANSPARENT_FILL : EMPTY_SLOT_FILL} stroke={sensor ? TRANSPARENT_FILL : EMPTY_SLOT_STROKE} strokeWidth={1.2} />
                                                                                    {showPorts && sensor && ntcSensorPorts.map((port) => <Circle key={`ext-ntc2-port-${slotIndex}-${extOneWireIndex}-${ntcIndex}-${port.name}`} x={sensorRenderX + port.x * sensorRenderSize.width} y={sensorRenderY + port.y * sensorRenderSize.height} radius={2.5} fill="red" listening={false} />)}
                                                                                    {sensor && <><Rect x={slotX} y={slotY - (INFO_BLOCK_HEIGHT + 4)} width={slotVisualWidth} height={INFO_BLOCK_HEIGHT} cornerRadius={1} fill={INFO_BLOCK_FILL} stroke={INFO_BLOCK_STROKE} strokeWidth={INFO_BLOCK_STROKE_WIDTH} /><EditableInfoTitle x={slotX + 3} y={slotY - (INFO_BLOCK_HEIGHT + 4)} width={Math.max(30, slotVisualWidth - 6)} height={INFO_BLOCK_HEIGHT} text={sensorTitle} fontSize={4} fill={INFO_BLOCK_TEXT_COLOR} align="center" verticalAlign="middle" device={sensor} title={sensorTitle} /></>}
                                                                                    {sensor && isNtcHovered && <SlotDeleteButton x={slotX + slotVisualWidth - 2.5} y={slotY + 1.5} onRemove={() => removeExtNtcSensorAtSlot(slotIndex, extOneWireIndex, ntcIndex, 'ntc2_devices')} />}
                                                                                    {!sensor && showEmptySlots && <><EditableInfoTitle x={slotX + ntcSlotWidth - 13} y={slotY + 2} width={10} height={10} text={String(ntcChannel)} fontSize={7} fill="#7b8494" align="right" listening={false} /><Circle x={slotX + ntcSlotWidth / 2} y={slotY + ntcSlotHeight / 2} radius={10} fill={ADD_ACTION_FILL} onClick={(event) => { const pos = event.target.getAbsolutePosition(); setNtcSlotMenuPos({ x: pos.x, y: pos.y, owner: 'ext', moduleIndex: slotIndex, slotIndex: extOneWireIndex, ntcSlotIndex: ntcIndex, lineKey: 'ntc2_devices' }); }} onTap={(event) => { const pos = event.target.getAbsolutePosition(); setNtcSlotMenuPos({ x: pos.x, y: pos.y, owner: 'ext', moduleIndex: slotIndex, slotIndex: extOneWireIndex, ntcSlotIndex: ntcIndex, lineKey: 'ntc2_devices' }); }} /><Text x={slotX + ntcSlotWidth / 2} y={slotY + ntcSlotHeight / 2} text="+" fontSize={15} fill={ADD_ACTION_TEXT_FILL} offsetX={4.5} offsetY={6} listening={false} /></>}
                                                                                </Group>
                                                                            );
                                                                        });
                                                                    })()}
                                                                    {canonicalDeviceType(owDevice?.type) === 'rdt2' && aerialImage && (() => {
                                                                        const aerialPorts = getPortsByClassToken(owPorts, 'AERIAL');
                                                                        if (!aerialPorts) return null;
                                                                        return aerialPorts.map((aerialPort, portIndex) => {
                                                                            const portX = owX + aerialPort.x * owWidth;
                                                                            const portCenterY = owY + aerialPort.y * owHeight;
                                                                            const portHeight = (aerialPort.height || 0) * owHeight;
                                                                            const portTopY = portCenterY - portHeight / 2;
                                                                            const width = aerialImage.width || AERIAL_WIDTH;
                                                                            const height = aerialImage.height || AERIAL_HEIGHT;
                                                                            return (
                                                                                <Image
                                                                                    key={`ext-rdt2-aerial-${slotIndex}-${extOneWireIndex}-${portIndex}`}
                                                                                    image={aerialImage}
                                                                                    x={portX - width / 2}
                                                                                    y={portTopY - height}
                                                                                    width={width}
                                                                                    height={height}
                                                                                    listening={false}
                                                                                />
                                                                            );
                                                                        });
                                                                    })()}
                                                                    {!owDevice && (
                                                                        <>
                                                                            <Circle
                                                                                x={owX + owWidth / 2}
                                                                                y={owY + owHeight / 2}
                                                                                radius={16}
                                                                                fill={ADD_ACTION_FILL}
                                                                                onClick={(e) => {
                                                                                    const pos = e.target.getAbsolutePosition();
                                                                                    setExtOneWireMenuPos({ x: pos.x, y: pos.y, moduleIndex: slotIndex, slotIndex: extOneWireIndex });
                                                                                }}
                                                                                onTap={(e) => {
                                                                                    const pos = e.target.getAbsolutePosition();
                                                                                    setExtOneWireMenuPos({ x: pos.x, y: pos.y, moduleIndex: slotIndex, slotIndex: extOneWireIndex });
                                                                                }}
                                                                            />
                                                                            <Text x={owX + owWidth / 2} y={owY + owHeight / 2} text="+" fontSize={22} fill={ADD_ACTION_TEXT_FILL} offsetX={6.5} offsetY={9} listening={false} />
                                                                        </>
                                                                    )}
                                                                    {owDevice && !isOwModuleWithNativeSize && (
                                                                        <>
                                                                            <Rect
                                                                                x={owX}
                                                                                y={owY - (INFO_BLOCK_HEIGHT + 14)}
                                                                                width={owWidth}
                                                                                height={INFO_BLOCK_HEIGHT}
                                                                                cornerRadius={1}
                                                                                fill={INFO_BLOCK_FILL}
                                                                                stroke={INFO_BLOCK_STROKE}
                                                                                strokeWidth={INFO_BLOCK_STROKE_WIDTH}
                                                                            />
                                                                            <EditableInfoTitle
                                                                                x={owX + 4}
                                                                                y={owY - (INFO_BLOCK_HEIGHT + 14)}
                                                                                text={getDeviceStoredTitle(owDevice) || getOneWireDeviceTitle(extOneWireDevices, owDevice, extOneWireIndex)}
                                                                                fontSize={4}
                                                                                fill={INFO_BLOCK_TEXT_COLOR}
                                                                                width={owWidth - 8}
                                                                                height={INFO_BLOCK_HEIGHT}
                                                                                align="center"
                                                                                verticalAlign="middle"
                                                                                device={owDevice}
                                                                                title={getDeviceStoredTitle(owDevice) || getOneWireDeviceTitle(extOneWireDevices, owDevice, extOneWireIndex)}
                                                                            />
                                                                        </>
                                                                    )}
                                                                    {owDevice && isOwHovered && (
                                                                        <SlotDeleteButton compact x={owX + owWidth - 2.5} y={owY + 1.5} onRemove={() => removeExtOneWireDeviceAtSlot(slotIndex, extOneWireIndex)} />
                                                                    )}
                                                                    {showPorts && owPorts.map((port) => (
                                                                        <Circle
                                                                            key={`ext-ow-port-${slotIndex}-${extOneWireIndex}-${port.name}`}
                                                                            x={owDevice ? owX + port.x * owWidth : owX + port.x}
                                                                            y={owDevice ? owY + port.y * owHeight : owY + port.y}
                                                                            radius={2.5}
                                                                            fill="red"


                                                                        />
                                                                    ))}
                                                                    {(() => {
                                                                        const lineSegments = extOwLinks.map((link) => {
                                                                        const toPort = owPortMap[link.name];
                                                                        if (!toPort) return null;
                                                                        let fromX;
                                                                        let fromY;
                                                                        let sourcePortName = '';
                                                                        if (extOneWireIndex === 0) {
                                                                            const fromPort = getOneWirePortByRole(extPorts, link.name) || extPorts.find((p) => p.name === link.name);
                                                                            if (!fromPort) return null;
                                                                            sourcePortName = typeof fromPort.name === 'string' ? fromPort.name.toUpperCase() : '';
                                                                            fromX = slotX + fromPort.x * slotWidth;
                                                                            fromY = slotY + fromPort.y * slotHeight;
                                                                        } else {
                                                                            const prevDevice = extOneWireDevices[extOneWireIndex - 1] || null;
                                                                            const prevPorts = getExtOwPorts(prevDevice);
                                                                            const prevPortMap = getExtOwPortMap(
                                                                                prevDevice,
                                                                                prevPorts,
                                                                                getOneWireDirectionForDevice(prevDevice, 'source'),
                                                                            );
                                                                            const fromPort = prevPortMap[link.name];
                                                                            if (!fromPort) return null;
                                                                            sourcePortName = typeof fromPort.name === 'string' ? fromPort.name.toUpperCase() : '';
                                                                            const prevSize = getExtOneWireSlotSize(prevDevice);
                                                                            const prevPos = getExtOneWireSlotPosition(extOneWireIndex - 1);
                                                                            fromX = prevDevice ? prevPos.x + fromPort.x * prevSize.width : prevPos.x + fromPort.x;
                                                                            fromY = prevDevice ? prevPos.y + fromPort.y * prevSize.height : prevPos.y + fromPort.y;
                                                                        }
                                                                        const toX = owDevice ? (owX + toPort.x * owWidth) : (owX + toPort.x);
                                                                        const toY = owDevice ? (owY + toPort.y * owHeight) : (owY + toPort.y);
                                                                        const targetType = canonicalDeviceType(owDevice?.type);
                                                                        if (targetType === 'wall-digital-sensor') {
                                                                            return {
                                                                                key: `ext-ow-link-${slotIndex}-${extOneWireIndex}-${link.name}`,
                                                                                role: link.name,
                                                                                points: [toX, toY, fromX, toY, fromX, fromY],
                                                                            };
                                                                        }
                                                                        const isTargetThermostat = targetType === 'thermostat' || isFlaskSensorType(targetType);
                                                                        let sourceMinBendY = null;
                                                                        if (extOneWireIndex > 0) {
                                                                            const prevDevice = extOneWireDevices[extOneWireIndex - 1] || null;
                                                                            const prevType = canonicalDeviceType(prevDevice?.type);
                                                                            const isSourceModule = prevType === 'ntc-1-wire' || prevType === 'rdt2';
                                                                            const isOutPort = sourcePortName.includes('OUT');
                                                                            if (isSourceModule && isOutPort) {
                                                                                const prevSize = getExtOneWireSlotSize(prevDevice);
                                                                                const prevPos = getExtOneWireSlotPosition(extOneWireIndex - 1);
                                                                                sourceMinBendY = prevPos.y + prevSize.height + link.offset;
                                                                            }
                                                                        }
                                                                        const bendY = getOneWireBendY({
                                                                            slotTop: owY,
                                                                            slotHeight: owHeight,
                                                                            offset: link.offset,
                                                                            fromY,
                                                                            toY,
                                                                            isTargetThermostat,
                                                                            sourceMinBendY,
                                                                        });
                                                                        return {
                                                                            key: `ext-ow-link-${slotIndex}-${extOneWireIndex}-${link.name}`,
                                                                            role: link.name,
                                                                            points: getOrthogonalLinkPoints(fromX, fromY, bendY, toX, toY),
                                                                        };
                                                                        }).filter(Boolean);

                                                                        return <OneWireLine segments={lineSegments} />;
                                                                    })()}
                                                                </Group>
                                                            );
                                                        })}
                                                         {!isOccupied && (
                                                             <>
                                                                 <Circle
                                                                    x={slotX + slotWidth / 2}
                                                                    y={slotY + slotHeight / 2}
                                                                    radius={16}
                                                                     fill={ADD_ACTION_FILL}
                                                                     onClick={(e) => {
                                                                         if (isEcosmartExtThermostatAddSlot) {
                                                                             addEcosmartExtThermostatWithFloorSlot();
                                                                             return;
                                                                         }
                                                                         const pos = e.target.getAbsolutePosition();
                                                                         setExtMenuPos({ x: pos.x, y: pos.y, slotIndex });
                                                                     }}
                                                                     onTap={(e) => {
                                                                         if (isEcosmartExtThermostatAddSlot) {
                                                                             addEcosmartExtThermostatWithFloorSlot();
                                                                             return;
                                                                         }
                                                                         const pos = e.target.getAbsolutePosition();
                                                                         setExtMenuPos({ x: pos.x, y: pos.y, slotIndex });
                                                                     }}
                                                                />
                                                                <Text
                                                                    x={slotX + slotWidth / 2}
                                                                    y={slotY + slotHeight / 2}
                                                                    text="+"
                                                                    fontSize={22}
                                                                    fill={INFO_BLOCK_FILL}
                                                                    offsetX={6.5}
                                                                    offsetY={9}
                                                                    listening={false}
                                                                />
                                                            </>
                                                        )}
                                                          {(renderDevice || isProExtAddSlot) && extLinks.map((link, linkIndex) => {
                                                              const targetPort = renderDevice
                                                                  ? findExtDevicePort(renderDevice, extPorts, link.moduleTo)
                                                                  : emptyExtSlotInputPorts[link.moduleTo];
                                                             if (!targetPort) return null;
                                                             const toX = controllerType === 'ecosmart' && !isOccupied
                                                                 ? slotX
                                                                 : slotX + targetPort.x * slotWidth;
                                                             const toY = slotY + targetPort.y * slotHeight;
                                                             let fromX;
                                                             let fromY;
                                                             let sourceDeviceBottomY = controllerImage.height;

                                                            if (slotIndex === 0) {
                                                                const controllerPort = findPortByNames(ports, link.controllerFrom);
                                                                if (!controllerPort) return null;
                                                                fromX = controllerPort.x * controllerImage.width;
                                                                fromY = controllerPort.y * controllerImage.height;
                                                            } else {
                                                                const previousDevice = extModules[slotIndex - 1] || null;
                                                                if (!previousDevice) return null;
                                                                const previousImageKey = getWirelessDeviceImageKey(previousDevice);
                                                                const previousPorts = previousImageKey ? (wirelessPortsByType[previousImageKey] || []) : [];
                                                                const previousPort = findExtDevicePort(previousDevice, previousPorts, link.moduleFrom);
                                                                if (!previousPort) return null;
                                                                const previousSize = getExtModuleSize(previousDevice);
                                                                const previousSlotPos = getExtSlotPosition(slotIndex - 1);
                                                                 const previousSlotX = previousSlotPos.x;
                                                                 const previousSlotY = previousSlotPos.y;
                                                                 fromX = previousSlotX + previousPort.x * previousSize.width;
                                                                 fromY = previousSlotY + previousPort.y * previousSize.height;
                                                                 sourceDeviceBottomY = previousSlotY + previousSize.height;
                                                            }

                                                            const ecosmartThermostatControllerRoute = isEcosmartThermostatExtLine && slotIndex === 0 && extNormalizedType === 'thermostat'
                                                                ? {
                                                                    '12VDC-IN-V+': { up: 4, left: 19 },
                                                                    '12VDC-IN-GND': { up: 5, left: 19 },
                                                                    'EXT-IN-A': { up: 6, left: 19 },
                                                                    'EXT-IN-B': { up: 7, left: 19 },
                                                                }[link.moduleTo]
                                                                : null;
                                                            if (ecosmartThermostatControllerRoute) {
                                                                const bendY = -ecosmartThermostatControllerRoute.up * indentSize;
                                                                const leftX = fromX - ecosmartThermostatControllerRoute.left * indentSize;
                                                                return (
                                                                    <Line
                                                                        key={`ext-link-${slotIndex}-${link.moduleTo}`}
                                                                        points={[fromX, fromY, fromX, bendY, leftX, bendY, leftX, toY, toX, toY]}
                                                                        stroke={link.color}
                                                                        strokeWidth={1}
                                                                        lineCap="round"
                                                                        lineJoin="round"
                                                                        listening={false}
                                                                    />
                                                                );
                                                            }

                                                            const defaultBendY = Math.max(fromY, toY) + (linkIndex + 1) * indentSize;
                                                            const firstHopBendY = slotY + slotHeight + (link.firstHopBendIndent * indentSize);
                                                            const moduleHopBendY = slotY + slotHeight + (link.moduleHopBendIndent * indentSize);
                                                            let sourceHopBendY = fromY;
                                                            if (slotIndex > 0) {
                                                                const previousDevice = extModules[slotIndex - 1] || null;
                                                                const previousSize = getExtModuleSize(previousDevice);
                                                                const previousSlotPos = getExtSlotPosition(slotIndex - 1);
                                                                sourceHopBendY = previousSlotPos.y + previousSize.height + (link.moduleHopBendIndent * indentSize);
                                                            }
                                                            const bendY = slotIndex === 0
                                                                ? Math.max(defaultBendY, firstHopBendY)
                                                                : Math.max(defaultBendY, moduleHopBendY, sourceHopBendY);
                                                            const baseSlotPos = getExtBaseSlotPosition(slotIndex);
                                                            const baseToY = baseSlotPos.y + targetPort.y * slotHeight;
                                                            let baseFromY;
                                                            if (slotIndex === 0) {
                                                                const baseControllerPort = findPortByNames(ports, link.controllerFrom);
                                                                if (!baseControllerPort) return null;
                                                                baseFromY = baseControllerPort.y * controllerImage.height;
                                                            } else {
                                                                const previousDevice = extModules[slotIndex - 1] || null;
                                                                if (!previousDevice) return null;
                                                                const previousImageKey = getWirelessDeviceImageKey(previousDevice);
                                                                const previousPorts = previousImageKey ? (wirelessPortsByType[previousImageKey] || []) : [];
                                                                const previousPort = findExtDevicePort(previousDevice, previousPorts, link.moduleFrom);
                                                                if (!previousPort) return null;
                                                                const previousSize = getExtModuleSize(previousDevice);
                                                                const previousBasePos = getExtBaseSlotPosition(slotIndex - 1);
                                                                baseFromY = previousBasePos.y + previousPort.y * previousSize.height;
                                                            }
                                                            const baseDefaultBendY = Math.max(baseFromY, baseToY) + (linkIndex + 1) * indentSize;
                                                            const baseHopBendY = slotIndex === 0
                                                                ? (baseSlotPos.y + slotHeight + (link.firstHopBendIndent * indentSize))
                                                                : (baseSlotPos.y + slotHeight + (link.moduleHopBendIndent * indentSize));
                                                            let baseSourceHopBendY = baseFromY;
                                                            if (slotIndex > 0) {
                                                                const previousDevice = extModules[slotIndex - 1] || null;
                                                                const previousSize = getExtModuleSize(previousDevice);
                                                                const previousBasePos = getExtBaseSlotPosition(slotIndex - 1);
                                                                baseSourceHopBendY = previousBasePos.y + previousSize.height + (link.moduleHopBendIndent * indentSize);
                                                            }
                                                               const minAllowedBendY = Math.max(baseDefaultBendY, baseHopBendY, baseSourceHopBendY);
                                                               const isEmptyProExtBLink = isProExtAddSlot && link.moduleTo === 'EXT-IN-B';
                                                               const isEmptyProExtSlotFromController = isProExtAddSlot && slotIndex === 0;
                                                               const clampedBendY = isEmptyProExtSlotFromController
                                                                   ? sourceDeviceBottomY + link.firstHopBendIndent * indentSize
                                                                   : (isEmptyProExtBLink
                                                                       ? sourceDeviceBottomY + 3 * indentSize
                                                                       : Math.max(bendY, minAllowedBendY));
                                                              const previousExtNormalizedType = slotIndex > 0
                                                                  ? canonicalDeviceType(extModules[slotIndex - 1]?.type)
                                                                  : null;
                                                              const isEcosmartExtThermostatToThermostat = isEcosmartThermostatExtLine
                                                                  && slotIndex > 0
                                                                  && previousExtNormalizedType === 'thermostat'
                                                                  && extNormalizedType === 'thermostat';
                                                              if (isEcosmartExtThermostatToThermostat) {
                                                                  return (
                                                                      <Line
                                                                          key={`ext-link-${slotIndex}-${link.moduleTo}`}
                                                                          points={[fromX, fromY, fromX, toY, toX, toY]}
                                                                          stroke={link.color}
                                                                          strokeWidth={1}
                                                                          lineCap="round"
                                                                          lineJoin="round"
                                                                          listening={false}
                                                                       />
                                                                   );
                                                               }
                                                               const isPreviousToEcosmartExtThermostatGnd = isEcosmartThermostatExtLine
                                                                   && extNormalizedType === 'thermostat'
                                                                   && link.moduleTo === '12VDC-IN-GND';
                                                              if (isPreviousToEcosmartExtThermostatGnd) {
                                                                 const verticalRiseX = toX - 10 * indentSize;
                                                                 return (
                                                                     <Line
                                                                         key={`ext-link-${slotIndex}-${link.moduleTo}`}
                                                                         points={[fromX, fromY, fromX, clampedBendY, verticalRiseX, clampedBendY, verticalRiseX, toY, toX, toY]}
                                                                         stroke={link.color}
                                                                         strokeWidth={1}
                                                                         lineCap="round"
                                                                         lineJoin="round"
                                                                         listening={false}
                                                                      />
                                                                  );
                                                              }
                                                             const isPreviousToEcosmartExtThermostatVPlus = isEcosmartThermostatExtLine
                                                                 && extNormalizedType === 'thermostat'
                                                                 && link.moduleTo === '12VDC-IN-V+';
                                                             if (isPreviousToEcosmartExtThermostatVPlus) {
                                                                 const verticalRiseX = toX - 10 * indentSize;
                                                                 return (
                                                                     <Line
                                                                         key={`ext-link-${slotIndex}-${link.moduleTo}`}
                                                                         points={[fromX, fromY, fromX, clampedBendY, verticalRiseX, clampedBendY, verticalRiseX, toY, toX, toY]}
                                                                         stroke={link.color}
                                                                         strokeWidth={1}
                                                                         lineCap="round"
                                                                         lineJoin="round"
                                                                         listening={false}
                                                                     />
                                                                 );
                                                             }
                                                             const isPreviousToEcosmartExtThermostatExtA = isEcosmartThermostatExtLine
                                                                 && extNormalizedType === 'thermostat'
                                                                 && link.moduleTo === 'EXT-IN-A';
                                                             if (isPreviousToEcosmartExtThermostatExtA) {
                                                                 const verticalRiseX = toX - 10 * indentSize;
                                                                 return (
                                                                     <Line
                                                                         key={`ext-link-${slotIndex}-${link.moduleTo}`}
                                                                         points={[fromX, fromY, fromX, clampedBendY, verticalRiseX, clampedBendY, verticalRiseX, toY, toX, toY]}
                                                                         stroke={link.color}
                                                                         strokeWidth={1}
                                                                         lineCap="round"
                                                                         lineJoin="round"
                                                                         listening={false}
                                                                     />
                                                                 );
                                                             }
                                                             const isPreviousToEcosmartExtThermostatExtB = isEcosmartThermostatExtLine
                                                                 && extNormalizedType === 'thermostat'
                                                                 && link.moduleTo === 'EXT-IN-B';
                                                             if (isPreviousToEcosmartExtThermostatExtB) {
                                                                 const verticalRiseX = toX - 10 * indentSize;
                                                                 return (
                                                                     <Line
                                                                         key={`ext-link-${slotIndex}-${link.moduleTo}`}
                                                                         points={[fromX, fromY, fromX, clampedBendY, verticalRiseX, clampedBendY, verticalRiseX, toY, toX, toY]}
                                                                         stroke={link.color}
                                                                         strokeWidth={1}
                                                                         lineCap="round"
                                                                         lineJoin="round"
                                                                         listening={false}
                                                                     />
                                                                 );
                                                             }
                                                             return (
                                                                 <Line
                                                                    key={`ext-link-${slotIndex}-${link.moduleTo}`}
                                                                    points={[fromX, fromY, fromX, clampedBendY, toX, clampedBendY, toX, toY]}
                                                                    stroke={link.color}
                                                                    strokeWidth={1}
                                                                    lineCap="round"
                                                                    lineJoin="round"
                                                                    listening={false}
                                                                />
                                                            );
                                                        })}
                                                        {isOccupied && isHovered && !isExtThermostat && (
                                                            <SlotDeleteButton compact name="scheme-delete-control" x={slotX + slotWidth - 2.5} y={slotY + 1.5} onRemove={() => removeExtModuleAtSlot(slotIndex)} />
                                                        )}
                                                    </Group>
                                                );
                                            })}
                                        </>
                                    );
                                })()}
                                {(() => {
                                    const oneWireGeometry = getOneWireLineGeometry(
                                        controllerType,
                                        controllerImage,
                                        ports,
                                        indentSize,
                                        moduleHeightValue,
                                    );
                                     if (!oneWireGeometry) return null;
                                      const oneWireDevices = memoOneWireDevices;
                                      const smart2DiModulesCount = controllerType === 'smart2' ? getDiModules(scheme).length : 0;
                                       const oneWireMaxDevices = 6;
                                    // Route the first controller 1-wire links below every visible PRO slot.
                                    const getProFirstOneWireMinBendY = () => {
                                        if (controllerType !== 'pro') return null;

                                        const controllerBottom = controllerImage.height;
                                        let lowestBottom = controllerBottom;
                                        const includeBottom = (top, height) => {
                                            lowestBottom = Math.max(lowestBottom, top + height);
                                        };
                                        const hasPort = (name) => ports.some((port) => port.name === name);
                                        const { aiOccupied, diOccupied, modbusOccupied } = getProAuxLineOccupancy(scheme);

                                        if ((modbusOccupied || showEmptySlots) && hasPort('MODBUS-A') && hasPort('MODBUS-B')) {
                                            includeBottom(controllerBottom + 8 * indentSize, 4 * indentSize);
                                        }

                                        const hasUps = Array.isArray(scheme.power_modules)
                                            && scheme.power_modules
                                                .map((item) => normalizePowerModuleType(typeof item === 'string' ? item : item?.type))
                                                .includes('ups');
                                        const proDiDevices = hasUps
                                            ? []
                                            : getControllerLineDevices(scheme, 'di_devices').slice(0, 2);
                                        if (hasPort('DI-IN-1') && hasPort('DI-IN-2')) {
                                            const diSlotHeight = 3 * indentSize;
                                            const diSlot1Y = controllerBottom + 15 * indentSize;
                                            const diSlot2Y = controllerBottom + 21 * indentSize;
                                            if (proDiDevices[0] || (!hasUps && showEmptySlots)) includeBottom(diSlot2Y, diSlotHeight);
                                            if (proDiDevices[1] || (!hasUps && showEmptySlots)) includeBottom(diSlot1Y, diSlotHeight);
                                        }

                                        if (showEmptySlots && hasPort('AI-IN-1')) {
                                            includeBottom(controllerBottom + 1.15 * moduleHeightValue - 2 * indentSize, 2 * indentSize);
                                        }

                                        const pressureSensor = getPressureSensorFromScheme(scheme);
                                        if ((pressureSensor || showEmptySlots) && hasPort('4-20-OUT-IN') && hasPort('4-20-OUT-V+')) {
                                            const slotOffsetIndent = showEmptySlots
                                                ? 32
                                                : (diOccupied && !aiOccupied
                                                    ? 28
                                                    : (!aiOccupied && !diOccupied && !modbusOccupied ? 14 : 32));
                                            includeBottom(
                                                controllerBottom + slotOffsetIndent * indentSize,
                                                pressureSensor ? 1.5 * indentSize : 2 * indentSize,
                                            );
                                        }

                                        const getPowerModuleSize = (type) => {
                                            const imageKey = getWirelessDeviceImageKey({ type });
                                            const image = imageKey ? wirelessImages[imageKey] : null;
                                            return image?.width && image?.height
                                                ? { width: image.width, height: image.height }
                                                : { width: 80, height: 80 };
                                        };
                                        const batterySize = hasUps ? getPowerModuleSize('battery') : null;
                                        if (batterySize) includeBottom(controllerBottom + 11 * indentSize, batterySize.height);

                                        const extModules = [...memoExtModules, ...memoExtLineThermostatDevices];
                                        const getExtModuleSize = (device) => {
                                            const imageKey = getWirelessDeviceImageKey(device);
                                            const image = imageKey ? wirelessImages[imageKey] : null;
                                            return image?.width && image?.height
                                                ? { width: image.width, height: image.height }
                                                : { width: EXT_SLOT_SIZE, height: EXT_SLOT_SIZE };
                                        };
                                        const findPortByNames = (portsList, names) => names
                                            .map((name) => portsList.find((port) => port.name === name))
                                            .find(Boolean) || null;
                                        const findExtDevicePort = (device, portsList, portName) => {
                                            if (canonicalDeviceType(device?.type) === 'thermostat') {
                                                if (portName === '12VDC-IN-V+' || portName === '12VDC-OUT-V+') return findPortByNames(portsList, ['1-WIRE-V+']);
                                                if (portName === '12VDC-IN-GND' || portName === '12VDC-OUT-GND') return findPortByNames(portsList, ['1-WIRE-GND']);
                                                if (portName === 'EXT-IN-A' || portName === 'EXT-OUT-A') return findPortByNames(portsList, ['EXT-A']);
                                                if (portName === 'EXT-IN-B' || portName === 'EXT-OUT-B') return findPortByNames(portsList, ['EXT-B']);
                                            }
                                            return findPortByNames(portsList, [
                                                portName,
                                                portName.replace('EXT-IN', 'EXT'),
                                                portName.replace('EXT-OUT', 'EXT'),
                                                portName.replace('12VDC-IN', '12VDC'),
                                                portName.replace('12VDC-OUT', '12VDC'),
                                            ]);
                                        };
                                        const getExtSlotY = (slotIndex, useBasePosition = false) => {
                                            const size = getExtModuleSize(extModules[slotIndex]);
                                            const baseY = snapToGrid(controllerBottom - size.height, indentSize);
                                            if (useBasePosition) return baseY;
                                            const device = extModules[slotIndex] || null;
                                            const offset = extSlotOffsets[getExtOffsetKey(device, slotIndex)] || { x: 0, y: 0 };
                                            return offset.x === 0 && offset.y === 0 ? baseY : controllerBottom - size.height + offset.y;
                                        };
                                        const extLinks = [
                                            { controllerFrom: ['12VDC-OUT-V+', '12VDC-IN-V+'], moduleFrom: '12VDC-OUT-V+', moduleTo: '12VDC-IN-V+', firstHopBendIndent: 4, moduleHopBendIndent: 6 },
                                            { controllerFrom: ['12VDC-OUT-GND', '12VDC-IN-GND'], moduleFrom: '12VDC-OUT-GND', moduleTo: '12VDC-IN-GND', firstHopBendIndent: 3, moduleHopBendIndent: 5 },
                                            { controllerFrom: ['EXT-OUT-A'], moduleFrom: 'EXT-OUT-A', moduleTo: 'EXT-IN-A', firstHopBendIndent: 6, moduleHopBendIndent: 4 },
                                            { controllerFrom: ['EXT-OUT-B'], moduleFrom: 'EXT-OUT-B', moduleTo: 'EXT-IN-B', firstHopBendIndent: 5, moduleHopBendIndent: 3 },
                                        ];
                                        extModules.forEach((device, slotIndex) => {
                                            const imageKey = getWirelessDeviceImageKey(device);
                                            const devicePorts = imageKey ? (wirelessPortsByType[imageKey] || []) : [];
                                            const size = getExtModuleSize(device);
                                            const slotY = getExtSlotY(slotIndex);
                                            const baseSlotY = getExtSlotY(slotIndex, true);
                                            extLinks.forEach((link, linkIndex) => {
                                                const targetPort = findExtDevicePort(device, devicePorts, link.moduleTo);
                                                if (!targetPort) return;
                                                const toY = slotY + targetPort.y * size.height;
                                                const baseToY = baseSlotY + targetPort.y * size.height;
                                                let fromY;
                                                let baseFromY;
                                                let sourceHopBendY;
                                                let baseSourceHopBendY;
                                                if (slotIndex === 0) {
                                                    const controllerPort = findPortByNames(ports, link.controllerFrom);
                                                    if (!controllerPort) return;
                                                    fromY = controllerPort.y * controllerBottom;
                                                    baseFromY = fromY;
                                                    sourceHopBendY = fromY;
                                                    baseSourceHopBendY = baseFromY;
                                                } else {
                                                    const previousDevice = extModules[slotIndex - 1];
                                                    const previousImageKey = getWirelessDeviceImageKey(previousDevice);
                                                    const previousPorts = previousImageKey ? (wirelessPortsByType[previousImageKey] || []) : [];
                                                    const previousPort = findExtDevicePort(previousDevice, previousPorts, link.moduleFrom);
                                                    if (!previousPort) return;
                                                    const previousSize = getExtModuleSize(previousDevice);
                                                    const previousSlotY = getExtSlotY(slotIndex - 1);
                                                    const previousBaseSlotY = getExtSlotY(slotIndex - 1, true);
                                                    fromY = previousSlotY + previousPort.y * previousSize.height;
                                                    baseFromY = previousBaseSlotY + previousPort.y * previousSize.height;
                                                    sourceHopBendY = previousSlotY + previousSize.height + link.moduleHopBendIndent * indentSize;
                                                    baseSourceHopBendY = previousBaseSlotY + previousSize.height + link.moduleHopBendIndent * indentSize;
                                                }
                                                const defaultBendY = Math.max(fromY, toY) + (linkIndex + 1) * indentSize;
                                                const hopBendY = slotY + size.height + (slotIndex === 0 ? link.firstHopBendIndent : link.moduleHopBendIndent) * indentSize;
                                                const baseDefaultBendY = Math.max(baseFromY, baseToY) + (linkIndex + 1) * indentSize;
                                                const baseHopBendY = baseSlotY + size.height + (slotIndex === 0 ? link.firstHopBendIndent : link.moduleHopBendIndent) * indentSize;
                                                includeBottom(Math.max(defaultBendY, hopBendY, sourceHopBendY, baseDefaultBendY, baseHopBendY, baseSourceHopBendY), 0);
                                            });
                                        });

                                        return lowestBottom + indentSize;
                                    };
                                    const proFirstOneWireMinBendY = getProFirstOneWireMinBendY();
                                    const canAddMore = oneWireDevices.length < oneWireMaxDevices;
                                    const slotsToRenderCount = oneWireDevices.length + ((canAddMore && showEmptySlots) ? 1 : 0);
                                    const links = [
                                        { name: '1-WIRE-V+', offset: 1 * indentSize, color: '#d32f2f' },
                                        { name: '1-WIRE-DAT', offset: 2 * indentSize, color: '#fbc02d' },
                                        { name: '1-WIRE-GND', offset: 3 * indentSize, color: '#212121' },
                                    ];
                                    const getOneWireSlotDimensions = (slotDevice) => {
                                        if (!slotDevice) {
                                            return { width: ONE_WIRE_SLOT_SIZE, height: ONE_WIRE_SLOT_SIZE };
                                        }
                                        const slotType = canonicalDeviceType(slotDevice.type);
                                        if (slotType === 'thermostat') {
                                            return { width: ONE_WIRE_THERMOSTAT_SIZE, height: ONE_WIRE_THERMOSTAT_SIZE };
                                        }
                                        const isModuleWithNativeSize = slotType === 'ntc-1-wire' || slotType === 'rdt2';
                                        if (!isModuleWithNativeSize) {
                                            return { width: ONE_WIRE_SLOT_SIZE, height: ONE_WIRE_SLOT_SIZE };
                                        }
                                        const slotImageKey = getWirelessDeviceImageKey(slotDevice);
                                        const slotImage = slotImageKey ? wirelessImages[slotImageKey] : null;
                                        if (!slotImage?.width || !slotImage?.height) {
                                            return { width: ONE_WIRE_SLOT_SIZE, height: ONE_WIRE_SLOT_SIZE };
                                        }
                                        return { width: slotImage.width, height: slotImage.height };
                                    };
                                    const getSlotPositionByOffsets = (slotIndex, offsets) => {
                                        const firstDevice = oneWireDevices[0] || null;
                                        return getOneWireSlotPosition({
                                            slotIndex,
                                            devices: oneWireDevices,
                                            offsets,
                                            getDeviceSize: getOneWireSlotDimensions,
                                            getOffsetKey: getOneWireOffsetKey,
                                            firstSlotX: oneWireGeometry.firstSlotX,
                                            firstSlotY: oneWireGeometry.firstSlotY,
                                            firstSlotExtraY: controllerType === 'ecosmart'
                                                ? (5 + getEcosmartFirstOneWireExtraDown(firstDevice)) * indentSize
                                                : 0,
                                            indentSize,
                                            moduleHeightValue,
                                        });
                                    };
                                    const getSlotPosition = (slotIndex) => getSlotPositionByOffsets(slotIndex, oneWireSlotOffsets);
                                    const getDevicePorts = (device) => {
                                        if (!device) return ONE_WIRE_SLOT_FAKE_PORTS;
                                        const imageKey = getWirelessDeviceImageKey(device);
                                        return wirelessPortsByType[imageKey] || [];
                                    };
                                    const getPortMap = (portDevice, portsList, preferredDirection = null) => ({
                                        '1-WIRE-V+': getAnchoredOneWirePort(portDevice, '1-WIRE-V+', preferredDirection) || getOneWirePortByRole(portsList, '1-WIRE-V+', preferredDirection),
                                        '1-WIRE-DAT': getAnchoredOneWirePort(portDevice, '1-WIRE-DAT', preferredDirection) || getOneWirePortByRole(portsList, '1-WIRE-DAT', preferredDirection),
                                        '1-WIRE-GND': getAnchoredOneWirePort(portDevice, '1-WIRE-GND', preferredDirection) || getOneWirePortByRole(portsList, '1-WIRE-GND', preferredDirection),
                                    });
                                    return (
                                        <>
                                            {showLineFrames && slotsToRenderCount > 0 && (() => {
                                                const slotRects = Array.from({ length: slotsToRenderCount }).map((_, slotIndex) => {
                                                    const slotDevice = oneWireDevices[slotIndex] || null;
                                                    const size = getOneWireSlotDimensions(slotDevice);
                                                    const pos = getSlotPosition(slotIndex);
                                                    return { left: pos.x, top: pos.y, right: pos.x + size.width, bottom: pos.y + size.height };
                                                });
                                                const minX = Math.min(...slotRects.map((r) => r.left));
                                                const minY = Math.min(...slotRects.map((r) => r.top));
                                                const maxX = Math.max(...slotRects.map((r) => r.right));
                                                const maxY = Math.max(...slotRects.map((r) => r.bottom));
                                                return (
                                                    <Rect
                                                        x={minX - 10}
                                                        y={minY - 10}
                                                        width={maxX - minX + 20}
                                                        height={maxY - minY + 20}
                                                        cornerRadius={8}
                                                        fill="rgba(155,122,79,0.2)"
                                                        stroke="#9b7a4f"
                                                        strokeWidth={1}
                                                        dash={[8, 4]}
                                                        opacity={0.68}
                                                        listening={false}
                                                    />
                                                );
                                            })()}
                                            {slotsToRenderCount > 0 && (
                                                <>
                                                    {Array.from({ length: slotsToRenderCount }).map((_, slotIndex) => {
                                                        const device = oneWireDevices[slotIndex] || null;
                                                        const offsetKey = getOneWireOffsetKey(device, slotIndex);
                                                        const collisionId = `onewire:${offsetKey}`;
                                                        const isOccupied = !!device;
                                                        const normalizedOneWireType = canonicalDeviceType(device?.type);
                                                        const slotPos = getSlotPosition(slotIndex);
                                                        const imageKey = device ? getWirelessDeviceImageKey(device) : null;
                                                        const image = imageKey ? wirelessImages[imageKey] : null;
                                                        const isModuleWithNativeSize = normalizedOneWireType === 'ntc-1-wire' || normalizedOneWireType === 'rdt2';
                                                        const isOneWireThermostat = normalizedOneWireType === 'thermostat';
                                                        const slotWidth = isModuleWithNativeSize && image?.width
                                                            ? image.width
                                                            : isOneWireThermostat
                                                                ? ONE_WIRE_THERMOSTAT_SIZE
                                                                : ONE_WIRE_SLOT_SIZE;
                                                        const slotHeight = isModuleWithNativeSize && image?.height
                                                            ? image.height
                                                            : isOneWireThermostat
                                                                ? ONE_WIRE_THERMOSTAT_SIZE
                                                                : ONE_WIRE_SLOT_SIZE;
                                                        const hideInfoBlock = isModuleWithNativeSize;
                                                        const isHovered = hoveredOneWireSlotIndex === slotIndex;
                                                        const currentPorts = getPortMap(
                                                            device,
                                                            getDevicePorts(device),
                                                            getOneWireDirectionForDevice(device, 'target'),
                                                        );
                                                        return (
                                                            <Group
                                                                key={`one-wire-slot-${offsetKey}`}
                                                                ref={(node) => {
                                                                    if (node) {
                                                                        oneWireDragNodeRefs.current[offsetKey] = node;
                                                                        moduleCollisionNodeRefs.current[collisionId] = node;
                                                                    } else {
                                                                        delete oneWireDragNodeRefs.current[offsetKey];
                                                                        delete moduleCollisionNodeRefs.current[collisionId];
                                                                    }
                                                                }}
                                                                draggable
                                                                dragBoundFunc={() => {
                                                                    const node = oneWireDragNodeRefs.current[offsetKey];
                                                                    const parent = node?.getParent();
                                                                    return parent
                                                                        ? parent.getAbsoluteTransform().point({ x: 0, y: 0 })
                                                                        : (node?.getAbsolutePosition() || { x: 0, y: 0 });
                                                                }}
                                                                onDragStart={(event) => {
                                                                    oneWireDragStartOffsetsRef.current[offsetKey] = oneWireSlotOffsets[offsetKey] || { x: 0, y: 0 };
                                                                    oneWireDragStartPointerRef.current[offsetKey] = event.target.getStage()?.getPointerPosition() || { x: 0, y: 0 };
                                                                    oneWireDragDraftOffsetsRef.current[offsetKey] = oneWireSlotOffsets[offsetKey] || { x: 0, y: 0 };
                                                                    setInvalidOneWireDragMap((prev) => ({ ...prev, [offsetKey]: false }));
                                                                }}
                                                                onMouseEnter={() => setHoveredOneWireSlotIndex(slotIndex)}
                                                                onMouseLeave={() => setHoveredOneWireSlotIndex(null)}
                                                                onDragMove={(event) => {
                                                                    const stage = event.target.getStage();
                                                                    const pointer = stage?.getPointerPosition();
                                                                    if (!stage || !pointer) return;
                                                                    const startPointer = oneWireDragStartPointerRef.current[offsetKey] || pointer;
                                                                    const startOffset = oneWireDragStartOffsetsRef.current[offsetKey] || { x: 0, y: 0 };
                                                                    const stageScale = stage.scaleX() || 1;
                                                                    const draftOffset = {
                                                                        x: startOffset.x + (pointer.x - startPointer.x) / stageScale,
                                                                        y: startOffset.y + (pointer.y - startPointer.y) / stageScale,
                                                                    };
                                                                    oneWireDragDraftOffsetsRef.current[offsetKey] = draftOffset;
                                                                    if (oneWireDragFrameRef.current !== null) return;
                                                                    oneWireDragFrameRef.current = window.requestAnimationFrame(() => {
                                                                        oneWireDragFrameRef.current = null;
                                                                        const latestDraftOffset = oneWireDragDraftOffsetsRef.current[offsetKey] || draftOffset;
                                                                        setOneWireSlotOffsets((prev) => ({ ...prev, [offsetKey]: latestDraftOffset }));
                                                                        const draftOffsets = { ...oneWireSlotOffsets, [offsetKey]: latestDraftOffset };
                                                                        const collisionData = getAllOccupiedRects(
                                                                            controllerImage,
                                                                            scheme,
                                                                            showEmptySlots,
                                                                            memoWirelessOffsetsByLine,
                                                                            draftOffsets,
                                                                            extSlotOffsets,
                                                                            diSlotOffsets,
                                                                            useInitialOneWireBalance ? memoBalancedOneWire.extDevicesByModuleIndex : null,
                                                                        );
                                                                        const slotPosDraft = getSlotPositionByOffsets(slotIndex, draftOffsets);
                                                                        const targetBodyRect = {
                                                                            left: slotPosDraft.x,
                                                                            top: slotPosDraft.y,
                                                                            right: slotPosDraft.x + slotWidth,
                                                                            bottom: slotPosDraft.y + slotHeight,
                                                                        };
                                                                        const targetRect = getModuleObjectFootprint(collisionId, {
                                                                            left: slotPos.x,
                                                                            top: slotPos.y,
                                                                            right: slotPos.x + slotWidth,
                                                                            bottom: slotPos.y + slotHeight,
                                                                        }, targetBodyRect, showEmptySlots);
                                                                        const collides = Boolean(collisionData) && (
                                                                            rectsOverlap(targetRect, collisionData.controllerRect)
                                                                            || collisionData.rects.some((rect) => rect.id !== collisionId && rectsOverlap(targetRect, rect))
                                                                        );
                                                                        setInvalidOneWireDragMap((prev) => (
                                                                            prev[offsetKey] === collides ? prev : { ...prev, [offsetKey]: collides }
                                                                        ));
                                                                    });
                                                                }}
                                                                onDragEnd={(event) => {
                                                                    if (oneWireDragFrameRef.current !== null) {
                                                                        window.cancelAnimationFrame(oneWireDragFrameRef.current);
                                                                        oneWireDragFrameRef.current = null;
                                                                    }
                                                                    const startOffset = oneWireDragStartOffsetsRef.current[offsetKey] || { x: 0, y: 0 };
                                                                    const nextOffset = oneWireDragDraftOffsetsRef.current[offsetKey] || startOffset;
                                                                    const nextOffsets = { ...oneWireSlotOffsets, [offsetKey]: nextOffset };
                                                                    const collisionData = getAllOccupiedRects(
                                                                        controllerImage,
                                                                        scheme,
                                                                        showEmptySlots,
                                                                        memoWirelessOffsetsByLine,
                                                                        nextOffsets,
                                                                        extSlotOffsets,
                                                                        diSlotOffsets,
                                                                        useInitialOneWireBalance ? memoBalancedOneWire.extDevicesByModuleIndex : null,
                                                                    );
                                                                    const targetRect = collisionData?.rects?.find((r) => r.id === collisionId);
                                                                    if (collisionData && targetRect && hasCollisionFor(targetRect.id, targetRect, collisionData.rects, collisionData.controllerRect)) {
                                                                        setOneWireSlotOffsets((prev) => ({ ...prev, [offsetKey]: startOffset }));
                                                                        event.target.getLayer()?.batchDraw();
                                                                        setInvalidOneWireDragMap((prev) => ({ ...prev, [offsetKey]: false }));
                                                                        delete oneWireDragStartOffsetsRef.current[offsetKey];
                                                                        delete oneWireDragStartPointerRef.current[offsetKey];
                                                                        delete oneWireDragDraftOffsetsRef.current[offsetKey];
                                                                        event.target.position({ x: 0, y: 0 });
                                                                        return;
                                                                    }
                                                                    setOneWireSlotOffsets((prev) => ({ ...prev, [offsetKey]: nextOffset }));
                                                                    setInvalidOneWireDragMap((prev) => ({ ...prev, [offsetKey]: false }));
                                                                    delete oneWireDragStartOffsetsRef.current[offsetKey];
                                                                    delete oneWireDragStartPointerRef.current[offsetKey];
                                                                    delete oneWireDragDraftOffsetsRef.current[offsetKey];
                                                                    event.target.position({ x: 0, y: 0 });
                                                                }}
                                                            >
                                                                 {isOccupied && !hideInfoBlock && (
                                                                    <>
                                                                        <Rect
                                                                            x={slotPos.x}
                                                                            y={slotPos.y - (INFO_BLOCK_HEIGHT + 14)}
                                                                            width={slotWidth}
                                                                            height={INFO_BLOCK_HEIGHT}
                                                                            cornerRadius={1}
                                                                            fill={INFO_BLOCK_FILL}
                                                                            stroke={INFO_BLOCK_STROKE}
                                                                            strokeWidth={INFO_BLOCK_STROKE_WIDTH}
                                                                        />
                                                                        <EditableInfoTitle
                                                                            x={slotPos.x + 4}
                                                                            y={slotPos.y - (INFO_BLOCK_HEIGHT + 14)}
                                                                            text={getDeviceStoredTitle(device) || getOneWireDeviceTitle(oneWireDevices, device, slotIndex)}
                                                                            fontSize={4}
                                                                            fill={INFO_BLOCK_TEXT_COLOR}
                                                                            width={slotWidth - 8}
                                                                            height={INFO_BLOCK_HEIGHT}
                                                                            align="center"
                                                                            verticalAlign="middle"
                                                                            device={device}
                                                                            title={getDeviceStoredTitle(device) || getOneWireDeviceTitle(oneWireDevices, device, slotIndex)}
                                                                        />
                                                                    </>
                                                                 )}
                                                                 <Rect
                                                                    x={slotPos.x}
                                                                    y={slotPos.y}
                                                                    width={slotWidth}
                                                                    height={slotHeight}
                                                                    cornerRadius={10}
                                                                    fill={invalidOneWireDragMap[offsetKey] ? 'rgba(211, 47, 47, 0.08)' : (isOccupied ? TRANSPARENT_FILL : EMPTY_SLOT_FILL)}
                                                                    stroke={invalidOneWireDragMap[offsetKey] ? '#d32f2f' : (isOccupied ? TRANSPARENT_FILL : EMPTY_SLOT_STROKE)}
                                                                    strokeWidth={1.5}
                                                                />
                                                                 {image && (
                                                                     <Image
                                                                        name={`morph:${getMorphImageKey(device)}`}
                                                                        image={image}
                                                                        x={slotPos.x}
                                                                        y={slotPos.y}
                                                                        width={slotWidth}
                                                                        height={slotHeight}
                                                                         listening={false}
                                                                     />
                                                                 )}
                                                                 {isOccupied && isBundledSensorDevice(memoBundledSensorDevices, device) && <KitBadge x={slotPos.x} y={slotPos.y + 1} />}
                                                                 {normalizedOneWireType === 'rdt2' && aerialImage && (() => {
                                                                    const aerialPorts = getPortsByClassToken(getDevicePorts(device), 'AERIAL');
                                                                    if (!aerialPorts) return null;
                                                                    return aerialPorts.map((aerialPort, portIndex) => {
                                                                        const portX = slotPos.x + aerialPort.x * slotWidth;
                                                                        const portCenterY = slotPos.y + aerialPort.y * slotHeight;
                                                                        const portHeight = (aerialPort.height || 0) * slotHeight;
                                                                        const portTopY = portCenterY - portHeight / 2;
                                                                        const width = aerialImage.width || AERIAL_WIDTH;
                                                                        const height = aerialImage.height || AERIAL_HEIGHT;
                                                                        return (
                                                                            <Image
                                                                                key={`onewire-rdt2-aerial-${slotIndex}-${portIndex}`}
                                                                                image={aerialImage}
                                                                                x={portX - width / 2}
                                                                                y={portTopY - height}
                                                                                width={width}
                                                                                height={height}
                                                                                listening={false}
                                                                            />
                                                                        );
                                                                    });
                                                                })()}
                                                                {normalizedOneWireType === 'ntc-1-wire' && (() => {
                                                                    const ntcSlotWidth = 11 * indentSize;
                                                                    const ntcSlotHeight = 7 * indentSize;
                                                                    const ntcSlotGap = 3 * indentSize;
                                                                    const lineX = slotPos.x - ntcSlotWidth;
                                                                    const lineTotalHeight = NTC_LINE_SLOTS_COUNT * ntcSlotHeight + (NTC_LINE_SLOTS_COUNT - 1) * ntcSlotGap;
                                                                    const lineY = slotPos.y - lineTotalHeight;
                                                                    return Array.from({ length: NTC_LINE_SLOTS_COUNT }).map((_, ntcIndex) => {
                                                                        const sensor = getNtcSensorFromDeviceLine(device, scheme, ntcIndex, 'ntc1_devices');
                                                                        if (!sensor && !showEmptySlots) return null;
                                                                        const ntcSensorKey = getWirelessDeviceImageKey({ ...(sensor || { type: 'ntc-sensor' }), port_side: 'right' });
                                                                        const ntcSensorImage = wirelessImages[ntcSensorKey] || null;
                                                                        const ntcSensorPorts = wirelessPortsByType[ntcSensorKey] || [];
                                                                        const slotVisualWidth = canonicalDeviceType(sensor?.type) === 'wall-ntc-sensor' ? ntcSlotHeight : ntcSlotWidth;
                                                                        const slotX = lineX + ntcSlotWidth - slotVisualWidth;
                                                                        const slotY = lineY + (NTC_LINE_SLOTS_COUNT - 1 - ntcIndex) * (ntcSlotHeight + ntcSlotGap);
                                                                        const ntcHoverKey = `main:${slotIndex}:${ntcIndex}`;
                                                                        const isNtcHovered = hoveredNtcSlotKey === ntcHoverKey;
                                                                        const ntcChannel = getNtcChannelBySlot(ntcIndex, 'ntc1_devices');
                                                                        const sensorTitle = getNtcSensorTitle(scheme, sensor, ntcChannel);
                                                                        const sensorPortA = ntcSensorPorts.find((port) => port.name === 'NTC-A') || ntcSensorPorts.find((port) => String(port?.name || '').startsWith('NTC-')) || null;
                                                                        const sensorPortB = ntcSensorPorts.find((port) => port.name === 'NTC-B') || sensorPortA;
                                                                        const sensorRenderSize = ntcSensorImage
                                                                            ? getContainSize(ntcSensorImage, slotVisualWidth, ntcSlotHeight)
                                                                            : { width: slotVisualWidth, height: ntcSlotHeight };
                                                                        const sensorRenderX = slotX + (slotVisualWidth - sensorRenderSize.width) / 2;
                                                                        const sensorRenderY = slotY + (ntcSlotHeight - sensorRenderSize.height) / 2;
                                                                        const sensorPortAX = sensorPortA ? sensorRenderX + sensorPortA.x * sensorRenderSize.width : slotX + slotVisualWidth;
                                                                        const sensorPortAY = sensorPortA ? sensorRenderY + sensorPortA.y * sensorRenderSize.height : slotY + ntcSlotHeight / 2;
                                                                        const sensorPortBX = sensorPortB ? sensorRenderX + sensorPortB.x * sensorRenderSize.width : slotX + slotVisualWidth;
                                                                        const sensorPortBY = sensorPortB ? sensorRenderY + sensorPortB.y * sensorRenderSize.height : slotY + ntcSlotHeight / 2;
                                                                        const modulePorts = getDevicePorts(device);
                                                                        const modulePortA = modulePorts.find((port) => port.name === `NTC-${ntcChannel}-A`);
                                                                        const modulePortB = modulePorts.find((port) => port.name === `NTC-${ntcChannel}-B`);
                                                                        return (
                                                                            <Group
                                                                                key={`onewire-ntc1-slot-${slotIndex}-${ntcIndex}`}
                                                                                onMouseEnter={() => setHoveredNtcSlotKey(ntcHoverKey)}
                                                                                onMouseLeave={() => setHoveredNtcSlotKey((prev) => (prev === ntcHoverKey ? null : prev))}
                                                                            >
                                                                                {sensor && ntcSensorImage && (
                                                                                    <Image image={ntcSensorImage} x={sensorRenderX} y={sensorRenderY} width={sensorRenderSize.width} height={sensorRenderSize.height} listening={false} />
                                                                                )}
                                                                                {sensor && modulePortA && (
                                                                                    <Line
                                                                                        points={[
                                                                                            sensorPortAX,
                                                                                            sensorPortAY,
                                                                                            slotPos.x + modulePortA.x * slotWidth,
                                                                                            sensorPortAY,
                                                                                            slotPos.x + modulePortA.x * slotWidth,
                                                                                            slotPos.y + modulePortA.y * slotHeight,
                                                                                        ]}
                                                                                        stroke="#212121"
                                                                                        strokeWidth={1}
                                                                                        lineCap="round"
                                                                                        lineJoin="round"
                                                                                        listening={false}
                                                                                    />
                                                                                )}
                                                                                {sensor && modulePortB && (
                                                                                    <Line
                                                                                        points={[
                                                                                            sensorPortBX,
                                                                                            sensorPortBY,
                                                                                            slotPos.x + modulePortB.x * slotWidth,
                                                                                            sensorPortBY,
                                                                                            slotPos.x + modulePortB.x * slotWidth,
                                                                                            slotPos.y + modulePortB.y * slotHeight,
                                                                                        ]}
                                                                                        stroke="#464EE3"
                                                                                        strokeWidth={1}
                                                                                        lineCap="round"
                                                                                        lineJoin="round"
                                                                                        listening={false}
                                                                                    />
                                                                                )}
                                                                                    <Rect
                                                                                        name="module-device-slot"
                                                                                        collisionOccupied={Boolean(sensor)}
                                                                                        x={slotX}
                                                                                    y={slotY}
                                                                                    width={slotVisualWidth}
                                                                                    height={ntcSlotHeight}
                                                                                    cornerRadius={6}
                                                                                    fill={sensor ? TRANSPARENT_FILL : EMPTY_SLOT_FILL}
                                                                                    stroke={sensor ? TRANSPARENT_FILL : EMPTY_SLOT_STROKE}
                                                                                    strokeWidth={1.2}
                                                                                />
                                                                                {showPorts && sensor && ntcSensorPorts.map((port) => (
                                                                                    <Circle
                                                                                        key={`onewire-ntc1-port-${slotIndex}-${ntcIndex}-${port.name}`}
                                                                                        x={sensorRenderX + port.x * sensorRenderSize.width}
                                                                                        y={sensorRenderY + port.y * sensorRenderSize.height}
                                                                                        radius={2.5}
                                                                                        fill="red"
                                                                                        listening={false}


                                                                                    />
                                                                                ))}
                                                                                {sensor && (
                                                                                    <>
                                                                                        <Rect x={slotX} y={slotY - (INFO_BLOCK_HEIGHT + 4)} width={slotVisualWidth} height={INFO_BLOCK_HEIGHT} cornerRadius={1} fill={INFO_BLOCK_FILL} stroke={INFO_BLOCK_STROKE} strokeWidth={INFO_BLOCK_STROKE_WIDTH} />
                                                                                        <EditableInfoTitle x={slotX + 3} y={slotY - (INFO_BLOCK_HEIGHT + 4)} width={Math.max(30, slotVisualWidth - 6)} height={INFO_BLOCK_HEIGHT} text={sensorTitle} fontSize={4} fill={INFO_BLOCK_TEXT_COLOR} align="center" verticalAlign="middle" device={sensor} title={sensorTitle} />
                                                                                    </>
                                                                                )}
                                                                                {sensor && isNtcHovered && (
                                                                                    <SlotDeleteButton
                                                                                        x={slotX + slotVisualWidth - 2.5}
                                                                                        y={slotY + 1.5}
                                                                                        onRemove={() => removeOneWireNtcSensorAtSlot(slotIndex, ntcIndex)}
                                                                                    />
                                                                                )}
                                                                                 {!sensor && showEmptySlots && (
                                                                                     <>
                                                                                        <EditableInfoTitle x={slotX + ntcSlotWidth - 13}
                                                                                            y={slotY + 2}
                                                                                            width={10}
                                                                                            height={10}
                                                                                            text={String(ntcChannel)}
                                                                                            fontSize={7}
                                                                                            fill="#7b8494"
                                                                                            align="right"
                                                                                            listening={false}
                                                                                        />
                                                                                         <Circle
                                                                                             x={slotX + ntcSlotWidth / 2}
                                                                                             y={slotY + ntcSlotHeight / 2}
                                                                                            radius={10}
                                                                                            fill={ADD_ACTION_FILL}
                                                                                            onClick={(event) => {
                                                                                                const pos = event.target.getAbsolutePosition();
                                                                                                setNtcSlotMenuPos({ x: pos.x, y: pos.y, owner: 'controller', slotIndex, ntcSlotIndex: ntcIndex, lineKey: 'ntc1_devices' });
                                                                                            }}
                                                                                            onTap={(event) => {
                                                                                                const pos = event.target.getAbsolutePosition();
                                                                                                setNtcSlotMenuPos({ x: pos.x, y: pos.y, owner: 'controller', slotIndex, ntcSlotIndex: ntcIndex, lineKey: 'ntc1_devices' });
                                                                                            }}
                                                                                        />
                                                                                        <Text
                                                                                            x={slotX + ntcSlotWidth / 2}
                                                                                            y={slotY + ntcSlotHeight / 2}
                                                                                            text="+"
                                                                                            fontSize={15}
                                                                                            fill={INFO_BLOCK_FILL}
                                                                                            offsetX={4.5}
                                                                                            offsetY={6}
                                                                                            listening={false}
                                                                                        />
                                                                                    </>
                                                                                )}
                                                                            </Group>
                                                                        );
                                                                    });
                                                                })()}
                                                                {normalizedOneWireType === 'ntc-1-wire' && (() => {
                                                                    const ntcSlotWidth = 11 * indentSize;
                                                                    const ntcSlotHeight = 7 * indentSize;
                                                                    const ntcSlotGap = 3 * indentSize;
                                                                    const lineX = slotPos.x + slotWidth;
                                                                    const lineTotalHeight = NTC_LINE_SLOTS_COUNT * ntcSlotHeight + (NTC_LINE_SLOTS_COUNT - 1) * ntcSlotGap;
                                                                    const lineY = slotPos.y - lineTotalHeight;
                                                                    return Array.from({ length: NTC_LINE_SLOTS_COUNT }).map((_, ntcIndex) => {
                                                                        const sensor = getNtcSensorFromDeviceLine(device, scheme, ntcIndex, 'ntc2_devices');
                                                                        if (!sensor && !showEmptySlots) return null;
                                                                        const ntcSensorKey = getWirelessDeviceImageKey({ ...(sensor || { type: 'ntc-sensor' }), port_side: 'left' });
                                                                        const ntcSensorImage = wirelessImages[ntcSensorKey] || null;
                                                                        const ntcSensorPorts = wirelessPortsByType[ntcSensorKey] || [];
                                                                        const slotVisualWidth = canonicalDeviceType(sensor?.type) === 'wall-ntc-sensor' ? ntcSlotHeight : ntcSlotWidth;
                                                                        const slotX = lineX;
                                                                        const slotY = lineY + ntcIndex * (ntcSlotHeight + ntcSlotGap);
                                                                        const ntcHoverKey = `main2:${slotIndex}:${ntcIndex}`;
                                                                        const isNtcHovered = hoveredNtcSlotKey === ntcHoverKey;
                                                                        const ntcChannel = getNtcChannelBySlot(ntcIndex, 'ntc2_devices');
                                                                        const sensorTitle = getNtcSensorTitle(scheme, sensor, ntcChannel);
                                                                        const sensorPortA = ntcSensorPorts.find((port) => port.name === 'NTC-A') || ntcSensorPorts.find((port) => String(port?.name || '').startsWith('NTC-')) || null;
                                                                        const sensorPortB = ntcSensorPorts.find((port) => port.name === 'NTC-B') || sensorPortA;
                                                                        const sensorRenderSize = ntcSensorImage
                                                                            ? getContainSize(ntcSensorImage, slotVisualWidth, ntcSlotHeight)
                                                                            : { width: slotVisualWidth, height: ntcSlotHeight };
                                                                        const sensorRenderX = slotX + (slotVisualWidth - sensorRenderSize.width) / 2;
                                                                        const sensorRenderY = slotY + (ntcSlotHeight - sensorRenderSize.height) / 2;
                                                                        const sensorPortAX = sensorPortA ? sensorRenderX + sensorPortA.x * sensorRenderSize.width : slotX;
                                                                        const sensorPortAY = sensorPortA ? sensorRenderY + sensorPortA.y * sensorRenderSize.height : slotY + ntcSlotHeight / 2;
                                                                        const sensorPortBX = sensorPortB ? sensorRenderX + sensorPortB.x * sensorRenderSize.width : slotX;
                                                                        const sensorPortBY = sensorPortB ? sensorRenderY + sensorPortB.y * sensorRenderSize.height : slotY + ntcSlotHeight / 2;
                                                                        const modulePorts = getDevicePorts(device);
                                                                        const modulePortA = modulePorts.find((port) => port.name === `NTC-${ntcChannel}-A`);
                                                                        const modulePortB = modulePorts.find((port) => port.name === `NTC-${ntcChannel}-B`);
                                                                        return (
                                                                            <Group
                                                                                key={`onewire-ntc2-slot-${slotIndex}-${ntcIndex}`}
                                                                                onMouseEnter={() => setHoveredNtcSlotKey(ntcHoverKey)}
                                                                                onMouseLeave={() => setHoveredNtcSlotKey((prev) => (prev === ntcHoverKey ? null : prev))}
                                                                            >
                                                                                {sensor && ntcSensorImage && <Image image={ntcSensorImage} x={sensorRenderX} y={sensorRenderY} width={sensorRenderSize.width} height={sensorRenderSize.height} listening={false} />}
                                                                                {sensor && modulePortA && <Line points={[sensorPortAX, sensorPortAY, slotPos.x + modulePortA.x * slotWidth, sensorPortAY, slotPos.x + modulePortA.x * slotWidth, slotPos.y + modulePortA.y * slotHeight]} stroke="#212121" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />}
                                                                                {sensor && modulePortB && <Line points={[sensorPortBX, sensorPortBY, slotPos.x + modulePortB.x * slotWidth, sensorPortBY, slotPos.x + modulePortB.x * slotWidth, slotPos.y + modulePortB.y * slotHeight]} stroke="#464EE3" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />}
                                                                                <Rect name="module-device-slot" collisionOccupied={Boolean(sensor)} x={slotX} y={slotY} width={slotVisualWidth} height={ntcSlotHeight} cornerRadius={6} fill={sensor ? TRANSPARENT_FILL : EMPTY_SLOT_FILL} stroke={sensor ? TRANSPARENT_FILL : EMPTY_SLOT_STROKE} strokeWidth={1.2} />
                                                                                {showPorts && sensor && ntcSensorPorts.map((port) => <Circle key={`onewire-ntc2-port-${slotIndex}-${ntcIndex}-${port.name}`} x={sensorRenderX + port.x * sensorRenderSize.width} y={sensorRenderY + port.y * sensorRenderSize.height} radius={2.5} fill="red" listening={false} />)}
                                                                                {sensor && <><Rect x={slotX} y={slotY - (INFO_BLOCK_HEIGHT + 4)} width={slotVisualWidth} height={INFO_BLOCK_HEIGHT} cornerRadius={1} fill={INFO_BLOCK_FILL} stroke={INFO_BLOCK_STROKE} strokeWidth={INFO_BLOCK_STROKE_WIDTH} /><EditableInfoTitle x={slotX + 3} y={slotY - (INFO_BLOCK_HEIGHT + 4)} width={Math.max(30, slotVisualWidth - 6)} height={INFO_BLOCK_HEIGHT} text={sensorTitle} fontSize={4} fill={INFO_BLOCK_TEXT_COLOR} align="center" verticalAlign="middle" device={sensor} title={sensorTitle} /></>}
                                                                                {sensor && isNtcHovered && <SlotDeleteButton x={slotX + slotVisualWidth - 2.5} y={slotY + 1.5} onRemove={() => removeOneWireNtcSensorAtSlot(slotIndex, ntcIndex, 'ntc2_devices')} />}
                                                                                {!sensor && showEmptySlots && <><EditableInfoTitle x={slotX + ntcSlotWidth - 13} y={slotY + 2} width={10} height={10} text={String(ntcChannel)} fontSize={7} fill="#7b8494" align="right" listening={false} /><Circle x={slotX + ntcSlotWidth / 2} y={slotY + ntcSlotHeight / 2} radius={10} fill={ADD_ACTION_FILL} onClick={(event) => { const pos = event.target.getAbsolutePosition(); setNtcSlotMenuPos({ x: pos.x, y: pos.y, owner: 'controller', slotIndex, ntcSlotIndex: ntcIndex, lineKey: 'ntc2_devices' }); }} onTap={(event) => { const pos = event.target.getAbsolutePosition(); setNtcSlotMenuPos({ x: pos.x, y: pos.y, owner: 'controller', slotIndex, ntcSlotIndex: ntcIndex, lineKey: 'ntc2_devices' }); }} /><Text x={slotX + ntcSlotWidth / 2} y={slotY + ntcSlotHeight / 2} text="+" fontSize={15} fill={ADD_ACTION_TEXT_FILL} offsetX={4.5} offsetY={6} listening={false} /></>}
                                                                            </Group>
                                                                        );
                                                                    });
                                                                })()}
                                                                {isOccupied && isHovered && (
                                                                    <SlotDeleteButton compact x={slotPos.x + slotWidth - 2.5} y={slotPos.y + 1.5} onRemove={() => removeOneWireDeviceAtSlot(slotIndex)} />
                                                                )}
                                                                {!isOccupied && (
                                                                    <>
                                                                        <Circle
                                                                            x={slotPos.x + slotWidth / 2}
                                                                            y={slotPos.y + slotHeight / 2}
                                                                            radius={16}
                                                                            fill={ADD_ACTION_FILL}
                                                                            onClick={(e) => {
                                                                                const pos = e.target.getAbsolutePosition();
                                                                                setOneWireMenuPos({ x: pos.x, y: pos.y, slotIndex });
                                                                            }}
                                                                            onTap={(e) => {
                                                                                const pos = e.target.getAbsolutePosition();
                                                                                setOneWireMenuPos({ x: pos.x, y: pos.y, slotIndex });
                                                                            }}
                                                                        />
                                                                        <Text
                                                                            x={slotPos.x + slotWidth / 2}
                                                                            y={slotPos.y + slotHeight / 2}
                                                                            text="+"
                                                                            fontSize={22}
                                                                            fill={INFO_BLOCK_FILL}
                                                                            offsetX={6.5}
                                                                            offsetY={9}
                                                                            listening={false}
                                                                        />
                                                                    </>
                                                                )}
                                                                {showPorts && isOccupied && (getAnchoredOneWirePortsForDisplay(device, getDevicePorts(device)) || getDevicePorts(device)).map((port) => (
                                                                    <Circle
                                                                        key={`one-wire-slot-${slotIndex}-${port.name}`}
                                                                        x={slotPos.x + port.x * slotWidth}
                                                                        y={slotPos.y + port.y * slotHeight}
                                                                        radius={2.5}
                                                                        fill="red"


                                                                    />
                                                                ))}
                                                                {showPorts && !isOccupied && ONE_WIRE_SLOT_FAKE_PORTS.map((port) => (
                                                                    <Circle
                                                                        key={`one-wire-slot-${slotIndex}-${port.name}`}
                                                                        x={slotPos.x + port.x}
                                                                        y={slotPos.y + port.y}
                                                                        radius={2.5}
                                                                        fill="red"


                                                                    />
                                                                ))}
                                                                {(() => {
                                                                    const lineSegments = links.map((link) => {
                                                                    const toPort = currentPorts[link.name];
                                                                    if (!toPort) return null;
                                                                    let fromX;
                                                                    let fromY;
                                                                    let previousDevice = null;
                                                                    let previousPos = null;
                                                                    let previousSlotHeight = ONE_WIRE_SLOT_SIZE;
                                                                    let previousType = null;
                                                                    let sourcePortName = '';
                                                                    if (slotIndex === 0) {
                                                                        const fromControllerPort = ports.find((port) => port.name === link.name);
                                                                        if (!fromControllerPort) return null;
                                                                        sourcePortName = typeof fromControllerPort.name === 'string' ? fromControllerPort.name.toUpperCase() : '';
                                                                        fromX = fromControllerPort.x * controllerImage.width;
                                                                        fromY = fromControllerPort.y * controllerImage.height;
                                                                    } else {
                                                                        previousDevice = oneWireDevices[slotIndex - 1] || null;
                                                                        previousType = canonicalDeviceType(previousDevice?.type);
                                                                        const previousPorts = getPortMap(
                                                                            previousDevice,
                                                                            getDevicePorts(previousDevice),
                                                                            getOneWireDirectionForDevice(previousDevice, 'source'),
                                                                        );
                                                                        const fromPort = previousPorts[link.name];
                                                                        if (!fromPort) return null;
                                                                        sourcePortName = typeof fromPort.name === 'string' ? fromPort.name.toUpperCase() : '';
                                                                        previousPos = getSlotPosition(slotIndex - 1);
                                                                        const previousImageKey = previousDevice ? getWirelessDeviceImageKey(previousDevice) : null;
                                                                        const previousImage = previousImageKey ? wirelessImages[previousImageKey] : null;
                                                                        const previousIsModuleWithNativeSize = previousType === 'ntc-1-wire' || previousType === 'rdt2';
                                                                        const previousIsThermostat = previousType === 'thermostat';
                                                                        const previousFallbackSize = previousIsThermostat ? ONE_WIRE_THERMOSTAT_SIZE : ONE_WIRE_SLOT_SIZE;
                                                                        const previousSlotWidth = previousIsModuleWithNativeSize && previousImage?.width ? previousImage.width : previousFallbackSize;
                                                                        previousSlotHeight = previousIsModuleWithNativeSize && previousImage?.height ? previousImage.height : previousFallbackSize;
                                                                        fromX = previousDevice
                                                                            ? previousPos.x + fromPort.x * previousSlotWidth
                                                                            : previousPos.x + fromPort.x;
                                                                        fromY = previousDevice
                                                                            ? previousPos.y + fromPort.y * previousSlotHeight
                                                                            : previousPos.y + fromPort.y;
                                                                    }
                                                                    const toX = isOccupied
                                                                        ? slotPos.x + toPort.x * slotWidth
                                                                        : slotPos.x + toPort.x;
                                                                    const toY = isOccupied
                                                                        ? slotPos.y + toPort.y * slotHeight
                                                                        : slotPos.y + toPort.y;
                                                                    if (slotIndex === 0 && controllerType === 'ecosmart') {
                                                                        const offsetMultiplier = link.name === '1-WIRE-V+'
                                                                            ? 1
                                                                            : link.name === '1-WIRE-DAT'
                                                                                ? 2
                                                                                : 3;
                                                                         const upY = -offsetMultiplier * indentSize;
                                                                         const leftX = -(offsetMultiplier + 6) * indentSize;
                                                                         const isFirstDeviceModule = normalizedOneWireType === 'ntc-1-wire' || normalizedOneWireType === 'rdt2';
                                                                         const emptySlotDetourIndent = link.name === '1-WIRE-V+'
                                                                             ? 1
                                                                             : (link.name === '1-WIRE-DAT'
                                                                                 ? 2
                                                                                 : (link.name === '1-WIRE-GND' ? 3 : 0));
                                                                         if (!isOccupied && emptySlotDetourIndent > 0) {
                                                                             const slotBottomY = slotPos.y + slotHeight;
                                                                             const detourY = slotBottomY + emptySlotDetourIndent * indentSize;
                                                                              return {
                                                                                  key: `one-wire-link-${slotIndex}-${link.name}`,
                                                                                  role: link.name,
                                                                                  points: [fromX, fromY, fromX, upY, leftX, upY, leftX, detourY, toX, detourY, toX, slotBottomY],
                                                                              };
                                                                         }
                                                                         if (isFirstDeviceModule) {
                                                                            const moduleBottomY = slotPos.y + slotHeight;
                                                                            const downY = moduleBottomY + offsetMultiplier * indentSize;
                                                                             return {
                                                                                 key: `one-wire-link-${slotIndex}-${link.name}`,
                                                                                 role: link.name,
                                                                                 points: [fromX, fromY, fromX, upY, leftX, upY, leftX, downY, toX, downY, toX, toY],
                                                                             };
                                                                        }
                                                                         return {
                                                                             key: `one-wire-link-${slotIndex}-${link.name}`,
                                                                             role: link.name,
                                                                             points: [fromX, fromY, fromX, upY, leftX, upY, leftX, toY, toX, toY],
                                                                         };
                                                                    }
                                                                    const targetType = canonicalDeviceType(device?.type);
                                                                    if (targetType === 'wall-digital-sensor' && !(slotIndex === 0 && (controllerType === 'go' || controllerType === 'go+'))) {
                                                                        return {
                                                                            key: `one-wire-link-${slotIndex}-${link.name}`,
                                                                            role: link.name,
                                                                            points: [toX, toY, fromX, toY, fromX, fromY],
                                                                        };
                                                                    }
                                                                    const isTargetThermostat = targetType === 'thermostat' || isFlaskSensorType(targetType);
                                                                    let sourceMinBendY = null;
                                                                    if (slotIndex > 0) {
                                                                        const isSourceModule = previousType === 'ntc-1-wire' || previousType === 'rdt2';
                                                                        const isOutPort = sourcePortName.includes('OUT');
                                                                        if (isSourceModule && isOutPort && previousPos) {
                                                                            sourceMinBendY = previousPos.y + previousSlotHeight + link.offset;
                                                                        }
                                                                    }
                                                                    const bendY = getOneWireBendY({
                                                                        slotTop: slotPos.y,
                                                                        slotHeight,
                                                                        offset: link.offset,
                                                                        fromY,
                                                                        toY,
                                                                        isTargetThermostat,
                                                                        sourceMinBendY,
                                                                    });
                                                                     const proControllerMinBendY = slotIndex === 0 && controllerType === 'pro'
                                                                         ? (link.name === '1-WIRE-GND'
                                                                             ? controllerImage.height + 5 * indentSize
                                                                             : link.name === '1-WIRE-DAT'
                                                                                 ? controllerImage.height + 4 * indentSize
                                                                                 : controllerImage.height + 3 * indentSize)
                                                                         : null;
                                                                     const smartControllerMinBendY = slotIndex === 0 && controllerType === 'smart2'
                                                                         ? (() => {
                                                                             const profile = smart2DiModulesCount >= 2
                                                                                 ? { '1-WIRE-GND': 11, '1-WIRE-DAT': 10, '1-WIRE-V+': 9 }
                                                                                : smart2DiModulesCount === 1
                                                                                    ? { '1-WIRE-GND': 9, '1-WIRE-DAT': 8, '1-WIRE-V+': 7 }
                                                                                    : { '1-WIRE-GND': 5, '1-WIRE-DAT': 4, '1-WIRE-V+': 3 };
                                                                            const multiplier = profile[link.name] ?? 3;
                                                                             return controllerImage.height + multiplier * indentSize;
                                                                         })()
                                                                         : null;
                                                                     const goControllerMinBendY = slotIndex === 0 && (controllerType === 'go' || controllerType === 'go+')
                                                                         ? (() => {
                                                                             const profile = { '1-WIRE-GND': 7, '1-WIRE-DAT': 6, '1-WIRE-V+': 5 };
                                                                             const multiplier = profile[link.name] ?? 5;
                                                                             return getControllerBodyBottomY(controllerType, controllerImage) + multiplier * indentSize;
                                                                         })()
                                                                         : null;
                                                                     const controllerMinBendY = typeof proControllerMinBendY === 'number'
                                                                         ? Math.max(
                                                                             proControllerMinBendY,
                                                                             (proFirstOneWireMinBendY || 0)
                                                                                 + (link.name === '1-WIRE-GND' ? 2 * indentSize : link.name === '1-WIRE-DAT' ? indentSize : 0),
                                                                         )
                                                                         : (typeof smartControllerMinBendY === 'number'
                                                                             ? smartControllerMinBendY
                                                                             : goControllerMinBendY);
                                                                    const finalBendY = typeof controllerMinBendY === 'number'
                                                                        ? Math.max(bendY, controllerMinBendY)
                                                                        : bendY;
                                                                    const points = getOrthogonalLinkPoints(fromX, fromY, finalBendY, toX, toY);
                                                                    return {
                                                                        key: `one-wire-link-${slotIndex}-${link.name}`,
                                                                        role: link.name,
                                                                        points,
                                                                    };
                                                                    }).filter(Boolean);

                                                                    return <OneWireLine segments={lineSegments} />;
                                                                })()}
                                                            </Group>
                                                        );
                                                    })}
                                                </>
                                            )}
                                        </>
                                    );
                                })()}
                                <Group>
                                {(() => {
                                    const wirelessLineLift = getWirelessLineLift(scheme, controllerType, indentSize);
                                    return (
                                        <>
                                 {showLineFrames && (() => {
                                     const wirelessLineTop = getWirelessLineTop(memoWirelessDevices, showEmptySlots, controllerType, moduleHeightValue, indentSize, wirelessLineLift);
                                     const wirelessInfoBlockY = getWirelessInfoBlockY(wirelessLineTop);
                                    const slotRects = memoWirelessDevices.map((device, idx) => {
                                        const slotX = memoWirelessSlotX[idx] ?? getWirelessSlotX(memoWirelessDevices, idx, showEmptySlots);
                                        const hasFloorSensor = Array.isArray(device?.additions) && device.additions.length > 0;
                                        const slotWidth = getWirelessSlotWidth(device, showEmptySlots);
                                        const slotHeight = device?.type === 'thermostat'
                                            ? THERMOSTAT_SLOT_PADDING * 2 + THERMOSTAT_IMAGE_SIZE + (hasFloorSensor ? 3 * indentSize : 0)
                                            : getWirelessSlotHeight(device, indentSize);
                                        const slotY = getWirelessSlotYByIndex(memoWirelessDevices, idx, showEmptySlots, controllerType, moduleHeightValue, indentSize, slotHeight, wirelessLineLift);
                                        return { left: slotX, top: slotY, right: slotX + slotWidth, bottom: slotY + slotHeight };
                                    });
                                    if (showEmptySlots) {
                                        const plusSlotY = getWirelessSlotYByIndex(memoWirelessDevices, memoWirelessDevices.length, showEmptySlots, controllerType, moduleHeightValue, indentSize, 10 * indentSize, wirelessLineLift);
                                        slotRects.push({
                                            left: memoWirelessPlusSlotX,
                                            top: plusSlotY,
                                            right: memoWirelessPlusSlotX + 80,
                                            bottom: plusSlotY + 10 * indentSize,
                                        });
                                    }
                                    const frameSlotRects = slotRects.length > 0
                                        ? slotRects
                                        : [{ left: controllerType === 'ecosmart' ? (-25 * indentSize - 40) : 10, top: wirelessLineTop, right: controllerType === 'ecosmart' ? (-25 * indentSize + 40) : 90, bottom: wirelessLineTop + 10 * indentSize }];
                                    const wirelessInfoBlockX = controllerType === 'ecosmart' ? (-25 * indentSize - 67) : 10;
                                    const minX = Math.min(wirelessInfoBlockX, ...frameSlotRects.map((r) => r.left));
                                    const minY = Math.min(wirelessInfoBlockY, ...frameSlotRects.map((r) => r.top));
                                    const maxX = Math.max(wirelessInfoBlockX + 134, ...frameSlotRects.map((r) => r.right));
                                    const maxY = Math.max(...frameSlotRects.map((r) => r.bottom));
                                    return (
                                        <Rect
                                            x={minX - 10}
                                            y={minY - 10}
                                            width={maxX - minX + 20}
                                            height={maxY - minY + 20}
                                            cornerRadius={8}
                                            fill="rgba(91,127,166,0.2)"
                                            stroke="#5b7fa6"
                                            strokeWidth={1}
                                            dash={[5, 5]}
                                            opacity={0.68}
                                            listening={false}
                                        />
                                    );
                                 })()}
                                 {(memoWirelessDevices.length > 0 || showEmptySlots || showLineFrames) && (() => {
                                     const wirelessLineTop = getWirelessLineTop(memoWirelessDevices, showEmptySlots, controllerType, moduleHeightValue, indentSize, wirelessLineLift);
                                    const wirelessInfoBlockY = getWirelessInfoBlockY(wirelessLineTop);
                                    const wirelessInfoBlockX = controllerType === 'ecosmart' ? (-25 * indentSize - 67) : 10;
                                    return (
                                        <>
                                <Rect
                                    x={wirelessInfoBlockX}
                                    y={wirelessInfoBlockY}
                                    width={134}
                                    height={WIRELESS_INFOBLOCK_HEIGHT}
                                    cornerRadius={1}
                                    fill={INFO_BLOCK_FILL}
                                    stroke={INFO_BLOCK_STROKE}
                                    strokeWidth={INFO_BLOCK_STROKE_WIDTH}
                                />
                                <Text
                                    x={wirelessInfoBlockX + 6}
                                    y={wirelessInfoBlockY}
                                    text="Беспроводные устройства"
                                    fontSize={INFO_BLOCK_FONT_SIZE}
                                    fill={INFO_BLOCK_TEXT_COLOR}
                                    width={122}
                                    height={WIRELESS_INFOBLOCK_HEIGHT}
                                    align="center"
                                    verticalAlign="middle"
                                />
                                        </>
                                    );
                                })()}
                                {memoWirelessDevices.map((device, idx) => {
                                    const deviceKey = getWirelessDeviceKey(device, idx);
                                    const deviceImageKey = getWirelessDeviceImageKey(device);
                                    const slotX = memoWirelessSlotX[idx] ?? getWirelessSlotX(memoWirelessDevices, idx, showEmptySlots);
                                    const hasFloorSensor = Array.isArray(device.additions) && device.additions.length > 0;
                                    const floorSensor = hasFloorSensor
                                        ? device.additions.find(isThermostatFloorSensorAddition) || device.additions[0]
                                        : null;
                                    const slotWidth = getWirelessSlotWidth(device, showEmptySlots);
                                    const slotHeight = device.type === 'thermostat'
                                        ? THERMOSTAT_SLOT_PADDING * 2 + THERMOSTAT_IMAGE_SIZE + (hasFloorSensor ? 3 * indentSize : 0)
                                        : getWirelessSlotHeight(device, indentSize);
                                    const slotY = getWirelessSlotYByIndex(memoWirelessDevices, idx, showEmptySlots, controllerType, moduleHeightValue, indentSize, slotHeight, wirelessLineLift);
                                    const deviceImage = wirelessImages[deviceImageKey];
                                    const devicePorts = wirelessPortsByType[deviceImageKey] || [];
                                    const imageSize = device.type === 'thermostat'
                                        ? { width: THERMOSTAT_IMAGE_SIZE, height: THERMOSTAT_IMAGE_SIZE }
                                        : device.type === 'outdoor-temperature-sensor' && deviceImage?.width && deviceImage?.height
                                            ? {
                                                width: slotWidth,
                                                height: deviceImage.height * (slotWidth / deviceImage.width),
                                            }
                                        : getContainSize(deviceImage, 64, 64);
                                    const baseDeviceTitle = getDeviceStoredTitle(device) || getWirelessDeviceTitle(memoWirelessDevices, device, idx);
                                    const deviceTitle = device.type === 'thermostat' && hasFloorSensor
                                        ? `${baseDeviceTitle} с датчиком пола`
                                        : baseDeviceTitle;
                                    const previewDevices = floorSensor
                                        ? [
                                            { device, title: deviceTitle },
                                            { device: floorSensor, title: getDeviceStoredTitle(floorSensor) || getDeviceBaseTitle(floorSensor) },
                                        ]
                                        : [{ device, title: deviceTitle }];
                                    const imageX = device.type === 'thermostat'
                                        ? slotX + THERMOSTAT_SLOT_PADDING
                                        : slotX + (slotWidth - imageSize.width) / 2;
                                    const imageY = device.type === 'thermostat'
                                        ? slotY + THERMOSTAT_SLOT_PADDING
                                        : slotY + (slotHeight - imageSize.height) / 2;
                                    const hasThermostatOneWire = device.type === 'thermostat';
                                    const floorSensorImage = wirelessImages['floor-sensor'];
                                    const floorSensorPorts = wirelessPortsByType['floor-sensor'] || [];
                                    const thermostatOneWireSlotSize = THERMOSTAT_FLOOR_SLOT_SIZE;
                                    const thermostatOneWireSlotX = imageX + imageSize.width + THERMOSTAT_FLOOR_SLOT_GAP;
                                    const thermostatOneWireSlotY = imageY + (THERMOSTAT_IMAGE_SIZE - thermostatOneWireSlotSize) / 2;
                                    const isEcosmartThermostat = controllerType === 'ecosmart' && device.type === 'thermostat';
                                    const thermostatVisualLeft = imageX;
                                    const thermostatVisualRight = hasFloorSensor
                                        ? thermostatOneWireSlotX + thermostatOneWireSlotSize
                                        : imageX + imageSize.width;
                                    const infoBlockWidth = isEcosmartThermostat ? thermostatVisualRight - thermostatVisualLeft : slotWidth;
                                    const infoBlockX = isEcosmartThermostat ? thermostatVisualLeft : slotX;
                                    const showThermostatOneWire = hasFloorSensor || showEmptySlots;
                                    const isHovered = hoveredWirelessDeviceKey === deviceKey;
                                    return (
                                        <Group
                                            key={deviceKey}
                                            onMouseEnter={() => setHoveredWirelessDeviceKey(deviceKey)}
                                            onMouseLeave={() => setHoveredWirelessDeviceKey(null)}
                                        >
                                            <Rect
                                                x={infoBlockX}
                                                y={slotY}
                                                width={slotWidth}
                                                height={slotHeight}
                                                fill={TRANSPARENT_FILL}
                                            />
                                            <Rect
                                                x={infoBlockX}
                                                y={slotY - 4 * indentSize}
                                                width={infoBlockWidth}
                                                height={INFO_BLOCK_HEIGHT}
                                                cornerRadius={1}
                                                fill={INFO_BLOCK_FILL}
                                                stroke={INFO_BLOCK_STROKE}
                                                strokeWidth={INFO_BLOCK_STROKE_WIDTH}
                                            />
                                            <EditableInfoTitle
                                                x={infoBlockX + 4}
                                                y={slotY - 4 * indentSize}
                                                text={deviceTitle}
                                                fontSize={4}
                                                fill={INFO_BLOCK_TEXT_COLOR}
                                                width={infoBlockWidth - 8}
                                                height={INFO_BLOCK_HEIGHT}
                                                align="center"
                                                verticalAlign="middle"
                                                device={device}
                                                title={deviceTitle}
                                                previewDevices={previewDevices}
                                            />
                                            <Rect
                                                x={slotX}
                                                y={slotY}
                                                width={slotWidth}
                                                height={slotHeight}
                                                cornerRadius={10}
                                                fill={TRANSPARENT_FILL}
                                                stroke={TRANSPARENT_FILL}
                                                strokeWidth={1.5}
                                            />
                                            {deviceImage && (
                                                <Image
                                                    name="device-preview-source"
                                                    previewDevice={device}
                                                    previewTitle={deviceTitle}
                                                    previewDevices={previewDevices}
                                                    image={deviceImage}
                                                    x={imageX}
                                                    y={imageY}
                                                    width={imageSize.width}
                                                    height={imageSize.height}
                                                />
                                            )}
                                            {isBundledSensorDevice(memoBundledSensorDevices, device) && <KitBadge x={slotX} y={slotY + 1} />}
                                            {hasThermostatOneWire && showThermostatOneWire && (
                                                <>
                                                    {!hasFloorSensor && showEmptySlots && (
                                                        <Rect
                                                            x={thermostatOneWireSlotX}
                                                            y={thermostatOneWireSlotY}
                                                            width={thermostatOneWireSlotSize}
                                                            height={thermostatOneWireSlotSize}
                                                            cornerRadius={5}
                                                            fill="#ffffff"
                                                            stroke="#8ab4d6"
                                                            strokeWidth={1}
                                                        />
                                                    )}
                                                    {!hasFloorSensor && showEmptySlots && (
                                                        <Text
                                                            x={thermostatOneWireSlotX + thermostatOneWireSlotSize / 2}
                                                            y={thermostatOneWireSlotY + thermostatOneWireSlotSize / 2}
                                                            text="+"
                                                            fontSize={28}
                                                            fill={INFO_BLOCK_TEXT_COLOR}
                                                            offsetX={8}
                                                            offsetY={13}
                                                            listening={false}
                                                        />
                                                    )}
                                                    {hasFloorSensor && (
                                                        <>
                                                            {floorSensorImage && (
                                                                <Image
                                                                    image={floorSensorImage}
                                                                    x={thermostatOneWireSlotX}
                                                                    y={thermostatOneWireSlotY}
                                                                    width={thermostatOneWireSlotSize}
                                                                    height={thermostatOneWireSlotSize}
                                                                    listening={false}
                                                                />
                                                            )}
                                                            {(() => {
                                                                const thermostatGnd = getPortPosition(devicePorts, '1-WIRE-GND', imageX, imageY, imageSize.width, imageSize.height);
                                                                const thermostatDat = getPortPosition(devicePorts, '1-WIRE-DAT', imageX, imageY, imageSize.width, imageSize.height);
                                                                const thermostatVPlus = getPortPosition(devicePorts, '1-WIRE-V+', imageX, imageY, imageSize.width, imageSize.height);
                                                                const floorGnd = getPortPosition(floorSensorPorts, '1-WIRE-GND', thermostatOneWireSlotX, thermostatOneWireSlotY, thermostatOneWireSlotSize, thermostatOneWireSlotSize);
                                                                const floorDat = getPortPosition(floorSensorPorts, '1-WIRE-DAT', thermostatOneWireSlotX, thermostatOneWireSlotY, thermostatOneWireSlotSize, thermostatOneWireSlotSize);
                                                                const floorVPlus = getPortPosition(floorSensorPorts, '1-WIRE-V+', thermostatOneWireSlotX, thermostatOneWireSlotY, thermostatOneWireSlotSize, thermostatOneWireSlotSize);
                                                                const lines = [
                                                                    { from: thermostatGnd, to: floorGnd, offset: 3 * indentSize, color: '#212121' },
                                                                    { from: thermostatDat, to: floorDat, offset: 2 * indentSize, color: '#fbc02d' },
                                                                    { from: thermostatVPlus, to: floorVPlus, offset: 1 * indentSize, color: '#d32f2f' },
                                                                ];
                                                                const thermostatBottomY = imageY + imageSize.height;
                                                                return lines
                                                                    .filter((item) => item.from && item.to)
                                                                    .map((item, lineIndex) => {
                                                                        const defaultBendY = thermostatBottomY + item.offset;
                                                                        const minBendY = Math.max(item.from.y, item.to.y) + item.offset;
                                                                        const bendY = Math.max(defaultBendY, minBendY);
                                                                        return (
                                                                            <Line
                                                                                key={`${device.id ?? idx}-thermo-floor-link-${lineIndex}`}
                                                                                points={[item.from.x, item.from.y, item.from.x, bendY, item.to.x, bendY, item.to.x, item.to.y]}
                                                                                stroke={item.color}
                                                                                strokeWidth={1}
                                                                                lineCap="round"
                                                                                lineJoin="round"
                                                                                listening={false}
                                                                            />
                                                                        );
                                                                    });
                                                            })()}
                                                            {showPorts && floorSensorImage && floorSensorPorts.map((port) => (
                                                                <Circle
                                                                    key={`${device.id ?? idx}-floor-${port.name}`}
                                                                    x={thermostatOneWireSlotX + port.x * thermostatOneWireSlotSize}
                                                                    y={thermostatOneWireSlotY + port.y * thermostatOneWireSlotSize}
                                                                    radius={2.5}
                                                                    fill="red"
                                                                    listening={false}


                                                                />
                                                            ))}
                                                        </>
                                                    )}
                                                    <Rect
                                                        name={hasFloorSensor ? 'device-preview-source' : undefined}
                                                        previewDevice={hasFloorSensor ? device : undefined}
                                                        previewTitle={hasFloorSensor ? deviceTitle : undefined}
                                                        previewDevices={hasFloorSensor ? previewDevices : undefined}
                                                        x={thermostatOneWireSlotX}
                                                        y={thermostatOneWireSlotY}
                                                        width={thermostatOneWireSlotSize}
                                                        height={thermostatOneWireSlotSize}
                                                        cornerRadius={5}
                                                        fill={TRANSPARENT_FILL}
                                                        visible={showEmptySlots || hasFloorSensor}
                                                        onClick={(e) => {
                                                            if (hasFloorSensor) return;
                                                            const pos = e.target.getAbsolutePosition();
                                                            setThermostatMenuPos({
                                                                x: pos.x + 10,
                                                                y: pos.y + 10,
                                                                deviceIndex: idx,
                                                            });
                                                        }}
                                                        onTap={(e) => {
                                                            if (hasFloorSensor) return;
                                                            const pos = e.target.getAbsolutePosition();
                                                            setThermostatMenuPos({
                                                                x: pos.x + 10,
                                                                y: pos.y + 10,
                                                                deviceIndex: idx,
                                                            });
                                                        }}
                                                    />
                                                </>
                                            )}
                                            {showPorts && deviceImage && devicePorts.map((port) => (
                                                <Circle
                                                    key={`${device.id ?? idx}-${port.name}`}
                                                    x={imageX + port.x * imageSize.width}
                                                    y={imageY + port.y * imageSize.height}
                                                    radius={2.5}
                                                    fill="red"


                                                />
                                            ))}
                                            {isHovered && (
                                                <SlotDeleteButton compact x={slotX + slotWidth - 2.5} y={slotY + 1.5} onRemove={() => {
                                                    setScheme((s) => ({
                                                        ...s,
                                                        wireless_devices: s.wireless_devices.filter((_, deviceIndex) => deviceIndex !== idx),
                                                    }));
                                                    setHoveredWirelessDeviceKey(null);
                                                }} />
                                            )}
                                        </Group>
                                    );
                                })}
                                {showEmptySlots && (
                                    <>
                                        {(() => {
                                            const plusSlotX = memoWirelessPlusSlotX;
                                            const plusSlotHeight = 10 * indentSize;
                                            const plusSlotY = getWirelessSlotYByIndex(memoWirelessDevices, memoWirelessDevices.length, showEmptySlots, controllerType, moduleHeightValue, indentSize, plusSlotHeight, wirelessLineLift);
                                            return (
                                                <>
                                                    <Rect
                                                        x={plusSlotX}
                                                        y={plusSlotY}
                                                        width={80}
                                                        height={plusSlotHeight}
                                                        cornerRadius={10}
                                                        fill={EMPTY_SLOT_FILL}
                                                        stroke={EMPTY_SLOT_STROKE}
                                                        strokeWidth={1.5}
                                                    />
                                                    <Circle
                                                        x={plusSlotX + 40}
                                                        y={plusSlotY + plusSlotHeight / 2}
                                                        radius={16}
                                                        fill={ADD_ACTION_FILL}
                                                        onClick={(e) => {
                                                            const pos = e.target.getAbsolutePosition();
                                                            setSlotMenuPos({
                                                                x: pos.x,
                                                                y: pos.y,
                                                                slotIndex: memoWirelessDevices.length,
                                                            });
                                                        }}
                                                        onTap={(e) => {
                                                            const pos = e.target.getAbsolutePosition();
                                                            setSlotMenuPos({
                                                                x: pos.x,
                                                                y: pos.y,
                                                                slotIndex: memoWirelessDevices.length,
                                                            });
                                                        }}
                                                    />
                                                    <Text
                                                        x={plusSlotX + 40}
                                                        y={plusSlotY + plusSlotHeight / 2}
                                                        text="+"
                                                        fontSize={22}
                                                        fill={INFO_BLOCK_FILL}
                                                        offsetX={6.5}
                                                        offsetY={9}
                                                        listening={false}
                                                    />
                                                </>
                                            );
                                        })()}
                                    </>
                                )}
                                        </>
                                    );
                                })()}
                                </Group>
                            </Group>
                                );
                            })()
                        )}
                    </Layer>
                    </RealisticConnectionLines>
);

export default SchemeCanvas;
