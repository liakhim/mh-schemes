import React from 'react';
import { Circle, Group, Image, Rect, Text } from 'react-konva';
import { canonicalDeviceType } from '../scheme/domain/deviceTypes';
import { getDeviceStoredTitle, getOneWireDeviceTitle } from '../scheme/domain/deviceTitles';
import { WIFI_ONE_WIRE_CAPACITY, WIFI_RELAY_CAPACITY } from '../scheme/domain/wifiModules';
import { buildRelaySlotOccupancyPreserveIndexes } from '../scheme/domain/relaySlots';
import { getWirelessDeviceImageKey } from '../scheme/assets/imageRegistry';
import { getOneWireSlotPosition } from '../scheme/layout/oneWireLayout';
import { getOneWirePortByRole, getPortByNames, getRelayInputPort, getRelayTerminalPort } from '../scheme/layout/ports';
import { getWifiModuleSize, getWifiPairHorizontalBounds } from '../scheme/layout/wifiLineLayout';
import {
    DI_SLOT_MIN_GAP_MULTIPLIER,
    DI_SLOT_SIZE,
    EXT_SLOT_MIN_GAP_MULTIPLIER,
    EXT_SLOT_SIZE,
    ONE_WIRE_SLOT_FAKE_PORTS,
} from '../scheme/layout/renderConstants';
import { Line } from '../scheme/rendering/SharpLine';
import OneWireLine from './OneWireLine';
import {
    ADD_ACTION_FILL,
    ADD_ACTION_TEXT_FILL,
    EMPTY_SLOT_FILL,
    EMPTY_SLOT_STROKE,
    INFO_BLOCK_FILL,
    INFO_BLOCK_HEIGHT,
    INFO_BLOCK_STROKE,
    INFO_BLOCK_STROKE_WIDTH,
    INFO_BLOCK_TEXT_COLOR,
    ONE_WIRE_SLOT_SIZE,
    TRANSPARENT_FILL,
} from '../constants';
import DeviceIndicator from './DeviceIndicator';
import { DeviceInfoBlock as EditableInfoTitle } from './DeviceInfoBlock';
import SlotDeleteButton from './SlotDeleteButton';

const isFlaskSensorType = (type) => String(canonicalDeviceType(type) || '').startsWith('flask-sensor');

