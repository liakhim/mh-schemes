import React from 'react';
import crossIcon from '../../assets/icons/cross.svg';

const ModalCloseButton = ({ className = '', onClick, label = 'Закрыть' }) => (
    <button
        type="button"
        className={className}
        onClick={onClick}
        aria-label={label}
    >
        <img className="modal-close-icon" src={crossIcon} alt="" aria-hidden="true" />
    </button>
);

export default ModalCloseButton;
