/** Distance in points past which releasing the drag closes the sheet. */
export const SHEET_DISMISS_DISTANCE = 96;
/** Downward velocity that closes the sheet regardless of distance. */
export const SHEET_DISMISS_VELOCITY = 900;
/** Travel over which the dim fades out while dragging down. */
export const SHEET_DIM_TRAVEL = 260;
/** Resistance applied to an upward drag, the way a native sheet rubber-bands. */
export const SHEET_OVERDRAG_RESISTANCE = 0.25;
/**
 * Settle spring. Matched to Android's bottom-sheet feel: quick, barely any
 * overshoot, and velocity carried over so a flick continues rather than stops.
 */
export const SHEET_SETTLE_SPRING = { damping: 30, stiffness: 380, mass: 0.85 } as const;
