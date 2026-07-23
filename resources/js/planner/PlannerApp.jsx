import React, { useEffect } from 'react';
import Scene from './scene/Scene';
import Toolbar from './ui/Toolbar';
import LevelPanel from './ui/LevelPanel';
import PropertiesPanel from './ui/PropertiesPanel';
import HelpHint from './ui/HelpHint';
import { usePlannerStore, TOOLS } from './store/usePlannerStore';

export default function PlannerApp() {
    const ready = usePlannerStore((s) => s.ready);
    const tool = usePlannerStore((s) => s.tool);
    const initFrom = usePlannerStore((s) => s.initFrom);
    const finishDraw = usePlannerStore((s) => s.finishDraw);
    const setTool = usePlannerStore((s) => s.setTool);
    const clearSelection = usePlannerStore((s) => s.clearSelection);
    const deleteSelected = usePlannerStore((s) => s.deleteSelected);

    useEffect(() => {
        initFrom(window.__INITIAL_PLANNER__);
    }, [initFrom]);

    useEffect(() => {
        const onKey = (e) => {
            const tag = e.target?.tagName;
            const typing = tag === 'INPUT' || tag === 'TEXTAREA';
            if (e.key === 'Escape') {
                if (tool === TOOLS.DRAW_WALL) finishDraw();
                clearSelection();
            } else if ((e.key === 'Delete' || e.key === 'Backspace') && !typing) {
                deleteSelected();
            } else if (!typing && (e.key === 'v' || e.key === 'V')) {
                setTool(TOOLS.SELECT);
            } else if (!typing && (e.key === 'w' || e.key === 'W')) {
                setTool(TOOLS.DRAW_WALL);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [tool, finishDraw, clearSelection, deleteSelected, setTool]);

    if (!ready) {
        return <div className="planner-loading">Загрузка планировщика…</div>;
    }

    return (
        <div className="planner-root">
            <div className="planner-canvas">
                <Scene />
            </div>
            <Toolbar />
            <LevelPanel />
            <PropertiesPanel />
            <HelpHint />
        </div>
    );
}
