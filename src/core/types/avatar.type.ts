export type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

export type AvatarEyeMotion = 'none' | 'microSaccades' | 'shake';
export type AvatarBodyMotion = 'none' | 'slowDrift' | 'shake';

export type AvatarExpression = {
  id: string;
  semanticKey?: string;
  headX: number;
  headY: number;
  headZ: number;
  widthLeft: number;
  widthRight: number;
  heightLeft: number;
  heightRight: number;
  spacing: number;
  positionXLeft: number;
  positionXRight: number;
  positionYLeft: number;
  positionYRight: number;
  leftAngle: number;
  rightAngle: number;
  perspective: number;
  eyeMotion: AvatarEyeMotion;
  bodyMotion: AvatarBodyMotion;
  bodyColor?: string;
  eyeColor?: string;
};

export type AvatarSurfaceOverride = {
  face: string;
  shadow: string;
  highlight: string;
  ink: string;
};

export type AvatarPreviewPreset = {
  id: string;
  label: string;
  expression: AvatarExpression;
  surface: AvatarSurfaceOverride;
};

export type AvatarMotionMode = AvatarEyeMotion | AvatarBodyMotion;
