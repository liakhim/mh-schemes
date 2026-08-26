import React, { useEffect, useRef } from 'react';
import ModalCloseButton from './ModalCloseButton';

const Modal = ({ children, className = '', labelledBy, onClose, showClose = true }) => {
    const dialogRef = useRef(null);

    useEffect(() => {
        const previousFocus = document.activeElement;
        const onKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };

        document.addEventListener('keydown', onKeyDown);
        dialogRef.current?.focus();
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            previousFocus?.focus?.();
        };
    }, [onClose]);

    return (
        <div className="ui-modal-backdrop" onMouseDown={onClose}>
            <div
                ref={dialogRef}
                className={`ui-modal ${className}`.trim()}
                role="dialog"
                aria-modal="true"
                aria-labelledby={labelledBy}
                tabIndex={-1}
                onMouseDown={(event) => event.stopPropagation()}
            >
                {showClose && <ModalCloseButton className="ui-modal-close" onClick={onClose} />}
                {children}
            </div>
        </div>
    );
};

export default Modal;
