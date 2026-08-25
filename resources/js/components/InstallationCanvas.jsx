import React from 'react';
import { Layer, Rect } from 'react-konva';
import { CANVAS_GRID_MAX, CANVAS_GRID_MIN, din, indent, module_height } from '../constants';
import { canonicalDeviceType } from '../scheme/domain/deviceTypes';

const INSTALLATION_LAYOUT_VERSION = 1;
const INSTALLATION_PANEL_PADDING_X = 16;

const getInstallationLayoutMetrics = () => {
    const indentSize = parseInt(indent, 10) || 8;
    const dinSize = parseInt(din, 10) || 40;
    const rowSlotHeight = parseInt(module_height, 10) || 200;
    const panelPaddingY = 12 * indentSize;
    const rowGap = 21 * indentSize;
    return {
        dinSize,
        rowSlotHeight,
        panelPaddingY,
        rowGap,
        rowStep: rowSlotHeight + rowGap,
    };
};

export const getInstallationLayoutItemKey = (category, item, type, fallback) => {
    if (category === 'controller') return `controller:${type}`;
    if (item && typeof item === 'object' && item.id != null) return `${category}:${type}:id:${item.id}`;
    if (category === 'power') return `power:${type}`;
    return `${category}:${type}:index:${fallback}`;
};

export const readInstallationLayout = (sourceScheme) => {
    const layout = sourceScheme?.installation_layout;
    const controllerType = canonicalDeviceType(
        typeof sourceScheme?.controller === 'string' ? sourceScheme.controller : sourceScheme?.controller?.type,
    );
    if (!layout || layout.version !== INSTALLATION_LAYOUT_VERSION) return { panelSize: null, itemOffsets: {} };
    if (layout.controller_type && canonicalDeviceType(layout.controller_type) !== controllerType) {
        return { panelSize: null, itemOffsets: {} };
    }

    const { dinSize, rowSlotHeight, panelPaddingY, rowGap, rowStep } = getInstallationLayoutMetrics();
    const columns = Math.max(1, Math.round(Number(layout.panel?.columns) || 0));
    const rows = Math.max(1, Math.round(Number(layout.panel?.rows) || 0));
    const hasPanel = Number(layout.panel?.columns) > 0 && Number(layout.panel?.rows) > 0;
    const itemOffsets = {};
    (Array.isArray(layout.items) ? layout.items : []).forEach((item) => {
        if (!item || typeof item.key !== 'string' || !item.key) return;
        const column = Math.max(0, Math.round(Number(item.column) || 0));
        const row = Math.max(0, Math.round(Number(item.row) || 0));
        itemOffsets[item.key] = { x: column * dinSize, y: row * rowStep };
    });

    return {
        panelSize: hasPanel ? {
            width: columns * dinSize + INSTALLATION_PANEL_PADDING_X * 2,
            height: panelPaddingY * 2 + rows * rowSlotHeight + (rows - 1) * rowGap,
        } : null,
        itemOffsets,
    };
};

export const writeInstallationLayout = (controllerType, panelSize, itemOffsets) => {
    const entries = Object.entries(itemOffsets || {});
    if (!panelSize && entries.length === 0) return null;
    const { dinSize, panelPaddingY, rowGap, rowStep } = getInstallationLayoutMetrics();
    const columns = panelSize
        ? Math.max(1, Math.round((panelSize.width - INSTALLATION_PANEL_PADDING_X * 2) / dinSize))
        : null;
    const rows = panelSize
        ? Math.max(1, Math.round((Math.max(0, panelSize.height - panelPaddingY * 2) + rowGap) / rowStep))
        : null;

    return {
        version: INSTALLATION_LAYOUT_VERSION,
        controller_type: controllerType,
        ...(columns && rows ? { panel: { columns, rows } } : {}),
        items: entries.map(([key, position]) => ({
            key,
            column: Math.max(0, Math.round((position?.x || 0) / dinSize)),
            row: Math.max(0, Math.round((position?.y || 0) / rowStep)),
        })),
    };
};

const InstallationCanvas = ({ children, enabled }) => {
    if (!enabled) return null;

    return (
        <Layer>
            <Rect
                x={CANVAS_GRID_MIN}
                y={CANVAS_GRID_MIN}
                width={CANVAS_GRID_MAX - CANVAS_GRID_MIN}
                height={CANVAS_GRID_MAX - CANVAS_GRID_MIN}
                fillLinearGradientStartPoint={{ x: 0, y: CANVAS_GRID_MIN }}
                fillLinearGradientEndPoint={{ x: 0, y: CANVAS_GRID_MAX }}
                fillLinearGradientColorStops={[0, '#ffffff', 1, '#ffffff']}
                listening
            />
            {children}
        </Layer>
    );
};

export default InstallationCanvas;
