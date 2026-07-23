import React from 'react';
import { wallTransform } from '../domain/geometry';

// A single wall rendered as an oriented box. Ghost walls (inactive levels) are dimmed
// and non-interactive; the active level's walls are clickable for selection.
export default function WallMesh({ wall, elevation, ghost = false, selected = false, clickable = false, onSelect }) {
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
                color={selected ? '#4f9dff' : '#c9ccd4'}
                emissive={selected ? '#12395f' : '#000000'}
                roughness={0.85}
                metalness={0.05}
                transparent={ghost}
                opacity={ghost ? 0.18 : 1}
                depthWrite={!ghost}
            />
        </mesh>
    );
}
