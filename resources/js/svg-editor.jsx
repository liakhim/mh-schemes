import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

const SAMPLE_SVG = `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
  <style>
    .highlight { fill: #ffb703; }
    .muted { opacity: 0.35; }
    .accent-stroke { stroke: #e5484d; stroke-width: 3; }
  </style>
  <g id="frame">
    <rect x="10" y="10" width="380" height="280" rx="6" fill="none" stroke="#667089" stroke-width="2"/>
    <g id="boiler">
      <rect x="40" y="40" width="120" height="80" rx="8" fill="#cfd8e8"/>
      <circle cx="100" cy="80" r="20" fill="#8ca0c6"/>
      <text x="55" y="140" font-size="12" fill="#333">Boiler</text>
    </g>
    <g id="pump">
      <circle cx="260" cy="80" r="30" fill="#e3e7f0" stroke="#667089" stroke-width="2"/>
      <path d="M240,80 L280,80 M260,60 L260,100" stroke="#667089" stroke-width="3"/>
      <text x="235" y="130" font-size="12" fill="#333">Pump</text>
    </g>
    <g id="pipes">
      <path d="M160,80 L260,80" stroke="#9aa5b8" stroke-width="4" fill="none"/>
      <path d="M100,120 L100,220 L260,220 L260,110" stroke="#9aa5b8" stroke-width="4" fill="none"/>
    </g>
    <g id="valve">
      <rect x="220" y="205" width="30" height="30" fill="#d9dee8" stroke="#667089" stroke-width="2"/>
    </g>
  </g>
</svg>
`;

const RESERVED_ATTRS = ['data-seid', 'data-svg-editor-selected', 'data-svg-editor-hover'];
const SVG_NS = 'http://www.w3.org/2000/svg';
const CONTAINER_TAGS = new Set(['svg', 'g', 'a', 'switch', 'mask', 'clippath', 'defs', 'symbol', 'marker', 'pattern']);

const SHAPE_FACTORIES = {
    rect: () => {
        const el = document.createElementNS(SVG_NS, 'rect');
        el.setAttribute('x', '20');
        el.setAttribute('y', '20');
        el.setAttribute('width', '80');
        el.setAttribute('height', '60');
        el.setAttribute('fill', '#cfd8e8');
        el.setAttribute('stroke', '#667089');
        el.setAttribute('stroke-width', '2');
        return el;
    },
    circle: () => {
        const el = document.createElementNS(SVG_NS, 'circle');
        el.setAttribute('cx', '60');
        el.setAttribute('cy', '60');
        el.setAttribute('r', '30');
        el.setAttribute('fill', '#cfd8e8');
        el.setAttribute('stroke', '#667089');
        el.setAttribute('stroke-width', '2');
        return el;
    },
    line: () => {
        const el = document.createElementNS(SVG_NS, 'line');
        el.setAttribute('x1', '20');
        el.setAttribute('y1', '20');
        el.setAttribute('x2', '100');
        el.setAttribute('y2', '80');
        el.setAttribute('stroke', '#667089');
        el.setAttribute('stroke-width', '3');
        return el;
    },
    text: () => {
        const el = document.createElementNS(SVG_NS, 'text');
        el.setAttribute('x', '20');
        el.setAttribute('y', '40');
        el.setAttribute('font-size', '14');
        el.setAttribute('fill', '#202738');
        el.textContent = 'Текст';
        return el;
    },
};

const SHAPE_LABELS = { rect: 'Прямоугольник', circle: 'Круг', line: 'Линия', text: 'Текст' };

const GEOMETRY_FIELDS = {
    rect: [
        ['x', 'X'],
        ['y', 'Y'],
        ['width', 'Ширина'],
        ['height', 'Высота'],
        ['rx', 'Скругление', true],
    ],
    circle: [
        ['cx', 'Cx'],
        ['cy', 'Cy'],
        ['r', 'Радиус', true],
    ],
    ellipse: [
        ['cx', 'Cx'],
        ['cy', 'Cy'],
        ['rx', 'Rx', true],
        ['ry', 'Ry', true],
    ],
    line: [
        ['x1', 'X1'],
        ['y1', 'Y1'],
        ['x2', 'X2'],
        ['y2', 'Y2'],
    ],
    text: [
        ['x', 'X'],
        ['y', 'Y'],
        ['font-size', 'Размер шрифта'],
    ],
    image: [
        ['x', 'X'],
        ['y', 'Y'],
        ['width', 'Ширина'],
        ['height', 'Высота'],
    ],
};

