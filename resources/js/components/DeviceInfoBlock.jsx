import React, { createContext, useContext } from 'react';
import { Group, Image, Rect, Text } from 'react-konva';
import {
    INFO_BLOCK_FONT_SIZE,
    INFO_BLOCK_HEIGHT,
    INFO_BLOCK_TEXT_COLOR,
    TRANSPARENT_FILL,
} from '../constants';

const DeviceInfoBlockContext = createContext(null);

export const DeviceInfoBlockProvider = ({
    children,
    commentIconImage,
    commentAddIconImage,
    commentIconNodeName,
    selectDevicePreview,
    editDeviceTitle,
    viewDeviceComment,
}) => (
    <DeviceInfoBlockContext.Provider value={{
        commentIconImage,
        commentAddIconImage,
        commentIconNodeName,
        selectDevicePreview,
        editDeviceTitle,
        viewDeviceComment,
    }}>
        {children}
    </DeviceInfoBlockContext.Provider>
);

export const DeviceInfoBlock = ({ device, title, text, previewDevices = null, x, y, width, height, ...textProps }) => {
    const context = useContext(DeviceInfoBlockContext);
    if (!device) {
        return <Text x={x} y={y} width={width} height={height} text={text ?? title} {...textProps} />;
    }

    const {
        commentIconImage,
        commentAddIconImage,
        commentIconNodeName,
        selectDevicePreview,
        editDeviceTitle,
        viewDeviceComment,
    } = context;
    const renderedTitle = title ?? text;
    const safeWidth = Math.max(12, width || 12);
    const safeHeight = Math.max(INFO_BLOCK_HEIGHT, height || INFO_BLOCK_HEIGHT);
    const buttonSize = Math.max(6, safeHeight * 0.46);
    const buttonX = x + safeWidth - buttonSize / 2;
    const buttonY = y - buttonSize / 2;
    const titleWidth = Math.max(8, safeWidth - 6);
    const hasComment = typeof device.comment === 'string' && device.comment.trim() !== '';
    const commentButtonImage = hasComment ? commentIconImage : commentAddIconImage;
    const normalizedTextProps = {
        ...textProps,
        fontSize: typeof textProps.fontSize === 'number' ? textProps.fontSize + 2 : INFO_BLOCK_FONT_SIZE,
    };

    return (
        <Group
            name="device-preview-source"
            previewDevice={device}
            previewTitle={renderedTitle}
            previewDevices={previewDevices}
            onClick={() => selectDevicePreview(device, renderedTitle, previewDevices)}
            onTap={() => selectDevicePreview(device, renderedTitle, previewDevices)}
        >
            <Rect
                x={x}
                y={y}
                width={safeWidth}
                height={safeHeight}
                fill={TRANSPARENT_FILL}
                onDblClick={() => editDeviceTitle(device, renderedTitle)}
                onDblTap={() => editDeviceTitle(device, renderedTitle)}
            />
            <Text
                x={x + 3}
                y={y}
                width={titleWidth}
                height={safeHeight}
                text={renderedTitle}
                fontSize={INFO_BLOCK_FONT_SIZE}
                fill={INFO_BLOCK_TEXT_COLOR}
                align="center"
                verticalAlign="middle"
                {...normalizedTextProps}
                onDblClick={() => editDeviceTitle(device, renderedTitle)}
                onDblTap={() => editDeviceTitle(device, renderedTitle)}
            />
            <Group
                name={commentIconNodeName}
                x={buttonX}
                y={buttonY}
                onClick={(event) => viewDeviceComment(device, event)}
                onTap={(event) => viewDeviceComment(device, event)}
            >
                <Rect
                    width={buttonSize}
                    height={buttonSize}
                    cornerRadius={buttonSize / 2}
                    fill={hasComment ? '#eef2ff' : 'rgba(255,255,255,0.78)'}
                    stroke={hasComment ? '#6366f1' : '#dbe3ff'}
                    strokeWidth={0.35}
                    perfectDrawEnabled={false}
                />
                {commentButtonImage ? (
                    <Image
                        image={commentButtonImage}
                        width={buttonSize}
                        height={buttonSize}
                        opacity={hasComment ? 0.95 : 0.72}
                        perfectDrawEnabled={false}
                    />
                ) : (
                    <Rect
                        width={buttonSize}
                        height={buttonSize}
                        cornerRadius={buttonSize / 2}
                        fill="#4f46e5"
                        perfectDrawEnabled={false}
                    />
                )}
            </Group>
        </Group>
    );
};
