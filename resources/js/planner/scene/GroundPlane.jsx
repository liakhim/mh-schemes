import React from 'react';
import { Grid } from '@react-three/drei';
import { usePlannerStore, TOOLS } from '../store/usePlannerStore';
import { snapPoint } from '../domain/geometry';
import { SNAP_STEP } from '../domain/floorPlan';
import { getSceneTheme } from '../domain/theme';

// The floor of the active level: a visual grid plus an invisible plane that
// catches pointer rays for wall drawing and empty-space deselection.
export default function GroundPlane() {
    const plan = usePlannerStore((s) => s.plan);
    const activeLevelId = usePlannerStore((s) => s.activeLevelId);
    const tool = usePlannerStore((s) => s.tool);
    const snapEnabled = usePlannerStore((s) => s.snapEnabled);
    const setHoverPoint = usePlannerStore((s) => s.setHoverPoint);
    const addDrawPoint = usePlannerStore((s) => s.addDrawPoint);
    const finishDraw = usePlannerStore((s) => s.finishDraw);
    const clearSelection = usePlannerStore((s) => s.clearSelection);
    const bgMode = usePlannerStore((s) => s.bgMode);
    const theme = getSceneTheme(bgMode);

    const level = plan.levels.find((l) => l.id === activeLevelId) ?? plan.levels[0];
    const elevation = level?.elevation ?? 0;
    const drawing = tool === TOOLS.DRAW_WALL;

    // Convert a scene intersection point to a snapped plan point (world XZ → plan XY).
    const toPlanPoint = (e) => {
        const point = { x: e.point.x, y: e.point.z };
        return snapEnabled ? snapPoint(point, SNAP_STEP) : point;
    };

    return (
        <group>
            <Grid
                position={[0, elevation + 0.002, 0]}
                args={[80, 80]}
                cellSize={1}
                cellThickness={0.6}
                cellColor={theme.grid.cellColor}
                sectionSize={5}
                sectionThickness={1.1}
                sectionColor={theme.grid.sectionColor}
                infiniteGrid
                fadeDistance={70}
                fadeStrength={1.2}
                followCamera={false}
            />
            <mesh
                position={[0, elevation, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                onPointerMove={
                    drawing
                        ? (e) => {
                              e.stopPropagation();
                              setHoverPoint(toPlanPoint(e));
                          }
                        : undefined
                }
                onPointerDown={(e) => {
                    if (drawing && e.button === 0) {
                        e.stopPropagation();
                        addDrawPoint(toPlanPoint(e));
                    } else if (!drawing && e.button === 0) {
                        clearSelection();
                    }
                }}
                onContextMenu={
                    drawing
                        ? (e) => {
                              e.stopPropagation();
                              e.nativeEvent?.preventDefault?.();
                              finishDraw();
                          }
                        : undefined
                }
            >
                <planeGeometry args={[400, 400]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
        </group>
    );
}