const COLOR_EXCLUDED_TAGS = new Set(['defs', 'style', 'script', 'title', 'desc', 'metadata']);
const HEX_COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function getViewBoxSize(svgRoot) {
    if (!svgRoot) return null;
    const vb = svgRoot.viewBox && svgRoot.viewBox.baseVal;
    if (vb && vb.width > 0 && vb.height > 0) return { width: vb.width, height: vb.height };
    const w = parseFloat(svgRoot.getAttribute('width'));
    const h = parseFloat(svgRoot.getAttribute('height'));
    if (w > 0 && h > 0) return { width: w, height: h };
    return null;
}

function getRadiusSliderMax(el, attr, viewBoxSize) {
    if (el.tagName.toLowerCase() === 'rect' && attr === 'rx') {
        const w = parseFloat(el.getAttribute('width')) || 0;
        const h = parseFloat(el.getAttribute('height')) || 0;
        if (w > 0 && h > 0) return Math.max(10, Math.min(w, h) / 2);
    }
    if (viewBoxSize) return Math.max(10, Math.round(Math.min(viewBoxSize.width, viewBoxSize.height) / 2));
    return 200;
}

function getClassList(el) {
    if (!el) return [];
    const raw = el.getAttribute('class') || '';
    return raw.split(/\s+/).map((c) => c.trim()).filter(Boolean);
}

function registerNode(el, seid, parent, map) {
    el.setAttribute('data-seid', String(seid));
    const node = { seid, el, tag: el.tagName.toLowerCase(), parent, children: [] };
    map.set(seid, node);
    return node;
}

function buildTree(el, parent, counter, map) {
    const node = registerNode(el, counter.value++, parent, map);
    Array.from(el.children).forEach((child) => {
        node.children.push(buildTree(child, node, counter, map));
    });
    return node;
}

function cleanExportMarkup(svgEl) {
    if (!svgEl) return '';
    const clone = svgEl.cloneNode(true);
    RESERVED_ATTRS.forEach((attr) => clone.removeAttribute(attr));
    clone.querySelectorAll('[data-seid]').forEach((node) => {
        RESERVED_ATTRS.forEach((attr) => node.removeAttribute(attr));
    });
    return new XMLSerializer().serializeToString(clone);
}

function TreeNode({ node, selectedSeid, onSelect, depth }) {
    const el = node.el;
    const classes = getClassList(el);
    const idAttr = el.getAttribute('id');
    return (
        <div className="se-tree-node">
            <div
                className={'se-tree-row' + (node.seid === selectedSeid ? ' is-selected' : '')}
                style={{ paddingLeft: 8 + depth * 14 }}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(node.seid);
                }}
            >
                <span className="se-tree-tag">&lt;{node.tag}&gt;</span>
                {idAttr && <span className="se-tree-id">#{idAttr}</span>}
                {classes.length > 0 && <span className="se-tree-classes">.{classes.join('.')}</span>}
            </div>
            {node.children.map((child) => (
                <TreeNode key={child.seid} node={child} selectedSeid={selectedSeid} onSelect={onSelect} depth={depth + 1} />
            ))}
        </div>
    );
}

