import { SPARSE_CAMERAS } from '@/features/security/model/camera-tiles';

export type StarterInput = {
  cameras: number;
  feed: 'idle' | 'loading' | 'ready' | 'failed';
  episodes: number;
};

export type Starters = { promise: boolean; suggest: boolean };

export function starters({ cameras, feed, episodes }: StarterInput): Starters {
  return { promise: cameras <= SPARSE_CAMERAS, suggest: feed === 'ready' && episodes === 0 };
}
