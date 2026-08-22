import React, { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const VIEWPORT_PADDING = 12;
const POPOVER_GAP = 40;
const HIGHLIGHT_PADDING = 8;
const MOBILE_BREAKPOINT = 760;
const MOBILE_MAX_WIDTH = 360;
const KEYBOARD_VIEWPORT_DELTA = 120;

const getViewportMetrics = () => {
    const viewport = window.visualViewport;
    const height = viewport?.height || window.innerHeight;
    const layoutHeight = Math.max(window.innerHeight, document.documentElement.clientHeight);

    return {
        width: viewport?.width || window.innerWidth,
        height,
        pageLeft: viewport?.pageLeft ?? window.scrollX,
        pageTop: viewport?.pageTop ?? window.scrollY,
        offsetLeft: viewport?.offsetLeft || 0,
        offsetTop: viewport?.offsetTop || 0,
        isKeyboardViewport: Boolean(viewport && height < layoutHeight - KEYBOARD_VIEWPORT_DELTA),
    };
};

const getContentRect = (element) => {
    const fallbackRect = element?.getBoundingClientRect();
    if (!fallbackRect) return null;

    // У кнопок и полей дочерний span может покрывать только иконку или текст,
    // тогда как подсказка должна открывать весь интерактивный элемент.
    if (element.matches('button, input, textarea, select, label')) return fallbackRect;

    // Flex-контейнер anchor может занимать всю строку, хотя его содержимое
    // заметно уже. Маска должна выделять именно видимые дочерние элементы.
    const childRects = Array.from(element.children)
        .map((child) => child.getBoundingClientRect())
        .filter((rect) => rect.width > 0 && rect.height > 0);
    if (childRects.length === 0) return fallbackRect;

    const left = Math.max(fallbackRect.left, Math.min(...childRects.map((rect) => rect.left)));
    const top = Math.max(fallbackRect.top, Math.min(...childRects.map((rect) => rect.top)));
    const right = Math.min(fallbackRect.right, Math.max(...childRects.map((rect) => rect.right)));
    const bottom = Math.min(fallbackRect.bottom, Math.max(...childRects.map((rect) => rect.bottom)));

    return {
        // Потомки scroll-контейнера могут выходить за его видимую область.
        // Маска не должна открывать строки, скрытые overflow-границами.
        left,
        top,
        right,
        bottom,
        width: right - left,
        height: bottom - top,
    };
};

const TutorialPopover = ({ anchorRef, highlightRef = null, highlightRefs = [], highlightActive = true, scopeRef, open, onClose, title, description = null, children, maxWidth = 440, showMask = false, type = null }) => {
    const [position, setPosition] = useState(null);
    const [popoverElement, setPopoverElement] = useState(null);
    const [isAttentionRequested, setIsAttentionRequested] = useState(false);

    useLayoutEffect(() => {
        if (!open) return undefined;
        const frameId = requestAnimationFrame(() => {
            const anchorRect = getContentRect(anchorRef.current);
            if (!anchorRect) return;
            const viewport = getViewportMetrics();
            const popoverHeight = popoverElement?.getBoundingClientRect().height || 0;
            const desiredTop = anchorRect.top - popoverHeight - POPOVER_GAP;
            const safeTop = viewport.offsetTop + VIEWPORT_PADDING;
            const safeBottom = viewport.offsetTop + viewport.height - VIEWPORT_PADDING;
            if (desiredTop < safeTop || desiredTop + popoverHeight > safeBottom) {
                anchorRef.current?.scrollIntoView({ block: 'center', inline: 'nearest' });
            }
        });
        return () => cancelAnimationFrame(frameId);
    }, [anchorRef, open, popoverElement, title]);

    useLayoutEffect(() => {
        if (!open) return undefined;
        const updatePosition = () => {
            const anchorRect = getContentRect(anchorRef.current);
            const scopeRect = scopeRef.current?.getBoundingClientRect();
            if (!anchorRect || !scopeRect) return;
            const highlightRects = highlightActive
                ? [highlightRef, ...highlightRefs].map((ref) => getContentRect(ref?.current)).filter(Boolean)
                : [];
            const maskRect = highlightRects.length > 0 ? {
                left: Math.min(anchorRect.left, ...highlightRects.map((rect) => rect.left)),
                top: Math.min(anchorRect.top, ...highlightRects.map((rect) => rect.top)),
                right: Math.max(anchorRect.right, ...highlightRects.map((rect) => rect.right)),
                bottom: Math.max(anchorRect.bottom, ...highlightRects.map((rect) => rect.bottom)),
            } : anchorRect;

            const viewport = getViewportMetrics();
            const maxPopoverWidth = viewport.width <= MOBILE_BREAKPOINT ? MOBILE_MAX_WIDTH : maxWidth;
            const width = Math.min(maxPopoverWidth, viewport.width - VIEWPORT_PADDING * 2);
            const left = Math.min(
                Math.max(VIEWPORT_PADDING - scopeRect.left, anchorRect.left - scopeRect.left),
                viewport.width - VIEWPORT_PADDING - width - scopeRect.left,
            );
            const popoverHeight = popoverElement?.getBoundingClientRect().height || 0;
            const safeViewportTop = viewport.offsetTop + VIEWPORT_PADDING;
            const safeViewportBottom = viewport.offsetTop + viewport.height - VIEWPORT_PADDING;
            const desiredViewportTop = anchorRect.top - popoverHeight - POPOVER_GAP;
            const isPopoverInViewport = popoverHeight === 0 || (
                desiredViewportTop >= safeViewportTop
                && desiredViewportTop + popoverHeight <= safeViewportBottom
            );
            const top = desiredViewportTop - scopeRect.top;
            const nextPosition = {
                left,
                top,
                width,
                popoverLeft: viewport.pageLeft + scopeRect.left + left,
                popoverTop: viewport.pageTop + scopeRect.top + top,
                lineStartX: viewport.pageLeft + anchorRect.left + anchorRect.width / 2,
                lineStartY: viewport.pageTop + anchorRect.top,
                lineEndX: viewport.pageLeft + scopeRect.left + left + 24,
                lineEndY: viewport.pageTop + scopeRect.top + top + popoverHeight,
                lineBendY: viewport.pageTop + scopeRect.top + top + popoverHeight + 16,
                isPopoverInViewport,
                mask: {
                    left: Math.max(0, maskRect.left - HIGHLIGHT_PADDING),
                    top: Math.max(0, maskRect.top - HIGHLIGHT_PADDING),
                    right: Math.min(viewport.width, maskRect.right + HIGHLIGHT_PADDING),
                    bottom: Math.min(viewport.height, maskRect.bottom + HIGHLIGHT_PADDING),
                    viewportOffsetLeft: viewport.offsetLeft,
                    viewportOffsetTop: viewport.offsetTop,
                    viewportPageLeft: viewport.pageLeft,
                    viewportPageTop: viewport.pageTop,
                    isKeyboardViewport: viewport.isKeyboardViewport,
                },
            };
            setPosition(nextPosition);
        };

        let frameId;
        const schedulePositionUpdate = () => {
            cancelAnimationFrame(frameId);
            frameId = requestAnimationFrame(() => updatePosition());
        };
        updatePosition();
        window.addEventListener('resize', schedulePositionUpdate);
        document.addEventListener('scroll', schedulePositionUpdate, true);
        window.visualViewport?.addEventListener('resize', schedulePositionUpdate);
        window.visualViewport?.addEventListener('scroll', schedulePositionUpdate);
        const observer = new ResizeObserver(schedulePositionUpdate);
        if (anchorRef.current) observer.observe(anchorRef.current);
        if (scopeRef.current) observer.observe(scopeRef.current);
        if (popoverElement) observer.observe(popoverElement);
        return () => {
            cancelAnimationFrame(frameId);
            window.removeEventListener('resize', schedulePositionUpdate);
            document.removeEventListener('scroll', schedulePositionUpdate, true);
            window.visualViewport?.removeEventListener('resize', schedulePositionUpdate);
            window.visualViewport?.removeEventListener('scroll', schedulePositionUpdate);
            observer.disconnect();
        };
    }, [anchorRef, highlightActive, highlightRef, maxWidth, open, popoverElement, scopeRef]);

    if (!open || !position) return null;

    const mask = position.mask;
    const showPopover = position.isPopoverInViewport;
    const maskLeft = mask.left + mask.viewportOffsetLeft + (mask.isKeyboardViewport ? 0 : mask.viewportPageLeft);
    const maskTop = mask.top + mask.viewportOffsetTop + (mask.isKeyboardViewport ? 0 : mask.viewportPageTop);
    return createPortal((
        <>
            {showMask && (
                <div
                    className={`tutorial-popover-mask${showPopover ? '' : ' is-solid'}`}
                    aria-hidden="true"
                    style={showPopover ? {
                        position: mask.isKeyboardViewport ? 'fixed' : 'absolute',
                        left: maskLeft,
                        top: maskTop,
                        width: mask.right - mask.left,
                        height: mask.bottom - mask.top,
                    } : undefined}
                />
            )}
            {type === 'blockContent' && showPopover && (
                <div
                    className="tutorial-popover-content-blocker"
                    aria-hidden="true"
                    onClick={() => {
                        setIsAttentionRequested(false);
                        requestAnimationFrame(() => setIsAttentionRequested(true));
                    }}
                    style={{
                        position: mask.isKeyboardViewport ? 'fixed' : 'absolute',
                        left: maskLeft,
                        top: maskTop,
                        width: mask.right - mask.left,
                        height: mask.bottom - mask.top,
                    }}
                />
            )}
            <svg className={`tutorial-popover-line${showPopover ? ' is-visible' : ''}`} aria-hidden="true">
                <path d={`M ${position.lineStartX} ${position.lineStartY} V ${position.lineBendY} H ${position.lineEndX} V ${position.lineEndY}`} />
                <circle cx={position.lineStartX} cy={position.lineStartY} r="4" />
                <circle cx={position.lineEndX} cy={position.lineEndY} r="4" />
            </svg>
            <aside
                ref={setPopoverElement}
                className={`tutorial-popover${showPopover ? ' is-visible' : ''}${isAttentionRequested ? ' is-attention-requested' : ''}`}
                style={{ left: position.popoverLeft, top: position.popoverTop, width: position.width }}
                role="status"
                aria-hidden={!showPopover}
                onAnimationEnd={(event) => {
                    if (event.animationName === 'tutorial-popover-attention') setIsAttentionRequested(false);
                }}
            >
                <button type="button" className="tutorial-popover-close" onClick={onClose} aria-label="Закрыть подсказку"><span aria-hidden="true">×</span></button>
                <div className="tutorial-popover-title">{title}</div>
                {description && <p className="tutorial-popover-description">{description}</p>}
                {children}
            </aside>
        </>
    ), document.body);
};

export default TutorialPopover;
