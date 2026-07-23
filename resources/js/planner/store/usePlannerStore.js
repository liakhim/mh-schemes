import { create } from 'zustand';
import {
    createEmptyPlan,
    createLevel,
    createWall,
    normalizePlan,
    recomputeElevations,
    DEFAULT_LEVEL_HEIGHT,
    SNAP_STEP,
    ANGLE_SNAP_STEP,
    VERTEX_SNAP_DIST,
} from '../domain/floorPlan';
import {
    distance2D,
    snap,
    snapPoint,
    planAngle,
    snapAngleRad,
    pointFromAnchor,
    unitDir,
    samePoint,
    nearestVertex,
    degToRad,
} from '../domain/geometry';
import { readLocalPlan, writeLocalPlan, savePlanToServer } from '../persistence/storage';

// Tools the user can be in.
export const TOOLS = { SELECT: 'select', DRAW_WALL: 'draw-wall' };
export const CAMERA = { PERSPECTIVE: 'perspective', TOP: 'top' };
export const BG = { LIGHT: 'light', DARK: 'dark' };

const findLevel = (plan, levelId) => plan.levels.find((l) => l.id === levelId);

// Moves every wall endpoint that coincides with `oldPoint` to `newPoint` (except `exceptId`),
// so shared corners stay welded together when one wall is reshaped.
const weldVertices = (walls, oldPoint, newPoint, exceptId) =>
    walls.map((wall) => {
        if (wall.id === exceptId) return wall;
        const a = samePoint(wall.a, oldPoint) ? { x: newPoint.x, y: newPoint.y } : wall.a;
        const b = samePoint(wall.b, oldPoint) ? { x: newPoint.x, y: newPoint.y } : wall.b;
        return a === wall.a && b === wall.b ? wall : { ...wall, a, b };
    });

const ANGLE_STEP_RAD = degToRad(ANGLE_SNAP_STEP);

