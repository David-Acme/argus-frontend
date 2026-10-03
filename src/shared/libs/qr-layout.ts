export type QrLayoutThresholds = Readonly<{
  mediumMin: number;
  tallMin: number;
}>;

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
