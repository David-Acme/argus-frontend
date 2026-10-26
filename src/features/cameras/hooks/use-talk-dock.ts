import { useRef, useState } from 'react';
import { useCameraCall, type CameraCallControls } from '@/features/cameras/hooks/use-camera-call';
import {
  useCameraSiren,
  type CameraSirenControls,
} from '@/features/cameras/hooks/use-camera-siren';
import {
  IDLE_HOLD,
  callTroubleOf,
  dockPhase,
  holdReducer,
  holdTalking,
  type CallTrouble,
  type DockPhase,
  type HoldEvent,
} from '@/features/cameras/model/talk-dock';
import { feedback } from '@/shared/theme';

export type TalkDock = {
  call: CameraCallControls;
  siren: CameraSirenControls;
  phase: DockPhase;
  level: number;
  trouble: CallTrouble | null;
  silencesLive: boolean;
  hold: { onStart: () => void; onEnd: () => void };
};

export function useTalkDock(cameraId: string): TalkDock {
  const call = useCameraCall(cameraId);
  const siren = useCameraSiren(cameraId);
  const held = useRef(IDLE_HOLD);
  const [talking, setTalking] = useState(false);
  const snapshot = call.snapshot;
  const phase = dockPhase(snapshot, talking && !snapshot?.error);

  const step = (kind: HoldEvent['kind']) => {
    const before = holdTalking(held.current);
    held.current = holdReducer(held.current, { kind, at: Date.now() });
    const after = holdTalking(held.current);
    if (before === after) return;
    feedback('impactLight');
    setTalking(after);
    if (after) call.talkStart();
    else call.talkEnd();
  };

  return {
    call,
    siren,
    phase,
    level: snapshot?.micLevel ?? 0,
    trouble: callTroubleOf(snapshot),
    silencesLive: phase === 'call' || phase === 'opening' || phase === 'talking',
    hold: { onStart: () => step('down'), onEnd: () => step('up') },
  };
}
