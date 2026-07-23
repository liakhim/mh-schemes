import Konva from 'konva';
import React, {
    useCallback, useEffect, useRef, useState,
} from 'react';
import {
    Circle, Image as KonvaImage, Layer, Rect, Stage, Text,
} from 'react-konva';
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
const BASE_TOP_PADDING = 14;
const AERIAL_CLEARANCE_BUFFER = 10;
const LABEL_AREA_HEIGHT = 20;
const BOTTOM_PADDING = 4;
const CHANNEL_BASE_DROP = 10;
const CHANNEL_STEP = 12;
const MIN_STAGE_WIDTH = 640;

const WRONG_FLASH_DURATION_MS = 400;
const SHAKE_DURATION_MS = 400;
const SHAKE_AMPLITUDE = 6;
const SHAKE_CYCLES = 4;
// A wider invisible hit zone around each 6px port dot, so it's easier to hit than the small
// visible dot alone - but capped per-port below, since devices with tightly packed ports (e.g.
// ecosmart's EXT/12VDC row, ports ~13px apart) would otherwise have a port's hit zone entirely
// buried under a later-rendered neighbour's, making it unclickable no matter where you click.
const PORT_HIT_RADIUS = 16;
const PORT_MIN_HIT_RADIUS = 6;

// Jitters a port's x around its own current position and settles back - the visual "no" cue
// on a wrong pairing, alongside the existing red flash.
const shakeNode = (node) => {
    if (!node) return;
    const baseX = node.x();
    const start = Date.now();
    const anim = new Konva.Animation(() => {
        const progress = Math.min((Date.now() - start) / SHAKE_DURATION_MS, 1);
        if (progress >= 1) {
            node.x(baseX);
            anim.stop();
            return;
        }
        const decay = 1 - progress;
        node.x(baseX + Math.sin(progress * SHAKE_CYCLES * Math.PI * 2) * SHAKE_AMPLITUDE * decay);
    }, node.getLayer());
    anim.start();
};

const PORT_COLOR = '#3b82f6';
const PORT_COLOR_SELECTED = '#f59e0b';
const PORT_COLOR_SOLVED = '#2e8b57';
const PORT_COLOR_WRONG = '#dc2626';
const LINE_COLOR = '#2e8b57';
const LINE_COLOR_GND = '#000000';
const LINE_COLOR_DAT = '#eab308';
const LINE_COLOR_V_PLUS = '#dc2626';
const LINE_COLOR_L = '#800020';
const LINE_COLOR_EXT_A = '#eab308';
const LINE_COLOR_EXT_B = '#2e8b57';

const getWireColor = (portName) => {
    if (/^L-(IN|OUT)$/i.test(portName)) return LINE_COLOR_L;
    if (/^EXT(-OUT|-IN)?-A$/i.test(portName)) return LINE_COLOR_EXT_A;
    if (/^EXT(-OUT|-IN)?-B$/i.test(portName)) return LINE_COLOR_EXT_B;
    if (/GND/i.test(portName)) return LINE_COLOR_GND;
    if (/DAT/i.test(portName)) return LINE_COLOR_DAT;
    if (/V\+/.test(portName)) return LINE_COLOR_V_PLUS;
    return LINE_COLOR;
};

