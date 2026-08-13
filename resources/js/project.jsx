import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Layer, Line, Rect, Stage } from 'react-konva';
import '../css/app.css';
import '../css/project.css';
import { buildControllerOnlyScheme } from './scheme/domain/controllerOnlyScheme';
import { canonicalDeviceType } from './scheme/domain/deviceTypes';
import { normalizeIncomingScheme } from './scheme/domain/incomingSchemeNormalizer';
import { normalizeSchemeIds } from './scheme/domain/schemeIds';
import {
    EcosmartProject,
    GoPlusProject,
    GoProject,
    ProProject,
    Smart2Project,
} from './components/project/ControllerProject';

const PROJECT_TOPBAR_HEIGHT = 52;
const PROJECT_VIEWPORT_PADDING = 32;
const PROJECT_GRID_SIZE = 24;

const getCanvasSize = () => ({
    width: Math.max(window.innerWidth - PROJECT_VIEWPORT_PADDING, 240),
    height: Math.max(window.innerHeight - PROJECT_TOPBAR_HEIGHT - PROJECT_VIEWPORT_PADDING, 240),
});

const getRouteSchemeId = () => {
    const match = /^\/project\/(\d+)(?:\/)?$/i.exec(window.location.pathname);
    return match ? match[1] : null;
};

const getInitialScheme = () => {
    const routeSchemeId = getRouteSchemeId();
    const record = window.__INITIAL_PROJECT_RECORD__;
    const requestedController = new URLSearchParams(window.location.search).get('controller');
    const fallback = routeSchemeId ? {} : (buildControllerOnlyScheme(requestedController) || buildControllerOnlyScheme('go'));
    return normalizeIncomingScheme(normalizeSchemeIds(record?.incoming_scheme || fallback));
};

const getControllerType = (scheme) => canonicalDeviceType(
    typeof scheme?.controller === 'string' ? scheme.controller : scheme?.controller?.type,
);

const ControllerProject = ({ scheme, setScheme, settings }) => {
    const controllerType = getControllerType(scheme);
    const ProjectComponent = {
        go: GoProject,
        'go+': GoPlusProject,
        smart2: Smart2Project,
        pro: ProProject,
        ecosmart: EcosmartProject,
    }[controllerType] || GoProject;
    return <ProjectComponent scheme={scheme} setScheme={setScheme} settings={settings} />;
};

const ProjectCanvasSurface = ({ canvasSize, showGrid }) => {
    const verticalLines = [];
    const horizontalLines = [];
    if (showGrid) {
        for (let x = 0; x <= canvasSize.width; x += PROJECT_GRID_SIZE) verticalLines.push(x);
        for (let y = 0; y <= canvasSize.height; y += PROJECT_GRID_SIZE) horizontalLines.push(y);
    }

    return (
        <Layer listening={false}>
            <Rect width={canvasSize.width} height={canvasSize.height} fill="#fbfcfe" />
            {verticalLines.map((x) => <Line key={`vertical-${x}`} points={[x, 0, x, canvasSize.height]} stroke="#e7edf4" strokeWidth={1} />)}
            {horizontalLines.map((y) => <Line key={`horizontal-${y}`} points={[0, y, canvasSize.width, y]} stroke="#e7edf4" strokeWidth={1} />)}
        </Layer>
    );
};

const scaleStageAtPointer = (stage, pointer, nextScale) => {
    const oldScale = stage.scaleX();
    const scale = Math.max(0.4, Math.min(nextScale, 3));
    const contentPoint = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
    };
    stage.position({
        x: pointer.x - contentPoint.x * scale,
        y: pointer.y - contentPoint.y * scale,
    });
    stage.scale({ x: scale, y: scale });
    stage.batchDraw();
};

const App = () => {
    const stageRef = useRef(null);
    const [canvasSize, setCanvasSize] = useState(getCanvasSize);
    const [scheme, setScheme] = useState(getInitialScheme);
    const [settings, setSettings] = useState({ showEmptySlots: false, showGrid: true });

    const handleCanvasWheel = (event) => {
        event.evt.preventDefault();
        const stage = stageRef.current;
        if (!stage) return;
        const shouldZoom = event.evt.ctrlKey || event.evt.metaKey || event.evt.shiftKey;
        if (!shouldZoom) return;
        const pointer = stage.getPointerPosition();
        if (!pointer) return;
        scaleStageAtPointer(stage, pointer, stage.scaleX() * Math.exp(-event.evt.deltaY * 0.001));
    };

    useEffect(() => {
        const onResize = () => setCanvasSize(getCanvasSize());
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    return (
        <main className="project-root">
            <header className="project-topbar">
                <strong>Project editor</strong>
                <span>Experimental controller-owned canvas</span>
                <label>
                    <input
                        type="checkbox"
                        checked={settings.showEmptySlots}
                        onChange={(event) => setSettings((current) => ({ ...current, showEmptySlots: event.target.checked }))}
                    />
                    Empty slots
                </label>
            </header>
            <div className="project-canvas-viewport">
                <div className="project-canvas">
                    <Stage
                        ref={stageRef}
                        width={canvasSize.width}
                        height={canvasSize.height}
                        draggable
                        onWheel={handleCanvasWheel}
                    >
                        <ProjectCanvasSurface canvasSize={canvasSize} showGrid={settings.showGrid} />
                        <ControllerProject scheme={scheme} setScheme={setScheme} settingss={settings} />
                    </Stage>
                </div>
            </div>
        </main>
    );
};

createRoot(document.getElementById('app')).render(<App />);
