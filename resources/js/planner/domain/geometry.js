// Pure 2D/3D geometry helpers for wall placement in the scene.
// Plan point { x, y } → world (x, elevation, y). Wall meshes are boxes oriented along a→b.

export const distance2D = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

export const midpoint2D = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

// Angle of the a→b direction in the plan (radians), measured in the XY plan plane.
export const planAngle = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);

export const snap = (value, step) => Math.round(value / step) * step;

export const snapPoint = (p, step) => ({ x: snap(p.x, step), y: snap(p.y, step) });

// Returns the transform for a wall box mesh spanning a→b at a given level elevation.
// - position: world centre of the box
// - rotationY: rotation about the world Y axis so the box length axis follows a→b
// - length: wall run length (box size along local X)
export const wallTransform = (wall, elevation) => {
    const length = distance2D(wall.a, wall.b);
    const mid = midpoint2D(wall.a, wall.b);
    const rotationY = -planAngle(wall.a, wall.b);
    return {
        length,
        rotationY,
        position: [mid.x, elevation + wall.height / 2, mid.y],
    };
};

export const formatMeters = (value) => `${(Math.round(value * 100) / 100).toFixed(2)} м`;
