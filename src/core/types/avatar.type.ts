/** Visual states of the Argus assistant avatar (drives expressions). */
export type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

export type AvatarEyeMotion = 'none' | 'microSaccades' | 'shake';
export type AvatarBodyMotion = 'none' | 'slowDrift' | 'shake';

/**
 * Calibrated face pose. These are the same kind of values used by the
 * reference lab: the eyes are rounded rectangles described by dimensions,
 * position and angle instead of a single open/closed flag.
 */
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

/** Supported ambient behavior styles for serialized avatar presets. */
export type AvatarMotionMode = AvatarEyeMotion | AvatarBodyMotion;
