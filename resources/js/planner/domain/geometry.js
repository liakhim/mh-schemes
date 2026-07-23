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

export const radToDeg = (rad) => (rad * 180) / Math.PI;

export const degToRad = (deg) => (deg * Math.PI) / 180;

// Normalises an angle in degrees to the [0, 360) range for display.
export const normalizeDeg = (deg) => ((deg % 360) + 360) % 360;

// Unit direction from a to b; falls back to +X for a degenerate (zero-length) segment.
export const unitDir = (a, b) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-9) return { x: 1, y: 0 };
    return { x: dx / len, y: dy / len };
};

export const samePoint = (a, b, eps = 1e-4) => Math.abs(a.x - b.x) < eps && Math.abs(a.y - b.y) < eps;

// Snaps an angle (radians) to the nearest multiple of step (radians).
export const snapAngleRad = (theta, step) => Math.round(theta / step) * step;

// Point at a given angle (radians) and length from an anchor.
export const pointFromAnchor = (anchor, theta, length) => ({
    x: anchor.x + Math.cos(theta) * length,
    y: anchor.y + Math.sin(theta) * length,
});

// Nearest wall endpoint to `point` within `maxDist`, ignoring any vertex that
// coincides with `exclude` (used to skip the current drawing anchor). Returns null if none.
export const nearestVertex = (walls, point, maxDist, exclude) => {
    let best = null;
    let bestDist = maxDist;
    for (const wall of walls) {
        for (const p of [wall.a, wall.b]) {
            if (exclude && samePoint(p, exclude)) continue;
            const d = Math.hypot(p.x - point.x, p.y - point.y);
            if (d <= bestDist) {
                bestDist = d;
                best = { x: p.x, y: p.y };
            }
        }
    }
    return best;
};
