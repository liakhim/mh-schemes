import React from 'react';
import { Rect } from 'react-konva';

const ACTIVE_INDICATOR_COLOR = '#00DA00';
const ACTIVE_INDICATOR_SHADOW_BLUR = 6;
const INACTIVE_INDICATOR_COLOR = '#D2D2D2';

const DeviceIndicator = ({
    port,
    imageWidth,
    imageHeight,
    offsetX = 0,
    offsetY = 0,
    active,
    size,
    perfectDrawEnabled,
}) => {
    const width = size ?? Math.max(1, (port.width || 0) * imageWidth);
    const height = size ?? Math.max(1, (port.height || 0) * imageHeight);
    const color = active ? ACTIVE_INDICATOR_COLOR : INACTIVE_INDICATOR_COLOR;

    return (
        <Rect
            x={offsetX + port.x * imageWidth - width / 2}
            y={offsetY + port.y * imageHeight - height / 2}
            width={width}
            height={height}
            cornerRadius={Math.min(width, height) / 2}
            fill={color}
            shadowColor={active ? color : undefined}
            shadowBlur={active ? ACTIVE_INDICATOR_SHADOW_BLUR : 0}
            perfectDrawEnabled={perfectDrawEnabled}
            listening={false}
        />
    );
};

export default DeviceIndicator;
