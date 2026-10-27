import { useIsFocused } from 'expo-router';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { feedback } from '@/shared/theme';
import { useCameraCall } from '@/features/cameras/hooks/use-camera-call';
import type { CameraCallControls } from '@/features/cameras/hooks/use-camera-call';
import { useCameraSiren } from '@/features/cameras/hooks/use-camera-siren';
import type { CameraSirenControls } from '@/features/cameras/hooks/use-camera-siren';
import {
  callTroubleOf,
  dockPhase,
  holdReducer,
  holdTalking,
} from '@/features/cameras/model/talk-dock';
import type {
  CallTrouble,
  DockPhase,
  HoldEvent,
  HoldPhase,
} from '@/features/cameras/model/talk-dock';

export type TalkDock = {
  call: CameraCallControls;
  siren: CameraSirenControls;
  phase: DockPhase;
  level: number;
  trouble: CallTrouble | null;
  silencesLive: boolean;
  hold: { onStart: () => void; onEnd: () => void };
  tap: () => void;
};

export function useTalkDock(cameraId: string): TalkDock {
  const call = useCameraCall(cameraId);
  const siren = useCameraSiren(cameraId);
  const focused = useIsFocused();
  const held = useRef<HoldPhase>('idle');
  const [talking, setTalking] = useState(false);
  const snapshot = call.snapshot;
  const phase = dockPhase(snapshot, talking && !snapshot?.error);

  const step = (event: HoldEvent) => {
    const before = holdTalking(held.current);
    held.current = holdReducer(held.current, event);
    const after = holdTalking(held.current);
    if (before === after) return;
    feedback('impactLight');
    setTalking(after);
    if (after) call.talkStart();
    else call.talkEnd();
  };
  const leave = useEffectEvent(() => step('leave'));

  useEffect(() => {
    if (!focused) leave();
  }, [focused]);
  useEffect(() => () => leave(), []);

  return {
    call,
    siren,
    phase,
    level: snapshot?.micLevel ?? 0,
    trouble: callTroubleOf(snapshot),
    silencesLive: phase === 'call' || phase === 'opening' || phase === 'talking',
    hold: { onStart: () => step('hold'), onEnd: () => step('release') },
    tap: () => step('tap'),
  };
}
