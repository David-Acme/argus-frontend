import type { ICameraCacheRow } from '@/core/interfaces';
import type { TranslateFn } from '@/core/types';
import { cameraService } from '@/core/services/camera.service';
import { useTranslation } from '@/shared/hooks/use-translation';
import { runOptimistic } from '@/shared/libs/optimistic-action';
import { hasMenuItems, Menu } from '@/shared/ui/menu';
import type { MenuItem } from '@/shared/ui/menu';
import type { CameraQualityControls } from '@/features/cameras/hooks/use-camera-quality';

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

function stateItem(camera: ICameraCacheRow, t: TranslateFn): MenuItem {
  return {
    label: camera.isEnabled ? t('screens.cameras.disable') : t('screens.cameras.enable'),
    icon: camera.isEnabled ? 'eyeoff' : 'eye',
    family: 'caution',
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
  };
}

function removeItem(camera: ICameraCacheRow, t: TranslateFn): MenuItem {
  return {
    label: t('screens.cameras.delete'),
    icon: 'trash',
    destructive: true,
    confirm: {
      title: t('screens.cameras.delete-confirm-title', { name: camera.name }),
      body: t('screens.cameras.delete-confirm-body'),
      confirmLabel: t('common.confirm-delete'),
    },
    onPress: () =>
      runOptimistic({
        intents: [{ table: 'camera', kind: 'delete', recordId: camera.id }],
        call: () => cameraService.remove(camera.id),
        success: t('screens.cameras.removed'),
      }),
  };
}

export function LiveMenu({ camera, access, quality, onEdit, onAnnounce }: LiveMenuProps) {
  const { t } = useTranslation();
  const items: MenuItem[] = [];
  if (onAnnounce)
    items.push({
      label: t('screens.cameras.menu.announce'),
      icon: 'speaker',
      family: 'argus',
      onPress: onAnnounce,
    });
  if (quality)
    items.push({
      label:
        quality.quality === 'main'
          ? t('screens.cameras.menu.quality-sub')
          : t('screens.cameras.menu.quality-main'),
      icon: 'sliders',
      family: 'view',
      onPress: () => quality.choose(quality.quality === 'main' ? 'sub' : 'main'),
    });
  if (access.update)
    items.push(
      { label: t('screens.cameras.edit'), icon: 'pencil', family: 'edit', onPress: onEdit },
      stateItem(camera, t)
    );
  if (access.remove) items.push(removeItem(camera, t));
  if (!hasMenuItems(items)) return null;
  return <Menu label={t('screens.cameras.menu.more')} items={items} />;
}
