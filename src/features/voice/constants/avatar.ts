import type {
  AvatarBodyMotion,
  AvatarExpression,
  AvatarEyeMotion,
  AvatarPreviewPreset,
  AvatarState,
  AvatarSurfaceOverride,
} from '@/core/types';

export type AvatarPalette = {
  body: string;
  bodyShadow: string;
  bodyLight: string;
  face: string;
  faceLight: string;
  outline: string;
  ink: string;
  accent: string;
  accentSoft: string;
  warning: string;
};

export const AVATAR_PALETTE: Record<'light' | 'dark', AvatarPalette> = {
  light: {
    body: '#F7F8FB',
    bodyShadow: '#C9D0DC',
    bodyLight: '#FFFFFF',
    face: '#F7F8FB',
    faceLight: '#FFFFFF',
    outline: 'rgba(24, 31, 43, 0.16)',
    ink: '#0D1117',
    accent: '#5D6FE8',
    accentSoft: 'rgba(93, 111, 232, 0.12)',
    warning: '#C64D59',
  },
  dark: {
    body: '#F1F4FA',
    bodyShadow: '#9FAABD',
    bodyLight: '#FFFFFF',
    face: '#F1F4FA',
    faceLight: '#FFFFFF',
    outline: 'rgba(255, 255, 255, 0.18)',
    ink: '#11151D',
    accent: '#91A0FF',
    accentSoft: 'rgba(145, 160, 255, 0.16)',
    warning: '#FF8A96',
  },
};

const WHITE_SURFACE: AvatarSurfaceOverride = {
  face: '#F7F8FB',
  shadow: '#C9D0DC',
  highlight: '#FFFFFF',
  ink: '#0D1117',
};

const RED_SURFACE: AvatarSurfaceOverride = {
  face: '#BA3636',
  shadow: '#862525',
  highlight: '#D85B5B',
  ink: '#610000',
};

const BLUE_SURFACE: AvatarSurfaceOverride = {
  face: '#ADC3FF',
  shadow: '#8599D4',
  highlight: '#E8EEFF',
  ink: '#11151D',
};

type CalibratedRow = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

type CalibratedDefinition = {
  id: string;
  label: string;
  semanticKey: string;
  values: CalibratedRow;
  eyeMotion?: AvatarEyeMotion;
  bodyMotion?: AvatarBodyMotion;
  bodyColor?: string;
  eyeColor?: string;
};

const baseDefinition: CalibratedDefinition = {
  id: '00',
  label: 'upward-side-glance',
  semanticKey: 'upward-side-glance',
  values: [7.3, 27.8, -16.1, 22.501171875, 22.501171875, 42.377734375, 42.377734375, 54.3, 0, 0, -20.5, -20.5, 0, 0],
};

