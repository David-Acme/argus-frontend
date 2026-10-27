import { createEngine, playEvent, stepEngine } from './engine';
import { createScratch, paintParticles, type Scratch } from './frame';
import { paintIcon } from './icon';
import type { Engine, Frame, Palette, PresenceEvent, PresenceState, Sinks } from './types';

export type DriverInput = {
  state: PresenceState;
  resting: boolean;
  intensity: number;
  targetX: number;
  targetY: number;
  eventName: PresenceEvent | null;
  eventId: number;
};

export type Driver = {
  engine: Engine;
  scratch: Scratch;
  last: number;
  due: number;
  sim: number;
  simOdd: number;
  eventId: number;
  scroll: number;
  scrollAt: number;
};

export type Tick = {
  now: number;
  input: DriverInput;
  level: number | null;
  scroll: number;
  leanX: number;
  leanY: number;
  steps: number;
  lag: number;
  split: boolean;
};

export type Look = {
  size: number;
  palette: Palette;
  dark: boolean;
  activeFps: number;
  restFps: number;
  leanWhileScrolling: boolean;
};

const SCROLL_QUIET = 0.2;
const DRIFT_PX = 160;
export const MAX_FPS = 120;
export const STEP_HZ = 60;
const STEP = 1 / STEP_HZ;
const DUE_SLACK = 0.002;
const MIN_SPACING = 0.7;
const MAX_STEPS = 3;
const STEP_SLACK = 0.25;

export function createDriver(count: number, seed: number): Driver {
  'worklet';
  return {
    engine: createEngine(count, seed),
    scratch: createScratch(),
    last: 0,
    due: 0,
    sim: 0,
    simOdd: 0,
    eventId: 0,
    scroll: 0,
    scrollAt: -1,
  };
}

export function frameInterval(driver: Driver, tick: Tick, look: Look): number {
  'worklet';
  const resting = tick.input.resting && driver.engine.event === null;
  return 1 / Math.min(MAX_FPS, resting ? look.restFps : look.activeFps);
}

function lockstep(driver: Driver, tick: Tick, elapsed: number): void {
  'worklet';
  tick.steps = Math.max(1, Math.min(MAX_STEPS, Math.round(elapsed * STEP_HZ)));
  tick.lag = 0;
  tick.split = false;
  driver.sim = driver.simOdd = tick.now;
}

function stepsSince(sim: number, now: number): number {
  'worklet';
  return Math.floor((now - sim) * STEP_HZ + STEP_SLACK);
}

function interleaved(driver: Driver, tick: Tick): void {
  'worklet';
  const { now } = tick;
  if (driver.simOdd === driver.sim) driver.simOdd = driver.sim - STEP / 2;
  if (stepsSince(driver.sim, now) > MAX_STEPS) driver.sim = now - STEP;
  if (stepsSince(driver.simOdd, now) > MAX_STEPS) driver.simOdd = now - STEP / 2;
  tick.steps = Math.max(0, stepsSince(driver.sim, now));
  tick.lag = Math.max(0, stepsSince(driver.simOdd, now));
  tick.split = true;
  driver.sim += tick.steps * STEP;
  driver.simOdd += tick.lag * STEP;
}

export function frameDue(driver: Driver, tick: Tick, look: Look): boolean {
  'worklet';
  const interval = frameInterval(driver, tick, look);
  const { now } = tick;
  const { last, due } = driver;
  if (last > 0 && (now < due - DUE_SLACK || now - last < interval * MIN_SPACING)) return false;
  driver.due = last > 0 && now - due < interval ? due + interval : now + interval;
  driver.last = now;
  if (last === 0 || interval >= STEP - DUE_SLACK) lockstep(driver, tick, last > 0 ? now - last : 0);
  else interleaved(driver, tick);
  return tick.steps + tick.lag > 0;
}

function scrolling(driver: Driver, tick: Tick): boolean {
  'worklet';
  if (tick.scroll !== driver.scroll) {
    driver.scroll = tick.scroll;
    driver.scrollAt = tick.now;
  }
  return driver.scrollAt >= 0 && tick.now - driver.scrollAt < SCROLL_QUIET;
}

export function advance(driver: Driver, tick: Tick, look: Look): Frame {
  'worklet';
  const { engine } = driver;
  const { input } = tick;
  const t = tick.now + engine.t0;
  engine.intensity = input.intensity;
  engine.tx = input.targetX;
  engine.ty = input.targetY;
  if (input.eventName && input.eventId !== driver.eventId) {
    driver.eventId = input.eventId;
    playEvent(engine, input.eventName, t);
  }
  const quiet = look.leanWhileScrolling || !scrolling(driver, tick);
  const scroll = Math.min(Math.max(tick.scroll, 0), DRIFT_PX) / DRIFT_PX;
  const motion = {
    state: input.state,
    level: tick.level,
    leanX: quiet ? tick.leanX : 0,
    leanY: quiet ? tick.leanY : 0,
    scroll: quiet ? scroll : 0,
  };
  const { steps, lag, split } = tick;
  for (let i = 0; i < steps; i++)
    stepEngine(engine, {
      ...motion,
      t: driver.sim + engine.t0 - (steps - 1 - i) * STEP,
      slice: split ? 0 : -1,
    });
  for (let i = 0; i < lag; i++)
    stepEngine(engine, {
      ...motion,
      t: driver.simOdd + engine.t0 - (lag - 1 - i) * STEP,
      slice: 1,
    });
  return {
    state: input.state,
    t,
    size: look.size,
    palette: look.palette,
    dark: look.dark,
    stepped: steps > 0,
    drawn: split ? (steps > 0 ? 1 : 0) | (lag > 0 ? 2 : 0) : 3,
  };
}

export function paintFrame(driver: Driver, frame: Frame, sinks: Sinks): void {
  'worklet';
  const paint = { frame, engine: driver.engine, scratch: driver.scratch, sinks };
  if (driver.engine.particles.length > 0) paintParticles(paint);
  else paintIcon(paint);
}

export function takeEndedEvent(driver: Driver): PresenceEvent | null {
  'worklet';
  const ended = driver.engine.endedEvent;
  driver.engine.endedEvent = null;
  return ended;
}

export type StillPass = { begin: () => void; sinks: Sinks; end: () => void };

export type StillSpec = { count: number; seed: number };

export type StillInput = { input: DriverInput; look: Look; pass: StillPass };

export function paintStill(spec: StillSpec, { input, look, pass }: StillInput): void {
  'worklet';
  const driver = createDriver(spec.count, spec.seed);
  const { engine } = driver;
  const base = 8;
  const frameAt = (i: number): Tick => {
    driver.sim = base + i / STEP_HZ;
    return {
      now: driver.sim,
      input,
      level: null,
      scroll: 0,
      leanX: 0,
      leanY: 0,
      steps: 1,
      lag: 0,
      split: false,
    };
  };
  if (engine.particles.length === 0) {
    pass.begin();
    paintFrame(driver, advance(driver, frameAt(0), look), pass.sinks);
    pass.end();
    return;
  }
  for (let i = 0; i < 240; i++) advance(driver, frameAt(i), look);
  for (const p of engine.particles) {
    p.px = p.hx = p.x;
    p.py = p.hy = p.y;
  }
  for (let i = 0; i < 14; i++) {
    pass.begin();
    paintFrame(driver, advance(driver, frameAt(240 + i), look), pass.sinks);
    pass.end();
  }
}
