export const QR_QUIET_ZONE_MODULES = 4;

export type QrLayout = {
  cell: number;
  offset: number;
};

export function qrLayout(size: number, modules: number, quietZone: number = QR_QUIET_ZONE_MODULES): QrLayout {
  const margin = Math.max(0, Math.floor(quietZone));
  const cell = size / (modules + 2 * margin);
  return { cell, offset: margin * cell };
}
