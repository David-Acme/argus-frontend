import { syntheticVoice } from './paint';
import { isEye, lerp, shapeFor, type ShapeInput } from './shapes';
import type { Engine, Particle, PresenceEvent, PresenceState } from './types';

const TAU = Math.PI * 2;
const JUMP = 0.35;

export const EVENT_SECONDS: Record<PresenceEvent, number> = {
  assemble: 2.2,
  appear: 3.4,
  disperse: 1.1,
  cancel: 1.3,
  'ripple-in': 1.6,
  'ripple-out': 1.6,
  notify: 0.9,
  glint: 1.1,
  modechange: 1.4,
  reconnect: 1.6,
  touch: 0.8,
};

export function random(engine: Engine): number {
  'worklet';
  engine.seed = (engine.seed * 16807) % 2147483647;
  return (engine.seed - 1) / 2147483646;
}

export function particleCount(size: number): number {
  'worklet';
  if (size >= 150) return 560;
  if (size >= 90) return 320;
  if (size > 48) return 200;
  return 0;
}

function spawn(engine: Engine, from: Particle | undefined): Particle {
  'worklet';
  const u = random(engine);
  const v = random(engine) * 2 - 1;
  const s = random(engine);
  const x = from ? from.x : (random(engine) - 0.5) * 1.5;
  const y = from ? from.y : (random(engine) - 0.5) * 0.6;
  return { u, v, s, x, y, px: x, py: y, hx: x, hy: y, vx: 0, vy: 0, ltx: 0, lty: 0, fresh: true };
}

export function resizeEngine(engine: Engine, count: number): void {
  'worklet';
  const { particles } = engine;
  const kept = particles.length;
  if (count < kept) particles.length = count;
  for (let i = kept; i < count; i++) {
    const from = kept > 0 ? particles[Math.floor(random(engine) * kept)] : undefined;
    particles.push(spawn(engine, from));
  }
}

export function createEngine(count: number, seed: number): Engine {
  'worklet';
  const engine: Engine = {
    particles: [],
    seed,
    t0: 0,
    lvl: 0,
    pulse: 0,
    lx: 0,
    ly: 0,
    tx: 0.3,
    ty: 0,
    intensity: 0.5,
    event: null,
    endedEvent: null,
    point: [0, 0],
  };
  resizeEngine(engine, count);
  engine.t0 = random(engine) * 20;
  return engine;
}

function scatter(engine: Engine, radius: number): void {
  'worklet';
  for (const p of engine.particles) {
    const a = random(engine) * TAU;
    const r = radius * (0.5 + random(engine));
    p.x = p.px = Math.cos(a) * r;
    p.y = p.py = Math.sin(a) * r * 0.7;
    p.vx = p.vy = 0;
  }
}

export function playEvent(engine: Engine, name: PresenceEvent, t: number): void {
  'worklet';
  engine.event = { name, start: t, duration: EVENT_SECONDS[name] };
  if (name === 'notify' || name === 'touch') engine.pulse = 1;
  if (name === 'assemble') scatter(engine, 1.8);
  if (name === 'appear') scatter(engine, 2.6);
  if (name === 'modechange') {
    for (const p of engine.particles) {
      p.vx += (random(engine) - 0.5) * 0.09;
      p.vy += (random(engine) - 0.5) * 0.07;
    }
  }
}

export type StepInput = {
  state: PresenceState;
  t: number;
  level: number | null;
  leanX: number;
  leanY: number;
  scroll: number;
  slice: number;
};

type Physics = {
  k: number;
  damping: number;
  noise: number;
  scatter: PresenceEvent | null;
  progress: number;
  t: number;
};

function physicsOf(engine: Engine, input: StepInput): Physics {
  'worklet';
  const off = input.state === 'off';
  const boost = input.state === 'panic' ? 2.6 : input.state === 'alert' ? 2 : 1;
  const event = engine.event;
  const progress = event ? (input.t - event.start) / event.duration : -1;
  const name = event && progress < 1 ? event.name : null;
  return {
    k: off ? 0.03 : 0.06,
    damping: off ? 0.7 : 0.82,
    noise: off ? 0 : 0.0016 * boost,
    scatter: name === 'disperse' || name === 'cancel' ? name : null,
    progress,
    t: input.t,
  };
}

function smoothLevel(engine: Engine, input: StepInput): void {
  'worklet';
  if (input.level === null) {
    engine.lvl = lerp(engine.lvl, syntheticVoice(input.state, input.t), 0.3);
    return;
  }
  const rate = input.level > engine.lvl ? 0.34 : 0.065;
  engine.lvl = lerp(engine.lvl, input.level, rate);
}

function settle(p: Particle, target: [number, number]): void {
  'worklet';
  if (!p.fresh && Math.abs(target[0] - p.ltx) + Math.abs(target[1] - p.lty) > JUMP) {
    p.x = p.px = target[0];
    p.y = p.py = target[1];
    p.vx = p.vy = 0;
  }
  p.fresh = false;
  p.ltx = target[0];
  p.lty = target[1];
}

function scatterTarget(p: Particle, physics: Physics, target: [number, number]): void {
  'worklet';
  const a = Math.atan2(p.y, p.x) + p.v;
  const reach = 0.05 * (1 + physics.progress * 3);
  target[0] = p.x + Math.cos(a) * reach;
  target[1] =
    p.y + Math.sin(a) * reach + (physics.scatter === 'cancel' ? 0.02 * physics.progress : 0);
}

function integrate(p: Particle, physics: Physics, target: [number, number]): void {
  'worklet';
  const t = physics.t;
  p.vx =
    (p.vx + (target[0] - p.x) * physics.k + Math.sin(p.y * 4 + t * 0.6 + p.s * 7) * physics.noise) *
    physics.damping;
  p.vy =
    (p.vy + (target[1] - p.y) * physics.k + Math.cos(p.x * 4 + t * 0.5 + p.s * 5) * physics.noise) *
    physics.damping;
  p.x += p.vx;
  p.y += p.vy;
}

export function stepEngine(engine: Engine, input: StepInput): void {
  'worklet';
  if (input.slice !== 1) {
    smoothLevel(engine, input);
    engine.pulse *= 0.95;
    engine.lx = lerp(engine.lx, input.leanX, 0.06);
    engine.ly = lerp(engine.ly, input.leanY, 0.06);
  }
  const { particles } = engine;
  if (particles.length === 0) return;
  const physics = physicsOf(engine, input);
  const shape: ShapeInput = { state: input.state, t: input.t, engine };
  const targetOf = shapeFor(input.state);
  const leans = !isEye(input.state);
  const ox = leans ? engine.lx : 0;
  const oy = leans ? engine.ly - input.scroll * 0.12 : 0;
  const target = engine.point;
  const stride = input.slice < 0 ? 1 : 2;
  for (let i = Math.max(0, input.slice); i < particles.length; i += stride) {
    const p = particles[i];
    if (!p) continue;
    p.px = p.x;
    p.py = p.y;
    targetOf(p, shape, target);
    settle(p, target);
    target[0] += ox;
    target[1] += oy;
    if (physics.scatter) scatterTarget(p, physics, target);
    integrate(p, physics, target);
  }
}