export const usePlannerStore = create((set, get) => {
    // Mutates the active level via `updater(level) => newLevel`, marks dirty and persists locally.
    const mutateActiveLevel = (updater) => {
        set((state) => {
            const levels = state.plan.levels.map((level) =>
                level.id === state.activeLevelId ? updater(level) : level
            );
            const plan = { ...state.plan, levels };
            writeLocalPlan(state.scheme?.id, plan);
            return { plan, dirty: true };
        });
    };

    const commitPlan = (plan) => {
        writeLocalPlan(get().scheme?.id, plan);
        set({ plan, dirty: true });
    };

    // Resolves a raw floor point into the snapped point used for drawing:
    // 1) snap onto a nearby existing endpoint (so rooms close cleanly),
    // 2) else, while chaining, lock the direction to the angle step and the length to the grid,
    // 3) else snap to the grid, 4) else raw.
    const resolveDrawPoint = (raw) => {
        const state = get();
        const level = findLevel(state.plan, state.activeLevelId);
        const walls = level?.walls ?? [];

        const vertex = nearestVertex(walls, raw, VERTEX_SNAP_DIST, state.drawAnchor);
        if (vertex) return vertex;

        if (state.drawAnchor && state.angleSnapEnabled) {
            const anchor = state.drawAnchor;
            let length = distance2D(anchor, raw);
            if (length < 1e-6) return { x: anchor.x, y: anchor.y };
            const theta = snapAngleRad(planAngle(anchor, raw), ANGLE_STEP_RAD);
            if (state.snapEnabled) length = Math.max(SNAP_STEP, snap(length, SNAP_STEP));
            return pointFromAnchor(anchor, theta, length);
        }

        if (state.snapEnabled) return snapPoint(raw, SNAP_STEP);
        return raw;
    };

    return {
        // ---- lifecycle ----
        ready: false,
        scheme: null,

        // ---- data ----
        plan: createEmptyPlan(),
        activeLevelId: null,

        // ---- editor state ----
        tool: TOOLS.SELECT,
        cameraMode: CAMERA.PERSPECTIVE,
        bgMode: BG.LIGHT,
        selectedWallId: null,
        drawAnchor: null, // last committed plan point of the wall chain being drawn
        hoverPoint: null, // snapped cursor position on the floor plane
        snapEnabled: true, // grid snap (0.1 m)
        angleSnapEnabled: true, // lock wall direction to the angle step (straight walls)

        // ---- save state ----
        saving: false,
        saveError: null,
        lastSavedAt: null,

        initFrom: (initial) => {
            const scheme = initial?.scheme
                ? { id: initial.scheme.id, name: initial.scheme.name }
                : null;
            const serverPlan = normalizePlan(initial?.scheme?.floor_plan);
            const localPlan = normalizePlan(readLocalPlan(scheme?.id));
            const plan = serverPlan || localPlan || createEmptyPlan();
            set({
                scheme,
                plan,
                activeLevelId: plan.levels[0]?.id ?? null,
                ready: true,
            });
        },

        // ---- tools / view ----
        setTool: (tool) => set({ tool, drawAnchor: null, hoverPoint: null }),
        setCameraMode: (cameraMode) => set({ cameraMode }),
        setBgMode: (bgMode) => set({ bgMode }),
        toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),
        toggleAngleSnap: () => set((s) => ({ angleSnapEnabled: !s.angleSnapEnabled })),

        // ---- levels ----
        getActiveLevel: () => findLevel(get().plan, get().activeLevelId),
        setActiveLevel: (levelId) => set({ activeLevelId: levelId, selectedWallId: null, drawAnchor: null }),

        addLevel: () => {
            set((state) => {
                const count = state.plan.levels.length;
                const level = createLevel({ name: `Этаж ${count + 1}`, height: DEFAULT_LEVEL_HEIGHT });
                const levels = recomputeElevations([...state.plan.levels, level]);
                const plan = { ...state.plan, levels };
                writeLocalPlan(state.scheme?.id, plan);
                return { plan, activeLevelId: level.id, dirty: true, selectedWallId: null };
            });
        },

        removeLevel: (levelId) => {
            const { plan } = get();
            if (plan.levels.length <= 1) return; // keep at least one level
            const levels = recomputeElevations(plan.levels.filter((l) => l.id !== levelId));
            const next = { ...plan, levels };
            const activeLevelId = get().activeLevelId === levelId ? levels[0].id : get().activeLevelId;
            commitPlan(next);
            set({ activeLevelId, selectedWallId: null });
        },

        renameLevel: (levelId, name) => {
            const levels = get().plan.levels.map((l) => (l.id === levelId ? { ...l, name } : l));
            commitPlan({ ...get().plan, levels });
        },

        setLevelHeight: (levelId, height) => {
            const clamped = Math.max(0.2, Number(height) || DEFAULT_LEVEL_HEIGHT);
            const levels = recomputeElevations(
                get().plan.levels.map((l) => (l.id === levelId ? { ...l, height: clamped } : l))
            );
            commitPlan({ ...get().plan, levels });
        },

        // ---- wall drawing ----
        // GroundPlane passes the raw floor point; snapping is resolved centrally here so the
        // hover preview and the committed wall use identical logic.
        setHoverPoint: (raw) => set({ hoverPoint: raw ? resolveDrawPoint(raw) : null }),

        addDrawPoint: (raw) => {
            const point = resolveDrawPoint(raw);
            const { drawAnchor } = get();
            if (!drawAnchor) {
                set({ drawAnchor: point });
                return;
            }
            if (distance2D(drawAnchor, point) < 1e-3) return; // ignore double-clicks on the same spot
            const wall = createWall({ a: drawAnchor, b: point });
            mutateActiveLevel((level) => ({ ...level, walls: [...level.walls, wall] }));
            set({ drawAnchor: point }); // continue the chain from the new point
        },

        finishDraw: () => set({ drawAnchor: null, hoverPoint: null }),

        // ---- selection / wall edits ----
        selectWall: (wallId) => set({ selectedWallId: wallId }),
        clearSelection: () => set({ selectedWallId: null }),

        updateWall: (wallId, patch) => {
            mutateActiveLevel((level) => ({
                ...level,
                walls: level.walls.map((w) => (w.id === wallId ? { ...w, ...patch } : w)),
            }));
        },

        // Sets the exact wall length: keeps endpoint `a`, moves `b` along the current direction,
        // and welds any shared corner so the room stays connected.
        setWallLength: (wallId, length) => {
            const target = Math.max(0.05, Number(length) || 0.05);
            mutateActiveLevel((level) => {
                const wall = level.walls.find((w) => w.id === wallId);
                if (!wall) return level;
                const dir = unitDir(wall.a, wall.b);
                const oldB = wall.b;
                const newB = { x: wall.a.x + dir.x * target, y: wall.a.y + dir.y * target };
                const walls = weldVertices(
                    level.walls.map((w) => (w.id === wallId ? { ...w, b: newB } : w)),
                    oldB,
                    newB,
                    wallId
                );
                return { ...level, walls };
            });
        },

        // Sets the exact wall angle (degrees): keeps `a` and length, rotates `b`, welds the corner.
        setWallAngle: (wallId, deg) => {
            const rad = degToRad(Number(deg) || 0);
            mutateActiveLevel((level) => {
                const wall = level.walls.find((w) => w.id === wallId);
                if (!wall) return level;
                const length = distance2D(wall.a, wall.b) || SNAP_STEP;
                const oldB = wall.b;
                const newB = pointFromAnchor(wall.a, rad, length);
                const walls = weldVertices(
                    level.walls.map((w) => (w.id === wallId ? { ...w, b: newB } : w)),
                    oldB,
                    newB,
                    wallId
                );
                return { ...level, walls };
            });
        },

        // Snaps a crooked wall to the nearest angle step, keeping its length; welds the corner.
        straightenWall: (wallId) => {
            mutateActiveLevel((level) => {
                const wall = level.walls.find((w) => w.id === wallId);
                if (!wall) return level;
                const length = distance2D(wall.a, wall.b);
                if (length < 1e-6) return level;
                const theta = snapAngleRad(planAngle(wall.a, wall.b), ANGLE_STEP_RAD);
                const oldB = wall.b;
                const newB = pointFromAnchor(wall.a, theta, length);
                const walls = weldVertices(
                    level.walls.map((w) => (w.id === wallId ? { ...w, b: newB } : w)),
                    oldB,
                    newB,
                    wallId
                );
                return { ...level, walls };
            });
        },

        deleteWall: (wallId) => {
            mutateActiveLevel((level) => ({
                ...level,
                walls: level.walls.filter((w) => w.id !== wallId),
            }));
            if (get().selectedWallId === wallId) set({ selectedWallId: null });
        },

        deleteSelected: () => {
            const { selectedWallId, deleteWall } = get();
            if (selectedWallId) deleteWall(selectedWallId);
        },

        // ---- save ----
        save: async () => {
            const { scheme, plan } = get();
            writeLocalPlan(scheme?.id, plan);
            if (!scheme?.id) {
                // No scheme bound yet — the local draft is the only store we have.
                set({ dirty: false, lastSavedAt: Date.now(), saveError: null });
                return;
            }
            set({ saving: true, saveError: null });
            try {
                await savePlanToServer(scheme.id, plan);
                set({ saving: false, dirty: false, lastSavedAt: Date.now() });
            } catch (error) {
                set({ saving: false, saveError: String(error.message || error) });
            }
        },
    };
});
