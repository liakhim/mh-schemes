import React from 'react';
import { usePlannerStore } from '../store/usePlannerStore';
import { distance2D, formatMeters } from '../domain/geometry';

// Shows level wall stats and, when a wall is selected, lets you edit height/thickness or delete it.
export default function PropertiesPanel() {
    const plan = usePlannerStore((s) => s.plan);
    const activeLevelId = usePlannerStore((s) => s.activeLevelId);
    const selectedWallId = usePlannerStore((s) => s.selectedWallId);
    const updateWall = usePlannerStore((s) => s.updateWall);
    const deleteWall = usePlannerStore((s) => s.deleteWall);

    const level = plan.levels.find((l) => l.id === activeLevelId);
    const walls = level?.walls ?? [];
    const wall = walls.find((w) => w.id === selectedWallId);
    const totalLength = walls.reduce((sum, w) => sum + distance2D(w.a, w.b), 0);

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
                <div className="planner-wall-edit">
                    <div className="planner-prop-sub">Выбранная стена</div>
                    <div className="planner-prop-row">
                        <span>Длина</span>
                        <b>{formatMeters(distance2D(wall.a, wall.b))}</b>
                    </div>
                    <label className="planner-field">
                        Высота, м
                        <input
                            type="number"
                            min="0.2"
                            step="0.1"
                            value={wall.height}
                            onChange={(e) =>
                                updateWall(wall.id, { height: Math.max(0.2, Number(e.target.value) || wall.height) })
                            }
                        />
                    </label>
                    <label className="planner-field">
                        Толщина, м
                        <input
                            type="number"
                            min="0.02"
                            step="0.01"
                            value={wall.thickness}
                            onChange={(e) =>
                                updateWall(wall.id, {
                                    thickness: Math.max(0.02, Number(e.target.value) || wall.thickness),
                                })
                            }
                        />
                    </label>
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
