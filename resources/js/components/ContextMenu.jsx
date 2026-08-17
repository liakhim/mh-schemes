import React, { useEffect } from 'react';

const ContextMenu = ({ position, onClose, children }) => {
    useEffect(() => {
        if (!position) return undefined;
        const onKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [position, onClose]);

    if (!position) return null;

    return (
        <div className="ctx-menu-backdrop" onClick={onClose}>
            <div
                className="ctx-menu"
                role="menu"
                style={{ left: position.x, top: position.y }}
                onClick={(event) => event.stopPropagation()}
            >
                {children}
                <div className="ctx-menu-sep" />
                <button className="ctx-menu-item" type="button" role="menuitem" onClick={onClose}>Cancel</button>
            </div>
        </div>
    );
};

export default ContextMenu;
