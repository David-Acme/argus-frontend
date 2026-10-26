import type { ICameraCacheRow } from '@/core/interfaces';
import type { CameraAimControls } from '@/features/cameras/hooks/use-camera-aim';
import type { CameraCallControls } from '@/features/cameras/hooks/use-camera-call';
import type { CameraLive } from '@/features/cameras/hooks/use-camera-live';
import type { CameraPtzControls } from '@/features/cameras/hooks/use-camera-ptz';
import type { CameraSirenControls } from '@/features/cameras/hooks/use-camera-siren';
import type { LiveStage } from '@/features/cameras/hooks/use-live-stage';
import type { TalkDock } from '@/features/cameras/hooks/use-talk-dock';
import type { CameraStage, LiveControls } from '@/features/cameras/model/camera-stage';

export const calls: string[] = [];

const note = (name: string) => () => {
  calls.push(name);
};

export function cameraRow(overrides: Partial<ICameraCacheRow> = {}): ICameraCacheRow {
  return {
    id: '3',
    driver: 'tapo',
    icon: 'video',
    name: 'Cocina',
    ip: '192.168.1.53',
    port: 554,
    username: 'admin',
    cloudUsername: '',
    manufacturer: 'TP-Link',
    model: 'C210',
    modelLabel: 'Tapo C210',
    recordMode: 'events',
    privacyState: 'off',
    privacyObeyed: false,
    watchman: true,
    noAudio: false,
    retentionDays: 30,
    retentionIncident: false,
    isOnline: true,
    isEnabled: true,
    streamPath: '',
    subStreamPath: '',
    catalogId: 'tapo-c210',
    capabilities: ['ptz', 'presets', 'talk', 'privacy'],
    zones: [
      {
        id: 'z1',
        cameraId: '3',
        name: 'Ventana del vecino',
        points: [],
        zoneType: 'privacy',
        color: '#ff0000',
        isEnabled: true,
      },
      {
        id: 'z2',
        cameraId: '3',
        name: 'Jardín',
        points: [],
        zoneType: 'alert',
        color: '#00ff00',
        isEnabled: true,
      },
    ],
    ...overrides,
  };
}

export function aimControls(overrides: Partial<CameraAimControls> = {}): CameraAimControls {
  return {
    aim: null,
    settings: { activeLook: false, followIntruders: false, noAimSectors: [] },
    homePreset: '1',
    lease: 'free',
    activity: null,
    update: async () => true,
    giveBack: async () => true,
    apply: note('apply'),
    readPosition: async () => ({ pan: 10, tilt: -5 }),
    reload: async () => undefined,
    ...overrides,
  };
}

export const ptzControls: CameraPtzControls = {
  moving: false,
  limit: null,
  onStep: (direction) => calls.push(`step:${direction}`),
  onHoldStart: (direction) => calls.push(`hold:${direction}`),
  onHoldEnd: note('hold-end'),
};

export function callControls(overrides: Partial<CameraCallControls> = {}): CameraCallControls {
  return {
    snapshot: null,
    start: (mode) => calls.push(`start:${mode}`),
    allowMicrophone: note('allow-mic'),
    end: note('end'),
    setMuted: (muted) => calls.push(`muted:${muted}`),
    talkStart: note('talk-start'),
    talkEnd: note('talk-end'),
    ...overrides,
  };
}

export function sirenControls(overrides: Partial<CameraSirenControls> = {}): CameraSirenControls {
  return {
    phase: 'idle',
    secondsLeft: 0,
    remaining: 0,
    sounding: false,
    failed: false,
    ask: note('siren-ask'),
    confirm: note('siren-confirm'),
    cancel: note('siren-cancel'),
    stop: note('siren-stop'),
    ...overrides,
  };
}

export function dockOf(overrides: Partial<TalkDock> = {}): TalkDock {
  return {
    call: callControls(),
    siren: sirenControls(),
    phase: 'idle',
    level: 0,
    trouble: null,
    silencesLive: false,
    hold: { onStart: note('hold-start'), onEnd: note('hold-stop') },
    ...overrides,
  };
}

export function liveOf(stage: CameraStage, overrides: Partial<LiveStage> = {}): LiveStage {
  return {
    stage,
    view: { state: 'live', painted: true, notice: null, retry: note('retry') },
    quality: {
      quality: 'sub',
      fellBack: false,
      choose: (quality) => calls.push(`quality:${quality}`),
      restore: note('restore'),
      observe: () => undefined,
    },
    audio: {
      muted: false,
      level: 1,
      reason: 'on',
      blocked: false,
      unlockKey: 0,
      toggle: note('sound'),
      unlock: () => undefined,
      setBlocked: () => undefined,
    },
    hasAudio: true,
    fullscreen: false,
    ptzShown: false,
    setFullscreen: (next) => calls.push(`fullscreen:${next}`),
    setPtzShown: (next) => calls.push(`ptz:${next}`),
    onStatus: () => undefined,
    onStats: () => undefined,
    onState: () => undefined,
    ...overrides,
  };
}

export const ALL_CONTROLS: LiveControls = {
  talk: true,
  siren: true,
  ptz: true,
  quality: true,
  sound: true,
  fullscreen: true,
  eye: true,
};

export function liveView(overrides: Partial<CameraLive> = {}): CameraLive {
  return {
    camera: cameraRow(),
    live: liveOf({ kind: 'live' }),
    dock: dockOf(),
    aim: aimControls(),
    ptz: ptzControls,
    presets: {
      presets: [{ id: '1', name: 'Entrada' }],
      goto: (preset) => calls.push(`goto:${preset.id}`),
      goHome: note('go-home'),
      save: async () => {
        calls.push('save-preset');
      },
      setHome: async (preset) => {
        calls.push(`home:${preset.id}`);
      },
    },
    controls: ALL_CONTROLS,
    note: null,
    sections: ['privacy', 'listen', 'patrol', 'device', 'advanced'],
    access: { update: true, remove: true, clips: true, managePresets: true },
    poster: null,
    ...overrides,
  };
}
