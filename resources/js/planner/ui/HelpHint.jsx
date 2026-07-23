import React from 'react';
import { usePlannerStore, TOOLS } from '../store/usePlannerStore';

export default function HelpHint() {
    const tool = usePlannerStore((s) => s.tool);
    if (tool !== TOOLS.DRAW_WALL) return null;

    return (
        <div className="planner-help">
            Клик — точка стены (направление привязано к углу 15°, концы липнут к точкам) · продолжайте цепочку · <b>ПКМ / Esc</b> — завершить
        </div>
    );
}
