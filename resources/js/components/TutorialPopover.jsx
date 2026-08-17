import React, { useLayoutEffect, useState } from 'react';

const TutorialPopover = ({ anchorRef, scopeRef, open, onClose, children, maxWidth = 440, tipHeight = 92 }) => {
    const [position, setPosition] = useState(null);

    useLayoutEffect(() => {
        if (!open) return undefined;
        const updatePosition = () => {
            const anchorRect = anchorRef.current?.getBoundingClientRect();
            const scopeRect = scopeRef.current?.getBoundingClientRect();
            if (!anchorRect || !scopeRect) return;

            const width = Math.min(maxWidth, scopeRect.width);
            const left = Math.min(
                Math.max(0, anchorRect.left - scopeRect.left),
                Math.max(0, scopeRect.width - width),
            );
            const top = anchorRect.top - scopeRect.top - tipHeight - 28;
            setPosition({
                left,
                top,
                width,
                lineStartX: anchorRect.left - scopeRect.left + anchorRect.width / 2,
                lineStartY: anchorRect.top - scopeRect.top,
                lineEndX: left + 24,
                lineEndY: top + tipHeight,
            });
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        const observer = new ResizeObserver(updatePosition);
        if (anchorRef.current) observer.observe(anchorRef.current);
        if (scopeRef.current) observer.observe(scopeRef.current);
        return () => {
            window.removeEventListener('resize', updatePosition);
            observer.disconnect();
        };
    }, [anchorRef, maxWidth, open, scopeRef, tipHeight]);

    if (!open || !position) return null;

    return (
        <>
            <svg className="tutorial-popover-line" aria-hidden="true">
                <path d={`M ${position.lineStartX} ${position.lineStartY} V ${position.lineEndY + 7} H ${position.lineEndX} V ${position.lineEndY}`} />
                <circle cx={position.lineStartX} cy={position.lineStartY} r="4" />
            </svg>
            <aside className="tutorial-popover" style={{ left: position.left, top: position.top, width: position.width, height: tipHeight }} role="status">
                <button type="button" className="tutorial-popover-close" onClick={onClose} aria-label="Закрыть подсказку">×</button>
                {children}
            </aside>
        </>
    );
};

export default TutorialPopover;
