import { Canvas, Image, type SkImage } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { PixelRatio } from 'react-native';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';
import { advance, createDriver, paintFrame, paintStill, stepsDue, takeEndedEvent, type Driver, type Look, type Tick } from './engine/driver';
import type { PresenceEvent } from './engine/types';
import type { PresenceCanvasProps } from './presence-canvas.types';
import {
  beginFrame,
  buildSprites,
  createScene,
  endFrame,
  flushAtlas,
  setCompositing,
  strokeToAtlas,
  strokeToCanvas,
  type SkiaScene,
} from './skia-scene';

type Runtime = { driver: Driver; scene: SkiaScene; key: string };

const MAX_RATIO = 2;

function streakWidth(look: Look): number {
  'worklet';
  const base = look.size >= 150 ? 1.15 : 1;
  return (look.dark ? base : base + 0.25) * (look.size < 90 ? 1.3 : 1);
}

type Spec = { count: number; seed: number; ratio: number };

function prepare(current: Runtime | null, look: Look, spec: Spec): Runtime | null {
  'worklet';
  const key = `${look.size}|${spec.count}|${look.dark}`;
  if (current && current.key === key) return current;
  const scene = createScene({ size: look.size, ratio: spec.ratio, count: spec.count });
  if (!scene) return null;
  if (spec.count > 0) buildSprites(scene, streakWidth(look));
  setCompositing(scene, look.palette.additive);
  return { driver: createDriver(spec.count, spec.seed), scene, key };
}

function draw(runtime: Runtime, frame: ReturnType<typeof advance>, fade: number): SkImage {
  'worklet';
  const { scene, driver } = runtime;
  const particles = driver.engine.particles.length > 0;
  beginFrame(scene, particles ? fade : 1);
  if (particles) {
    paintFrame(driver, frame, (stroke) => strokeToAtlas(scene, stroke));
    flushAtlas(scene, frame.palette.additive);
  } else {
    paintFrame(driver, frame, (stroke) => strokeToCanvas(scene, stroke));
  }
  return endFrame(scene);
}

function paintStillFrame(runtime: Runtime, tick: Tick, look: Look, fade: number): SkImage | null {
  'worklet';
  const { scene, driver } = runtime;
  const particles = driver.engine.particles.length > 0;
  let last: SkImage | null = null;
  beginFrame(scene, 1);
  paintStill(driver, tick, look, {
    begin: () => beginFrame(scene, particles ? fade : 1),
    sink: (stroke) => (particles ? strokeToAtlas(scene, stroke) : strokeToCanvas(scene, stroke)),
    end: () => {
      if (particles) flushAtlas(scene, look.palette.additive);
      last = endFrame(scene);
    },
  });
  return last;
}

export function PresenceCanvas({ plan, look, live, seed, active, stillKey, onEventEnd }: PresenceCanvasProps) {
  const image = useSharedValue<SkImage | null>(null);
  const runtime = useSharedValue<Runtime | null>(null);
  const [ended] = useState(() => (name: PresenceEvent) => onEventEnd?.(name));
  const spec = useMemo<Spec>(() => ({ count: plan.count, seed, ratio: Math.min(MAX_RATIO, PixelRatio.get()) }), [plan.count, seed]);
  const fade = plan.trails ? look.palette.trail : 1;
  const { input, level, scroll, lean } = live;

  const frameCallback = useFrameCallback((info) => {
    'worklet';
    const current = prepare(runtime.get(), look, spec);
    if (!current) return;
    if (current !== runtime.get()) runtime.set(current);
    const tick: Tick = {
      now: info.timestamp / 1000,
      input: input.get(),
      level: level ? level.get() : null,
      scroll: scroll ? scroll.get() : 0,
      leanX: lean.get()[0],
      leanY: lean.get()[1],
    };
    const steps = stepsDue(current.driver, tick, look);
    if (steps === 0) return;
    image.set(draw(current, advance(current.driver, tick, look, steps), fade));
    const name = takeEndedEvent(current.driver);
    if (name) scheduleOnRN(ended, name);
  }, false);

  const animate = !plan.still && active;

  useEffect(() => {
    frameCallback.setActive(animate);
  }, [frameCallback, animate]);

  useEffect(() => {
    if (!plan.still) return;
    scheduleOnUI(() => {
      'worklet';
      const current = prepare(runtime.get(), look, spec);
      if (!current) return;
      runtime.set(current);
      const tick: Tick = { now: 8, input: input.get(), level: null, scroll: 0, leanX: 0, leanY: 0 };
      image.set(paintStillFrame(current, tick, look, fade));
    });
  }, [plan.still, stillKey, look, spec, fade, image, input, runtime]);

  return (
    <Canvas style={{ width: plan.size, height: plan.size }} pointerEvents="none">
      <Image image={image} x={0} y={0} width={plan.size} height={plan.size} fit="fill" />
    </Canvas>
  );
}
