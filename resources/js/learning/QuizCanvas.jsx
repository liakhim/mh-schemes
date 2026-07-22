import React, { useCallback, useEffect, useState } from 'react';
import { Circle, Image as KonvaImage, Layer, Stage, Text } from 'react-konva';
import { indent, module_height } from '../constants';
import { aerialImagePath, goAerialImagePath } from '../scheme/assets/imageRegistry';
import { getPortsByClassToken, parsePorts } from '../scheme/layout/portParsing';
import { Line } from '../scheme/rendering/SharpLine';

// Devices are standardized to 1 module_height unit tall (the app's own DIN-row unit),
// zoomed up for legibility on this dedicated quiz canvas.
const MODULE_HEIGHT = parseInt(module_height, 10) || 200;
const INDENT_SIZE = parseInt(indent, 10) || 8;
const DISPLAY_ZOOM = 1.8;
const DEVICE_HEIGHT = MODULE_HEIGHT * DISPLAY_ZOOM;

const MARGIN_X = 60;
const DEVICE_GAP = 160;
const BASE_TOP_PADDING = 20;
const AERIAL_CLEARANCE_BUFFER = 10;
const LABEL_AREA_HEIGHT = 30;
const BOTTOM_PADDING = 20;
const CHANNEL_BASE_DROP = 20;
const CHANNEL_STEP = 12;
const MIN_STAGE_WIDTH = 640;

const WRONG_FLASH_DURATION_MS = 400;

const PORT_COLOR = '#3b82f6';
const PORT_COLOR_SELECTED = '#f59e0b';
const PORT_COLOR_SOLVED = '#2e8b57';
const PORT_COLOR_WRONG = '#dc2626';
const LINE_COLOR = '#2e8b57';

const isGoStyleController = (deviceKey) => deviceKey === 'go' || deviceKey === 'go+';

// Devices normally share the same standardized height, but a question can opt a specific
// device into a taller display (device.heightScale) when its native art is too dense to
// read at the standard size - the layout below stays keyed off each device's own height.
const getDeviceLayout = (image, deviceHeight) => {
    if (!image) return { width: 0, height: deviceHeight, scale: 0 };
    const scale = deviceHeight / image.height;
    return { width: image.width * scale, height: deviceHeight, scale };
};

const loadDevice = (device, onImage, onPorts) => {
    const img = new window.Image();
    img.onload = () => onImage(img);
    img.src = device.imagePath;
    parsePorts(device.imagePath)
        .then((ports) => onPorts(ports))
        .catch(() => onPorts([]));
};

// Antennas mount two different ways depending on the controller:
// - PRO/smart2 expose dedicated AERIAL-class ports the antenna sits above.
// - GO/GO+ have no such port; the app pins the antenna to the top-right corner instead.
// Either way we report how far above its own device box the antenna sticks out, so the
// stage can reserve enough headroom without changing the horizontal gap between devices.
const getAerialLayout = (deviceKey, rawPorts, deviceWidth, deviceHeight, deviceScale, aerialImage, goAerialImage) => {
    if (isGoStyleController(deviceKey)) {
        if (!goAerialImage || !deviceScale) return { protrusion: 0, images: [] };
        const width = goAerialImage.width * deviceScale;
        const height = goAerialImage.height * deviceScale;
        const x = deviceWidth - 5 * INDENT_SIZE * deviceScale - width;
        const y = -height;
        return {
            protrusion: height,
            images: [{ image: goAerialImage, x, y, width, height }],
        };
    }

    if (!aerialImage || !deviceScale) return { protrusion: 0, images: [] };
    const aerialPorts = getPortsByClassToken(rawPorts, 'AERIAL');
    if (!aerialPorts) return { protrusion: 0, images: [] };
    const width = aerialImage.width * deviceScale;
    const height = aerialImage.height * deviceScale;
    let protrusion = 0;
    const images = aerialPorts.map((port) => {
        const centerX = port.x * deviceWidth;
        const centerY = port.y * deviceHeight;
        const portHeight = (port.height || 0) * deviceHeight;
        const portTopY = centerY - portHeight / 2;
        protrusion = Math.max(protrusion, height - portTopY);
        return { image: aerialImage, x: centerX - width / 2, y: portTopY - height, width, height };
    });
    return { protrusion, images };
};

const pairEndpointsMatch = (pair, a, b) => {
    const [p0, p1] = pair;
    const forward = p0[0] === a.device && p0[1] === a.port && p1[0] === b.device && p1[1] === b.port;
    const backward = p1[0] === a.device && p1[1] === a.port && p0[0] === b.device && p0[1] === b.port;
    return forward || backward;
};

