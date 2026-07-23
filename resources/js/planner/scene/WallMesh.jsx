import React from 'react';
import { Edges } from '@react-three/drei';
import { wallTransform } from '../domain/geometry';
import { usePlannerStore } from '../store/usePlannerStore';
import { getSceneTheme } from '../domain/theme';

// A single wall rendered as an oriented box with crisp edges (white/orange/black look).
// Ghost walls (inactive levels) are dimmed and non-interactive; the active level's walls
// are clickable for selection.
export default function WallMesh({ wall, elevation, ghost = false, selected = false, clickable = false, onSelect }) {
    const bgMode = usePlannerStore((s) => s.bgMode);
    const theme = getSceneTheme(bgMode);
    const { length, rotationY, position } = wallTransform(wall, elevation);
    if (length < 1e-3) return null;

    return (
        <mesh
            position={position}
            rotation={[0, rotationY, 0]}
            castShadow={!ghost}
            receiveShadow={!ghost}
            onPointerDown={
                clickable
                    ? (e) => {
                          e.stopPropagation();
                          onSelect?.(wall.id);
                      }
                    : undefined
            }
        >
            <boxGeometry args={[length, wall.height, wall.thickness]} />
            <meshStandardMaterial
                color={selected ? theme.wall.selected : theme.wall.color}
                roughness={0.9}
                metalness={0.02}
                transparent={ghost}
                opacity={ghost ? theme.wall.ghostOpacity : 1}
                depthWrite={!ghost}
                polygonOffset
                polygonOffsetFactor={1}
            />
            {!ghost && (
                <Edges
                    threshold={15}
                    color={selected ? theme.wall.edgeSelected : theme.wall.edge}
                    lineWidth={selected ? 1.6 : 1}
                />
            )}
        </mesh>
    );
}
