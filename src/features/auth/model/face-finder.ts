import { FACE_TICK_COUNT } from '@/features/auth/constants/face.constant';

export type TickRing = { size: number; inner: number; outer: number; count?: number };

export function tickPath({ size, inner, outer, count = FACE_TICK_COUNT }: TickRing): string {
  const centre = size / 2;
  const point = (radius: number, angle: number) =>
    `${(centre + Math.cos(angle) * radius).toFixed(2)} ${(centre + Math.sin(angle) * radius).toFixed(2)}`;
  return Array.from({ length: Math.max(0, Math.min(FACE_TICK_COUNT, count)) }, (_, index) => {
    const angle = (index / FACE_TICK_COUNT) * Math.PI * 2 - Math.PI / 2;
    return `M${point(inner * size, angle)}L${point(outer * size, angle)}`;
  }).join('');
}

export function sweepStep(current: number, target: number, step: number): number {
  if (current === target) return current;
  return current < target ? Math.min(target, current + step) : Math.max(target, current - step);
}
