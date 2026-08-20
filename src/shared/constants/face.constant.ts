/** Live face-capture guidance (see `use-face-guide`). */
export const FACE_SAMPLE_MS = 300;

export const FACE_SAMPLE_FAST_MS = 220;

export const FACE_NATIVE_EVENT_MIN_MS = 180;

export const FACE_UI_UPDATE_MS = 180;

/** How long the face must stay perfect before the auto-capture fires. */
export const FACE_READY_STABLE_MS = 650;

export const FACE_DRIFT_GRACE_MS = 500;

export const FACE_CAPTURE_SETTLE_MS = 160;

export const FACE_CAPTURE_READY_TIMEOUT_MS = 2000;

/** Max head tilt (degrees) accepted for a clean frontal shot. */
export const FACE_MAX_YAW_DEG = 18;

export const FACE_MAX_PITCH_DEG = 18;

export const FACE_MAX_ROLL_DEG = 18;

/** Face box height (fraction of the frame) below which the face is too far. */
export const FACE_FAR_MAX_HEIGHT = 0.21;

/** Face box height above which the face is too close. Matched to the rounder
 * guide oval (FACE_OVAL_RATIO): a rounder ellipse on a tall narrow screen is
 * smaller in height, so a face larger than ~40% of the frame would overflow
 * it — the guide must say "too close" before that happens. */
export const FACE_CLOSE_MIN_HEIGHT = 0.46;

/** Horizontal offset tolerance of the face center (fraction of the frame). */
export const FACE_CENTER_X_TOL = 0.16;

/** Vertical window the face center should sit in (eyes slightly above middle). */
export const FACE_CENTER_Y_MIN = 0.16;

export const FACE_CENTER_Y_MAX = 0.64;

/** Average frame luminance below which we ask for more light (0..255). */
export const FACE_LOW_LIGHT_LUM = 42;

/** Minimum eye-open probability to consider the eyes open (0..1). */
export const FACE_EYE_MIN_OPEN = 0.35;

/** Guide ellipse width:height ratio. Values below 1 produce a portrait oval. */
export const FACE_OVAL_RATIO = 0.72;
