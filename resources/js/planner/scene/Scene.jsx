import React from 'react';
import { Canvas } from '@react-three/fiber';
import {
    OrbitControls,
    GizmoHelper,
    GizmoViewport,
    PerspectiveCamera,
    OrthographicCamera,
} from '@react-three/drei';
import GroundPlane from './GroundPlane';
import Levels from './Levels';
import DraftPreview from './DraftPreview';
import { usePlannerStore, CAMERA } from '../store/usePlannerStore';
import { getSceneTheme } from '../domain/theme';

// Root R3F canvas. Two cameras: an orbiting perspective for the 3D view and a true
// orthographic top-down (parallel projection → screen maps linearly to the floor, which is
// what makes precise plan drawing reliable). OrbitControls follows whichever is default;
// rotation is disabled in top view so it stays a clean plan.
export default function Scene() {
    const bgMode = usePlannerStore((s) => s.bgMode);
    const cameraMode = usePlannerStore((s) => s.cameraMode);
    const theme = getSceneTheme(bgMode);
    const isTop = cameraMode === CAMERA.TOP;

    return (
        <Canvas shadows dpr={[1, 2]}>
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

            <PerspectiveCamera makeDefault={!isTop} position={[12, 12, 12]} fov={50} near={0.1} far={5000} />
            <OrthographicCamera
                makeDefault={isTop}
                position={[0, 200, 0]}
                up={[0, 0, -1]}
                zoom={26}
                near={0.1}
                far={5000}
            />

            <GroundPlane />
            <Levels />
            <DraftPreview />

            <OrbitControls
                makeDefault
                enableDamping
                dampingFactor={0.12}
                enableRotate={!isTop}
                maxPolarAngle={Math.PI / 2}
            />
            <GizmoHelper alignment="bottom-right" margin={[72, 72]}>
                <GizmoViewport axisColors={['#ff6a00', '#141414', '#b6b6ba']} labelColor="#ffffff" />
            </GizmoHelper>
        </Canvas>
    );
}