const WifiLine = ({
    wifiLineEnabled,
    memoWifiModules,
    getWifiCapacity,
    controllerType,
    showEmptySlots,
    wirelessImages,
    wirelessPortsByType,
    dinSize,
    indentSize,
    moduleHeightValue,
    scheme,
    getDiModules,
    controllerImage,
    getSmart2DiModuleExtraSpacing,
    diSlotOffsets,
    getDiOffsetKey,
    renderedProExtRight,
    memoExtModules,
    memoExtLineThermostatDevices,
    extSlotOffsets,
    getExtOffsetKey,
    isRelayBoilerType,
    wifiSlotOffsets,
    wifiOneWireSlotOffsets,
    getWifiOffsetKey,
    snapToGrid,
    showLineFrames,
    setHoveredWifiSlotKey,
    wifiDragStartOffsetsRef,
    rectsOverlap,
    setInvalidWifiDragMap,
    invalidWifiDragMap,
    setWifiSlotOffsets,
    getMorphImageKey,
    getFullWidthSize,
    getContainSize,
    getDoubleRelayDevices,
    getRelayLinkPointsFromDevice,
    setRelayMenuPos,
    removeWifiModuleRelayDeviceAtSlot,
    getOneWireBendY,
    getOrthogonalLinkPoints,
    setHoveredWifiOneWireSlotKey,
    hoveredWifiOneWireSlotKey,
    setWifiOneWireMenuPos,
    setWifiOneWireSlotOffsets,
    removeWifiOneWireDeviceAtSlot,
    showPorts,
    setWifiMenuPos,
    hoveredWifiSlotKey,
    removeWifiModuleAtSlot,
}) => {
    const [hoveredRelaySlotKey, setHoveredRelaySlotKey] = React.useState(null);
    const wifiOneWireDragStartRef = React.useRef({});
    const wifiOneWireDragStartPointerRef = React.useRef({});

    return (
    <>
{(() => {
                                    if (!wifiLineEnabled) return null;
                                    const wifiModules = memoWifiModules;
                                    const capacity = getWifiCapacity(controllerType);
                                    const showAddSlot = showEmptySlots && wifiModules.length < capacity;
                                    const slotCount = wifiModules.length + (showAddSlot ? 1 : 0);
                                    if (slotCount === 0) return null;
                                    const powerImage = wirelessImages['power-unit'];
                                    const powerPorts = wirelessPortsByType['power-unit'] || [];
                                    const powerWidth = powerImage?.width || dinSize;
                                    const powerModuleGap = 4 * indentSize;
                                    const getModuleSize = (moduleItem) => getWifiModuleSize(
                                        moduleItem,
                                        wirelessImages,
                                        getWirelessDeviceImageKey,
                                        dinSize,
                                        moduleHeightValue,
                                    );
                                    const getSmart2DiRight = () => {
                                        const modules = getDiModules(scheme);
                                        if (modules.length === 0) return controllerImage.width;
                                        let right = controllerImage.width + DI_SLOT_MIN_GAP_MULTIPLIER * indentSize;
                                        modules.forEach((moduleItem, index) => {
                                            const image = wirelessImages[getWirelessDeviceImageKey(moduleItem)];
                                            const width = image?.width || DI_SLOT_SIZE;
                                            const spacing = getSmart2DiModuleExtraSpacing(moduleItem, indentSize);
                                            const offset = diSlotOffsets[getDiOffsetKey(moduleItem, index)] || { x: 0 };
                                            right += spacing.left + width + spacing.right + (index < modules.length - 1 ? DI_SLOT_MIN_GAP_MULTIPLIER * indentSize : 0) + offset.x;
                                        });
                                        return right;
                                    };
                                    const getProExtRight = () => {
                                        if (Number.isFinite(renderedProExtRight)) return renderedProExtRight;
                                        const extLineItems = [...memoExtModules, ...memoExtLineThermostatDevices];
                                        const showVisibleEmptyExtSlot = showEmptySlots && extLineItems.length < 12;
                                        if (extLineItems.length === 0) {
                                            return showVisibleEmptyExtSlot
                                                ? controllerImage.width + EXT_SLOT_MIN_GAP_MULTIPLIER * indentSize + EXT_SLOT_SIZE
                                                : controllerImage.width;
                                        }
                                        let right = controllerImage.width + EXT_SLOT_MIN_GAP_MULTIPLIER * indentSize;
                                        extLineItems.forEach((moduleItem, index) => {
                                            const image = wirelessImages[getWirelessDeviceImageKey(moduleItem)];
                                            const width = image?.width || EXT_SLOT_SIZE;
                                            const offset = extSlotOffsets[getExtOffsetKey(moduleItem, index)] || { x: 0 };
                                            right += width + offset.x + (index < extLineItems.length - 1 ? EXT_SLOT_MIN_GAP_MULTIPLIER * indentSize : 0);
                                        });
                                        if (showVisibleEmptyExtSlot) {
                                            const lastItem = extLineItems[extLineItems.length - 1];
                                            const lastType = canonicalDeviceType(lastItem?.type);
                                            const lastExtraGap = lastType === 'rl6'
                                                ? 20 * indentSize
                                                : (lastType === 'rl6s' ? 9 * indentSize : 0);
                                            right += lastExtraGap + EXT_SLOT_MIN_GAP_MULTIPLIER * indentSize + EXT_SLOT_SIZE;
                                        }
                                        return right;
                                    };
                                    const hasVisibleProExtSlot = memoExtModules.length > 0
                                        || memoExtLineThermostatDevices.length > 0
                                        || (showEmptySlots && (memoExtModules.length + memoExtLineThermostatDevices.length) < 12);
                                    const baseX = controllerType === 'smart2'
                                        ? getSmart2DiRight() + 15 * indentSize
                                        : controllerType === 'pro'
                                            ? getProExtRight() + (hasVisibleProExtSlot ? 6 : 16) * indentSize
                                            : controllerImage.width + (controllerType === 'ecosmart' ? 20 : 12) * indentSize;
                                    const getPairHorizontalBounds = (moduleItem) => getWifiPairHorizontalBounds({
                                        moduleItem,
                                        wirelessImages,
                                        wirelessPortsByType,
                                        getImageKey: getWirelessDeviceImageKey,
                                        dinSize,
                                        moduleHeightValue,
                                        indentSize,
                                        showEmptySlots,
                                        oneWireSlotSize: ONE_WIRE_SLOT_SIZE,
                                        isRelayBoilerType,
                                        buildRelaySlotOccupancy: buildRelaySlotOccupancyPreserveIndexes,
                                    });
                                    const getBasePosition = (slotIndex) => {
                                        let x = baseX;
                                        for (let index = 1; index <= slotIndex; index += 1) {
                                            const previousBounds = getPairHorizontalBounds(wifiModules[index - 1] || null);
                                            const currentBounds = getPairHorizontalBounds(wifiModules[index] || null);
                                            x += previousBounds.right + 4 * indentSize - currentBounds.left;
                                        }
                                        const size = getModuleSize(wifiModules[slotIndex]);
                                        return { x: snapToGrid(x, indentSize), y: snapToGrid((controllerImage.height - size.height) / 2, indentSize) };
                                    };
                                    const getPosition = (slotIndex) => {
                                        const moduleItem = wifiModules[slotIndex] || null;
                                        const base = getBasePosition(slotIndex);
                                        const offset = wifiSlotOffsets[getWifiOffsetKey(moduleItem, slotIndex)] || { x: 0, y: 0 };
                                        return { x: base.x + offset.x, y: base.y + offset.y };
                                    };
                                    const allRects = Array.from({ length: slotCount }).map((_, index) => {
                                        const size = getModuleSize(wifiModules[index]);
                                        const position = getPosition(index);
                                        const bounds = getPairHorizontalBounds(wifiModules[index] || null);
                                        return { left: position.x + bounds.left, top: position.y, right: position.x + bounds.right, bottom: position.y + size.height };
                                    });
                                    return (
                                        <>
                                            {showLineFrames && (() => {
                                                const left = Math.min(...allRects.map((rect) => rect.left));
                                                const top = Math.min(...allRects.map((rect) => rect.top));
                                                const right = Math.max(...allRects.map((rect) => rect.right));
                                                const bottom = Math.max(...allRects.map((rect) => rect.bottom));
                                                return <Rect x={left - 10} y={top - 10} width={right - left + 20} height={bottom - top + 20} cornerRadius={8} fill="rgba(38,126,164,0.12)" stroke="#267ea4" dash={[6, 4]} listening={false} />;
                                            })()}
                                            {Array.from({ length: slotCount }).map((_, moduleIndex) => {
                                                const moduleItem = wifiModules[moduleIndex] || null;
                                                const occupied = Boolean(moduleItem);
                                                const moduleType = canonicalDeviceType(moduleItem?.type);
                                                const moduleImage = occupied ? wirelessImages[moduleType] : null;
                                                const modulePorts = occupied ? (wirelessPortsByType[moduleType] || []) : [];
                                                const moduleSize = getModuleSize(moduleItem);
                                                const pairWidth = powerWidth + powerModuleGap + moduleSize.width;
                                                const position = getPosition(moduleIndex);
                                                const moduleX = powerWidth + powerModuleGap;
                                                const offsetKey = getWifiOffsetKey(moduleItem, moduleIndex);
                                                const lineKey = moduleType === 'rl6sw' ? 'relay_s_devices' : 'relay_devices';
                                                const relayDevices = occupied ? (moduleItem[lineKey] || []) : [];
                                                const relayOccupancy = buildRelaySlotOccupancyPreserveIndexes(relayDevices, WIFI_RELAY_CAPACITY, (device) => (
                                                    String(device?.connection_type || '').toLowerCase() === 'double_relay' ? 2 : 1
                                                ));
                                                const oneWireDevices = occupied ? (moduleItem.one_wire_devices || []).slice(0, WIFI_ONE_WIRE_CAPACITY) : [];
                                                const oneWireSlotCount = oneWireDevices.length + (showEmptySlots && oneWireDevices.length < WIFI_ONE_WIRE_CAPACITY ? 1 : 0);
                                                const wifiOneWirePorts = modulePorts.filter((port) => port.name.startsWith('1-WIRE-'));
                                                const wifiOneWireVPlus = wifiOneWirePorts.find((port) => port.name === '1-WIRE-V+');
                                                const wifiOneWireBottomY = wifiOneWirePorts.length > 0
                                                    ? Math.max(...wifiOneWirePorts.map((port) => port.y * moduleSize.height))
                                                    : moduleSize.height;
                                                const getWifiOneWireOffsetKey = (sensor, sensorIndex) => (
                                                    `wifi-onewire:${moduleItem.id ?? moduleIndex}:${sensor?.id ?? sensorIndex}`
                                                );
                                                const getWifiOneWireSlotPosition = (sensorIndex) => getOneWireSlotPosition({
                                                    slotIndex: sensorIndex,
                                                    devices: oneWireDevices,
                                                    offsets: wifiOneWireSlotOffsets,
                                                    getDeviceSize: () => ({ width: ONE_WIRE_SLOT_SIZE, height: ONE_WIRE_SLOT_SIZE }),
                                                    getOffsetKey: getWifiOneWireOffsetKey,
                                                    firstSlotX: moduleX + (wifiOneWireVPlus ? wifiOneWireVPlus.x * moduleSize.width : 0) + 2 * indentSize,
                                                    firstSlotY: wifiOneWireBottomY + moduleHeightValue,
                                                    indentSize,
                                                    moduleHeightValue,
                                                });
                                                return (
                                                    <Group
                                                        key={`wifi-slot-${offsetKey}`}
                                                        x={position.x}
                                                        y={position.y}
                                                        draggable={occupied}
                                                        onMouseEnter={() => setHoveredWifiSlotKey(offsetKey)}
                                                        onMouseLeave={() => setHoveredWifiSlotKey((current) => (current === offsetKey ? null : current))}
                                                        onDragStart={() => { wifiDragStartOffsetsRef.current[offsetKey] = wifiSlotOffsets[offsetKey] || { x: 0, y: 0 }; }}
                                                        onDragMove={(event) => {
                                                            if (!occupied) return;
                                                            const node = event.target;
                                                            const bounds = getPairHorizontalBounds(moduleItem);
                                                            const candidate = { left: node.x() + bounds.left, top: node.y(), right: node.x() + bounds.right, bottom: node.y() + moduleSize.height };
                                                            const controllerRect = { left: 0, top: 0, right: controllerImage.width, bottom: controllerImage.height };
                                                            const collides = rectsOverlap(candidate, controllerRect) || allRects.some((rect, index) => index !== moduleIndex && rectsOverlap(candidate, rect));
                                                            setInvalidWifiDragMap((current) => ({ ...current, [offsetKey]: collides }));
                                                        }}
                                                        onDragEnd={(event) => {
                                                            const node = event.target;
                                                            const base = getBasePosition(moduleIndex);
                                                            const startOffset = wifiDragStartOffsetsRef.current[offsetKey] || { x: 0, y: 0 };
                                                            const nextOffset = {
                                                                x: snapToGrid(node.x(), indentSize) - base.x,
                                                                y: snapToGrid(node.y(), indentSize) - base.y,
                                                            };
                                                            const bounds = getPairHorizontalBounds(moduleItem);
                                                            const candidate = {
                                                                left: base.x + nextOffset.x + bounds.left,
                                                                top: base.y + nextOffset.y,
                                                                right: base.x + nextOffset.x + bounds.right,
                                                                bottom: base.y + nextOffset.y + moduleSize.height,
                                                            };
                                                            const controllerRect = { left: 0, top: 0, right: controllerImage.width, bottom: controllerImage.height };
                                                            const collides = rectsOverlap(candidate, controllerRect)
                                                                || allRects.some((rect, index) => index !== moduleIndex && rectsOverlap(candidate, rect));
                                                            setWifiSlotOffsets((current) => ({
                                                                ...current,
                                                                [offsetKey]: collides ? startOffset : nextOffset,
                                                            }));
                                                            if (collides) {
                                                                node.position({
                                                                    x: base.x + startOffset.x,
                                                                    y: base.y + startOffset.y,
                                                                });
                                                                node.getLayer()?.batchDraw();
                                                            }
                                                            setInvalidWifiDragMap((current) => ({ ...current, [offsetKey]: false }));
                                                            delete wifiDragStartOffsetsRef.current[offsetKey];
                                                        }}
                                                    >
                                                        <Rect width={pairWidth} height={moduleSize.height} cornerRadius={8} fill={invalidWifiDragMap[offsetKey] ? 'rgba(211,47,47,0.08)' : (occupied ? TRANSPARENT_FILL : EMPTY_SLOT_FILL)} stroke={invalidWifiDragMap[offsetKey] ? '#d32f2f' : (occupied ? TRANSPARENT_FILL : EMPTY_SLOT_STROKE)} />
                                                        {occupied && powerImage && <Image image={powerImage} width={powerWidth} height={moduleSize.height} listening={false} />}
                                                        {occupied && moduleImage && <Image name={`morph:${getMorphImageKey(moduleItem)}`} image={moduleImage} x={moduleX} width={moduleSize.width} height={moduleSize.height} listening={false} />}
                                                        {occupied && (() => {
                                                            const links = [
                                                                { name: 'V+', color: '#d32f2f', upOffset: 2 * indentSize, sideOffset: 2 * indentSize, underOffset: 1 * indentSize },
                                                                { name: 'GND', color: '#212121', upOffset: 1 * indentSize, sideOffset: 1 * indentSize, underOffset: 2 * indentSize },
                                                            ];
                                                            return links.map((link) => {
                                                                const from = getPortByNames(powerPorts, [`12VDC-OUT-${link.name}`, `VDC-OUT-${link.name}`]);
                                                                const to = getPortByNames(modulePorts, [`12VDC-IN-${link.name}`, `12VDC-${link.name}`]);
                                                                if (!from || !to) return null;
                                                                const fromX = from.x * powerWidth;
                                                                const fromY = from.y * moduleSize.height;
                                                                const toX = moduleX + to.x * moduleSize.width;
                                                                const toY = to.y * moduleSize.height;
                                                                const upY = -link.upOffset;
                                                                const rightX = powerWidth + link.sideOffset;
                                                                const downY = moduleSize.height + link.underOffset;
                                                                return <Line key={`wifi-power-${link.name}`} points={[fromX, fromY, fromX, upY, rightX, upY, rightX, downY, toX, downY, toX, toY]} stroke={link.color} strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />;
                                                            });
                                                        })()}
                                                        {occupied && modulePorts.filter((port) => String(port.name).includes('INDICATOR')).map((port) => {
                                                            const relayMatch = /RELAY(?:-S)?-INDICATOR-(\d+)/i.exec(port.name);
                                                            const active = !relayMatch || Boolean(relayOccupancy[Number(relayMatch?.[1]) - 1]);
                                                            return <DeviceIndicator key={`wifi-indicator-${port.name}`} port={port} imageWidth={moduleSize.width} imageHeight={moduleSize.height} offsetX={moduleX} active={active} size={4} />;
                                                        })}
                                                        {occupied && (() => {
                                                            const relayPortPrefix = moduleType === 'rl6sw' ? 'RELAY-S' : 'RELAY';
                                                            const slotGap = 4 * indentSize;
                                                            const defaultSlotSize = 8 * indentSize;
                                                            const sideGap = 4 * indentSize;
                                                            const getSlotSize = (device) => (isRelayBoilerType(device?.type)
                                                                ? { width: 6 * indentSize, height: 10 * indentSize }
                                                                : { width: defaultSlotSize, height: defaultSlotSize });
                                                                const getSlotY = (lineStates, lineSlotIndex, side) => {
                                                                    const states = side === 'left' ? [...lineStates].reverse() : lineStates;
                                                                    const visualIndex = side === 'left' ? 2 - lineSlotIndex : lineSlotIndex;
                                                                    const sizes = states.map((state) => getSlotSize(state?.device));
                                                                    const totalHeight = sizes.reduce((sum, size) => sum + size.height, 0) + slotGap * 2;
                                                                    return sizes.slice(0, visualIndex).reduce(
                                                                        (y, size) => y + size.height + slotGap,
                                                                        -totalHeight - 4 * indentSize,
                                                                    );
                                                                };
                                                            const renderLine = (side, states, relayIndexOffset) => states.map((state, lineSlotIndex) => {
                                                                if (state?.covered) return null;
                                                                const relayIndex = relayIndexOffset + lineSlotIndex;
                                                                const relayDevice = state?.device || null;
                                                                if (!relayDevice && !showEmptySlots) return null;
                                                                const slotSize = getSlotSize(relayDevice);
                                                                const slotX = side === 'left'
                                                                    ? moduleX - sideGap - slotSize.width
                                                                    : moduleX + moduleSize.width + sideGap;
                                                                const slotY = getSlotY(states, lineSlotIndex, side);
                                                                const visualDevice = relayDevice ? { ...relayDevice, port_side: side === 'left' ? 'right' : 'left' } : null;
                                                                const relayType = canonicalDeviceType(relayDevice?.type);
                                                                const imageKey = visualDevice ? getWirelessDeviceImageKey(visualDevice) : null;
                                                                const image = imageKey ? wirelessImages[imageKey] : null;
                                                                const imageSize = image
                                                                    ? (relayType === 'zoneServo'
                                                                        ? getFullWidthSize(image, slotSize.width, slotSize.height)
                                                                        : getContainSize(image, slotSize.width, slotSize.height))
                                                                    : slotSize;
                                                                const imageX = slotX + (slotSize.width - imageSize.width) / 2;
                                                                const imageY = slotY + (slotSize.height - imageSize.height) / 2;
                                                                const modulePort = getPortByNames(modulePorts, [`${relayPortPrefix}-${relayIndex + 1}-B`]);
                                                                const modulePortX = modulePort ? moduleX + modulePort.x * moduleSize.width : null;
                                                                const modulePortY = modulePort ? modulePort.y * moduleSize.height : null;
                                                                const relayPorts = imageKey ? (wirelessPortsByType[imageKey] || []) : [];
                                                                const relayInPort = relayDevice ? getRelayInputPort(relayPorts, relayType, imageKey) : null;
                                                                const relaySystemIndex = relayDevice
                                                                    ? Math.max(0, getDoubleRelayDevices(scheme)
                                                                        .filter((device) => canonicalDeviceType(device?.type) === relayType)
                                                                        .findIndex((device) => (relayDevice.id != null && device?.id != null
                                                                            ? device.id === relayDevice.id
                                                                            : device === relayDevice))) + 1
                                                                    : 0;
                                                                const infoTitle = getDeviceStoredTitle(relayDevice)
                                                                    || (relayType === 'pump-220v' ? 'Насос 220V'
                                                                        : relayType === 'boiler-pump' ? 'Насос бойлера'
                                                                            : relayType === '220servo' ? `Сервопривод ${relaySystemIndex}`
                                                                                : relayType === 'valve' ? `Запорный клапан ${relaySystemIndex}`
                                                                                    : relayType === 'zoneServo' ? 'Сервопривод зоны'
                                                                                        : isRelayBoilerType(relayType) ? (relayDevice?.name || 'Котел')
                                                                                            : 'Прочее оборудование');
                                                                const hoverKey = `${moduleIndex}:${lineKey}:${relayIndex}`;
                                                                return (
                                                                    <Group
                                                                        key={`wifi-relay-${moduleIndex}-${relayIndex}`}
                                                                        onMouseEnter={() => setHoveredRelaySlotKey(hoverKey)}
                                                                        onMouseLeave={() => setHoveredRelaySlotKey((current) => (current === hoverKey ? null : current))}
                                                                    >
                                                                        <Rect
                                                                            name="module-device-slot"
                                                                            collisionOccupied={Boolean(relayDevice)}
                                                                            x={slotX}
                                                                            y={slotY}
                                                                            width={slotSize.width}
                                                                            height={slotSize.height}
                                                                            cornerRadius={10}
                                                                            fill={relayDevice ? TRANSPARENT_FILL : EMPTY_SLOT_FILL}
                                                                            stroke={relayDevice ? TRANSPARENT_FILL : EMPTY_SLOT_STROKE}
                                                                            strokeWidth={1.5}
                                                                        />
                                                                        {!relayDevice && modulePort && (
                                                                            <Line
                                                                                points={[
                                                                                    side === 'left' ? slotX + slotSize.width : slotX,
                                                                                    slotY + slotSize.height / 2,
                                                                                    modulePortX,
                                                                                    slotY + slotSize.height / 2,
                                                                                    modulePortX,
                                                                                    modulePortY,
                                                                                ]}
                                                                                stroke="#9e9e9e"
                                                                                strokeWidth={1}
                                                                                lineCap="round"
                                                                                lineJoin="round"
                                                                                listening={false}
                                                                            />
                                                                        )}
                                                                        {!relayDevice && <Text x={slotX + slotSize.width - 13} y={slotY + 2} width={10} height={10} text={String(relayIndex + 1)} fontSize={7} fill="#7b8494" align="right" listening={false} />}
                                                                        {relayDevice && image && <Image image={image} x={imageX} y={imageY} width={imageSize.width} height={imageSize.height} listening={false} />}
                                                                        {relayDevice && modulePort && image && relayInPort && String(relayDevice?.connection_type || '').toLowerCase() !== 'double_relay' && (
                                                                            <Line
                                                                                points={getRelayLinkPointsFromDevice({
                                                                                    fromX: imageX + relayInPort.x * imageSize.width,
                                                                                    fromY: imageY + relayInPort.y * imageSize.height,
                                                                                    toX: modulePortX,
                                                                                    toY: modulePortY,
                                                                                    device: visualDevice,
                                                                                    imageKey,
                                                                                    indentSize,
                                                                                })}
                                                                                stroke="#d32f2f"
                                                                                strokeWidth={1}
                                                                                lineCap="round"
                                                                                lineJoin="round"
                                                                                listening={false}
                                                                            />
                                                                        )}
                                                                        {relayDevice && image && String(relayDevice?.connection_type || '').toLowerCase() === 'double_relay' && (() => {
                                                                            const nextModulePort = getPortByNames(modulePorts, [`${relayPortPrefix}-${relayIndex + 2}-B`]);
                                                                            const firstRelayPort = getRelayTerminalPort(relayPorts, 1);
                                                                            const secondRelayPort = getRelayTerminalPort(relayPorts, 2);
                                                                            if (!modulePort || !nextModulePort || !firstRelayPort || !secondRelayPort) return null;
                                                                            const from1X = imageX + firstRelayPort.x * imageSize.width;
                                                                            const from1Y = imageY + firstRelayPort.y * imageSize.height;
                                                                            const from2X = imageX + secondRelayPort.x * imageSize.width;
                                                                            const from2Y = imageY + secondRelayPort.y * imageSize.height;
                                                                            const to1X = moduleX + modulePort.x * moduleSize.width;
                                                                            const to1Y = modulePort.y * moduleSize.height;
                                                                            const to2X = moduleX + nextModulePort.x * moduleSize.width;
                                                                            const to2Y = nextModulePort.y * moduleSize.height;
                                                                            return <><Line points={[from1X, from1Y, to1X, from1Y, to1X, to1Y]} stroke="#d32f2f" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} /><Line points={[from2X, from2Y, to2X, from2Y, to2X, to2Y]} stroke="#d32f2f" strokeWidth={1} lineCap="round" lineJoin="round" listening={false} /></>;
                                                                        })()}
                                                                        {!relayDevice && <Circle x={slotX + slotSize.width / 2} y={slotY + slotSize.height / 2} radius={16} fill={ADD_ACTION_FILL} onClick={(event) => { const pos = event.target.getAbsolutePosition(); setRelayMenuPos({ x: pos.x, y: pos.y, moduleGroup: 'wifi', moduleIndex, relaySlotIndex: relayIndex, lineKey }); }} onTap={(event) => { const pos = event.target.getAbsolutePosition(); setRelayMenuPos({ x: pos.x, y: pos.y, moduleGroup: 'wifi', moduleIndex, relaySlotIndex: relayIndex, lineKey }); }} />}
                                                                        {!relayDevice && <Text x={slotX + slotSize.width / 2} y={slotY + slotSize.height / 2} text="+" fontSize={22} fill={ADD_ACTION_TEXT_FILL} offsetX={6.5} offsetY={9} listening={false} />}
                                                                          {relayDevice && hoveredRelaySlotKey === hoverKey && <SlotDeleteButton x={slotX + slotSize.width - 5} y={slotY + 5} onRemove={() => removeWifiModuleRelayDeviceAtSlot(moduleIndex, lineKey, relayIndex)} />}
                                                                        {relayDevice && (
                                                                            <>
                                                                                <Rect x={slotX} y={slotY - (INFO_BLOCK_HEIGHT + 8)} width={slotSize.width} height={INFO_BLOCK_HEIGHT} cornerRadius={1} fill={INFO_BLOCK_FILL} stroke={INFO_BLOCK_STROKE} strokeWidth={INFO_BLOCK_STROKE_WIDTH} />
                                                                                <EditableInfoTitle x={slotX + 3} y={slotY - (INFO_BLOCK_HEIGHT + 8)} width={Math.max(34, slotSize.width - 6)} height={INFO_BLOCK_HEIGHT} text={infoTitle} fontSize={4} fill={INFO_BLOCK_TEXT_COLOR} align="center" verticalAlign="middle" device={relayDevice} title={infoTitle} />
                                                                            </>
                                                                        )}
                                                                    </Group>
                                                                );
                                                            });
                                                            const renderRelayGroupPowerFeed = (groupPortName, lineOccupancy) => {
                                                                if (!lineOccupancy.some(Boolean)) return null;
                                                                const groupAPort = modulePorts.find((port) => port.name === groupPortName);
                                                                if (!groupAPort) return null;
                                                                const fromX = moduleX + groupAPort.x * moduleSize.width;
                                                                const fromY = groupAPort.y * moduleSize.height;
                                                                const endY = fromY - 3 * indentSize;
                                                                return (
                                                                    <Group key={`wifi-relay-power-feed-${moduleIndex}-${groupPortName}`}>
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
                                                                    {renderRelayGroupPowerFeed(`${relayPortPrefix}-1-2-3-A`, relayOccupancy.slice(0, 3))}
                                                                    {renderRelayGroupPowerFeed(`${relayPortPrefix}-4-5-6-A`, relayOccupancy.slice(3, 6))}
                                                                    {renderLine('left', relayOccupancy.slice(0, 3), 0)}
                                                                    {renderLine('right', relayOccupancy.slice(3, 6), 3)}
                                                                </>
                                                            );
                                                        })()}
                                                        {occupied && Array.from({ length: oneWireSlotCount }).map((__, sensorIndex) => {
                                                            const sensor = oneWireDevices[sensorIndex] || null;
                                                            const slotPos = getWifiOneWireSlotPosition(sensorIndex);
                                                            const imageKey = sensor ? getWirelessDeviceImageKey(sensor) : null;
                                                            const image = imageKey ? wirelessImages[imageKey] : null;
                                                            const sensorPorts = imageKey ? (wirelessPortsByType[imageKey] || ONE_WIRE_SLOT_FAKE_PORTS) : ONE_WIRE_SLOT_FAKE_PORTS;
                                                            const offsetKey = getWifiOneWireOffsetKey(sensor, sensorIndex);
                                                            const currentPorts = {
                                                                '1-WIRE-V+': getOneWirePortByRole(sensorPorts, '1-WIRE-V+'),
                                                                '1-WIRE-DAT': getOneWirePortByRole(sensorPorts, '1-WIRE-DAT'),
                                                                '1-WIRE-GND': getOneWirePortByRole(sensorPorts, '1-WIRE-GND'),
                                                            };
                                                            const hoverKey = `${moduleIndex}:${sensorIndex}`;
                                                            const lineSegments = ['1-WIRE-V+', '1-WIRE-DAT', '1-WIRE-GND'].flatMap((name, linkIndex) => {
                                                                const to = currentPorts[name];
                                                                if (!to) return [];
                                                                const previous = sensorIndex === 0 ? null : oneWireDevices[sensorIndex - 1];
                                                                const previousPorts = previous
                                                                    ? (wirelessPortsByType[getWirelessDeviceImageKey(previous)] || ONE_WIRE_SLOT_FAKE_PORTS)
                                                                    : modulePorts;
                                                                const from = getOneWirePortByRole(previousPorts, name);
                                                                if (!from) return [];
                                                                const previousPos = sensorIndex === 0
                                                                    ? { x: moduleX, y: 0 }
                                                                    : getWifiOneWireSlotPosition(sensorIndex - 1);
                                                                const fromWidth = sensorIndex === 0 ? moduleSize.width : ONE_WIRE_SLOT_SIZE;
                                                                const fromHeight = sensorIndex === 0 ? moduleSize.height : ONE_WIRE_SLOT_SIZE;
                                                                const fromX = previousPos.x + from.x * fromWidth;
                                                                const fromY = previousPos.y + from.y * fromHeight;
                                                                const toX = sensor
                                                                    ? slotPos.x + to.x * ONE_WIRE_SLOT_SIZE
                                                                    : slotPos.x + to.x;
                                                                const toY = sensor
                                                                    ? slotPos.y + to.y * ONE_WIRE_SLOT_SIZE
                                                                    : slotPos.y + to.y;
                                                                const targetType = canonicalDeviceType(sensor?.type);
                                                                // Настенный цифровой датчик подключается к боковым
                                                                // контактам напрямую, как на controller 1-wire линии.
                                                                if (targetType === 'wall-digital-sensor') {
                                                                    return [{
                                                                        key: `${name}-${sensorIndex}`,
                                                                        role: name,
                                                                        points: [toX, toY, fromX, toY, fromX, fromY],
                                                                    }];
                                                                }
                                                                const bendY = getOneWireBendY({
                                                                    slotTop: slotPos.y,
                                                                    slotHeight: ONE_WIRE_SLOT_SIZE,
                                                                    offset: (linkIndex + 1) * indentSize,
                                                                    fromY,
                                                                    toY,
                                                                    isTargetThermostat: targetType === 'thermostat' || isFlaskSensorType(targetType),
                                                                });

                                                                return [{
                                                                    key: `${name}-${sensorIndex}`,
                                                                    role: name,
                                                                    points: getOrthogonalLinkPoints(fromX, fromY, bendY, toX, toY),
                                                                }];
                                                            });
                                                            return (
                                                                <Group
                                                                    key={`wifi-onewire-${moduleIndex}-${sensorIndex}`}
                                                                    draggable={Boolean(sensor)}
                                                                    onDragStart={(event) => {
                                                                        event.cancelBubble = true;
                                                                        wifiOneWireDragStartRef.current[offsetKey] = wifiOneWireSlotOffsets[offsetKey] || { x: 0, y: 0 };
                                                                        wifiOneWireDragStartPointerRef.current[offsetKey] = event.target.getStage()?.getPointerPosition() || { x: 0, y: 0 };
                                                                    }}
                                                                    onDragMove={(event) => {
                                                                        event.cancelBubble = true;
                                                                        const stage = event.target.getStage();
                                                                        const pointer = stage?.getPointerPosition();
                                                                        if (!pointer) return;
                                                                        const startPointer = wifiOneWireDragStartPointerRef.current[offsetKey] || pointer;
                                                                        const startOffset = wifiOneWireDragStartRef.current[offsetKey] || { x: 0, y: 0 };
                                                                        const scale = stage?.scaleX() || 1;
                                                                        setWifiOneWireSlotOffsets((current) => ({
                                                                            ...current,
                                                                            [offsetKey]: {
                                                                                x: startOffset.x + (pointer.x - startPointer.x) / scale,
                                                                                y: startOffset.y + (pointer.y - startPointer.y) / scale,
                                                                            },
                                                                        }));
                                                                        event.target.position({ x: 0, y: 0 });
                                                                    }}
                                                                    onDragEnd={(event) => {
                                                                        event.cancelBubble = true;
                                                                        delete wifiOneWireDragStartRef.current[offsetKey];
                                                                        delete wifiOneWireDragStartPointerRef.current[offsetKey];
                                                                        event.target.position({ x: 0, y: 0 });
                                                                    }}
                                                                    onMouseEnter={() => setHoveredWifiOneWireSlotKey(hoverKey)}
                                                                    onMouseLeave={() => setHoveredWifiOneWireSlotKey((current) => (current === hoverKey ? null : current))}
                                                                >
                                                                    <OneWireLine segments={lineSegments} />
                                                                    {sensor && <><Rect x={slotPos.x} y={slotPos.y - (INFO_BLOCK_HEIGHT + 14)} width={ONE_WIRE_SLOT_SIZE} height={INFO_BLOCK_HEIGHT} cornerRadius={1} fill={INFO_BLOCK_FILL} stroke={INFO_BLOCK_STROKE} strokeWidth={INFO_BLOCK_STROKE_WIDTH} /><EditableInfoTitle x={slotPos.x + 4} y={slotPos.y - (INFO_BLOCK_HEIGHT + 14)} width={ONE_WIRE_SLOT_SIZE - 8} height={INFO_BLOCK_HEIGHT} text={getDeviceStoredTitle(sensor) || getOneWireDeviceTitle(oneWireDevices, sensor, sensorIndex)} fontSize={4} fill={INFO_BLOCK_TEXT_COLOR} align="center" verticalAlign="middle" device={sensor} title={getDeviceStoredTitle(sensor) || getOneWireDeviceTitle(oneWireDevices, sensor, sensorIndex)} /></>}
                                                                    <Rect x={slotPos.x} y={slotPos.y} width={ONE_WIRE_SLOT_SIZE} height={ONE_WIRE_SLOT_SIZE} cornerRadius={10} fill={sensor ? TRANSPARENT_FILL : EMPTY_SLOT_FILL} stroke={sensor ? TRANSPARENT_FILL : EMPTY_SLOT_STROKE} strokeWidth={1.5} />
                                                                    {sensor && image && <Image image={image} x={slotPos.x} y={slotPos.y} width={ONE_WIRE_SLOT_SIZE} height={ONE_WIRE_SLOT_SIZE} listening={false} />}
                                                                    {!sensor && <Circle x={slotPos.x + ONE_WIRE_SLOT_SIZE / 2} y={slotPos.y + ONE_WIRE_SLOT_SIZE / 2} radius={16} fill={ADD_ACTION_FILL} onClick={(event) => { const pos = event.target.getAbsolutePosition(); setWifiOneWireMenuPos({ x: pos.x, y: pos.y, moduleIndex, slotIndex: sensorIndex }); }} onTap={(event) => { const pos = event.target.getAbsolutePosition(); setWifiOneWireMenuPos({ x: pos.x, y: pos.y, moduleIndex, slotIndex: sensorIndex }); }} />}
                                                                    {!sensor && <Text x={slotPos.x + ONE_WIRE_SLOT_SIZE / 2} y={slotPos.y + ONE_WIRE_SLOT_SIZE / 2} text="+" fontSize={22} fill={ADD_ACTION_TEXT_FILL} offsetX={6.5} offsetY={9} listening={false} />}
                                                                    {sensor && hoveredWifiOneWireSlotKey === hoverKey && <SlotDeleteButton x={slotPos.x + ONE_WIRE_SLOT_SIZE - 5} y={slotPos.y + 5} onRemove={() => removeWifiOneWireDeviceAtSlot(moduleIndex, sensorIndex)} />}
                                                                    {showPorts && sensorPorts.map((port) => <Circle key={`${sensorIndex}-${port.name}`} x={slotPos.x + port.x * ONE_WIRE_SLOT_SIZE} y={slotPos.y + port.y * ONE_WIRE_SLOT_SIZE} radius={2.5} fill="red" />)}
                                                                </Group>
                                                            );
                                                        })}
                                                        {showPorts && occupied && modulePorts.filter((port) => !String(port.name).includes('INDICATOR')).map((port) => <Circle key={`wifi-port-${port.name}`} x={moduleX + port.x * moduleSize.width} y={port.y * moduleSize.height} radius={2.5} fill="red" />)}
                                                        {!occupied && <Circle x={pairWidth / 2} y={moduleSize.height / 2} radius={16} fill={ADD_ACTION_FILL} onClick={(event) => { const pos = event.target.getAbsolutePosition(); setWifiMenuPos({ x: pos.x, y: pos.y, slotIndex: moduleIndex }); }} onTap={(event) => { const pos = event.target.getAbsolutePosition(); setWifiMenuPos({ x: pos.x, y: pos.y, slotIndex: moduleIndex }); }} />}
                                                        {!occupied && <Text x={pairWidth / 2} y={moduleSize.height / 2} text="+" fontSize={22} fill={ADD_ACTION_TEXT_FILL} offsetX={6.5} offsetY={9} listening={false} />}
                                                        {occupied && hoveredWifiSlotKey === offsetKey && <SlotDeleteButton x={pairWidth - 5} y={5} onRemove={() => removeWifiModuleAtSlot(moduleIndex)} />}
                                                    </Group>
                                                );
                                            })}
                                        </>
                                    );
                                })()}
    </>
    );
};

