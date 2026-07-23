import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { usePlannerStore, CAMERA } from '../store/usePlannerStore';

// Switches between an orbiting perspective view and a locked top-down view.
// Works with the default OrbitControls (registered via makeDefault).
export default function CameraController() {
    const mode = usePlannerStore((s) => s.cameraMode);
    const camera = useThree((s) => s.camera);
    const controls = useThree((s) => s.controls);

    useEffect(() => {
        if (!controls) return;
        const target = controls.target;

        if (mode === CAMERA.TOP) {
            camera.up.set(0, 0, -1);
            camera.position.set(target.x, 30, target.z + 0.001);
            controls.enableRotate = false;
        } else {
            camera.up.set(0, 1, 0);
            camera.position.set(target.x + 12, 12, target.z + 12);
            controls.enableRotate = true;
        }

        camera.updateProjectionMatrix();
        controls.update();
    }, [mode, controls, camera]);

    return null;
}
