export const getPinchStageTransform = ({
    startPoint,
    currentPoint,
    startStagePosition,
    startScale,
    startDistance,
    currentDistance,
    minScale = 0.4,
    maxScale = 3,
}) => {
    const scale = Math.max(minScale, Math.min(maxScale, startScale * (currentDistance / startDistance)));
    const contentPoint = {
        x: (startPoint.x - startStagePosition.x) / startScale,
        y: (startPoint.y - startStagePosition.y) / startScale,
    };

    return {
        scale,
        position: {
            x: currentPoint.x - contentPoint.x * scale,
            y: currentPoint.y - contentPoint.y * scale,
        },
    };
};
