import { alphaFor, colorFor, eventMods, mixInto, type Color } from './paint';
import { isEye, pupilX } from './shapes';
import type { Engine, EventMods, Frame, Particle, Stroke, StrokeSink } from './types';

const TAU = Math.PI * 2;
const STREAK_LIMIT = 0.12;

export type Scratch = { stroke: Stroke; color: Color; mods: EventMods };

export function createScratch(): Scratch {
  'worklet';
  return {
    stroke: { round: true, x1: 0, y1: 0, x2: 0, y2: 0, r: 0, g: 0, b: 0, a: 0, w: 1 },
    color: [0, 0, 0],
    mods: { alpha: 1, saturation: 1, band: null, glint: 0 },
  };
}

export type Paint = { frame: Frame; engine: Engine; scratch: Scratch; sink: StrokeSink };

export function stageScale(frame: Frame): number {
  'worklet';
  const breath = frame.state === 'watch' ? 1 : 1 + 0.02 * Math.sin(frame.t * TAU * 0.2);
  return frame.size * (frame.size < 120 ? 0.52 : 0.44) * breath;
}

function emit(paint: Paint, color: Color, alpha: number): void {
  'worklet';
  const stroke = paint.scratch.stroke;
  stroke.r = color[0];
  stroke.g = color[1];
  stroke.b = color[2];
  stroke.a = Math.min(1, alpha);
  paint.sink(stroke);
}

export type Sparkle = { x: number; y: number; r: number; a: number; color: Color };

export function sparkle(paint: Paint, spark: Sparkle): void {
  'worklet';
  const { x, y, r } = spark;
  const s = paint.scratch.stroke;
  s.round = true;
  const lines: readonly (readonly [number, number, number, number, number])[] = [
    [x - r, y, x + r, y, Math.max(1, r * 0.18)],
    [x, y - r, x, y + r, Math.max(1, r * 0.18)],
    [x - r * 0.5, y - r * 0.5, x + r * 0.5, y + r * 0.5, Math.max(0.8, r * 0.1)],
    [x + r * 0.5, y - r * 0.5, x - r * 0.5, y + r * 0.5, Math.max(0.8, r * 0.1)],
  ];
  for (const [x1, y1, x2, y2, w] of lines) {
    s.x1 = x1;
    s.y1 = y1;
    s.x2 = x2;
    s.y2 = y2;
    s.w = w;
    emit(paint, spark.color, spark.a);
  }
}

type ParticleLook = { base: number; gx: number };

function particleAlpha(paint: Paint, p: Particle, look: ParticleLook): number {
  'worklet';
  const { frame, scratch } = paint;
  const { state, palette, t } = frame;
  let a = look.base * (0.4 + 0.6 * Math.sin(Math.PI * p.u));
  const color = scratch.color;
  if (isEye(state) && state !== 'notfound' && p.s >= 0.76) {
    mixInto(color, palette.a, palette.w, 0.6);
    a = Math.min(1, look.base * (frame.dark ? 0.9 : 1.4));
  }
  if (state === 'search' && p.s < 0.76) a *= 1 + 0.8 * Math.max(0, 1 - Math.abs(p.x - look.gx) / 0.25);
  if (state === 'watch' && p.s >= 0.78) {
    mixInto(color, palette.w, palette.w, 0);
    a = Math.min(1, look.base * 1.5);
  }
  if (state === 'happy' && p.s > 0.86) {
    const k = (t * 0.7 + p.v * 0.5 + 1) % 1;
    a = look.base * (1 - k) * 1.4;
    mixInto(color, palette.w, palette.w, 0);
  }
  const band = scratch.mods.band;
  if (band !== null) a *= 1 + 2 * Math.max(0, 1 - Math.abs(Math.min(1, Math.abs(p.x) / 0.85) - band) / 0.18);
  return a;
}

function density(paint: Paint): number {
  'worklet';
  if (!paint.frame.dark) return 1;
  const n = paint.engine.particles.length;
  return Math.min(1, paint.frame.palette.density * (n >= 500 ? 1 : n >= 300 ? 1.1 : 1.5));
}

export function paintParticles(paint: Paint): void {
  'worklet';
  const { frame, engine, scratch } = paint;
  const { state, palette, size, t } = frame;
  const mods = eventMods(engine, t, scratch.mods);
  const scale = stageScale(frame);
  const half = size / 2;
  const look: ParticleLook = {
    base: alphaFor(state, engine, t) * mods.alpha * density(paint),
    gx: isEye(state) ? pupilX(state, t, engine) : 0,
  };
  const lw = size >= 150 ? 1.15 : 1;
  const stroke = scratch.stroke;
  stroke.round = true;
  stroke.w = (frame.dark ? lw : lw + 0.25) * (size < 90 ? 1.3 : 1);
  for (const p of engine.particles) {
    if (Math.abs(p.x - p.px) + Math.abs(p.y - p.py) > STREAK_LIMIT) continue;
    colorFor(palette, state, p.u, scratch.color);
    if (mods.saturation < 1) mixInto(scratch.color, palette.g, scratch.color, mods.saturation);
    const a = particleAlpha(paint, p, look);
    stroke.x1 = half + p.px * scale;
    stroke.y1 = half + p.py * scale;
    stroke.x2 = half + p.x * scale;
    stroke.y2 = half + p.y * scale;
    emit(paint, scratch.color, a);
  }
  if (mods.glint > 0) {
    const color = scratch.color;
    mixInto(color, palette.glint, palette.glint, 0);
    sparkle(paint, {
      x: half + look.gx * scale + scale * 0.12,
      y: half - scale * 0.12,
      r: scale * 0.12 * (0.4 + mods.glint),
      a: Math.min(1, mods.glint * 1.2),
      color,
    });
  }
}

export function trailFade(frame: Frame, trails: boolean): number {
  'worklet';
  return trails ? frame.palette.trail : 1;
}
