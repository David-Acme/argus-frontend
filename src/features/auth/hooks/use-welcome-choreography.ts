import { useCallback, useEffect, useState } from 'react';
import { MASCOT_TIMING } from '@/features/auth/constants/welcome-mascot';
import {
  INITIAL_POSE,
  applyEvent,
  createTimerBook,
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
    const timers = createTimerBook({ setTimeout, clearTimeout });
    const schedule = (events: readonly ChoreographyEvent[]) => {
      events.forEach((item) => {
        timers.after(item.at, () => setPose((current) => applyEvent(current, item)));
      });
    };
    const inspect = (look: number, at: number) => {
      timers.after(at, () => {
        schedule(inspection(look % count, 0, MASCOT_TIMING.orbitHold));
        inspect(look + 1, MASCOT_TIMING.inspectEvery);
      });
    };
    const timeline = welcomeTimeline(count);
    schedule(timeline.events);
    inspect(0, timeline.inspectFrom);
    return () => timers.clear();
  }, [count, run, still]);

  return { pose: still ? restingPose(count) : pose, replay, run };
}
