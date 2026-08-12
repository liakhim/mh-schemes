import React from 'react';

const SlotContextMenu = ({ position, onClose, children }) => {
    if (!position) return null;

    return (
        <div className="ctx-menu-backdrop" onClick={onClose}>
            <div
                className="ctx-menu"
                style={{ left: position.x, top: position.y }}
                onClick={(event) => event.stopPropagation()}
            >
                {children}
                <div className="ctx-menu-sep" />
                <div className="ctx-menu-item" onClick={onClose}>Cancel</div>
            </div>
        </div>
    );
};

export default SlotContextMenu;
