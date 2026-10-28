import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { feedback } from '@/shared/theme';
import {
  CONTROLS_HIDE_MS,
  controlsShown,
  nextStreak,
  rememberPosition,
  resumePosition,
  SEEK_STEP_MS,
  SEEK_STREAK_MS,
  skipTarget,
  type PlayerSpeed,
  type PlayerStatus,
  type SeekSide,
  type SeekStreak,
} from './player-model';
import type { PlayerSource, SurfaceEvents, SurfaceHandle } from './video-surface-types';

export type PlayerInput = {
  source: PlayerSource | null;
  startMuted: boolean;
  onEnded?: () => void;
};

export type PlayerTimes = { positionMs: number; durationMs: number; bufferedMs: number };

const POLL_MS = 250;

const NO_TIMES: PlayerTimes = { positionMs: 0, durationMs: 0, bufferedMs: 0 };

function useTimes(handle: { current: SurfaceHandle | null }, key: string | undefined) {
  const [times, setTimes] = useState<PlayerTimes>(NO_TIMES);
  const sample = () => {
    const current = handle.current;
    if (!current) return;
    setTimes({
      positionMs: current.positionMs(),
      durationMs: current.durationMs(),
      bufferedMs: current.bufferedMs(),
    });
  };
  const tick = useEffectEvent(sample);
  useEffect(() => {
    if (!key) return undefined;
    const timer = setInterval(() => tick(), POLL_MS);
    return () => clearInterval(timer);
  }, [key]);
  return { times, sample, setTimes };
}

function useControlsClock(status: PlayerStatus) {
  const [shownUntil, setShownUntil] = useState(() => Date.now() + CONTROLS_HIDE_MS);
  const [now, setNow] = useState(() => Date.now());
  const [scrubbing, setScrubbing] = useState(false);
  useEffect(() => {
    if (status !== 'playing') return undefined;
    const wait = Math.max(0, shownUntil - Date.now());
    const timer = setTimeout(() => setNow(Date.now()), wait + 16);
    return () => clearTimeout(timer);
  }, [shownUntil, status]);
  const shown = controlsShown({ status, scrubbing, shownUntil, now });
  return {
    shown,
    scrubbing,
    setScrubbing,
    poke: () => {
      const at = Date.now();
      setNow(at);
      setShownUntil(at + CONTROLS_HIDE_MS);
    },
    hide: () => {
      const at = Date.now();
      setNow(at);
      setShownUntil(at);
    },
  };
}

function useSurfaceState(key: string | undefined) {
  const [status, setStatus] = useState<PlayerStatus>('loading');
  const [painted, setPainted] = useState(false);
  const [audioLost, setAudioLost] = useState(false);
  const [loadedKey, setLoadedKey] = useState(key);
  if (loadedKey !== key) {
    setLoadedKey(key);
    setStatus('loading');
    setPainted(false);
    setAudioLost(false);
  }
  return { status, setStatus, painted, setPainted, audioLost, setAudioLost };
}

function useSeekStreak() {
  const [streak, setStreak] = useState<SeekStreak | null>(null);
  useEffect(() => {
    if (!streak) return undefined;
    const timer = setTimeout(() => setStreak(null), SEEK_STREAK_MS);
    return () => clearTimeout(timer);
  }, [streak]);
  return {
    streak,
    push: (side: SeekSide) => {
      setStreak((current) => nextStreak(current, side, Date.now()));
      feedback('selection');
    },
  };
}

export function usePlayer({ source, startMuted, onEnded }: PlayerInput) {
  const handle = useRef<SurfaceHandle | null>(null);
  const resumed = useRef<string | null>(null);
  const key = source?.key;
  const surface = useSurfaceState(key);
  const [muted, setMuted] = useState(startMuted);
  const [speed, setSpeedState] = useState<PlayerSpeed>(1);
  const seeks = useSeekStreak();
  const { times, sample, setTimes } = useTimes(handle, key);
  const controls = useControlsClock(surface.status);
  const ended = useEffectEvent(() => onEnded?.());
  const remember = useEffectEvent(() => {
    if (key) rememberPosition(key, times.positionMs, times.durationMs);
  });

  const seekTo = (positionMs: number) => {
    handle.current?.seekTo(positionMs);
    setTimes((current) => ({ ...current, positionMs }));
  };

  const resume = () => {
    if (!key || resumed.current === key) return;
    resumed.current = key;
    const at = resumePosition(key);
    if (at > 0) seekTo(at);
  };

  const events: SurfaceEvents = {
    onReady: (ready) => {
      handle.current = ready;
      ready.setRate(speed);
    },
    onStatus: (next) => {
      surface.setStatus(next);
      sample();
      if (next === 'ready' || next === 'playing') resume();
    },
    onFirstFrame: () => surface.setPainted(true),
    onAudioFailed: () => surface.setAudioLost(true),
  };

  useEffect(() => {
    if (surface.status === 'ended') ended();
  }, [surface.status]);

  useEffect(() => () => remember(), [key]);

  return {
    handle,
    events,
    status: surface.status,
    painted: surface.painted,
    audioLost: surface.audioLost,
    muted,
    speed,
    streak: seeks.streak,
    times,
    controls,
    seekTo,
    seekBy: (side: SeekSide) => {
      seeks.push(side);
      const deltaMs = side === 'forward' ? SEEK_STEP_MS : -SEEK_STEP_MS;
      seekTo(skipTarget({ positionMs: times.positionMs, deltaMs, durationMs: times.durationMs }));
    },
    toggle: () => {
      controls.poke();
      if (surface.status === 'playing') handle.current?.pause();
      else handle.current?.play();
    },
    toggleMute: () => setMuted((current) => !current),
    setSpeed: (next: PlayerSpeed) => {
      setSpeedState(next);
      handle.current?.setRate(next);
    },
  };
}

export type PlayerState = ReturnType<typeof usePlayer>;
