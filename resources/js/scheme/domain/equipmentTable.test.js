import assert from 'node:assert/strict';
import test from 'node:test';
import { collectEquipmentTableRows } from './equipmentTable.js';

test('collects infoblock names and comments from public equipment buckets', () => {
    const rows = collectEquipmentTableRows({
        boilers: [{ id: 'b1', type: 'smart', name: 'Baxi', comment: 'Основной' }],
        wired_devices: [
            { id: 'p1', type: 'pump-220v', title: 'Насос котельной', comment: 'Контур 1' },
            { id: 'p2', type: 'pump-220v' },
        ],
        sensors: [],
        wireless_devices: [],
    });

    assert.deepEqual(rows, [
        { title: 'Baxi', comment: 'Основной' },
        { title: 'Насос котельной', comment: 'Контур 1' },
        { title: 'Насос 220V 2', comment: '' },
    ]);
});

test('includes only additions that have their own infoblock data', () => {
    const rows = collectEquipmentTableRows({
        sensors: [{
            id: 'loop',
            type: 'leak-loop',
            title: 'Группа датчиков протечки 1',
            additions: [
                { id: 'hidden', type: 'leak-sensor' },
                { id: 'visible', type: 'mixing-ntc-sensor', title: 'Датчик смесителя', comment: 'Подача' },
            ],
        }],
    });

    assert.deepEqual(rows, [
        { title: 'Группа датчиков протечки 1', comment: '' },
        { title: 'Датчик смесителя', comment: 'Подача' },
    ]);
});

test('adds controller and numbered expansion modules with placeholder comments', () => {
    const rows = collectEquipmentTableRows({
        controller: { type: 'pro' },
        ext_modules: [{ id: 'e1', type: 'rl6' }, { id: 'e2', type: 'rl6' }, { id: 'e3', type: 'io4' }],
        di_modules: [{ id: 'd1', type: 'rl2s' }],
        one_wire_modules: [{ id: 'o1', type: 'ntc-1-wire' }],
    });

    assert.deepEqual(rows, [
        { title: 'Контроллер PRO', comment: '—' },
        { title: 'Модуль расширения RL6 1', comment: '—' },
        { title: 'Модуль расширения RL6 2', comment: '—' },
        { title: 'Модуль расширения IO4', comment: '—' },
        { title: 'Модуль расширения RL2S', comment: '—' },
        { title: 'Модуль расширения NTC-1-wire', comment: '—' },
    ]);
});

test('includes WIFI modules in the equipment table', () => {
    const rows = collectEquipmentTableRows({
        controller: { type: 'go' },
        wifi_modules: [{ id: 'w1', type: 'rl6w' }, { id: 'w2', type: 'rl6sw' }],
    });

    assert.deepEqual(rows, [
        { title: 'Контроллер GO', comment: '—' },
        { title: 'Модуль расширения RL6W', comment: '—' },
        { title: 'Модуль расширения RL6SW', comment: '—' },
    ]);
});
