import assert from 'node:assert/strict';
import test from 'node:test';
import { getSelectionConfigItemLabel } from './selectionConfigLabels.js';

test('formats technical selection snapshot types for people', () => {
    assert.equal(getSelectionConfigItemLabel('circuit-breaker', 'power_modules'), 'Автоматический выключатель');
    assert.equal(getSelectionConfigItemLabel('powerunit', 'power_modules'), 'Блок питания');
    assert.equal(getSelectionConfigItemLabel({ type: 'rl6sw' }, 'wifi_modules'), 'Модуль RL6SW');
    assert.equal(getSelectionConfigItemLabel({ type: 'thermostat' }, 'wireless_devices'), 'Беспроводной термостат');
    assert.equal(getSelectionConfigItemLabel({ type: 'ntc-sensor' }, 'sensors'), 'Проводной NTC-датчик в колбе');
});

test('keeps saved display names for selection snapshot items', () => {
    assert.equal(getSelectionConfigItemLabel({ type: 'smart', name: 'Baxi Slim' }, 'boilers'), 'Baxi Slim');
    assert.equal(getSelectionConfigItemLabel({ type: '220servo', _label: 'Сервопривод 220V с NTC-датчиком' }, 'wired_devices'), 'Сервопривод 220V с NTC-датчиком');
});
