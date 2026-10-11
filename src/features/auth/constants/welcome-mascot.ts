import type { IconName, TranslationKey } from '@/core/types';

export type MascotExpression = 'sleep' | 'neutral' | 'smile' | 'peer';

export type EyePreset = readonly [
  leftX: number,
  leftY: number,
  leftWidth: number,
  leftHeight: number,
  leftTilt: number,
  rightX: number,
  rightY: number,
  rightWidth: number,
  rightHeight: number,
  rightTilt: number,
  roundness: number,
];

export type LimbPose = { angle: number; reach: number };

export type PropPose = { x: number; y: number; angle: number; scale: number };

export type WelcomeModule = {
  id: string;
  icon: IconName;
  label: TranslationKey;
  soon: boolean;
};

export const MASCOT_UNITS = 200;

export const MASCOT_STAGE = { width: 390, height: 330, centerX: 195, centerY: 200 } as const;

export const MASCOT_BOX = { left: 111, top: 104, size: 168 } as const;

export const MASCOT_ORBIT = {
  radius: 150,
  tilt: 0.53,
  periodMs: 40000,
  chip: 58,
  frontScale: 1,
  backScale: 0.84,
} as const;

export const MASCOT_BODY_PATH =
  'M 96 28 C 132 25 162 42 175 69 C 184 98 174 125 148 145 C 126 159 90 166 56 160 C 29 153 18 131 21 103 C 24 74 45 48 70 36 C 80 31 90 28 96 28 Z';

export const MASCOT_RIM_PATH =
  'M 96 32 C 132 29 162 46 175 73 C 184 102 174 129 148 149 C 126 163 90 170 56 164 C 29 157 18 135 21 107 C 24 78 45 52 70 40 C 80 35 90 32 96 32 Z';

export const MASCOT_SHINE_PATH =
  'M 61 56 C 76 38 98 31 120 35 C 98 42 80 55 68 77 C 59 94 56 113 60 127 C 48 111 48 78 61 56 Z';

export const MASCOT_ARM = {
  width: 16,
  height: 46,
  top: 106,
  leftX: 22,
  rightX: 162,
  pivot: 6,
} as const;

export const MASCOT_ARM_POSES = {
  left: {
    rest: { angle: 32, reach: 1 },
    tuck: { angle: 70, reach: 0.15 },
    hatting: { angle: 200, reach: 2.3 },
  },
  right: {
    rest: { angle: -32, reach: 1 },
    tuck: { angle: -70, reach: 0.15 },
    lifted: { angle: 79, reach: 0.77 },
  },
} as const satisfies Record<'left' | 'right', Record<string, LimbPose>>;

export const MASCOT_WAVE: readonly LimbPose[] = [
  { angle: 150, reach: 1.1 },
  { angle: 116, reach: 0.95 },
  { angle: 154, reach: 1.08 },
  { angle: 114, reach: 0.96 },
  { angle: 150, reach: 1.05 },
  { angle: 120, reach: 1 },
  { angle: 32, reach: 1 },
];

export const MASCOT_HAT_PIVOT = { x: 100, y: 38 } as const;

export const MASCOT_HAT_POSES = {
  hide: { x: 0, y: 42, angle: 0, scale: 0.72 },
  above: { x: -8, y: -30, angle: -14, scale: 1 },
  on: { x: 0, y: 0, angle: 0, scale: 1 },
} as const satisfies Record<string, PropPose>;

export const MASCOT_LENS_BOX = { width: 60, height: 70, gripX: 30, gripY: 62 } as const;

export const MASCOT_LENS_POSES = {
  hide: { x: 150, y: 106, angle: 8, scale: 0.7 },
  side: { x: 190, y: 147, angle: 16, scale: 1 },
  lift: { x: 140, y: 118, angle: -36, scale: 1 },
} as const satisfies Record<string, PropPose>;

export const MASCOT_EYES: Record<MascotExpression, EyePreset> = {
  sleep: [80.4, 92, 12.4, 3.4, 0, 119.6, 92, 12.4, 3.4, 0, 1],
  neutral: [80.4, 89.8, 12.4, 30, 0, 119.6, 89.8, 12.4, 30, 0, 1],
  smile: [75, 85.1, 19, 20.2, -8, 125, 85.1, 19, 20.2, 8, 0.45],
  peer: [78.6, 91.7, 14.3, 5.4, -6, 119.6, 89.8, 19, 42.9, 0, 1],
};

export const MASCOT_FRAME_BUDGET = {
  warmup: 60,
  samples: 180,
  slowMs: 25,
  slowShare: 0.3,
} as const;

export const MASCOT_GLANCE = { everyMs: 2100, reachX: 1.9, reachY: 0.9 } as const;

export const MASCOT_GAZE_UNITS = 10.7;

export const MASCOT_LEAN = { turn: 18, nod: 7, tilt: 4, perspective: 520 } as const;

export const MASCOT_SHINE_SHIFT = 10;

export const MASCOT_COLORS = {
  body: '#F7F8FB',
  bodyEdge: '#D9DFE9',
  rim: '#C9D0DC',
  outline: 'rgba(24, 31, 43, 0.14)',
  ink: '#0D1117',
  blush: '#F2A7A0',
  tweed: '#8C6B40',
  tweedLine: '#6F522E',
  band: '#5A4225',
  handle: '#3A332A',
  handleDark: '#7A6446',
  ring: '#404040',
  ringDark: '#A39A8C',
  glass: 'rgba(206, 226, 250, 0.3)',
} as const;

export const MASCOT_TIMING = {
  arrive: 1100,
  wake: 800,
  greet: 1200,
  greetEnd: 3000,
  tuck: 3300,
  reach: 3800,
  swap: 4400,
  hatOn: 4500,
  settle: 4950,
  rest: 5050,
  firstModule: 5200,
  moduleStep: 2000,
  lookLead: 500,
  liftLead: 450,
  revealHold: 1000,
  orbitHold: 1900,
  inspectEvery: 4000,
  inspectLead: 2400,
  smileHold: 1000,
  move: 620,
  expression: 450,
  wave: 1800,
  breath: 3600,
  blinkEvery: 5200,
} as const;

export const WELCOME_MODULES: readonly WelcomeModule[] = [
  { id: 'security', icon: 'shield', label: 'screens.welcome.modules.security', soon: false },
  {
    id: 'productivity',
    icon: 'calendar-check',
    label: 'screens.welcome.modules.productivity',
    soon: false,
  },
  { id: 'agronomy', icon: 'sprout', label: 'screens.welcome.modules.agronomy', soon: true },
];