function ClassEditor({ el, onChange }) {
    const [newClass, setNewClass] = useState('');
    const [rawValue, setRawValue] = useState('');

    useEffect(() => {
        setRawValue(el ? (el.getAttribute('class') || '') : '');
        setNewClass('');
    }, [el]);

    if (!el) return null;
    const classes = getClassList(el);

    const addClass = () => {
        const parts = newClass.split(/\s+/).map((c) => c.trim()).filter(Boolean);
        if (!parts.length) return;
        parts.forEach((c) => el.classList.add(c));
        setNewClass('');
        onChange();
    };

    return (
        <div className="se-panel-block">
            <div className="se-panel-label">Классы элемента</div>
            <div className="se-chip-row">
                {classes.length === 0 && <span className="se-muted">классы не заданы</span>}
                {classes.map((c) => (
                    <span className="se-chip" key={c}>
                        {c}
                        <button
                            type="button"
                            className="se-chip-remove"
                            title="Удалить класс"
                            onClick={() => {
                                el.classList.remove(c);
                                onChange();
                            }}
                        >
                            ×
                        </button>
                    </span>
                ))}
            </div>
            <div className="se-inline-form">
                <input
                    type="text"
                    className="se-input"
                    placeholder="новый-класс"
                    value={newClass}
                    onChange={(e) => setNewClass(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            addClass();
                        }
                    }}
                />
                <button type="button" className="se-btn se-btn-primary" onClick={addClass}>
                    Добавить
                </button>
            </div>

            <div className="se-panel-label se-panel-label-sub">Задать атрибут class целиком</div>
            <div className="se-inline-form">
                <input
                    type="text"
                    className="se-input"
                    placeholder="class-a class-b"
                    value={rawValue}
                    onChange={(e) => setRawValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            const trimmed = rawValue.trim();
                            if (trimmed) el.setAttribute('class', trimmed);
                            else el.removeAttribute('class');
                            onChange();
                        }
                    }}
                />
                <button
                    type="button"
                    className="se-btn"
                    onClick={() => {
                        const trimmed = rawValue.trim();
                        if (trimmed) el.setAttribute('class', trimmed);
                        else el.removeAttribute('class');
                        onChange();
                    }}
                >
                    Применить
                </button>
            </div>
        </div>
    );
}

function RadiusSlider({ el, attr, viewBoxSize, onChange }) {
    const current = parseFloat(el.getAttribute(attr)) || 0;
    const max = Math.max(getRadiusSliderMax(el, attr, viewBoxSize), current);

    return (
        <div className="se-slider-row">
            <input
                type="range"
                className="se-slider"
                min={0}
                max={max}
                step={max > 60 ? 1 : 0.5}
                value={current}
                onChange={(e) => {
                    el.setAttribute(attr, e.target.value);
                    onChange();
                }}
            />
            <span className="se-slider-value">{current}</span>
        </div>
    );
}

function GeometryEditor({ el, viewBoxSize, onChange }) {
    const fields = GEOMETRY_FIELDS[el.tagName.toLowerCase()];
    if (!fields || !fields.length) return null;

    const commit = (attr, value) => {
        const trimmed = value.trim();
        if (trimmed === '') el.removeAttribute(attr);
        else el.setAttribute(attr, trimmed);
        onChange();
    };

    return (
        <div className="se-panel-block">
            <div className="se-panel-label">Размер и положение</div>
            <div className="se-geometry-grid">
                {fields.map(([attr, label, isRadius]) => (
                    <label className="se-geometry-field" key={attr}>
                        <span className="se-geometry-field-label">{label}</span>
                        <input
                            type="text"
                            inputMode="decimal"
                            className="se-input se-input-small"
                            defaultValue={el.getAttribute(attr) ?? ''}
                            key={attr + '-' + (el.dataset.seid || '') + '-' + (el.getAttribute(attr) ?? '')}
                            onBlur={(e) => commit(attr, e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') e.currentTarget.blur();
                            }}
                        />
                        {isRadius && <RadiusSlider el={el} attr={attr} viewBoxSize={viewBoxSize} onChange={onChange} />}
                    </label>
                ))}
            </div>
        </div>
    );
}

function ColorField({ el, attr, label, onChange }) {
    const raw = el.getAttribute(attr) ?? '';
    const trimmedRaw = raw.trim();
    const isNone = trimmedRaw.toLowerCase() === 'none';
    const swatchValue = HEX_COLOR_RE.test(trimmedRaw) ? trimmedRaw : '#000000';

    const setValue = (value) => {
        const trimmed = value.trim();
        if (trimmed === '') el.removeAttribute(attr);
        else el.setAttribute(attr, trimmed);
        onChange();
    };

    return (
        <label className="se-color-field">
            <span className="se-geometry-field-label">{label}</span>
            <div className="se-color-row">
                <input
                    type="color"
                    className="se-color-swatch"
                    value={swatchValue}
                    onChange={(e) => setValue(e.target.value)}
                />
                <input
                    type="text"
                    className="se-input se-input-small"
                    placeholder="none"
                    defaultValue={raw}
                    key={attr + '-' + (el.dataset.seid || '') + '-' + raw}
                    onBlur={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                    }}
                />
                <button
                    type="button"
                    className="se-btn se-btn-ghost se-btn-icon"
                    title={isNone ? 'Включить цвет' : 'Без цвета'}
                    onClick={() => setValue(isNone ? swatchValue : 'none')}
                >
                    ⌀
                </button>
            </div>
        </label>
    );
}

