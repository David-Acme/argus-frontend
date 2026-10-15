import type { IconName } from '@/core/types';

export type OfflineView = {
  key: string;
  title: string;
  description: string;
  icon: IconName;
};

export type OfflineTransition = 'none' | 'open' | 'replace' | 'recovered';

export const offlineTransition = (previous: OfflineView | null, current: OfflineView | null): OfflineTransition => {
  if (previous?.key === current?.key) return 'none';
  if (!current) return 'recovered';
  return previous ? 'replace' : 'open';
};
