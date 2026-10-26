import type { ICameraDetection } from '@/core/interfaces';
import type { IconGlyph } from '@/shared/ui/icon';

export type HeroStatKind = 'cameras' | 'alerts' | 'detections' | 'pending';

export type HeroStatInput = {
  cameras: number | null;
  alerts: number | null;
  detections: number | null;
  pending: number | null;
  wide: boolean;
};

export type HeroStat = {
  kind: HeroStatKind;
  count: number;
  icon?: IconGlyph;
  href: '/security' | '/agenda';
};

export type DayDetections = { detections: number; alerts: number };

const ICON: Record<HeroStatKind, IconGlyph | undefined> = {
  cameras: 'cam',
  alerts: 'shieldok',
  detections: 'hist',
  pending: undefined,
};

const HREF: Record<HeroStatKind, HeroStat['href']> = {
  cameras: '/security',
  alerts: '/security',
  detections: '/security',
  pending: '/agenda',
};

const ORDER: readonly HeroStatKind[] = ['cameras', 'alerts', 'detections', 'pending'];

export function heroStats(input: HeroStatInput): HeroStat[] {
  return ORDER.flatMap((kind) => {
    const count = input[kind];
    if (count === null || (kind === 'pending' && !input.wide)) return [];
    const icon = ICON[kind];
    return [{ kind, count, href: HREF[kind], ...(icon ? { icon } : {}) }];
  });
}

export function dayDetections(
  events: readonly Pick<ICameraDetection, 'at' | 'severity'>[],
  startOfToday: number
): DayDetections {
  const today = events.filter((event) => event.at >= startOfToday);
  return {
    detections: today.length,
    alerts: today.filter((event) => event.severity !== 'info').length,
  };
}
