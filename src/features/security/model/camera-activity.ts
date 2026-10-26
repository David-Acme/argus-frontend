import type { ICameraDetection } from '@/core/interfaces';
import type { TranslateFn } from '@/core/types';
import type { SecurityTile } from '@/features/security/model/camera-tiles';

export type ActivityRow = { id: string; name: string; meta: string; count: number };

export type ActivityInput = {
  events: readonly Pick<ICameraDetection, 'cameraId' | 'at' | 'label'>[];
  now: number;
  t: TranslateFn;
  time: (value: Date) => string;
  what: (label: string) => string;
};

export function activityToday(
  tiles: readonly SecurityTile[],
  { events, now, t, time, what }: ActivityInput
): ActivityRow[] {
  const startOfToday = new Date(now).setHours(0, 0, 0, 0);
  const today = events.filter((event) => event.at >= startOfToday);
  return tiles.map((tile) => {
    const own = today.filter((event) => String(event.cameraId) === tile.id);
    const latest = own.reduce<(typeof own)[number] | null>(
      (best, event) => (best && best.at >= event.at ? best : event),
      null
    );
    const meta = latest
      ? t('screens.security.activity.last', {
          what: what(latest.label),
          time: time(new Date(latest.at)),
        })
      : t(
          tile.state === 'off' ? 'screens.security.activity.off' : 'screens.security.activity.quiet'
        );
    return { id: tile.id, name: tile.name, meta, count: own.length };
  });
}
