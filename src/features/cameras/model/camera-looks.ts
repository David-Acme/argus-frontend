import type { CameraFormFactor } from '@/core/types';

export type LookShape =
  'cube' | 'sphere' | 'bullet' | 'outdoor' | 'turret' | 'dome' | 'ptz' | 'doorbell';

export type LookMount = 'neck' | 'magnet' | 'base' | 'wall' | 'ceiling';

export type CameraLook = {
  shape: LookShape;
  width: number;
  height: number;
  antennas: number;
  spotlight: boolean;
  visor: boolean;
  mount: LookMount;
};

const PLAIN: Omit<CameraLook, 'shape' | 'mount'> = {
  width: 1,
  height: 1,
  antennas: 0,
  spotlight: false,
  visor: false,
};

function look(shape: LookShape, mount: LookMount, traits: Partial<CameraLook> = {}): CameraLook {
  return { ...PLAIN, shape, mount, ...traits };
}

const BY_FORM_FACTOR: Record<CameraFormFactor, CameraLook> = {
  'pan-tilt': look('sphere', 'base', { visor: true }),
  'outdoor-pan-tilt': look('outdoor', 'wall', { antennas: 2 }),
  cube: look('cube', 'neck', { visor: true }),
  bullet: look('bullet', 'wall', { visor: true }),
  turret: look('turret', 'ceiling'),
  dome: look('dome', 'ceiling'),
  doorbell: look('doorbell', 'wall'),
};

const LOOKS: Readonly<Record<string, CameraLook>> = {
  pill: look('cube', 'neck', { width: 0.78, height: 1.12, visor: true }),
  'box-spot': look('cube', 'magnet', { height: 0.82, visor: true, spotlight: true }),
  'wide-box': look('cube', 'magnet', { width: 1.12, height: 0.76, visor: true }),
  'sphere-visor': look('sphere', 'base', { visor: true }),
  egg: look('sphere', 'base', { width: 0.86, height: 1.45, visor: true }),
  sphere: look('sphere', 'base', { width: 0.95 }),
  'sphere-antenna': look('sphere', 'base', { width: 0.95, antennas: 1 }),
  'bullet-antennas': look('bullet', 'wall', { height: 1.1, antennas: 2 }),
  'bullet-antennas-spot': look('bullet', 'wall', { height: 1.1, antennas: 2, spotlight: true }),
  'bullet-wide-spot': look('bullet', 'wall', { width: 1.05, height: 1.25, spotlight: true }),
  'bullet-hood': look('bullet', 'wall', { width: 1.1, visor: true }),
  'bullet-hood-mini': look('bullet', 'wall', { width: 0.85, visor: true }),
  'bullet-hood-spot': look('bullet', 'wall', { width: 1.1, visor: true, spotlight: true }),
  'bullet-hood-antennas': look('bullet', 'wall', { width: 0.85, visor: true, antennas: 2 }),
  'outdoor-spot': look('outdoor', 'wall', { spotlight: true }),
  'outdoor-antennas-spot': look('outdoor', 'wall', { antennas: 2, spotlight: true }),
  'battery-box': look('bullet', 'magnet', { width: 0.66, height: 1.15, spotlight: true }),
  'battery-bullet': look('bullet', 'magnet', { width: 0.85, height: 1.1, spotlight: true }),
  'doorbell-slim': look('doorbell', 'wall', { width: 0.9, height: 0.78 }),
  'doorbell-tall': look('doorbell', 'wall', { width: 0.82 }),
  turret: look('turret', 'ceiling'),
  'turret-spot': look('turret', 'ceiling', { spotlight: true }),
  dome: look('dome', 'ceiling'),
  'ptz-mini': look('ptz', 'ceiling'),
};

export function cameraLookOf(lookId: string, formFactor: CameraFormFactor): CameraLook {
  return LOOKS[lookId] ?? BY_FORM_FACTOR[formFactor];
}

export function knownLook(lookId: string): boolean {
  return lookId in LOOKS;
}
