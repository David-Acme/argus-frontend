import { auraField } from '@/shared/theme';

export type AuraBlob = (typeof auraField.blobs)[number];

export type BlobStop = { offset: number; opacity: number };

const STEPS = 12;

const SPREAD = 3;

function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const poly =
    t *
    (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const value = 1 - poly * Math.exp(-x * x);
  return x >= 0 ? value : -value;
}

export const blobPadding = auraField.blur * SPREAD;

export function blobStops(blob: AuraBlob): BlobStop[] {
  const radius = blob.width / 2;
  const outer = radius + blobPadding;
  return Array.from({ length: STEPS + 1 }, (_, step) => {
    const offset = step / STEPS;
    const distance = (radius - offset * outer) / (auraField.blur * Math.SQRT2);
    return { offset, opacity: Number((0.5 * (1 + erf(distance))).toFixed(4)) };
  });
}