export default WifiLine;

export const WifiLineMenus = ({
    enabled,
    wifiMenuPos,
    setWifiMenuPos,
    addWifiModuleAtSlot,
    wifiOneWireMenuPos,
    setWifiOneWireMenuPos,
    addWifiOneWireDeviceAtSlot,
}) => (
    <>
        {enabled && wifiMenuPos && (
            <div className="ctx-menu-backdrop" onClick={() => setWifiMenuPos(null)}>
                <div className="ctx-menu" style={{ left: wifiMenuPos.x, top: wifiMenuPos.y }} onClick={(event) => event.stopPropagation()}>
                    <div className="ctx-menu-item" onClick={() => addWifiModuleAtSlot('rl6w', wifiMenuPos.slotIndex)}>Модуль RL6W</div>
                    <div className="ctx-menu-item" onClick={() => addWifiModuleAtSlot('rl6sw', wifiMenuPos.slotIndex)}>Модуль RL6SW</div>
                    <div className="ctx-menu-sep" />
                    <div className="ctx-menu-item" onClick={() => setWifiMenuPos(null)}>Cancel</div>
                </div>
            </div>
        )}
        {enabled && wifiOneWireMenuPos && (
            <div className="ctx-menu-backdrop" onClick={() => setWifiOneWireMenuPos(null)}>
                <div className="ctx-menu" style={{ left: wifiOneWireMenuPos.x, top: wifiOneWireMenuPos.y }} onClick={(event) => event.stopPropagation()}>
                    <div className="ctx-menu-item" onClick={() => addWifiOneWireDeviceAtSlot(wifiOneWireMenuPos.moduleIndex, wifiOneWireMenuPos.slotIndex, 'wall-temperature-sensor')}>Настенный проводной датчик</div>
                    <div className="ctx-menu-item" onClick={() => addWifiOneWireDeviceAtSlot(wifiOneWireMenuPos.moduleIndex, wifiOneWireMenuPos.slotIndex, 'flask-sensor-temperature')}>Датчик температуры в колбе проводной</div>
                    <div className="ctx-menu-sep" />
                    <div className="ctx-menu-item" onClick={() => setWifiOneWireMenuPos(null)}>Cancel</div>
                </div>
            </div>
        )}
    </>
);
