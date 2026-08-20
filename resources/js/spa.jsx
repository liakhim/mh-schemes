import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Konva from 'konva';
import { Circle as KonvaCircle, Group, Image, Layer, Rect, Stage, Text } from 'react-konva';
import '../css/app.css';
import {
    AERIAL_HEIGHT,
    AERIAL_WIDTH,
    CANVAS_GRID_MAX,
    CANVAS_GRID_MIN,
    din,
    incomingScheme,
    indent,
    module_height,
    ONE_WIRE_SLOT_SIZE,
} from './constants';
import { canonicalDeviceType } from './scheme/domain/deviceTypes';
import { getDeviceBaseTitle, getDeviceStoredTitle, getWirelessDeviceTitle, getOneWireDeviceTitle } from './scheme/domain/deviceTitles';
import { collectEquipmentTableRows } from './scheme/domain/equipmentTable';
import {
    CONTROLLER_KIT_SENSOR_LIMITS,
    CONTROLLER_KIT_SENSOR_PRODUCTS,
    getControllerKitSensorBucket,
    getControllerKitSensorState,
    isBundledSensorDevice,
} from './scheme/domain/controllerKitSensors';
import { getOneWireDevicesFromScheme } from './scheme/domain/initialState';
import { normalizeIncomingScheme } from './scheme/domain/incomingSchemeNormalizer';
import { balanceOneWireDevices } from './scheme/domain/oneWireBalancer';
import { materializeBalancedOneWireScheme } from './scheme/domain/oneWireMaterializer';
import { normalizeSchemeIds } from './scheme/domain/schemeIds';
import { addOneWireDeviceToScheme, removeOneWireDeviceFromScheme } from './scheme/domain/oneWireMutations';
import {
    buildSmart2InstallationDiConnections,
    getDi6PhysicalDevices,
    getSmart2InstallationPowerChainHead,
} from './scheme/domain/installationDi';
import {
    getControllerExtFloorThermostat,
    getInstallationDeviceLabel,
    getInstallationPortConnectionLabel,
    getInstallationPortLineColor,
    hasExtThermostatFloorSensor,
    INSTALLATION_DEVICE_TYPE_TITLES,
    isInstallationPortOccupied,
    POWER_UNIT_LABEL,
} from './scheme/domain/installationPorts';
import { shouldIncludeCollisionSlot, translateRect, unionRects } from './scheme/domain/collisionGeometry';
import { getInstallationDinTotal } from './scheme/domain/installationDin';
import { buildControllerOnlyScheme, isControllerOnlyScheme } from './scheme/domain/controllerOnlyScheme';
import { materializePowerModules } from './scheme/domain/powerModules';
import { normalizeWifiModules, WIFI_ONE_WIRE_CAPACITY, WIFI_RELAY_CAPACITY } from './scheme/domain/wifiModules';
import { getLeakZoneSensors, isLeakLoop, materializeLeakZones } from './scheme/domain/leakZones';
import { getRinnaiBusSlotYOffset, RINNAI_ADAPTER_LABEL, RINNAI_ADAPTER_PRICE, usesRinnaiAdapter, withRinnaiAdapter } from './scheme/domain/rinnaiAdapter';
import {
    buildRelaySlotOccupancyPreserveIndexes,
    getRl6RelayTerminalNames,
    removeRelayDeviceAtSlotFromLine,
    upsertRelayDeviceAtSlot,
} from './scheme/domain/relaySlots';
import { restorePublicDevicesFromModules, serializePublicScheme } from './scheme/publicSchemeSerializer';
import { controllerImagePaths, wirelessDeviceImagePaths, getWirelessDeviceImageKey, aerialImagePath, goAerialImagePath } from './scheme/assets/imageRegistry';
import { getOneWireDirectionForDevice, getOneWireLineGeometry, getOneWireSlotPosition } from './scheme/layout/oneWireLayout';
import { getPinchStageTransform } from './scheme/layout/stageZoom';
import {
    getWirelessInfoBlockY,
    getWirelessLineLift,
    getWirelessLineTop,
    getWirelessSlotHeight,
    getWirelessSlotWidth,
    getWirelessSlotX,
    getWirelessSlotYByIndex,
} from './scheme/layout/wirelessLineLayout';
import {
    DI_SLOT_MIN_GAP_MULTIPLIER,
    DI_SLOT_SIZE,
    EXT_SLOT_MIN_GAP_MULTIPLIER,
    EXT_SLOT_SIZE,
    ONE_WIRE_THERMOSTAT_SIZE,
    THERMOSTAT_IMAGE_SIZE,
    THERMOSTAT_SLOT_PADDING,
} from './scheme/layout/renderConstants';
import { parsePorts, withFallbackPorts, getPortsByClassToken } from './scheme/layout/portParsing';
import { getOneWirePortByRole, getPortPosition } from './scheme/layout/ports';
import { Line, snapPixel } from './scheme/rendering/SharpLine';
import EquipmentOfferModal from './components/EquipmentOfferModal';
import SelectionConfigModal from './components/SelectionConfigModal';
import SchemeFloatingTools from './components/SchemeFloatingTools';
import SchemeRightTools from './components/SchemeRightTools';
import { WifiLineMenus } from './components/WifiLine';
import DeviceIndicator from './components/DeviceIndicator';
import SchemeCanvas from './components/SchemeCanvas';
import { DeviceInfoBlockProvider } from './components/DeviceInfoBlock';
import InstallationCanvas, {
    getInstallationLayoutItemKey,
    readInstallationLayout,
    writeInstallationLayout,
} from './components/InstallationCanvas';
import SlotContextMenus from './components/SlotContextMenus';
import SchemeHelpModal from './components/SchemeHelpModal';
import IncomingSchemeDebugPanel from './components/IncomingSchemeDebugPanel';
import logoPath from '../assets/logo/logo.svg';
import commentIconPath from '../assets/icons/comment-icon.svg';
import commentAddIconPath from '../assets/icons/comment-add-icon.svg';

Konva.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

const NAV_HEIGHT = 0;
const COMMENT_ICON_NODE_NAME = 'comment-icon-export-hidden';
const GRID_STROKE = 'rgba(154, 160, 166, 0.22)';
const HELP_MODAL_STORAGE_KEY = 'mh-schemes-help-seen';

const getRuntimeOffsetKey = (item, index, prefix) => (
    item && typeof item === 'object' && item.id != null
        ? `${prefix}:id:${item.id}`
        : `${prefix}:index:${index}`
);

const getOneWireOffsetKey = (device, slotIndex) => getRuntimeOffsetKey(device, slotIndex, 'onewire');
const getExtOffsetKey = (device, slotIndex) => getRuntimeOffsetKey(device, slotIndex, 'ext');
const getDiOffsetKey = (device, slotIndex) => getRuntimeOffsetKey(device, slotIndex, 'di');
const getWifiOffsetKey = (device, slotIndex) => getRuntimeOffsetKey(device, slotIndex, 'wifi');
const getExtOneWireOffsetKey = (moduleDevice, moduleIndex, device, slotIndex) => (
    `${getExtOffsetKey(moduleDevice, moduleIndex)}/${getRuntimeOffsetKey(device, slotIndex, 'onewire')}`
);

const getCanvasSize = () => ({
    width: window.innerWidth,
    height: Math.max(window.innerHeight - NAV_HEIGHT, 240),
});

/**
 * Масштабирует сцену относительно экранной точки, оставляя объект под курсором на месте.
 * @param {Konva.Stage} stage Сцена Konva.
 * @param {{x: number, y: number}} point Точка масштабирования в координатах сцены.
 * @param {number} nextScale Требуемый масштаб; функция ограничит его диапазоном 0.4-3.
 */
const scaleStageAtPoint = (stage, point, nextScale) => {
    const oldScale = stage.scaleX();
    const clampedScale = Math.max(0.4, Math.min(nextScale, 3));
    const contentPoint = {
        x: (point.x - stage.x()) / oldScale,
        y: (point.y - stage.y()) / oldScale,
    };
    stage.position({
        x: snapPixel(point.x - contentPoint.x * clampedScale),
        y: snapPixel(point.y - contentPoint.y * clampedScale),
    });
    stage.scale({ x: clampedScale, y: clampedScale });
    stage.batchDraw();
};

const getContainSize = (image, maxWidth, maxHeight) => {
    if (!image?.width || !image?.height) {
        return { width: maxWidth, height: maxHeight };
    }

    const ratio = Math.min(maxWidth / image.width, maxHeight / image.height);
    return {
        width: image.width * ratio,
        height: image.height * ratio,
    };
};

const getFullWidthSize = (image, width, fallbackHeight) => {
    if (!image?.width || !image?.height) {
        return { width, height: fallbackHeight };
    }

    return {
        width,
        height: image.height * (width / image.width),
    };
};

const getEcosmartBl2OverlayGeometry = ({ controllerWidth, controllerHeight, controllerPorts, modulePorts }) => {
    const controllerAnchor1 = controllerPorts.find((port) => port.name === 'ECOSMART-ANCHOR-1');
    const controllerAnchor2 = controllerPorts.find((port) => port.name === 'ECOSMART-ANCHOR-2');
    const moduleAnchor1 = modulePorts.find((port) => port.name === 'ECOSMART-ANCHOR-1');
    const moduleAnchor2 = modulePorts.find((port) => port.name === 'ECOSMART-ANCHOR-2');
    if (!controllerAnchor1 || !controllerAnchor2 || !moduleAnchor1 || !moduleAnchor2) return null;

    const moduleAnchorDeltaX = moduleAnchor2.x - moduleAnchor1.x;
    const moduleAnchorDeltaY = moduleAnchor2.y - moduleAnchor1.y;
    if (moduleAnchorDeltaX === 0 || moduleAnchorDeltaY === 0) return null;

    const controllerAnchor1X = controllerAnchor1.x * controllerWidth;
    const controllerAnchor1Y = controllerAnchor1.y * controllerHeight;
    const width = ((controllerAnchor2.x - controllerAnchor1.x) * controllerWidth) / moduleAnchorDeltaX;
    const height = ((controllerAnchor2.y - controllerAnchor1.y) * controllerHeight) / moduleAnchorDeltaY;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;

    return {
        x: controllerAnchor1X - moduleAnchor1.x * width,
        y: controllerAnchor1Y - moduleAnchor1.y * height,
        width,
        height,
    };
};

const createGridPatternImage = (step) => {
    const size = Math.max(1, Math.round(step));
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.strokeStyle = GRID_STROKE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0.5, 0);
    ctx.lineTo(0.5, size);
    ctx.moveTo(0, 0.5);
    ctx.lineTo(size, 0.5);
    ctx.stroke();

    return canvas;
};

/**
 * Приводит входной JSON к внутренней модели редактора и материализует распределенные линии.
 * @param {object} sourceScheme Публичная incoming_scheme, включая возможные legacy-поля.
 * @returns {object} Схема, готовая для отрисовки и ручного редактирования.
 */
const buildSchemeFromIncoming = (sourceScheme) => {
    const canonicalSourceScheme = normalizeIncomingScheme(normalizeSchemeIds(sourceScheme));
    const normalizeRinnaiAdapters = (schemeValue) => {
        const controller = schemeValue?.controller && typeof schemeValue.controller === 'object'
            ? {
                ...schemeValue.controller,
                bus_devices: Array.isArray(schemeValue.controller.bus_devices)
                    ? schemeValue.controller.bus_devices.map(withRinnaiAdapter)
                    : schemeValue.controller.bus_devices,
            }
            : schemeValue?.controller;

        return {
            ...schemeValue,
            controller,
            boilers: Array.isArray(schemeValue?.boilers) ? schemeValue.boilers.map(withRinnaiAdapter) : schemeValue?.boilers,
            ext_modules: Array.isArray(schemeValue?.ext_modules)
                ? schemeValue.ext_modules.map((moduleItem) => ({
                    ...moduleItem,
                    bus_devices: Array.isArray(moduleItem?.bus_devices)
                        ? moduleItem.bus_devices.map(withRinnaiAdapter)
                        : moduleItem?.bus_devices,
                }))
                : schemeValue?.ext_modules,
        };
    };
    const legacyEcosmartBl2 = Array.isArray(canonicalSourceScheme?.ecosmart_bl2) ? canonicalSourceScheme.ecosmart_bl2 : null;
    const {
        ecosmart_bl2: removedEcosmartBl2,
        installation_layout: removedInstallationLayout,
        ...schemeWithoutLegacyEcosmartBl2
    } = canonicalSourceScheme || {};
    const controller = schemeWithoutLegacyEcosmartBl2.controller;
    const normalizedController = controller && typeof controller === 'object'
        ? controller
        : { type: canonicalDeviceType(controller) || 'ecosmart' };
    const normalizedScheme = normalizeRinnaiAdapters(legacyEcosmartBl2
        && (!Array.isArray(normalizedController.ecosmart_bl2) || normalizedController.ecosmart_bl2.length === 0)
        ? {
            ...schemeWithoutLegacyEcosmartBl2,
            controller: { ...normalizedController, ecosmart_bl2: legacyEcosmartBl2 },
        }
        : schemeWithoutLegacyEcosmartBl2);
    const controllerType = canonicalDeviceType(
        typeof normalizedScheme.controller === 'string' ? normalizedScheme.controller : normalizedScheme.controller?.type,
    );
    const upsRequested = (Array.isArray(normalizedScheme.power_modules) ? normalizedScheme.power_modules : [])
        .some((moduleItem) => canonicalDeviceType(typeof moduleItem === 'string' ? moduleItem : moduleItem?.type) === 'ups');
    const powerModules = materializePowerModules(normalizedScheme.power_modules, controllerType, upsRequested);
    const schemeWithPowerModules = powerModules.length > 0 || Object.prototype.hasOwnProperty.call(normalizedScheme, 'power_modules')
        ? { ...normalizedScheme, power_modules: powerModules }
        : normalizedScheme;
    // Плоские датчики протечки старых схем сворачиваются в зоны до балансировки:
    // дальше по конвейеру зона — обычное DI-устройство.
    const schemeWithLeakZones = materializeLeakZones(schemeWithPowerModules);

    return {
        ...materializeBalancedOneWireScheme(schemeWithLeakZones),
    };
};

const getRouteSchemeId = () => {
    const match = /^\/scheme\/(\d+)(?:\/)?$/i.exec(window.location.pathname);
    return match ? match[1] : null;
};

const getInitialSchemeRecord = () => {
    const record = window.__INITIAL_SCHEME_RECORD__;
    return record && typeof record === 'object' ? record : null;
};

const ONE_WIRE_PORT_ANCHORS = {
    'rdt2': {
        IN: {
            '1-WIRE-V+': { x: 25.2151 / 81, y: 185.331 / 201 },
            '1-WIRE-DAT': { x: 16.6791 / 81, y: 185.331 / 201 },
            '1-WIRE-GND': { x: 7.9157 / 81, y: 185.331 / 201 },
        },
        OUT: {
            '1-WIRE-V+': { x: 63.7646 / 81, y: 185.476 / 201 },
            '1-WIRE-DAT': { x: 55.2286 / 81, y: 185.476 / 201 },
            '1-WIRE-GND': { x: 46.4652 / 81, y: 185.476 / 201 },
        },
    },
    'ntc-1-wire': {
        IN: {
            '1-WIRE-V+': { x: 27.6293 / 121, y: 185.552 / 201 },
            '1-WIRE-DAT': { x: 19.0075 / 121, y: 185.552 / 201 },
            '1-WIRE-GND': { x: 10.1491 / 121, y: 185.552 / 201 },
        },
        OUT: {
            '1-WIRE-V+': { x: 101.27 / 121, y: 185.552 / 201 },
            '1-WIRE-DAT': { x: 92.6599 / 121, y: 185.552 / 201 },
            '1-WIRE-GND': { x: 83.8015 / 121, y: 185.552 / 201 },
        },
    },
};

const getAnchoredOneWirePort = (device, baseName, preferredDirection) => {
    const deviceType = canonicalDeviceType(device?.type);
    if (!preferredDirection) return null;
    const byType = ONE_WIRE_PORT_ANCHORS[deviceType];
    const anchor = byType?.[preferredDirection]?.[baseName];
    if (!anchor) return null;
    return { name: `${baseName} ${preferredDirection}`, x: anchor.x, y: anchor.y };
};

const getAnchoredOneWirePortsForDisplay = (device, originalPorts = []) => {
    const deviceType = canonicalDeviceType(device?.type);
    const byType = ONE_WIRE_PORT_ANCHORS[deviceType];
    if (!byType) return null;

    const names = ['1-WIRE-V+', '1-WIRE-DAT', '1-WIRE-GND'];
    const result = [];
    ['IN', 'OUT'].forEach((direction) => {
        names.forEach((name) => {
            const anchor = byType?.[direction]?.[name];
            if (anchor) {
                result.push({ name: `${name} ${direction}`, x: anchor.x, y: anchor.y });
            }
        });
    });

    const extraPorts = Array.isArray(originalPorts)
        ? originalPorts.filter((port) => {
            const portName = String(port?.name || '').toUpperCase();
            return !portName.startsWith('1-WIRE-');
        })
        : [];

    return [...result, ...extraPorts];
};

const getWirelessDeviceKey = (device, index) => (device?.id ?? `${device?.type || 'wireless'}-${index}`);
const getMorphImageKey = (device) => {
    const type = canonicalDeviceType(device?.type) || 'unknown';
    return device?.id != null ? `${type}:id:${device.id}` : `${type}:${JSON.stringify(device)}`;
};
const getControllerType = (schemeOrController) => {
    const controller = schemeOrController?.controller ?? schemeOrController;
    return canonicalDeviceType(typeof controller === 'string' ? controller : controller?.type);
};
const getControllerBodyBottomY = (controllerTypeValue, controllerImageValue) => {
    return controllerImageValue?.height || 0;
};
const getControllerLineDevices = (scheme, lineKey, fallback = []) => {
    const controller = scheme?.controller;
    if (controller && typeof controller === 'object' && Object.prototype.hasOwnProperty.call(controller, lineKey)) {
        return Array.isArray(controller[lineKey]) ? controller[lineKey] : [];
    }
    return Array.isArray(fallback) ? fallback : [];
};
const patchControllerLine = (scheme, lineKey, updater) => {
    if (!scheme?.controller || typeof scheme.controller !== 'object') return null;
    const currentLine = Array.isArray(scheme.controller[lineKey]) ? scheme.controller[lineKey] : [];
    return {
        ...scheme,
        controller: {
            ...scheme.controller,
            [lineKey]: updater(currentLine),
        },
    };
};
const ECOSMART_FIRST_ONE_WIRE_EXTRA_DOWN = {
    'ntc-1-wire': 3,
    thermostat: 3,
    rdt2: 8,
    'flask-sensor': 3,
    'flask-sensor-temperature': 3,
    'wall-digital-sensor': 3,
};
const getEcosmartFirstOneWireExtraDown = (device) => (
    ECOSMART_FIRST_ONE_WIRE_EXTRA_DOWN[canonicalDeviceType(device?.type)] || 0
);
const EXT_MODULE_TYPES = ['bl2', 'rl6', 'rl6s', 'io4', 'di6'];
const isThermostatFloorSensorAddition = (device) => {
    const type = canonicalDeviceType(device?.type);
    return type === 'floor-sensor' || type === 'flask-sensor-floor';
};
const isExtModuleAllowedForController = (moduleType, controllerType) => (
    !(canonicalDeviceType(controllerType) === 'ecosmart' && canonicalDeviceType(moduleType) === 'bl2')
);
const getExtModuleLineDefaults = (type) => {
    const normalizedType = canonicalDeviceType(type);
    if (normalizedType === 'bl2') return { bus_devices: [] };
    if (normalizedType === 'rl6') return { relay_devices: [] };
    if (normalizedType === 'rl6s') return { relay_s_devices: [] };
    if (normalizedType === 'io4') return { channel_devices: [] };
    if (normalizedType === 'di6') return { channel_devices: [], di_devices: [] };
    return {};
};
const getDiModuleLineDefaults = (type) => {
    const normalizedType = canonicalDeviceType(type);
    if (normalizedType === 'rl2') return { relay_devices: [] };
    if (normalizedType === 'rl2s') return { relay_s_devices: [] };
    return {};
};
const normalizeExtModule = (item, index) => {
    const rawType = typeof item === 'string' ? item : item?.type;
    const type = canonicalDeviceType(rawType);
    if (!EXT_MODULE_TYPES.includes(type)) return null;

    const base = item && typeof item === 'object' ? item : {};
    return {
        ...base,
        ...getExtModuleLineDefaults(type),
        ...base,
        id: base.id ?? `${type}-${index}`,
        type,
        connection_type: base.connection_type ?? 'EXT',
        one_wire_devices: Array.isArray(base.one_wire_devices) ? base.one_wire_devices : [],
    };
};
const getWifiModules = (schemeValue) => normalizeWifiModules(schemeValue?.wifi_modules) || [];
const getWifiCapacity = (controllerType) => (['pro', 'ecosmart'].includes(canonicalDeviceType(controllerType)) ? 6 : 1);
const DI_MODULE_TYPES = ['rl2', 'rl2s'];
const getSmart2DiModuleExtraSpacing = (device, indentValue) => {
    const type = canonicalDeviceType(typeof device === 'string' ? device : device?.type);
    if (type === 'rl2') return { left: 9 * indentValue, right: 9 * indentValue };
    if (type === 'rl2s') return { left: 0, right: 9 * indentValue };
    return { left: 0, right: 0 };
};
const DISCRETE_DI_DEVICE_TYPES = ['discrete_pool', 'discrete_fire_alarm', 'discrete_signal', 'discrete_ventilation'];
// Зона протечки занимает DI как одно устройство; одиночный датчик — legacy-форма.
const DI_WIRED_DEVICE_TYPES = [...DISCRETE_DI_DEVICE_TYPES, 'leak-loop', 'leak-sensor'];
const DI_DEVICE_TITLES = {
    discrete_pool: 'Дискретный бассейн',
    discrete_fire_alarm: 'Дискретная пожарка',
    discrete_signal: 'Дискретный сигнал',
    discrete_ventilation: 'Дискретная вентиляция',
    'leak-loop': 'Зона контроля протечки',
    'leak-sensor': 'Датчик протечки',
};
const LEAK_DI_DEVICE_TYPES = ['leak-loop', 'leak-sensor'];
const isLeakDiDeviceType = (type) => LEAK_DI_DEVICE_TYPES.includes(canonicalDeviceType(type));
const shouldShowDiDeviceInfoBlock = (device) => (
    DI_WIRED_DEVICE_TYPES.includes(canonicalDeviceType(device?.type))
);
const isDiscreteDiDeviceType = (type) => DISCRETE_DI_DEVICE_TYPES.includes(canonicalDeviceType(type));
const getInstallationItemLabel = (item) => {
    if (!item) return null;
    if (typeof item.installationLabel === 'string' && item.installationLabel.trim()) {
        return item.installationLabel.trim();
    }
    const type = canonicalDeviceType(item.type);
    if (item.key === 'controller') return INSTALLATION_DEVICE_TYPE_TITLES[type] || String(item.type || 'Контроллер').toUpperCase();
    return getInstallationDeviceLabel(item.data, INSTALLATION_DEVICE_TYPE_TITLES[type] || type || 'Модуль');
};
const uppercaseInstallationModuleTokens = (label) => String(label || '')
    .replace(/\b(rl2s|rl2|rl6sw|rl6w|rl6s|rl6|di6|io4|bl2|rdt2|rdt)\b/gi, (match) => match.toUpperCase());
const getInstallationMarkerText = (label) => {
    return uppercaseInstallationModuleTokens(label).trim();
};
const IO4_ONLY_WIRED_DEVICE_TYPES = ['010pump', '010servo'];
const normalizePowerModuleType = (type) => {
    const normalized = canonicalDeviceType(type);
    if (normalized === 'circuitbreaker') return 'circuit-breaker';
    if (normalized === 'powerunit') return 'power-unit';
    return normalized;
};
/**
 * Выбирает безопасный уровень ортогонального изгиба 1-wire линии.
 * @param {object} options Геометрия соединения: границы слота, отступ и координаты концов.
 * @returns {number} Координата Y изгиба.
 */
const getOneWireBendY = ({ slotTop, slotHeight, offset, fromY, toY, isTargetThermostat = false, sourceMinBendY = null }) => {
    const minBendY = Math.max(fromY, toY) + offset;
    if (isTargetThermostat) {
        const directBendY = Math.max(fromY, toY);
        return typeof sourceMinBendY === 'number' ? Math.max(directBendY, sourceMinBendY) : directBendY;
    }
    const defaultBendY = slotTop + slotHeight + offset;
    const bendY = Math.max(defaultBendY, minBendY);
    return typeof sourceMinBendY === 'number' ? Math.max(bendY, sourceMinBendY) : bendY;
};

const isFlaskSensorType = (type) => String(canonicalDeviceType(type) || '').startsWith('flask-sensor');
const isRelayBoilerType = (type) => {
    const normalizedType = canonicalDeviceType(type);
    return normalizedType === 'stupid' || normalizedType === 'smart';
};
const isStupidBoilerType = (type) => {
    const normalizedType = canonicalDeviceType(type);
    const rawType = typeof type === 'string' ? type.toLowerCase() : '';
    return normalizedType === 'stupid' || rawType === 'stupidboiler' || rawType === 'stupid-boiler';
};
const makeStupidBoilerSensor = (id = Date.now()) => ({
    id,
    device_type: 'sensor',
    type: 'flask-sensor-stupid-boiler',
    connection_type: '1-wire',
    title: 'Датчик котла',
});
const withStupidBoilerSensor = (schemeValue, type) => {
    if (!isStupidBoilerType(type)) return schemeValue;
    const sensors = Array.isArray(schemeValue?.sensors) ? schemeValue.sensors : [];
    return {
        ...schemeValue,
        sensors: [
            ...sensors,
            makeStupidBoilerSensor(),
        ],
    };
};

// Контроллеры, для которых доступен режим инсталляции.
const INSTALLATION_CONTROLLERS = new Set(['go', 'go+', 'smart2', 'pro', 'ecosmart']);
// Контроллеры, которые физически НЕ ставятся на DIN-рейку щитка (не модульного
// «реечного» форм-фактора): в режиме инсталляции они отрисовываются отдельным
// блоком слева от щитка, а не в ряду рейки.
const INSTALLATION_LEFT_CONTROLLERS = new Set(['go', 'go+', 'ecosmart']);

const getOrthogonalLinkPoints = (fromX, fromY, bendY, toX, toY) => [fromX, fromY, fromX, bendY, toX, bendY, toX, toY];
const isOtherEquipmentType = (type) => {
    const normalizedType = canonicalDeviceType(type);
    return normalizedType === 'otherequipment' || normalizedType === 'other-equipment';
};
const getOtherEquipmentExitDirection = (device, imageKey) => {
    if (!isOtherEquipmentType(device?.type)) return 0;
    if (String(imageKey || '').includes('left-port')) return -1;
    if (String(imageKey || '').includes('right-port')) return 1;
    if (device?.port_side === 'left') return -1;
    if (device?.port_side === 'right') return 1;
    return 0;
};
/**
 * Строит точки relay-линии к устройству с учетом стороны его входного порта.
 * @param {object} geometry Координаты концов, изгиба, устройство и шаг сетки.
 * @returns {number[]} Точки для Konva Line.
 */
const getRelayLinkPointsToDevice = ({ fromX, fromY, bendY, toX, toY, device, imageKey, indentSize }) => {
    const exitDirection = getOtherEquipmentExitDirection(device, imageKey);
    if (!exitDirection) return getOrthogonalLinkPoints(fromX, fromY, bendY, toX, toY);
    const exitX = toX + exitDirection * indentSize;
    return [fromX, fromY, fromX, bendY, exitX, bendY, exitX, toY, toX, toY];
};
const getRelayLinkPointsFromDevice = ({ fromX, fromY, toX, toY, device, imageKey, indentSize }) => {
    return [fromX, fromY, toX, fromY, toX, toY];
};
const snapToGrid = (value, step) => Math.round(value / step) * step;
/**
 * Извлекает конфигурацию обычных relay-слотов из SVG-портов контроллера.
 * @param {string} controllerType Тип контроллера.
 * @param {Array<object>} portsList Порты изображения контроллера.
 * @returns {object} Геометрия и емкость relay-линии.
 */
