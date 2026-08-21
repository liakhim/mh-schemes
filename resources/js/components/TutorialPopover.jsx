import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const getContentRect = (element) => {
    const fallbackRect = element?.getBoundingClientRect();
    if (!fallbackRect) return null;

    // У кнопок и полей дочерний span может покрывать только иконку или текст,
    // тогда как подсказка должна открывать весь интерактивный элемент.
    if (element.matches('button, input, textarea, select')) return fallbackRect;

    // Flex-контейнер anchor может занимать всю строку, хотя его содержимое
    // заметно уже. Маска должна выделять именно видимые дочерние элементы.
    const childRects = Array.from(element.children)
        .map((child) => child.getBoundingClientRect())
        .filter((rect) => rect.width > 0 && rect.height > 0);
    if (childRects.length === 0) return fallbackRect;

    return {
        left: Math.min(...childRects.map((rect) => rect.left)),
        top: Math.min(...childRects.map((rect) => rect.top)),
        right: Math.max(...childRects.map((rect) => rect.right)),
        bottom: Math.max(...childRects.map((rect) => rect.bottom)),
        get width() { return this.right - this.left; },
        get height() { return this.bottom - this.top; },
    };
};

const TutorialPopover = ({ anchorRef, highlightRef = null, highlightActive = true, scopeRef, open, onClose, title, description = 'Подробное описание подсказки', children, maxWidth = 440, showMask = false, type = null }) => {
    const [position, setPosition] = useState(null);
    const [isRendered, setIsRendered] = useState(open);
    const [isVisible, setIsVisible] = useState(false);
    const [popoverElement, setPopoverElement] = useState(null);
    const [isAttentionRequested, setIsAttentionRequested] = useState(false);
    const maskRef = useRef(null);
    const contentBlockerRef = useRef(null);

    useLayoutEffect(() => {
        setIsRendered(open);
        setIsVisible(open);
    }, [open]);

    useLayoutEffect(() => {
        if (!open) return undefined;
        const updatePosition = (maskOnly = false) => {
            const anchorRect = getContentRect(anchorRef.current);
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
            const layoutViewportHeight = Math.max(window.innerHeight, document.documentElement.clientHeight);
            const isKeyboardViewport = Boolean(viewport && viewportHeight < layoutViewportHeight - 120);
            const viewportPadding = 12;
            const maxPopoverWidth = viewportWidth <= 760 ? 360 : maxWidth;
            const width = Math.min(maxPopoverWidth, viewportWidth - viewportPadding * 2);
            const left = Math.min(
                Math.max(viewportPadding - scopeRect.left, anchorRect.left - scopeRect.left),
                viewportWidth - viewportPadding - width - scopeRect.left,
            );
            const popoverHeight = popoverElement?.getBoundingClientRect().height || 0;
            // Подсказка всегда находится над активным элементом. Она не меняет
            // сторону размещения в зависимости от видимой области экрана.
            const top = anchorRect.top - scopeRect.top - popoverHeight - 40;
            const nextPosition = {
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
                    viewportPageLeft,
                    viewportPageTop,
                    isKeyboardViewport,
                },
            };
            const maskLeft = nextPosition.mask.left + nextPosition.mask.viewportOffsetLeft
                + (nextPosition.mask.isKeyboardViewport ? 0 : nextPosition.mask.viewportPageLeft);
            const maskTop = nextPosition.mask.top + nextPosition.mask.viewportOffsetTop
                + (nextPosition.mask.isKeyboardViewport ? 0 : nextPosition.mask.viewportPageTop);
            const maskStyle = {
                position: nextPosition.mask.isKeyboardViewport ? 'fixed' : 'absolute',
                left: `${maskLeft}px`,
                top: `${maskTop}px`,
                width: `${nextPosition.mask.right - nextPosition.mask.left}px`,
                height: `${nextPosition.mask.bottom - nextPosition.mask.top}px`,
            };
            [maskRef.current, contentBlockerRef.current].filter(Boolean).forEach((element) => {
                Object.assign(element.style, maskStyle);
            });
            if (!maskOnly) setPosition(nextPosition);
        };

        let frameId;
        const schedulePositionUpdate = () => {
            cancelAnimationFrame(frameId);
            frameId = requestAnimationFrame(updatePosition);
        };
        const syncMaskOnScroll = () => {
            updatePosition(true);
            schedulePositionUpdate();
        };

        updatePosition();
        window.addEventListener('resize', schedulePositionUpdate);
        window.addEventListener('scroll', syncMaskOnScroll, true);
        window.visualViewport?.addEventListener('resize', schedulePositionUpdate);
        window.visualViewport?.addEventListener('scroll', syncMaskOnScroll);
        const observer = new ResizeObserver(schedulePositionUpdate);
        if (anchorRef.current) observer.observe(anchorRef.current);
        if (scopeRef.current) observer.observe(scopeRef.current);
        if (popoverElement) observer.observe(popoverElement);
        return () => {
            cancelAnimationFrame(frameId);
            window.removeEventListener('resize', schedulePositionUpdate);
            window.removeEventListener('scroll', syncMaskOnScroll, true);
            window.visualViewport?.removeEventListener('resize', schedulePositionUpdate);
            window.visualViewport?.removeEventListener('scroll', syncMaskOnScroll);
            observer.disconnect();
        };
    }, [anchorRef, highlightActive, maxWidth, open, popoverElement, scopeRef]);

    if (!isRendered || !position) return null;

    const mask = position.mask;
    const maskLeft = mask.left + mask.viewportOffsetLeft + (mask.isKeyboardViewport ? 0 : mask.viewportPageLeft);
    const maskTop = mask.top + mask.viewportOffsetTop + (mask.isKeyboardViewport ? 0 : mask.viewportPageTop);
    return createPortal((
        <>
            {showMask && (
                <div
                    ref={maskRef}
                    className={`tutorial-popover-mask${isVisible ? '' : ' is-solid'}`}
                    aria-hidden="true"
                    style={isVisible ? {
                        position: mask.isKeyboardViewport ? 'fixed' : 'absolute',
                        left: maskLeft,
                        top: maskTop,
                        width: mask.right - mask.left,
                        height: mask.bottom - mask.top,
                    } : undefined}
                />
            )}
            {type === 'blockContent' && (
                <div
                    ref={contentBlockerRef}
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
                {description && <p className="tutorial-popover-description">{description}</p>}
                {children}
            </aside>
        </>
    ), document.body);
};

export default TutorialPopover;
