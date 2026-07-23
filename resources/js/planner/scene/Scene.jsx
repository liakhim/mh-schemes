import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, GizmoHelper, GizmoViewport } from '@react-three/drei';
import CameraController from './CameraController';
import GroundPlane from './GroundPlane';
import Levels from './Levels';
import DraftPreview from './DraftPreview';
import { usePlannerStore } from '../store/usePlannerStore';
import { getSceneTheme } from '../domain/theme';

// Root R3F canvas: lighting, the floor/grid, walls, drawing preview, camera control
// and an orientation gizmo. Background and lighting follow the theme (light/dark).
export default function Scene() {
    const bgMode = usePlannerStore((s) => s.bgMode);
    const theme = getSceneTheme(bgMode);

    return (
        <Canvas
            shadows
            dpr={[1, 2]}
            camera={{ position: [12, 12, 12], fov: 50, near: 0.1, far: 3000 }}
        >
            <color attach="background" args={[theme.background]} />
            <hemisphereLight intensity={theme.light_.hemi} groundColor={theme.light_.hemiGround} />
            <ambientLight intensity={theme.light_.ambient} />
            <directionalLight
                position={[14, 20, 8]}
                intensity={theme.light_.dir}
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-camera-left={-40}
                shadow-camera-right={40}
                shadow-camera-top={40}
                shadow-camera-bottom={-40}
            />

            <CameraController />
            <GroundPlane />
            <Levels />
            <DraftPreview />

            <OrbitControls makeDefault enableDamping dampingFactor={0.12} maxPolarAngle={Math.PI / 2} />
            <GizmoHelper alignment="bottom-right" margin={[72, 72]}>
                <GizmoViewport axisColors={['#ff6a00', '#141414', '#b6b6ba']} labelColor="#ffffff" />
            </GizmoHelper>
        </Canvas>
    );
}
