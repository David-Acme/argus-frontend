import type { RecurrenceFrequency } from '@/core/types';

export const RECURRENCE_FREQUENCIES: readonly RecurrenceFrequency[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];

export const RECURRENCE_INTERVAL_MIN = 1;
export const RECURRENCE_INTERVAL_MAX = 999;

export const RECURRENCE_SEARCH_LIMIT = 1_000;

export const RECURRENCE_OCCURRENCE_LIMIT = 1_000;

export const RECURRENCE_OFFSET_CACHE_LIMIT = 4_096;
