import { useRouter } from 'expo-router';
import type { ICameraCacheRow } from '@/core/interfaces';
import type { CameraRecordMode, TranslationKey } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { recordModeLabelKey } from '@/features/cameras/model/camera-record-mode';

export type RecordingGuideProps = { camera: ICameraCacheRow };

const MODE_MEANING = {
  events: 'screens.cameras.guide.mode-events',
  motion: 'screens.cameras.guide.mode-motion',
  continuous: 'screens.cameras.guide.mode-continuous',
  off: 'screens.cameras.guide.mode-off',
} as const satisfies Record<CameraRecordMode, TranslationKey>;

export function RecordingGuide({ camera }: RecordingGuideProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const days = camera.retentionDays;
  return (
    <Section title={t('screens.cameras.guide.recordings')}>
      <Row
        leading={<Avatar icon="play" />}
        title={t(recordModeLabelKey(camera.recordMode))}
        meta={t(MODE_MEANING[camera.recordMode])}
        chevron
        onPress={() => router.push(`/cameras/${camera.id}/settings`)}
      />
      <Row
        leading={<Avatar icon="clock" />}
        title={
          days == null
            ? t('screens.cameras.guide.keep-default')
            : t('screens.cameras.guide.keep-days', { days: String(days) })
        }
        meta={t('screens.cameras.guide.keep-meta')}
      />
      <Row
        leading={<Avatar icon="lock" />}
        title={t('screens.cameras.guide.private')}
        meta={t('screens.cameras.guide.private-meta')}
      />
    </Section>
  );
}
