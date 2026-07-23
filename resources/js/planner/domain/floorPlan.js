// Floor-plan domain model for the 3D planner.
// All coordinates are stored in METRES (1 scene unit = 1 metre) so three.js math stays direct.
// Plan points are 2D { x, y } on the floor plane; in the 3D scene a plan point maps to
// world coordinates (x, levelElevation, y) — i.e. plan-Y becomes world-Z, world-Y is height.

export const UNITS = 'm';

export const DEFAULT_WALL_HEIGHT = 2.7;
export const DEFAULT_WALL_THICKNESS = 0.12;
export const DEFAULT_LEVEL_HEIGHT = 3.0;

// Grid snap step in metres.
export const SNAP_STEP = 0.1;

// While drawing, the wall direction snaps to the nearest multiple of this angle (degrees),
// so walls come out straight (0/90 for orthogonal rooms, plus common diagonals).
export const ANGLE_SNAP_STEP = 15;

// Cursor snaps to an existing wall endpoint within this distance (metres) — lets rooms close cleanly.
export const VERTEX_SNAP_DIST = 0.35;

export const PLAN_VERSION = 1;

export const uid = (prefix = 'id') => {
    const rnd = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    return `${prefix}_${rnd}`;
};

export const createWall = ({ a, b, thickness = DEFAULT_WALL_THICKNESS, height = DEFAULT_WALL_HEIGHT }) => ({
    id: uid('wall'),
    a: { x: a.x, y: a.y },
    b: { x: b.x, y: b.y },
    thickness,
    height,
});

export const createLevel = ({ name, elevation = 0, height = DEFAULT_LEVEL_HEIGHT } = {}) => ({
    id: uid('lvl'),
    name: name ?? 'Этаж',
    elevation,
    height,
    walls: [],
    openings: [],
    rooms: [],
});

export const createEmptyPlan = () => ({
    version: PLAN_VERSION,
    units: UNITS,
    levels: [createLevel({ name: 'Этаж 1', elevation: 0 })],
    panel: null,
    placements: [],
    routing: { strategy: 'manual', reservePct: 10, routes: [] },
});

// Elevation of each level is derived from the stacked heights of the levels below it.
export const recomputeElevations = (levels) => {
    let elevation = 0;
    return levels.map((level) => {
        const next = { ...level, elevation };
        elevation += Number(level.height) || DEFAULT_LEVEL_HEIGHT;
        return next;
    });
};

// Defensive normalisation of a plan loaded from the server / localStorage.
// Returns null when there is nothing usable so callers can fall back to an empty plan.
export const normalizePlan = (raw) => {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.levels) || raw.levels.length === 0) {
        return null;
    }
    const levels = raw.levels.map((level) => ({
        id: level.id ?? uid('lvl'),
        name: level.name ?? 'Этаж',
        elevation: Number(level.elevation) || 0,
        height: Number(level.height) || DEFAULT_LEVEL_HEIGHT,
        walls: Array.isArray(level.walls)
            ? level.walls
                .filter((w) => w && w.a && w.b)
                .map((w) => ({
                    id: w.id ?? uid('wall'),
                    a: { x: Number(w.a.x) || 0, y: Number(w.a.y) || 0 },
                    b: { x: Number(w.b.x) || 0, y: Number(w.b.y) || 0 },
                    thickness: Number(w.thickness) || DEFAULT_WALL_THICKNESS,
                    height: Number(w.height) || DEFAULT_WALL_HEIGHT,
                }))
            : [],
        openings: Array.isArray(level.openings) ? level.openings : [],
        rooms: Array.isArray(level.rooms) ? level.rooms : [],
    }));

    return {
        version: PLAN_VERSION,
        units: UNITS,
        levels: recomputeElevations(levels),
        panel: raw.panel ?? null,
        placements: Array.isArray(raw.placements) ? raw.placements : [],
        routing: raw.routing ?? { strategy: 'manual', reservePct: 10, routes: [] },
    };
};
