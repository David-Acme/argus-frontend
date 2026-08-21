/**
 * Window size class the layout reasons about. Structural decisions (columns,
 * rail vs bottom bar, default calendar view) branch on this instead of on the
 * platform: a tablet and a small desktop window want the same layout.
 */
export type WindowClass = 'compact' | 'medium' | 'expanded';

/**
 * Height class. Width alone is not enough once the device can rotate: a phone
 * in landscape is as wide as a small tablet but only ~360dp tall, so anything
 * stacked vertically has to give way.
 */
export type WindowHeightClass = 'short' | 'tall';

export type Orientation = 'portrait' | 'landscape';
