import type { CameraLiveNotice, CameraStreamState, TranslationKey } from '@/core/types';

export type LiveViewState = CameraStreamState | 'unsupported';

export type LiveViewStatus = {
  state: LiveViewState;
  painted: boolean;
  notice: CameraLiveNotice | null;
  retry: () => void;
};

export type StageInput = {
  enabled: boolean;
  masked: boolean;
  online: boolean;
  view: Pick<LiveViewStatus, 'state' | 'painted' | 'notice'> | null;
};

export type CameraStage =
  | { kind: 'off' }
  | { kind: 'privacy' }
  | { kind: 'connecting' }
  | { kind: 'live' }
  | { kind: 'blocked'; message: TranslationKey; retry: boolean };

export type StageKind = CameraStage['kind'];

const NOTICE_MESSAGE = {
  'camera-disabled': 'screens.cameras.stage.off',
  'viewers-total': 'screens.cameras.stage.viewers',
  'viewers-camera': 'screens.cameras.stage.viewers',
  'viewers-user': 'screens.cameras.stage.viewers',
  'session-ended': 'screens.cameras.stage.session-ended',
} as const satisfies Record<CameraLiveNotice, TranslationKey>;

const UNREACHABLE: CameraStage = {
  kind: 'blocked',
  message: 'screens.cameras.stage.unreachable',
  retry: true,
};

const BLOCKED: Partial<Record<LiveViewState, CameraStage>> = {
  offline: UNREACHABLE,
  unavailable: { kind: 'blocked', message: 'screens.cameras.stage.unavailable', retry: false },
  unsupported: { kind: 'blocked', message: 'screens.cameras.stage.unsupported', retry: false },
};

export function stageOf({ enabled, masked, online, view }: StageInput): CameraStage {
  if (!enabled || view?.notice === 'camera-disabled') return { kind: 'off' };
  if (masked) return { kind: 'privacy' };
  const showing =
    view !== null && (view.state === 'live' || view.state === 'reconnecting') && view.painted;
  if (!online && !showing) return UNREACHABLE;
  if (!view) return { kind: 'connecting' };
  const blocked = BLOCKED[view.state];
  if (blocked) return blocked;
  if (view.notice) return { kind: 'blocked', message: NOTICE_MESSAGE[view.notice], retry: false };
  return showing ? { kind: 'live' } : { kind: 'connecting' };
}

export function stageSees(kind: StageKind): boolean {
  return kind !== 'off' && kind !== 'privacy';
}

export type LiveControlsInput = {
  stage: StageKind;
  access: { talk: boolean; aim: boolean };
  talk: boolean;
  ptz: boolean;
  mic: boolean;
  argusCall: boolean;
  siren: boolean;
  sirenActive: boolean;
  audio: boolean;
  looking: boolean;
};

export type LiveControls = {
  talk: boolean;
  siren: boolean;
  ptz: boolean;
  quality: boolean;
  sound: boolean;
  fullscreen: boolean;
  eye: boolean;
};

export function liveControlsOf(input: LiveControlsInput): LiveControls {
  const sees = stageSees(input.stage);
  const live = input.stage === 'live';
  const reachable = live || input.stage === 'connecting';
  return {
    talk: reachable && input.access.talk && input.talk && input.mic && !input.argusCall,
    siren: input.sirenActive || (input.stage !== 'off' && input.siren),
    ptz: live && input.access.aim && input.ptz,
    quality: sees,
    sound: live && input.audio,
    fullscreen: reachable,
    eye: live && input.looking,
  };
}

export type TalkNote = 'argus-busy' | 'no-mic' | 'needs-cloud';

export type TalkNoteInput = Pick<LiveControlsInput, 'stage' | 'access' | 'mic' | 'argusCall'> & {
  talk: boolean | null;
  cloudless: boolean;
};

export function talkNoteOf(input: TalkNoteInput): TalkNote | null {
  if (!input.access.talk || !stageSees(input.stage)) return null;
  if (input.talk === false) return input.cloudless ? 'needs-cloud' : null;
  if (input.talk === null) return null;
  if (input.argusCall) return 'argus-busy';
  return input.mic ? null : 'no-mic';
}

export const TALK_NOTE = {
  'argus-busy': 'screens.cameras.call.argus-busy',
  'no-mic': 'screens.cameras.call.no-mic',
  'needs-cloud': 'screens.cameras.call.needs-cloud',
} as const satisfies Record<TalkNote, TranslationKey>;
