import React, { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const TutorialPopover = ({ anchorRef, highlightRef = null, highlightActive = true, scopeRef, open, onClose, title, description = 'Подробное описание подсказки', children, maxWidth = 440, tipHeight = 100, showMask = false }) => {
    const [position, setPosition] = useState(null);
    const [isRendered, setIsRendered] = useState(open);
    const [isVisible, setIsVisible] = useState(false);

    useLayoutEffect(() => {
        setIsRendered(open);
        setIsVisible(open);
    }, [open]);

    useLayoutEffect(() => {
        if (!open) return undefined;
        const updatePosition = () => {
            const anchorRect = anchorRef.current?.getBoundingClientRect();
            const scopeRect = scopeRef.current?.getBoundingClientRect();
            if (!anchorRect || !scopeRect) return;
            const highlightRect = highlightActive ? highlightRef?.current?.getBoundingClientRect() : null;
            const maskRect = highlightRect ? {
                left: Math.min(anchorRect.left, highlightRect.left),
                top: Math.min(anchorRect.top, highlightRect.top),
                right: Math.max(anchorRect.right, highlightRect.right),
                bottom: Math.max(anchorRect.bottom, highlightRect.bottom),
            } : anchorRect;

            const viewport = window.visualViewport;
            const viewportWidth = viewport?.width || window.innerWidth;
            const viewportHeight = viewport?.height || window.innerHeight;
            const viewportPadding = 12;
            const width = Math.min(maxWidth, scopeRect.width, viewportWidth - viewportPadding * 2);
            const left = Math.min(
                Math.max(viewportPadding - scopeRect.left, anchorRect.left - scopeRect.left),
                viewportWidth - viewportPadding - width - scopeRect.left,
            );
            const topAbove = anchorRect.top - scopeRect.top - tipHeight - 40;
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
                viewportLeft: scopeRect.left + left,
                viewportTop: scopeRect.top + top,
                lineStartX: anchorRect.left + anchorRect.width / 2,
                lineStartY: placement === 'above' ? anchorRect.top : anchorRect.bottom,
                lineEndX: scopeRect.left + left + 24,
                lineEndY: scopeRect.top + (placement === 'above' ? top + tipHeight : top),
                lineBendY: scopeRect.top + (placement === 'above' ? top + tipHeight + 16 : top - 16),
                mask: {
                    left: Math.max(0, maskRect.left - 8),
                    top: Math.max(0, maskRect.top - 8),
                    right: Math.min(viewportWidth, maskRect.right + 8),
                    bottom: Math.min(viewportHeight, maskRect.bottom + 8),
                },
            });
        };

        let frameId;
        const schedulePositionUpdate = () => {
            cancelAnimationFrame(frameId);
            frameId = requestAnimationFrame(updatePosition);
        };

        updatePosition();
        window.addEventListener('resize', schedulePositionUpdate);
        window.addEventListener('scroll', schedulePositionUpdate, true);
        window.visualViewport?.addEventListener('resize', schedulePositionUpdate);
        window.visualViewport?.addEventListener('scroll', schedulePositionUpdate);
        const observer = new ResizeObserver(schedulePositionUpdate);
        if (anchorRef.current) observer.observe(anchorRef.current);
        if (scopeRef.current) observer.observe(scopeRef.current);
        return () => {
            cancelAnimationFrame(frameId);
            window.removeEventListener('resize', schedulePositionUpdate);
            window.removeEventListener('scroll', schedulePositionUpdate, true);
            window.visualViewport?.removeEventListener('resize', schedulePositionUpdate);
            window.visualViewport?.removeEventListener('scroll', schedulePositionUpdate);
            observer.disconnect();
        };
    }, [anchorRef, highlightActive, maxWidth, open, scopeRef, tipHeight]);

    if (!isRendered || !position) return null;

    const mask = position.mask;
    return createPortal((
        <>
            {showMask && (
                <div
                    className={`tutorial-popover-mask${isVisible ? '' : ' is-solid'}`}
                    aria-hidden="true"
                    style={isVisible ? {
                        left: mask.left,
                        top: mask.top,
                        width: mask.right - mask.left,
                        height: mask.bottom - mask.top,
                    } : undefined}
                />
            )}
            <svg className={`tutorial-popover-line${isVisible ? ' is-visible' : ''}`} aria-hidden="true">
                <path d={`M ${position.lineStartX} ${position.lineStartY} V ${position.lineBendY} H ${position.lineEndX} V ${position.lineEndY}`} />
                <circle cx={position.lineStartX} cy={position.lineStartY} r="4" />
                <circle cx={position.lineEndX} cy={position.lineEndY} r="4" />
            </svg>
            <aside className={`tutorial-popover${isVisible ? ' is-visible' : ''}`} style={{ left: position.viewportLeft, top: position.viewportTop, width: position.width, height: tipHeight }} role="status" aria-hidden={!isVisible}>
                <button type="button" className="tutorial-popover-close" onClick={onClose} aria-label="Закрыть подсказку"><span aria-hidden="true">×</span></button>
                <div className="tutorial-popover-title">{title}</div>
                <p className="tutorial-popover-description">{description}</p>
                {children}
            </aside>
        </>
    ), document.body);
};

export default TutorialPopover;
