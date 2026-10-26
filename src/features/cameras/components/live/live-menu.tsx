import type { ICameraCacheRow } from '@/core/interfaces';
import { cameraService } from '@/core/services/camera.service';
import type { CameraQualityControls } from '@/features/cameras/hooks/use-camera-quality';
import { useTranslation } from '@/shared/hooks/use-translation';
import { runOptimistic } from '@/shared/libs/optimistic-action';
import { Menu, type MenuItem, type MenuItems } from '@/shared/ui/menu';

export type LiveMenuProps = {
  camera: ICameraCacheRow;
  access: { update: boolean; remove: boolean };
  quality: CameraQualityControls | null;
  onEdit: () => void;
  onAnnounce: (() => void) | null;
};

export function setCameraEnabled(
  camera: ICameraCacheRow,
  enabled: boolean,
  confirmCopy: { title: string; description: string } | null
) {
  return runOptimistic({
    confirm: confirmCopy ? { ...confirmCopy, intent: 'warning' } : undefined,
    intents: [
      { table: 'camera', kind: 'update', recordId: camera.id, values: { isEnabled: enabled } },
    ],
    call: () => cameraService.update(camera.id, { isEnabled: enabled }),
  });
}

function hasTwo(items: readonly MenuItem[]): items is MenuItems {
  return items.length >= 2;
}

export function LiveMenu({ camera, access, quality, onEdit, onAnnounce }: LiveMenuProps) {
  const { t } = useTranslation();
  const items: MenuItem[] = [];
  if (onAnnounce) items.push({ label: t('screens.cameras.menu.announce'), onPress: onAnnounce });
  if (quality)
    items.push({
      label:
        quality.quality === 'main'
          ? t('screens.cameras.menu.quality-sub')
          : t('screens.cameras.menu.quality-main'),
      onPress: () => quality.choose(quality.quality === 'main' ? 'sub' : 'main'),
    });
  if (access.update) {
    items.push({ label: t('screens.cameras.edit'), onPress: onEdit });
    items.push({
      label: camera.isEnabled ? t('screens.cameras.disable') : t('screens.cameras.enable'),
      onPress: () =>
        void setCameraEnabled(
          camera,
          !camera.isEnabled,
          camera.isEnabled
            ? {
                title: t('screens.cameras.disable-confirm-title', { name: camera.name }),
                description: t('screens.cameras.disable-confirm-body'),
              }
            : null
        ),
    });
  }
  if (access.remove)
    items.push({
      label: t('screens.cameras.delete'),
      destructive: true,
      onPress: () =>
        void runOptimistic({
          confirm: {
            title: t('screens.cameras.delete-confirm-title', { name: camera.name }),
            description: t('screens.cameras.delete-confirm-body'),
            confirmLabel: t('common.confirm-delete'),
            intent: 'danger',
          },
          intents: [{ table: 'camera', kind: 'delete', recordId: camera.id }],
          call: () => cameraService.remove(camera.id),
          success: t('screens.cameras.removed'),
        }),
    });
  if (!hasTwo(items)) return null;
  return <Menu label={t('screens.cameras.menu.more')} items={items} />;
}
