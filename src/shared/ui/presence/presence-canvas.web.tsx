import { useEffect, useRef, useState } from 'react';
import { advance, createDriver, paintFrame, paintStill, stepsDue, takeEndedEvent, type Driver, type Tick } from './engine/driver';
import type { Stroke } from './engine/types';
import type { PresenceCanvasProps } from './presence-canvas.types';

const MAX_RATIO = 2;
const LEAN_REACH = 380;
const LEAN_MS = 4000;
const pointer = { x: -1e4, y: -1e4, at: 0, bound: false };

function trackPointer(): void {
  if (pointer.bound) return;
  pointer.bound = true;
  globalThis.addEventListener(
    'pointermove',
    (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.at = performance.now();
    },
    { passive: true },
  );
}

function hex(value: number): string {
  return Math.max(0, Math.min(255, value | 0))
    .toString(16)
    .padStart(2, '0');
}

function strokeTo(context: CanvasRenderingContext2D, s: Stroke): void {
  context.globalAlpha = s.a;
  const color = `#${hex(s.r)}${hex(s.g)}${hex(s.b)}`;
  if (!s.round) {
    context.fillStyle = color;
    context.fillRect(s.x1 - s.w / 2, s.y1 - s.w / 2, s.w, s.w);
    return;
  }
  context.strokeStyle = color;
  context.lineWidth = s.w;
  context.beginPath();
  context.moveTo(s.x1, s.y1);
  context.lineTo(s.x2, s.y2);
  context.stroke();
}

type Surface = { context: CanvasRenderingContext2D; size: number; ratio: number; additive: boolean };

function begin(surface: Surface, fade: number): void {
  const { context, size, ratio } = surface;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.globalAlpha = fade;
  context.globalCompositeOperation = 'destination-out';
  context.fillStyle = 'black';
  context.fillRect(0, 0, size, size);
  context.globalCompositeOperation = surface.additive ? 'lighter' : 'source-over';
  context.lineCap = 'round';
}

function leanOf(canvas: HTMLCanvasElement): [number, number] {
  const rect = canvas.getBoundingClientRect();
  const dx = pointer.x - (rect.left + rect.width / 2);
  const dy = pointer.y - (rect.top + rect.height / 2);
  const near = Math.hypot(dx, dy) < LEAN_REACH && performance.now() - pointer.at < LEAN_MS;
  if (!near) return [0, 0];
  const clamp = (v: number) => Math.max(-1, Math.min(1, v / LEAN_REACH));
  return [clamp(dx) * 0.14, clamp(dy) * 0.1];
}

function useVisible(ref: React.RefObject<HTMLCanvasElement | null>): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => setVisible(entries.some((entry) => entry.isIntersecting)), {
      rootMargin: '120px',
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [ref]);
  return visible;
}

export function PresenceCanvas({ plan, look, live, seed, active, stillKey, onEventEnd }: PresenceCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const driver = useRef<Driver | null>(null);
  const visible = useVisible(ref);
  const ratio = Math.min(MAX_RATIO, globalThis.devicePixelRatio || 1);
  const pixels = Math.round(plan.size * ratio);
  const fade = plan.trails ? look.palette.trail : 1;
  const running = active && visible && !plan.still;
  const { input, level, scroll } = live;

  useEffect(() => {
    driver.current = createDriver(plan.count, seed);
  }, [plan.count, seed]);

  useEffect(() => {
    const context = ref.current?.getContext('2d');
    const current = driver.current;
    if (!context || !current) return;
    const surface: Surface = { context, size: plan.size, ratio, additive: look.palette.additive };
    const particles = current.engine.particles.length > 0;
    const sink = (stroke: Stroke) => strokeTo(context, stroke);
    if (plan.still) {
      begin(surface, 1);
      const tick: Tick = { now: 8, input: input.get(), level: null, scroll: 0, leanX: 0, leanY: 0 };
      paintStill(current, tick, look, { begin: () => begin(surface, particles ? fade : 1), sink, end: () => undefined });
      return;
    }
    if (!running) return;
    trackPointer();
    let handle = 0;
    const loop = (ms: number) => {
      handle = globalThis.requestAnimationFrame(loop);
      const canvas = ref.current;
      if (!canvas) return;
      const [leanX, leanY] = leanOf(canvas);
      const tick: Tick = { now: ms / 1000, input: input.get(), level: level ? level.get() : null, scroll: scroll ? scroll.get() : 0, leanX, leanY };
      const steps = stepsDue(current, tick, look);
      if (steps === 0) return;
      const frame = advance(current, tick, look, steps);
      begin(surface, particles ? fade : 1);
      paintFrame(current, frame, sink);
      const ended = takeEndedEvent(current);
      if (ended) onEventEnd?.(ended);
    };
    handle = globalThis.requestAnimationFrame(loop);
    return () => globalThis.cancelAnimationFrame(handle);
  }, [running, plan.still, plan.size, plan.count, stillKey, ratio, look, fade, input, level, scroll, onEventEnd]);

  return <canvas ref={ref} width={pixels} height={pixels} style={{ width: plan.size, height: plan.size, display: 'block' }} aria-hidden />;
}
