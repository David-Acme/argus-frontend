import type { DashboardTab, IconName, TrendPoint } from '@/core/types';

/** Mosaic block behind the performance delta. */
export const MOSAIC_COLUMNS = 13;
export const MOSAIC_ROWS = 6;

/** Four steps of ink, lightest first. */
export const MOSAIC_TINTS = [
  'bg-border-subtle',
  'bg-border',
  'bg-foreground-secondary',
  'bg-foreground',
] as const;

/** Height of a project card panel, in points. */
export const PROJECT_PANEL_HEIGHT = 92;

/** Template series for the trend chart until real metrics arrive. */
export const TREND_POINTS: readonly TrendPoint[] = [
  { label: '30%', bar: 55, line: 40 },
  { label: '12%', bar: 78, line: 64 },
  { label: '32%', bar: 52, line: 50 },
];

/** Hours the schedule timeline shows: a working day, not 24 empty rows. */
export const TIMELINE_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] as const;

/**
 * Member tints come from the palette so a stack reads as one family instead of
 * a rainbow. Assignment is by name hash, so a person keeps their tint.
 */
export const MEMBER_TINTS = [
  'bg-accent-soft',
  'bg-surface-secondary',
  'bg-card-secondary',
  'bg-border-subtle',
] as const;

/**
 * Template attendees for the agenda/schedule cards. Real members arrive with
 * the person/attendee sync; only the initial is ever rendered.
 */
export const DASHBOARD_MEMBERS: readonly (readonly string[])[] = [
  ['Ana', 'Bruno', 'Carla'],
  ['David', 'Elena', 'Franco', 'Gabriel'],
  ['Hugo', 'Irene'],
];

/** Bottom bar order and icons. Labels are resolved by the caller via i18n. */
export const DASHBOARD_TABS: readonly { tab: DashboardTab; icon: IconName }[] = [
  { tab: 'home', icon: 'home' },
  { tab: 'insights', icon: 'pie-chart' },
  { tab: 'messages', icon: 'messages-square' },
  { tab: 'profile', icon: 'user' },
];
