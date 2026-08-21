export type QrLayoutThresholds = Readonly<{
  mediumMin: number;
  tallMin: number;
}>;

/**
 * A tablet in landscape has enough horizontal and vertical room to keep the
 * scanner primary while exposing its instructions and actions beside it.
 * Short landscape windows are phones or constrained desktop windows and keep
 * the bottom-sheet interaction instead.
 */
export function shouldUseQrSupportingPane(
  width: number,
  height: number,
  thresholds: QrLayoutThresholds,
): boolean {
  return (
    width >= thresholds.mediumMin &&
    width > height &&
    height >= thresholds.tallMin
  );
}
