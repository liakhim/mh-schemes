import React from 'react';
import { usePlannerStore, TOOLS, CAMERA, BG } from '../store/usePlannerStore';

const cls = (active) => `planner-btn${active ? ' planner-btn-active' : ''}`;

export default function Toolbar() {
    const tool = usePlannerStore((s) => s.tool);
    const setTool = usePlannerStore((s) => s.setTool);
    const cameraMode = usePlannerStore((s) => s.cameraMode);
    const setCameraMode = usePlannerStore((s) => s.setCameraMode);
    const bgMode = usePlannerStore((s) => s.bgMode);
    const setBgMode = usePlannerStore((s) => s.setBgMode);
    const snapEnabled = usePlannerStore((s) => s.snapEnabled);
    const toggleSnap = usePlannerStore((s) => s.toggleSnap);
    const angleSnapEnabled = usePlannerStore((s) => s.angleSnapEnabled);
    const toggleAngleSnap = usePlannerStore((s) => s.toggleAngleSnap);
    const save = usePlannerStore((s) => s.save);
    const saving = usePlannerStore((s) => s.saving);
    const dirty = usePlannerStore((s) => s.dirty);
    const saveError = usePlannerStore((s) => s.saveError);
    const scheme = usePlannerStore((s) => s.scheme);

    return (
        <div className="planner-toolbar">
            <div className="planner-brand">
                <span className="planner-brand-title">3D планировщик</span>
                <span className="planner-brand-sub">{scheme?.name ?? 'Черновик (без схемы)'}</span>
            </div>

            <div className="planner-group">
                <button className={cls(tool === TOOLS.SELECT)} onClick={() => setTool(TOOLS.SELECT)} title="Выбор (V)">
                    Выбор
                </button>
                <button className={cls(tool === TOOLS.DRAW_WALL)} onClick={() => setTool(TOOLS.DRAW_WALL)} title="Рисовать стены (W)">
                    Стены
                </button>
            </div>

            <div className="planner-group">
                <button className={cls(cameraMode === CAMERA.PERSPECTIVE)} onClick={() => setCameraMode(CAMERA.PERSPECTIVE)}>
                    3D
                </button>
                <button className={cls(cameraMode === CAMERA.TOP)} onClick={() => setCameraMode(CAMERA.TOP)}>
                    Сверху
                </button>
            </div>

            <div className="planner-group" title="Фон сцены">
                <button className={cls(bgMode === BG.LIGHT)} onClick={() => setBgMode(BG.LIGHT)}>
                    Белый фон
                </button>
                <button className={cls(bgMode === BG.DARK)} onClick={() => setBgMode(BG.DARK)}>
                    Тёмный
                </button>
            </div>

            <div className="planner-group">
                <button className={cls(snapEnabled)} onClick={toggleSnap} title="Привязка к сетке 0.1 м">
                    Сетка
                </button>
                <button className={cls(angleSnapEnabled)} onClick={toggleAngleSnap} title="Прямые стены: привязка направления к углу 15°">
                    Угол
                </button>
            </div>

            <div className="planner-group planner-group-right">
                {saveError && (
                    <span className="planner-save-error" title={saveError}>
                        Ошибка сохранения
                    </span>
                )}
                <button className="planner-btn planner-btn-primary" onClick={save} disabled={saving}>
                    {saving ? 'Сохранение…' : dirty ? 'Сохранить *' : 'Сохранено'}
                </button>
            </div>
        </div>
    );
}
