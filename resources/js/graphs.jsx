import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../css/app.css';
import '../css/graphs.css';

const nodes = {
    go: { x: 488, y: 330, lines: ['GO+'], kind: 'root', info: 'Контроллер системы. От него расходятся четыре независимые линии подключения.' },
    oneWire: { x: 238, y: 205, lines: ['1-wire'], kind: 'line', info: 'Общая проводная цифровая линия GO+. До шести датчиков и термостатов.' },
    oneWireLimit: { x: 104, y: 258, lines: ['Лимит: 5 / 6', 'остался 1 слот'], kind: 'limit ok', info: 'На линии показано пять устройств: Д1-Д4 и наружный датчик. Можно добавить ещё одно совместимое 1-wire-устройство.' },
    ntc: { x: 420, y: 95, lines: ['NTC / 1-wire', 'датчики'], kind: 'group', info: 'Группа проводных датчиков температуры на линии 1-wire.' },
    d1: { x: 328, y: 28, lines: ['Д1'], kind: 'device', info: 'Первый цифровой датчик температуры.' },
    d2: { x: 412, y: 28, lines: ['Д2'], kind: 'device', info: 'Второй цифровой датчик температуры.' },
    d3: { x: 496, y: 28, lines: ['Д3'], kind: 'device', info: 'Третий цифровой датчик температуры.' },
    d4: { x: 580, y: 28, lines: ['Д4'], kind: 'device', info: 'Четвёртый цифровой датчик температуры.' },
    outdoor: { x: 140, y: 96, lines: ['Датчик', 'наружной t°'], kind: 'device', info: 'Наружный проводной датчик температуры.' },
    wifi: { x: 650, y: 215, lines: ['Wi-Fi'], kind: 'line', info: 'Отдельная беспроводная линия. GO+ поддерживает один Wi-Fi-модуль RL6W или RL6SW.' },
    wifiLimit: { x: 635, y: 290, lines: ['Лимит: 1 / 1', 'Wi-Fi-модуль'], kind: 'limit warning', info: 'RL6W уже занимает единственный Wi-Fi-слот GO+. Второй RL6W или RL6SW потребует Smart2 или старше.' },
    radio: { x: 760, y: 120, lines: ['Радиомодуль'], kind: 'group', info: 'В GO+ встроен и активирован радиомодуль для беспроводных устройств.' },
    wirelessThermostat: { x: 915, y: 210, lines: ['Термостат', 'беспроводной'], kind: 'device', info: 'Беспроводной комнатный датчик температуры из комплекта GO+.' },
    wirelessOutdoor: { x: 948, y: 105, lines: ['Наружный', 'беспроводной'], kind: 'device', info: 'Беспроводной уличный датчик температуры.' },
    bus: { x: 250, y: 455, lines: ['BUS'], kind: 'line', info: 'Цифровая шина для одного совместимого котла.' },
    busLimit: { x: 102, y: 505, lines: ['Лимит: 1 / 1', 'BUS занят'], kind: 'limit warning', info: 'Цифровой котёл занял единственный BUS-слот GO+. Добавить второй цифровой котёл нельзя.' },
    smartBoiler: { x: 250, y: 585, lines: ['Умный котёл'], kind: 'device', info: 'Цифровой котёл подключается к BUS-A и BUS-B.' },
    relay: { x: 650, y: 435, lines: ['RELAY'], kind: 'line', info: 'Одна встроенная релейная линия GO+. Для расширения количества исполнительных устройств используется RL6W.' },
    relayLimit: { x: 728, y: 506, lines: ['Конфликт: 3 / 1', 'выберите одно'], kind: 'limit error', info: 'На эскизе к встроенному RELAY одновременно подведены насос, тупой котёл и сервопривод. GO+ допускает только одно такое устройство; остальные следует перенести на RL6W или выбрать старший контроллер.' },
    pump: { x: 820, y: 370, lines: ['Насос'], kind: 'device', info: 'Насос котлового или отопительного контура.' },
    dumbBoiler: { x: 910, y: 460, lines: ['Тупой', 'котёл'], kind: 'device', info: 'Котёл с релейным управлением.' },
    servo: { x: 810, y: 560, lines: ['Сервопривод', 'зоны'], kind: 'device', info: 'Исполнительный механизм зоны или клапана.' },
    wifiModule: { x: 620, y: 570, lines: ['RL6W', '+ питание'], kind: 'module', info: 'Один Wi-Fi-модуль добавляет шесть релейных каналов и собственную линию 1-wire на шесть датчиков.' },
};

