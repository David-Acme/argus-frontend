import type { ICameraCacheRow } from '@/core/interfaces';
import type { TranslateFn } from '@/core/types';
import type { AttentionItem } from '@/shared/libs/surfaces';
import { isPendingRecordId } from '@/shared/libs/optimistic';

export function cameraAttention(
  cameras: readonly Pick<ICameraCacheRow, 'id' | 'name' | 'isEnabled' | 'isOnline'>[],
  t: TranslateFn
): AttentionItem[] {
  return cameras
    .filter((camera) => camera.isEnabled && !camera.isOnline && !isPendingRecordId(camera.id))
    .map((camera) => ({
      id: `camera-offline:${camera.id}`,
      title: t('screens.cameras.attention.offline', { camera: camera.name }),
      meta: t('screens.cameras.attention.offline-meta'),
      icon: 'wifioff',
      href: `/cameras/${camera.id}`,
    }));
}