// "OUT -> IN" hops (power-unit/UPS -> UPS/controller, ecosmart -> its EXT thermostat) are
// routed the same way spa.jsx draws them: the shape follows where the two ports actually sit
// on their boards, not a fixed rule.
// - power-unit's OUT and UPS's IN both sit on the TOP edge of their boards, so that hop arcs
//   above both devices (spa.jsx: the ups<->power-unit link).
// - power-unit's OUT sits on top while smart2/pro's IN sits on the BOTTOM edge, so that hop
//   rises above the power-unit, then dives under the whole controller board to enter its port
//   from below (spa.jsx: the no-UPS power-unit->controller link) - "dive-under" below.
// - UPS's own OUT sits on the BOTTOM edge (like the controller's IN), so ups->controller needs
//   no special-casing - it already falls through to the normal bottom channel below.
// - ecosmart's EXT-OUT/12VDC-OUT sit near the TOP of its (very tall) board while the
//   thermostat's EXT-A/B and 1-WIRE terminals sit in the BOTTOM half of its own small board, so
//   that hop also rises and crosses over - but unlike the power-unit case it only drops to the
//   target port's own level before stepping in, not under the whole thermostat - "dive-to-port"
//   below, ecosmart-only per explicit request. PRO's own EXT-OUT/12VDC-OUT sit on the BOTTOM
//   edge, so its EXT/thermostat hops fall through to the default channel untouched, matching
//   spa.jsx.
const OUT_PORT_RE = /^(EXT-OUT-[AB]|12VDC-OUT-(V\+|GND))$/i;
const IN_PORT_RE = /^(EXT-(IN-)?[AB]|12VDC-IN-(V\+|GND)|1-WIRE-(V\+|GND))$/i;
// Per-port stacking so parallel lines don't overlap - mirrors spa.jsx's own power-link-pu-
// controller offsets, where V+ rises and bends right more than GND but dives less (GND passes
// under the controller a bit deeper), so V+ visibly sits above-and-right of GND on the way down.
const LINK_OFFSET_UNIT = 8;
const PORT_LINK_UNITS = {
    GND: { rise: 1, side: 1, drop: 2 },
    'V+': { rise: 2, side: 2, drop: 1 },
    A: { rise: 3, side: 3, drop: 3 },
    B: { rise: 4, side: 4, drop: 4 },
};
const getLinkOffsets = (portName) => {
    const key = /V\+$/i.test(portName) ? 'V+' : /GND$/i.test(portName) ? 'GND' : /-A$/i.test(portName) ? 'A' : 'B';
    const units = PORT_LINK_UNITS[key];
    return {
        rise: units.rise * LINK_OFFSET_UNIT,
        side: units.side * LINK_OFFSET_UNIT,
        drop: units.drop * LINK_OFFSET_UNIT,
    };
};

const isGoStyleController = (deviceKey) => deviceKey === 'go' || deviceKey === 'go+';

