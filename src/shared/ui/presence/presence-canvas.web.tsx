import { useEffect, useRef, useState } from 'react';
import {
  advance,
  createDriver,
  paintFrame,
  paintStill,
  frameDue,
  takeEndedEvent,
  type Driver,
  type DriverInput,
  type Look,
  type StillSpec,
  type Tick,
} from './engine/driver';
import { STREAK_FIELDS, type Sinks, type Stroke } from './engine/types';
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
    { passive: true }
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

function streaksTo(context: CanvasRenderingContext2D, streaks: Float32Array, count: number): void {
  for (let i = 0; i < count; i++) {
    const o = i * STREAK_FIELDS;
    context.globalAlpha = streaks[o + 7] ?? 0;
    context.strokeStyle = `#${hex(streaks[o + 4] ?? 0)}${hex(streaks[o + 5] ?? 0)}${hex(streaks[o + 6] ?? 0)}`;
    context.beginPath();
    context.moveTo(streaks[o] ?? 0, streaks[o + 1] ?? 0);
    context.lineTo(streaks[o + 2] ?? 0, streaks[o + 3] ?? 0);
    context.stroke();
  }
}

function sinksFor(context: CanvasRenderingContext2D): Sinks {
  return {
    stroke: (stroke: Stroke) => strokeTo(context, stroke),
    streaks: (streaks, count, width) => {
      context.lineWidth = width;
      streaksTo(context, streaks, count);
    },
  };
}

type Surface = {
  context: CanvasRenderingContext2D;
  size: number;
  ratio: number;
  additive: boolean;
};

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
    const observer = new IntersectionObserver(
      (entries) => setVisible(entries.some((entry) => entry.isIntersecting)),
      {
        rootMargin: '120px',
      }
    );
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [ref]);
  return visible;
}

type CanvasJob = {
  element: () => HTMLCanvasElement | null;
  surface: Surface;
  driver: Driver;
  live: PresenceCanvasProps['live'];
  look: Look;
  fade: number;
  onEventEnd: PresenceCanvasProps['onEventEnd'];
};

type StillJob = {
  surface: Surface;
  spec: StillSpec;
  input: DriverInput;
  look: Look;
  fade: number;
};

function paintStillCanvas({ surface, spec, input, look, fade }: StillJob): undefined {
  begin(surface, 1);
  const sinks = sinksFor(surface.context);
  paintStill(spec, {
    input,
    look,
    pass: { begin: () => begin(surface, fade), sinks, end: () => undefined },
  });
  return undefined;
}

function startLoop(job: CanvasJob): () => void {
  const { surface, driver, live, look, fade } = job;
  const sinks = sinksFor(surface.context);
  trackPointer();
  let handle = 0;
  const loop = (ms: number) => {
    handle = globalThis.requestAnimationFrame(loop);
    const canvas = job.element();
    if (!canvas) return;
    const [leanX, leanY] = leanOf(canvas);
    const tick: Tick = {
      now: ms / 1000,
      input: live.input.get(),
      level: live.level ? live.level.get() : null,
      scroll: live.scroll ? live.scroll.get() : 0,
      leanX,
      leanY,
      steps: 1,
      lag: 0,
      split: false,
    };
    if (!frameDue(driver, tick, look)) return;
    const frame = advance(driver, tick, look);
    begin(surface, fade < 1 && !frame.stepped ? 0 : fade);
    paintFrame(driver, frame, sinks);
    const ended = takeEndedEvent(driver);
    if (ended) job.onEventEnd?.(ended);
  };
  handle = globalThis.requestAnimationFrame(loop);
  return () => globalThis.cancelAnimationFrame(handle);
}

export function PresenceCanvas({
  plan,
  look,
  live,
  seed,
  active,
  still,
  onEventEnd,
}: PresenceCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const driver = useRef<Driver | null>(null);
  const visible = useVisible(ref);
  const ratio = Math.min(MAX_RATIO, globalThis.devicePixelRatio || 1);
  const pixels = Math.round(plan.size * ratio);
  const fade = plan.trails ? look.palette.trail : 1;
  const running = active && visible && !plan.still;
  const box = { width: plan.size, height: plan.size, display: 'block' };

  useEffect(() => {
    driver.current = createDriver(plan.count, seed);
  }, [plan.count, seed]);

  useEffect(() => {
    const context = ref.current?.getContext('2d');
    if (!context) return;
    const surface = { context, size: plan.size, ratio, additive: look.palette.additive };
    const trail = plan.count > 0 ? fade : 1;
    if (plan.still)
      return paintStillCanvas({
        surface,
        spec: { count: plan.count, seed },
        input: still,
        look,
        fade: trail,
      });
    const current = driver.current;
    if (!running || !current) return;
    return startLoop({
      element: () => ref.current,
      surface,
      driver: current,
      live,
      look,
      fade: trail,
      onEventEnd,
    });
  }, [
    running,
    plan.still,
    plan.size,
    plan.count,
    seed,
    still,
    ratio,
    look,
    fade,
    live,
    onEventEnd,
  ]);

  return <canvas ref={ref} width={pixels} height={pixels} style={box} aria-hidden />;
}
