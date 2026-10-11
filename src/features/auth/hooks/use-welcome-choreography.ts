import { useCallback, useEffect, useState } from 'react';
import { MASCOT_TIMING } from '@/features/auth/constants/welcome-mascot';
import {
  INITIAL_POSE,
  applyEvent,
  inspection,
  restingPose,
  welcomeTimeline,
  type ChoreographyEvent,
  type MascotPose,
} from '@/features/auth/model/welcome-choreography';

type WelcomeChoreography = {
  pose: MascotPose;
  replay: () => void;
  run: number;
};

export function useWelcomeChoreography(count: number, still: boolean): WelcomeChoreography {
  const [pose, setPose] = useState<MascotPose>(INITIAL_POSE);
  const [run, setRun] = useState(0);

  const replay = useCallback(() => {
    setPose(INITIAL_POSE);
    setRun((value) => value + 1);
  }, []);

  useEffect(() => {
    if (still) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const schedule = (events: readonly ChoreographyEvent[]) => {
      events.forEach((item) => {
        timers.push(setTimeout(() => setPose((current) => applyEvent(current, item)), item.at));
      });
    };
    const inspect = (look: number, at: number) => {
      timers.push(
        setTimeout(() => {
          schedule(inspection(look % count, 0, MASCOT_TIMING.orbitHold));
          inspect(look + 1, MASCOT_TIMING.inspectEvery);
        }, at)
      );
    };
    const timeline = welcomeTimeline(count);
    schedule(timeline.events);
    inspect(0, timeline.inspectFrom);
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [count, run, still]);

  return { pose: still ? restingPose(count) : pose, replay, run };
}