// GO/GO+ status LEDs (top edge of the board). POWER/WI-FI read as always-on in this static
// quiz view; BUS/ALERT stay unlit since there's no live scheme data to derive them from.
const GO_INDICATORS = [
    { name: 'POWER-INDICATOR', active: true },
    { name: 'WI-FI-INDICATOR', active: true },
    { name: 'BUS-INDICATOR', active: false },
    { name: 'ALERT-INDICATOR', active: false },
];
const ACTIVE_INDICATOR_COLOR = '#00DA00';
const ACTIVE_INDICATOR_SHADOW_BLUR = 6;
const INACTIVE_INDICATOR_COLOR = '#D2D2D2';

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
    const portNodesRef = useRef(new Map());

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
            shakeNode(portNodesRef.current.get(`${selection.device}-${selection.port}`));
            shakeNode(portNodesRef.current.get(`${clicked.device}-${clicked.port}`));
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

    const filteredPorts = question.devices.map(
        (device, idx) => (deviceRawPorts[idx] || []).filter((port) => device.ports.includes(port.name)),
    );
    const getPortFraction = (deviceIdx, portName) => {
        const port = filteredPorts[deviceIdx].find((item) => item.name === portName);
        return port ? port.y : 0.5;
    };
    // A pair is an "OUT -> IN" hop (see the comment on OUT_PORT_RE above) only when its source
    // port sits on the top edge of its board - that's the only case spa.jsx routes specially.
    const hopKindOf = (pairEntry) => {
        const [[deviceA, portA], [deviceB, portB]] = pairEntry;
        // The floor sensor taps the thermostat's own 1-wire terminal directly - straight down
        // to that port's level, then straight in, no shared channel needed between two devices
        // sitting right next to each other.
        if (question.devices[deviceA].key === 'thermostat-black' && question.devices[deviceB].key === 'floor-sensor-thermostat-ext') {
            return 'direct-elbow';
        }
        if (!OUT_PORT_RE.test(portA) || !IN_PORT_RE.test(portB)) return null;
        if (getPortFraction(deviceA, portA) >= 0.5) return null;
        if (getPortFraction(deviceB, portB) < 0.5) return 'arc-above';
        return question.devices[deviceA].key === 'ecosmart' ? 'dive-to-port' : 'dive-under';
    };
    const isOutInHop = (pairEntry) => ['arc-above', 'dive-to-port', 'dive-under'].includes(hopKindOf(pairEntry));
    const maxRiseOffset = Math.max(
        0,
        ...question.pairs.map((pairEntry) => (isOutInHop(pairEntry) ? getLinkOffsets(pairEntry[0][1]).rise : 0)),
    );
    const maxDropOffset = Math.max(
        0,
        ...question.pairs.map((pairEntry) => (hopKindOf(pairEntry) === 'dive-under' ? getLinkOffsets(pairEntry[0][1]).drop : 0)),
    );
    // Pairs that fall through to the plain bottom channel, in their own order - stacked by rank
    // among themselves rather than by raw pair index, so a question mixing specially-routed
    // pairs (e.g. ecosmart's dive-to-port ones) with plain ones doesn't reserve dead space for
    // ranks that never render into this channel at all.
    const defaultChannelPairIndices = question.pairs
        .map((pairEntry, idx) => (hopKindOf(pairEntry) === null ? idx : null))
        .filter((idx) => idx !== null);

    // Devices sit on a shared bottom rail (like a DIN row) rather than a shared top edge, so a
    // taller device (e.g. ecosmart) grows upward from the row instead of dwarfing its neighbours
    // downward. The tallest device's own top stays exactly at topPadding either way. A device
    // can opt into `anchor: 'top'` instead (e.g. a small sensor pinned under the header rather
    // than hanging from the shared bottom rail), optionally floating further up still via
    // `topOffset` (e.g. to sit visibly above another device rather than flush with its top).
    const maxTopOffset = Math.max(0, ...question.devices.map((device) => (device.anchor === 'top' ? (device.topOffset || 0) : 0)));
    const topPadding = maxTopOffset + maxRiseOffset + BASE_TOP_PADDING + maxAerialProtrusion
        + (maxAerialProtrusion > 0 ? AERIAL_CLEARANCE_BUFFER : 0);
    const deviceTopY = layouts.map((layout, idx) => {
        const device = question.devices[idx];
        if (device.anchor === 'top') return topPadding - (device.topOffset || 0);
        return topPadding + (maxDeviceHeight - layout.height);
    });

    const maxChannelDrop = Math.max(
        CHANNEL_BASE_DROP + CHANNEL_STEP * Math.max(0, defaultChannelPairIndices.length - 1),
        maxDropOffset,
    );
    const lastIdx = deviceCount - 1;
    const stageWidth = Math.max(MIN_STAGE_WIDTH, positions[lastIdx] + layouts[lastIdx].width + MARGIN_X);
    const stageHeight = topPadding + maxDeviceHeight + maxChannelDrop + LABEL_AREA_HEIGHT + BOTTOM_PADDING;
    const allSolved = solvedPairs.size === question.pairs.length;

    const getPortScreenPos = (deviceIdx, portName) => {
        const port = filteredPorts[deviceIdx].find((item) => item.name === portName);
        if (!port) return null;
        return {
            x: positions[deviceIdx] + port.x * layouts[deviceIdx].width,
            y: deviceTopY[deviceIdx] + port.y * layouts[deviceIdx].height,
        };
    };

    const renderPort = (deviceIdx, port) => {
        const px = positions[deviceIdx] + port.x * layouts[deviceIdx].width;
        const py = deviceTopY[deviceIdx] + port.y * layouts[deviceIdx].height;

        const solved = isPortFullySolved(deviceIdx, port.name);
        const isSelected = selection && selection.device === deviceIdx && selection.port === port.name;
        const isWrong = !!wrongFlash && wrongFlash.some((entry) => entry.device === deviceIdx && entry.port === port.name);

        let fill = PORT_COLOR;
        if (solved) fill = PORT_COLOR_SOLVED;
        else if (isWrong) fill = PORT_COLOR_WRONG;
        else if (isSelected) fill = PORT_COLOR_SELECTED;

        // Never let the hit zone reach past halfway to the closest other port on this device,
        // so a neighbour rendered on top can't bury this one's clickable area entirely.
        const nearestSiblingDist = filteredPorts[deviceIdx].reduce((min, sibling) => {
            if (sibling === port) return min;
            const sx = positions[deviceIdx] + sibling.x * layouts[deviceIdx].width;
            const sy = deviceTopY[deviceIdx] + sibling.y * layouts[deviceIdx].height;
            return Math.min(min, Math.hypot(sx - px, sy - py));
        }, Infinity);
        const hitRadius = Number.isFinite(nearestSiblingDist)
            ? Math.max(PORT_MIN_HIT_RADIUS, Math.min(PORT_HIT_RADIUS, nearestSiblingDist / 2 - 1))
            : PORT_HIT_RADIUS;

        const key = `${deviceIdx}-${port.name}`;
        return (
            <React.Fragment key={key}>
                {/* Invisible, wider hit zone: handles clicks/hover so the port reads as easier
                    to hit than its small 6px visible dot alone. */}
                <Circle
                    x={px}
                    y={py}
                    radius={hitRadius}
                    fill="#000000"
                    opacity={0}
                    onClick={() => handlePortClick(deviceIdx, port.name)}
                    onTap={() => handlePortClick(deviceIdx, port.name)}
                    onMouseEnter={(e) => {
                        e.target.getStage().container().style.cursor = solved ? 'default' : 'pointer';
                    }}
                    onMouseLeave={(e) => {
                        e.target.getStage().container().style.cursor = 'default';
                    }}
                />
                <Circle
                    ref={(node) => {
                        if (node) portNodesRef.current.set(key, node);
                    }}
                    x={px}
                    y={py}
                    radius={isSelected ? 7 : 6}
                    fill={fill}
                    stroke="#ffffff"
                    strokeWidth={1}
                    listening={false}
                />
            </React.Fragment>
        );
    };

    const renderGoIndicators = (deviceIdx) => {
        const device = question.devices[deviceIdx];
        if (!isGoStyleController(device.key)) return null;
        const rawPorts = deviceRawPorts[deviceIdx] || [];
        const layout = layouts[deviceIdx];
        return GO_INDICATORS.map(({ name, active }) => {
            const indicatorPort = rawPorts.find((port) => String(port?.name || '').toUpperCase() === name);
            if (!indicatorPort) return null;
            const width = Math.max(1, (indicatorPort.width || 0) * layout.width);
            const height = Math.max(1, (indicatorPort.height || 0) * layout.height);
            const radius = Math.min(width, height) / 2;
            return (
                <Rect
                    key={`go-indicator-${deviceIdx}-${name}`}
                    x={positions[deviceIdx] + indicatorPort.x * layout.width - width / 2}
                    y={deviceTopY[deviceIdx] + indicatorPort.y * layout.height - height / 2}
                    width={width}
                    height={height}
                    cornerRadius={radius}
                    fill={active ? ACTIVE_INDICATOR_COLOR : INACTIVE_INDICATOR_COLOR}
                    shadowColor={active ? ACTIVE_INDICATOR_COLOR : undefined}
                    shadowBlur={active ? ACTIVE_INDICATOR_SHADOW_BLUR : 0}
                    listening={false}
                />
            );
        });
    };

    const renderAerials = (deviceIdx, aerialLayout) => aerialLayout.images.map((spec, idx) => (
        <KonvaImage
            key={`aerial-${deviceIdx}-${idx}`}
            image={spec.image}
            x={positions[deviceIdx] + spec.x}
            y={deviceTopY[deviceIdx] + spec.y}
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
                        y={deviceTopY[idx]}
                        width={layouts[idx].width}
                        height={layouts[idx].height}
                    />
                ))}

                {question.devices.map((device, idx) => (
                    <React.Fragment key={`go-indicators-${idx}`}>{renderGoIndicators(idx)}</React.Fragment>
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
                    const hopKind = hopKindOf(pairEntry);
                    let points;
                    if (hopKind === 'direct-elbow') {
                        // Straight down from the sensor's own port to the thermostat port's
                        // level, then straight in - no detour through a shared channel.
                        points = [p2.x, p2.y, p2.x, p1.y, p1.x, p1.y];
                    } else if (hopKind === 'arc-above') {
                        const riseY = deviceTopY[deviceA] - getLinkOffsets(portA).rise;
                        points = [p1.x, p1.y, p1.x, riseY, p2.x, riseY, p2.x, p2.y];
                    } else if (hopKind === 'dive-to-port') {
                        // ecosmart -> its EXT thermostat only: up, right, straight down to the
                        // target port's own level, then in - no detour under the thermostat.
                        const offsets = getLinkOffsets(portA);
                        const riseY = deviceTopY[deviceA] - offsets.rise;
                        const bendX = positions[deviceA] + layouts[deviceA].width + offsets.side;
                        points = [p1.x, p1.y, p1.x, riseY, bendX, riseY, bendX, p2.y, p2.x, p2.y];
                    } else if (hopKind === 'dive-under') {
                        // Matches spa.jsx's own power-unit->controller link: up out of the
                        // source, right into the gap, down past the whole controller board,
                        // right underneath it to the target's column, then up into the port
                        // from below.
                        const offsets = getLinkOffsets(portA);
                        const riseY = deviceTopY[deviceA] - offsets.rise;
                        const bendX = positions[deviceA] + layouts[deviceA].width + offsets.side;
                        const diveY = topPadding + maxDeviceHeight + offsets.drop;
                        points = [p1.x, p1.y, p1.x, riseY, bendX, riseY, bendX, diveY, p2.x, diveY, p2.x, p2.y];
                    } else {
                        const channelRank = defaultChannelPairIndices.indexOf(idx);
                        const channelY = topPadding + maxDeviceHeight + CHANNEL_BASE_DROP + channelRank * CHANNEL_STEP;
                        points = [p1.x, p1.y, p1.x, channelY, p2.x, channelY, p2.x, p2.y];
                    }
                    return (
                        <Line
                            key={`line-${idx}`}
                            points={points}
                            stroke={getWireColor(portA)}
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

                {question.devices.map((device, idx) => {
                    if (!deviceImages[idx]) return null;
                    // Konva Text still clips to `width` even with wrap="none", so labels wider
                    // than their own device (e.g. "Авт. выключатель" over the slim breaker) need
                    // a generously wide, device-centered box rather than the device's own width.
                    const labelWidth = Math.max(layouts[idx].width, 170);
                    const labelX = Math.max(0, positions[idx] + layouts[idx].width / 2 - labelWidth / 2);
                    return (
                        <Text
                            key={`label-${idx}`}
                            x={labelX}
                            y={topPadding + maxDeviceHeight + maxChannelDrop + 4}
                            width={labelWidth}
                            align="center"
                            text={device.label}
                            fontSize={14}
                            fontStyle="bold"
                            fill="#202738"
                            wrap="none"
                        />
                    );
                })}
            </Layer>
        </Stage>
    );
};

export default QuizCanvas;
