import React from 'react';
import { Rect, Text } from 'react-konva';

const KitBadge = ({ x, y }) => (
    <>
        <Rect x={x} y={y} width={38} height={8} cornerRadius={2} fill="#e8f5e9" stroke="#43a047" strokeWidth={0.5} listening={false} />
        <Text x={x} y={y + 1} width={38} height={7} padding={0} text="Комплектный" fontSize={4.2} fill="#2e7d32" align="center" verticalAlign="middle" listening={false} />
    </>
);

export default KitBadge;
