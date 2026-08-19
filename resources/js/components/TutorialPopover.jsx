import React, { useEffect, useLayoutEffect, useState } from 'react';

const TutorialPopover = ({ anchorRef, scopeRef, open, onClose, children, maxWidth = 440, tipHeight = 92 }) => {
    const [position, setPosition] = useState(null);
    const [isRendered, setIsRendered] = useState(open);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        let frameId;
        let timeoutId;
        if (open) {
            setIsRendered(true);
            frameId = requestAnimationFrame(() => setIsVisible(true));
        } else {
            setIsVisible(false);
            timeoutId = window.setTimeout(() => setIsRendered(false), 180);
        }
        return () => {
            cancelAnimationFrame(frameId);
            window.clearTimeout(timeoutId);
        };
    }, [open]);

    useLayoutEffect(() => {
        if (!open) return undefined;
        const updatePosition = () => {
            const anchorRect = anchorRef.current?.getBoundingClientRect();
            const scopeRect = scopeRef.current?.getBoundingClientRect();
            if (!anchorRect || !scopeRect) return;

            const viewport = window.visualViewport;
            const viewportWidth = viewport?.width || window.innerWidth;
            const viewportHeight = viewport?.height || window.innerHeight;
            const viewportPadding = 12;
            const width = Math.min(maxWidth, scopeRect.width, viewportWidth - viewportPadding * 2);
            const left = Math.min(
                Math.max(viewportPadding - scopeRect.left, anchorRect.left - scopeRect.left),
                viewportWidth - viewportPadding - width - scopeRect.left,
            );
            const topAbove = anchorRect.top - scopeRect.top - tipHeight - 28;
            const topBelow = anchorRect.bottom - scopeRect.top + 28;
            const fitsAbove = topAbove + scopeRect.top >= viewportPadding;
            const fitsBelow = topBelow + scopeRect.top + tipHeight <= viewportHeight - viewportPadding;
            const placement = fitsAbove || !fitsBelow ? 'above' : 'below';
            const preferredTop = placement === 'above' ? topAbove : topBelow;
            const minTop = viewportPadding - scopeRect.top;
            const maxTop = viewportHeight - viewportPadding - tipHeight - scopeRect.top;
            const top = Math.min(Math.max(minTop, preferredTop), Math.max(minTop, maxTop));
            setPosition({
                left,
                top,
                width,
                lineStartX: anchorRect.left - scopeRect.left + anchorRect.width / 2,
                lineStartY: (placement === 'above' ? anchorRect.top : anchorRect.bottom) - scopeRect.top,
                lineEndX: left + 24,
                lineEndY: placement === 'above' ? top + tipHeight : top,
                lineBendY: placement === 'above' ? top + tipHeight + 7 : top - 7,
            });
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        window.visualViewport?.addEventListener('resize', updatePosition);
        window.visualViewport?.addEventListener('scroll', updatePosition);
        const observer = new ResizeObserver(updatePosition);
        if (anchorRef.current) observer.observe(anchorRef.current);
        if (scopeRef.current) observer.observe(scopeRef.current);
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
            window.visualViewport?.removeEventListener('resize', updatePosition);
            window.visualViewport?.removeEventListener('scroll', updatePosition);
            observer.disconnect();
        };
    }, [anchorRef, maxWidth, open, scopeRef, tipHeight]);

    if (!isRendered || !position) return null;

    return (
        <>
            <svg className={`tutorial-popover-line${isVisible ? ' is-visible' : ''}`} aria-hidden="true">
                <path d={`M ${position.lineStartX} ${position.lineStartY} V ${position.lineBendY} H ${position.lineEndX} V ${position.lineEndY}`} />
                <circle cx={position.lineStartX} cy={position.lineStartY} r="4" />
            </svg>
            <aside className={`tutorial-popover${isVisible ? ' is-visible' : ''}`} style={{ left: position.left, top: position.top, width: position.width, height: tipHeight }} role="status" aria-hidden={!isVisible}>
                <button type="button" className="tutorial-popover-close" onClick={onClose} aria-label="Закрыть подсказку">×</button>
                {children}
            </aside>
        </>
    );
};

export default TutorialPopover;
