/**
 * Width thresholds of the window classes, mirroring the `--breakpoint-*`
 * tokens in global.css. Kept here because JS decides structure and CSS only
 * decorates: a Tailwind prefix cannot pick a component.
 */
export const WINDOW_MEDIUM_MIN = 640;
export const WINDOW_EXPANDED_MIN = 1024;

/**
 * Below this the window is `short`: a phone in landscape, or a desktop window
 * squashed vertically. Vertical stacks collapse instead of scrolling forever.
 */
export const WINDOW_TALL_MIN = 500;

/** Content width caps per window class. */
export const CONTENT_MAX_WIDTH = {
  compact: 640,
  medium: 900,
  expanded: 1440,
} as const;

/** Width of the persistent navigation rail on expanded windows. */
export const NAV_RAIL_WIDTH = 76;

/** Gap between the floating bottom bar and the safe-area edge, in points. */
export const BOTTOM_NAV_GAP = 14;

/** Distance the bar travels while fading in or out, in points. */
export const BOTTOM_NAV_TRAVEL = 24;

/** Fade duration of the bar and of the screen transitions, in ms. */
export const NAV_FADE_MS = 220;

/** Keeps an empty panel from stretching edge to edge on a laptop window. */
export const EMPTY_STATE_MAX_WIDTH = 460;

/** The floating bar stays a centred pill instead of stretching on a wide window. */
export const BOTTOM_NAV_MAX_WIDTH = 560;

/** Reading column for single-purpose screens (onboarding, login, errors). */
export const CENTERED_SCREEN_MAX_WIDTH = 512;

/** Share of the window height a sheet or dialog body may take. */
export const OVERLAY_BODY_HEIGHT_RATIO = 0.62;
