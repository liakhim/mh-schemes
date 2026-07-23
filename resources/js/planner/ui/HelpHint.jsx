import React from 'react';
import { usePlannerStore, TOOLS } from '../store/usePlannerStore';

export default function HelpHint() {
    const tool = usePlannerStore((s) => s.tool);
    if (tool !== TOOLS.DRAW_WALL) return null;

    return (
        <div className="planner-help">
            Клик — поставить точку стены, продолжайте цепочку · <b>ПКМ / Esc</b> — завершить · колесо — зум · перетаскивание — орбита
        </div>
    );
}
