import React from 'react';
import { usePlannerStore } from '../store/usePlannerStore';
import { formatMeters } from '../domain/geometry';

// Multi-storey control: switch, rename, add, remove floors and set floor height.
export default function LevelPanel() {
    const levels = usePlannerStore((s) => s.plan.levels);
    const activeLevelId = usePlannerStore((s) => s.activeLevelId);
    const setActiveLevel = usePlannerStore((s) => s.setActiveLevel);
    const addLevel = usePlannerStore((s) => s.addLevel);
    const removeLevel = usePlannerStore((s) => s.removeLevel);
    const renameLevel = usePlannerStore((s) => s.renameLevel);
    const setLevelHeight = usePlannerStore((s) => s.setLevelHeight);

    return (
        <div className="planner-panel planner-levels">
            <div className="planner-panel-title">Этажи</div>
            <div className="planner-level-list">
                {[...levels].reverse().map((level) => {
                    const active = level.id === activeLevelId;
                    return (
                        <div
                            key={level.id}
                            className={`planner-level${active ? ' planner-level-active' : ''}`}
                            onClick={() => setActiveLevel(level.id)}
                        >
                            <input
                                className="planner-level-name"
                                value={level.name}
                                onChange={(e) => renameLevel(level.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                            <div className="planner-level-meta">
                                <label className="planner-level-height">
                                    H
                                    <input
                                        type="number"
                                        min="0.2"
                                        step="0.1"
                                        value={level.height}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => setLevelHeight(level.id, e.target.value)}
                                    />
                                </label>
                                <span className="planner-level-elev" title="Отметка пола">
                                    ↑ {formatMeters(level.elevation)}
                                </span>
                                {levels.length > 1 && (
                                    <button
                                        className="planner-icon-btn"
                                        title="Удалить этаж"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeLevel(level.id);
                                        }}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            <button className="planner-btn planner-btn-wide" onClick={addLevel}>
                + Добавить этаж
            </button>
        </div>
    );
}
