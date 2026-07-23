import { create } from 'zustand';
import {
    createEmptyPlan,
    createLevel,
    createWall,
    normalizePlan,
    recomputeElevations,
    DEFAULT_LEVEL_HEIGHT,
} from '../domain/floorPlan';
import { distance2D } from '../domain/geometry';
import { readLocalPlan, writeLocalPlan, savePlanToServer } from '../persistence/storage';

// Tools the user can be in.
export const TOOLS = { SELECT: 'select', DRAW_WALL: 'draw-wall' };
export const CAMERA = { PERSPECTIVE: 'perspective', TOP: 'top' };

const findLevel = (plan, levelId) => plan.levels.find((l) => l.id === levelId);

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
        selectedWallId: null,
        drawAnchor: null, // last committed plan point of the wall chain being drawn
        hoverPoint: null, // snapped cursor position on the floor plane
        snapEnabled: true,

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
        toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),

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
        setHoverPoint: (point) => set({ hoverPoint: point }),

        addDrawPoint: (point) => {
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