function ColorEditor({ el, onChange }) {
    if (COLOR_EXCLUDED_TAGS.has(el.tagName.toLowerCase())) return null;
    return (
        <div className="se-panel-block">
            <div className="se-panel-label">Цвет</div>
            <div className="se-color-grid">
                <ColorField el={el} attr="fill" label="Заливка" onChange={onChange} />
                <ColorField el={el} attr="stroke" label="Обводка" onChange={onChange} />
            </div>
        </div>
    );
}

function Inspector({ el, viewBoxSize, onChange, onSelectParent, onDelete, canDelete }) {
    if (!el) {
        return (
            <div className="se-panel-block">
                <div className="se-muted">Выберите элемент на холсте или в дереве слева, чтобы задать ему класс.</div>
            </div>
        );
    }

    const idValue = el.getAttribute('id') || '';

    return (
        <div>
            <div className="se-panel-block">
                <div className="se-panel-label">Выбранный элемент</div>
                <div className="se-selected-tag">&lt;{el.tagName.toLowerCase()}&gt;</div>
                <div className="se-inline-form">
                    {el.parentElement && el.parentElement.tagName.toLowerCase() !== 'html' && (
                        <button type="button" className="se-btn se-btn-ghost" onClick={onSelectParent}>
                            ↑ выбрать родителя
                        </button>
                    )}
                    {canDelete && (
                        <button type="button" className="se-btn se-btn-danger" onClick={onDelete}>
                            Удалить элемент
                        </button>
                    )}
                </div>
            </div>

            <div className="se-panel-block">
                <div className="se-panel-label">id</div>
                <input
                    type="text"
                    className="se-input"
                    placeholder="(нет)"
                    defaultValue={idValue}
                    key={idValue + '-' + (el.dataset.seid || '')}
                    onBlur={(e) => {
                        const trimmed = e.target.value.trim();
                        if (trimmed) el.setAttribute('id', trimmed);
                        else el.removeAttribute('id');
                        onChange();
                    }}
                />
            </div>

            <GeometryEditor el={el} viewBoxSize={viewBoxSize} onChange={onChange} />

            <ColorEditor el={el} onChange={onChange} />

            <ClassEditor el={el} onChange={onChange} />
        </div>
    );
}

function Breadcrumb({ selectedNode, onSelect }) {
    if (!selectedNode) return null;
    const chain = [];
    let cur = selectedNode;
    while (cur) {
        chain.unshift(cur);
        cur = cur.parent;
    }
    return (
        <div className="se-breadcrumb">
            {chain.map((node, i) => (
                <React.Fragment key={node.seid}>
                    {i > 0 && <span className="se-breadcrumb-sep">›</span>}
                    <button
                        type="button"
                        className={'se-breadcrumb-item' + (node.seid === selectedNode.seid ? ' is-current' : '')}
                        onClick={() => onSelect(node.seid)}
                    >
                        {node.tag}
                        {node.el.getAttribute('id') ? `#${node.el.getAttribute('id')}` : ''}
                    </button>
                </React.Fragment>
            ))}
        </div>
    );
}