const links = [
    ['go', 'oneWire'], ['oneWire', 'ntc'], ['oneWire', 'outdoor'], ['ntc', 'd1'], ['ntc', 'd2'], ['ntc', 'd3'], ['ntc', 'd4'],
    ['go', 'wifi'], ['wifi', 'radio'], ['radio', 'wirelessThermostat'], ['radio', 'wirelessOutdoor'], ['wifi', 'wifiModule'],
    ['go', 'bus'], ['bus', 'smartBoiler'], ['go', 'relay'], ['relay', 'pump'], ['relay', 'dumbBoiler'], ['relay', 'servo'],
    ['oneWire', 'oneWireLimit'], ['wifi', 'wifiLimit'], ['bus', 'busLimit'], ['relay', 'relayLimit'],
];

const Node = ({ id, active, onSelect }) => {
    const node = nodes[id];
    const width = Math.max(...node.lines.map((line) => line.length)) * 7.2 + 36;
    const height = node.lines.length * 18 + 24;
    return <g className={`mind-node is-${node.kind}${active === id ? ' is-active' : ''}`} transform={`translate(${node.x}, ${node.y})`} onClick={() => onSelect(id)}>
        <ellipse rx={width / 2} ry={height / 2} />
        {node.lines.map((line, index) => <text key={line} y={(index - (node.lines.length - 1) / 2) * 18 + 5}>{line}</text>)}
    </g>;
};

const GraphsApp = () => {
    const [active, setActive] = useState('go');
    const selected = nodes[active];
    return <main className="mind-page">
        <header className="mind-header"><a href="/selection" className="mind-brand">MYHEAT <span>LAB</span></a><a href="/selection">К подбору</a></header>
        <section className="mind-hero"><p>Карта оборудования</p><h1>GO+ и всё, что к нему подключается</h1><span>Нажмите на любой узел: справа появится назначение линии или устройства.</span></section>
        <section className="mind-layout">
            <div className="mind-stage"><svg className="mind-canvas" viewBox="0 0 1060 635" role="img" aria-label="Граф подключений GO+">
                <defs><pattern id="mind-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#c8d5ce" strokeWidth=".7" strokeDasharray="3 4" /></pattern></defs>
                <rect width="1060" height="635" fill="url(#mind-grid)" />
                {links.map(([from, to]) => <line key={`${from}-${to}`} className={`mind-link${nodes[to].kind.startsWith('limit') ? ' is-limit' : ''}${active === from || active === to ? ' is-active' : ''}`} x1={nodes[from].x} y1={nodes[from].y} x2={nodes[to].x} y2={nodes[to].y} />)}
                {Object.keys(nodes).map((id) => <Node key={id} id={id} active={active} onSelect={setActive} />)}
            </svg></div>
            <aside className="mind-inspector"><small>Выбранный узел</small><h2>{selected.lines.join(' ')}</h2><b>{selected.kind.startsWith('limit') ? 'Ограничение' : selected.kind === 'line' ? 'Линия подключения' : selected.kind === 'module' ? 'Модуль расширения' : selected.kind === 'root' ? 'Контроллер' : 'Оборудование'}</b><p>{selected.info}</p><hr /><p className="mind-note">Сплошные связи обозначают проводные линии. Пунктирные связи - Wi-Fi и радио. Цветные прямоугольники - проверка ёмкости линии.</p></aside>
        </section>
    </main>;
};

const container = document.getElementById('graphs-app');
if (container) createRoot(container).render(<GraphsApp />);
