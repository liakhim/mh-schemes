import React, { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const TutorialPopover = ({ anchorRef, highlightRef = null, highlightActive = true, scopeRef, open, onClose, title, description = 'Подробное описание подсказки', children, maxWidth = 440, showMask = false, type = null }) => {
    const [position, setPosition] = useState(null);
    const [isRendered, setIsRendered] = useState(open);
    const [isVisible, setIsVisible] = useState(false);
    const [popoverElement, setPopoverElement] = useState(null);
    const [isAttentionRequested, setIsAttentionRequested] = useState(false);

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
            const viewportPageLeft = viewport?.pageLeft ?? window.scrollX;
            const viewportPageTop = viewport?.pageTop ?? window.scrollY;
            const viewportOffsetLeft = viewport?.offsetLeft || 0;
            const viewportOffsetTop = viewport?.offsetTop || 0;
            const viewportPadding = 12;
            const width = Math.min(maxWidth, scopeRect.width, viewportWidth - viewportPadding * 2);
            const left = Math.min(
                Math.max(viewportPadding - scopeRect.left, anchorRect.left - scopeRect.left),
                viewportWidth - viewportPadding - width - scopeRect.left,
            );
            const popoverHeight = popoverElement?.getBoundingClientRect().height || 0;
            // Подсказка всегда находится над активным элементом. Она не меняет
            // сторону размещения в зависимости от видимой области экрана.
            const top = anchorRect.top - scopeRect.top - popoverHeight - 40;
            setPosition({
                left,
                top,
                width,
                popoverLeft: viewportPageLeft + scopeRect.left + left,
                popoverTop: viewportPageTop + scopeRect.top + top,
                lineStartX: viewportPageLeft + anchorRect.left + anchorRect.width / 2,
                lineStartY: viewportPageTop + anchorRect.top,
                lineEndX: viewportPageLeft + scopeRect.left + left + 24,
                lineEndY: viewportPageTop + scopeRect.top + top + popoverHeight,
                lineBendY: viewportPageTop + scopeRect.top + top + popoverHeight + 16,
                mask: {
                    left: Math.max(0, maskRect.left - 8),
                    top: Math.max(0, maskRect.top - 8),
                    right: Math.min(viewportWidth, maskRect.right + 8),
                    bottom: Math.min(viewportHeight, maskRect.bottom + 8),
                    viewportOffsetLeft,
                    viewportOffsetTop,
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
        if (popoverElement) observer.observe(popoverElement);
        return () => {
            cancelAnimationFrame(frameId);
            window.removeEventListener('resize', schedulePositionUpdate);
            window.removeEventListener('scroll', schedulePositionUpdate, true);
            window.visualViewport?.removeEventListener('resize', schedulePositionUpdate);
            window.visualViewport?.removeEventListener('scroll', schedulePositionUpdate);
            observer.disconnect();
        };
    }, [anchorRef, highlightActive, maxWidth, open, popoverElement, scopeRef]);

    if (!isRendered || !position) return null;

    const mask = position.mask;
    return createPortal((
        <>
            {showMask && (
                <div
                    className={`tutorial-popover-mask${isVisible ? '' : ' is-solid'}`}
                    aria-hidden="true"
                    style={isVisible ? {
                        left: mask.left + mask.viewportOffsetLeft,
                        top: mask.top + mask.viewportOffsetTop,
                        width: mask.right - mask.left,
                        height: mask.bottom - mask.top,
                    } : undefined}
                />
            )}
            {type === 'blockContent' && (
                <div
                    className="tutorial-popover-content-blocker"
                    aria-hidden="true"
                    onClick={() => {
                        setIsAttentionRequested(false);
                        requestAnimationFrame(() => setIsAttentionRequested(true));
                    }}
                    style={{
                        left: mask.left + mask.viewportOffsetLeft,
                        top: mask.top + mask.viewportOffsetTop,
                        width: mask.right - mask.left,
                        height: mask.bottom - mask.top,
                    }}
                />
            )}
            <svg className={`tutorial-popover-line${isVisible ? ' is-visible' : ''}`} aria-hidden="true">
                <path d={`M ${position.lineStartX} ${position.lineStartY} V ${position.lineBendY} H ${position.lineEndX} V ${position.lineEndY}`} />
                <circle cx={position.lineStartX} cy={position.lineStartY} r="4" />
                <circle cx={position.lineEndX} cy={position.lineEndY} r="4" />
            </svg>
            <aside
                ref={setPopoverElement}
                className={`tutorial-popover${isVisible ? ' is-visible' : ''}${isAttentionRequested ? ' is-attention-requested' : ''}`}
                style={{ left: position.popoverLeft, top: position.popoverTop, width: position.width }}
                role="status"
                aria-hidden={!isVisible}
                onAnimationEnd={(event) => {
                    if (event.animationName === 'tutorial-popover-attention') setIsAttentionRequested(false);
                }}
            >
                <button type="button" className="tutorial-popover-close" onClick={onClose} aria-label="Закрыть подсказку"><span aria-hidden="true">×</span></button>
                <div className="tutorial-popover-title">{title}</div>
                <p className="tutorial-popover-description">{description}</p>
                {children}
            </aside>
        </>
    ), document.body);
};

export default TutorialPopover;
