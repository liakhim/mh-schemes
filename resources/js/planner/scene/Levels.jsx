import React from 'react';
import { usePlannerStore, TOOLS } from '../store/usePlannerStore';
import WallMesh from './WallMesh';

// Renders the walls of every level. The active level is solid and selectable;
// other levels are shown as faint ghosts for spatial context.
export default function Levels() {
    const levels = usePlannerStore((s) => s.plan.levels);
    const activeLevelId = usePlannerStore((s) => s.activeLevelId);
    const selectedWallId = usePlannerStore((s) => s.selectedWallId);
    const tool = usePlannerStore((s) => s.tool);
    const selectWall = usePlannerStore((s) => s.selectWall);

    return (
        <group>
            {levels.map((level) => {
                const active = level.id === activeLevelId;
                return (
                    <group key={level.id}>
                        {level.walls.map((wall) => (
                            <WallMesh
                                key={wall.id}
                                wall={wall}
                                elevation={level.elevation}
                                ghost={!active}
                                clickable={active && tool === TOOLS.SELECT}
                                selected={active && wall.id === selectedWallId}
                                onSelect={selectWall}
                            />
                        ))}
                    </group>
                );
            })}
        </group>
    );
}