const calibratedDefinitions: readonly CalibratedDefinition[] = [
  baseDefinition,
  {
    id: '01',
    label: 'downward-gaze',
    semanticKey: 'downward-gaze',
    values: [-15.0578125, 0.14296875, -14.54921875, 22.401171875, 22.401171875, 54.5703125, 54.5703125, 57.7, 0, 0, 0, 0, 0, 0],
  },
  {
    id: '02',
    label: 'joyful-down-right',
    semanticKey: 'joyful-down-right',
    values: [-15.287109375, 15.006640625, 12.787890625, 31.25390625, 31.25390625, 76.720703125, 76.720703125, 68.7, 0, 0, 0, 0, 0, 0],
  },
  {
    id: '03',
    label: 'surprised-left',
    semanticKey: 'surprised-left',
    values: [2.946875, -16.051171875, -20.916015625, 51.68336723153048, 51.68336723153048, 51.74054108796297, 51.74054108796297, 70.9, 0, 0, 0, 0, 0, 0],
  },
  {
    id: '04',
    label: 'sleepy-squint',
    semanticKey: 'sleepy-squint',
    values: [3.4, 13.22578125, 8.976953125, 51.775, 51.775, 13.02734375, 13.02734375, 63.872265625, 0, 0, 0, 0, 0, 0],
  },
  {
    id: '05',
    label: 'skeptical-right',
    semanticKey: 'skeptical-right',
    values: [-16.528515625, -3.76796875, -13.7296875, 23.090625, 49.924609375, 57.6796875, 12.431640625, 56.3, 0, 0, 0, 0, 0, 0],
  },
  {
    id: '06',
    label: 'small-attentive',
    semanticKey: 'small-attentive',
    values: [-4.232421875, 14.362109375, 11.204296875, 22.066796875, 22.066796875, 39.59921875, 39.59921875, 50.9, 0, 0, 0, 0, 0, 0],
  },
  {
    id: '07',
    label: 'angry-right',
    semanticKey: 'angry-right',
    values: [8.063671875, 17.6265625, -11.116796875, 20.908203125, 20.908203125, 40.40078125, 40.40078125, 52.059765625, 0, 0, 0, 0, -30.865625, 28.781640625],
  },
  {
    id: '08',
    label: 'curious-left',
    semanticKey: 'curious-left',
    values: [-12.303515625, -17.601171875, 5.9109375, 20.605859375, 20.605859375, 47.769921875, 47.769921875, 54.9, 0, 0, 0, 0, 23.523046875, -24.042578125],
  },
  {
    id: '09',
    label: 'asymmetric-down-right',
    semanticKey: 'asymmetric-down-right',
    values: [-20.058203125, 12.607421875, -12.7, 42.5, 22.1, 41.8, 22.2, 61.7, 0, 0, 0, 0, 0, 0],
  },
  {
    id: '10',
    label: 'attentive-left',
    semanticKey: 'attentive-left',
    values: [1.43359375, 6.194140625, 10.56015625, 23.83671875, 23.83671875, 58.130078125, 58.130078125, 56.8, 0, 0, 0, 0, 0, 0],
  },
  {
    id: '11',
    label: 'joyful-wide',
    semanticKey: 'joyful-wide',
    values: [-2.09296875, -15.899609375, -14.469921875, 34.20086765973213, 34.20086765973213, 85.330859375, 83.17775668160692, 59.414453125, 0, 0, 0, 0, 0, 0],
  },
  {
    id: '12',
    label: 'wide-downward-gaze',
    semanticKey: 'wide-downward-gaze',
    values: [-19.20859375, 15.2, 11.8, 52.084765625, 53.11410881916995, 51.467159708498066, 52.187699944416956, 69.5, 0, 0, 0, 0, 0, 0],
  },
  {
    id: '13',
    label: 'eyes-closed',
    semanticKey: 'eyes-closed',
    values: [-8.75234375, -8.743359375, -10.773828125, 56.133984375, 56.133984375, 15.5, 15.15546875, 69.276171875, 0, 0, 0, 0, 0, 0],
  },
  {
    id: '14',
    label: 'skeptical-left',
    semanticKey: 'skeptical-left',
    values: [3.529296875, -7.0765625, 9.830078125, 24.30625, 48.92421875, 59.281640625, 13.408203125, 62.218359375, 0, 0, 0, 0, 0, 0],
  },
  {
    id: '15',
    label: 'far-right-glance',
    semanticKey: 'far-right-glance',
    values: [0.319140625, 35.307421875, -10.904296875, 22.4609375, 22.4609375, 39.820703125, 39.820703125, 53.9, 0, 0, 0, 0, 0, 0],
  },
  {
    id: '16',
    label: 'angry-left',
    semanticKey: 'angry-left',
    values: [-14.75078125, -19.350000000000005, 5.631640625, 19.60234375, 19.60234375, 48.63984375, 48.63984375, 55.1, 0, 0, 0, 0, -27.606640625, 26.1484375],
  },
  {
    id: '17',
    label: 'playful-right',
    semanticKey: 'playful-right',
    values: [-4.3953125, 14.07265625, -16.126171875, 19.045145681988206, 19.045145681988206, 43.370703125, 43.370703125, 51.731249999999996, 0, 0, 0, 0, 26.2921875, -20.24921875],
  },
  {
    id: '18',
    label: 'asymmetric-up-left',
    semanticKey: 'asymmetric-up-left',
    values: [6.585546875, 4.737109375, 12.840234375, 42.1, 22.2, 41.7, 22.1, 60.4, 0, 0, 0, 0, 0, 0],
  },
  {
    id: '19',
    label: 'gentle-downward-gaze',
    semanticKey: 'gentle-downward-gaze',
    values: [-6.077734375, -11.03515625, -13.965625, 23.045703125, 23.045703125, 58.68515625, 58.68515625, 56.2, 0, 0, 0, 0, 0, 0],
  },
  {
    id: '20',
    label: 'wide-down-left',
    semanticKey: 'wide-down-left',
    values: [-17.127734375, 18.070703125, 13.891796875, 35.452734375, 35.452734375, 79.104296875, 79.104296875, 70.8, 0, 0, 0, 0, 0, 0],
  },
  {
    id: '21',
    label: 'surprised-wide-left',
    semanticKey: 'surprised-wide-left',
    values: [-5.428125, -11.71328125, -13.472265625, 51.4, 50.5, 50.1, 49.4, 69, 0, 0, 0, 0, 0, 0],
  },
  {
    id: '22',
    label: 'drowsy-closed',
    semanticKey: 'drowsy-closed',
    values: [10.292578125, 3.39921875, 7.583203125, 55.672265625, 55.672265625, 14.616015625, 14.616015625, 68.416796875, 0, 0, 0, 0, 0, 0],
  },
  {
    id: '23',
    label: 'suspicious-right',
    semanticKey: 'suspicious-right',
    values: [-17.8, 10, -10.894921875, 23.969921875, 53.56328125, 55.89296875, 13.33359375, 59.94375, 0, 0, -9.8, -9.8, 0, 0],
  },
  {
    id: '24',
    label: 'shy-downward',
    semanticKey: 'shy-downward',
    values: [7.131640625, 7.7828125, 3.935546875, 21.5, 23.2, 32, 33.5, 51.2, 0, 0, 40, 40, 0, 0],
  },
  {
    id: '25',
    label: 'angry-brows',
    semanticKey: 'angry-brows',
    values: [10.473974503042374, 5.087293619785961, 4.698252132317348, 27.1265625, 27.1265625, 63.028125, 63.028125, 68.7, 0, 0, 0, 0, -36.24453125, 27.730078125],
    bodyMotion: 'shake',
    bodyColor: '#BA3636',
    eyeColor: '#610000',
  },
  {
    id: '26',
    label: 'uneasy-left',
    semanticKey: 'uneasy-left',
    values: [-12.303515625, -17.601171875, 5.9109375, 20.605859375, 20.605859375, 47.769921875, 47.769921875, 54.9, 0, 0, 0, 0, 23.523046875, -24.042578125],
    eyeMotion: 'shake',
    bodyMotion: 'slowDrift',
    bodyColor: '#ADC3FF',
  },
];

