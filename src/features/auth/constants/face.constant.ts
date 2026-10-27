export const FACE_SAMPLE_MS = 300;

export const FACE_SAMPLE_FAST_MS = 220;

export const FACE_UI_UPDATE_MS = 180;

export const FACE_READY_STABLE_MS = 650;

export const FACE_DRIFT_GRACE_MS = 500;

export const FACE_CAPTURE_SETTLE_MS = 160;
export const FACE_MANUAL_CAPTURE_DELAY_MS = 8000;

export const FACE_DONE_PAUSE_MS = 900;

export const FACE_CAPTURE_READY_TIMEOUT_MS = 2000;

export const FACE_MAX_YAW_DEG = 18;

export const FACE_MAX_PITCH_DEG = 18;

export const FACE_MAX_ROLL_DEG = 18;

export const FACE_FAR_MAX_HEIGHT = 0.21;

export const FACE_CLOSE_MIN_HEIGHT = 0.46;

export const FACE_CENTER_X_TOL = 0.16;

export const FACE_CENTER_Y_MIN = 0.16;

export const FACE_CENTER_Y_MAX = 0.64;

export const FACE_LOW_LIGHT_LUM = 42;

export const FACE_EYE_MIN_OPEN = 0.35;

export const FACE_TICK_COUNT = 72;

export const FINDER_RING = {
  inner: 0.4216,
  outerOff: 0.4701,
  outerOn: 0.4888,
  widthOff: 0.0112,
  widthOn: 0.0149,
} as const;

export const FINDER_LENS = 0.791;

export const FINDER_SWEEP_TICKS = 3;
