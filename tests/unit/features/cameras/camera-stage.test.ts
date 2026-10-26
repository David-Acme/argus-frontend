import { describe, expect, test } from 'bun:test';
import {
  liveControlsOf,
  stageOf,
  talkNoteOf,
  type LiveControlsInput,
} from '@/features/cameras/model/camera-stage';

const live = { state: 'live', painted: true, notice: null } as const;

const controlsInput: LiveControlsInput = {
  stage: 'live',
  access: { talk: true, aim: true },
  talk: true,
  ptz: true,
  mic: true,
  argusCall: false,
  siren: true,
  sirenActive: false,
  audio: true,
  looking: false,
};

describe('the stage says what the camera is doing', () => {
  test('off and privacy win over any stream', () => {
    expect(stageOf({ enabled: false, masked: true, online: true, view: live })).toEqual({
      kind: 'off',
    });
    expect(stageOf({ enabled: true, masked: true, online: true, view: live })).toEqual({
      kind: 'privacy',
    });
    expect(
      stageOf({
        enabled: true,
        masked: false,
        online: true,
        view: { ...live, notice: 'camera-disabled' },
      })
    ).toEqual({ kind: 'off' });
  });

  test('it is live only once a frame is painted, and connecting before, never in words', () => {
    expect(stageOf({ enabled: true, masked: false, online: true, view: null }).kind).toBe(
      'connecting'
    );
    expect(
      stageOf({ enabled: true, masked: false, online: true, view: { ...live, painted: false } })
        .kind
    ).toBe('connecting');
    expect(stageOf({ enabled: true, masked: false, online: true, view: live }).kind).toBe('live');
    expect(
      stageOf({
        enabled: true,
        masked: false,
        online: true,
        view: { ...live, state: 'reconnecting' },
      }).kind
    ).toBe('live');
  });

  test('an unreachable camera offers Reintentar, a refusal says why without it', () => {
    expect(
      stageOf({ enabled: true, masked: false, online: true, view: { ...live, state: 'offline' } })
    ).toEqual({ kind: 'blocked', message: 'screens.cameras.stage.unreachable', retry: true });
    expect(stageOf({ enabled: true, masked: false, online: false, view: null })).toEqual({
      kind: 'blocked',
      message: 'screens.cameras.stage.unreachable',
      retry: true,
    });
    expect(stageOf({ enabled: true, masked: false, online: false, view: live }).kind).toBe('live');
    expect(
      stageOf({
        enabled: true,
        masked: false,
        online: true,
        view: { ...live, notice: 'viewers-camera' },
      })
    ).toEqual({ kind: 'blocked', message: 'screens.cameras.stage.viewers', retry: false });
    expect(
      stageOf({
        enabled: true,
        masked: false,
        online: true,
        view: { ...live, state: 'unsupported' },
      })
    ).toEqual({ kind: 'blocked', message: 'screens.cameras.stage.unsupported', retry: false });
  });
});

describe('the controls that cannot apply are hidden', () => {
  test('a live camera with every permission shows everything but the eye', () => {
    expect(liveControlsOf(controlsInput)).toEqual({
      talk: true,
      siren: true,
      ptz: true,
      quality: true,
      sound: true,
      fullscreen: true,
      eye: false,
    });
  });

  test('privacy hides talk, movement, quality, sound and fullscreen, and keeps the siren', () => {
    expect(liveControlsOf({ ...controlsInput, stage: 'privacy' })).toEqual({
      talk: false,
      siren: true,
      ptz: false,
      quality: false,
      sound: false,
      fullscreen: false,
      eye: false,
    });
  });

  test('a camera that is off offers no siren unless one is already counting or sounding', () => {
    expect(liveControlsOf({ ...controlsInput, stage: 'off' }).siren).toBe(false);
    expect(liveControlsOf({ ...controlsInput, stage: 'off', sirenActive: true }).siren).toBe(true);
  });

  test('talk needs the role, the speaker, a microphone and no call with Argus', () => {
    expect(liveControlsOf({ ...controlsInput, access: { talk: false, aim: true } }).talk).toBe(
      false
    );
    expect(liveControlsOf({ ...controlsInput, talk: false }).talk).toBe(false);
    expect(liveControlsOf({ ...controlsInput, mic: false }).talk).toBe(false);
    expect(liveControlsOf({ ...controlsInput, argusCall: true }).talk).toBe(false);
  });

  test('the eye shows only over a live picture while Argus is looking', () => {
    expect(liveControlsOf({ ...controlsInput, looking: true }).eye).toBe(true);
    expect(liveControlsOf({ ...controlsInput, stage: 'connecting', looking: true }).eye).toBe(
      false
    );
  });

  test('movement is offered only on a live pan-tilt camera to a role that may aim', () => {
    expect(liveControlsOf({ ...controlsInput, stage: 'connecting' }).ptz).toBe(false);
    expect(liveControlsOf({ ...controlsInput, ptz: false }).ptz).toBe(false);
    expect(liveControlsOf({ ...controlsInput, access: { talk: true, aim: false } }).ptz).toBe(
      false
    );
  });
});

describe('why talk is missing', () => {
  const base = {
    stage: 'live',
    access: { talk: true, aim: true },
    mic: true,
    argusCall: false,
  } as const;

  test('says it in words only to a role that may talk on a camera that sees', () => {
    expect(talkNoteOf({ ...base, talk: true, cloudless: false })).toBeNull();
    expect(talkNoteOf({ ...base, argusCall: true, talk: true, cloudless: false })).toBe(
      'argus-busy'
    );
    expect(talkNoteOf({ ...base, mic: false, talk: true, cloudless: false })).toBe('no-mic');
    expect(talkNoteOf({ ...base, talk: false, cloudless: true })).toBe('needs-cloud');
    expect(talkNoteOf({ ...base, talk: false, cloudless: false })).toBeNull();
    expect(talkNoteOf({ ...base, talk: null, cloudless: true })).toBeNull();
    expect(
      talkNoteOf({ ...base, stage: 'privacy', argusCall: true, talk: true, cloudless: false })
    ).toBeNull();
    expect(
      talkNoteOf({
        ...base,
        access: { talk: false, aim: true },
        mic: false,
        talk: true,
        cloudless: false,
      })
    ).toBeNull();
  });
});
