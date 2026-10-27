import { SPARSE_CAMERAS } from '@/features/security/model/camera-tiles';

export type StarterInput = { cameras: number };

export type Starters = { promise: boolean };

export function starters({ cameras }: StarterInput): Starters {
  return { promise: cameras <= SPARSE_CAMERAS };
}