const QuizCanvas = ({ question, solvedPairs, onSolvePair }) => {
    const deviceCount = question.devices.length;
    const [deviceImages, setDeviceImages] = useState(() => new Array(deviceCount).fill(null));
    const [deviceRawPorts, setDeviceRawPorts] = useState(() => new Array(deviceCount).fill([]));
    const [aerialImage, setAerialImage] = useState(null);
    const [goAerialImage, setGoAerialImage] = useState(null);
    const [selection, setSelection] = useState(null);
    const [wrongFlash, setWrongFlash] = useState(null);

    useEffect(() => {
        const img = new window.Image();
        img.onload = () => setAerialImage(img);
        img.src = aerialImagePath;

        const goImg = new window.Image();
        goImg.onload = () => setGoAerialImage(goImg);
        goImg.src = goAerialImagePath;
    }, []);

    useEffect(() => {
        let cancelled = false;
        setSelection(null);
        setWrongFlash(null);
        setDeviceImages(new Array(question.devices.length).fill(null));
        setDeviceRawPorts(new Array(question.devices.length).fill([]));

        question.devices.forEach((device, idx) => {
            loadDevice(
                device,
                (img) => !cancelled && setDeviceImages((prev) => {
                    const next = [...prev];
                    next[idx] = img;
                    return next;
                }),
                (ports) => !cancelled && setDeviceRawPorts((prev) => {
                    const next = [...prev];
                    next[idx] = ports;
                    return next;
                }),
            );
        });

        return () => {
            cancelled = true;
        };
    }, [question]);

    // A port can appear in more than one pair (e.g. a 1-wire bus terminal shared between
    // an upstream device and a downstream addition), so it's only "done" once every pair
    // that references it is solved - not as soon as the first one is.
    const getPortPairIndexes = useCallback((deviceIdx, portName) => question.pairs.reduce((acc, pair, idx) => {
        if ((pair[0][0] === deviceIdx && pair[0][1] === portName) || (pair[1][0] === deviceIdx && pair[1][1] === portName)) {
            acc.push(idx);
        }
        return acc;
    }, []), [question]);

    const isPortFullySolved = useCallback((deviceIdx, portName) => {
        const relevant = getPortPairIndexes(deviceIdx, portName);
        return relevant.length > 0 && relevant.every((idx) => solvedPairs.has(idx));
    }, [getPortPairIndexes, solvedPairs]);

    const handlePortClick = useCallback((deviceIdx, portName) => {
        if (isPortFullySolved(deviceIdx, portName)) return;

        if (!selection) {
            setSelection({ device: deviceIdx, port: portName });
            return;
        }

        if (selection.device === deviceIdx) {
            setSelection({ device: deviceIdx, port: portName });
            return;
        }

        const clicked = { device: deviceIdx, port: portName };
        const pairIndex = question.pairs.findIndex(
            (pair, idx) => !solvedPairs.has(idx) && pairEndpointsMatch(pair, selection, clicked),
        );

        setSelection(null);
        if (pairIndex !== -1) {
            onSolvePair(pairIndex);
        } else {
            setWrongFlash([selection, clicked]);
            setTimeout(() => setWrongFlash(null), WRONG_FLASH_DURATION_MS);
        }
    }, [isPortFullySolved, selection, question, solvedPairs, onSolvePair]);

    const layouts = question.devices.map(
        (device, idx) => getDeviceLayout(deviceImages[idx], DEVICE_HEIGHT * (device.heightScale || 1)),
    );
    const maxDeviceHeight = Math.max(...layouts.map((layout) => layout.height));
    const positions = [];
    {
        let cursorX = MARGIN_X;
        layouts.forEach((layout) => {
            positions.push(cursorX);
            cursorX += layout.width + DEVICE_GAP;
        });
    }

    const aerialLayouts = question.devices.map((device, idx) => getAerialLayout(
        device.key, deviceRawPorts[idx] || [], layouts[idx].width, layouts[idx].height, layouts[idx].scale, aerialImage, goAerialImage,
    ));
    const maxAerialProtrusion = Math.max(0, ...aerialLayouts.map((layout) => layout.protrusion));
    const topPadding = BASE_TOP_PADDING + maxAerialProtrusion + (maxAerialProtrusion > 0 ? AERIAL_CLEARANCE_BUFFER : 0);

    const filteredPorts = question.devices.map(
        (device, idx) => (deviceRawPorts[idx] || []).filter((port) => device.ports.includes(port.name)),
    );

    const maxChannelDrop = CHANNEL_BASE_DROP + CHANNEL_STEP * Math.max(0, question.pairs.length - 1);
    const lastIdx = deviceCount - 1;
    const stageWidth = Math.max(MIN_STAGE_WIDTH, positions[lastIdx] + layouts[lastIdx].width + MARGIN_X);
    const stageHeight = topPadding + maxDeviceHeight + maxChannelDrop + LABEL_AREA_HEIGHT + BOTTOM_PADDING;
    const allSolved = solvedPairs.size === question.pairs.length;

    const getPortScreenPos = (deviceIdx, portName) => {
        const port = filteredPorts[deviceIdx].find((item) => item.name === portName);
        if (!port) return null;
        return {
            x: positions[deviceIdx] + port.x * layouts[deviceIdx].width,
            y: topPadding + port.y * layouts[deviceIdx].height,
        };
    };

    const renderPort = (deviceIdx, port) => {
        const px = positions[deviceIdx] + port.x * layouts[deviceIdx].width;
        const py = topPadding + port.y * layouts[deviceIdx].height;

        const solved = isPortFullySolved(deviceIdx, port.name);
        const isSelected = selection && selection.device === deviceIdx && selection.port === port.name;
        const isWrong = !!wrongFlash && wrongFlash.some((entry) => entry.device === deviceIdx && entry.port === port.name);

        let fill = PORT_COLOR;
        if (solved) fill = PORT_COLOR_SOLVED;
        else if (isWrong) fill = PORT_COLOR_WRONG;
        else if (isSelected) fill = PORT_COLOR_SELECTED;

        return (
            <Circle
                key={`${deviceIdx}-${port.name}`}
                x={px}
                y={py}
                radius={isSelected ? 7 : 6}
                fill={fill}
                stroke="#ffffff"
                strokeWidth={1}
                onClick={() => handlePortClick(deviceIdx, port.name)}
                onTap={() => handlePortClick(deviceIdx, port.name)}
                onMouseEnter={(e) => {
                    e.target.getStage().container().style.cursor = solved ? 'default' : 'pointer';
                }}
                onMouseLeave={(e) => {
                    e.target.getStage().container().style.cursor = 'default';
                }}
            />
        );
    };

    const renderAerials = (deviceIdx, aerialLayout) => aerialLayout.images.map((spec, idx) => (
        <KonvaImage
            key={`aerial-${deviceIdx}-${idx}`}
            image={spec.image}
            x={positions[deviceIdx] + spec.x}
            y={topPadding + spec.y}
            width={spec.width}
            height={spec.height}
            listening={false}
        />
    ));

    return (
        <Stage width={stageWidth} height={stageHeight} className={`learning-stage${allSolved ? ' is-complete' : ''}`}>
            <Layer>
                {question.devices.map((device, idx) => deviceImages[idx] && (
                    <KonvaImage
                        key={`device-${idx}`}
                        image={deviceImages[idx]}
                        x={positions[idx]}
                        y={topPadding}
                        width={layouts[idx].width}
                        height={layouts[idx].height}
                    />
                ))}

                {question.devices.map((device, idx) => (
                    <React.Fragment key={`aerials-${idx}`}>{renderAerials(idx, aerialLayouts[idx])}</React.Fragment>
                ))}

                {question.pairs.map((pairEntry, idx) => {
                    if (!solvedPairs.has(idx)) return null;
                    const [[deviceA, portA], [deviceB, portB]] = pairEntry;
                    const p1 = getPortScreenPos(deviceA, portA);
                    const p2 = getPortScreenPos(deviceB, portB);
                    if (!p1 || !p2) return null;
                    const channelY = topPadding + maxDeviceHeight + CHANNEL_BASE_DROP + idx * CHANNEL_STEP;
                    return (
                        <Line
                            key={`line-${idx}`}
                            points={[p1.x, p1.y, p1.x, channelY, p2.x, channelY, p2.x, p2.y]}
                            stroke={LINE_COLOR}
                            strokeWidth={2}
                            lineCap="round"
                            lineJoin="round"
                            listening={false}
                        />
                    );
                })}

                {question.devices.map((device, idx) => (
                    <React.Fragment key={`ports-${idx}`}>
                        {filteredPorts[idx].map((port) => renderPort(idx, port))}
                    </React.Fragment>
                ))}

                {question.devices.map((device, idx) => deviceImages[idx] && (
                    <Text
                        key={`label-${idx}`}
                        x={positions[idx]}
                        y={topPadding + maxDeviceHeight + maxChannelDrop + 8}
                        width={layouts[idx].width}
                        align="center"
                        text={device.label}
                        fontSize={14}
                        fontStyle="bold"
                        fill="#202738"
                    />
                ))}
            </Layer>
        </Stage>
    );
};

export default QuizCanvas;
