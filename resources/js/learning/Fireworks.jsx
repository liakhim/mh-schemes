import React, { useEffect, useRef } from 'react';

// Simple canvas-based firework burst (rockets that climb, then explode into fading particles),
// no external animation library - runs in the background behind a just-solved question.
const FIREWORK_COLORS = ['#f43f5e', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#eab308'];
const LAUNCH_WINDOW_MS = 2200;
const LAUNCH_CHANCE_PER_FRAME = 0.14;
const GRAVITY = 0.05;
const PARTICLE_COUNT = 56;
// The quiz canvas card sits centered over most of the background, so rockets launch from the
// left/right margins instead of anywhere across the width - otherwise most bursts would be
// hidden right behind it.
const EDGE_MARGIN = 0.02;
const EDGE_BAND = 0.18;

const randomBetween = (min, max) => min + Math.random() * (max - min);
const randomColor = () => FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
const randomEdgeX = (width) => {
    const onLeft = Math.random() < 0.5;
    const from = onLeft ? EDGE_MARGIN : 1 - EDGE_BAND;
    const to = onLeft ? EDGE_BAND : 1 - EDGE_MARGIN;
    return randomBetween(width * from, width * to);
};

const createExplosion = (x, y) => {
    const color = randomColor();
    const particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
        const angle = ((Math.PI * 2) / PARTICLE_COUNT) * i + randomBetween(-0.15, 0.15);
        const speed = randomBetween(1.5, 4.5);
        particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            color,
        });
    }
    return particles;
};

const createRocket = (width, height) => ({
    x: randomEdgeX(width),
    y: height,
    targetY: randomBetween(height * 0.15, height * 0.5),
    vy: randomBetween(-9, -7.5),
});

const Fireworks = ({ active }) => {
    const canvasRef = useRef(null);
    const stateRef = useRef({ rockets: [], particles: [], rafId: null, launchUntil: 0 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !active) return undefined;
        const ctx = canvas.getContext('2d');
        const state = stateRef.current;

        const resize = () => {
            const { width, height } = canvas.parentElement.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        window.addEventListener('resize', resize);

        const step = () => {
            const { width, height } = canvas.parentElement.getBoundingClientRect();
            ctx.clearRect(0, 0, width, height);

            const now = Date.now();
            if (now < state.launchUntil && Math.random() < LAUNCH_CHANCE_PER_FRAME) {
                state.rockets.push(createRocket(width, height));
            }

            state.rockets = state.rockets.filter((rocket) => {
                rocket.y += rocket.vy;
                rocket.vy += GRAVITY * 0.6;
                ctx.globalAlpha = 0.9;
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(rocket.x, rocket.y, 2, 0, Math.PI * 2);
                ctx.fill();
                if (rocket.vy >= 0 || rocket.y <= rocket.targetY) {
                    state.particles.push(...createExplosion(rocket.x, rocket.y));
                    return false;
                }
                return true;
            });

            state.particles = state.particles.filter((particle) => {
                particle.vy += GRAVITY;
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.alpha -= 0.014;
                if (particle.alpha <= 0) return false;
                ctx.globalAlpha = particle.alpha;
                ctx.fillStyle = particle.color;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, 2.2, 0, Math.PI * 2);
                ctx.fill();
                return true;
            });
            ctx.globalAlpha = 1;

            if (now < state.launchUntil || state.rockets.length > 0 || state.particles.length > 0) {
                state.rafId = requestAnimationFrame(step);
            } else {
                state.rafId = null;
            }
        };

        // A climbing rocket takes a beat to reach its burst height, which read as a stall
        // before anything colorful showed up - so the very first moment also gets a couple of
        // instant bursts (no climb) to react right away, while rockets keep climbing after.
        state.launchUntil = Date.now() + LAUNCH_WINDOW_MS;
        const { width: initialWidth, height: initialHeight } = canvas.parentElement.getBoundingClientRect();
        state.particles.push(
            ...createExplosion(randomEdgeX(initialWidth), randomBetween(initialHeight * 0.2, initialHeight * 0.4)),
            ...createExplosion(randomEdgeX(initialWidth), randomBetween(initialHeight * 0.2, initialHeight * 0.4)),
        );
        if (!state.rafId) state.rafId = requestAnimationFrame(step);

        // This component isn't remounted per question (it sits outside the question's own
        // keyed wrapper), so `active` going false while it's mid-burst - e.g. the user clicks
        // "Next" right after solving - has to actively stop the loop here. Otherwise it would
        // keep running (it's only self-perpetuating via its own rAF chain) and paint over
        // whatever question is on screen next.
        return () => {
            window.removeEventListener('resize', resize);
            if (state.rafId) {
                cancelAnimationFrame(state.rafId);
                state.rafId = null;
            }
            state.rockets = [];
            state.particles = [];
            const { width, height } = canvas.parentElement.getBoundingClientRect();
            ctx.clearRect(0, 0, width, height);
        };
    }, [active]);

    return <canvas ref={canvasRef} className="learning-fireworks" aria-hidden="true" />;
};

export default Fireworks;
