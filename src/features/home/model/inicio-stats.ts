import type { ICameraDetection } from '@/core/interfaces';
import { layout, type WindowClass } from '@/shared/theme/tokens';
import type { IconGlyph } from '@/shared/ui/icon';

export type HeroStatKind = 'cameras' | 'alerts' | 'detections' | 'pending';

export type HeroStatInput = {
  cameras: number | null;
  alerts: number | null;
  detections: number | null;
  pending: number | null;
  place: StatPlace;
};

export type StatPlace = 'hero' | 'band' | 'wide';

export type HeroStat = {
  kind: HeroStatKind;
  count: number;
  icon?: IconGlyph;
  href: '/security' | '/agenda';
  raised?: boolean;
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

const KINDS: Record<StatPlace, readonly HeroStatKind[]> = {
  hero: ['cameras', 'alerts', 'detections'],
  band: ['cameras', 'alerts'],
  wide: ['cameras', 'alerts', 'detections', 'pending'],
};

export function heroStats(input: HeroStatInput): HeroStat[] {
  return KINDS[input.place].flatMap((kind) => {
    const count = input[kind];
    if (count === null) return [];
    const raised = kind === 'alerts' && count > 0;
    const icon = raised ? 'alert' : ICON[kind];
    return [
      { kind, count, href: HREF[kind], ...(icon ? { icon } : {}), ...(raised ? { raised } : {}) },
    ];
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

export function statPlace(windowClass: WindowClass, width: number): StatPlace {
  if (windowClass === 'compact' || windowClass === 'medium') return 'hero';
  return width >= layout.fourColumns ? 'wide' : 'band';
}