function SvgEditorApp() {
    const [inputMarkup, setInputMarkup] = useState(SAMPLE_SVG);
    const [loadError, setLoadError] = useState(null);
    const [treeRoot, setTreeRoot] = useState(null);
    const [selectedSeid, setSelectedSeid] = useState(null);
    const [editVersion, setEditVersion] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [copyStatus, setCopyStatus] = useState('');

    const canvasRef = useRef(null);
    const canvasScrollRef = useRef(null);
    const svgRootRef = useRef(null);
    const seidMapRef = useRef(new Map());
    const nextSeidRef = useRef(0);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const el = canvasScrollRef.current;
        if (!el) return;
        const handleWheel = (e) => {
            if (!e.shiftKey) return;
            e.preventDefault();
            const step = 0.2 * Math.sign(-e.deltaY);
            setZoom((z) => {
                const next = Math.round((z + step) * 100) / 100;
                return Math.min(8, Math.max(0.2, next));
            });
        };
        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, []);

    const loadMarkup = useCallback((markup) => {
        setLoadError(null);
        let doc;
        try {
            doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
        } catch (e) {
            setLoadError('Не удалось разобрать SVG: ' + e.message);
            return;
        }
        if (doc.querySelector('parsererror')) {
            setLoadError('В разметке SVG есть ошибки — проверьте синтаксис.');
            return;
        }
        const root = doc.documentElement;
        if (!root || root.tagName.toLowerCase() !== 'svg') {
            setLoadError('Корневой элемент документа должен быть <svg>.');
            return;
        }

        const imported = document.importNode(root, true);
        const counter = { value: 0 };
        const map = new Map();
        const tree = buildTree(imported, null, counter, map);

        seidMapRef.current = map;
        nextSeidRef.current = counter.value;
        svgRootRef.current = imported;
        if (canvasRef.current) {
            canvasRef.current.replaceChildren(imported);
        }
        setTreeRoot(tree);
        setSelectedSeid(null);
        setEditVersion((v) => v + 1);
    }, []);

    useEffect(() => {
        loadMarkup(SAMPLE_SVG);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const selectSeid = useCallback((seid) => {
        setSelectedSeid((prevSeid) => {
            const map = seidMapRef.current;
            if (prevSeid !== null && prevSeid !== seid) {
                const prevNode = map.get(prevSeid);
                if (prevNode) prevNode.el.removeAttribute('data-svg-editor-selected');
            }
            const node = map.get(seid);
            if (node) node.el.setAttribute('data-svg-editor-selected', 'true');
            return seid;
        });
    }, []);

    const insertShape = useCallback(
        (tag) => {
            const svgRoot = svgRootRef.current;
            const factory = SHAPE_FACTORIES[tag];
            if (!svgRoot || !factory) return;

            const newEl = factory();
            const selNode = selectedSeid !== null ? seidMapRef.current.get(selectedSeid) : null;

            let parentNode;
            let insertIndex;
            if (selNode && CONTAINER_TAGS.has(selNode.tag)) {
                selNode.el.appendChild(newEl);
                parentNode = selNode;
                insertIndex = parentNode.children.length;
            } else if (selNode && selNode.parent) {
                selNode.parent.el.insertBefore(newEl, selNode.el.nextSibling);
                parentNode = selNode.parent;
                insertIndex = parentNode.children.indexOf(selNode) + 1;
            } else {
                svgRoot.appendChild(newEl);
                parentNode = treeRoot;
                insertIndex = parentNode ? parentNode.children.length : 0;
            }
            if (!parentNode) return;

            const seid = nextSeidRef.current++;
            const newNode = registerNode(newEl, seid, parentNode, seidMapRef.current);
            parentNode.children.splice(insertIndex, 0, newNode);

            setEditVersion((v) => v + 1);
            selectSeid(seid);
        },
        [selectedSeid, treeRoot, selectSeid]
    );

    const deleteSelected = useCallback(() => {
        const node = selectedSeid !== null ? seidMapRef.current.get(selectedSeid) : null;
        if (!node || !node.parent) return;

        node.el.remove();
        const siblings = node.parent.children;
        const idx = siblings.indexOf(node);
        if (idx !== -1) siblings.splice(idx, 1);

        const removeFromMap = (n) => {
            seidMapRef.current.delete(n.seid);
            n.children.forEach(removeFromMap);
        };
        removeFromMap(node);

        setSelectedSeid(null);
        setEditVersion((v) => v + 1);
    }, [selectedSeid]);

    const dragStateRef = useRef(null);

    const handleWindowMouseMove = useCallback((e) => {
        const drag = dragStateRef.current;
        if (!drag || !drag.parentCtm) return;
        const dxScreen = e.clientX - drag.startX;
        const dyScreen = e.clientY - drag.startY;
        if (!drag.moved && Math.hypot(dxScreen, dyScreen) < 3) return;
        drag.moved = true;

        const inverse = drag.parentCtm.inverse();
        const p0 = new DOMPoint(0, 0).matrixTransform(inverse);
        const p1 = new DOMPoint(dxScreen, dyScreen).matrixTransform(inverse);
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        const suffix = drag.originalTransform ? ` ${drag.originalTransform}` : '';
        drag.el.setAttribute('transform', `translate(${dx} ${dy})${suffix}`);
    }, []);

    const handleWindowMouseUp = useCallback(() => {
        const drag = dragStateRef.current;
        dragStateRef.current = null;
        window.removeEventListener('mousemove', handleWindowMouseMove);
        window.removeEventListener('mouseup', handleWindowMouseUp);
        if (drag && drag.moved) setEditVersion((v) => v + 1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(
        () => () => {
            window.removeEventListener('mousemove', handleWindowMouseMove);
            window.removeEventListener('mouseup', handleWindowMouseUp);
        },
        [handleWindowMouseMove, handleWindowMouseUp]
    );

    const handleCanvasMouseDown = useCallback(
        (e) => {
            if (e.button !== 0) return;
            const target = e.target.closest && e.target.closest('[data-seid]');
            if (!target) return;
            const seid = Number(target.dataset.seid);
            selectSeid(seid);

            const node = seidMapRef.current.get(seid);
            if (!node || !node.parent) return;
            const parentCtm = node.parent.el.getScreenCTM && node.parent.el.getScreenCTM();
            if (!parentCtm) return;

            dragStateRef.current = {
                el: node.el,
                parentCtm,
                startX: e.clientX,
                startY: e.clientY,
                originalTransform: node.el.getAttribute('transform') || '',
                moved: false,
            };
            window.addEventListener('mousemove', handleWindowMouseMove);
            window.addEventListener('mouseup', handleWindowMouseUp);
            e.preventDefault();
        },
        [selectSeid, handleWindowMouseMove, handleWindowMouseUp]
    );

    const handleCanvasMouseOver = useCallback((e) => {
        const target = e.target.closest && e.target.closest('[data-seid]');
        if (target) target.setAttribute('data-svg-editor-hover', 'true');
    }, []);

    const handleCanvasMouseOut = useCallback((e) => {
        const target = e.target.closest && e.target.closest('[data-seid]');
        if (target) target.removeAttribute('data-svg-editor-hover');
    }, []);

    const bumpEdit = useCallback(() => setEditVersion((v) => v + 1), []);

    const selectedNode = selectedSeid !== null ? seidMapRef.current.get(selectedSeid) : null;
    const selectedEl = selectedNode ? selectedNode.el : null;

    const exportMarkup = useMemo(
        () => cleanExportMarkup(svgRootRef.current),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [editVersion, treeRoot]
    );

    const handleFile = useCallback(
        (file) => {
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                const text = String(reader.result || '');
                setInputMarkup(text);
                loadMarkup(text);
            };
            reader.readAsText(file);
        },
        [loadMarkup]
    );

    const handleDrop = useCallback(
        (e) => {
            e.preventDefault();
            const file = e.dataTransfer.files && e.dataTransfer.files[0];
            if (file) handleFile(file);
        },
        [handleFile]
    );

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(exportMarkup);
            setCopyStatus('Скопировано!');
        } catch {
            setCopyStatus('Не удалось скопировать');
        }
        setTimeout(() => setCopyStatus(''), 1800);
    }, [exportMarkup]);

    const handleDownload = useCallback(() => {
        const blob = new Blob([exportMarkup], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'edited.svg';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }, [exportMarkup]);

    return (
        <div className="se-page">
            <header className="se-navbar">
                <div className="se-navbar-title">SVG Editor</div>
                <div className="se-navbar-hint">
                    Кликните по элементу, чтобы выделить его, или перетащите мышкой, чтобы переместить
                </div>
            </header>

            <div className="se-body">
                <aside className="se-sidebar se-sidebar-left">
                    <div className="se-sidebar-section">
                        <div className="se-panel-label">Загрузка SVG</div>
                        <textarea
                            className="se-textarea"
                            value={inputMarkup}
                            onChange={(e) => setInputMarkup(e.target.value)}
                            spellCheck={false}
                        />
                        {loadError && <div className="se-error">{loadError}</div>}
                        <div className="se-inline-form">
                            <button type="button" className="se-btn se-btn-primary" onClick={() => loadMarkup(inputMarkup)}>
                                Загрузить
                            </button>
                            <button type="button" className="se-btn" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
                                Файл…
                            </button>
                            <button
                                type="button"
                                className="se-btn se-btn-ghost"
                                onClick={() => {
                                    setInputMarkup(SAMPLE_SVG);
                                    loadMarkup(SAMPLE_SVG);
                                }}
                            >
                                Пример
                            </button>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".svg,image/svg+xml"
                            style={{ display: 'none' }}
                            onChange={(e) => handleFile(e.target.files && e.target.files[0])}
                        />
                    </div>

                    <div className="se-sidebar-section se-sidebar-section-grow">
                        <div className="se-panel-label">Дерево элементов</div>
                        <div className="se-tree">
                            {treeRoot ? (
                                <TreeNode node={treeRoot} selectedSeid={selectedSeid} onSelect={selectSeid} depth={0} />
                            ) : (
                                <div className="se-muted">Нет загруженного SVG</div>
                            )}
                        </div>
                    </div>
                </aside>

                <main className="se-canvas-wrap">
                    <div className="se-toolbar">
                        <Breadcrumb selectedNode={selectedNode} onSelect={selectSeid} />
                        <div className="se-zoom-controls">
                            <button type="button" className="se-btn se-btn-icon" onClick={() => setZoom((z) => Math.max(0.2, z - 0.2))}>
                                −
                            </button>
                            <span className="se-zoom-value">{Math.round(zoom * 100)}%</span>
                            <button type="button" className="se-btn se-btn-icon" onClick={() => setZoom((z) => Math.min(8, z + 0.2))}>
                                +
                            </button>
                            <button type="button" className="se-btn se-btn-ghost" onClick={() => setZoom(1)}>
                                сброс
                            </button>
                            <span className="se-muted">Shift + колесо мыши — зум</span>
                        </div>
                    </div>
                    <div className="se-toolbar se-toolbar-secondary">
                        <span className="se-panel-label se-toolbar-add-label">Добавить фигуру:</span>
                        {Object.keys(SHAPE_FACTORIES).map((tag) => (
                            <button
                                key={tag}
                                type="button"
                                className="se-btn"
                                disabled={!treeRoot}
                                onClick={() => insertShape(tag)}
                            >
                                {SHAPE_LABELS[tag]}
                            </button>
                        ))}
                        <span className="se-muted">
                            {selectedNode
                                ? CONTAINER_TAGS.has(selectedNode.tag)
                                    ? '— добавится внутрь выбранного элемента'
                                    : '— добавится рядом с выбранным элементом'
                                : '— добавится в корень SVG'}
                        </span>
                    </div>
                    <div
                        className="se-canvas-scroll"
                        ref={canvasScrollRef}
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                    >
                        <div
                            className="se-canvas"
                            style={{ transform: `scale(${zoom})` }}
                            ref={canvasRef}
                            onMouseDown={handleCanvasMouseDown}
                            onMouseOver={handleCanvasMouseOver}
                            onMouseOut={handleCanvasMouseOut}
                        />
                    </div>
                </main>

                <aside className="se-sidebar se-sidebar-right">
                    <div className="se-sidebar-section">
                        <Inspector
                            el={selectedEl}
                            viewBoxSize={getViewBoxSize(svgRootRef.current)}
                            onChange={bumpEdit}
                            onSelectParent={() => selectedNode && selectedNode.parent && selectSeid(selectedNode.parent.seid)}
                            onDelete={deleteSelected}
                            canDelete={Boolean(selectedNode && selectedNode.parent)}
                        />
                    </div>

                    <div className="se-sidebar-section se-sidebar-section-grow">
                        <div className="se-panel-label">Результат</div>
                        <textarea className="se-textarea se-textarea-readonly" value={exportMarkup} readOnly spellCheck={false} />
                        <div className="se-inline-form">
                            <button type="button" className="se-btn se-btn-primary" onClick={handleCopy}>
                                Копировать
                            </button>
                            <button type="button" className="se-btn" onClick={handleDownload}>
                                Скачать .svg
                            </button>
                            {copyStatus && <span className="se-muted">{copyStatus}</span>}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}

const container = document.getElementById('svg-editor-app');
if (container) {
    createRoot(container).render(<SvgEditorApp />);
}