const getRelayLineConfig = (controllerType, portsList) => {
    if (!Array.isArray(portsList)) return [];
    if (controllerType === 'ecosmart') {
        return [{ index: 1, bPortName: null, aPortName: null, virtual: true }];
    }
    if (controllerType === 'pro') {
        return portsList
            .map((port) => {
                const match = /^RELAY-(\d+)-B$/i.exec(port?.name || '');
                if (!match) return null;
                const index = Number(match[1]);
                if (!Number.isFinite(index)) return null;
                return {
                    index,
                    bPortName: `RELAY-${index}-B`,
                    aPortName: `RELAY-${index}-A`,
                };
            })
            .filter(Boolean)
            .sort((a, b) => a.index - b.index);
    }

    return portsList
        .map((port) => {
            const match = /^RELAY-(\d+)-(B|NO)$/i.exec(port?.name || '');
            if (!match) return null;
            const index = Number(match[1]);
            if (!Number.isFinite(index)) return null;
            const aPortCandidate = portsList.find((item) => {
                const itemName = String(item?.name || '').toUpperCase();
                return itemName === `RELAY-${index}-A` || itemName === `RELAY-${index}-COM`;
            });
            const aPortName = aPortCandidate
                ? (String(aPortCandidate?.name || '').toUpperCase() === `RELAY-${index}-COM`
                    ? `RELAY-${index}-COM`
                    : `RELAY-${index}-A`)
                : null;
            return {
                index,
                bPortName: `RELAY-${index}-${match[2].toUpperCase()}`,
                aPortName,
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.index - b.index);
};

const getRelaySLineConfig = (controllerType, portsList) => {
    if (controllerType !== 'pro' || !Array.isArray(portsList)) return [];
    return portsList
        .map((port) => {
            const match = /^RELAY-S-(\d+)-B$/i.exec(port?.name || '');
            if (!match) return null;
            const index = Number(match[1]);
            if (!Number.isFinite(index)) return null;
            return {
                index,
                bPortName: `RELAY-S-${index}-B`,
                aPortName: `RELAY-S-${index}-A`,
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.index - b.index);
};

const isDoubleRelaySignalPort = (port) => {
    const name = String(port?.name || '').toUpperCase();
    return name === 'RELAY-IN-1'
        || name === 'RELAY-IN-2'
        || name === 'RELAY-1'
        || name === 'RELAY-2';
};

const OFFER_PRICES = {
    controllers: { go: 16990, 'go+': 22490, smart2: 18990, pro: 44990, ecosmart: 46990 },
    modules: { rl2: 3890, rl2s: 3890, rl6: 8990, rl6s: 9990, rl6w: 14990, rl6sw: 15990, rdt2: 4990, di6: 7990, io4: 7990, 'ntc-1-wire': 4190, bl2: 6990, ecosmartbl2: 6990 },
    thermostat: 9490,
    pressure: 5990,
    leak: null,
    ups: 9990,
    'wireless-outdoor': 5890,
    'wireless-wall': 4190,
    'wired-wall-digital': 1650,
    'wired-flask-digital': 1450,
    'wired-flask-ntc': 3190,
    radioModuleActivation: 3000,
};

const OFFER_CONTROLLER_LABELS = { go: 'GO', 'go+': 'GO+', smart2: 'Smart2', pro: 'PRO', ecosmart: 'ECOsmart' };
const OFFER_CONTROLLER_KIT_ROWS = {
    pro: [
        { key: 'wired-wall-digital', label: 'Цифровой датчик температуры настенный', count: 1 },
        { key: 'wired-flask-digital', label: 'Цифровой датчик температуры в колбе', count: 2 },
    ],
    smart2: [{ key: 'wired-wall-digital', label: 'Проводной Настенный цифровой датчик', count: 1 }],
    ecosmart: [{ key: 'wired-flask-ntc', label: 'NTC-датчик температуры', count: 3 }],
    go: [{ key: 'wired-wall-digital', label: 'Настенный цифровой датчик температуры', count: 1 }],
    'go+': [{ key: 'wireless-wall', label: 'Беспроводной комнатный датчик температуры', count: 1 }],
};

const OFFER_MODULE_LABELS = {
    rl2: 'Модуль реле RL2', rl2s: 'Модуль реле RL2S', rl6: 'Модуль реле RL6', rl6s: 'Модуль реле RL6S', rl6w: 'Wi-Fi модуль реле RL6W', rl6sw: 'Wi-Fi модуль реле RL6SW',
    rdt2: 'Радиомодуль RDT2', di6: 'Модуль DI6', io4: 'Модуль IO4', 'ntc-1-wire': 'Модуль NTC 1-Wire',
    bl2: 'Модуль BUS BL2', ecosmartbl2: 'Модуль ECOsmart BL2',
};

const getOfferTemperatureProduct = (type, controllerType) => {
    const kitBucket = getControllerKitSensorBucket(controllerType, type);
    if (kitBucket === 'wall') return ['wired-wall-digital', 'Датчик температуры настенный проводной'];
    if (kitBucket === 'flask') return ['wired-flask-digital', 'Датчик температуры в колбе проводной'];
    if (kitBucket === 'ntc') return ['wired-flask-ntc', 'Датчик температуры в колбе NTC 10K'];
    if (kitBucket === 'wireless') return ['wireless-wall', 'Радиодатчик температуры и влажности комнатный'];
    if (type === 'outdoor-temperature-sensor') return ['wireless-outdoor', 'Радиодатчик температуры уличный'];
    if (type === 'wall-temperature-sensor') return ['wireless-wall', 'Радиодатчик температуры и влажности комнатный'];
    if (type === 'wall-digital-sensor') return ['wired-wall-digital', 'Датчик температуры настенный проводной'];
    if (type === 'ntc-sensor' || type === 'mixing-ntc-sensor') return ['wired-flask-ntc', 'Датчик температуры в колбе NTC 10K'];
    if (String(type || '').startsWith('flask-sensor') && type !== 'flask-sensor-floor') {
        return ['wired-flask-digital', 'Датчик температуры в колбе проводной'];
    }
    return null;
};

/**
 * Собирает позиции коммерческого предложения из всего дерева схемы.
 * @param {object} scheme Полная внутренняя схема.
 * @returns {Array<object>} Непустые разделы КП.
 */
const getSchemeOfferSections = (scheme) => {
    const rowsBySection = { controller: [], modules: [], equipment: [], adapters: [] };
    const counts = new Map();
    const add = (section, key, label, price, { count = 1, paidCount = count, badge = null } = {}) => {
        const countKey = `${section}:${key}`;
        const row = counts.get(countKey) || { key: countKey, label, count: 0, paidCount: 0, unitPrice: price, badge };
        row.count += count;
        row.paidCount += paidCount;
        counts.set(countKey, row);
    };
    const controllerType = canonicalDeviceType(typeof scheme?.controller === 'string' ? scheme.controller : scheme?.controller?.type);
    if (OFFER_PRICES.controllers[controllerType] != null) {
        add('controller', controllerType, OFFER_CONTROLLER_LABELS[controllerType], OFFER_PRICES.controllers[controllerType]);
    }
    if (controllerType === 'go' && Array.isArray(scheme?.wireless_devices) && scheme.wireless_devices.length > 0) {
        add('controller', 'radio-module-activation', 'Активация радиомодуля', OFFER_PRICES.radioModuleActivation);
    }

    const kitRemaining = { ...(CONTROLLER_KIT_SENSOR_LIMITS[controllerType] || {}) };
    (OFFER_CONTROLLER_KIT_ROWS[controllerType] || []).forEach((row) => {
        add('equipment', `kit:${row.key}`, row.label, OFFER_PRICES[row.key], {
            count: row.count,
            paidCount: 0,
            badge: 'Комплектный',
        });
    });

    const seen = new WeakSet();
    const visit = (value) => {
        if (!value || typeof value !== 'object') return;
        if (Array.isArray(value)) {
            value.forEach(visit);
            return;
        }
        if (seen.has(value)) return;
        seen.add(value);
        const type = canonicalDeviceType(value.type);
        if (usesRinnaiAdapter(value)) add('adapters', 'rinnai', RINNAI_ADAPTER_LABEL, RINNAI_ADAPTER_PRICE);
        if (OFFER_PRICES.modules[type] != null) add('modules', type, OFFER_MODULE_LABELS[type], OFFER_PRICES.modules[type]);
        const equipment = {
            thermostat: ['Термостат MyHeat', OFFER_PRICES.thermostat],
            'pressure-sensor': ['Датчик давления', OFFER_PRICES.pressure],
            'leak-sensor': ['Датчик протечки', OFFER_PRICES.leak],
        }[type];
        if (equipment) add('equipment', type, equipment[0], equipment[1]);
        const temperatureProduct = getOfferTemperatureProduct(type, controllerType);
        if (temperatureProduct) {
            const kitBucket = getControllerKitSensorBucket(controllerType, type);
            if (kitBucket && kitRemaining[kitBucket] > 0) {
                kitRemaining[kitBucket] -= 1;
            } else {
                add('equipment', temperatureProduct[0], temperatureProduct[1], OFFER_PRICES[temperatureProduct[0]]);
            }
        }
        Object.values(value).forEach(visit);
    };
    visit(scheme);
    (Array.isArray(scheme?.power_modules) ? scheme.power_modules : []).forEach((item) => {
        if (canonicalDeviceType(typeof item === 'string' ? item : item?.type) === 'ups') {
            add('equipment', 'ups', 'Источник бесперебойного питания (UPS)', OFFER_PRICES.ups);
        }
    });
    counts.forEach((row, key) => rowsBySection[key.split(':')[0]].push(row));
    return [
        { title: 'Контроллер', rows: rowsBySection.controller },
        { title: 'Модули расширения', rows: rowsBySection.modules },
        { title: 'Оборудование MyHeat', rows: rowsBySection.equipment },
        { title: 'Переходники', rows: rowsBySection.adapters },
    ].filter((section) => section.rows.length > 0);
};

const getRequestedControllerOnlyScheme = () => {
    if (getRouteSchemeId()) return null;
    return buildControllerOnlyScheme(new URLSearchParams(window.location.search).get('controller'));
};

const getSchemeViewOptions = () => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    const showEmptySlots = params.get('showEmptySlots');
    return {
        installationMode: view === 'scheme' ? false : (view === 'installation' ? true : null),
        showEmptySlots: showEmptySlots === '1' ? true : (showEmptySlots === '0' ? false : null),
    };
};

const updateSchemeViewOptions = (changes) => {
    const url = new URL(window.location.href);
    if (changes.installationMode != null) {
        url.searchParams.set('view', changes.installationMode ? 'installation' : 'scheme');
    }
    if (changes.showEmptySlots != null) {
        url.searchParams.set('showEmptySlots', changes.showEmptySlots ? '1' : '0');
    }
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
};

const App = () => {
    const routeSchemeId = getRouteSchemeId();
    const initialSchemeRecord = getInitialSchemeRecord();
    const requestedControllerOnlyScheme = getRequestedControllerOnlyScheme();
    const initialViewOptions = getSchemeViewOptions();
    const initialIncomingScheme = normalizeSchemeIds(initialSchemeRecord?.incoming_scheme
        || (routeSchemeId ? {} : (requestedControllerOnlyScheme || incomingScheme)));
    const stageRef = useRef(null);
    const gridLayerRef = useRef(null);
    const [canvasSize, setCanvasSize] = useState(getCanvasSize);
    const [controllerImage, setControllerImage] = useState(null);
    const [aerialImage, setAerialImage] = useState(null);
    const [goAerialImage, setGoAerialImage] = useState(null);
    const [commentIconImage, setCommentIconImage] = useState(null);
    const [commentAddIconImage, setCommentAddIconImage] = useState(null);
    const [wirelessImages, setWirelessImages] = useState({});
    const [wirelessPortsByType, setWirelessPortsByType] = useState({});
    const [ports, setPorts] = useState([]);
    const [showPorts, setShowPorts] = useState(false);
    const [showEmptySlots, setShowEmptySlots] = useState(initialViewOptions.showEmptySlots ?? false);
    const [showGrid, setShowGrid] = useState(true);
    const [showLineFrames, setShowLineFrames] = useState(false);
    const [showIncomingScheme, setShowIncomingScheme] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(() => window.localStorage?.getItem(HELP_MODAL_STORAGE_KEY) !== '1');
    const [showOfferModal, setShowOfferModal] = useState(false);
    const [showSelectionConfig, setShowSelectionConfig] = useState(false);
    const [showUnusedBundledSensors, setShowUnusedBundledSensors] = useState(false);
    const [wifiLineEnabled, setWifiLineEnabled] = useState(true);
    const [installationMode, setInstallationMode] = useState(
        initialViewOptions.installationMode ?? !requestedControllerOnlyScheme,
    );
    const [displayedToolsInstallationMode, setDisplayedToolsInstallationMode] = useState(installationMode);
    const [rightToolsTransitionPhase, setRightToolsTransitionPhase] = useState('idle');
    const [morphImages, setMorphImages] = useState([]);
    const [installationPanelSize, setInstallationPanelSize] = useState(() => (
        readInstallationLayout(initialIncomingScheme).panelSize
    ));
    const [installationItemOffsets, setInstallationItemOffsets] = useState(() => (
        readInstallationLayout(initialIncomingScheme).itemOffsets
    ));
    const [installationItemsLocked, setInstallationItemsLocked] = useState(true);
    const [slotMenuPos, setSlotMenuPos] = useState(null);
    const [oneWireMenuPos, setOneWireMenuPos] = useState(null);
    const [extMenuPos, setExtMenuPos] = useState(null);
    const [wifiMenuPos, setWifiMenuPos] = useState(null);
    const [diMenuPos, setDiMenuPos] = useState(null);
    const [busMenuPos, setBusMenuPos] = useState(null);
    const [powerMenuPos, setPowerMenuPos] = useState(null);
    const [relayMenuPos, setRelayMenuPos] = useState(null);
    const [rl2sRelayMenuPos, setRl2sRelayMenuPos] = useState(null);
    const [extOneWireMenuPos, setExtOneWireMenuPos] = useState(null);
    const [wifiOneWireMenuPos, setWifiOneWireMenuPos] = useState(null);
    const [io4ChannelMenuPos, setIo4ChannelMenuPos] = useState(null);
    const [di6ChannelMenuPos, setDi6ChannelMenuPos] = useState(null);
    const [controllerDiMenuPos, setControllerDiMenuPos] = useState(null);
    const [thermostatMenuPos, setThermostatMenuPos] = useState(null);
    const [useInitialOneWireBalance, setUseInitialOneWireBalance] = useState(false);
    const [oneWireSlotOffsets, setOneWireSlotOffsets] = useState({});
    const [extSlotOffsets, setExtSlotOffsets] = useState({});
    const [diSlotOffsets, setDiSlotOffsets] = useState({});
    const [wifiSlotOffsets, setWifiSlotOffsets] = useState({});
    const [wifiOneWireSlotOffsets, setWifiOneWireSlotOffsets] = useState({});
    const [renderedProExtRight, setRenderedProExtRight] = useState(null);
    const [busSlotOffsets, setBusSlotOffsets] = useState({});
    const [relaySlotOffsets, setRelaySlotOffsets] = useState({});
    const [controller420SlotOffset, setController420SlotOffset] = useState({ x: 0, y: 0 });
    const [hoveredWirelessDeviceKey, setHoveredWirelessDeviceKey] = useState(null);
    const [hoveredOneWireSlotIndex, setHoveredOneWireSlotIndex] = useState(null);
    const [hoveredWifiOneWireSlotKey, setHoveredWifiOneWireSlotKey] = useState(null);
    const [hoveredWifiSlotKey, setHoveredWifiSlotKey] = useState(null);
    const [hoveredExtSlotIndex, setHoveredExtSlotIndex] = useState(null);
    const [hoveredBusLineIndex, setHoveredBusLineIndex] = useState(null);
    const [hoveredRelaySlotIndex, setHoveredRelaySlotIndex] = useState(null);
    const [hoveredNtcSlotKey, setHoveredNtcSlotKey] = useState(null);
    const [hoveredExtOneWireKey, setHoveredExtOneWireKey] = useState(null);
    const [invalidOneWireDragMap, setInvalidOneWireDragMap] = useState({});
    const [invalidExtDragMap, setInvalidExtDragMap] = useState({});
    const [invalidDiDragMap, setInvalidDiDragMap] = useState({});
    const [invalidWifiDragMap, setInvalidWifiDragMap] = useState({});
    const [invalidExtOneWireDragMap, setInvalidExtOneWireDragMap] = useState({});
    const [extOneWireOffsets, setExtOneWireOffsets] = useState({});
    const oneWireDragStartOffsetsRef = useRef({});
    const extDragStartOffsetsRef = useRef({});
    const diDragStartOffsetsRef = useRef({});
    const wifiDragStartOffsetsRef = useRef({});
    const moduleCollisionNodeRefs = useRef({});
    const extBodyNodeRefs = useRef({});
    const busDragStartOffsetsRef = useRef({});
    const relayDragStartOffsetsRef = useRef({});
    const controller420DragStartOffsetRef = useRef({ x: 0, y: 0 });
    const extOneWireDragStartOffsetsRef = useRef({});
    const oneWireDragStartPointerRef = useRef({});
    const oneWireDragDraftOffsetsRef = useRef({});
    const oneWireDragFrameRef = useRef(null);
    const oneWireDragNodeRefs = useRef({});
    const pendingMorphRef = useRef(null);
    const morphImageRefs = useRef(new Map());
    const morphTweensRef = useRef([]);
    const indentSize = parseInt(indent, 10) || 8;
    const moduleHeightValue = parseInt(module_height, 10) || 200;
    const dinSize = parseInt(din, 10) || 40;
    const gridPatternImage = useMemo(() => createGridPatternImage(indentSize), [indentSize]);
    const [schemeName, setSchemeName] = useState(initialSchemeRecord?.name || (requestedControllerOnlyScheme ? 'Новая схема' : 'Hardcoded scheme'));
    const [schemeDescription, setSchemeDescription] = useState(initialSchemeRecord?.description || '');
    const [selectionConfig, setSelectionConfig] = useState(initialSchemeRecord?.selection_config || null);
    const [schemeLoadState, setSchemeLoadState] = useState(routeSchemeId ? (initialSchemeRecord?.incoming_scheme ? 'loaded' : 'loading') : 'hardcoded');
    const [schemeLoadError, setSchemeLoadError] = useState(null);
    const [schemeSaveState, setSchemeSaveState] = useState('idle');
    const [schemeCreateState, setSchemeCreateState] = useState('idle');
    const [scheme, setScheme] = useState(() => buildSchemeFromIncoming(initialIncomingScheme));
    const [schemeJsonText, setSchemeJsonText] = useState(() => JSON.stringify(initialIncomingScheme, null, 2));
    const [schemeJsonDirty, setSchemeJsonDirty] = useState(false);
    const [schemeJsonError, setSchemeJsonError] = useState(null);
    const [schemeMetadataEditor, setSchemeMetadataEditor] = useState(null);
    const [schemeMetaCollapsed, setSchemeMetaCollapsed] = useState(true);
    const [selectedDevicePreview, setSelectedDevicePreview] = useState(null);
    const [devicePreviewCollapsed, setDevicePreviewCollapsed] = useState(false);
    const selectedPreviewSlotNodeRef = useRef(null);
    const [previewTitleEditor, setPreviewTitleEditor] = useState(false);
    const [previewTitleDraft, setPreviewTitleDraft] = useState('');
    const [titleEditor, setTitleEditor] = useState(null);
    const [commentEditor, setCommentEditor] = useState(null);
    const [commentViewer, setCommentViewer] = useState(null);
    const unusedBundledSensorsRef = useRef(null);
    const schemeRevisionRef = useRef(0);
    const saveRequestIdRef = useRef(0);
    const saveSuccessTimerRef = useRef(null);
    const controllerType = getControllerType(scheme);
    const selectedPreviewDevice = selectedDevicePreview?.device || null;
    const selectedPreviewDevices = selectedDevicePreview?.devices || (selectedPreviewDevice ? [{ device: selectedPreviewDevice, title: selectedDevicePreview.title }] : []);
    const canUseInstallationMode = INSTALLATION_CONTROLLERS.has(controllerType);
    const applyInstallationLayout = (sourceScheme) => {
        const layout = readInstallationLayout(sourceScheme);
        setInstallationPanelSize(layout.panelSize);
        setInstallationItemOffsets(layout.itemOffsets);
    };
    const getPersistedIncomingScheme = () => {
        const publicScheme = serializePublicScheme(scheme);
        const layout = writeInstallationLayout(controllerType, installationPanelSize, installationItemOffsets);
        if (layout) return normalizeSchemeIds({ ...publicScheme, installation_layout: layout });
        const { installation_layout: removedInstallationLayout, ...schemeWithoutInstallationLayout } = publicScheme;
        return normalizeSchemeIds(schemeWithoutInstallationLayout);
    };

    useEffect(() => {
        schemeRevisionRef.current += 1;
        setSchemeSaveState((current) => {
            if (current !== 'saved') return current;
            if (saveSuccessTimerRef.current !== null) {
                window.clearTimeout(saveSuccessTimerRef.current);
                saveSuccessTimerRef.current = null;
            }
            return 'idle';
        });
    }, [scheme, installationPanelSize, installationItemOffsets]);

    useEffect(() => () => {
        saveRequestIdRef.current += 1;
        if (saveSuccessTimerRef.current !== null) {
            window.clearTimeout(saveSuccessTimerRef.current);
        }
    }, []);
    const isPanningRef = useRef(false);
    const panStartPointerRef = useRef({ x: 0, y: 0 });
    const panStartStageRef = useRef({ x: 0, y: 0 });
    const zoomFrameRef = useRef(null);
    const zoomPendingRef = useRef(null);
    const zoomLastDrawAtRef = useRef(0);
    const pinchZoomRef = useRef(null);

    // Один раз подписывается на resize окна и не чаще кадра синхронизирует размер Stage;
    // cleanup снимает обработчик и отменяет незавершенный animation frame.
    useEffect(() => {
        let frameId = null;
        const handleResize = () => {
            if (frameId !== null) return;
            frameId = window.requestAnimationFrame(() => {
                frameId = null;
                const nextSize = getCanvasSize();
                setCanvasSize((currentSize) => (
                    currentSize.width === nextSize.width && currentSize.height === nextSize.height
                        ? currentSize
                        : nextSize
                ));
            });
        };
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            if (frameId !== null) window.cancelAnimationFrame(frameId);
        };
    }, []);

    // Обрабатывает pinch нативно, чтобы midpoint двух пальцев оставался anchor масштабирования.
    useEffect(() => {
        const stage = stageRef.current;
        const container = stage?.container();
        if (!stage || !container) return undefined;

        const getPinchInput = (touches) => {
            if (touches.length < 2) return null;
            const rect = container.getBoundingClientRect();
            const firstTouch = touches[0];
            const secondTouch = touches[1];
            const firstX = firstTouch.clientX - rect.left;
            const firstY = firstTouch.clientY - rect.top;
            const secondX = secondTouch.clientX - rect.left;
            const secondY = secondTouch.clientY - rect.top;
            return {
                point: { x: (firstX + secondX) / 2, y: (firstY + secondY) / 2 },
                distance: Math.hypot(secondX - firstX, secondY - firstY),
            };
        };

        const handleTouchStart = (event) => {
            const input = getPinchInput(event.touches);
            if (!input || input.distance === 0) return;
            event.preventDefault();
            isPanningRef.current = false;
            pinchZoomRef.current = {
                startScale: stage.scaleX(),
                startPoint: input.point,
                startDistance: input.distance,
                startStagePosition: { x: stage.x(), y: stage.y() },
            };
        };

        const handleTouchMove = (event) => {
            const gesture = pinchZoomRef.current;
            const input = getPinchInput(event.touches);
            if (!gesture || !input || input.distance === 0) return;
            event.preventDefault();
            const { scale, position } = getPinchStageTransform({
                ...gesture,
                currentPoint: input.point,
                currentDistance: input.distance,
            });
            stage.position({ x: snapPixel(position.x), y: snapPixel(position.y) });
            stage.scale({ x: scale, y: scale });
            stage.batchDraw();
        };

        const handleTouchEnd = (event) => {
            if (event.touches.length < 2) pinchZoomRef.current = null;
        };

        container.addEventListener('touchstart', handleTouchStart, { passive: false });
        container.addEventListener('touchmove', handleTouchMove, { passive: false });
        container.addEventListener('touchend', handleTouchEnd);
        container.addEventListener('touchcancel', handleTouchEnd);
        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
            container.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, []);

    // При смене id маршрута загружает схему, если сервер не внедрил ее в страницу;
    // cleanup отменяет незавершенный запрос через AbortController.
    useEffect(() => {
        if (!routeSchemeId) return undefined;
        if (initialSchemeRecord?.incoming_scheme) return undefined;

        const controller = new AbortController();
        setSchemeLoadState('loading');
        setSchemeLoadError(null);

        fetch(`/api/schemes/${routeSchemeId}`, { signal: controller.signal })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Scheme ${routeSchemeId} not found`);
                }
                return response.json();
            })
            .then((payload) => {
                if (!payload?.incoming_scheme || typeof payload.incoming_scheme !== 'object') {
                    throw new Error(`Scheme ${routeSchemeId} has invalid incoming_scheme`);
                }
                const normalizedIncomingScheme = normalizeSchemeIds(payload.incoming_scheme);
                setScheme(buildSchemeFromIncoming(normalizedIncomingScheme));
                applyInstallationLayout(normalizedIncomingScheme);
                setSchemeJsonText(JSON.stringify(normalizedIncomingScheme, null, 2));
                setSchemeJsonDirty(false);
                setSchemeJsonError(null);
                setSchemeName(payload.name || `Scheme #${routeSchemeId}`);
                setSchemeDescription(payload.description || '');
                setSelectionConfig(payload.selection_config || null);
                setOneWireSlotOffsets({});
                setExtSlotOffsets({});
                setDiSlotOffsets({});
                setWifiSlotOffsets({});
                setWifiOneWireSlotOffsets({});
                setBusSlotOffsets({});
                setRelaySlotOffsets({});
                setController420SlotOffset({ x: 0, y: 0 });
                setExtOneWireOffsets({});
                setSchemeSaveState('idle');
                setSchemeLoadState('loaded');
            })
            .catch((error) => {
                if (error.name === 'AbortError') return;
                setSchemeLoadError(error.message || 'Scheme loading failed');
                setSchemeLoadState('error');
            });

        return () => controller.abort();
    }, [routeSchemeId, initialSchemeRecord]);

    // При смене контроллера загружает его SVG и координаты портов;
    // cleanup не дает устаревшей загрузке перезаписать новый контроллер.
    useEffect(() => {
        const path = controllerImagePaths[controllerType];
        if (!path) return;
        let cancelled = false;
        setPorts([]);
        const img = new window.Image();
        img.onload = () => {
            if (!cancelled) setControllerImage(img);
        };
        img.src = path;
        parsePorts(path)
            .then((nextPorts) => {
                if (!cancelled) setPorts(nextPorts);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
            img.onload = null;
        };
    }, [controllerType]);

    // Один раз предзагружает изображения всех типов устройств и разбирает их SVG-порты.
    useEffect(() => {
        Object.entries(wirelessDeviceImagePaths).forEach(([type, path]) => {
            const img = new window.Image();
            img.onload = () => {
                setWirelessImages((prev) => ({ ...prev, [type]: img }));
            };
            img.src = path;
            parsePorts(path)
                .then((devicePorts) => {
                    setWirelessPortsByType((prev) => ({ ...prev, [type]: withFallbackPorts(type, devicePorts) }));
                })
                .catch(() => {});
        });
    }, []);

    // Один раз загружает изображение общей радиоантенны.
    useEffect(() => {
        const img = new window.Image();
        img.onload = () => setAerialImage(img);
        img.src = aerialImagePath;
    }, []);

    // Один раз загружает отдельное изображение радиоантенны контроллера GO.
    useEffect(() => {
        const img = new window.Image();
        img.onload = () => setGoAerialImage(img);
        img.src = goAerialImagePath;
    }, []);

    // Один раз загружает иконку существующего комментария для информационных блоков.
    useEffect(() => {
        const img = new window.Image();
        img.onload = () => setCommentIconImage(img);
        img.src = commentIconPath;
    }, []);

    // Один раз загружает иконку добавления комментария для информационных блоков.
    useEffect(() => {
        const img = new window.Image();
        img.onload = () => setCommentAddIconImage(img);
        img.src = commentAddIconPath;
    }, []);

    const handleDownloadPdf = async () => {
        try {
            const equipmentRows = collectEquipmentTableRows(serializePublicScheme(scheme));
            const { stagePdfDownload } = await import('./scheme/export/stagePdfDownload');
            await stagePdfDownload({
                stage: stageRef.current,
                gridLayer: gridLayerRef.current,
                commentIconNodeName: COMMENT_ICON_NODE_NAME,
                selectedSlotHighlightNode: selectedPreviewSlotNodeRef.current,
                showEmptySlots,
                onShowEmptySlotsChange: setShowEmptySlots,
                showGrid,
                equipmentRows,
                schemeMetadata: {
                    name: schemeName,
                    description: schemeDescription,
                },
            });
        } catch (error) {
            console.error('PDF export failed', error);
            alert('Download PDF failed. Please try again.');
        }
    };

    const handleResetPositions = () => {
        setOneWireSlotOffsets({});
        setExtSlotOffsets({});
        setDiSlotOffsets({});
        setWifiSlotOffsets({});
        setWifiOneWireSlotOffsets({});
        setBusSlotOffsets({});
        setRelaySlotOffsets({});
        setController420SlotOffset({ x: 0, y: 0 });
        setExtOneWireOffsets({});
        setInstallationPanelSize(null);
        setInstallationItemOffsets({});
        const stage = stageRef.current;
        if (stage) {
            stage.position({ x: 0, y: 0 });
            stage.scale({ x: 1, y: 1 });
            stage.batchDraw();
        }
    };

    // При изменении схемы обновляет текст JSON только когда панель открыта
    // и пользователь еще не начал ручное редактирование текста.
    useEffect(() => {
        if (schemeJsonDirty || !showIncomingScheme) return;
        setSchemeJsonText(JSON.stringify(getPersistedIncomingScheme(), null, 2));
    }, [scheme, schemeJsonDirty, showIncomingScheme, installationPanelSize, installationItemOffsets]);

    const closeHelpModal = () => {
        window.localStorage?.setItem(HELP_MODAL_STORAGE_KEY, '1');
        setShowHelpModal(false);
    };

    /**
     * Переключает обычный и монтажный режимы, подготавливая morph-анимацию.
     * @param {boolean} enabled Требуемое состояние монтажного режима.
     */
    const setInstallationModeEnabled = (enabled) => {
        if (enabled && !canUseInstallationMode) return;
        const stage = stageRef.current;
        const sourceImages = stage
            ? stage.find('Image').reduce((items, node) => {
                const name = node.name();
                if (!name.startsWith('morph:')) return items;
                items.set(name, {
                    name,
                    image: node.image(),
                    ...node.getAbsolutePosition(stage),
                    width: node.width(),
                    height: node.height(),
                });
                return items;
            }, new Map())
            : new Map();
        const shouldMorph = sourceImages.size > 0;
        pendingMorphRef.current = shouldMorph ? { sourceImages } : null;
        setInstallationMode(enabled);
        updateSchemeViewOptions({ installationMode: enabled });
        if (!enabled) return;
        setShowIncomingScheme(false);
        if (stage) {
            stage.position({ x: 0, y: 0 });
            stage.scale({ x: 1, y: 1 });
            stage.batchDraw();
        }
    };

    // После переключения режима, но до показа кадра, сопоставляет старые и новые
    // изображения по morph-ключам и подготавливает параметры анимации.
    useLayoutEffect(() => {
        const pendingMorph = pendingMorphRef.current;
        const stage = stageRef.current;
        if (!pendingMorph || !stage) return;
        pendingMorphRef.current = null;

        const targets = stage.find('Image').reduce((items, node) => {
            const name = node.name();
            if (name.startsWith('morph:')) items.set(name, node);
            return items;
        }, new Map());
        const nextMorphImages = Array.from(pendingMorph.sourceImages.values()).flatMap((source) => {
            const target = targets.get(source.name);
            if (!target) return [];
            const position = target.getAbsolutePosition(stage);
            target.opacity(0);
            return [{
                ...source,
                targetX: position.x,
                targetY: position.y,
                targetWidth: target.width(),
                targetHeight: target.height(),
            }];
        });
        if (nextMorphImages.length > 0) setMorphImages(nextMorphImages);
    }, [installationMode]);

    // При появлении подготовленных morph-элементов запускает Konva Tween;
    // cleanup уничтожает анимации при новом переключении или размонтировании.
    useEffect(() => {
        if (morphImages.length === 0) return undefined;
        let completedTweens = 0;
        const tweens = morphImages
            .map((item) => {
                const node = morphImageRefs.current.get(item.name);
                if (!node) return null;

                return new Konva.Tween({
                    node,
                    duration: 0.45,
                    x: item.targetX,
                    y: item.targetY,
                    width: item.targetWidth,
                    height: item.targetHeight,
                    easing: Konva.Easings.EaseInOut,
                    onFinish: () => {
                        completedTweens += 1;
                        if (completedTweens !== tweens.length) return;
                        const stage = stageRef.current;
                        stage?.find('Image').forEach((imageNode) => {
                            if (imageNode.name().startsWith('morph:')) imageNode.opacity(1);
                        });
                        setMorphImages([]);
                    },
                });
            })
            .filter(Boolean);

        if (tweens.length === 0) {
            setMorphImages([]);
            return undefined;
        }
        morphTweensRef.current = tweens;
        tweens.forEach((tween) => tween.play());
        return () => {
            tweens.forEach((tween) => tween.destroy());
            if (morphTweensRef.current === tweens) morphTweensRef.current = [];
        };
    }, [morphImages]);

    const handleRenderSchemeJson = () => {
        try {
            const parsed = JSON.parse(schemeJsonText);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                throw new Error('JSON должен быть объектом incomingScheme');
            }
            const normalizedIncomingScheme = normalizeSchemeIds(parsed);
            const nextScheme = buildSchemeFromIncoming(normalizedIncomingScheme);
            setScheme(nextScheme);
            applyInstallationLayout(normalizedIncomingScheme);
            setSchemeJsonText(JSON.stringify(normalizedIncomingScheme, null, 2));
            setSchemeJsonDirty(false);
            setSchemeJsonError(null);
            setUseInitialOneWireBalance(false);
            setOneWireSlotOffsets({});
            setExtSlotOffsets({});
            setDiSlotOffsets({});
            setWifiSlotOffsets({});
            setWifiOneWireSlotOffsets({});
            setBusSlotOffsets({});
            setRelaySlotOffsets({});
            setController420SlotOffset({ x: 0, y: 0 });
            setExtOneWireOffsets({});
        } catch (error) {
            setSchemeJsonError(error.message || 'Некорректный JSON');
        }
    };

    const handleFormatSchemeJson = () => {
        try {
            const parsed = JSON.parse(schemeJsonText);
            setSchemeJsonText(JSON.stringify(parsed, null, 2));
            setSchemeJsonError(null);
        } catch (error) {
            setSchemeJsonError(error.message || 'Некорректный JSON');
        }
    };

    const handleSaveScheme = () => {
        if (!routeSchemeId || schemeLoadState !== 'loaded' || schemeSaveState === 'saving') return;

        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        const requestId = saveRequestIdRef.current + 1;
        const savedRevision = schemeRevisionRef.current;
        saveRequestIdRef.current = requestId;
        if (saveSuccessTimerRef.current !== null) {
            window.clearTimeout(saveSuccessTimerRef.current);
            saveSuccessTimerRef.current = null;
        }
        setSchemeSaveState('saving');

        fetch(`/api/schemes/${routeSchemeId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken,
            },
            body: JSON.stringify({ incoming_scheme: getPersistedIncomingScheme() }),
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Save failed');
                }
                return response.json();
            })
            .then(() => {
                if (saveRequestIdRef.current !== requestId) return;
                if (schemeRevisionRef.current !== savedRevision) {
                    setSchemeSaveState('idle');
                    return;
                }
                setSchemeSaveState('saved');
                saveSuccessTimerRef.current = window.setTimeout(() => {
                    if (saveRequestIdRef.current === requestId) setSchemeSaveState('idle');
                    saveSuccessTimerRef.current = null;
                }, 1800);
            })
            .catch(() => {
                if (saveRequestIdRef.current === requestId) setSchemeSaveState('error');
            });
    };

    const saveSchemeMetadata = () => {
        const name = String(schemeMetadataEditor?.name || '').trim();
        const description = String(schemeMetadataEditor?.description || '').trim();
        if (!routeSchemeId || schemeMetadataEditor?.state === 'saving') return;
        if (!name) {
            setSchemeMetadataEditor((current) => (current ? { ...current, state: 'invalid' } : current));
            return;
        }
        if (name === schemeName && description === schemeDescription) {
            setSchemeMetadataEditor(null);
            return;
        }

        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        setSchemeMetadataEditor((current) => (current ? { ...current, state: 'saving' } : current));

        fetch(`/api/schemes/${routeSchemeId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken,
            },
            body: JSON.stringify({ name, description: description || null }),
        })
            .then((response) => {
                if (!response.ok) throw new Error('Metadata update failed');
                return response.json();
            })
            .then((payload) => {
                setSchemeName(payload.name || name);
                setSchemeDescription(payload.description || '');
                setSchemeMetadataEditor(null);
            })
            .catch(() => {
                setSchemeMetadataEditor((current) => (current ? { ...current, state: 'error' } : current));
            });
    };

    const handleSaveAsNewScheme = () => {
        if ((routeSchemeId && schemeLoadState !== 'loaded') || schemeCreateState === 'saving') return;

        const name = window.prompt('Название новой схемы', `${schemeName} копия`);
        if (!name?.trim()) return;

        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        setSchemeCreateState('saving');

        fetch('/api/schemes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-CSRF-TOKEN': csrfToken,
            },
            body: JSON.stringify({
                name: name.trim(),
                description: `Копия схемы: ${schemeName}`,
                incoming_scheme: getPersistedIncomingScheme(),
                ...(selectionConfig ? { selection_config: selectionConfig } : {}),
            }),
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Create failed');
                }
                return response.json();
            })
            .then((payload) => {
                if (payload?.id) {
                    window.location.href = `/scheme/${payload.id}`;
                    return;
                }
                setSchemeCreateState('saved');
                window.setTimeout(() => setSchemeCreateState('idle'), 1800);
            })
            .catch(() => {
                setSchemeCreateState('error');
            });
    };

    const addOneWireDeviceAtSlot = (devicePayload) => {
        setUseInitialOneWireBalance(false);
        setScheme((s) => addOneWireDeviceToScheme(s, devicePayload, oneWireMenuPos?.slotIndex, 6));
        setOneWireMenuPos(null);
    };

    const removeOneWireDeviceAtSlot = (slotIndex) => {
        setUseInitialOneWireBalance(false);
        setScheme((s) => removeOneWireDeviceFromScheme(s, slotIndex));
        setHoveredOneWireSlotIndex(null);
    };

    const getNtcChannelBySlot = (ntcSlotIndex, lineKey = 'ntc1_devices') => {
        if (!Number.isInteger(ntcSlotIndex) || ntcSlotIndex < 0) return -1;
        if (lineKey === 'ntc2_devices') return 4 + ntcSlotIndex;
        return ntcSlotIndex + 1;
    };

    const getNtcSensorAbsoluteIndex = (ntcSlotIndex, lineKey = 'ntc1_devices') => {
        const channel = getNtcChannelBySlot(ntcSlotIndex, lineKey);
        return channel > 0 ? channel - 1 : -1;
    };

    const getNtcSensorBySlot = (currentScheme, ntcSlotIndex, lineKey = 'ntc1_devices') => {
        const ntcSensors = getNtcSensorsFromScheme(currentScheme);
        const absoluteIndex = getNtcSensorAbsoluteIndex(ntcSlotIndex, lineKey);
        return absoluteIndex >= 0 ? (ntcSensors[absoluteIndex] || null) : null;
    };

    const getNtcSensorFromDeviceLine = (device, currentScheme, ntcSlotIndex, lineKey = 'ntc1_devices') => {
        const current = Array.isArray(device?.[lineKey]) ? device[lineKey] : [];
        const marker = current[ntcSlotIndex];
        if (!marker) return null;
        return typeof marker === 'object' ? marker : getNtcSensorBySlot(currentScheme, ntcSlotIndex, lineKey);
    };

    /**
     * Добавляет или удаляет NTC-маркер в модуле ntc-1-wire независимо от места хранения.
     * @param {object} currentScheme Изменяемая схема.
     * @param {object} target Целевой модуль.
     * @param {number} ntcSlotIndex Индекс NTC-входа.
     * @param {string} lineKey Имя внутренней NTC-линии.
     * @param {boolean} mark Добавить маркер; false удаляет его.
     * @returns {object} Новая схема.
     */
    const patchNtcSlotMarkerInOneWire = (currentScheme, target, ntcSlotIndex, lineKey = 'ntc1_devices', mark = true) => {
        const targetId = target?.id;
        const patchCollection = (collection) => {
            if (!Array.isArray(collection)) return { next: collection, updated: false };
            let updated = false;
            const next = collection.map((item) => {
                if (updated || !item || typeof item !== 'object') return item;
                if (targetId != null && item.id !== targetId) return item;
                if (canonicalDeviceType(item?.type) !== 'ntc-1-wire') return item;
                const current = Array.isArray(item?.[lineKey]) ? [...item[lineKey]] : [];
                if (mark) {
                    if (current[ntcSlotIndex]) return item;
                    current[ntcSlotIndex] = {
                        id: Date.now(),
                        device_type: 'sensor',
                        type: 'ntc-sensor',
                        connection_type: 'ntc',
                    };
                } else {
                    if (!current[ntcSlotIndex]) return item;
                    current[ntcSlotIndex] = null;
                    while (current.length > 0 && !current[current.length - 1]) current.pop();
                }
                updated = true;
                return { ...item, [lineKey]: current };
            });
            return { next, updated };
        };

        const controllerNestedOneWirePatched = patchCollection(Array.isArray(currentScheme?.controller?.one_wire_devices) ? currentScheme.controller.one_wire_devices : []);
        if (controllerNestedOneWirePatched.updated) {
            return {
                ...currentScheme,
                controller: {
                    ...currentScheme.controller,
                    one_wire_devices: controllerNestedOneWirePatched.next,
                },
            };
        }

        const oneWirePatched = patchCollection(Array.isArray(currentScheme.one_wire_modules) ? currentScheme.one_wire_modules : []);
        if (oneWirePatched.updated) return { ...currentScheme, one_wire_modules: oneWirePatched.next };

        const wiredPatched = patchCollection(Array.isArray(currentScheme.wired_devices) ? currentScheme.wired_devices : []);
        if (wiredPatched.updated) return { ...currentScheme, wired_devices: wiredPatched.next };

        return currentScheme;
    };

    const addOneWireNtcSensorAtSlot = (slotIndex, ntcSlotIndex, lineKey = 'ntc1_devices') => {
        setUseInitialOneWireBalance(false);
        setScheme((s) => {
            const oneWireDevices = getOneWireDevicesFromScheme(s);
            const target = oneWireDevices[slotIndex];
            if (!target || canonicalDeviceType(target?.type) !== 'ntc-1-wire') return s;
            return patchNtcSlotMarkerInOneWire(s, target, ntcSlotIndex, lineKey, true);
        });
    };

    const removeOneWireNtcSensorAtSlot = (slotIndex, ntcSlotIndex, lineKey = 'ntc1_devices') => {
        setUseInitialOneWireBalance(false);
        setScheme((s) => {
            const oneWireDevices = getOneWireDevicesFromScheme(s);
            const target = oneWireDevices[slotIndex];
            if (!target || canonicalDeviceType(target?.type) !== 'ntc-1-wire') return s;
            return patchNtcSlotMarkerInOneWire(s, target, ntcSlotIndex, lineKey, false);
        });
    };

    const removeExtNtcSensorAtSlot = (moduleIndex, slotIndex, ntcSlotIndex, lineKey = 'ntc1_devices') => {
        setUseInitialOneWireBalance(false);
        setScheme((s) => {
            const extModules = Array.isArray(s.ext_modules) ? s.ext_modules : [];
            const targetModule = extModules[moduleIndex];
            const oneWireDevices = Array.isArray(targetModule?.one_wire_devices) ? targetModule.one_wire_devices : [];
            const target = oneWireDevices[slotIndex];
            if (!target || canonicalDeviceType(target?.type) !== 'ntc-1-wire') return s;
            const nextModules = extModules.map((moduleItem, idx) => {
                if (idx !== moduleIndex) return moduleItem;
                const base = typeof moduleItem === 'string'
                    ? { id: Date.now(), type: moduleItem, one_wire_devices: [] }
                    : { ...moduleItem, one_wire_devices: Array.isArray(moduleItem.one_wire_devices) ? moduleItem.one_wire_devices : [] };
                const nextDevices = base.one_wire_devices.map((device, deviceIndex) => {
                    if (deviceIndex !== slotIndex || !device || typeof device !== 'object') return device;
                    const current = Array.isArray(device?.[lineKey]) ? [...device[lineKey]] : [];
                    current[ntcSlotIndex] = null;
                    while (current.length > 0 && !current[current.length - 1]) current.pop();
                    return { ...device, [lineKey]: current };
                });
                return { ...base, one_wire_devices: nextDevices };
            });
            return { ...s, ext_modules: nextModules };
        });
    };

    const addControllerNtcLineSensorAtSlot = (lineKey, slotIndex, type) => {
        setUseInitialOneWireBalance(false);
        setScheme((s) => {
            const controller = s?.controller && typeof s.controller === 'object'
                ? { ...s.controller }
                : { type: getControllerType(s) };
            const currentLine = Array.isArray(controller[lineKey]) ? [...controller[lineKey]] : [];
            if (currentLine[slotIndex]) return s;
            currentLine[slotIndex] = {
                id: Date.now(),
                type,
                connection_type: 'ntc',
                port_side: 'left',
            };
            return {
                ...s,
                controller: {
                    ...controller,
                    [lineKey]: currentLine,
                },
            };
        });
    };

    const removeControllerNtcLineSensorAtSlot = (lineKey, slotIndex) => {
        setUseInitialOneWireBalance(false);
        setScheme((s) => {
            const controller = s?.controller && typeof s.controller === 'object'
                ? { ...s.controller }
                : null;
            if (!controller || !Array.isArray(controller[lineKey])) return s;
            const currentLine = [...controller[lineKey]];
            currentLine[slotIndex] = null;
            while (currentLine.length > 0 && !currentLine[currentLine.length - 1]) currentLine.pop();
            return {
                ...s,
                controller: {
                    ...controller,
                    [lineKey]: currentLine,
                },
            };
        });
    };

    const addControllerLeakSensorAtSlot = () => {
        setScheme((s) => {
            const controller = s?.controller && typeof s.controller === 'object'
                ? { ...s.controller }
                : { type: getControllerType(s) };
            const currentLine = Array.isArray(controller.leak_sensor_devices) ? [...controller.leak_sensor_devices] : [];
            if (currentLine[0]) return s;
            currentLine[0] = {
                id: Date.now(),
                device_type: 'sensor',
                type: 'leak-sensor',
                connection_type: 'di',
                port_side: 'right',
            };
            return {
                ...s,
                controller: {
                    ...controller,
                    leak_sensor_devices: currentLine.slice(0, 1),
                },
            };
        });
    };

    const removeControllerLeakSensorAtSlot = () => {
        setScheme((s) => patchControllerLine(s, 'leak_sensor_devices', () => []) || s);
    };

    const isNumberedNtcSensor = (sensor) => (
        canonicalDeviceType(sensor?.type) === 'ntc-sensor'
        && String(sensor?.connection_type || '').toLowerCase() === 'ntc'
    );

    const getNtcSensorsFromScheme = (currentScheme) => (Array.isArray(currentScheme?.sensors)
        ? currentScheme.sensors.filter(isNumberedNtcSensor)
        : []);

    /**
     * Собирает NTC-датчики из контроллера и модулей в порядке экранной нумерации.
     * @param {object} currentScheme Текущая схема.
     * @returns {Array<object>} Упорядоченные датчики.
     */
    const getNtcSensorNumberingDevices = (currentScheme) => {
        const fromModuleDevice = (device) => (
            canonicalDeviceType(device?.type) === 'ntc-1-wire'
                ? [
                    ...(Array.isArray(device?.ntc1_devices) ? device.ntc1_devices : []),
                    ...(Array.isArray(device?.ntc2_devices) ? device.ntc2_devices : []),
                ].filter(isNumberedNtcSensor)
                : []
        );
        const controllerDevices = Array.isArray(currentScheme?.controller?.one_wire_devices) ? currentScheme.controller.one_wire_devices : [];
        const controllerEcosmartNtcDevices = currentScheme?.controller && typeof currentScheme.controller === 'object'
            ? [
                ...(Array.isArray(currentScheme.controller.strategy_sensor_devices) ? currentScheme.controller.strategy_sensor_devices : []),
                ...(Array.isArray(currentScheme.controller.boiler_sensor_devices) ? currentScheme.controller.boiler_sensor_devices : []),
                ...(Array.isArray(currentScheme.controller.mixing_ntc_devices) ? currentScheme.controller.mixing_ntc_devices : []),
            ].filter(isNumberedNtcSensor)
            : [];
        const extModules = Array.isArray(currentScheme?.ext_modules) ? currentScheme.ext_modules : [];
        const extOneWireDevices = extModules
            .flatMap((moduleItem) => (Array.isArray(moduleItem?.one_wire_devices) ? moduleItem.one_wire_devices : []));
        const extChannelDevices = extModules
            .flatMap((moduleItem) => (Array.isArray(moduleItem?.channel_devices) ? moduleItem.channel_devices : []))
            .filter(isNumberedNtcSensor);

        return [
            ...controllerDevices.flatMap(fromModuleDevice),
            ...controllerEcosmartNtcDevices,
            ...extOneWireDevices.flatMap(fromModuleDevice),
            ...extChannelDevices,
            ...getNtcSensorsFromScheme(currentScheme),
        ];
    };

    const getNtcSensorDisplayIndex = (currentScheme, sensor) => {
        if (!sensor || !isNumberedNtcSensor(sensor)) return 0;
        const devices = getNtcSensorNumberingDevices(currentScheme);
        return devices.findIndex((item) => {
            if (sensor?.id != null && item?.id != null) return sensor.id === item.id;
            return sensor === item;
        }) + 1;
    };

    const getNtcSensorTitle = (currentScheme, sensor, fallbackIndex = 1) => {
        const storedTitle = getDeviceStoredTitle(sensor);
        const isGeneratedTitle = /^(?:NTC[- ]датчик(?:\s+\d+)?|Проводной NTC-датчик в колбе)$/i.test(storedTitle || '');
        const index = getNtcSensorDisplayIndex(currentScheme, sensor) || fallbackIndex;
        return !storedTitle || isGeneratedTitle ? `NTC-датчик ${index}` : storedTitle;
    };

    const getPressureSensorFromScheme = (currentScheme) => {
        const controller = currentScheme?.controller;
        const controller420Devices = controller && typeof controller === 'object'
            ? (Array.isArray(controller.devices_420) ? controller.devices_420 : [])
            : [];
        const controllerPressure = controller420Devices
            .find((sensor) => canonicalDeviceType(sensor?.type) === 'pressure-sensor' && String(sensor?.connection_type || '').toLowerCase() === '4-20');
        if (controllerPressure) return controllerPressure;

        const sensors = Array.isArray(currentScheme?.sensors) ? currentScheme.sensors : [];
        return sensors.find((sensor) => canonicalDeviceType(sensor?.type) === 'pressure-sensor' && String(sensor?.connection_type || '').toLowerCase() === '4-20') || null;
    };

    const getPressureSensorsFromScheme = (currentScheme) => {
        const controller = currentScheme?.controller;
        const controller420Devices = controller && typeof controller === 'object'
            ? (Array.isArray(controller.devices_420) ? controller.devices_420 : [])
            : [];
        const ext420Devices = (Array.isArray(currentScheme?.ext_modules) ? currentScheme.ext_modules : [])
            .filter((moduleItem) => canonicalDeviceType(moduleItem?.type) === 'io4')
            .flatMap((moduleItem) => (Array.isArray(moduleItem?.channel_devices) ? moduleItem.channel_devices : []));
        const sensors = Array.isArray(currentScheme?.sensors) ? currentScheme.sensors : [];
        return [...controller420Devices, ...ext420Devices, ...sensors]
            .filter((sensor) => canonicalDeviceType(sensor?.type) === 'pressure-sensor' && String(sensor?.connection_type || '').toLowerCase() === '4-20');
    };

    const getLeakSensorsFromScheme = (currentScheme) => {
        const controller = currentScheme?.controller;
        const controllerLeakDevices = controller && typeof controller === 'object' && Array.isArray(controller.leak_sensor_devices)
            ? controller.leak_sensor_devices
            : [];
        const extDiDevices = (Array.isArray(currentScheme?.ext_modules) ? currentScheme.ext_modules : [])
            .flatMap((moduleItem) => [
                ...(Array.isArray(moduleItem?.channel_devices) ? moduleItem.channel_devices : []),
                ...(Array.isArray(moduleItem?.di_devices) ? moduleItem.di_devices : []),
            ]);
        const wired = Array.isArray(currentScheme?.wired_devices) ? currentScheme.wired_devices : [];
        const sensors = Array.isArray(currentScheme?.sensors) ? currentScheme.sensors : [];
        return [...controllerLeakDevices, ...extDiDevices, ...wired, ...sensors]
            .filter((sensor) => isLeakDiDeviceType(sensor?.type) && String(sensor?.connection_type || '').toLowerCase() === 'di');
    };

    const getLeakSensorDisplayIndex = (currentScheme, sensor) => {
        if (!sensor) return 0;
        return getLeakSensorsFromScheme(currentScheme).findIndex((item) => {
            if (sensor?.id != null && item?.id != null) return sensor.id === item.id;
            return sensor === item;
        }) + 1;
    };

    const getDiDevicesFromScheme = (currentScheme) => {
        const controller = currentScheme?.controller;
        const controllerDiDevices = controller && typeof controller === 'object' && Array.isArray(controller.di_devices)
            ? controller.di_devices
            : [];
        const controllerLeakDevices = controller && typeof controller === 'object' && Array.isArray(controller.leak_sensor_devices)
            ? controller.leak_sensor_devices
            : [];
        const extDiDevices = (Array.isArray(currentScheme?.ext_modules) ? currentScheme.ext_modules : [])
            .flatMap((moduleItem) => [
                ...(Array.isArray(moduleItem?.channel_devices) ? moduleItem.channel_devices : []),
                ...(Array.isArray(moduleItem?.di_devices) ? moduleItem.di_devices : []),
            ]);
        const wired = Array.isArray(currentScheme?.wired_devices) ? currentScheme.wired_devices : [];
        const sensors = Array.isArray(currentScheme?.sensors) ? currentScheme.sensors : [];
        return [...controllerDiDevices, ...controllerLeakDevices, ...extDiDevices, ...wired, ...sensors]
            .filter((device) => DI_WIRED_DEVICE_TYPES.includes(canonicalDeviceType(device?.type)) && String(device?.connection_type || '').toLowerCase() === 'di');
    };

    const getDiDeviceTitle = (currentScheme, device) => {
        const storedTitle = getDeviceStoredTitle(device);
        if (storedTitle) return storedTitle;
        const type = canonicalDeviceType(device?.type);
        const baseTitle = DI_DEVICE_TITLES[type] || 'DI устройство';
        const devices = getDiDevicesFromScheme(currentScheme).filter((item) => canonicalDeviceType(item?.type) === type);
        const displayIndex = devices.findIndex((item) => {
            if (device?.id != null && item?.id != null) return device.id === item.id;
            return device === item;
        }) + 1;
        const numberedTitle = displayIndex > 0 ? `${baseTitle} ${displayIndex}` : baseTitle;
        // У зоны в подписи полезен размер шлейфа: сколько датчиков сидит на входе.
        const zoneSensorCount = isLeakLoop(device) ? getLeakZoneSensors(device).length : 0;
        return zoneSensorCount > 0 ? `${numberedTitle} (${zoneSensorCount} датч.)` : numberedTitle;
    };

    const isSameTitleTargetDevice = (candidate, target) => {
        if (!candidate || !target || typeof candidate !== 'object' || typeof target !== 'object') return false;
        if (candidate === target) return true;
        if (candidate.id == null || target.id == null) return false;
        return candidate.id === target.id && canonicalDeviceType(candidate.type) === canonicalDeviceType(target.type);
    };

    /**
     * Рекурсивно обновляет поле выбранного устройства во всем дереве схемы.
     * @param {*} value Текущий узел дерева.
     * @param {object} target Искомое устройство.
     * @param {string} fieldName Изменяемое поле.
     * @param {*} fieldValue Новое значение; пустое значение удаляет поле.
     * @returns {*} Узел с сохранением ссылок неизмененных ветвей.
     */
    const updateDeviceFieldInValue = (value, target, fieldName, fieldValue) => {
        if (Array.isArray(value)) {
            let changed = false;
            const next = value.map((item) => {
                const updated = updateDeviceFieldInValue(item, target, fieldName, fieldValue);
                if (updated !== item) changed = true;
                return updated;
            });
            return changed ? next : value;
        }

        if (!value || typeof value !== 'object') return value;

        if (isSameTitleTargetDevice(value, target)) {
            const { titile: legacyTitle, ...rest } = value;
            if (fieldValue == null || fieldValue === '') {
                const { [fieldName]: removedField, ...withoutField } = rest;
                return withoutField;
            }
            return { ...rest, [fieldName]: fieldValue };
        }

        let changed = false;
        const next = {};
        Object.entries(value).forEach(([key, item]) => {
            const updated = updateDeviceFieldInValue(item, target, fieldName, fieldValue);
            next[key] = updated;
            if (updated !== item) changed = true;
        });

        return changed ? next : value;
    };

    const updateDeviceTitleInValue = (value, target, title) => updateDeviceFieldInValue(value, target, 'title', title);
    const updateDeviceCommentInValue = (value, target, comment) => updateDeviceFieldInValue(value, target, 'comment', comment);

    const editDeviceTitle = (device, fallbackTitle = '') => {
        if (!device) return;
        const currentTitle = getDeviceStoredTitle(device) || fallbackTitle || '';
        setTitleEditor({ device, currentTitle, value: currentTitle });
    };

    const selectDevicePreview = (device, title = '', devices = null) => {
        if (!device) return;
        setSelectedDevicePreview({ device, title, devices: Array.isArray(devices) && devices.length > 0 ? devices : [{ device, title }] });
        setPreviewTitleEditor(false);
        setPreviewTitleDraft(title);
    };

    useEffect(() => {
        const node = selectedPreviewSlotNodeRef.current;
        if (!selectedDevicePreview || !node || node.isDestroyed?.()) return undefined;

        const originalStyle = {
            stroke: node.stroke(),
            strokeWidth: node.strokeWidth(),
            dash: node.dash(),
            shadowColor: node.shadowColor(),
            shadowBlur: node.shadowBlur(),
            shadowOpacity: node.shadowOpacity(),
        };
        node.setAttrs({
            stroke: '#2563eb',
            strokeWidth: 2,
            dash: [5, 3],
            shadowColor: '#2563eb',
            shadowBlur: 5,
            shadowOpacity: 0.35,
        });
        node.getLayer()?.batchDraw();

        return () => {
            if (node.isDestroyed?.()) return;
            node.setAttrs(originalStyle);
            node.getLayer()?.batchDraw();
        };
    }, [selectedDevicePreview]);

    const selectDevicePreviewFromSlot = (event) => {
        const target = event?.target;
        if (!target || target.getClassName?.() === 'Circle') return;
        if (target.findAncestor?.(`.${COMMENT_ICON_NODE_NAME}`, true)) return;

        let current = target;
        for (let depth = 0; current && depth < 5; depth += 1) {
            const previewSource = current.hasName?.('device-preview-source')
                ? current
                : current.findOne?.('.device-preview-source');
            const device = previewSource?.getAttr?.('previewDevice');
            if (device) {
                const sourceParent = previewSource.getParent?.();
                const targetInsideSource = target === previewSource || previewSource.isAncestorOf?.(target);
                const targetIsSiblingRect = target.getClassName?.() === 'Rect'
                    && target.getParent?.() === sourceParent;
                if (!targetInsideSource && !targetIsSiblingRect) {
                    current = current.getParent?.();
                    continue;
                }
                const sourceBox = sourceParent
                    ? previewSource.getClientRect({ relativeTo: sourceParent })
                    : null;
                const slotRects = sourceParent?.find?.('Rect').filter((rect) => (
                    !rect.isAncestorOf?.(previewSource)
                    && !previewSource.isAncestorOf?.(rect)
                )) || [];
                const namedSlotBody = sourceParent?.findOne?.('.device-preview-slot-body') || null;
                const targetBox = targetIsSiblingRect
                    ? target.getClientRect({ relativeTo: sourceParent })
                    : null;
                const targetIsSlotBody = targetIsSiblingRect
                    && (!sourceBox || targetBox.y >= sourceBox.y + sourceBox.height - 1);
                const bodyRect = targetIsSlotBody
                    ? target
                    : slotRects
                        .map((rect) => ({ rect, box: rect.getClientRect({ relativeTo: sourceParent }) }))
                        .filter(({ box }) => !sourceBox || box.y >= sourceBox.y + sourceBox.height - 1)
                        .sort((a, b) => {
                            const aDistance = sourceBox ? Math.abs((a.box.x + a.box.width / 2) - (sourceBox.x + sourceBox.width / 2)) : 0;
                            const bDistance = sourceBox ? Math.abs((b.box.x + b.box.width / 2) - (sourceBox.x + sourceBox.width / 2)) : 0;
                            return aDistance - bDistance;
                        })[0]?.rect;
                selectedPreviewSlotNodeRef.current = namedSlotBody || bodyRect || null;
                selectDevicePreview(device, previewSource.getAttr('previewTitle') || '', previewSource.getAttr('previewDevices') || null);
                return;
            }
            current = current.getParent?.();
        }
    };

    const savePreviewTitle = () => {
        if (!selectedDevicePreview?.device) return;
        const title = String(previewTitleDraft || '').trim();
        if (!title) return;
        setScheme((currentScheme) => updateDeviceTitleInValue(currentScheme, selectedDevicePreview.device, title));
        setSelectedDevicePreview((current) => (current ? {
            ...current,
            title,
            device: { ...current.device, title },
            devices: Array.isArray(current.devices)
                ? current.devices.map((item, index) => (
                    index === 0 ? { ...item, title, device: { ...item.device, title } } : item
                ))
                : current.devices,
        } : current));
        setPreviewTitleEditor(false);
    };

    const closeTitleEditor = () => {
        setTitleEditor(null);
    };

    const editDeviceComment = (device) => {
        if (!device) return;
        const currentComment = typeof device?.comment === 'string' ? device.comment : '';
        setCommentEditor({ device, currentComment, value: currentComment });
    };

    const getPointerClientPosition = (event) => {
        const sourceEvent = event?.evt;
        if (sourceEvent?.touches?.[0]) {
            return { x: sourceEvent.touches[0].clientX, y: sourceEvent.touches[0].clientY };
        }
        if (sourceEvent?.changedTouches?.[0]) {
            return { x: sourceEvent.changedTouches[0].clientX, y: sourceEvent.changedTouches[0].clientY };
        }
        if (Number.isFinite(sourceEvent?.clientX) && Number.isFinite(sourceEvent?.clientY)) {
            return { x: sourceEvent.clientX, y: sourceEvent.clientY };
        }
        return { x: Math.round(window.innerWidth / 2), y: Math.round(window.innerHeight / 2) };
    };

    const viewDeviceComment = (device, event = null) => {
        if (!device) return;
        if (event) event.cancelBubble = true;
        const position = getPointerClientPosition(event);
        const currentComment = typeof device?.comment === 'string' ? device.comment.trim() : '';
        if (!currentComment) {
            editDeviceComment(device);
            return;
        }
        setCommentViewer({ device, comment: currentComment, x: position.x, y: position.y });
    };

    const closeCommentEditor = () => {
        setCommentEditor(null);
    };

    const closeCommentViewer = () => {
        setCommentViewer(null);
    };

    const saveTitleEditor = () => {
        if (!titleEditor?.device) return;
        const normalizedTitle = String(titleEditor.value || '').trim();
        if (!normalizedTitle) return;
        if (normalizedTitle !== titleEditor.currentTitle) {
            setScheme((currentScheme) => updateDeviceTitleInValue(currentScheme, titleEditor.device, normalizedTitle));
            setSelectedDevicePreview((current) => (
                current && isSameTitleTargetDevice(current.device, titleEditor.device)
                    ? {
                        ...current,
                        title: normalizedTitle,
                        device: { ...current.device, title: normalizedTitle },
                        devices: Array.isArray(current.devices)
                            ? current.devices.map((item, index) => (
                                index === 0 ? { ...item, title: normalizedTitle, device: { ...item.device, title: normalizedTitle } } : item
                            ))
                            : current.devices,
                    }
                    : current
            ));
        }
        closeTitleEditor();
    };

    const saveCommentEditor = () => {
        if (!commentEditor?.device) return;
        const normalizedComment = String(commentEditor.value || '').trim();
        if (normalizedComment !== commentEditor.currentComment) {
            setScheme((currentScheme) => updateDeviceCommentInValue(currentScheme, commentEditor.device, normalizedComment));
            setSelectedDevicePreview((current) => {
                if (!current) return current;
                const updatePreviewDevice = (previewDevice) => {
                    if (!isSameTitleTargetDevice(previewDevice, commentEditor.device)) return previewDevice;
                    if (normalizedComment) return { ...previewDevice, comment: normalizedComment };
                    const { comment: removedComment, ...deviceWithoutComment } = previewDevice;
                    return deviceWithoutComment;
                };
                const nextDevice = updatePreviewDevice(current.device);
                const nextDevices = Array.isArray(current.devices)
                    ? current.devices.map((item) => ({ ...item, device: updatePreviewDevice(item.device) }))
                    : current.devices;
                return { ...current, device: nextDevice, devices: nextDevices };
            });
        }
        closeCommentEditor();
    };

    const addController420PressureSensor = () => {
        setScheme((s) => {
            const controller = s?.controller && typeof s.controller === 'object'
                ? { ...s.controller }
                : { type: getControllerType(s) };
            const currentDevices = Array.isArray(controller.devices_420) ? controller.devices_420 : [];
            if (currentDevices.some((sensor) => canonicalDeviceType(sensor?.type) === 'pressure-sensor' && String(sensor?.connection_type || '').toLowerCase() === '4-20')) {
                return s;
            }
            return {
                ...s,
                controller: {
                    ...controller,
                    devices_420: [
                        ...currentDevices,
                        { id: Date.now(), type: 'pressure-sensor', connection_type: '4-20' },
                    ].slice(0, 1),
                },
            };
        });
    };

    const addEcosmartValve = () => {
        setScheme((s) => {
            const controller = s?.controller && typeof s.controller === 'object'
                ? { ...s.controller }
                : { type: getControllerType(s) };
            const currentDevices = Array.isArray(controller.relay_s_valve_devices) ? controller.relay_s_valve_devices : [];
            if (currentDevices.some((device) => canonicalDeviceType(device?.type) === 'valve')) {
                return s;
            }
            return {
                ...s,
                controller: {
                    ...controller,
                    relay_s_valve_devices: [
                        ...currentDevices,
                        {
                            id: Date.now(),
                            device_type: 'equipment',
                            type: 'valve',
                            connection_type: 'double_relay',
                            additions: [],
                        },
                    ].slice(0, 1),
                },
            };
        });
    };

    const removeEcosmartValve = () => {
        setScheme((s) => patchControllerLine(s, 'relay_s_valve_devices', () => []) || s);
        setHoveredNtcSlotKey((prev) => (prev === 'ecosmart-valve' ? null : prev));
    };

    const addEcosmartPump = (lineKey, type) => {
        setScheme((s) => {
            const controller = s?.controller && typeof s.controller === 'object'
                ? { ...s.controller }
                : { type: getControllerType(s) };
            const currentDevices = Array.isArray(controller[lineKey]) ? controller[lineKey] : [];
            if (currentDevices.some((device) => canonicalDeviceType(device?.type) === type)) {
                return s;
            }
            return {
                ...s,
                controller: {
                    ...controller,
                    [lineKey]: [
                        ...currentDevices,
                        {
                            id: Date.now(),
                            device_type: 'equipment',
                            type,
                            connection_type: type === 'boiler-pump' ? 'relay|relay-s' : 'relay',
                            additions: [],
                        },
                    ].slice(0, 1),
                },
            };
        });
    };

    const removeEcosmartPump = (lineKey, hoverKey) => {
        setScheme((s) => patchControllerLine(s, lineKey, () => []) || s);
        setHoveredNtcSlotKey((prev) => (prev === hoverKey ? null : prev));
    };

    const addEcosmartServo = (slotIndex) => {
        setScheme((s) => {
            const controller = s?.controller && typeof s.controller === 'object'
                ? { ...s.controller }
                : { type: getControllerType(s) };
            const currentDevices = Array.isArray(controller['220_servo_devices']) ? [...controller['220_servo_devices']] : [];
            if (currentDevices[slotIndex]) return s;
            currentDevices[slotIndex] = {
                id: Date.now(),
                device_type: 'equipment',
                type: '220servo',
                connection_type: 'double_relay',
                additions: [],
            };
            return {
                ...s,
                controller: {
                    ...controller,
                    '220_servo_devices': currentDevices.slice(0, 2),
                },
            };
        });
    };

    const removeEcosmartServo = (slotIndex, hoverKey) => {
        setScheme((s) => patchControllerLine(s, '220_servo_devices', (currentLine) => {
            const nextLine = [...currentLine];
            nextLine[slotIndex] = null;
            while (nextLine.length > 0 && !nextLine[nextLine.length - 1]) nextLine.pop();
            return nextLine;
        }) || s);
        setHoveredNtcSlotKey((prev) => (prev === hoverKey ? null : prev));
    };

    const getProAuxLineOccupancy = (currentScheme) => {
        const wired = Array.isArray(currentScheme?.wired_devices) ? currentScheme.wired_devices : [];
        const sensors = Array.isArray(currentScheme?.sensors) ? currentScheme.sensors : [];
        const hasUps = Array.isArray(currentScheme?.power_modules)
            && currentScheme.power_modules
                .map((item) => normalizePowerModuleType(typeof item === 'string' ? item : item?.type))
                .includes('ups');
        const hasType = (items, typeName) => items.some((item) => String(item?.connection_type || '').toLowerCase() === typeName);
        return {
            aiOccupied: getControllerLineDevices(currentScheme, 'ai_devices', []).some(Boolean) || hasType(wired, 'ai') || hasType(sensors, 'ai'),
            diOccupied: hasUps || getControllerLineDevices(currentScheme, 'di_devices', []).some(Boolean) || hasType(wired, 'di'),
            modbusOccupied: getControllerLineDevices(currentScheme, 'modbus_devices', []).some(Boolean) || hasType(wired, 'modbus'),
        };
    };

    const getExtModules = (currentScheme) => {
        const currentControllerType = getControllerType(currentScheme);
        const raw = Array.isArray(currentScheme.ext_modules) ? currentScheme.ext_modules : [];
        return raw
            .map((item, index) => normalizeExtModule(item, index))
            .filter((item) => isExtModuleAllowedForController(item?.type, currentControllerType))
            .filter(Boolean);
    };

    const getControllerExtDevices = (currentScheme) => {
        const controller = currentScheme?.controller;
        const raw = controller && typeof controller === 'object' && Array.isArray(controller.ext_devices)
            ? controller.ext_devices
            : [];
        return raw
            .filter((item) => canonicalDeviceType(item?.type) === 'thermostat')
            .map((item) => ({ ...item, type: 'thermostat', connection_type: 'EXT' }));
    };

    const getDiModules = (currentScheme) => {
        const rawModules = Array.isArray(currentScheme.di_modules) ? currentScheme.di_modules : [];
        const normalizedModules = rawModules
            .map((item, index) => {
                const rawType = typeof item === 'string' ? item : item?.type;
                const type = canonicalDeviceType(rawType);
                if (!DI_MODULE_TYPES.includes(type)) return null;
                const base = item && typeof item === 'object' ? item : {};
                return {
                    ...getDiModuleLineDefaults(type),
                    ...base,
                    id: base?.id ?? `${type}-${index}`,
                    type,
                    connection_type: base?.connection_type ?? 'DI',
                };
            })
            .filter(Boolean);

        const wiredDiDevices = getDiWiredDevices(currentScheme);

        return [...normalizedModules, ...wiredDiDevices];
    };

    const getSmart2DiPortUsage = (currentScheme) => {
        if (getControllerType(currentScheme) !== 'smart2') return { used: 0, free: 0, hasUps: false };
        const hasUps = Array.isArray(currentScheme?.power_modules)
            && currentScheme.power_modules
                .map((item) => normalizePowerModuleType(typeof item === 'string' ? item : item?.type))
                .includes('ups');
        const diModuleCount = Array.isArray(currentScheme?.di_modules)
            ? currentScheme.di_modules
                .map((item) => canonicalDeviceType(typeof item === 'string' ? item : item?.type))
                .filter((type) => DI_MODULE_TYPES.includes(type))
                .length
            : 0;
        const controllerDiCount = getControllerLineDevices(currentScheme, 'di_devices').length;
        const used = (hasUps ? 2 : 0) + diModuleCount * 2 + controllerDiCount;
        return { used, free: Math.max(0, 4 - used), hasUps };
    };

    const getDiWiredDevices = (currentScheme) => {
        const rawWired = Array.isArray(currentScheme?.wired_devices) ? currentScheme.wired_devices : [];
        return rawWired
            .filter((item) => String(item?.connection_type || '').toLowerCase() === 'di')
            .map((item, index) => {
                const type = canonicalDeviceType(item?.type);
                if (!DI_WIRED_DEVICE_TYPES.includes(type)) return null;
                return {
                    ...item,
                    id: item?.id ?? `di-device-${index}`,
                    type,
                    connection_type: 'di',
                };
            })
            .filter(Boolean);
    };

    const getIo4OnlyWiredDevices = (currentScheme) => {
        const rawWired = Array.isArray(currentScheme?.wired_devices) ? currentScheme.wired_devices : [];
        return rawWired
            .filter((item) => String(item?.connection_type || '').toLowerCase() === 'di')
            .map((item, index) => {
                const type = canonicalDeviceType(item?.type);
                if (!IO4_ONLY_WIRED_DEVICE_TYPES.includes(type)) return null;
                return {
                    ...item,
                    id: item?.id ?? `io4-only-device-${index}`,
                    type,
                    connection_type: 'di',
                };
            })
            .filter(Boolean);
    };

    const getExtDiLineCapacityByType = (type) => {
        const normalizedType = canonicalDeviceType(type);
        if (normalizedType === 'io4') return 4;
        if (normalizedType === 'di6') return 6;
        return 0;
    };

    const getModuleLineDevices = (moduleItem, lineKey, fallback = []) => {
        if (moduleItem && Object.prototype.hasOwnProperty.call(moduleItem, lineKey)) {
            return Array.isArray(moduleItem[lineKey]) ? moduleItem[lineKey] : [];
        }
        return Array.isArray(fallback) ? fallback : [];
    };

    /**
     * Иммутабельно обновляет указанную линию EXT-модуля.
     * @param {object} currentScheme Текущая схема.
     * @param {number} moduleIndex Индекс EXT-модуля.
     * @param {string} lineKey Имя массива устройств.
     * @param {Function} updater Преобразователь текущего массива.
     * @returns {object} Новая схема.
     */
    const patchExtModuleLine = (currentScheme, moduleIndex, lineKey, updater) => {
        const extModules = Array.isArray(currentScheme.ext_modules) ? currentScheme.ext_modules : [];
        return {
            ...currentScheme,
            ext_modules: extModules.map((moduleItem, idx) => {
                if (idx !== moduleIndex) return moduleItem;
                const type = canonicalDeviceType(typeof moduleItem === 'string' ? moduleItem : moduleItem?.type);
                const base = typeof moduleItem === 'string'
                    ? { id: Date.now(), type, connection_type: 'EXT', one_wire_devices: [], ...getExtModuleLineDefaults(type) }
                    : { ...getExtModuleLineDefaults(type), ...moduleItem };
                const currentLine = Array.isArray(base[lineKey]) ? base[lineKey] : [];
                return { ...base, [lineKey]: updater(currentLine) };
            }),
        };
    };

    /**
     * Иммутабельно обновляет линию DI-модуля и сохраняет обязательные поля.
     * @param {object} currentScheme Текущая схема.
     * @param {number} moduleIndex Индекс DI-модуля.
     * @param {string} lineKey Имя массива устройств.
     * @param {Function} updater Преобразователь текущего массива.
     * @returns {object} Новая схема.
     */
    const patchDiModuleLine = (currentScheme, moduleIndex, lineKey, updater) => {
        const diModules = Array.isArray(currentScheme.di_modules) ? currentScheme.di_modules : [];
        return {
            ...currentScheme,
            di_modules: diModules.map((moduleItem, idx) => {
                if (idx !== moduleIndex) return moduleItem;
                const type = canonicalDeviceType(typeof moduleItem === 'string' ? moduleItem : moduleItem?.type);
                const base = typeof moduleItem === 'string'
                    ? { id: Date.now(), type, connection_type: 'DI', ...getDiModuleLineDefaults(type) }
                    : { ...getDiModuleLineDefaults(type), ...moduleItem };
                const currentLine = Array.isArray(base[lineKey]) ? base[lineKey] : [];
                return { ...base, [lineKey]: updater(currentLine) };
            }),
        };
    };

    const addExtModuleAtSlot = (type, slotIndex) => {
        setScheme((s) => {
            if (!isExtModuleAllowedForController(type, getControllerType(s))) return s;
            const extModules = Array.isArray(s.ext_modules) ? s.ext_modules : [];
            const safeIndex = Number.isInteger(slotIndex) ? slotIndex : extModules.length;
            return {
                ...s,
                ext_modules: [
                    ...extModules.slice(0, safeIndex),
                    { id: Date.now(), type, connection_type: 'EXT', one_wire_devices: [], ...getExtModuleLineDefaults(type) },
                    ...extModules.slice(safeIndex),
                ],
            };
        });
        setExtMenuPos(null);
    };

    const addEcosmartExtThermostatWithFloorSlot = () => {
        setScheme((s) => {
            const controller = s?.controller && typeof s.controller === 'object'
                ? { ...s.controller }
                : { type: getControllerType(s) };
            const extDevices = Array.isArray(controller.ext_devices) ? controller.ext_devices : [];
            return {
                ...s,
                controller: {
                    ...controller,
                    ext_devices: [
                        ...extDevices,
                        {
                            id: Date.now(),
                            device_type: 'thermostat',
                            type: 'thermostat',
                            connection_type: 'EXT',
                            color: 'black',
                            additions: [],
                        },
                    ],
                },
            };
        });
    };

    const patchControllerExtDevice = (deviceIndex, updater) => {
        setScheme((s) => {
            const controller = s?.controller && typeof s.controller === 'object'
                ? { ...s.controller }
                : { type: getControllerType(s) };
            const extDevices = Array.isArray(controller.ext_devices) ? controller.ext_devices : [];
            if (!Number.isInteger(deviceIndex) || deviceIndex < 0 || deviceIndex >= extDevices.length) return s;
            return {
                ...s,
                controller: {
                    ...controller,
                    ext_devices: extDevices.map((device, index) => (index === deviceIndex ? updater(device) : device)),
                },
            };
        });
    };

    const addExtThermostatFloorSensor = (slotIndex, extModuleCount) => {
        const addFloorSensor = (device) => {
            const additions = Array.isArray(device?.additions) ? device.additions : [];
            if (additions.some((addition) => isThermostatFloorSensorAddition(addition))) return device;
            return {
                ...device,
                additions: [
                    ...additions,
                    { id: Date.now(), device_type: 'sensor', type: 'floor-sensor', connection_type: '1-wire' },
                ],
            };
        };

        if (slotIndex < extModuleCount) {
            setScheme((s) => {
                const extModules = Array.isArray(s.ext_modules) ? s.ext_modules : [];
                return {
                    ...s,
                    ext_modules: extModules.map((device, index) => (index === slotIndex ? addFloorSensor(device) : device)),
                };
            });
            return;
        }

        patchControllerExtDevice(slotIndex - extModuleCount, addFloorSensor);
    };

    const removeExtThermostatAtSlot = (slotIndex, extModuleCount) => {
        if (slotIndex < extModuleCount) {
            removeExtModuleAtSlot(slotIndex);
            return;
        }

        const controllerExtIndex = slotIndex - extModuleCount;
        setScheme((s) => {
            const controller = s?.controller && typeof s.controller === 'object'
                ? { ...s.controller }
                : { type: getControllerType(s) };
            const extDevices = Array.isArray(controller.ext_devices) ? controller.ext_devices : [];
            return {
                ...s,
                controller: {
                    ...controller,
                    ext_devices: extDevices.filter((_, index) => index !== controllerExtIndex),
                },
            };
        });
        setHoveredExtSlotIndex(null);
    };

    const removeExtModuleAtSlot = (slotIndex) => {
        setScheme((s) => {
            const extModules = Array.isArray(s.ext_modules) ? s.ext_modules : [];
            const schemeWithRestoredDevices = restorePublicDevicesFromModules(s, [extModules[slotIndex]]);
            return {
                ...schemeWithRestoredDevices,
                ext_modules: extModules.filter((_, index) => index !== slotIndex),
            };
        });
        setHoveredExtSlotIndex(null);
    };

    const patchWifiModuleLine = (sourceScheme, moduleIndex, lineKey, updater) => {
        const wifiModules = getWifiModules(sourceScheme);
        if (!wifiModules[moduleIndex]) return sourceScheme;
        return {
            ...sourceScheme,
            wifi_modules: wifiModules.map((moduleItem, index) => (index === moduleIndex
                ? { ...moduleItem, [lineKey]: updater(Array.isArray(moduleItem[lineKey]) ? moduleItem[lineKey] : []) }
                : moduleItem)),
        };
    };

    const addWifiModuleAtSlot = (type, slotIndex) => {
        if (!wifiLineEnabled) return;
        setScheme((s) => {
            const wifiModules = getWifiModules(s);
            if (wifiModules.length >= getWifiCapacity(getControllerType(s))) return s;
            const safeIndex = Number.isInteger(slotIndex) ? slotIndex : wifiModules.length;
            const lineKey = type === 'rl6sw' ? 'relay_s_devices' : 'relay_devices';
            const moduleItem = {
                id: Date.now(),
                type,
                device_type: 'module',
                connection_type: 'WIFI',
                one_wire_devices: [],
                relay_devices: [],
                relay_s_devices: [],
                [lineKey]: [],
            };
            return {
                ...s,
                wifi_modules: [...wifiModules.slice(0, safeIndex), moduleItem, ...wifiModules.slice(safeIndex)],
            };
        });
        setWifiMenuPos(null);
    };

    const removeWifiModuleAtSlot = (slotIndex) => {
        setScheme((s) => {
            const wifiModules = getWifiModules(s);
            const restored = restorePublicDevicesFromModules(s, [wifiModules[slotIndex]]);
            return { ...restored, wifi_modules: wifiModules.filter((_, index) => index !== slotIndex) };
        });
    };

    const removeController420PressureSensor = () => {
        setScheme((s) => {
            const controller = s?.controller && typeof s.controller === 'object'
                ? { ...s.controller }
                : { type: getControllerType(s) };
            return {
                ...s,
                controller: {
                    ...controller,
                    devices_420: [],
                },
            };
        });
        setHoveredNtcSlotKey((current) => (current === 'controller-420' ? null : current));
    };

    const addWifiOneWireDeviceAtSlot = (moduleIndex, slotIndex, type) => {
        setUseInitialOneWireBalance(false);
        setScheme((s) => patchWifiModuleLine(s, moduleIndex, 'one_wire_devices', (currentLine) => {
            if (currentLine.length >= WIFI_ONE_WIRE_CAPACITY) return currentLine;
            const safeIndex = Number.isInteger(slotIndex) ? slotIndex : currentLine.length;
            const payload = { id: Date.now(), device_type: 'sensor', type, connection_type: '1-wire' };
            return [...currentLine.slice(0, safeIndex), payload, ...currentLine.slice(safeIndex)].slice(0, WIFI_ONE_WIRE_CAPACITY);
        }));
        setWifiOneWireMenuPos(null);
    };

    const removeWifiOneWireDeviceAtSlot = (moduleIndex, slotIndex) => {
        setUseInitialOneWireBalance(false);
        setScheme((s) => patchWifiModuleLine(s, moduleIndex, 'one_wire_devices', (currentLine) => (
            currentLine.filter((_, index) => index !== slotIndex)
        )));
    };

    const addDiModuleAtSlot = (type, slotIndex) => {
        setScheme((s) => {
            const diModules = Array.isArray(s.di_modules) ? s.di_modules : [];
            if (diModules.length >= 2) return s;
            if (getControllerType(s) === 'smart2' && getSmart2DiPortUsage(s).free < 2) return s;
            const safeIndex = Number.isInteger(slotIndex) ? slotIndex : diModules.length;
            return {
                ...s,
                di_modules: [
                    ...diModules.slice(0, safeIndex),
                    { id: Date.now(), type, connection_type: 'DI', ...getDiModuleLineDefaults(type) },
                    ...diModules.slice(safeIndex),
                ],
            };
        });
        setDiMenuPos(null);
    };

    const removeDiModuleAtSlot = (slotIndex) => {
        setScheme((s) => {
            const diModules = Array.isArray(s.di_modules) ? s.di_modules : [];
            const schemeWithRestoredDevices = restorePublicDevicesFromModules(s, [diModules[slotIndex]]);
            return {
                ...schemeWithRestoredDevices,
                di_modules: diModules.filter((_, index) => index !== slotIndex),
            };
        });
    };

    const getBusLineCount = (controllerType) => (controllerType === 'ecosmart' ? 2 : 1);
    const isBusBoiler = (item) => {
        if (!item || typeof item !== 'object') return false;
        const type = canonicalDeviceType(item.type);
        const connectionType = typeof item.connection_type === 'string'
            ? item.connection_type.toUpperCase()
            : (typeof item.connection_tupe === 'string' ? item.connection_tupe.toUpperCase() : '');
        return type === 'smart' && connectionType === 'BUS' && item.reserve === false;
    };
    const getBusDevices = (currentScheme) => {
        const raw = Array.isArray(currentScheme.boilers) ? currentScheme.boilers : [];
        return getControllerLineDevices(currentScheme, 'bus_devices', raw.filter(isBusBoiler));
    };
    const getConnectionTypes = (device) => {
        const raw = typeof device?.connection_type === 'string' ? device.connection_type : '';
        return raw
            .split('|')
            .map((item) => item.trim().toLowerCase())
            .filter(Boolean);
    };
    const isRelayStupidBoiler = (item) => {
        if (!item || typeof item !== 'object') return false;
        const type = canonicalDeviceType(item.type);
        const rawType = typeof item.type === 'string' ? item.type.toLowerCase() : '';
        const connectionType = typeof item.connection_type === 'string'
            ? item.connection_type.toUpperCase()
            : '';
        const isStupidType = type === 'stupid' || rawType === 'stupidboiler' || rawType === 'stupid-boiler';
        const isReserveSmart = type === 'smart' && item?.reserve === true;
        return (isStupidType || isReserveSmart) && (connectionType === 'RELAY' || connectionType === '');
    };
    const getRelayBoilerDevices = (currentScheme) => {
        const raw = Array.isArray(currentScheme?.boilers) ? currentScheme.boilers : [];
        return raw.filter(isRelayStupidBoiler).map((boiler, index) => ({
            ...boiler,
            type: canonicalDeviceType(boiler?.type) === 'smart' ? 'smart' : 'stupid',
            connection_type: 'relay',
            id: boiler?.id ?? `relay-boiler-${index}`,
        }));
    };
    const getRelayWiredDevices = (currentScheme) => {
        const wired = Array.isArray(currentScheme?.wired_devices) ? currentScheme.wired_devices : [];
        const controllerTypeForRelay = getControllerType(currentScheme);
        const canUseRelayS = controllerTypeForRelay === 'pro';
        return wired.filter((device) => {
            const connectionTypes = getConnectionTypes(device);
            return connectionTypes.includes('relay') && (!canUseRelayS || !connectionTypes.includes('relay-s'));
        });
    };
    const getDoubleRelayDevices = (currentScheme) => {
        const controller = currentScheme?.controller && typeof currentScheme.controller === 'object' ? currentScheme.controller : {};
        const controllerDevices = [
            ...(Array.isArray(controller.relay_s_devices) ? controller.relay_s_devices : []),
            ...(Array.isArray(controller.relay_devices) ? controller.relay_devices : []),
        ];
        const extDevices = (Array.isArray(currentScheme?.ext_modules) ? currentScheme.ext_modules : [])
            .flatMap((moduleItem) => [
                ...(Array.isArray(moduleItem?.relay_s_devices) ? moduleItem.relay_s_devices : []),
                ...(Array.isArray(moduleItem?.relay_devices) ? moduleItem.relay_devices : []),
            ]);
        const diDevices = (Array.isArray(currentScheme?.di_modules) ? currentScheme.di_modules : [])
            .flatMap((moduleItem) => [
                ...(Array.isArray(moduleItem?.relay_s_devices) ? moduleItem.relay_s_devices : []),
                ...(Array.isArray(moduleItem?.relay_devices) ? moduleItem.relay_devices : []),
            ]);
        const wifiDevices = (Array.isArray(currentScheme?.wifi_modules) ? currentScheme.wifi_modules : [])
            .flatMap((moduleItem) => [
                ...(Array.isArray(moduleItem?.relay_s_devices) ? moduleItem.relay_s_devices : []),
                ...(Array.isArray(moduleItem?.relay_devices) ? moduleItem.relay_devices : []),
            ]);
        const wired = Array.isArray(currentScheme?.wired_devices) ? currentScheme.wired_devices : [];
        return [...controllerDevices, ...extDevices, ...diDevices, ...wifiDevices, ...wired].filter((device) => {
            const connectionType = typeof device?.connection_type === 'string'
                ? device.connection_type.toLowerCase()
                : '';
            return connectionType === 'double_relay';
        });
    };
    const getRelaySPreferredDevices = (currentScheme) => {
        const wired = Array.isArray(currentScheme?.wired_devices) ? currentScheme.wired_devices : [];
        return wired.filter((device) => {
            const type = canonicalDeviceType(device?.type);
            const connectionTypes = getConnectionTypes(device);
            if (type === 'zoneServo') {
                return connectionTypes.includes('relay') || connectionTypes.includes('relay-s');
            }
            return connectionTypes.includes('relay-s') || connectionTypes.includes('double_relay');
        });
    };
    const getRelayDevicesForController = (currentScheme) => [
        ...getControllerLineDevices(currentScheme, 'relay_devices', [
            ...getRelayBoilerDevices(currentScheme),
            ...getRelayWiredDevices(currentScheme),
        ]),
    ];
    const isSameDevice = (a, b) => {
        if (!a || !b) return false;
        if (a?.id != null && b?.id != null) return a.id === b.id;
        return a === b;
    };
    const getRelaySAssignedDevices = (currentScheme, relaySSlotsCount = 4) => {
        const preferred = getControllerLineDevices(currentScheme, 'relay_s_devices', getRelaySPreferredDevices(currentScheme));
        const occupancy = buildRelaySlotOccupancyPreserveIndexes(
            preferred,
            relaySSlotsCount,
            (device) => (String(device?.connection_type || '').toLowerCase() === 'double_relay' ? 2 : 1),
        );
        const assigned = [];
        occupancy.forEach((slotState) => {
            const device = slotState?.device;
            if (!device) return;
            if (!assigned.some((item) => isSameDevice(item, device))) {
                assigned.push(device);
            }
        });
        return assigned;
    };
    const setBusDeviceAtLine = (lineIndex, devicePayload) => {
        setScheme((s) => {
            if (Number.isInteger(busMenuPos?.moduleIndex)) {
                return patchExtModuleLine(s, busMenuPos.moduleIndex, 'bus_devices', (currentLine) => {
                    const nextLine = [...currentLine];
                    nextLine[0] = { id: Date.now(), ...devicePayload, type: 'smart', connection_type: 'BUS', reserve: false };
                    return nextLine.slice(0, 1);
                });
            }
            const count = getBusLineCount(getControllerType(s));
            if (!Number.isInteger(lineIndex) || lineIndex < 0 || lineIndex >= count) return s;
            const controllerPatched = patchControllerLine(s, 'bus_devices', (currentLine) => {
                const nextLine = [...currentLine];
                nextLine[lineIndex] = { id: Date.now(), ...devicePayload, type: 'smart', connection_type: 'BUS', reserve: false };
                return nextLine.slice(0, count);
            });
            if (controllerPatched) return controllerPatched;
            const current = Array.isArray(s.boilers) ? [...s.boilers] : [];
            const busIndexes = current
                .map((item, index) => (isBusBoiler(item) ? index : -1))
                .filter((index) => index >= 0);
            const targetIndex = busIndexes[lineIndex];
            if (typeof targetIndex === 'number') {
                current[targetIndex] = {
                    ...current[targetIndex],
                    ...devicePayload,
                    type: 'smart',
                    connection_type: 'BUS',
                    reserve: false,
                };
            } else {
                current.push({ id: Date.now(), ...devicePayload, type: 'smart', connection_type: 'BUS', reserve: false });
            }
            return { ...s, boilers: current };
        });
        setBusMenuPos(null);
    };
    const removeBusDeviceAtLine = (lineIndex) => {
        setScheme((s) => {
            if (Number.isInteger(lineIndex?.moduleIndex)) {
                return patchExtModuleLine(s, lineIndex.moduleIndex, 'bus_devices', () => []);
            }
            const controllerPatched = patchControllerLine(s, 'bus_devices', (currentLine) => currentLine.filter((_, index) => index !== lineIndex));
            if (controllerPatched) return controllerPatched;
            const current = Array.isArray(s.boilers) ? [...s.boilers] : [];
            const busIndexes = current
                .map((item, index) => (isBusBoiler(item) ? index : -1))
                .filter((index) => index >= 0);
            const targetIndex = busIndexes[lineIndex];
            if (typeof targetIndex !== 'number') return s;
            return {
                ...s,
                boilers: current.filter((_, index) => index !== targetIndex),
            };
        });
    };

    const addExtOneWireDeviceAtSlot = (moduleIndex, slotIndex, devicePayload) => {
        setUseInitialOneWireBalance(false);
        setScheme((s) => {
            const extModules = Array.isArray(s.ext_modules) ? s.ext_modules : [];
            const nextModules = extModules.map((moduleItem, idx) => {
                if (idx !== moduleIndex) return moduleItem;
                const base = typeof moduleItem === 'string'
                    ? { id: Date.now(), type: moduleItem, one_wire_devices: [] }
                    : { ...moduleItem, one_wire_devices: Array.isArray(moduleItem.one_wire_devices) ? moduleItem.one_wire_devices : [] };
                const normalizedType = canonicalDeviceType(devicePayload?.type);
                if (normalizedType === 'ntc-1-wire') {
                    const ntcCount = base.one_wire_devices
                        .filter((item) => canonicalDeviceType(item?.type) === 'ntc-1-wire')
                        .length;
                    if (ntcCount >= 2) {
                        return base;
                    }
                }
                const safeIndex = Number.isInteger(slotIndex) ? slotIndex : base.one_wire_devices.length;
                const nextDevices = [
                    ...base.one_wire_devices.slice(0, safeIndex),
                    devicePayload,
                    ...base.one_wire_devices.slice(safeIndex),
                ];
                return { ...base, one_wire_devices: nextDevices.slice(0, 6) };
            });
            return { ...s, ext_modules: nextModules };
        });
        setExtOneWireMenuPos(null);
    };

    const removeExtOneWireDeviceAtSlot = (moduleIndex, slotIndex) => {
        setUseInitialOneWireBalance(false);
        setScheme((s) => {
            const extModules = Array.isArray(s.ext_modules) ? s.ext_modules : [];
            const nextModules = extModules.map((moduleItem, idx) => {
                if (idx !== moduleIndex) return moduleItem;
                const base = typeof moduleItem === 'string'
                    ? { id: Date.now(), type: moduleItem, one_wire_devices: [] }
                    : { ...moduleItem, one_wire_devices: Array.isArray(moduleItem.one_wire_devices) ? moduleItem.one_wire_devices : [] };
                return {
                    ...base,
                    one_wire_devices: base.one_wire_devices.filter((_, deviceIndex) => deviceIndex !== slotIndex),
                };
            });
            return { ...s, ext_modules: nextModules };
        });
    };

    const addIo4ChannelDevice = (type) => {
        if (!io4ChannelMenuPos) return;
        setScheme((s) => {
            const moduleIndex = io4ChannelMenuPos.slotIndex;
            const channelIndex = io4ChannelMenuPos.channelIndex;
            const devicePayload = { id: Date.now(), type, additions: [] };
            if (Number.isInteger(moduleIndex) && Number.isInteger(channelIndex)) {
                const connectionType = type === 'pressure-sensor'
                    ? '4-20'
                    : (type === 'ntc-sensor' ? 'ntc' : 'di');
                return patchExtModuleLine(s, moduleIndex, 'channel_devices', (currentLine) => {
                    const nextLine = [...currentLine];
                    nextLine[channelIndex] = { ...devicePayload, connection_type: connectionType };
                    return nextLine.slice(0, 4);
                });
            }
            if (type === 'pressure-sensor') {
                const sensors = Array.isArray(s.sensors) ? s.sensors : [];
                return {
                    ...s,
                    sensors: [...sensors, { id: Date.now(), type: 'pressure-sensor', connection_type: '4-20' }],
                };
            }
            if (type === 'ntc-sensor') {
                const sensors = Array.isArray(s.sensors) ? s.sensors : [];
                return {
                    ...s,
                    sensors: [...sensors, {
                        id: Date.now(),
                        device_type: 'sensor',
                        type: 'ntc-sensor',
                        connection_type: 'ntc',
                    }],
                };
            }
            const wired = Array.isArray(s.wired_devices) ? s.wired_devices : [];
            return {
                ...s,
                wired_devices: [...wired, { id: Date.now(), type, connection_type: 'di', additions: [] }],
            };
        });
        setIo4ChannelMenuPos(null);
    };

    const addDi6ChannelDevice = (type) => {
        if (!di6ChannelMenuPos) return;
        setScheme((s) => patchExtModuleLine(s, di6ChannelMenuPos.slotIndex, 'channel_devices', (currentLine) => {
            const nextLine = [...currentLine];
            nextLine[di6ChannelMenuPos.channelIndex] = {
                id: Date.now(),
                type,
                connection_type: 'di',
                additions: [],
            };
            return nextLine.slice(0, 6);
        }));
        setDi6ChannelMenuPos(null);
    };

    const addControllerDiDeviceFromMenu = (type) => {
        if (!controllerDiMenuPos) return;
        setScheme((s) => patchControllerLine(s, 'di_devices', (currentLine) => {
            if (getControllerType(s) === 'ecosmart' && controllerDiMenuPos.slotIndex === 0 && type === 'leak-sensor') {
                return currentLine;
            }
            const nextLine = [...currentLine];
            const capacity = getControllerType(s) === 'smart2' ? 4 : 2;
            nextLine[controllerDiMenuPos.slotIndex] = {
                id: Date.now(),
                type,
                connection_type: 'di',
                additions: [],
                port_side: isDiscreteDiDeviceType(type) ? 'left' : 'right',
            };
            return nextLine.slice(0, capacity);
        }) || s);
        setControllerDiMenuPos(null);
    };

    const removeControllerDiDeviceAtSlot = (slotIndex) => {
        setScheme((s) => patchControllerLine(s, 'di_devices', (currentLine) => {
            const nextLine = [...currentLine];
            nextLine[slotIndex] = null;
            while (nextLine.length > 0 && !nextLine[nextLine.length - 1]) nextLine.pop();
            return nextLine;
        }) || s);
        setHoveredNtcSlotKey((prev) => (prev === `controller-di:${slotIndex}` ? null : prev));
    };

    const removeControllerRelaySDevice = (targetDevice, fallbackSlotIndex) => {
        setScheme((s) => patchControllerLine(s, 'relay_s_devices', (currentLine) => {
            return removeRelayDeviceAtSlotFromLine(currentLine, fallbackSlotIndex, 4, targetDevice);
        }) || s);
        setHoveredRelaySlotIndex((prev) => (String(prev).startsWith('controller-relay-s:') ? null : prev));
    };

    const removeDiModuleRelayDeviceAtSlot = (moduleIndex, lineKey, relaySlotIndex) => {
        setScheme((s) => patchDiModuleLine(s, moduleIndex, lineKey, (currentLine) => removeRelayDeviceAtSlotFromLine(currentLine, relaySlotIndex, 2)));
    };

    const removeExtModuleRelayDeviceAtSlot = (moduleIndex, lineKey, relaySlotIndex) => {
        setScheme((s) => patchExtModuleLine(s, moduleIndex, lineKey, (currentLine) => removeRelayDeviceAtSlotFromLine(currentLine, relaySlotIndex, 6)));
    };

    const removeWifiModuleRelayDeviceAtSlot = (moduleIndex, lineKey, relaySlotIndex) => {
        setScheme((s) => patchWifiModuleLine(s, moduleIndex, lineKey, (currentLine) => (
            removeRelayDeviceAtSlotFromLine(currentLine, relaySlotIndex, WIFI_RELAY_CAPACITY)
        )));
    };

    const removeIo4ChannelDeviceAtSlot = (moduleIndex, channelIndex) => {
        setScheme((s) => patchExtModuleLine(s, moduleIndex, 'channel_devices', (currentLine) => {
            const nextLine = [...currentLine];
            nextLine[channelIndex] = null;
            return nextLine.slice(0, 4);
        }));
    };

    const removeDi6ChannelDeviceAtSlot = (moduleIndex, channelIndex) => {
        setScheme((s) => patchExtModuleLine(s, moduleIndex, 'channel_devices', (currentLine) => {
            const nextLine = [...currentLine];
            nextLine[channelIndex] = null;
            return nextLine.slice(0, 6);
        }));
    };

    const addRelayDeviceFromMenu = (type) => {
        if (!relayMenuPos) return;
        // Тупой котёл не может садиться на RELAY-S порты.
        if (type === 'stupid' && relayMenuPos.lineKey === 'relay_s_devices') {
            setRelayMenuPos(null);
            return;
        }
        setScheme((s) => {
            const isRelaySLine = relayMenuPos.lineKey === 'relay_s_devices';
            const isDoubleRelayPayload = (isRelaySLine && (type === '220servo' || type === 'valve')) || (!isRelaySLine && type === 'valve');
            const connectionType = isDoubleRelayPayload
                ? 'double_relay'
                : (type === 'zoneServo' ? 'relay | relay-s' : (isRelaySLine ? 'relay-s' : 'relay'));
            const payload = {
                id: Date.now(),
                type,
                connection_type: connectionType,
                additions: [],
                port_side: 'right',
            };

            if (relayMenuPos.moduleGroup === 'wifi' && Number.isInteger(relayMenuPos.moduleIndex) && relayMenuPos.lineKey) {
                const nextScheme = patchWifiModuleLine(s, relayMenuPos.moduleIndex, relayMenuPos.lineKey, (currentLine) => {
                    if (isDoubleRelayPayload) {
                        const occupancy = buildRelaySlotOccupancyPreserveIndexes(
                            currentLine,
                            WIFI_RELAY_CAPACITY,
                            (device) => (String(device?.connection_type || '').toLowerCase() === 'double_relay' ? 2 : 1),
                        );
                        const slotIndex = relayMenuPos.relaySlotIndex;
                        if (slotIndex >= WIFI_RELAY_CAPACITY - 1 || occupancy[slotIndex] || occupancy[slotIndex + 1]) return currentLine;
                    }
                    return upsertRelayDeviceAtSlot(currentLine, relayMenuPos.relaySlotIndex, payload, WIFI_RELAY_CAPACITY);
                });
                return withStupidBoilerSensor(nextScheme, type);
            }

            if (relayMenuPos.moduleGroup === 'di' && Number.isInteger(relayMenuPos.moduleIndex) && relayMenuPos.lineKey) {
                const nextScheme = patchDiModuleLine(s, relayMenuPos.moduleIndex, relayMenuPos.lineKey, (currentLine) => {
                    if (isDoubleRelayPayload) {
                        const occupancy = buildRelaySlotOccupancyPreserveIndexes(
                            currentLine,
                            2,
                            (relayDevice) => (String(relayDevice?.connection_type || '').toLowerCase() === 'double_relay' ? 2 : 1),
                        );
                        if (occupancy[0] || occupancy[1]) return currentLine;
                        return upsertRelayDeviceAtSlot(currentLine, 0, payload, 2);
                    }
                    return upsertRelayDeviceAtSlot(currentLine, relayMenuPos.relaySlotIndex, payload, 2);
                });
                return withStupidBoilerSensor(nextScheme, type);
            }

            if (Number.isInteger(relayMenuPos.moduleIndex) && relayMenuPos.lineKey) {
                const nextScheme = patchExtModuleLine(s, relayMenuPos.moduleIndex, relayMenuPos.lineKey, (currentLine) => {
                    if (isDoubleRelayPayload) {
                        const occupancy = buildRelaySlotOccupancyPreserveIndexes(
                            currentLine,
                            6,
                            (relayDevice) => (String(relayDevice?.connection_type || '').toLowerCase() === 'double_relay' ? 2 : 1),
                        );
                        const slotIndex = relayMenuPos.relaySlotIndex;
                        if (slotIndex >= 5 || occupancy[slotIndex] || occupancy[slotIndex + 1]) return currentLine;
                    }
                    return upsertRelayDeviceAtSlot(currentLine, relayMenuPos.relaySlotIndex, payload, 6);
                });
                return withStupidBoilerSensor(nextScheme, type);
            }

            if (Number.isInteger(relayMenuPos.slotIndex)) {
                const controllerLineKey = relayMenuPos.lineKey || 'relay_devices';
                if (getControllerType(s) === 'smart2' && controllerLineKey === 'relay_devices' && type === 'valve') {
                    return s;
                }
                if (getControllerType(s) === 'ecosmart' && controllerLineKey === 'relay_devices' && relayMenuPos.slotIndex === 0 && type !== 'stupid') {
                    return s;
                }
                const nextScheme = patchControllerLine(s, controllerLineKey, (currentLine) => {
                    if (isDoubleRelayPayload) {
                        const slotCount = controllerLineKey === 'relay_s_devices'
                            ? 4
                            : getRelayLineConfig(getControllerType(s), ports).length;
                        const occupancy = buildRelaySlotOccupancyPreserveIndexes(
                            currentLine,
                            slotCount,
                            (relayDevice) => (String(relayDevice?.connection_type || '').toLowerCase() === 'double_relay' ? 2 : 1),
                        );
                        const slotIndex = relayMenuPos.slotIndex;
                        if (
                            slotIndex >= slotCount - 1
                            || (controllerLineKey === 'relay_s_devices' && slotIndex % 2 !== 0)
                            || occupancy[slotIndex]
                            || occupancy[slotIndex + 1]
                        ) return currentLine;
                    }
                    const slotCount = controllerLineKey === 'relay_s_devices'
                        ? 4
                        : getRelayLineConfig(getControllerType(s), ports).length;
                    return upsertRelayDeviceAtSlot(currentLine, relayMenuPos.slotIndex, payload, slotCount);
                }) || s;
                return withStupidBoilerSensor(nextScheme, type);
            }

            const wired = Array.isArray(s.wired_devices) ? s.wired_devices : [];
            return withStupidBoilerSensor({ ...s, wired_devices: [...wired, payload] }, type);
        });
        setRelayMenuPos(null);
    };

    const canAddDoubleRelayToDiModule = (moduleItem, lineKey) => {
        const devices = Array.isArray(moduleItem?.[lineKey]) ? moduleItem[lineKey] : [];
        const occupancy = buildRelaySlotOccupancyPreserveIndexes(
            devices,
            2,
            (relayDevice) => (String(relayDevice?.connection_type || '').toLowerCase() === 'double_relay' ? 2 : 1),
        );
        return !occupancy[0] && !occupancy[1];
    };
    const canAddDoubleRelayToExtModule = (currentScheme, moduleIndex, lineKey, slotIndex) => {
        const modules = relayMenuPos?.moduleGroup === 'wifi' ? getWifiModules(currentScheme) : currentScheme?.ext_modules;
        const moduleItem = Array.isArray(modules) ? modules[moduleIndex] : null;
        const devices = Array.isArray(moduleItem?.[lineKey]) ? moduleItem[lineKey] : [];
        const occupancy = buildRelaySlotOccupancyPreserveIndexes(
            devices,
            6,
            (device) => (String(device?.connection_type || '').toLowerCase() === 'double_relay' ? 2 : 1),
        );
        return Number.isInteger(slotIndex)
            && slotIndex < 5
            && !occupancy[slotIndex]
            && !occupancy[slotIndex + 1];
    };
    const canAddDoubleRelayToControllerRelay = (currentScheme, slotIndex) => {
        const slotCount = getRelayLineConfig(getControllerType(currentScheme), ports).length;
        const devices = getControllerLineDevices(currentScheme, 'relay_devices', getRelayDevicesForController(currentScheme));
        const occupancy = buildRelaySlotOccupancyPreserveIndexes(
            devices,
            slotCount,
            (device) => (String(device?.connection_type || '').toLowerCase() === 'double_relay' ? 2 : 1),
        );
        return Number.isInteger(slotIndex)
            && slotIndex < slotCount - 1
            && !occupancy[slotIndex]
            && !occupancy[slotIndex + 1];
    };

    const addRl2sRelayDeviceFromMenu = (type) => {
        if (!rl2sRelayMenuPos) return;
        // Тупой котёл не может садиться на RELAY-S порты (rl2s — relay-s линия).
        if (type === 'stupid') {
            setRl2sRelayMenuPos(null);
            return;
        }
        setScheme((s) => {
            const nextScheme = patchDiModuleLine(s, rl2sRelayMenuPos.moduleIndex, 'relay_s_devices', (currentLine) => {
            const isDoubleRelayPayload = type === '220servo' || type === 'valve';
            const slotIndex = rl2sRelayMenuPos.relaySlotIndex;
            const occupancy = buildRelaySlotOccupancyPreserveIndexes(
                currentLine,
                2,
                (relayDevice) => (String(relayDevice?.connection_type || '').toLowerCase() === 'double_relay' ? 2 : 1),
            );
            if (occupancy[slotIndex]) return currentLine;
            const targetSlotIndex = isDoubleRelayPayload ? 0 : slotIndex;
            if (isDoubleRelayPayload) {
                if (occupancy[0] || occupancy[1]) return currentLine;
            }
            return upsertRelayDeviceAtSlot(currentLine, targetSlotIndex, {
                id: Date.now(),
                type,
                connection_type: isDoubleRelayPayload ? 'double_relay' : (type === 'zoneServo' ? 'relay | relay-s' : 'relay-s'),
                additions: [],
                port_side: 'left',
            }, 2);
            });
            return withStupidBoilerSensor(nextScheme, type);
        });
        setRl2sRelayMenuPos(null);
    };

    const addExtNtcSensorAtSlot = (moduleIndex, slotIndex, ntcSlotIndex, lineKey = 'ntc1_devices') => {
        setUseInitialOneWireBalance(false);
        setScheme((s) => {
            const extModules = Array.isArray(s.ext_modules) ? s.ext_modules : [];
            const targetModule = extModules[moduleIndex];
            const oneWireDevices = Array.isArray(targetModule?.one_wire_devices) ? targetModule.one_wire_devices : [];
            const target = oneWireDevices[slotIndex];
            if (!target || canonicalDeviceType(target?.type) !== 'ntc-1-wire') return s;
            const sensorPayload = {
                id: Date.now(),
                device_type: 'sensor',
                type: 'ntc-sensor',
                connection_type: 'ntc',
            };
            const nextModules = extModules.map((moduleItem, idx) => {
                if (idx !== moduleIndex) return moduleItem;
                const base = typeof moduleItem === 'string'
                    ? { id: Date.now(), type: moduleItem, one_wire_devices: [] }
                    : { ...moduleItem, one_wire_devices: Array.isArray(moduleItem.one_wire_devices) ? moduleItem.one_wire_devices : [] };
                const nextDevices = base.one_wire_devices.map((device, deviceIndex) => {
                    if (deviceIndex !== slotIndex || !device || typeof device !== 'object') return device;
                    const current = Array.isArray(device?.[lineKey]) ? [...device[lineKey]] : [];
                    if (!current[ntcSlotIndex]) current[ntcSlotIndex] = sensorPayload;
                    return { ...device, [lineKey]: current };
                });
                return { ...base, one_wire_devices: nextDevices };
            });
            return { ...s, ext_modules: nextModules };
        });
    };

    const rectsOverlap = (a, b) => !(
        a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom
    );

    const getModuleObjectCollisionRects = (
        moduleId,
        renderedBodyRect,
        targetBodyRect = renderedBodyRect,
        includeEmptySlots = showEmptySlots,
        excludedCollisionKey = null,
    ) => {
        const moduleNode = moduleCollisionNodeRefs.current[moduleId];
        if (!moduleNode) return [targetBodyRect];
        const offsetX = targetBodyRect.left - renderedBodyRect.left;
        const offsetY = targetBodyRect.top - renderedBodyRect.top;
        const deviceSlotRects = moduleNode.find('.module-device-slot')
            .filter((slotNode) => shouldIncludeCollisionSlot({
                occupied: Boolean(slotNode.getAttr('collisionOccupied')),
                collisionKey: slotNode.getAttr('collisionKey'),
            }, includeEmptySlots, excludedCollisionKey))
            .map((slotNode) => {
                const rect = slotNode.getClientRect({ relativeTo: moduleNode, skipShadow: true, skipStroke: true });
                return {
                    left: rect.x,
                    top: rect.y,
                    right: rect.x + rect.width,
                    bottom: rect.y + rect.height,
                };
            });
        return [targetBodyRect, ...deviceSlotRects.map((rect) => translateRect(rect, offsetX, offsetY))];
    };

    const getModuleObjectFootprint = (...args) => {
        const collisionRects = getModuleObjectCollisionRects(...args);
        return unionRects(collisionRects) || collisionRects[0];
    };

    const buildWirelessOffsetsForLine = (devices, lineOffset = { x: 0, y: 0 }) => {
        const result = {};
        devices.forEach((device, idx) => {
            result[getWirelessDeviceKey(device, idx)] = { x: lineOffset.x, y: lineOffset.y };
        });
        return result;
    };

    /**
     * Строит геометрический индекс занятых областей для проверки drag-коллизий.
     * @param {?HTMLImageElement} controllerImg Изображение контроллера.
     * @param {object} currentScheme Текущая схема.
     * @param {boolean} showEmpty Учитывать пустые слоты.
     * @param {object} wirelessOffsets Смещения беспроводных устройств.
     * @param {object} oneWireOffsets Смещения 1-wire устройств.
     * @param {object} extOffsets Смещения EXT-модулей.
     * @param {object} diOffsets Смещения DI-модулей.
     * @param {?object} effectiveExtOneWireByModuleIndex Материализованные EXT 1-wire линии.
     * @returns {Array<object>} Прямоугольники с идентификаторами элементов.
     */
    const getAllOccupiedRects = (
        controllerImg,
        currentScheme,
        showEmpty,
        wirelessOffsets,
        oneWireOffsets,
        extOffsets,
        diOffsets = {},
        effectiveExtOneWireByModuleIndex = null,
    ) => {
        if (!controllerImg) return [];
        const rects = [];
        const controllerRect = {
            left: 0,
            top: 0,
            right: controllerImg.width,
            bottom: controllerImg.height,
        };

        const wirelessDevices = Array.isArray(currentScheme.wireless_devices) ? currentScheme.wireless_devices : [];
        const currentControllerType = getControllerType(currentScheme);
        const currentModuleHeightValue = parseInt(module_height, 10) || 200;
        const currentIndentSize = parseInt(indent, 10) || 8;
        const wirelessLineLift = getWirelessLineLift(currentScheme, currentControllerType, currentIndentSize);
        wirelessDevices.forEach((device, idx) => {
            const key = getWirelessDeviceKey(device, idx);
            const slotWidth = getWirelessSlotWidth(device, showEmpty);
            const slotX = getWirelessSlotX(wirelessDevices, idx, showEmpty, currentControllerType, currentIndentSize, slotWidth);
            const hasFloorSensor = Array.isArray(device?.additions) && device.additions.length > 0;
            const slotHeight = device?.type === 'thermostat'
                ? THERMOSTAT_SLOT_PADDING * 2 + THERMOSTAT_IMAGE_SIZE + (hasFloorSensor ? 3 * currentIndentSize : 0)
                : getWirelessSlotHeight(device, currentIndentSize);
            const slotY = getWirelessSlotYByIndex(wirelessDevices, idx, showEmpty, currentControllerType, currentModuleHeightValue, currentIndentSize, slotHeight, wirelessLineLift);
            const offset = wirelessOffsets[key] || { x: 0, y: 0 };
            rects.push({
                id: `wireless:${key}`,
                kind: 'wireless',
                left: slotX + offset.x,
                top: slotY + offset.y,
                right: slotX + offset.x + slotWidth,
                bottom: slotY + offset.y + slotHeight,
            });
        });

                                      const oneWireGeometry = getOneWireLineGeometry(
            getControllerType(currentScheme),
            controllerImg,
            ports,
            parseInt(indent, 10) || 8,
            parseInt(module_height, 10) || 200,
        );
        if (oneWireGeometry) {
            const oneWireDevices = getOneWireDevicesFromScheme(currentScheme);
            const indentValue = parseInt(indent, 10) || 8;
            const getOneWireSlotDimensions = (slotDevice) => {
                if (!slotDevice) return { width: ONE_WIRE_SLOT_SIZE, height: ONE_WIRE_SLOT_SIZE };
                const slotType = canonicalDeviceType(slotDevice.type);
                if (slotType === 'thermostat') {
                    return { width: ONE_WIRE_THERMOSTAT_SIZE, height: ONE_WIRE_THERMOSTAT_SIZE };
                }
                const isModuleWithNativeSize = slotType === 'ntc-1-wire' || slotType === 'rdt2';
                if (!isModuleWithNativeSize) return { width: ONE_WIRE_SLOT_SIZE, height: ONE_WIRE_SLOT_SIZE };
                const slotImageKey = getWirelessDeviceImageKey(slotDevice);
                const slotImage = slotImageKey ? wirelessImages[slotImageKey] : null;
                if (!slotImage?.width || !slotImage?.height) return { width: ONE_WIRE_SLOT_SIZE, height: ONE_WIRE_SLOT_SIZE };
                return { width: slotImage.width, height: slotImage.height };
            };
            const getOneWireSlotPosByOffsets = (slotIndex, offsets) => {
                const firstDevice = oneWireDevices[0] || null;
                return getOneWireSlotPosition({
                    slotIndex,
                    devices: oneWireDevices,
                    offsets,
                    getDeviceSize: getOneWireSlotDimensions,
                    getOffsetKey: getOneWireOffsetKey,
                    firstSlotX: oneWireGeometry.firstSlotX,
                    firstSlotY: oneWireGeometry.firstSlotY,
                    firstSlotExtraY: currentControllerType === 'ecosmart'
                        ? (5 + getEcosmartFirstOneWireExtraDown(firstDevice)) * indentValue
                        : 0,
                    indentSize: indentValue,
                    moduleHeightValue: currentModuleHeightValue,
                });
            };
            oneWireDevices.forEach((device, slotIndex) => {
                const pos = getOneWireSlotPosByOffsets(slotIndex, oneWireOffsets);
                const size = getOneWireSlotDimensions(device);
                const offsetKey = getOneWireOffsetKey(device, slotIndex);
                rects.push({
                    id: `onewire:${offsetKey}`,
                    kind: 'onewire',
                    left: pos.x,
                    top: pos.y,
                    right: pos.x + size.width,
                    bottom: pos.y + size.height,
                });
            });
        }

        const supportsExtLine = ['pro', 'ecosmart'].includes(getControllerType(currentScheme));
        if (supportsExtLine) {
            const extModules = [...getExtModules(currentScheme), ...getControllerExtDevices(currentScheme)];
            const currentControllerType = getControllerType(currentScheme);
            const indentValue = parseInt(indent, 10) || 8;
            const hasNonEmptyControllerOneWireLine = getOneWireDevicesFromScheme(currentScheme).length > 0;
            const isEcosmartThermostatExtLine = currentControllerType === 'ecosmart'
                && extModules.some((moduleDevice) => canonicalDeviceType(moduleDevice?.type) === 'thermostat');
            const getExtModuleSize = (device) => {
                const imageKey = getWirelessDeviceImageKey(device);
                const image = imageKey ? wirelessImages[imageKey] : null;
                if (!image?.width || !image?.height) return { width: EXT_SLOT_SIZE, height: EXT_SLOT_SIZE };
                return { width: image.width, height: image.height };
            };
            const getExtModuleLayoutWidth = (moduleDevice) => getExtModuleSize(moduleDevice).width
                + (hasExtThermostatFloorSensor(moduleDevice) ? 7 * indentValue : 0);
            const getExtSlotX = (slotIndex) => {
                const minGap = EXT_SLOT_MIN_GAP_MULTIPLIER * indentValue;
                const controllerExtraGap = hasNonEmptyControllerOneWireLine ? 8 * indentValue : 0;
                const ecosmartExtLineLeftOffset = currentControllerType === 'ecosmart' ? 45 * indentValue : 0;
                const ecosmartThermostatLeftOffset = isEcosmartThermostatExtLine ? 20 * indentValue : 0;
                const baseX = controllerImg.width + minGap + controllerExtraGap - ecosmartExtLineLeftOffset - ecosmartThermostatLeftOffset;
                const hasNonEmptyExtOneWire = (moduleDevice, moduleIndex) => (
                    !!moduleDevice
                    && (canonicalDeviceType(moduleDevice?.type) === 'rl6' || canonicalDeviceType(moduleDevice?.type) === 'rl6s')
                    && (
                        (effectiveExtOneWireByModuleIndex && Array.isArray(effectiveExtOneWireByModuleIndex[moduleIndex]))
                            ? effectiveExtOneWireByModuleIndex[moduleIndex].some(Boolean)
                            : (Array.isArray(moduleDevice?.one_wire_devices) && moduleDevice.one_wire_devices.some(Boolean))
                    )
                );
                const hasOccupiedDi6Slot = (moduleDevice) => (
                    canonicalDeviceType(moduleDevice?.type) === 'di6'
                    && (
                        (Array.isArray(moduleDevice?.channel_devices) && moduleDevice.channel_devices.some(Boolean))
                        || (Array.isArray(moduleDevice?.di_devices) && moduleDevice.di_devices.some(Boolean))
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
                    const controllerRelayCapacity = getRelayLineConfig(getControllerType(currentScheme), ports).length;
                    return getRelayDevicesForController(currentScheme)
                        .slice(controllerRelayCapacity + moduleOrder * 6, controllerRelayCapacity + (moduleOrder + 1) * 6);
                };
                const hasVisibleRl6RelayLine = (moduleDevice, moduleIndex) => (
                    canonicalDeviceType(moduleDevice?.type) === 'rl6'
                    && (showEmpty || getRl6RelayDevices(moduleIndex).length > 0)
                );
                const needsRl6RightGap = (moduleDevice, moduleIndex) => (
                    hasVisibleRl6RelayLine(moduleDevice, moduleIndex)
                );
                const getRl6LeftExtraGap = (moduleDevice, moduleIndex) => (hasVisibleRl6RelayLine(moduleDevice, moduleIndex) ? 11 * indentValue : 0);
                const getRl6sLeftExtraGap = (moduleDevice) => (canonicalDeviceType(moduleDevice?.type) === 'rl6s' ? 9 * indentValue : 0);
                if (slotIndex <= 0) {
                    const firstModule = extModules[0] || null;
                    const di6OccupiedLeftGap = hasOccupiedDi6Slot(firstModule) ? 10 * indentValue : 0;
                    return baseX + getRl6LeftExtraGap(firstModule, 0) + getRl6sLeftExtraGap(firstModule) + di6OccupiedLeftGap;
                }
                const getDynamicGap = (leftDevice, rightDevice, leftIndex) => {
                    const leftWidth = getExtModuleSize(leftDevice).width;
                    const rightWidth = getExtModuleSize(rightDevice).width;
                    const largerWidth = Math.max(leftWidth, rightWidth);
                    const extraGap = largerWidth > 100 ? indentValue : 0;
                    const oneWireExtraGap = hasNonEmptyExtOneWire(leftDevice, leftIndex)
                        ? 24 * indentValue
                        : 0;
                    const io4ExtraGap = canonicalDeviceType(leftDevice?.type) === 'io4'
                        ? 12 * indentValue
                        : 0;
                    const di6ExtraGapLeft = canonicalDeviceType(leftDevice?.type) === 'di6'
                        ? 9 * indentValue
                        : 0;
                    const di6ExtraGapRight = canonicalDeviceType(rightDevice?.type) === 'di6'
                        ? 9 * indentValue
                        : 0;
                    const di6OccupiedLeftGap = hasOccupiedDi6Slot(rightDevice)
                        ? 10 * indentValue
                        : 0;
                    const di6OccupiedRightGap = hasOccupiedDi6Slot(leftDevice)
                        ? 7 * indentValue
                        : 0;
                    const leftType = canonicalDeviceType(leftDevice?.type);
                    const rl6RightExtraGap = leftType === 'rl6'
                        ? 20 * indentValue
                        : 0;
                    const rl6sRightExtraGap = leftType === 'rl6s'
                        ? 9 * indentValue
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
            extModules.forEach((device, slotIndex) => {
                const size = getExtModuleSize(device);
                const layoutWidth = getExtModuleLayoutWidth(device);
                const offsetKey = getExtOffsetKey(device, slotIndex);
                const offset = extOffsets?.[offsetKey] || { x: 0, y: 0 };
                const baseX = getExtSlotX(slotIndex);
                const baseY = isEcosmartThermostatExtLine
                    ? -2.25 * currentModuleHeightValue - 25 * indentValue + slotIndex * 9 * indentValue
                    : controllerImg.height - size.height;
                const isInitialPosition = offset.x === 0 && offset.y === 0;
                const x = isInitialPosition
                    ? snapToGrid(baseX, parseInt(indent, 10) || 8)
                    : baseX + offset.x;
                const y = isInitialPosition
                    ? snapToGrid(baseY, parseInt(indent, 10) || 8)
                    : baseY + offset.y;
                rects.push({
                    id: `ext:${offsetKey}`,
                    kind: 'ext',
                    left: x,
                    top: y,
                    right: x + layoutWidth,
                    bottom: y + size.height,
                });
            });
        }

        const supportsDiLine = getControllerType(currentScheme) === 'smart2';
        if (supportsDiLine) {
            const diModules = getDiModules(currentScheme);
            const indentValue = parseInt(indent, 10) || 8;
            const minGap = DI_SLOT_MIN_GAP_MULTIPLIER * indentValue;
            const getDiModuleSize = (device) => {
                const imageKey = getWirelessDeviceImageKey(device);
                const image = imageKey ? wirelessImages[imageKey] : null;
                if (!image?.width || !image?.height) return { width: DI_SLOT_SIZE, height: DI_SLOT_SIZE };
                return { width: image.width, height: image.height };
            };
            const getDiSlotX = (slotIndex) => {
                const baseX = controllerImg.width + minGap;
                let x = baseX;
                for (let i = 0; i < slotIndex; i += 1) {
                    const currentDevice = diModules[i] || null;
                    const currentWidth = getDiModuleSize(currentDevice).width;
                    const spacing = getSmart2DiModuleExtraSpacing(currentDevice, indentValue);
                    x += spacing.left + currentWidth + spacing.right + minGap;
                }
                const currentSpacing = getSmart2DiModuleExtraSpacing(diModules[slotIndex] || null, indentValue);
                return x + currentSpacing.left;
            };
            diModules.forEach((device, slotIndex) => {
                const size = getDiModuleSize(device);
                const offsetKey = getDiOffsetKey(device, slotIndex);
                const offset = diOffsets?.[offsetKey] || { x: 0, y: 0 };
                const baseX = getDiSlotX(slotIndex);
                const baseY = controllerImg.height - size.height;
                const isInitialPosition = offset.x === 0 && offset.y === 0;
                const x = isInitialPosition ? snapToGrid(baseX, indentValue) : baseX + offset.x;
                const y = isInitialPosition ? snapToGrid(baseY, indentValue) : baseY + offset.y;
                rects.push({
                    id: `di:${offsetKey}`,
                    kind: 'di',
                    left: x,
                    top: y,
                    right: x + size.width,
                    bottom: y + size.height,
                });
            });
        }

        if (currentControllerType === 'pro' || currentControllerType === 'smart2') {
            const powerIndentValue = parseInt(indent, 10) || 8;
            const rawPowerModules = Array.isArray(currentScheme.power_modules) ? currentScheme.power_modules : [];
            const upsModules = rawPowerModules
                .map((item, index) => ({
                    id: typeof item === 'object' && item?.id ? item.id : `ups-${index}`,
                    type: normalizePowerModuleType(typeof item === 'string' ? item : item?.type),
                }))
                .filter((item) => item.type === 'ups');
            const powerModules = [
                ...upsModules,
                { id: 'required-power-unit', type: 'power-unit' },
                { id: 'required-circuit-breaker', type: 'circuit-breaker' },
            ];
            const getPowerSize = (moduleDevice) => {
                const imageKey = getWirelessDeviceImageKey(moduleDevice);
                const image = imageKey ? wirelessImages[imageKey] : null;
                return image?.width && image?.height
                    ? { width: image.width, height: image.height }
                    : { width: 80, height: 80 };
            };
            const powerPlacements = [];
            let cursorX = -4 * powerIndentValue;
            powerModules.forEach((moduleDevice, index) => {
                const size = getPowerSize(moduleDevice);
                cursorX -= size.width;
                powerPlacements.push({ moduleDevice, index, x: cursorX, y: controllerImg.height - size.height, ...size });
                cursorX -= 4 * powerIndentValue;
            });
            const upsPlacement = powerPlacements.find((item) => item.moduleDevice.type === 'ups');
            if (upsPlacement) {
                const battery = { id: 'required-battery', type: 'battery' };
                const size = getPowerSize(battery);
                powerPlacements.push({
                    moduleDevice: battery,
                    index: powerPlacements.length,
                    x: upsPlacement.x + (upsPlacement.width - size.width) / 2,
                    y: upsPlacement.y + upsPlacement.height + 11 * powerIndentValue,
                    ...size,
                });
            }
            powerPlacements.forEach((placement) => {
                rects.push({
                    id: `power:${placement.moduleDevice.id}:${placement.index}`,
                    kind: 'power',
                    left: placement.x,
                    top: placement.y,
                    right: placement.x + placement.width,
                    bottom: placement.y + placement.height,
                });
            });
        }

        return {
            rects: rects.map((rect) => (
                rect.kind === 'ext' || rect.kind === 'di' || rect.kind === 'onewire'
                    ? { ...rect, ...getModuleObjectFootprint(rect.id, rect, rect, showEmpty) }
                    : rect
            )),
            controllerRect,
        };
    };

    /**
     * Проверяет пересечение перемещаемого прямоугольника с контроллером и другими элементами.
     * @param {string} targetId Идентификатор перемещаемого элемента.
     * @param {object} targetRect Его прямоугольник.
     * @param {Array<object>} allRects Все занятые области.
     * @param {object} controllerRect Область контроллера.
     * @returns {boolean} Есть ли недопустимое пересечение.
     */
    const hasCollisionFor = (targetId, targetRect, allRects, controllerRect) => {
        if (rectsOverlap(targetRect, controllerRect)) return true;
        return allRects.some((rect) => rect.id !== targetId && rectsOverlap(targetRect, rect));
    };

    /**
     * Начинает панорамирование сцены, игнорируя интерактивные элементы.
     * @param {object} event Событие указателя Konva.
     */
    const startStagePan = (event) => {
        if (event?.evt?.type?.startsWith('mouse') && event.evt.button !== 0) return;
        if (event?.evt?.touches?.length >= 2) return;
        const stage = stageRef.current;
        const isLockedDinItem = installationMode
            && installationItemsLocked
            && (event.target?.hasName?.('installation-din-item') || event.target?.findAncestor?.('.installation-din-item'));
        if (installationMode && event.target !== stage && event.target?.getClassName?.() !== 'Rect' && !isLockedDinItem) return;
        if (installationMode && ['installation-panel-resize', 'installation-panel-lock'].includes(event.target?.name?.())) return;
        if (!stage || (!installationMode && event.target !== stage)) return;
        const pointer = stage.getPointerPosition();
        if (!pointer) return;
        event.evt?.preventDefault?.();
        isPanningRef.current = true;
        panStartPointerRef.current = pointer;
        panStartStageRef.current = { x: stage.x(), y: stage.y() };
    };

    /**
     * Перемещает сцену относительно сохраненной точки начала панорамирования.
     * @param {object} event Текущее событие указателя Konva.
     */
    const moveStagePan = (event) => {
        if (!isPanningRef.current || pinchZoomRef.current) return;
        const stage = stageRef.current;
        const pointer = stage?.getPointerPosition();
        if (!stage || !pointer) return;
        event.evt?.preventDefault?.();
        stage.position({
            x: snapPixel(panStartStageRef.current.x + (pointer.x - panStartPointerRef.current.x)),
            y: snapPixel(panStartStageRef.current.y + (pointer.y - panStartPointerRef.current.y)),
        });
        stage.batchDraw();
    };

    const memoExtModules = useMemo(() => getExtModules(scheme), [scheme]);
    const memoWifiModules = useMemo(
        () => (wifiLineEnabled ? getWifiModules(scheme) : []),
        [scheme, wifiLineEnabled],
    );
    const schemeOfferSections = useMemo(
        () => (showOfferModal ? getSchemeOfferSections(scheme) : []),
        [scheme, showOfferModal],
    );
    const memoControllerExtDevices = useMemo(() => getControllerExtDevices(scheme), [scheme]);
    const memoRawOneWireDevices = useMemo(() => getOneWireDevicesFromScheme(scheme), [scheme]);
    const memoBalancedOneWire = useMemo(
        () => (useInitialOneWireBalance ? balanceOneWireDevices(scheme, memoExtModules) : null),
        [scheme, memoExtModules, useInitialOneWireBalance],
    );
    const memoOneWireDevices = useInitialOneWireBalance ? memoBalancedOneWire.controllerDevices : memoRawOneWireDevices;
    const memoExtLineThermostatDevices = useInitialOneWireBalance
        ? (memoBalancedOneWire.extThermostatDevices || [])
        : memoControllerExtDevices;

    useLayoutEffect(() => {
        if (controllerType !== 'pro' || installationMode) {
            setRenderedProExtRight(null);
            return;
        }
        const rightEdges = Object.entries(extBodyNodeRefs.current).flatMap(([collisionId, node]) => {
            if (!node?.getLayer?.()) return [];
            const bodyRect = {
                left: node.x(),
                top: node.y(),
                right: node.x() + node.width(),
                bottom: node.y() + node.height(),
            };
            // Wi-Fi-линия должна начинаться после фактического footprint EXT,
            // включая занятые каналы IO4, а не только после корпуса модуля.
            return getModuleObjectCollisionRects(collisionId, bodyRect)
                .map((rect) => rect.right)
                .filter(Number.isFinite);
        });
        const nextRight = rightEdges.length > 0 ? Math.max(...rightEdges) : null;
        setRenderedProExtRight((current) => (
            current === nextRight || (current != null && nextRight != null && Math.abs(current - nextRight) < 0.01)
                ? current
                : nextRight
        ));
    }, [controllerType, installationMode, showEmptySlots, extSlotOffsets, memoExtModules, memoExtLineThermostatDevices, controllerImage, wirelessImages]);

    const memoWirelessDevices = useMemo(
        () => (Array.isArray(scheme.wireless_devices) ? scheme.wireless_devices : []),
        [scheme.wireless_devices],
    );
    const memoControllerKitSensorState = useMemo(
        () => getControllerKitSensorState(scheme, getControllerType(scheme)),
        [scheme],
    );
    const memoBundledSensorDevices = memoControllerKitSensorState.bundled;
    const memoUnusedBundledSensorCards = Object.entries(memoControllerKitSensorState.remaining)
        .filter(([, count]) => count > 0)
        .map(([bucket, count]) => ({
            bucket,
            count,
            label: CONTROLLER_KIT_SENSOR_PRODUCTS[bucket] || bucket,
        }));
    const unusedBundledSensorCount = memoUnusedBundledSensorCards.reduce((sum, card) => sum + card.count, 0);

    useEffect(() => {
        if (!showUnusedBundledSensors) return undefined;
        const closeOnOutsideInteraction = (event) => {
            if (!unusedBundledSensorsRef.current?.contains(event.target)) setShowUnusedBundledSensors(false);
        };
        const closeOnEscape = (event) => {
            if (event.key === 'Escape') setShowUnusedBundledSensors(false);
        };
        document.addEventListener('pointerdown', closeOnOutsideInteraction);
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('pointerdown', closeOnOutsideInteraction);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [showUnusedBundledSensors]);

    useEffect(() => {
        if (installationMode === displayedToolsInstallationMode) return undefined;
        setRightToolsTransitionPhase('exiting');
        const swapTimer = window.setTimeout(() => {
            setDisplayedToolsInstallationMode(installationMode);
            setRightToolsTransitionPhase('entering');
        }, 430);
        const finishTimer = window.setTimeout(() => setRightToolsTransitionPhase('idle'), 950);
        return () => {
            window.clearTimeout(swapTimer);
            window.clearTimeout(finishTimer);
        };
    }, [installationMode]);
    const memoWirelessSlotX = useMemo(
        () => memoWirelessDevices.map((device, idx) => getWirelessSlotX(
            memoWirelessDevices,
            idx,
            showEmptySlots,
            getControllerType(scheme),
            parseInt(indent, 10) || 8,
            getWirelessSlotWidth(device, showEmptySlots),
        )),
        [memoWirelessDevices, showEmptySlots, scheme, indent],
    );
    const memoWirelessPlusSlotX = useMemo(
        () => getWirelessSlotX(
            memoWirelessDevices,
            memoWirelessDevices.length,
            showEmptySlots,
            getControllerType(scheme),
            parseInt(indent, 10) || 8,
            80,
        ),
        [memoWirelessDevices, showEmptySlots, scheme, indent],
    );
    const memoWirelessOffsetsByLine = useMemo(
        () => buildWirelessOffsetsForLine(memoWirelessDevices),
        [memoWirelessDevices],
    );

    const installationItems = useMemo(() => {
        const powerModuleTypes = new Set(['circuit-breaker', 'power-unit', 'ups']);
        const expansionModuleTypes = new Set([...EXT_MODULE_TYPES, ...DI_MODULE_TYPES, 'rl6w', 'rl6sw', 'ntc-1-wire', 'rdt2', 'ecosmartbl2']);
        const getItemType = (item) => canonicalDeviceType(typeof item === 'string' ? item : item?.type);
        const getItemKey = (item, fallback) => {
            if (item?.id != null) return `${fallback}:${item.id}`;
            return `${fallback}:${JSON.stringify(item)}`;
        };
        const getChainLabelInfo = (chain, index, fallback = 'Модуль') => {
            const device = chain[index];
            const type = getItemType(device);
            const baseLabel = getInstallationDeviceLabel(device, INSTALLATION_DEVICE_TYPE_TITLES[type] || fallback);
            const sameTypeBefore = chain
                .slice(0, index)
                .filter((candidate) => getItemType(candidate) === type)
                .length;
            const sameTypeTotal = chain.filter((candidate) => getItemType(candidate) === type).length;
            return {
                label: sameTypeTotal > 1 ? `${baseLabel} #${sameTypeBefore + 1}` : baseLabel,
            };
        };
        const addUnique = (items, seen, item, source, extra = {}) => {
            const type = getItemType(item);
            if (!type || !expansionModuleTypes.has(type)) return;
            const key = getItemKey(item, `${source}:${type}`);
            if (seen.has(key)) return;
            seen.add(key);
            items.push({ key, type, data: item, ...extra });
        };

        const items = [];
        const seen = new Set();
        const rawPowerModules = Array.isArray(scheme?.power_modules) ? scheme.power_modules : [];
        const diModuleItems = Array.isArray(scheme?.di_modules) ? scheme.di_modules : [];
        const poweredModuleChain = [...memoExtModules, ...diModuleItems];
        const controllerTypeForInstallation = getControllerType(scheme);
        const isSmart2Installation = controllerTypeForInstallation === 'smart2';
        const controllerInstallationLabel = getInstallationItemLabel({ key: 'controller', type: controllerTypeForInstallation, data: scheme?.controller });
        const hasUpsPowerModule = rawPowerModules
            .map((item) => normalizePowerModuleType(typeof item === 'string' ? item : item?.type))
            .includes('ups');
        const lastPoweredModule = poweredModuleChain[poweredModuleChain.length - 1] || null;
        const smart2PowerSourceLabel = hasUpsPowerModule ? 'UPS' : POWER_UNIT_LABEL;
        const firstExtThermostatLabel = memoExtLineThermostatDevices[0]
            ? getInstallationDeviceLabel(memoExtLineThermostatDevices[0], 'Термостат')
            : null;
        const getPowerLabelsForModule = (moduleItem) => {
            const chainIndex = poweredModuleChain.findIndex((candidate) => candidate === moduleItem || (candidate?.id != null && candidate.id === moduleItem?.id));
            if (chainIndex < 0) return {};
            if (isSmart2Installation) {
                return {
                    powerPreviousLabel: chainIndex === poweredModuleChain.length - 1
                        ? smart2PowerSourceLabel
                        : getChainLabelInfo(poweredModuleChain, chainIndex + 1).label,
                    powerNextLabel: chainIndex > 0
                        ? getChainLabelInfo(poweredModuleChain, chainIndex - 1).label
                        : controllerInstallationLabel,
                };
            }
            return {
                powerPreviousLabel: chainIndex === 0
                    ? controllerInstallationLabel
                    : getChainLabelInfo(poweredModuleChain, chainIndex - 1).label,
                powerNextLabel: poweredModuleChain[chainIndex + 1]
                    ? getChainLabelInfo(poweredModuleChain, chainIndex + 1).label
                    : firstExtThermostatLabel,
            };
        };
        const normalizedPowerModuleTypes = rawPowerModules
            .map((item) => normalizePowerModuleType(typeof item === 'string' ? item : item?.type));
        const powerModules = [
            ...rawPowerModules,
            ...(['smart2', 'pro'].includes(controllerTypeForInstallation) && !isControllerOnlyScheme(scheme)
                ? [
                    ...(normalizedPowerModuleTypes.includes('power-unit') ? [] : ['power-unit']),
                    ...(normalizedPowerModuleTypes.includes('circuit-breaker') ? [] : ['circuit-breaker']),
                ]
                : []),
        ];

        powerModules
            .map((item, index) => ({ item, index, type: normalizePowerModuleType(typeof item === 'string' ? item : item?.type) }))
            .filter(({ type }) => powerModuleTypes.has(type))
            .forEach(({ item, index, type }) => {
                const key = getItemKey(item, `power:${type}:${index}`);
                if (seen.has(key)) return;
                seen.add(key);
                items.push({
                    key,
                    layoutKey: getInstallationLayoutItemKey('power', item, type, index),
                    type,
                    data: item,
                    powerPreviousLabel: type === 'ups' ? POWER_UNIT_LABEL : null,
                    powerNextLabel: type === 'power-unit'
                        ? (hasUpsPowerModule ? 'UPS' : (isSmart2Installation && lastPoweredModule ? getChainLabelInfo(poweredModuleChain, poweredModuleChain.length - 1).label : controllerInstallationLabel))
                        : (type === 'ups' ? (isSmart2Installation && lastPoweredModule ? getChainLabelInfo(poweredModuleChain, poweredModuleChain.length - 1).label : controllerInstallationLabel) : null),
                    ...(type === 'ups' ? { upsDiTargetLabel: controllerInstallationLabel } : {}),
                });
            });

        memoExtModules.forEach((item, index) => {
            const labelInfo = getChainLabelInfo(memoExtModules, index);
            addUnique(items, seen, item, `ext:${index}`, {
            layoutKey: getInstallationLayoutItemKey('ext', item, getItemType(item), index),
            installationLabel: labelInfo.label,
            modulePreviousLabel: index === 0
                ? getInstallationItemLabel({ key: 'controller', type: getControllerType(scheme), data: scheme?.controller })
                : getChainLabelInfo(memoExtModules, index - 1).label,
            // После последнего EXT-модуля цепочка может продолжаться EXT-термостатами:
            // их подключение выходит из EXT-OUT этого модуля.
            moduleNextLabel: memoExtModules[index + 1]
                ? getChainLabelInfo(memoExtModules, index + 1).label
                : (memoExtLineThermostatDevices[0]
                    ? getInstallationDeviceLabel(memoExtLineThermostatDevices[0], 'Термостат')
                    : null),
            ...getPowerLabelsForModule(item),
            });
        });
        diModuleItems.forEach((item, index, modules) => {
            const labelInfo = getChainLabelInfo(modules, index);
            addUnique(items, seen, item, `di:${index}`, {
            layoutKey: getInstallationLayoutItemKey('di', item, getItemType(item), index),
            installationLabel: labelInfo.label,
            modulePreviousLabel: index === 0
                ? getInstallationItemLabel({ key: 'controller', type: getControllerType(scheme), data: scheme?.controller })
                : getChainLabelInfo(modules, index - 1).label,
            moduleNextLabel: modules[index + 1]
                ? getChainLabelInfo(modules, index + 1).label
                : firstExtThermostatLabel,
            ...getPowerLabelsForModule(item),
            });
        });
        memoWifiModules.forEach((item, index, modules) => {
            const labelInfo = getChainLabelInfo(modules, index);
            addUnique(items, seen, item, `wifi:${index}`, {
                layoutKey: getInstallationLayoutItemKey('wifi', item, getItemType(item), index),
                installationLabel: labelInfo.label,
                isWifiPair: true,
            });
        });
        const standaloneOneWireModules = Array.isArray(scheme?.one_wire_modules) ? scheme.one_wire_modules : [];
        standaloneOneWireModules.forEach((item, index) => {
            const labelInfo = getChainLabelInfo(standaloneOneWireModules, index);
            addUnique(items, seen, item, `onewire:${index}`, {
            layoutKey: getInstallationLayoutItemKey('one-wire', item, getItemType(item), index),
            installationLabel: labelInfo.label,
            oneWirePreviousLabel: index === 0
                ? getInstallationItemLabel({ key: 'controller', type: getControllerType(scheme), data: scheme?.controller })
                : getChainLabelInfo(standaloneOneWireModules, index - 1).label,
            oneWireNextLabel: standaloneOneWireModules[index + 1]
                ? getChainLabelInfo(standaloneOneWireModules, index + 1).label
                : null,
            });
        });
        const controllerOneWireDevices = Array.isArray(scheme?.controller?.one_wire_devices) ? scheme.controller.one_wire_devices : [];
        controllerOneWireDevices.forEach((item, index) => {
            const labelInfo = getChainLabelInfo(controllerOneWireDevices, index);
            addUnique(items, seen, item, `controller-onewire:${index}`, {
            layoutKey: getInstallationLayoutItemKey('one-wire', item, getItemType(item), index),
            installationLabel: labelInfo.label,
            oneWirePreviousLabel: index === 0
                ? getInstallationItemLabel({ key: 'controller', type: getControllerType(scheme), data: scheme?.controller })
                : getChainLabelInfo(controllerOneWireDevices, index - 1).label,
            oneWireNextLabel: controllerOneWireDevices[index + 1]
                ? getChainLabelInfo(controllerOneWireDevices, index + 1).label
                : null,
            });
        });
        (Array.isArray(scheme?.ext_modules) ? scheme.ext_modules : [])
            .flatMap((moduleItem, moduleIndex) => (Array.isArray(moduleItem?.one_wire_devices) ? moduleItem.one_wire_devices : []).map((item, itemIndex, lineItems) => ({
                item,
                moduleItem,
                moduleIndex,
                itemIndex,
                lineItems,
            })))
            .forEach(({ item, moduleItem, moduleIndex, itemIndex, lineItems }) => {
                const labelInfo = getChainLabelInfo(lineItems, itemIndex);
                addUnique(items, seen, item, `ext-onewire:${moduleIndex}:${itemIndex}`, {
                layoutKey: getInstallationLayoutItemKey('one-wire', item, getItemType(item), `${moduleIndex}:${itemIndex}`),
                installationLabel: labelInfo.label,
                oneWirePreviousLabel: itemIndex === 0
                    ? getChainLabelInfo(memoExtModules, moduleIndex).label
                    : getChainLabelInfo(lineItems, itemIndex - 1).label,
                oneWireNextLabel: lineItems[itemIndex + 1]
                    ? getChainLabelInfo(lineItems, itemIndex + 1).label
                    : null,
                });
            });

        return items;
    }, [scheme, memoExtModules, memoExtLineThermostatDevices, memoWifiModules]);

    const installationDinTotal = useMemo(() => {
        if (!canUseInstallationMode) return null;
        const moduleWidths = installationItems.map((item) => (item.isWifiPair ? 4 * dinSize : (wirelessImages[item.type]?.width || 0)));
        const controllerOnRail = !INSTALLATION_LEFT_CONTROLLERS.has(controllerType);
        if (moduleWidths.some((width) => width <= 0) || (controllerOnRail && !controllerImage?.width)) return null;
        return getInstallationDinTotal({
            controllerWidth: controllerImage?.width || 0,
            controllerOnRail,
            moduleWidths,
            dinSize,
        });
    }, [canUseInstallationMode, controllerImage, controllerType, dinSize, installationItems, wirelessImages]);

    useEffect(() => {
        const activeKeys = new Set([
            getInstallationLayoutItemKey('controller', scheme?.controller, controllerType, 0),
            ...installationItems.map((item) => item.layoutKey || item.key),
        ]);
        setInstallationItemOffsets((current) => {
            const next = Object.fromEntries(Object.entries(current).filter(([key]) => activeKeys.has(key)));
            return Object.keys(next).length === Object.keys(current).length ? current : next;
        });
    }, [controllerType, installationItems]);

    if (routeSchemeId && schemeLoadState !== 'loaded') {
        return (
            <main className="spa-page">
                <div style={{ padding: 32, fontFamily: 'Arial, sans-serif' }}>
                    {schemeLoadState === 'error'
                        ? `Не удалось загрузить схему: ${schemeLoadError || 'неизвестная ошибка'}`
                        : 'Загрузка схемы...'}
                </div>
            </main>
        );
    }

    return (
        <main className="spa-page">
            {showHelpModal && <SchemeHelpModal onClose={closeHelpModal} />}
            {showOfferModal && (
                <EquipmentOfferModal sections={schemeOfferSections} onClose={() => setShowOfferModal(false)} />
            )}
            {showSelectionConfig && selectionConfig && (
                <SelectionConfigModal config={selectionConfig} onClose={() => setShowSelectionConfig(false)} />
            )}
            <nav className="spa-selection-return" aria-label="Навигация схемы">
                <a className="spa-selection-return-logo" href="/selection" aria-label="Перейти к подбору">
                    <img src={logoPath} alt="MYHEAT" />
                </a>
                <a className="spa-selection-return-button" href="/selection">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="m14.5 5-7 7 7 7M8 12h9" />
                    </svg>
                    <span>Назад</span>
                </a>
            </nav>
            <SchemeFloatingTools
                unusedBundledSensorsRef={unusedBundledSensorsRef}
                showUnusedBundledSensors={showUnusedBundledSensors}
                setShowUnusedBundledSensors={setShowUnusedBundledSensors}
                unusedBundledSensorCount={unusedBundledSensorCount}
                unusedBundledSensorCards={memoUnusedBundledSensorCards}
                selectionConfig={selectionConfig}
                setShowOfferModal={setShowOfferModal}
                setShowSelectionConfig={setShowSelectionConfig}
            />
            <div className="spa-mode-toggle" role="group" aria-label="Режим отображения схемы">
                <button
                    type="button"
                    className={!installationMode ? 'is-active' : ''}
                    aria-pressed={!installationMode}
                    disabled={rightToolsTransitionPhase !== 'idle'}
                    onClick={() => {
                        if (installationMode) setInstallationModeEnabled(false);
                    }}
                >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="5" cy="6" r="2" />
                        <circle cx="19" cy="6" r="2" />
                        <circle cx="12" cy="18" r="2" />
                        <path d="M7 6h10M6.5 7.5l4.2 8.7m6.8-8.7-4.2 8.7" />
                    </svg>
                    <span>Схема</span>
                </button>
                <button
                    type="button"
                    className={installationMode ? 'is-active' : ''}
                    aria-pressed={installationMode}
                    title={canUseInstallationMode ? 'Режим инсталляции' : 'Режим инсталляции недоступен'}
                    disabled={!canUseInstallationMode || rightToolsTransitionPhase !== 'idle'}
                    onClick={() => {
                        if (!installationMode) setInstallationModeEnabled(true);
                    }}
                >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M3 5h18v14H3zM6 8h4v8H6zm8 0h4v8h-4z" />
                    </svg>
                    <span>Инсталляция</span>
                </button>
            </div>
            {!displayedToolsInstallationMode && !devicePreviewCollapsed && (
            <aside id="spa-device-preview" className={`spa-device-preview is-${rightToolsTransitionPhase}${selectedPreviewDevice ? ' has-device' : ''}`} aria-label="Увеличенный просмотр устройства">
                <div className="spa-device-preview-header">
                    <span>Детали устройства</span>
                    <div className="spa-device-preview-header-actions">
                        <button
                            type="button"
                            aria-label="Закрыть просмотр устройства"
                            disabled={!selectedPreviewDevice}
                            onClick={() => setSelectedDevicePreview(null)}
                        >
                            ×
                        </button>
                        <button
                            type="button"
                            aria-label="Свернуть детали устройства"
                            title="Свернуть"
                            onClick={() => setDevicePreviewCollapsed(true)}
                        >
                            <svg viewBox="0 0 20 20" aria-hidden="true">
                                <path d="m7 4 6 6-6 6" />
                            </svg>
                        </button>
                    </div>
                </div>
                {selectedPreviewDevice ? (
                    <div className="spa-device-preview-items">
                        {selectedPreviewDevices.map((item, previewIndex) => {
                            const previewDevice = item.device;
                            const previewTitle = item.title || getDeviceStoredTitle(previewDevice) || getDeviceBaseTitle(previewDevice);
                            const previewImagePath = previewDevice
                                ? wirelessDeviceImagePaths[getWirelessDeviceImageKey(previewDevice)]
                                : null;
                            const previewComment = typeof previewDevice?.comment === 'string'
                                ? previewDevice.comment.trim()
                                : '';
                            const previewIsPrimary = previewIndex === 0;
                            const previewIsBoiler = previewDevice?.device_type === 'boiler'
                                || ['smart', 'stupid'].includes(canonicalDeviceType(previewDevice?.type));
                            return (
                                <div className="spa-device-preview-item" key={`${previewDevice?.id ?? previewIndex}-${previewDevice?.type ?? 'device'}`}>
                                    <div className={`spa-device-preview-image${previewIsBoiler ? ' is-boiler' : ''}`}>
                                        {previewImagePath ? (
                                            <img src={previewImagePath} alt="" />
                                        ) : (
                                            <span>Нет изображения</span>
                                        )}
                                    </div>
                                    <div className="spa-device-preview-meta-card">
                                        <div className="spa-device-preview-meta-icon" aria-hidden="true">
                                            <svg viewBox="0 0 24 24">
                                                <rect x="5" y="5" width="14" height="14" rx="2" />
                                                <path d="M8 9h8M8 12h8M8 15h5" />
                                            </svg>
                                        </div>
                                        <div className="spa-device-preview-meta-copy">
                                            <span className="spa-device-preview-meta-kicker">Устройство</span>
                                            {previewIsPrimary && previewTitleEditor ? (
                                                <form
                                                    onSubmit={(event) => {
                                                        event.preventDefault();
                                                        savePreviewTitle();
                                                    }}
                                                >
                                                    <input
                                                        value={previewTitleDraft}
                                                        autoFocus
                                                        aria-label="Текст инфоблока"
                                                        onChange={(event) => setPreviewTitleDraft(event.target.value)}
                                                        onKeyDown={(event) => {
                                                            if (event.key === 'Escape') {
                                                                event.preventDefault();
                                                                setPreviewTitleEditor(false);
                                                                setPreviewTitleDraft(selectedDevicePreview.title);
                                                            }
                                                        }}
                                                    />
                                                    <button type="submit" aria-label="Сохранить текст инфоблока">✓</button>
                                                </form>
                                            ) : previewIsPrimary ? (
                                                <button
                                                    type="button"
                                                    className="spa-device-preview-meta-title"
                                                    title="Изменить текст инфоблока"
                                                    onClick={() => {
                                                        setPreviewTitleDraft(selectedDevicePreview.title);
                                                        setPreviewTitleEditor(true);
                                                    }}
                                                >
                                                    {previewTitle}
                                                </button>
                                            ) : (
                                                <span className="spa-device-preview-meta-title is-static">{previewTitle}</span>
                                            )}
                                            <button
                                                type="button"
                                                className={`spa-device-preview-meta-comment${previewComment ? '' : ' is-empty'}`}
                                                title="Изменить комментарий устройства"
                                                onClick={() => editDeviceComment(previewDevice)}
                                            >
                                                {previewComment || 'Добавить комментарий'}
                                            </button>
                                        </div>
                                        {previewIsPrimary && (
                                            <button
                                                type="button"
                                                className="spa-device-preview-meta-edit"
                                                aria-label="Изменить название устройства"
                                                onClick={() => {
                                                    setPreviewTitleDraft(selectedDevicePreview.title);
                                                    setPreviewTitleEditor(true);
                                                }}
                                            >
                                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                                    <path d="m5 16.5-.7 3.2 3.2-.7L18 8.5 15.5 6zM14 7.5l2.5 2.5" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="spa-device-preview-empty">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <circle cx="10.5" cy="10.5" r="5.5" />
                            <path d="m15 15 5 5M10.5 8v5m-2.5-2.5h5" />
                        </svg>
                        <span>Нажмите на занятый слот или инфоблок устройства на схеме</span>
                    </div>
                )}
            </aside>
            )}
            <SchemeRightTools
                rightToolsTransitionPhase={rightToolsTransitionPhase}
                displayedToolsInstallationMode={displayedToolsInstallationMode}
                installationMode={installationMode}
                devicePreviewCollapsed={devicePreviewCollapsed}
                selectedPreviewDevice={selectedPreviewDevice}
                onToggleDevicePreview={() => setDevicePreviewCollapsed((current) => !current)}
                installationDinTotal={installationDinTotal}
                showGrid={showGrid}
                onToggleGrid={() => setShowGrid((current) => !current)}
                showEmptySlots={showEmptySlots}
                onToggleEmptySlots={() => {
                    const nextShowEmptySlots = !showEmptySlots;
                    setShowEmptySlots(nextShowEmptySlots);
                    updateSchemeViewOptions({ showEmptySlots: nextShowEmptySlots });
                }}
                handleSaveScheme={handleSaveScheme}
                routeSchemeId={routeSchemeId}
                schemeLoadState={schemeLoadState}
                schemeSaveState={schemeSaveState}
                handleSaveAsNewScheme={handleSaveAsNewScheme}
                schemeCreateState={schemeCreateState}
                showPorts={showPorts}
                onShowPortsChange={setShowPorts}
                showLineFrames={showLineFrames}
                onShowLineFramesChange={setShowLineFrames}
                showIncomingScheme={showIncomingScheme}
                onShowIncomingSchemeChange={setShowIncomingScheme}
                wifiLineEnabled={wifiLineEnabled}
                onWifiLineEnabledChange={(event) => {
                    const enabled = event.target.checked;
                    setWifiLineEnabled(enabled);
                    if (!enabled) {
                        setWifiMenuPos(null);
                        setWifiOneWireMenuPos(null);
                        setRelayMenuPos((current) => (current?.moduleGroup === 'wifi' ? null : current));
                    }
                }}
                handleDownloadPdf={handleDownloadPdf}
            />
            {!displayedToolsInstallationMode && (
                <button
                    type="button"
                    className={`spa-floating-tool-button spa-reset-positions-button is-${rightToolsTransitionPhase}`}
                    aria-label="Сбросить позиции"
                    data-tooltip="Сбросить позиции"
                    onClick={handleResetPositions}
                >
                    <svg viewBox="0 0 32 32" aria-hidden="true">
                        <path d="M7.5 11.5A10 10 0 1 1 6 20" />
                        <path d="M7.5 5.5v6h6M16 10.5v6l4 2.5" />
                    </svg>
                    <span className="spa-tool-label">Сброс</span>
                </button>
            )}
            <button
                type="button"
                className="spa-floating-tool-button spa-floating-help-button"
                aria-label="Помощь"
                data-tooltip="Помощь"
                onClick={() => setShowHelpModal(true)}
            >
                <svg viewBox="0 0 32 32" aria-hidden="true">
                    <circle cx="16" cy="16" r="11.5" />
                    <path d="M12.8 12.5a3.4 3.4 0 1 1 5.2 2.9c-1.3.8-2 1.5-2 3.1" />
                    <path d="M16 23h.01" />
                </svg>
                <span className="spa-tool-label">Помощь</span>
            </button>
            <div className={`spa-scheme-meta${schemeMetadataEditor ? ' is-open' : ''}${schemeMetaCollapsed ? ' is-collapsed' : ''}`}>
                {schemeMetaCollapsed ? (
                    <button
                        type="button"
                        className="spa-floating-tool-button spa-scheme-meta-expand-button"
                        aria-label="Развернуть текущую схему"
                        data-tooltip="Текущая схема"
                        data-test-id="expand-current-scheme"
                        onClick={() => setSchemeMetaCollapsed(false)}
                    >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M6 3.5h9l3 3v14H6zM15 3.5v3h3M9 11h6m-6 3h6m-6 3h4" />
                        </svg>
                        <span className="spa-tool-label">Текущая</span>
                    </button>
                ) : (
                    <>
                <button
                    type="button"
                    className="spa-scheme-meta-card"
                    disabled={!routeSchemeId}
                    aria-expanded={Boolean(schemeMetadataEditor)}
                    aria-controls="spa-scheme-meta-editor"
                    title={routeSchemeId ? 'Редактировать название и описание' : schemeName}
                    onClick={() => setSchemeMetadataEditor((current) => (current ? null : {
                        name: schemeName,
                        description: schemeDescription,
                        state: 'idle',
                    }))}
                >
                    <span className="spa-scheme-meta-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                            <path d="M6 3.5h9l3 3v14H6zM15 3.5v3h3M9 11h6m-6 3h6m-6 3h4" />
                        </svg>
                    </span>
                    <span className="spa-scheme-meta-copy">
                        <span className="spa-scheme-meta-kicker">Текущая схема</span>
                        <strong>{schemeName}</strong>
                        <small className={schemeDescription ? undefined : 'is-empty'}>
                            {schemeDescription || 'Добавьте краткое описание'}
                        </small>
                    </span>
                    {routeSchemeId && (
                        <span className="spa-scheme-meta-edit" aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                                <path d="m5 16.5-.7 3.2 3.2-.7L18 8.5 15.5 6zM14 7.5l2.5 2.5" />
                            </svg>
                        </span>
                    )}
                </button>
                <button
                    type="button"
                    className="spa-scheme-meta-collapse-button"
                    aria-label="Свернуть текущую схему"
                    title="Свернуть"
                    onClick={() => {
                        setSchemeMetadataEditor(null);
                        setSchemeMetaCollapsed(true);
                    }}
                >
                    <svg viewBox="0 0 20 20" aria-hidden="true">
                        <path d="m13 4-6 6 6 6" />
                    </svg>
                </button>
                {schemeMetadataEditor && (
                    <form
                        id="spa-scheme-meta-editor"
                        className="spa-scheme-meta-editor"
                        onSubmit={(event) => {
                            event.preventDefault();
                            saveSchemeMetadata();
                        }}
                        onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                                event.preventDefault();
                                setSchemeMetadataEditor(null);
                            }
                        }}
                    >
                    <div className="spa-scheme-meta-editor-header">
                        <div>
                            <span>Паспорт схемы</span>
                            <strong>Название и описание</strong>
                        </div>
                        <button type="button" onClick={() => setSchemeMetadataEditor(null)} aria-label="Закрыть">×</button>
                    </div>
                    <label className="spa-scheme-meta-field">
                        <span>Название</span>
                        <input
                            value={schemeMetadataEditor?.name || ''}
                            autoFocus
                            maxLength={255}
                            disabled={schemeMetadataEditor?.state === 'saving'}
                            aria-invalid={schemeMetadataEditor?.state === 'invalid'}
                            onChange={(event) => setSchemeMetadataEditor((current) => (
                                current ? { ...current, name: event.target.value, state: 'idle' } : current
                            ))}
                        />
                    </label>
                    <label className="spa-scheme-meta-field">
                        <span>Описание</span>
                        <textarea
                            value={schemeMetadataEditor?.description || ''}
                            rows={3}
                            disabled={schemeMetadataEditor?.state === 'saving'}
                            placeholder="Назначение схемы, объект или важные примечания"
                            onChange={(event) => setSchemeMetadataEditor((current) => (
                                current ? { ...current, description: event.target.value, state: 'idle' } : current
                            ))}
                        />
                    </label>
                    {schemeMetadataEditor?.state === 'invalid' && <div className="spa-scheme-meta-error">Укажите название схемы</div>}
                    {schemeMetadataEditor?.state === 'error' && <div className="spa-scheme-meta-error">Не удалось сохранить изменения</div>}
                    <div className="spa-scheme-meta-actions">
                        <button type="button" onClick={() => setSchemeMetadataEditor(null)}>Отмена</button>
                        <button type="submit" className="is-primary" disabled={schemeMetadataEditor?.state === 'saving'}>
                            {schemeMetadataEditor?.state === 'saving' ? 'Сохраняем...' : 'Сохранить'}
                        </button>
                    </div>
                    </form>
                )}
                    </>
                )}
            </div>
            {schemeLoadError && (
                <div style={{ position: 'fixed', top: 72, right: 16, zIndex: 60, color: '#d32f2f', background: '#fff', border: '1px solid #ef9a9a', borderRadius: 6, padding: '6px 10px', fontSize: 12 }}>
                    {schemeLoadError}
                </div>
            )}
            {titleEditor && (
                <div className="title-editor-backdrop" onMouseDown={closeTitleEditor}>
                    <form
                        className="title-editor-modal"
                        onSubmit={(event) => {
                            event.preventDefault();
                            saveTitleEditor();
                        }}
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <div className="title-editor-header">
                            <strong>Инфоблок</strong>
                            <button type="button" className="title-editor-close" onClick={closeTitleEditor}>×</button>
                        </div>
                        <label className="title-editor-label" htmlFor="title-editor-input">Текст инфоблока</label>
                        <input
                            id="title-editor-input"
                            className="title-editor-input"
                            value={titleEditor.value}
                            autoFocus
                            onChange={(event) => setTitleEditor((prev) => (prev ? { ...prev, value: event.target.value } : prev))}
                            onKeyDown={(event) => {
                                if (event.key === 'Escape') {
                                    event.preventDefault();
                                    closeTitleEditor();
                                }
                            }}
                        />
                        <div className="title-editor-actions">
                            <button type="button" className="title-editor-secondary" onClick={closeTitleEditor}>Отмена</button>
                            <button type="submit" className="title-editor-primary" disabled={!String(titleEditor.value || '').trim()}>Сохранить</button>
                        </div>
                    </form>
                </div>
            )}
            {commentEditor && (
                <div className="title-editor-backdrop" onMouseDown={closeCommentEditor}>
                    <form
                        className="title-editor-modal"
                        onSubmit={(event) => {
                            event.preventDefault();
                            saveCommentEditor();
                        }}
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <div className="title-editor-header">
                            <strong>Комментарий</strong>
                            <button type="button" className="title-editor-close" onClick={closeCommentEditor}>×</button>
                        </div>
                        <label className="title-editor-label" htmlFor="comment-editor-input">Комментарий к устройству</label>
                        <textarea
                            id="comment-editor-input"
                            className="title-editor-input title-editor-textarea"
                            value={commentEditor.value}
                            autoFocus
                            rows={5}
                            onChange={(event) => setCommentEditor((prev) => (prev ? { ...prev, value: event.target.value } : prev))}
                            onKeyDown={(event) => {
                                if (event.key === 'Escape') {
                                    event.preventDefault();
                                    closeCommentEditor();
                                }
                            }}
                        />
                        <div className="title-editor-actions">
                            <button type="button" className="title-editor-secondary" onClick={closeCommentEditor}>Отмена</button>
                            <button type="submit" className="title-editor-primary">Сохранить</button>
                        </div>
                    </form>
                </div>
            )}
            {commentViewer && (
                <div className="comment-viewer-backdrop" onMouseDown={closeCommentViewer}>
                    <div
                        className="title-editor-modal comment-viewer-modal"
                        style={{
                            left: Math.min(Math.max(12, commentViewer.x + 10), window.innerWidth - 332),
                            top: Math.min(Math.max(12, commentViewer.y + 10), window.innerHeight - 260),
                        }}
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <div className="title-editor-header">
                            <strong>Комментарий</strong>
                            <button type="button" className="title-editor-close" onClick={closeCommentViewer}>×</button>
                        </div>
                        <div className="comment-viewer-text">
                            {commentViewer.comment}
                        </div>
                        <div className="title-editor-actions">
                            <button type="button" className="title-editor-secondary" onClick={closeCommentViewer}>Закрыть</button>
                            <button
                                type="button"
                                className="title-editor-primary"
                                onClick={() => {
                                    const device = commentViewer.device;
                                    closeCommentViewer();
                                    editDeviceComment(device);
                                }}
                            >
                                Редактировать
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showIncomingScheme && (
                <IncomingSchemeDebugPanel
                    text={schemeJsonText}
                    dirty={schemeJsonDirty}
                    error={schemeJsonError}
                    onTextChange={(value) => {
                        setSchemeJsonText(value);
                        setSchemeJsonDirty(true);
                        setSchemeJsonError(null);
                    }}
                    onRender={handleRenderSchemeJson}
                    onFormat={handleFormatSchemeJson}
                />
            )}
            <section className={installationMode ? 'canvas-area canvas-area-installation' : 'canvas-area'}>
                <Stage
                    ref={stageRef}
                    width={canvasSize.width}
                    height={canvasSize.height}
                    style={{ cursor: 'grab', touchAction: 'none' }}
                    onMouseDown={startStagePan}
                    onMouseMove={moveStagePan}
                    onMouseUp={() => { isPanningRef.current = false; }}
                    onMouseLeave={() => { isPanningRef.current = false; }}
                    onTouchStart={startStagePan}
                    onTouchMove={moveStagePan}
                    onTouchEnd={() => { isPanningRef.current = false; }}
                    onTouchCancel={() => { isPanningRef.current = false; }}
                    onClick={selectDevicePreviewFromSlot}
                    onTap={selectDevicePreviewFromSlot}
                     onWheel={(event) => {
                         event.evt.preventDefault();
                         const stage = stageRef.current;
                         if (!stage) return;
                         const shouldZoom = event.evt.shiftKey || event.evt.ctrlKey || event.evt.metaKey;
                         if (!shouldZoom) {
                             stage.position({
                                 x: snapPixel(stage.x() - event.evt.deltaX),
                                 y: snapPixel(stage.y() - event.evt.deltaY),
                             });
                             stage.batchDraw();
                             return;
                         }
                         const pointer = stage.getPointerPosition();
                         if (!pointer) return;
                        const pending = zoomPendingRef.current || { deltaY: 0, pointer };
                         const zoomSensitivity = event.evt.ctrlKey ? 0.01 : 0.0008;
                         pending.deltaY += event.evt.deltaY * zoomSensitivity;
                        pending.pointer = pointer;
                        zoomPendingRef.current = pending;
                        if (zoomFrameRef.current) return;
                        const flushZoom = (timestamp) => {
                            const minFrameDuration = 1000 / 45;
                            const remainingDelay = minFrameDuration - (timestamp - zoomLastDrawAtRef.current);
                            if (remainingDelay > 0) {
                                window.setTimeout(() => {
                                    zoomFrameRef.current = window.requestAnimationFrame(flushZoom);
                                }, remainingDelay);
                                return;
                            }
                            zoomFrameRef.current = null;
                            const next = zoomPendingRef.current;
                            zoomPendingRef.current = null;
                            if (!next) return;
                             const nextScale = stage.scaleX() * Math.exp(-next.deltaY);
                             scaleStageAtPoint(stage, next.pointer, nextScale);
                             zoomLastDrawAtRef.current = timestamp;
                        };
                        zoomFrameRef.current = window.requestAnimationFrame(flushZoom);
                    }}
                >
                    {showGrid && !installationMode && gridPatternImage && (
                        <Layer ref={gridLayerRef} listening={false}>
                            <Rect
                                x={CANVAS_GRID_MIN}
                                y={CANVAS_GRID_MIN}
                                width={CANVAS_GRID_MAX - CANVAS_GRID_MIN}
                                height={CANVAS_GRID_MAX - CANVAS_GRID_MIN}
                                fillPatternImage={gridPatternImage}
                                fillPatternRepeat="repeat"
                                listening={false}
                            />
                        </Layer>
                    )}
                    {!installationMode && (
                        <DeviceInfoBlockProvider
                            commentIconImage={commentIconImage}
                            commentAddIconImage={commentAddIconImage}
                            commentIconNodeName={COMMENT_ICON_NODE_NAME}
                            selectDevicePreview={selectDevicePreview}
                            editDeviceTitle={editDeviceTitle}
                            viewDeviceComment={viewDeviceComment}
                        >
                        <SchemeCanvas
                            addController420PressureSensor={addController420PressureSensor}
                            addControllerLeakSensorAtSlot={addControllerLeakSensorAtSlot}
                            addControllerNtcLineSensorAtSlot={addControllerNtcLineSensorAtSlot}
                            addEcosmartExtThermostatWithFloorSlot={addEcosmartExtThermostatWithFloorSlot}
                            addEcosmartPump={addEcosmartPump}
                            addEcosmartServo={addEcosmartServo}
                            addEcosmartValve={addEcosmartValve}
                            addExtNtcSensorAtSlot={addExtNtcSensorAtSlot}
                            addExtThermostatFloorSensor={addExtThermostatFloorSensor}
                            addOneWireNtcSensorAtSlot={addOneWireNtcSensorAtSlot}
                            aerialImage={aerialImage}
                            busDragStartOffsetsRef={busDragStartOffsetsRef}
                            busSlotOffsets={busSlotOffsets}
                            canonicalDeviceType={canonicalDeviceType}
                            canvasSize={canvasSize}
                            controller420DragStartOffsetRef={controller420DragStartOffsetRef}
                            controller420SlotOffset={controller420SlotOffset}
                            controllerImage={controllerImage}
                            controllerType={controllerType}
                            diDragStartOffsetsRef={diDragStartOffsetsRef}
                            diSlotOffsets={diSlotOffsets}
                            dinSize={dinSize}
                            extBodyNodeRefs={extBodyNodeRefs}
                            extDragStartOffsetsRef={extDragStartOffsetsRef}
                            extOneWireDragStartOffsetsRef={extOneWireDragStartOffsetsRef}
                            extOneWireOffsets={extOneWireOffsets}
                            extSlotOffsets={extSlotOffsets}
                            getAllOccupiedRects={getAllOccupiedRects}
                            getAnchoredOneWirePort={getAnchoredOneWirePort}
                            getAnchoredOneWirePortsForDisplay={getAnchoredOneWirePortsForDisplay}
                            getBusDevices={getBusDevices}
                            getBusLineCount={getBusLineCount}
                            getConnectionTypes={getConnectionTypes}
                            getContainSize={getContainSize}
                            getControllerBodyBottomY={getControllerBodyBottomY}
                            getControllerLineDevices={getControllerLineDevices}
                            getDeviceBaseTitle={getDeviceBaseTitle}
                            getDeviceStoredTitle={getDeviceStoredTitle}
                            getDi6PhysicalDevices={getDi6PhysicalDevices}
                            getDiDeviceTitle={getDiDeviceTitle}
                            getDiModules={getDiModules}
                            getDiOffsetKey={getDiOffsetKey}
                            getDiWiredDevices={getDiWiredDevices}
                            getDoubleRelayDevices={getDoubleRelayDevices}
                            getEcosmartBl2OverlayGeometry={getEcosmartBl2OverlayGeometry}
                            getEcosmartFirstOneWireExtraDown={getEcosmartFirstOneWireExtraDown}
                            getExtDiLineCapacityByType={getExtDiLineCapacityByType}
                            getExtOffsetKey={getExtOffsetKey}
                            getExtOneWireOffsetKey={getExtOneWireOffsetKey}
                            getFullWidthSize={getFullWidthSize}
                            getIo4OnlyWiredDevices={getIo4OnlyWiredDevices}
                            getLeakSensorDisplayIndex={getLeakSensorDisplayIndex}
                            getLeakZoneSensors={getLeakZoneSensors}
                            getModuleLineDevices={getModuleLineDevices}
                            getModuleObjectCollisionRects={getModuleObjectCollisionRects}
                            getModuleObjectFootprint={getModuleObjectFootprint}
                            getMorphImageKey={getMorphImageKey}
                            getNtcChannelBySlot={getNtcChannelBySlot}
                            getNtcSensorFromDeviceLine={getNtcSensorFromDeviceLine}
                            getNtcSensorTitle={getNtcSensorTitle}
                            getNtcSensorsFromScheme={getNtcSensorsFromScheme}
                            getOneWireBendY={getOneWireBendY}
                            getOneWireDeviceTitle={getOneWireDeviceTitle}
                            getOneWireDirectionForDevice={getOneWireDirectionForDevice}
                            getOneWireLineGeometry={getOneWireLineGeometry}
                            getOneWireOffsetKey={getOneWireOffsetKey}
                            getOneWirePortByRole={getOneWirePortByRole}
                            getOneWireSlotPosition={getOneWireSlotPosition}
                            getOrthogonalLinkPoints={getOrthogonalLinkPoints}
                            getPortPosition={getPortPosition}
                            getPortsByClassToken={getPortsByClassToken}
                            getPressureSensorFromScheme={getPressureSensorFromScheme}
                            getPressureSensorsFromScheme={getPressureSensorsFromScheme}
                            getProAuxLineOccupancy={getProAuxLineOccupancy}
                            getRelayDevicesForController={getRelayDevicesForController}
                            getRelayLineConfig={getRelayLineConfig}
                            getRelayLinkPointsFromDevice={getRelayLinkPointsFromDevice}
                            getRelayLinkPointsToDevice={getRelayLinkPointsToDevice}
                            getRelaySAssignedDevices={getRelaySAssignedDevices}
                            getRelaySLineConfig={getRelaySLineConfig}
                            getRelaySPreferredDevices={getRelaySPreferredDevices}
                            getRinnaiBusSlotYOffset={getRinnaiBusSlotYOffset}
                            getRl6RelayTerminalNames={getRl6RelayTerminalNames}
                            getRuntimeOffsetKey={getRuntimeOffsetKey}
                            getSmart2DiModuleExtraSpacing={getSmart2DiModuleExtraSpacing}
                            getSmart2DiPortUsage={getSmart2DiPortUsage}
                            getWifiCapacity={getWifiCapacity}
                            getWifiOffsetKey={getWifiOffsetKey}
                            getWirelessDeviceImageKey={getWirelessDeviceImageKey}
                            getWirelessDeviceKey={getWirelessDeviceKey}
                            getWirelessDeviceTitle={getWirelessDeviceTitle}
                            getWirelessInfoBlockY={getWirelessInfoBlockY}
                            getWirelessLineLift={getWirelessLineLift}
                            getWirelessLineTop={getWirelessLineTop}
                            getWirelessSlotHeight={getWirelessSlotHeight}
                            getWirelessSlotWidth={getWirelessSlotWidth}
                            getWirelessSlotX={getWirelessSlotX}
                            getWirelessSlotYByIndex={getWirelessSlotYByIndex}
                            goAerialImage={goAerialImage}
                            hasCollisionFor={hasCollisionFor}
                            hasExtThermostatFloorSensor={hasExtThermostatFloorSensor}
                            hoveredBusLineIndex={hoveredBusLineIndex}
                            hoveredExtOneWireKey={hoveredExtOneWireKey}
                            hoveredExtSlotIndex={hoveredExtSlotIndex}
                            hoveredNtcSlotKey={hoveredNtcSlotKey}
                            hoveredOneWireSlotIndex={hoveredOneWireSlotIndex}
                            hoveredRelaySlotIndex={hoveredRelaySlotIndex}
                            hoveredWifiOneWireSlotKey={hoveredWifiOneWireSlotKey}
                            hoveredWifiSlotKey={hoveredWifiSlotKey}
                            hoveredWirelessDeviceKey={hoveredWirelessDeviceKey}
                            indentSize={indentSize}
                            invalidDiDragMap={invalidDiDragMap}
                            invalidExtDragMap={invalidExtDragMap}
                            invalidExtOneWireDragMap={invalidExtOneWireDragMap}
                            invalidOneWireDragMap={invalidOneWireDragMap}
                            invalidWifiDragMap={invalidWifiDragMap}
                            isBundledSensorDevice={isBundledSensorDevice}
                            isControllerOnlyScheme={isControllerOnlyScheme}
                            isDiscreteDiDeviceType={isDiscreteDiDeviceType}
                            isDoubleRelaySignalPort={isDoubleRelaySignalPort}
                            isFlaskSensorType={isFlaskSensorType}
                            isLeakDiDeviceType={isLeakDiDeviceType}
                            isLeakLoop={isLeakLoop}
                            isOtherEquipmentType={isOtherEquipmentType}
                            isRelayBoilerType={isRelayBoilerType}
                            isSameDevice={isSameDevice}
                            isStupidBoilerType={isStupidBoilerType}
                            isThermostatFloorSensorAddition={isThermostatFloorSensorAddition}
                            memoBalancedOneWire={memoBalancedOneWire}
                            memoBundledSensorDevices={memoBundledSensorDevices}
                            memoExtLineThermostatDevices={memoExtLineThermostatDevices}
                            memoExtModules={memoExtModules}
                            memoOneWireDevices={memoOneWireDevices}
                            memoWifiModules={memoWifiModules}
                            memoWirelessDevices={memoWirelessDevices}
                            memoWirelessOffsetsByLine={memoWirelessOffsetsByLine}
                            memoWirelessPlusSlotX={memoWirelessPlusSlotX}
                            memoWirelessSlotX={memoWirelessSlotX}
                            moduleCollisionNodeRefs={moduleCollisionNodeRefs}
                            moduleHeightValue={moduleHeightValue}
                            normalizePowerModuleType={normalizePowerModuleType}
                            oneWireDragDraftOffsetsRef={oneWireDragDraftOffsetsRef}
                            oneWireDragFrameRef={oneWireDragFrameRef}
                            oneWireDragNodeRefs={oneWireDragNodeRefs}
                            oneWireDragStartOffsetsRef={oneWireDragStartOffsetsRef}
                            oneWireDragStartPointerRef={oneWireDragStartPointerRef}
                            oneWireSlotOffsets={oneWireSlotOffsets}
                            patchControllerLine={patchControllerLine}
                            ports={ports}
                            rectsOverlap={rectsOverlap}
                            relayDragStartOffsetsRef={relayDragStartOffsetsRef}
                            relaySlotOffsets={relaySlotOffsets}
                            removeBusDeviceAtLine={removeBusDeviceAtLine}
                            removeController420PressureSensor={removeController420PressureSensor}
                            removeControllerDiDeviceAtSlot={removeControllerDiDeviceAtSlot}
                            removeControllerLeakSensorAtSlot={removeControllerLeakSensorAtSlot}
                            removeControllerNtcLineSensorAtSlot={removeControllerNtcLineSensorAtSlot}
                            removeControllerRelaySDevice={removeControllerRelaySDevice}
                            removeDi6ChannelDeviceAtSlot={removeDi6ChannelDeviceAtSlot}
                            removeDiModuleAtSlot={removeDiModuleAtSlot}
                            removeDiModuleRelayDeviceAtSlot={removeDiModuleRelayDeviceAtSlot}
                            removeEcosmartPump={removeEcosmartPump}
                            removeEcosmartServo={removeEcosmartServo}
                            removeEcosmartValve={removeEcosmartValve}
                            removeExtModuleAtSlot={removeExtModuleAtSlot}
                            removeExtModuleRelayDeviceAtSlot={removeExtModuleRelayDeviceAtSlot}
                            removeExtNtcSensorAtSlot={removeExtNtcSensorAtSlot}
                            removeExtOneWireDeviceAtSlot={removeExtOneWireDeviceAtSlot}
                            removeExtThermostatAtSlot={removeExtThermostatAtSlot}
                            removeIo4ChannelDeviceAtSlot={removeIo4ChannelDeviceAtSlot}
                            removeOneWireDeviceAtSlot={removeOneWireDeviceAtSlot}
                            removeOneWireNtcSensorAtSlot={removeOneWireNtcSensorAtSlot}
                            removeWifiModuleAtSlot={removeWifiModuleAtSlot}
                            removeWifiModuleRelayDeviceAtSlot={removeWifiModuleRelayDeviceAtSlot}
                            removeWifiOneWireDeviceAtSlot={removeWifiOneWireDeviceAtSlot}
                            renderedProExtRight={renderedProExtRight}
                            scheme={scheme}
                            setBusMenuPos={setBusMenuPos}
                            setBusSlotOffsets={setBusSlotOffsets}
                            setController420SlotOffset={setController420SlotOffset}
                            setControllerDiMenuPos={setControllerDiMenuPos}
                            setDi6ChannelMenuPos={setDi6ChannelMenuPos}
                            setDiMenuPos={setDiMenuPos}
                            setDiSlotOffsets={setDiSlotOffsets}
                            setExtMenuPos={setExtMenuPos}
                            setExtOneWireMenuPos={setExtOneWireMenuPos}
                            setExtOneWireOffsets={setExtOneWireOffsets}
                            setExtSlotOffsets={setExtSlotOffsets}
                            setHoveredBusLineIndex={setHoveredBusLineIndex}
                            setHoveredExtOneWireKey={setHoveredExtOneWireKey}
                            setHoveredExtSlotIndex={setHoveredExtSlotIndex}
                            setHoveredNtcSlotKey={setHoveredNtcSlotKey}
                            setHoveredOneWireSlotIndex={setHoveredOneWireSlotIndex}
                            setHoveredRelaySlotIndex={setHoveredRelaySlotIndex}
                            setHoveredWifiOneWireSlotKey={setHoveredWifiOneWireSlotKey}
                            setHoveredWifiSlotKey={setHoveredWifiSlotKey}
                            setHoveredWirelessDeviceKey={setHoveredWirelessDeviceKey}
                            setInvalidDiDragMap={setInvalidDiDragMap}
                            setInvalidExtDragMap={setInvalidExtDragMap}
                            setInvalidExtOneWireDragMap={setInvalidExtOneWireDragMap}
                            setInvalidOneWireDragMap={setInvalidOneWireDragMap}
                            setInvalidWifiDragMap={setInvalidWifiDragMap}
                            setIo4ChannelMenuPos={setIo4ChannelMenuPos}
                            setOneWireMenuPos={setOneWireMenuPos}
                            setOneWireSlotOffsets={setOneWireSlotOffsets}
                            setPowerMenuPos={setPowerMenuPos}
                            setRelayMenuPos={setRelayMenuPos}
                            setRelaySlotOffsets={setRelaySlotOffsets}
                            setRl2sRelayMenuPos={setRl2sRelayMenuPos}
                            setScheme={setScheme}
                            setSlotMenuPos={setSlotMenuPos}
                            setThermostatMenuPos={setThermostatMenuPos}
                            setWifiMenuPos={setWifiMenuPos}
                            setWifiOneWireMenuPos={setWifiOneWireMenuPos}
                            setWifiSlotOffsets={setWifiSlotOffsets}
                            setWifiOneWireSlotOffsets={setWifiOneWireSlotOffsets}
                            shouldShowDiDeviceInfoBlock={shouldShowDiDeviceInfoBlock}
                            showEmptySlots={showEmptySlots}
                            showLineFrames={showLineFrames}
                            showPorts={showPorts}
                            snapToGrid={snapToGrid}
                            useInitialOneWireBalance={useInitialOneWireBalance}
                            usesRinnaiAdapter={usesRinnaiAdapter}
                            wifiDragStartOffsetsRef={wifiDragStartOffsetsRef}
                            wifiLineEnabled={wifiLineEnabled}
                            wifiSlotOffsets={wifiSlotOffsets}
                            wifiOneWireSlotOffsets={wifiOneWireSlotOffsets}
                            wirelessImages={wirelessImages}
                            wirelessPortsByType={wirelessPortsByType}
                    />
                        </DeviceInfoBlockProvider>
                    )}
                    <InstallationCanvas enabled={installationMode}>
                            {(() => {
                                const powerTypes = new Set(['circuit-breaker', 'power-unit', 'ups']);
                                const baseInstallationModuleItems = installationItems.map((item) => ({
                                    ...item,
                                    image: wirelessImages[item.type] || null,
                                }));
                                const hasInstallationUps = baseInstallationModuleItems.some((item) => item.type === 'ups');
                                const isSmart2Installation = controllerType === 'smart2';
                                const smart2DiModules = baseInstallationModuleItems.filter((item) => DI_MODULE_TYPES.includes(item.type));
                                const smart2DiConnections = isSmart2Installation
                                    ? buildSmart2InstallationDiConnections({
                                         hasUps: hasInstallationUps,
                                         moduleLabels: smart2DiModules.map((item) => getInstallationItemLabel(item)),
                                         deviceLabels: (Array.isArray(scheme?.controller?.di_devices) ? scheme.controller.di_devices : [])
                                             .map((device, index) => (device ? getInstallationDeviceLabel(device, `DI ${index + 1}`) : null)),
                                         controllerLabel: getInstallationItemLabel({ key: 'controller', type: controllerType, data: scheme?.controller }),
                                     })
                                    : null;
                                let smart2DiModuleIndex = 0;
                                const installationModuleItems = baseInstallationModuleItems.map((item) => {
                                    if (!smart2DiConnections) return item;
                                    if (item.type === 'ups') {
                                        return { ...item, installationDiPortLabels: smart2DiConnections.upsPortLabels };
                                    }
                                    if (!DI_MODULE_TYPES.includes(item.type)) return item;
                                    const installationDiPortLabels = smart2DiConnections.modulePortLabels[smart2DiModuleIndex] || {};
                                    smart2DiModuleIndex += 1;
                                    return { ...item, installationDiPortLabels };
                                });
                                const poweredInstallationModules = installationModuleItems.filter((item) => !powerTypes.has(item.type));
                                const smart2PowerChainHead = getSmart2InstallationPowerChainHead(poweredInstallationModules);
                                const firstExtInstallationModule = installationModuleItems.find((item) => (
                                    memoExtModules[0]
                                    && (item.data === memoExtModules[0]
                                        || (item.data?.id != null && item.data.id === memoExtModules[0]?.id))
                                )) || null;
                                const powerOrder = { 'circuit-breaker': 0, 'power-unit': 1, ups: 2 };
                                const installationPowerItems = installationModuleItems
                                    .filter((item) => powerTypes.has(item.type))
                                    .sort((a, b) => (powerOrder[a.type] ?? 99) - (powerOrder[b.type] ?? 99));
                                const items = [
                                    ...installationPowerItems,
                                     controllerImage ? {
                                         key: 'controller',
                                         layoutKey: getInstallationLayoutItemKey('controller', scheme?.controller, controllerType, 0),
                                         type: controllerType,
                                        image: controllerImage,
                                        data: scheme?.controller,
                                        ...(smart2DiConnections ? { installationDiPortLabels: smart2DiConnections.controllerPortLabels } : {}),
                                        // DI-входы контроллера, занятые линиями коммутации ИБП (DI-IN-1/2 у pro,
                                        // первая пара DI-OUT у smart2).
                                        upsDiPortIndexes: hasInstallationUps ? [0, 1] : null,
                                         // EXT-цепочка контроллера: сначала EXT-модули, после них EXT-термостаты.
                                         moduleNextLabel: firstExtInstallationModule
                                             ? getInstallationItemLabel(firstExtInstallationModule)
                                             : (memoExtLineThermostatDevices[0]
                                                 ? getInstallationDeviceLabel(memoExtLineThermostatDevices[0], 'Термостат')
                                                 : null),
                                        powerPreviousLabel: isSmart2Installation && smart2PowerChainHead
                                            ? getInstallationItemLabel(smart2PowerChainHead)
                                            : (hasInstallationUps ? 'UPS' : POWER_UNIT_LABEL),
                                         // У ECOsmart 12VDC-OUT питает первый EXT-элемент. Standalone
                                         // NTC-1-wire не является частью этой силовой EXT-цепочки.
                                         powerNextLabel: !isSmart2Installation
                                             ? (controllerType === 'ecosmart'
                                                 ? (firstExtInstallationModule
                                                     ? getInstallationItemLabel(firstExtInstallationModule)
                                                     : (memoExtLineThermostatDevices[0]
                                                         ? getInstallationDeviceLabel(memoExtLineThermostatDevices[0], 'Термостат')
                                                         : (poweredInstallationModules[0] ? getInstallationItemLabel(poweredInstallationModules[0]) : null)))
                                                 : (poweredInstallationModules[0] ? getInstallationItemLabel(poweredInstallationModules[0]) : null))
                                             : null,
                                    } : null,
                                    ...poweredInstallationModules,
                                ].filter((item) => item?.image?.width && item?.image?.height);
                                if (items.length === 0) return null;

                                // Контроллеры go/go+/ecosmart не встают на DIN-рейку — их выносим
                                // отдельным блоком слева от щитка, поэтому исключаем из реечной
                                // раскладки (ширина панели, курсор рядов, коллизии).
                                const controllerRendersLeft = INSTALLATION_LEFT_CONTROLLERS.has(controllerType);
                                const isLeftControllerItem = (item) => controllerRendersLeft && item.key === 'controller';

                                const gap = 0;
                                const rowSlotHeight = moduleHeightValue;
                                const rowGap = 17 * indentSize;
                                const rowStep = rowSlotHeight + rowGap;
                                const innerPanelInset = 16;
                                const panelPaddingX = innerPanelInset;
                                const panelPaddingY = 8 * indentSize;
                                const getInstallationItemWidth = (item) => (item.isWifiPair
                                    ? 4 * dinSize
                                    : Math.max(dinSize, Math.round(item.image.width / dinSize) * dinSize));

                                // Панель — независимый холст фиксированного размера. Пока пользователь ни
                                // разу не менял размер вручную, он подгоняется под текущий набор
                                // оборудования в один ряд (чтобы сразу было куда всё поместить). После
                                // первого ручного resize заданный размер сохраняется. Если новые модули
                                // перестают помещаться, ниже добавляется только необходимый DIN-ряд:
                                // оборудование не должно выходить за щит или оказываться между рейками.
                                const defaultContentWidth = items.reduce((sum, item) => sum + (isLeftControllerItem(item) ? 0 : getInstallationItemWidth(item)), 0) + gap * Math.max(0, items.length - 1);
                                const defaultPanelWidth = defaultContentWidth + panelPaddingX * 2;
                                const defaultPanelHeight = rowSlotHeight + panelPaddingY * 2;
                                const requestedPanelWidth = installationPanelSize?.width ?? defaultPanelWidth;
                                const requestedPanelHeight = installationPanelSize?.height ?? defaultPanelHeight;
                                const widestDinItem = items.reduce((width, item) => (
                                    isLeftControllerItem(item) ? width : Math.max(width, getInstallationItemWidth(item))
                                ), dinSize);
                                const panelWidth = Math.max(requestedPanelWidth, widestDinItem + panelPaddingX * 2);
                                const innerPanelWidth = Math.max(dinSize, panelWidth - panelPaddingX * 2);
                                const requestedRowCount = Math.max(1, Math.floor((Math.max(0, requestedPanelHeight - panelPaddingY * 2) + rowGap) / rowStep));
                                const rowOccupancy = Array.from({ length: requestedRowCount }, () => []);
                                const installationPositionsByKey = {};
                                const dinItems = items.filter((item) => !isLeftControllerItem(item));
                                const getLayoutStateKey = (item) => item.layoutKey || item.key;
                                const hasManualPosition = (item) => Object.prototype.hasOwnProperty.call(installationItemOffsets, getLayoutStateKey(item));
                                const ensureRow = (row) => {
                                    while (rowOccupancy.length <= row) rowOccupancy.push([]);
                                };
                                const reservePosition = (item, row, localX) => {
                                    const width = getInstallationItemWidth(item);
                                    ensureRow(row);
                                    installationPositionsByKey[item.key] = { row, x: localX };
                                    rowOccupancy[row].push({ left: localX, right: localX + width });
                                };
                                const findFreePosition = (item) => {
                                    const width = getInstallationItemWidth(item);
                                    const maxX = Math.max(0, innerPanelWidth - width);
                                    for (let row = 0; row < rowOccupancy.length; row += 1) {
                                        for (let localX = 0; localX <= maxX; localX += dinSize) {
                                            const overlaps = rowOccupancy[row].some((box) => localX < box.right && localX + width > box.left);
                                            if (!overlaps) return { row, x: localX };
                                        }
                                    }
                                    return { row: rowOccupancy.length, x: 0 };
                                };

                                // Ручные позиции закреплены относительно внутренней области щита, поэтому
                                // добавление модулей перед ними больше не сдвигает их вдоль DIN-рейки.
                                dinItems.filter(hasManualPosition).forEach((item) => {
                                    const position = installationItemOffsets[getLayoutStateKey(item)] || { x: 0, y: 0 };
                                    const width = getInstallationItemWidth(item);
                                    const row = Math.max(0, Math.round((position.y || 0) / rowStep));
                                    const localX = Math.max(0, Math.min(innerPanelWidth - width, Math.round((position.x || 0) / dinSize) * dinSize));
                                    reservePosition(item, row, localX);
                                });
                                dinItems.filter((item) => !hasManualPosition(item)).forEach((item) => {
                                    const position = findFreePosition(item);
                                    reservePosition(item, position.row, position.x);
                                });

                                const rowCount = Math.max(1, rowOccupancy.length);
                                const requiredPanelHeight = panelPaddingY * 2 + rowCount * rowSlotHeight + (rowCount - 1) * rowGap;
                                const panelHeight = Math.max(requestedPanelHeight, requiredPanelHeight);
                                const panelX = Math.round(Math.max(2 * indentSize - panelPaddingX, canvasSize.width / 2 - panelWidth / 2) / indentSize) * indentSize;
                                const panelY = Math.round(Math.max(2 * indentSize - panelPaddingY, canvasSize.height / 2 - panelHeight / 2) / indentSize) * indentSize;
                                const startX = panelX + panelPaddingX;
                                const startY = panelY + panelPaddingY;
                                // Позиция вынесенного слева контроллера: вплотную слева от щитка,
                                // выровнен по вертикальному центру панели.
                                const leftControllerItem = controllerRendersLeft ? items.find(isLeftControllerItem) : null;
                                const leftControllerWidth = leftControllerItem ? getInstallationItemWidth(leftControllerItem) : 0;
                                // Щиток нужен только под оборудование на DIN-рейке. Если на рейке
                                // ничего нет (например, только вынесенный слева контроллер go/go+/ecosmart),
                                // пустую панель не рисуем, а контроллер центрируем на холсте.
                                const showPanel = items.some((item) => !isLeftControllerItem(item));
                                const leftControllerBaseX = showPanel
                                    ? panelX - 4 * indentSize - leftControllerWidth
                                    : Math.round((canvasSize.width / 2 - leftControllerWidth / 2) / indentSize) * indentSize;
                                const leftControllerBaseY = leftControllerItem
                                    ? (showPanel
                                        ? panelY + panelHeight / 2 - leftControllerItem.image.height / 2
                                        : canvasSize.height / 2 - leftControllerItem.image.height / 2)
                                    : 0;
                                const railHeight = 24;
                                const railY = startY + rowSlotHeight * 0.45 - railHeight / 2;
                                const railX = panelX + innerPanelInset;
                                const railWidth = panelWidth - innerPanelInset * 2;
                                const resizeHandleSize = 18;
                                const lockButtonSize = 22;

                                // Минимальный размер щита задаётся по занятым DIN-позициям: ширина не
                                // режет модули справа, высота не убирает ряды, на которых есть модули.
                                let minPanelWidth = dinSize * 2;
                                let occupiedRowCount = 1;
                                const itemBoxesByKey = {};
                                dinItems.forEach((item) => {
                                    const position = installationPositionsByKey[item.key];
                                    const itemWidth = getInstallationItemWidth(item);
                                    const left = startX + position.x;
                                    const right = left + itemWidth;
                                    occupiedRowCount = Math.max(occupiedRowCount, position.row + 1);
                                    itemBoxesByKey[item.key] = { row: position.row, left, right };
                                    minPanelWidth = Math.max(minPanelWidth, position.x + itemWidth + panelPaddingX * 2);
                                });
                                const minInnerWidth = Math.max(0, minPanelWidth - panelPaddingX * 2);

                                const resolveInstallationRowX = (itemKey, itemWidth, row, candidateAbsX, minAbsX, maxAbsX) => {
                                    const maxGridIndex = Math.max(0, Math.floor((maxAbsX - minAbsX) / dinSize));
                                    const candidateGridIndex = Math.max(0, Math.min(maxGridIndex, Math.round((candidateAbsX - minAbsX) / dinSize)));
                                    const neighbors = Object.entries(itemBoxesByKey)
                                        .filter(([key, box]) => key !== itemKey && box.row === row)
                                        .map(([, box]) => box)
                                        .sort((a, b) => a.left - b.left);
                                    const slots = [];
                                    let cursor = minAbsX;

                                    neighbors.forEach((box) => {
                                        if (box.left - cursor >= itemWidth) slots.push({ start: cursor, end: box.left - itemWidth });
                                        cursor = Math.max(cursor, box.right);
                                    });
                                    if (maxAbsX - cursor >= 0) slots.push({ start: cursor, end: maxAbsX });

                                    let best = null;
                                    slots.forEach((slot) => {
                                        const slotStartGridIndex = Math.max(0, Math.ceil((slot.start - minAbsX) / dinSize));
                                        const slotEndGridIndex = Math.min(maxGridIndex, Math.floor((slot.end - minAbsX) / dinSize));
                                        if (slotEndGridIndex < slotStartGridIndex) return;
                                        const gridIndex = Math.max(slotStartGridIndex, Math.min(slotEndGridIndex, candidateGridIndex));
                                        const distance = Math.abs(gridIndex - candidateGridIndex);
                                        if (!best || distance < best.distance) best = { gridIndex, distance };
                                    });

                                    return best ? minAbsX + best.gridIndex * dinSize : null;
                                };

                                const getInstallationPorts = (item) => {
                                    const sourcePorts = item.key === 'controller' ? ports : (wirelessPortsByType[item.type] || []);
                                    const filtered = sourcePorts.filter((port) => {
                                        const name = String(port?.name || '').toUpperCase();
                                        if (!name) return false;
                                        return !name.includes('ANCHOR')
                                            && !name.includes('INDICATOR')
                                            && !name.includes('AERIAL')
                                            && !name.includes('SEARCH')
                                            && !name.includes('LOGO')
                                            && !name.includes('QR');
                                    });
                                    // Семантический тег — часть идентичности порта: «RELAY-1-A» (реле котла)
                                    // и «RELAY-1-A BOILER-GVS» (насос ГВС) у ecosmart — разные физические
                                    // пины. Схлопываем только точные дубликаты полного имени.
                                    const byName = new Map();
                                    filtered.forEach((port) => {
                                        const normalizedName = String(port?.name || '').toUpperCase().trim();
                                        if (!byName.has(normalizedName)) byName.set(normalizedName, port);
                                    });
                                    return Array.from(byName.values());
                                };
                                const getInstallationAllPorts = (item) => (item.key === 'controller' ? ports : (wirelessPortsByType[item.type] || []));
                                const getInstallationIndicatorActive = (item, port) => {
                                    const name = String(port?.name || '').toUpperCase();
                                    const data = item?.data && typeof item.data === 'object' ? item.data : {};
                                    if (name === 'POWER-INDICATOR' || name === 'NETWORK-INDICATOR' || name === 'WI-FI-INDICATOR') return true;
                                    if (name === 'BOILER-RELAY-INDICATOR') return Array.isArray(data.relay_devices) && Boolean(data.relay_devices[0]);
                                    if (name === 'VALVE-INDICATOR') return Array.isArray(data.relay_s_valve_devices) && Boolean(data.relay_s_valve_devices[0]);
                                    if (name === 'BOILER-GVS-INDICATOR') return Array.isArray(data.relay_boiler_gvs_devices) && Boolean(data.relay_boiler_gvs_devices[0]);
                                    if (name === 'MIXING-INDICATOR-1' || name === 'MIXING-INDICATOR-2') return Array.isArray(data['220_servo_devices']) && Boolean(data['220_servo_devices'][0]);
                                    if (name === 'MIXING-INDICATOR-3' || name === 'MIXING-INDICATOR-4') return Array.isArray(data['220_servo_devices']) && Boolean(data['220_servo_devices'][1]);
                                    if (name === 'MIXING-PUMP-INDICATOR') return Array.isArray(data.relay_220pump5_devices) && Boolean(data.relay_220pump5_devices[0]);
                                    if (name === 'MIXING-PUMP-INDICATOR-2') return Array.isArray(data.relay_220pump3_devices) && Boolean(data.relay_220pump3_devices[0]);
                                    if (name === 'CIRCUIT-PUMP-INDICATOR') return Array.isArray(data.relay_220pump_devices) && Boolean(data.relay_220pump_devices[0]);
                                    if (name === 'BUS-INDICATOR') return Array.isArray(data.bus_devices) && data.bus_devices.some(Boolean);
                                    if (name === 'ALERT-INDICATOR') return false;

                                    let match = /^RELAY-INDICATOR-(\d+)$/.exec(name);
                                    if (match) {
                                        const relayDevices = Array.isArray(data.relay_devices) ? data.relay_devices : [];
                                        const occupancy = buildRelaySlotOccupancyPreserveIndexes(
                                            relayDevices,
                                            6,
                                            (device) => (String(device?.connection_type || '').toLowerCase() === 'double_relay' ? 2 : 1),
                                        );
                                        return Boolean(occupancy[Number(match[1]) - 1]);
                                    }

                                    match = /^RELAY-S-INDICATOR-(\d+)$/.exec(name);
                                    if (match) {
                                        const relaySDevices = Array.isArray(data.relay_s_devices) ? data.relay_s_devices : [];
                                        const occupancy = buildRelaySlotOccupancyPreserveIndexes(
                                            relaySDevices,
                                            6,
                                            (device) => (String(device?.connection_type || '').toLowerCase() === 'double_relay' ? 2 : 1),
                                        );
                                        return Boolean(occupancy[Number(match[1]) - 1]);
                                    }

                                    return false;
                                };

                                return (
                                    <>
                                        {showPanel && (<>
                                        <Rect
                                            x={panelX}
                                            y={panelY}
                                            width={panelWidth}
                                            height={panelHeight}
                                            cornerRadius={12}
                                            fillLinearGradientStartPoint={{ x: 0, y: panelY }}
                                            fillLinearGradientEndPoint={{ x: 0, y: panelY + panelHeight }}
                                            fillLinearGradientColorStops={[0, '#fbfcfd', 0.5, '#f2f4f7', 1, '#e6e9ee']}
                                            stroke="#c3c9d1"
                                            strokeWidth={1}
                                            shadowColor="rgba(15, 23, 42, 0.32)"
                                            shadowBlur={18}
                                            shadowOffsetY={10}
                                            shadowForStrokeEnabled={false}
                                            perfectDrawEnabled={false}
                                            listening={false}
                                        />
                                        {[
                                            { x: panelX + 14, y: panelY + 14 },
                                            { x: panelX + panelWidth - 14, y: panelY + 14 },
                                            { x: panelX + 14, y: panelY + panelHeight - 14 },
                                            { x: panelX + panelWidth - 14, y: panelY + panelHeight - 14 },
                                        ].map((corner, cornerIndex) => (
                                            <KonvaCircle
                                                key={`installation-panel-screw-${cornerIndex}`}
                                                x={corner.x}
                                                y={corner.y}
                                                radius={4}
                                                fillRadialGradientStartPoint={{ x: -1.5, y: -1.5 }}
                                                fillRadialGradientStartRadius={0}
                                                fillRadialGradientEndPoint={{ x: 0, y: 0 }}
                                                fillRadialGradientEndRadius={4}
                                                fillRadialGradientColorStops={[0, '#ffffff', 0.5, '#c7ccd3', 1, '#8b929c']}
                                                stroke="#767d87"
                                                strokeWidth={0.5}
                                                perfectDrawEnabled={false}
                                                listening={false}
                                            />
                                        ))}
                                        <Rect
                                            x={panelX + innerPanelInset}
                                            y={panelY + innerPanelInset}
                                            width={panelWidth - innerPanelInset * 2}
                                            height={panelHeight - innerPanelInset * 2}
                                            cornerRadius={6}
                                            fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                                            fillLinearGradientEndPoint={{ x: 0, y: panelHeight - 32 }}
                                            fillLinearGradientColorStops={[0, '#e9edf2', 0.06, '#ffffff', 0.2, '#ffffff', 1, '#eef2f6']}
                                            stroke="#a9b0ba"
                                            strokeWidth={1}
                                            perfectDrawEnabled={false}
                                            listening={false}
                                        />
                                        {Array.from({ length: rowCount }, (_, rowIndex) => {
                                            const currentRailY = railY + rowIndex * rowStep;
                                            return (
                                                <React.Fragment key={`installation-rail-row-${rowIndex}`}>
                                                    <Rect
                                                        x={railX}
                                                        y={currentRailY}
                                                        width={railWidth}
                                                        height={railHeight}
                                                        cornerRadius={2}
                                                        fillLinearGradientStartPoint={{ x: 0, y: currentRailY }}
                                                        fillLinearGradientEndPoint={{ x: 0, y: currentRailY + railHeight }}
                                                        fillLinearGradientColorStops={[0, '#b7bcc3', 0.12, '#e9ecef', 0.5, '#fbfcfd', 0.88, '#e2e5e9', 1, '#a9afb7']}
                                                        stroke="#9198a1"
                                                        strokeWidth={0.8}
                                                        perfectDrawEnabled={false}
                                                        listening={false}
                                                    />
                                                    {Array.from({ length: Math.max(0, Math.floor(railWidth / 42)) }, (_, index) => (
                                                        <Rect
                                                            key={`installation-rail-slot-${rowIndex}-${index}`}
                                                            x={railX + 26 + index * 42}
                                                            y={currentRailY + railHeight / 2 - 3}
                                                            width={18}
                                                            height={6}
                                                            cornerRadius={3}
                                                            fill="#ffffff"
                                                            opacity={0.9}
                                                            listening={false}
                                                        />
                                                    ))}
                                                </React.Fragment>
                                            );
                                        })}
                                        </>)}
                                        {items.map((item, itemIndex) => {
                                            const previousItem = items[itemIndex - 1] || null;
                                            const nextItem = items[itemIndex + 1] || null;
                                            const previousInstallationLabel = item.oneWirePreviousLabel || item.modulePreviousLabel || getInstallationItemLabel(previousItem);
                                             const nextInstallationLabel = item.oneWireNextLabel || item.moduleNextLabel || getInstallationItemLabel(nextItem);
                                             const itemWidth = getInstallationItemWidth(item);
                                             const itemImageX = item.isWifiPair ? dinSize : 0;
                                             const itemImageWidth = item.isWifiPair ? 3 * dinSize : itemWidth;
                                             const isLeftController = isLeftControllerItem(item);
                                             const rackPosition = installationPositionsByKey[item.key] || { row: 0, x: 0 };
                                             const rackBaseY = startY + (rowSlotHeight - item.image.height) / 2;
                                             const baseX = isLeftController ? leftControllerBaseX : startX + rackPosition.x;
                                             const baseY = isLeftController
                                                 ? leftControllerBaseY
                                                 : rackBaseY + rackPosition.row * rowStep;
                                             const x = baseX;
                                             const y = baseY;
                                            return (
                                                <Group
                                                    key={`installation-${item.key}`}
                                                    name="installation-din-item"
                                                    x={x}
                                                    y={y}
                                                    draggable={!isLeftController && !installationItemsLocked}
                                                    onDragEnd={(event) => {
                                                        if (installationItemsLocked) return;
                                                        const node = event.target;
                                                        const minAbsX = panelX + panelPaddingX;
                                                        const maxAbsX = panelX + panelWidth - panelPaddingX - itemWidth;
                                                         const currentRow = Math.max(0, Math.min(rowCount - 1, Math.round((node.y() - rackBaseY) / rowStep)));
                                                         const snappedAbsX = resolveInstallationRowX(item.key, itemWidth, currentRow, node.x(), minAbsX, maxAbsX);
                                                        if (snappedAbsX == null) {
                                                            node.position({ x, y });
                                                            node.getLayer()?.batchDraw();
                                                            return;
                                                        }
                                                         const snappedX = snappedAbsX - startX;
                                                         const snappedY = currentRow * rowStep;
                                                         setInstallationItemOffsets((prev) => ({
                                                             ...prev,
                                                             [getLayoutStateKey(item)]: { x: snappedX, y: snappedY },
                                                         }));
                                                         node.position({ x: snappedAbsX, y: rackBaseY + snappedY });
                                                        node.getLayer()?.batchDraw();
                                                    }}
                                                >
                                                     <Image
                                                        name={item.key === 'controller' ? 'morph:controller' : `morph:${getMorphImageKey(item.data)}`}
                                                        image={item.image}
                                                         x={itemImageX}
                                                         width={itemImageWidth}
                                                        height={item.image.height}
                                                        {...(isLeftController && !['go', 'go+'].includes(controllerType) ? {
                                                            shadowColor: 'rgba(15, 23, 42, 0.32)',
                                                            shadowBlur: 18,
                                                            shadowOffsetY: 10,
                                                            perfectDrawEnabled: false,
                                                        } : {})}
                                                      />
                                                     {item.key === 'controller' && controllerType === 'ecosmart' && (() => {
                                                         const ecosmartBl2Module = Array.isArray(item?.data?.ecosmart_bl2)
                                                             ? item.data.ecosmart_bl2[0]
                                                             : null;
                                                         const ecosmartBl2Image = wirelessImages.ecosmartbl2 || null;
                                                         const ecosmartBl2Ports = wirelessPortsByType.ecosmartbl2 || [];
                                                         if (!ecosmartBl2Module || !ecosmartBl2Image?.width || !ecosmartBl2Image?.height) return null;
                                                         const geometry = getEcosmartBl2OverlayGeometry({
                                                             controllerWidth: itemImageWidth,
                                                             controllerHeight: item.image.height,
                                                             controllerPorts: getInstallationAllPorts(item),
                                                             modulePorts: ecosmartBl2Ports,
                                                         });
                                                         if (!geometry) return null;
                                                         return (
                                                             <Image
                                                                 name={`morph:${getMorphImageKey(ecosmartBl2Module)}`}
                                                                 image={ecosmartBl2Image}
                                                                 x={itemImageX + geometry.x}
                                                                 y={geometry.y}
                                                                 width={geometry.width}
                                                                 height={geometry.height}
                                                                 shadowColor="blue"
                                                                 shadowBlur={5}
                                                                 listening={false}
                                                             />
                                                         );
                                                     })()}
                                                      {item.isWifiPair && wirelessImages['power-unit'] && (
                                                         <>
                                                             <Image image={wirelessImages['power-unit']} width={dinSize} height={item.image.height} listening={false} />
                                                             <Text x={0} y={-12} width={itemWidth} text={`${getInstallationItemLabel(item)} + ${POWER_UNIT_LABEL}`} fontSize={6} fill="#4a5568" align="center" listening={false} />
                                                         </>
                                                     )}
                                                    {goAerialImage && item.key === 'controller' && ['go', 'go+'].includes(controllerType) && (() => {
                                                        const aerialWidth = goAerialImage.width || AERIAL_WIDTH;
                                                        const aerialHeight = goAerialImage.height || AERIAL_HEIGHT;
                                                        return (
                                                            <Image
                                                                image={goAerialImage}
                                                                x={itemWidth - 5 * indentSize - aerialWidth}
                                                                y={-aerialHeight}
                                                                width={aerialWidth}
                                                                height={aerialHeight}
                                                                listening={false}
                                                            />
                                                        );
                                                    })()}
                                                    {aerialImage && (item.key === 'controller' ? ['smart2', 'pro'].includes(controllerType) : canonicalDeviceType(item.type) === 'rdt2') && (() => {
                                                        const aerialPorts = getPortsByClassToken(getInstallationAllPorts(item), 'AERIAL');
                                                        if (!aerialPorts?.length) return null;
                                                        const aerialWidth = aerialImage.width || AERIAL_WIDTH;
                                                        const aerialHeight = aerialImage.height || AERIAL_HEIGHT;
                                                        return aerialPorts.map((aerialPort, aerialIndex) => {
                                                            const portX = aerialPort.x * itemWidth;
                                                            const portCenterY = aerialPort.y * item.image.height;
                                                            const portHeight = (aerialPort.height || 0) * item.image.height;
                                                            const portTopY = portCenterY - portHeight / 2;
                                                            return (
                                                                <Image
                                                                    key={`installation-aerial-${item.key}-${aerialIndex}`}
                                                                    image={aerialImage}
                                                                    x={portX - aerialWidth / 2}
                                                                    y={portTopY - aerialHeight}
                                                                    width={aerialWidth}
                                                                    height={aerialHeight}
                                                                    listening={false}
                                                                />
                                                            );
                                                        });
                                                    })()}
                                                    {getInstallationAllPorts(item)
                                                        .filter((port) => String(port?.name || '').toUpperCase().includes('INDICATOR'))
                                                        .map((indicatorPort, indicatorIndex) => {
                                                            const active = getInstallationIndicatorActive(item, indicatorPort);
                                                            return (
                                                                <DeviceIndicator
                                                                    key={`installation-indicator-${item.key}-${indicatorPort.name}-${indicatorIndex}`}
                                                                    port={indicatorPort}
                                                                    imageWidth={itemImageWidth}
                                                                    imageHeight={item.image.height}
                                                                    offsetX={itemImageX}
                                                                    active={active}
                                                                    perfectDrawEnabled={false}
                                                                />
                                                            );
                                                        })}
                                                    {getInstallationPorts(item)
                                                        .filter((port) => isInstallationPortOccupied(item, port))
                                                        .filter((port) => {
                                                            // Исходящие порты цепочки (справа): EXT-OUT ведёт к следующему
                                                            // модулю расширения, «1-WIRE … OUT» — к следующему устройству
                                                            // на шине 1-wire. Если следующего в цепочке нет, не рисуем ни
                                                            // изогнутый хвост, ни лычку на этих портах.
                                                            const portName = String(port?.name || '').toUpperCase();
                                                            if (portName.includes('EXT-OUT')) {
                                                                // У ecosmart EXT-OUT также питает EXT-термостаты контроллера.
                                                                const extDevices = Array.isArray(item?.data?.ext_devices) ? item.data.ext_devices : [];
                                                                return Boolean(item.moduleNextLabel) || extDevices.some(Boolean);
                                                            }
                                                            if (portName.includes('VDC-OUT')) {
                                                                return Boolean(item.powerNextLabel) || Boolean(getControllerExtFloorThermostat(item));
                                                            }
                                                            if (portName.includes('1-WIRE') && portName.includes('OUT')) return Boolean(item.oneWireNextLabel);
                                                            return true;
                                                        })
                                                        .map((port, portIndex) => {
                                                            const isTopPort = port.y < 0.5;
                                                             const portX = itemImageX + port.x * itemImageWidth;
                                                            const portY = port.y * item.image.height;
                                                            const edgeY = isTopPort ? 0 : item.image.height;
                                                            const bendY = isTopPort ? -indentSize * 0.5 : item.image.height + indentSize * 0.5;
                                                            const midY = isTopPort ? bendY + indentSize * 0.2 : bendY - indentSize * 0.2;
                                                            const labelText = getInstallationMarkerText(getInstallationPortConnectionLabel(item, port, {
                                                                previousLabel: previousInstallationLabel,
                                                                nextLabel: nextInstallationLabel,
                                                                powerPreviousLabel: item.powerPreviousLabel,
                                                                powerNextLabel: item.powerNextLabel,
                                                                upsDiTargetLabel: item.upsDiTargetLabel,
                                                            }));
                                                            const labelFontSize = 3;
                                                            const labelWidth = labelText ? 8 : 0;
                                                            const labelHeight = labelText
                                                                ? Math.min(8 * indentSize, Math.max(16, labelText.length * 1.9 + 4))
                                                                : 0;
                                                            const labelX = portX - labelWidth / 2 + 2;
                                                            const labelY = isTopPort ? bendY - labelHeight - 2 : bendY + 2;
                                                            return (
                                                                <React.Fragment key={`installation-port-tail-${item.key}-${port.name}-${portIndex}`}>
                                                                    <Line
                                                                        points={[portX, portY, portX, midY, portX + indentSize * 0.25, bendY, portX + indentSize * 0.5, edgeY]}
                                                                        stroke={getInstallationPortLineColor(port.name, item)}
                                                                        strokeWidth={1.25}
                                                                        tension={0.65}
                                                                         lineCap="round"
                                                                         lineJoin="round"
                                                                         opacity={0.95}
                                                                         perfectDrawEnabled={false}
                                                                         listening={false}
                                                                    />
                                                                    {labelText && (
                                                                        <>
                                                                            <Rect
                                                                                x={labelX}
                                                                                y={labelY}
                                                                                width={labelWidth}
                                                                                height={labelHeight}
                                                                                cornerRadius={2}
                                                                                fill="#fff7d6"
                                                                                stroke="#d6a900"
                                                                                strokeWidth={0.5}
                                                                                opacity={0.96}
                                                                                perfectDrawEnabled={false}
                                                                                listening={false}
                                                                            />
                                                                            <Text
                                                                                x={labelX + 1}
                                                                                 y={labelY + labelHeight - 1}
                                                                                 width={labelHeight - 2}
                                                                                 height={labelWidth - 2}
                                                                                 text={labelText}
                                                                                 fontSize={labelFontSize}
                                                                                 fill="#5f4700"
                                                                                 rotation={-90}
                                                                                 align="center"
                                                                                 verticalAlign="middle"
                                                                                 perfectDrawEnabled={false}
                                                                                 listening={false}
                                                                             />
                                                                        </>
                                                                    )}
                                                                    <KonvaCircle
                                                                        x={portX}
                                                                        y={portY}
                                                                        radius={2.2}
                                                                         fill={getInstallationPortLineColor(port.name, item)}
                                                                         opacity={0.95}
                                                                         perfectDrawEnabled={false}
                                                                         listening={false}
                                                                    />
                                                                </React.Fragment>
                                                            );
                                                        })}
                                                </Group>
                                            );
                                        })}
                                        {showPanel && (<>
                                        {(() => {
                                            const buttonX = panelX + panelWidth - lockButtonSize / 2;
                                            const buttonY = panelY - lockButtonSize / 2;
                                            const centerX = buttonX + lockButtonSize / 2;
                                            const bodyY = buttonY + 10;
                                            const toggleLock = (event) => {
                                                event.cancelBubble = true;
                                                setInstallationItemsLocked((locked) => !locked);
                                            };
                                            return (
                                                <Group>
                                                    <Rect
                                                        name="installation-panel-lock"
                                                        x={buttonX}
                                                        y={buttonY}
                                                        width={lockButtonSize}
                                                        height={lockButtonSize}
                                                        cornerRadius={6}
                                                        fill={installationItemsLocked ? '#c85e18' : '#2563eb'}
                                                        stroke={installationItemsLocked ? '#9a4312' : '#1d4ed8'}
                                                        strokeWidth={1}
                                                        shadowColor="rgba(15, 23, 42, 0.32)"
                                                        shadowBlur={4}
                                                        shadowOffsetY={2}
                                                        shadowForStrokeEnabled={false}
                                                        onClick={toggleLock}
                                                        onTap={toggleLock}
                                                        onMouseEnter={(event) => {
                                                            const stage = event.target.getStage();
                                                            if (stage) stage.container().style.cursor = 'pointer';
                                                        }}
                                                        onMouseLeave={(event) => {
                                                            const stage = event.target.getStage();
                                                            if (stage) stage.container().style.cursor = 'default';
                                                        }}
                                                    />
                                                    <Line
                                                        points={installationItemsLocked
                                                            ? [centerX - 4, bodyY, centerX - 4, bodyY - 3, centerX - 2, bodyY - 6, centerX + 2, bodyY - 6, centerX + 4, bodyY - 3, centerX + 4, bodyY]
                                                            : [centerX - 4, bodyY, centerX - 4, bodyY - 3, centerX - 2, bodyY - 6, centerX + 2, bodyY - 6, centerX + 4, bodyY - 3]}
                                                        stroke="#fff"
                                                        strokeWidth={1.5}
                                                        lineCap="round"
                                                        lineJoin="round"
                                                        listening={false}
                                                    />
                                                    <Rect
                                                        x={centerX - 6}
                                                        y={bodyY}
                                                        width={12}
                                                        height={8}
                                                        cornerRadius={2}
                                                        fill="#fff"
                                                        listening={false}
                                                    />
                                                    <KonvaCircle
                                                        x={centerX}
                                                        y={bodyY + 3}
                                                        radius={1.2}
                                                        fill={installationItemsLocked ? '#c85e18' : '#2563eb'}
                                                        listening={false}
                                                    />
                                                </Group>
                                            );
                                        })()}
                                        <Rect
                                            name="installation-panel-resize"
                                            x={panelX + panelWidth - resizeHandleSize / 2}
                                            y={panelY + panelHeight - resizeHandleSize / 2}
                                            width={resizeHandleSize}
                                            height={resizeHandleSize}
                                            cornerRadius={5}
                                            fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                                            fillLinearGradientEndPoint={{ x: resizeHandleSize, y: resizeHandleSize }}
                                            fillLinearGradientColorStops={installationItemsLocked
                                                ? [0, '#d1d5db', 1, '#9ca3af']
                                                : [0, '#f7943e', 1, '#c85e18']}
                                            stroke={installationItemsLocked ? '#7b8494' : '#a4491a'}
                                            strokeWidth={1}
                                            shadowColor="rgba(15, 23, 42, 0.32)"
                                            shadowBlur={installationItemsLocked ? 0 : 4}
                                            shadowOffsetY={2}
                                            shadowForStrokeEnabled={false}
                                            perfectDrawEnabled={false}
                                            draggable={!installationItemsLocked}
                                            onMouseEnter={(event) => {
                                                const stage = event.target.getStage();
                                                if (stage) stage.container().style.cursor = installationItemsLocked ? 'not-allowed' : 'nwse-resize';
                                            }}
                                            onMouseLeave={(event) => {
                                                const stage = event.target.getStage();
                                                if (stage) stage.container().style.cursor = 'default';
                                            }}
                                            onDragMove={(event) => {
                                                if (installationItemsLocked) return;
                                                const node = event.target;
                                                // Ширина/высота теперь абсолютный размер панели (от её левого верхнего
                                                // угла до хендла), а не добавка к автоматически считаемому размеру —
                                                // так пользователь двигает саму панель, а не "довесок" к ней. Ниже
                                                // границы не уйти — уменьшать дальше, чем позволяют уже размещённые
                                                // устройства, нельзя, иначе они окажутся обрезаны панелью.
                                                const extraWidth = Math.max(0, node.x() + resizeHandleSize / 2 - panelX - panelPaddingX * 2 - minInnerWidth);
                                                const nextInnerWidth = minInnerWidth + Math.round(extraWidth / dinSize) * dinSize;
                                                const nextWidth = Math.max(minPanelWidth, panelPaddingX * 2 + Math.max(dinSize, nextInnerWidth));
                                                const nextRows = Math.max(1, Math.round((Math.max(0, node.y() + resizeHandleSize / 2 - panelY - panelPaddingY * 2) + rowGap) / rowStep));
                                                const minRows = occupiedRowCount;
                                                const nextHeight = panelPaddingY * 2 + Math.max(nextRows, minRows) * rowSlotHeight + (Math.max(nextRows, minRows) - 1) * rowGap;
                                                setInstallationPanelSize({ width: nextWidth, height: nextHeight });
                                                node.position({
                                                    x: panelX + nextWidth - resizeHandleSize / 2,
                                                    y: panelY + nextHeight - resizeHandleSize / 2,
                                                });
                                            }}
                                        />
                                        {[0, 1, 2].map((lineIndex) => {
                                            const inset = 4 + lineIndex * 3.4;
                                            const hx = panelX + panelWidth - resizeHandleSize / 2;
                                            const hy = panelY + panelHeight - resizeHandleSize / 2;
                                            return (
                                                <Line
                                                     key={`installation-resize-grip-${lineIndex}`}
                                                     points={[hx + inset, hy + resizeHandleSize - 2, hx + resizeHandleSize - 2, hy + inset]}
                                                     stroke={installationItemsLocked ? 'rgba(75, 85, 99, 0.55)' : 'rgba(255, 255, 255, 0.75)'}
                                                    strokeWidth={1}
                                                    listening={false}
                                                />
                                            );
                                        })}
                                        </>)}
                                    </>
                                );
                            })()}
                    </InstallationCanvas>
                    {morphImages.length > 0 && (
                        <Layer listening={false}>
                            {morphImages.map((item) => (
                                <Image
                                    key={`morph-ghost-${item.name}`}
                                    ref={(node) => {
                                        if (node) morphImageRefs.current.set(item.name, node);
                                        else morphImageRefs.current.delete(item.name);
                                    }}
                                    image={item.image}
                                    x={item.x}
                                    y={item.y}
                                    width={item.width}
                                    height={item.height}
                                    listening={false}
                                />
                            ))}
                        </Layer>
                    )}
                </Stage>
            </section>
            <SlotContextMenus
                scheme={scheme}
                setScheme={setScheme}
                slotMenuPos={slotMenuPos} setSlotMenuPos={setSlotMenuPos}
                thermostatMenuPos={thermostatMenuPos} setThermostatMenuPos={setThermostatMenuPos}
                oneWireMenuPos={oneWireMenuPos} setOneWireMenuPos={setOneWireMenuPos}
                powerMenuPos={powerMenuPos} setPowerMenuPos={setPowerMenuPos}
                relayMenuPos={relayMenuPos} setRelayMenuPos={setRelayMenuPos}
                rl2sRelayMenuPos={rl2sRelayMenuPos} setRl2sRelayMenuPos={setRl2sRelayMenuPos}
                extMenuPos={extMenuPos} setExtMenuPos={setExtMenuPos}
                diMenuPos={diMenuPos} setDiMenuPos={setDiMenuPos}
                busMenuPos={busMenuPos} setBusMenuPos={setBusMenuPos}
                extOneWireMenuPos={extOneWireMenuPos} setExtOneWireMenuPos={setExtOneWireMenuPos}
                io4ChannelMenuPos={io4ChannelMenuPos} setIo4ChannelMenuPos={setIo4ChannelMenuPos}
                di6ChannelMenuPos={di6ChannelMenuPos} setDi6ChannelMenuPos={setDi6ChannelMenuPos}
                controllerDiMenuPos={controllerDiMenuPos} setControllerDiMenuPos={setControllerDiMenuPos}
                addOneWireDeviceAtSlot={addOneWireDeviceAtSlot}
                normalizePowerModuleType={normalizePowerModuleType}
                getControllerType={getControllerType} getSmart2DiPortUsage={getSmart2DiPortUsage}
                addRelayDeviceFromMenu={addRelayDeviceFromMenu}
                canAddDoubleRelayToControllerRelay={canAddDoubleRelayToControllerRelay}
                canAddDoubleRelayToExtModule={canAddDoubleRelayToExtModule}
                canAddDoubleRelayToDiModule={canAddDoubleRelayToDiModule}
                getControllerLineDevices={getControllerLineDevices}
                getRelaySPreferredDevices={getRelaySPreferredDevices}
                addRl2sRelayDeviceFromMenu={addRl2sRelayDeviceFromMenu}
                wifiLineMenus={(
                    <WifiLineMenus
                        enabled={wifiLineEnabled}
                        wifiMenuPos={wifiMenuPos}
                        setWifiMenuPos={setWifiMenuPos}
                        addWifiModuleAtSlot={addWifiModuleAtSlot}
                        wifiOneWireMenuPos={wifiOneWireMenuPos}
                        setWifiOneWireMenuPos={setWifiOneWireMenuPos}
                        addWifiOneWireDeviceAtSlot={addWifiOneWireDeviceAtSlot}
                    />
                )}
                isExtModuleAllowedForController={isExtModuleAllowedForController}
                controllerType={controllerType}
                addExtModuleAtSlot={addExtModuleAtSlot} addDiModuleAtSlot={addDiModuleAtSlot}
                setBusDeviceAtLine={setBusDeviceAtLine}
                addExtOneWireDeviceAtSlot={addExtOneWireDeviceAtSlot}
                addIo4ChannelDevice={addIo4ChannelDevice} addDi6ChannelDevice={addDi6ChannelDevice}
                addControllerDiDeviceFromMenu={addControllerDiDeviceFromMenu}
            />
        </main>
    );
};

createRoot(document.getElementById('app')).render(<App />);
