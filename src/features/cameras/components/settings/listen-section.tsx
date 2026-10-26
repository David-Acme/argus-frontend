import { cameraService } from '@/core/services/camera.service';
import type { CameraSettings } from '@/features/cameras/hooks/use-camera-settings';
import { listenSwitchPaused } from '@/features/cameras/model/camera-block';
import { CAMERA_LISTENING_LABEL, watchPatchOf } from '@/features/cameras/model/camera-watch';
import { useTranslation } from '@/shared/hooks/use-translation';
import { runOptimistic } from '@/shared/libs/optimistic-action';
import { Avatar } from '@/shared/ui/avatar';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { Switch } from '@/shared/ui/switch';

export type ListenSectionProps = { settings: CameraSettings };

export function ListenSection({ settings }: ListenSectionProps) {
  const { t } = useTranslation();
  const { camera, listening, access } = settings;
  const switchable = access.update && !camera.noAudio && !listenSwitchPaused(listening);
  const save = (field: 'watchman' | 'noAudio', value: boolean) => {
    const patch = watchPatchOf(field, value);
    void runOptimistic({
      intents: [{ table: 'camera', kind: 'update', recordId: camera.id, values: patch }],
      call: () => cameraService.update(camera.id, patch),
      errorTitle: t('screens.cameras.watch.save-failed'),
    });
  };
  return (
    <Section title={t('screens.cameras.watch.title')}>
      <Row
        leading={<Avatar icon="mic" tone={listening === 'listening' ? 'ok' : undefined} />}
        title={t('screens.cameras.watch.listen')}
        meta={t(CAMERA_LISTENING_LABEL[listening])}
        trailing={
          switchable ? (
            <Switch
              value={camera.watchman}
              label={t('screens.cameras.watch.listen')}
              onValueChange={(value) => save('watchman', value)}
            />
          ) : undefined
        }
      />
      {access.update ? (
        <Row
          title={t('screens.cameras.watch.no-audio')}
          meta={t('screens.cameras.watch.no-audio-hint')}
          trailing={
            <Switch
              value={camera.noAudio}
              label={t('screens.cameras.watch.no-audio')}
              onValueChange={(value) => save('noAudio', value)}
            />
          }
        />
      ) : null}
    </Section>
  );
}
