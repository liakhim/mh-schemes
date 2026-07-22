import React from 'react';

const DecorativeDevices = ({ devices, enabled }) => (
    <div className={`learning-decorative${enabled ? ' is-enabled' : ' is-disabled'}`}>
        <div className="learning-decorative-devices">
            {devices.map((device) => (
                <div key={device.key} className="learning-decorative-item">
                    <img src={device.imagePath} alt={device.label} className="learning-decorative-image" />
                    <span className="learning-decorative-label">{device.label}</span>
                </div>
            ))}
        </div>
        <div className="learning-decorative-hint">
            {enabled
                ? '✓ Беспроводные устройства активны'
                : 'Неактивно — станет доступно после правильной коммутации ниже'}
        </div>
    </div>
);

export default DecorativeDevices;
