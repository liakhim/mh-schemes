import React, { useLayoutEffect, useRef } from 'react';
import Konva from 'konva';
import { Circle as KonvaCircle } from 'react-konva';

const isPortDotCircle = ({ fill, radius, listening }) => (
    fill === 'red'
    && Number(radius) === 2.5
    && listening === false
);

const PortDotCircle = ({ fill, radius, listening, ...props }) => {
    const circleRef = useRef(null);

    // После каждого рендера выносит служебную красную точку порта поверх слоя;
    // cleanup удаляет предыдущий overlay и возвращает видимость исходному узлу.
    useLayoutEffect(() => {
        const node = circleRef.current;
        if (!node || !isPortDotCircle({ fill, radius, listening })) return undefined;

        const layer = node.getLayer();
        if (!layer) return undefined;

        const position = node.getAbsolutePosition(layer);
        const overlay = new Konva.Circle({
            x: position.x,
            y: position.y,
            radius,
            fill,
            listening: false,
            name: 'port-dot-overlay',
        });
        node.visible(false);
        layer.add(overlay);
        overlay.moveToTop();
        layer.batchDraw();

        return () => {
            overlay.destroy();
            if (node.getLayer()) node.visible(true);
            if (!layer.isDestroyed?.()) layer.batchDraw();
        };
    });

    return <KonvaCircle ref={circleRef} fill={fill} radius={radius} listening={listening} {...props} />;
};

export default PortDotCircle;
