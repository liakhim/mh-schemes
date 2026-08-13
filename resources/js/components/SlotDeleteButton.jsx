import React from 'react';
import { Circle, Group } from 'react-konva';
import { Line } from '../scheme/rendering/SharpLine';

const SlotDeleteButton = ({ x, y, onRemove, compact = false, name }) => {
    const visibleRadius = compact ? 6 : 8;
    const crossRadius = compact ? 2.5 : 3.5;
    const strokeWidth = compact ? 1 : 1.4;

    return (
    <Group
        name={name}
        x={x}
        y={y}
        onClick={onRemove}
        onTap={onRemove}
        onMouseEnter={(event) => {
            const stage = event.target.getStage();
            if (stage) stage.container().style.cursor = 'pointer';
        }}
        onMouseLeave={(event) => {
            const stage = event.target.getStage();
            if (stage) stage.container().style.cursor = 'default';
        }}
    >
        <Circle radius={compact ? 6 : 14} fill="rgba(0, 0, 0, 0.001)" />
        <Circle radius={visibleRadius} fill={compact ? 'rgba(217, 83, 79, 0.55)' : 'rgba(217, 83, 79, 0.78)'} />
        <Line points={[-crossRadius, -crossRadius, crossRadius, crossRadius]} stroke="white" strokeWidth={strokeWidth} lineCap="round" listening={false} />
        <Line points={[crossRadius, -crossRadius, -crossRadius, crossRadius]} stroke="white" strokeWidth={strokeWidth} lineCap="round" listening={false} />
    </Group>
    );
};

export default SlotDeleteButton;
