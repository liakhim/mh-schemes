import React, { useEffect, useState } from 'react';
import { Image, Layer, Text } from 'react-konva';
import { controllerImagePaths } from '../../scheme/assets/imageRegistry';
import { canonicalDeviceType } from '../../scheme/domain/deviceTypes';

const ProjectControllerFrame = ({ scheme }) => {
    const controllerType = canonicalDeviceType(
        typeof scheme?.controller === 'string' ? scheme.controller : scheme?.controller?.type,
    );
    const [controllerImage, setControllerImage] = useState(null);
    const [position, setPosition] = useState({ x: 48, y: 120 });

    useEffect(() => {
        const path = controllerImagePaths[controllerType];
        if (!path) {
            setControllerImage(null);
            return undefined;
        }
        let cancelled = false;
        const image = new window.Image();
        image.onload = () => {
            if (!cancelled) setControllerImage(image);
        };
        image.src = path;
        return () => {
            cancelled = true;
            image.onload = null;
        };
    }, [controllerType]);

    return (
        <Layer>
            {controllerImage ? (
                <Image
                    x={position.x}
                    y={position.y}
                    image={controllerImage}
                    draggable
                    onDragStart={(event) => event.cancelBubble = true}
                    onDragMove={(event) => event.cancelBubble = true}
                    onDragEnd={(event) => setPosition({ x: event.target.x(), y: event.target.y() })}
                />
            ) : (
                <Text x={48} y={120} text="Loading controller..." fontSize={18} fill="#253746" />
            )}
        </Layer>
    );
};

export const GoProject = ({ scheme, setScheme, settings }) => (
    <ProjectControllerFrame scheme={scheme} />
);

export const GoPlusProject = ({ scheme, setScheme, settings }) => (
    <ProjectControllerFrame scheme={scheme} />
);

export const Smart2Project = ({ scheme, setScheme, settings }) => (
    <ProjectControllerFrame scheme={scheme} />
);

export const ProProject = ({ scheme, setScheme, settings }) => (
    <ProjectControllerFrame scheme={scheme} />
);

export const EcosmartProject = ({ scheme, setScheme, settings }) => (
    <ProjectControllerFrame scheme={scheme} />
);
