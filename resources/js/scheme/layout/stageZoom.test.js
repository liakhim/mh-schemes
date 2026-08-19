import assert from 'node:assert/strict';
import test from 'node:test';
import { getPinchStageTransform } from './stageZoom.js';

test('keeps the initial content point under the moving pinch midpoint', () => {
    const transform = getPinchStageTransform({
        startPoint: { x: 100, y: 100 },
        currentPoint: { x: 140, y: 120 },
        startStagePosition: { x: 20, y: 30 },
        startScale: 1,
        startDistance: 100,
        currentDistance: 200,
    });

    assert.deepEqual(transform, {
        scale: 2,
        position: { x: -20, y: -20 },
    });
});

test('clamps pinch scale while retaining the current midpoint anchor', () => {
    const transform = getPinchStageTransform({
        startPoint: { x: 100, y: 100 },
        currentPoint: { x: 120, y: 100 },
        startStagePosition: { x: 0, y: 0 },
        startScale: 2,
        startDistance: 100,
        currentDistance: 200,
    });

    assert.deepEqual(transform, {
        scale: 3,
        position: { x: -30, y: -50 },
    });
});
