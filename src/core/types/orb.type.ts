export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

export type OrbStateParams = {
  /** Base energy 0..1 — drives brightness, ring radius and audio reactivity. */
  intensity: number;
  /** Organic deformation multiplier for the ring silhouette. */
  wobble: number;
  /** Rotation speed multiplier — the ring accelerates live with audio. */
  speed: number;
  /** Brightness multiplier for the whole light field. */
  brightness: number;
  /** "Processing" comet head 0..1 sweeping around the ring (thinking). */
  pulse: number;
  /** Width of the analogous hue sweep around the annulus (turn fraction). */
  spread: number;
  /** Tint toward the theme error hue 0..1 (error state). */
  tint: number;
};
