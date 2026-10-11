import { MASCOT_ORBIT } from '@/features/auth/constants/welcome-mascot';

export type OrbitPoint = { x: number; y: number; depth: number };

export function orbitAngle(index: number, count: number, spin: number): number {
  'worklet';
  return 180 + (360 * index) / Math.max(count, 1) + spin;
}

export function orbitPoint(angle: number): OrbitPoint {
  'worklet';
  const radians = (angle * Math.PI) / 180;
  const depth = Math.sin(radians);
  return {
    x: Math.cos(radians) * MASCOT_ORBIT.radius,
    y: depth * MASCOT_ORBIT.radius * MASCOT_ORBIT.tilt,
    depth,
  };
}

export function orbitScale(depth: number): number {
  'worklet';
  const front = (depth + 1) / 2;
  return MASCOT_ORBIT.backScale + (MASCOT_ORBIT.frontScale - MASCOT_ORBIT.backScale) * front;
}

export function gazeDirection(angle: number): { x: number; y: number } {
  'worklet';
  const radians = (angle * Math.PI) / 180;
  return { x: Math.cos(radians), y: Math.sin(radians) * MASCOT_ORBIT.tilt };
}
