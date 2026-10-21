import { alphaFor, colorFor, copyInto, eventMods, towards, type Color } from './paint';
import { isEye, pupilX } from './shapes';
import {
  STREAK_FIELDS,
  type Engine,
  type EventMods,
  type Frame,
  type Particle,
  type Sinks,
  type Stroke,
} from './types';

const TAU = Math.PI * 2;
const STREAK_LIMIT = 0.12;

export type Scratch = {
  stroke: Stroke;
  color: Color;
  mods: EventMods;
  tintKey: string;
  tints: number[];
  streaks: Float32Array;
};

export function createScratch(): Scratch {
  'worklet';
  return {
    stroke: { round: true, x1: 0, y1: 0, x2: 0, y2: 0, r: 0, g: 0, b: 0, a: 0, w: 1 },
    color: [0, 0, 0],
    mods: { alpha: 1, saturation: 1, band: null, glint: 0 },
    tintKey: '',
    tints: [],
    streaks: new Float32Array(0),
  };
}

export type Paint = { frame: Frame; engine: Engine; scratch: Scratch; sinks: Sinks };

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
  paint.sinks.stroke(stroke);
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
    towards(copyInto(color, palette.a), palette.w, 0.6);
    a = Math.min(1, look.base * (frame.dark ? 0.9 : 1.4));
  }
  if (state === 'search' && p.s < 0.76)
    a *= 1 + 0.8 * Math.max(0, 1 - Math.abs(p.x - look.gx) / 0.25);
  if (state === 'watch' && p.s >= 0.78) {
    copyInto(color, palette.w);
    a = Math.min(1, look.base * 1.5);
  }
  if (state === 'happy' && p.s > 0.86) {
    const k = (t * 0.7 + p.v * 0.5 + 1) % 1;
    a = look.base * (1 - k) * 1.4;
    copyInto(color, palette.w);
  }
  const band = scratch.mods.band;
  if (band !== null)
    a *= 1 + 2 * Math.max(0, 1 - Math.abs(Math.min(1, Math.abs(p.x) / 0.85) - band) / 0.18);
  return a;
}

function density(paint: Paint): number {
  'worklet';
  if (!paint.frame.dark) return 1;
  const n = paint.engine.particles.length;
  return Math.min(1, paint.frame.palette.density * (n >= 500 ? 1 : n >= 300 ? 1.1 : 1.5));
}

const TINT_FIELDS = 4;

function particleTints(paint: Paint): number[] {
  'worklet';
  const { frame, engine, scratch } = paint;
  const { particles } = engine;
  const key = `${frame.state}|${frame.dark}|${scratch.mods.saturation}|${particles.length}`;
  if (scratch.tintKey === key) return scratch.tints;
  const color = scratch.color;
  const tints = scratch.tints;
  tints.length = particles.length * TINT_FIELDS;
  for (let i = 0; i < particles.length; i++) {
    const u = particles[i]?.u ?? 0;
    colorFor(frame, u, color);
    if (scratch.mods.saturation < 1) towards(color, frame.palette.g, 1 - scratch.mods.saturation);
    const at = i * TINT_FIELDS;
    tints[at] = color[0];
    tints[at + 1] = color[1];
    tints[at + 2] = color[2];
    tints[at + 3] = 0.4 + 0.6 * Math.sin(Math.PI * u);
  }
  scratch.tintKey = key;
  return tints;
}

function streakBuffer(scratch: Scratch, count: number): Float32Array {
  'worklet';
  if (scratch.streaks.length < count * STREAK_FIELDS)
    scratch.streaks = new Float32Array(count * STREAK_FIELDS);
  return scratch.streaks;
}

function plainAlpha(paint: Paint): boolean {
  'worklet';
  const { state } = paint.frame;
  return (
    !isEye(state) && state !== 'watch' && state !== 'happy' && paint.scratch.mods.band === null
  );
}

type Stage = {
  half: number;
  scale: number;
  look: ParticleLook;
  tints: number[];
  out: Float32Array;
  plain: boolean;
  i: number;
  n: number;
};

function writeStreak(paint: Paint, stage: Stage, p: Particle): void {
  'worklet';
  const at = stage.i * TINT_FIELDS;
  const hx = p.x;
  const hy = p.y;
  const tx = p.hx;
  const ty = p.hy;
  p.hx = hx;
  p.hy = hy;
  if (Math.abs(hx - tx) + Math.abs(hy - ty) > STREAK_LIMIT) return;
  const { tints, out, half, scale, look } = stage;
  const color = paint.scratch.color;
  color[0] = tints[at] ?? 0;
  color[1] = tints[at + 1] ?? 0;
  color[2] = tints[at + 2] ?? 0;
  const a = stage.plain ? look.base * (tints[at + 3] ?? 0) : particleAlpha(paint, p, look);
  const o = stage.n * STREAK_FIELDS;
  out[o] = half + tx * scale;
  out[o + 1] = half + ty * scale;
  out[o + 2] = half + hx * scale;
  out[o + 3] = half + hy * scale;
  out[o + 4] = color[0];
  out[o + 5] = color[1];
  out[o + 6] = color[2];
  out[o + 7] = Math.min(1, a);
  stage.n += 1;
}

type StageInput = { half: number; scale: number; look: ParticleLook };

function writeStreaks(paint: Paint, input: StageInput): number {
  'worklet';
  const { particles } = paint.engine;
  const stage: Stage = {
    ...input,
    tints: particleTints(paint),
    out: streakBuffer(paint.scratch, particles.length),
    plain: plainAlpha(paint),
    i: 0,
    n: 0,
  };
  const { drawn } = paint.frame;
  const stride = drawn === 3 ? 1 : 2;
  for (let i = drawn === 2 ? 1 : 0; i < particles.length && drawn > 0; i += stride) {
    const p = particles[i];
    stage.i = i;
    if (p) writeStreak(paint, stage, p);
  }
  return stage.n;
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
  const width = (frame.dark ? lw : lw + 0.25) * (size < 90 ? 1.3 : 1);
  const count = writeStreaks(paint, { half, scale, look });
  paint.sinks.streaks(scratch.streaks, count, width);
  if (mods.glint > 0) {
    const color = scratch.color;
    copyInto(color, palette.glint);
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