const toExpression = ({
  id,
  semanticKey,
  values,
  eyeMotion = 'none',
  bodyMotion = 'none',
  bodyColor,
  eyeColor,
}: CalibratedDefinition): AvatarExpression => {
  const [headX, headY, headZ, widthLeft, widthRight, heightLeft, heightRight, spacing, positionXLeft, positionXRight, positionYLeft, positionYRight, leftAngle, rightAngle] = values;
  return {
    id,
    semanticKey,
    headX,
    headY,
    headZ,
    widthLeft,
    widthRight,
    heightLeft,
    heightRight,
    spacing,
    positionXLeft,
    positionXRight,
    positionYLeft,
    positionYRight,
    leftAngle,
    rightAngle,
    perspective: 1,
    eyeMotion,
    bodyMotion,
    ...(bodyColor ? { bodyColor } : {}),
    ...(eyeColor ? { eyeColor } : {}),
  };
};

const referenceExpressions = calibratedDefinitions.map(toExpression);
const expressionById = new Map(referenceExpressions.map(expression => [expression.id, expression]));

const baseExpression = toExpression(baseDefinition);

const withMotion = (
  id: string,
  eyeMotion: AvatarEyeMotion,
  bodyMotion: AvatarBodyMotion
): AvatarExpression => ({
  ...(expressionById.get(id) ?? baseExpression),
  eyeMotion,
  bodyMotion,
});

const neutralExpression: AvatarExpression = {
  id: 'neutral',
  semanticKey: 'neutral',
  headX: 0,
  headY: 0,
  headZ: 0,
  widthLeft: 20,
  widthRight: 20,
  heightLeft: 50,
  heightRight: 50,
  spacing: 35,
  positionXLeft: 0,
  positionXRight: 0,
  positionYLeft: -7,
  positionYRight: -7,
  leftAngle: 0,
  rightAngle: 0,
  perspective: 1,
  eyeMotion: 'microSaccades',
  bodyMotion: 'slowDrift',
};

export const AVATAR_STATE_PARAMS: Record<AvatarState, AvatarExpression> = {
  idle: neutralExpression,
  listening: withMotion('10', 'microSaccades', 'slowDrift'),
  thinking: withMotion('08', 'microSaccades', 'slowDrift'),
  speaking: withMotion('11', 'microSaccades', 'slowDrift'),
  error: { ...expressionById.get('25')!, bodyMotion: 'shake' },
};

export const getAvatarSurface = (expression: AvatarExpression): AvatarSurfaceOverride => {
  if (expression.bodyColor === '#BA3636') return RED_SURFACE;
  if (expression.bodyColor === '#ADC3FF') return BLUE_SURFACE;
  return WHITE_SURFACE;
};

const expressionBySemanticKey = new Map(
  referenceExpressions
    .filter(expression => expression.semanticKey != null)
    .map(expression => [expression.semanticKey as string, expression])
);

export const getAvatarExpressionBySemanticKey = (
  key: string | null
): AvatarExpression | undefined => (key == null ? undefined : expressionBySemanticKey.get(key));

export const AVATAR_PREVIEW_EXPRESSIONS: readonly AvatarPreviewPreset[] = referenceExpressions.map(
  expression => ({
    id: expression.id,
    label: expression.semanticKey ?? expression.id,
    expression,
    surface: getAvatarSurface(expression),
  })
);

export const AVATAR_PREVIEW_INTERVAL_MS = 2300;

export const AVATAR_TRANSITION_MS = 500;
export const AVATAR_TRANSITION_SPEAKING_MS = 380;

export const AVATAR_VIEWBOX = { width: 200, height: 200 } as const;
