import { useRouter } from 'expo-router';
import { useState } from 'react';
import { cameraService } from '@/core/services/camera.service';
import { useTranslation } from '@/shared/hooks/use-translation';
import { runOptimistic } from '@/shared/libs/optimistic-action';
import { Avatar } from '@/shared/ui/avatar';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { CameraForm } from '@/features/cameras/components/camera-form';
import { setCameraEnabled } from '@/features/cameras/components/live/live-menu';
import type { CameraSettings } from '@/features/cameras/hooks/use-camera-settings';

export type AdvancedSectionProps = { settings: CameraSettings };

export function AdvancedSection({ settings }: AdvancedSectionProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const { camera, access } = settings;
  const remove = async () => {
    const removed = await runOptimistic({
      confirm: {
        title: t('screens.cameras.delete-confirm-title', { name: camera.name }),
        description: t('screens.cameras.delete-confirm-body'),
        confirmLabel: t('common.confirm-delete'),
        intent: 'danger',
      },
      intents: [{ table: 'camera', kind: 'delete', recordId: camera.id }],
      call: () => cameraService.remove(camera.id),
      success: t('screens.cameras.removed'),
    });
    if (removed) router.replace('/security');
  };
  return (
    <>
      <Section title={t('screens.cameras.advanced')}>
        {access.update ? (
          <Row
            leading={<Avatar icon="sliders" />}
            title={t('screens.cameras.edit')}
            meta={t('screens.cameras.sections.edit-meta')}
            chevron
            onPress={() => setEditing(true)}
          />
        ) : null}
        {access.update ? (
          <Row
            leading={<Avatar icon={camera.isEnabled ? 'eyeoff' : 'play'} />}
            title={camera.isEnabled ? t('screens.cameras.disable') : t('screens.cameras.enable')}
            meta={
              camera.isEnabled
                ? t('screens.cameras.disable-confirm-body')
                : t('screens.cameras.live.disabled-hint')
            }
            onPress={() =>
              void setCameraEnabled(
                camera,
                !camera.isEnabled,
                camera.isEnabled
                  ? {
                      title: t('screens.cameras.disable-confirm-title', { name: camera.name }),
                      description: t('screens.cameras.disable-confirm-body'),
                    }
                  : null
              )
            }
          />
        ) : null}
        {access.remove ? (
          <Row title={t('screens.cameras.delete')} danger onPress={() => void remove()} />
        ) : null}
      </Section>
      <CameraForm open={editing} onOpenChange={setEditing} camera={camera} />
    </>
  );
}
