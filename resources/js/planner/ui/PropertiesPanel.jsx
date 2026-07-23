import React, { useState } from 'react';
import { usePlannerStore } from '../store/usePlannerStore';
import { distance2D, formatMeters, planAngle, radToDeg, normalizeDeg } from '../domain/geometry';

// Number input with its own draft text state so clearing/retyping doesn't collapse the value.
// Remount (via a `key` on the parent) resets it when a different wall is selected.
function NumberField({ label, value, min, step, onCommit }) {
    const [text, setText] = useState(String(value));
    return (
        <label className="planner-field">
            {label}
            <input
                type="number"
                min={min}
                step={step}
                value={text}
                onChange={(e) => {
                    setText(e.target.value);
                    const n = Number(e.target.value);
                    if (e.target.value !== '' && Number.isFinite(n)) onCommit(n);
                }}
            />
        </label>
    );
}

// Shows level wall stats and, when a wall is selected, lets you set its exact length/angle,
// straighten it, edit height/thickness, or delete it.
export default function PropertiesPanel() {
    const plan = usePlannerStore((s) => s.plan);
    const activeLevelId = usePlannerStore((s) => s.activeLevelId);
    const selectedWallId = usePlannerStore((s) => s.selectedWallId);
    const updateWall = usePlannerStore((s) => s.updateWall);
    const setWallLength = usePlannerStore((s) => s.setWallLength);
    const setWallAngle = usePlannerStore((s) => s.setWallAngle);
    const straightenWall = usePlannerStore((s) => s.straightenWall);
    const deleteWall = usePlannerStore((s) => s.deleteWall);

    const level = plan.levels.find((l) => l.id === activeLevelId);
    const walls = level?.walls ?? [];
    const wall = walls.find((w) => w.id === selectedWallId);
    const totalLength = walls.reduce((sum, w) => sum + distance2D(w.a, w.b), 0);

    const length = wall ? distance2D(wall.a, wall.b) : 0;
    const angleDeg = wall ? normalizeDeg(radToDeg(planAngle(wall.a, wall.b))) : 0;

    return (
        <div className="planner-panel planner-properties">
            <div className="planner-panel-title">Свойства</div>
            <div className="planner-prop-row">
                <span>Стен на этаже</span>
                <b>{walls.length}</b>
            </div>
            <div className="planner-prop-row">
                <span>Суммарная длина</span>
                <b>{formatMeters(totalLength)}</b>
            </div>

            {wall ? (
                <div className="planner-wall-edit" key={wall.id}>
                    <div className="planner-prop-sub">Выбранная стена</div>
                    <NumberField
                        label="Длина, м"
                        value={Math.round(length * 100) / 100}
                        min={0.05}
                        step={0.1}
                        onCommit={(v) => setWallLength(wall.id, v)}
                    />
                    <NumberField
                        label="Угол, °"
                        value={Math.round(angleDeg)}
                        min={0}
                        step={1}
                        onCommit={(v) => setWallAngle(wall.id, v)}
                    />
                    <button className="planner-btn planner-btn-wide" onClick={() => straightenWall(wall.id)}>
                        Выпрямить (к 15°)
                    </button>
                    <NumberField
                        label="Высота, м"
                        value={wall.height}
                        min={0.2}
                        step={0.1}
                        onCommit={(v) => updateWall(wall.id, { height: Math.max(0.2, v) })}
                    />
                    <NumberField
                        label="Толщина, м"
                        value={wall.thickness}
                        min={0.02}
                        step={0.01}
                        onCommit={(v) => updateWall(wall.id, { thickness: Math.max(0.02, v) })}
                    />
                    <button
                        className="planner-btn planner-btn-danger planner-btn-wide"
                        onClick={() => deleteWall(wall.id)}
                    >
                        Удалить стену
                    </button>
                </div>
            ) : (
                <div className="planner-empty-hint">Выберите стену, чтобы отредактировать её</div>
            )}
        </div>
    );
}
