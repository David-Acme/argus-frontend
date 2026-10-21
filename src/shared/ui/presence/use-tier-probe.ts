import { useEffect, useState } from 'react';
import { PixelRatio } from 'react-native';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { recordProbe } from '@/shared/theme/effects';
import { tokens } from '@/shared/theme/tokens';
import { advance, type Look, type Tick } from './engine/driver';
import { particleCount } from './engine/engine';
import { draw, prepare, release, type Runtime } from './skia-runtime';
import { probeVerdict, PROBE_LIMITS, type ProbeSamples } from './tier-verdict';

const PROBE_DELAY_MS = 1200;
const PROBE_SIZE = 300;
const WARMUP_FRAMES = 4;
const SAMPLE_FRAMES = 20;
const EARLY_FRAMES = 6;
const MAX_RATIO = 2;
const MIN_SPACING_MS = 12;

const probeLook: Look = {
  size: PROBE_SIZE,
  palette: tokens.illustration.estela.dark,
  dark: true,
  activeFps: 60,
  restFps: 60,
  leanWhileScrolling: true,
};

type ProbeRun = {
  runtime: Runtime | null;
  frame: number;
  last: number;
  works: number[];
  gaps: number[];
};

type Phase = 'waiting' | 'running' | 'done';

const session: { phase: Phase } = { phase: 'waiting' };

function probeTick(now: number): Tick {
  'worklet';
  return {
    now,
    input: {
      state: 'alert',
      resting: false,
      intensity: 0.5,
      targetX: 0.3,
      targetY: 0,
      eventName: null,
      eventId: 0,
    },
    level: null,
    scroll: 0,
    leanX: 0,
    leanY: 0,
    steps: 1,
    lag: 0,
    split: false,
  };
}

function hopeless(run: ProbeRun): boolean {
  'worklet';
  return run.works.length >= EARLY_FRAMES && run.works.every((ms) => ms > PROBE_LIMITS.midMs);
}

export function useTierProbe(wanted: boolean): void {
  const run = useSharedValue<ProbeRun>({
    runtime: null,
    frame: 0,
    last: 0,
    works: [],
    gaps: [],
  });
  const [finish] = useState(() => (samples: ProbeSamples) => {
    session.phase = 'done';
    recordProbe(probeVerdict(samples));
  });
  const spec = {
    count: particleCount(PROBE_SIZE),
    seed: 7,
    ratio: Math.min(MAX_RATIO, PixelRatio.get()),
  };

  const probe = useFrameCallback((info) => {
    'worklet';
    const current = run.get();
    const gap = info.timestamp - current.last;
    if (current.frame < 0 || gap < MIN_SPACING_MS) return;
    current.last = info.timestamp;
    const runtime = prepare(current.runtime, { look: probeLook, spec, shown: null });
    if (!runtime) return;
    current.runtime = runtime;
    current.frame += 1;
    const tick = probeTick(info.timestamp / 1000);
    runtime.driver.sim = tick.now;
    const started = performance.now();
    draw(runtime, advance(runtime.driver, tick, probeLook), probeLook.palette.trail);
    const work = performance.now() - started;
    if (current.frame <= WARMUP_FRAMES) return;
    current.works.push(work);
    current.gaps.push(gap);
    if (current.works.length < SAMPLE_FRAMES && !hopeless(current)) return;
    current.frame = -1;
    release(current.runtime, null);
    current.runtime = null;
    scheduleOnRN(finish, { works: current.works, gaps: current.gaps });
  }, false);

  useEffect(() => {
    if (!wanted || session.phase !== 'waiting') return;
    session.phase = 'running';
    const timer = setTimeout(() => probe.setActive(true), PROBE_DELAY_MS);
    return () => {
      clearTimeout(timer);
      probe.setActive(false);
      if (session.phase === 'running') session.phase = 'waiting';
    };
  }, [wanted, probe]);
}
