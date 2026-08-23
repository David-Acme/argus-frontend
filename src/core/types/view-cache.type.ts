import { VIEW_CACHE_KEYS } from '@/shared/constants/cache.constant';

export type ViewCacheKey = (typeof VIEW_CACHE_KEYS)[keyof typeof VIEW_CACHE_KEYS];
