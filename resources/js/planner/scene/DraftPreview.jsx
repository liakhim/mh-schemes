import React from 'react';
import { Line } from '@react-three/drei';
import { usePlannerStore, TOOLS } from '../store/usePlannerStore';
import { getSceneTheme } from '../domain/theme';

// Live preview of the wall being drawn: an anchor marker, a cursor marker and a
// dashed rubber-band segment between them.
export default function DraftPreview() {
    const tool = usePlannerStore((s) => s.tool);
    const drawAnchor = usePlannerStore((s) => s.drawAnchor);
    const hoverPoint = usePlannerStore((s) => s.hoverPoint);
    const plan = usePlannerStore((s) => s.plan);
    const activeLevelId = usePlannerStore((s) => s.activeLevelId);
    const bgMode = usePlannerStore((s) => s.bgMode);

    if (tool !== TOOLS.DRAW_WALL) return null;

    const theme = getSceneTheme(bgMode);
    const level = plan.levels.find((l) => l.id === activeLevelId) ?? plan.levels[0];
    const y = (level?.elevation ?? 0) + 0.05;

    return (
        <group>
            {drawAnchor && (
                <mesh position={[drawAnchor.x, y, drawAnchor.y]}>
                    <sphereGeometry args={[0.08, 16, 16]} />
                    <meshBasicMaterial color={theme.draft.anchor} />
                </mesh>
            )}
            {hoverPoint && (
                <mesh position={[hoverPoint.x, y, hoverPoint.y]}>
                    <sphereGeometry args={[0.06, 12, 12]} />
                    <meshBasicMaterial color={theme.draft.hover} />
                </mesh>
            )}
            {drawAnchor && hoverPoint && (
                <Line
                    points={[
                        [drawAnchor.x, y, drawAnchor.y],
                        [hoverPoint.x, y, hoverPoint.y],
                    ]}
                    color={theme.draft.line}
                    lineWidth={2}
                    dashed
                    dashSize={0.2}
                    gapSize={0.12}
                />
            )}
        </group>
    );
}
