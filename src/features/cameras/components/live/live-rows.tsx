import { useRouter } from 'expo-router';
import type { ICameraCacheRow } from '@/core/interfaces';
import type { TranslationKey } from '@/core/types';
import { useNow } from '@/shared/hooks/use-now';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cameraPrivacyMasked } from '@/shared/libs/camera-privacy';
import { Avatar } from '@/shared/ui/avatar';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { useClipFeed } from '@/features/cameras/hooks/use-clip-feed';
import {
  clipsToday,
  recordingsLineOf,
  settingsSummaryOf,
  zoneNames,
} from '@/features/cameras/model/camera-settings';
import type { RecordingsLine, SettingsSection } from '@/features/cameras/model/camera-settings';

export type LiveRowsProps = {
  camera: ICameraCacheRow;
  clips: boolean;
  sections: readonly SettingsSection[];
};

const MINUTE_MS = 60_000;

const RECORDINGS_LINE = {
  off: 'screens.cameras.rows.recordings-off',
  private: 'screens.cameras.rows.recordings-private',
  paused: 'screens.cameras.rows.recordings-paused',
  unread: 'screens.cameras.rows.recordings-unread',
  reading: 'screens.cameras.rows.recordings-reading',
} as const satisfies Record<Exclude<RecordingsLine, 'count'>, TranslationKey>;

function useRecordingsMeta(camera: ICameraCacheRow, clips: boolean): string {
  const { t } = useTranslation();
  const now = useNow(MINUTE_MS);
  const state = useClipFeed(camera.id, clips && camera.recordMode !== 'off');
  const line = recordingsLineOf({
    recordMode: camera.recordMode,
    masked: cameraPrivacyMasked(camera.privacyState),
    enabled: camera.isEnabled,
    status: state.status,
    hasClips: state.rows.length > 0,
  });
  if (line !== 'count') return t(RECORDINGS_LINE[line]);
  const count = clipsToday(state.rows, now);
  if (count === 0) return t('screens.cameras.rows.recordings-none');
  if (count === 1) return t('screens.cameras.rows.recordings-one');
  return t('screens.cameras.rows.recordings-many', { count: String(count) });
}

export function LiveRows({ camera, clips, sections }: LiveRowsProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const recordings = useRecordingsMeta(camera, clips);
  const zones = zoneNames(camera.zones);
  const open = (child: 'zones' | 'settings') => router.push(`/cameras/${camera.id}/${child}`);
  const openClips = () => router.push({ pathname: '/clips', params: { camera: camera.id } });
  return (
    <Section>
      {clips ? (
        <Row
          leading={<Avatar icon="play" />}
          title={t('screens.cameras.rows.recordings')}
          meta={recordings}
          chevron
          onPress={openClips}
        />
      ) : null}
      <Row
        leading={<Avatar icon="grid" />}
        title={t('screens.cameras.zones')}
        meta={zones.length > 0 ? zones.join(', ') : t('screens.cameras.rows.zones-none')}
        chevron
        onPress={() => open('zones')}
      />
      <Row
        leading={<Avatar icon="sliders" />}
        title={t('screens.cameras.settings')}
        meta={t(settingsSummaryOf(sections))}
        chevron
        onPress={() => open('settings')}
      />
    </Section>
  );
}
