import type { ICameraDetection } from '@/core/interfaces';
import { activityLevels } from '@/core/services/view-cache/activity.projection';

export type CameraActivity = {
  recent: number;
  today: number;
  levels: number[][];
};

export function cameraActivity(events: readonly Pick<ICameraDetection, 'at'>[], now: number): CameraActivity {
  const startOfToday = new Date(now).setHours(0, 0, 0, 0);
  return {
    recent: events.length,
    today: events.filter((event) => event.at >= startOfToday).length,
    levels: activityLevels(
      events.map((event) => ({ occurredAt: new Date(event.at) })),
      new Date(now),
    ),
  };
}
