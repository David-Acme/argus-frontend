import type { IconName, VisitorCategory } from '@/core/types';

export const VISITOR_CATEGORY_ICONS: Readonly<Record<VisitorCategory, IconName>> = {
  '': 'user',
  neighbor: 'home',
  delivery: 'package',
  service: 'briefcase',
  family: 'users',
  acquaintance: 'user-check',
  watchlist: 'siren',
};

export const VISITOR_PREVIEW_COUNT = 6;

export const VISITOR_PAGE_SIZE = 60;

export const VISITOR_SEARCH_DEBOUNCE_MS = 250;

export const VISITOR_TILE_ESTIMATE = 220;

export const VISITOR_RETENTION_STEPS: readonly number[] = [7, 15, 30, 45, 60];
