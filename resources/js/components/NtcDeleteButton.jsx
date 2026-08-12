import React from 'react';
import { Circle, Group } from 'react-konva';
import { Line } from '../scheme/rendering/SharpLine';

const NtcDeleteButton = ({ x, y, onRemove }) => (
    <Group
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
        <Circle radius={14} fill="rgba(0, 0, 0, 0.001)" />
        <Circle radius={8} fill="rgba(217, 83, 79, 0.78)" />
        <Line points={[-3.5, -3.5, 3.5, 3.5]} stroke="white" strokeWidth={1.4} lineCap="round" listening={false} />
        <Line points={[3.5, -3.5, -3.5, 3.5]} stroke="white" strokeWidth={1.4} lineCap="round" listening={false} />
    </Group>
);

export default NtcDeleteButton;
