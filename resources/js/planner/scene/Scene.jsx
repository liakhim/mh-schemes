import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, GizmoHelper, GizmoViewport } from '@react-three/drei';
import CameraController from './CameraController';
import GroundPlane from './GroundPlane';
import Levels from './Levels';
import DraftPreview from './DraftPreview';

// Root R3F canvas: lighting, the floor/grid, walls, drawing preview, camera control
// and an orientation gizmo.
export default function Scene() {
    return (
        <Canvas
            shadows
            dpr={[1, 2]}
            camera={{ position: [12, 12, 12], fov: 50, near: 0.1, far: 3000 }}
        >
            <color attach="background" args={['#0f1115']} />
            <hemisphereLight intensity={0.55} groundColor="#0b0d12" />
            <ambientLight intensity={0.35} />
            <directionalLight
                position={[14, 20, 8]}
                intensity={1.15}
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
                <GizmoViewport axisColors={['#ff6b6b', '#8bd450', '#4f9dff']} labelColor="#ffffff" />
            </GizmoHelper>
        </Canvas>
    );
}
