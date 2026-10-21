import type { SkImage } from '@shopify/react-native-skia';
import { createDriver, paintFrame, type Driver, type Look } from './engine/driver';
import { resizeEngine } from './engine/engine';
import { createPace, type Pace } from './engine/pace';
import type { Frame, Sinks } from './engine/types';
import {
  beginFrame,
  buildSprites,
  createScene,
  disposeScene,
  endFrame,
  flushAtlas,
  setCompositing,
  strokeToAtlas,
  streaksToAtlas,
  strokeToCanvas,
  type SkiaScene,
} from './skia-scene';

export type Runtime = {
  driver: Driver;
  scene: SkiaScene;
  sinks: Sinks;
  key: string;
  pace: Pace;
};

export type Spec = { count: number; seed: number; ratio: number };

function streakWidth(look: Look): number {
  'worklet';
  const base = look.size >= 150 ? 1.15 : 1;
  return (look.dark ? base : base + 0.25) * (look.size < 90 ? 1.3 : 1);
}

function sinksFor(scene: SkiaScene, particles: boolean): Sinks {
  'worklet';
  if (!particles) return { stroke: (s) => strokeToCanvas(scene, s), streaks: () => undefined };
  return {
    stroke: (s) => strokeToAtlas(scene, s),
    streaks: (streaks, count) => streaksToAtlas(scene, streaks, count),
  };
}

export type Swap = { look: Look; spec: Spec; shown: SkImage | null };

export function prepare(current: Runtime | null, { look, spec, shown }: Swap): Runtime | null {
  'worklet';
  const key = `${look.size}|${spec.count}|${look.dark}`;
  if (current && current.key === key) return current;
  const scene = createScene({ size: look.size, ratio: spec.ratio, count: spec.count });
  if (!scene) return null;
  if (current) disposeScene(current.scene, shown);
  if (spec.count > 0) buildSprites(scene, streakWidth(look));
  setCompositing(scene, look.palette.additive);
  const driver = current ? current.driver : createDriver(spec.count, spec.seed);
  resizeEngine(driver.engine, spec.count);
  return {
    driver,
    scene,
    sinks: sinksFor(scene, spec.count > 0),
    key,
    pace: current ? current.pace : createPace(),
  };
}

export function draw(runtime: Runtime, frame: Frame, fade: number): SkImage {
  'worklet';
  const { scene, driver } = runtime;
  const particles = driver.engine.particles.length > 0;
  beginFrame(scene, particles && fade < 1 ? (frame.stepped ? fade : 0) : 1);
  paintFrame(driver, frame, runtime.sinks);
  if (particles) flushAtlas(scene, frame.palette.additive);
  return endFrame(scene);
}

export function release(runtime: Runtime | null, shown: SkImage | null): void {
  'worklet';
  if (runtime) disposeScene(runtime.scene, shown);
}
