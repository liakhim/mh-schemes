import React, { createContext, useContext, useLayoutEffect, useRef } from 'react';
import { Line as KonvaLine } from 'react-konva';

export const snapPixel = (value) => (Number.isFinite(value) ? Math.round(value) : value);

const CONNECTION_LINE_STROKE_WIDTH = 0.8;
const PORT_ENTRY_SPREAD = 0.5;
const PORT_KEY_PRECISION = 100;
const RealisticConnectionLinesContext = createContext(false);
const pendingLayerSpreadFrames = new WeakMap();

export const RealisticConnectionLines = ({ children }) => (
    <RealisticConnectionLinesContext.Provider value>
        {children}
    </RealisticConnectionLinesContext.Provider>
);

const getEffectiveStrokeWidth = (strokeWidth, stroke) => {
    if (strokeWidth === 1 && stroke !== 'white') {
        return CONNECTION_LINE_STROKE_WIDTH;
    }

    return strokeWidth;
};

const roundPortCoord = (value) => Math.round(value * PORT_KEY_PRECISION) / PORT_KEY_PRECISION;

const getPortEntry = (points) => {
    if (!Array.isArray(points) || points.length < 4) return null;
    const endX = points[points.length - 2];
    const endY = points[points.length - 1];
    const prevX = points[points.length - 4];
    const prevY = points[points.length - 3];
    if (![endX, endY, prevX, prevY].every(Number.isFinite)) return null;

    const dx = endX - prevX;
    const dy = endY - prevY;
    if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return null;
    if (Math.abs(dx) > 0.001 && Math.abs(dy) > 0.001) return null;

    const side = Math.abs(dx) < 0.001
        ? (prevY > endY ? 'bottom' : 'top')
        : (prevX > endX ? 'right' : 'left');
    return {
        key: `${roundPortCoord(endX)}:${roundPortCoord(endY)}:${side}`,
        orientation: Math.abs(dx) < 0.001 ? 'vertical' : 'horizontal',
    };
};

const getBasePoints = (node) => node.getAttr('sharpLineBasePoints') || node.points();

const setSpreadPoints = (node, spreadOffset, orientation) => {
    const basePoints = getBasePoints(node);
    if (!Array.isArray(basePoints) || basePoints.length < 4) return;
    const nextPoints = [...basePoints];
    const offsetAxisIndex = orientation === 'vertical' ? 0 : 1;
    nextPoints[nextPoints.length - 4 + offsetAxisIndex] += spreadOffset;
    nextPoints[nextPoints.length - 2 + offsetAxisIndex] += spreadOffset;
    node.points(nextPoints);
};

const spreadSharedPortEntries = (layer) => {
    if (!layer) return;
    const groups = new Map();
    layer.find('Line').forEach((node) => {
        if (node.stroke() === 'white') return;
        const basePoints = getBasePoints(node);
        node.points(basePoints);
        const entry = getPortEntry(basePoints);
        if (!entry) return;
        const group = groups.get(entry.key) || { orientation: entry.orientation, nodes: [] };
        group.nodes.push(node);
        groups.set(entry.key, group);
    });

    groups.forEach(({ orientation, nodes }) => {
        if (nodes.length !== 2) return;
        setSpreadPoints(nodes[0], -PORT_ENTRY_SPREAD, orientation);
        setSpreadPoints(nodes[1], PORT_ENTRY_SPREAD, orientation);
    });
    layer.batchDraw();
};

const scheduleSharedPortSpread = (layer) => {
    if (!layer || pendingLayerSpreadFrames.has(layer)) return;
    const frameId = window.requestAnimationFrame(() => {
        pendingLayerSpreadFrames.delete(layer);
        if (!layer.isDestroyed?.()) spreadSharedPortEntries(layer);
    });
    pendingLayerSpreadFrames.set(layer, frameId);
};

export const Line = ({ points, strokeWidth = 1, ...props }) => {
    const lineRef = useRef(null);
    const realistic = useContext(RealisticConnectionLinesContext);
    const isColoredConnection = realistic && props.stroke && props.stroke !== 'white' && strokeWidth === 1;

    useLayoutEffect(() => {
        const node = lineRef.current;
        if (!node) return;
        node.setAttr('sharpLineBasePoints', points);
        scheduleSharedPortSpread(node.getLayer());
    }, [points]);

    return (
        <KonvaLine
            ref={lineRef}
            {...props}
            points={points}
            strokeWidth={isColoredConnection ? 1.25 : getEffectiveStrokeWidth(strokeWidth, props.stroke)}
            lineCap={props.lineCap || (isColoredConnection ? 'round' : undefined)}
            lineJoin={props.lineJoin || (isColoredConnection ? 'round' : undefined)}
            shadowColor={props.shadowColor || (isColoredConnection ? 'rgba(15, 23, 42, 0.55)' : undefined)}
            shadowBlur={props.shadowBlur ?? (isColoredConnection ? 0.7 : 0)}
            shadowOffsetY={props.shadowOffsetY ?? (isColoredConnection ? 0.45 : 0)}
            shadowOpacity={props.shadowOpacity ?? (isColoredConnection ? 0.32 : 0)}
            shadowForStrokeEnabled={isColoredConnection || props.shadowForStrokeEnabled}
        />
    );
};
