import { useRouter } from 'expo-router';
import type { ICameraCacheRow } from '@/core/interfaces';
import { useCameraClips } from '@/features/cameras/hooks/use-camera-clips';
import {
  clipsToday,
  settingsSummaryOf,
  zoneNames,
  type SettingsSection,
} from '@/features/cameras/model/camera-settings';
import { useNow } from '@/shared/hooks/use-now';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';

export type LiveRowsProps = {
  camera: ICameraCacheRow;
  clips: boolean;
  sections: readonly SettingsSection[];
};

const MINUTE_MS = 60_000;

function useRecordingsMeta(camera: ICameraCacheRow, clips: boolean): string | undefined {
  const { t } = useTranslation();
  const now = useNow(MINUTE_MS);
  const records = camera.recordMode !== 'off';
  const state = useCameraClips(camera.id, clips && records);
  if (!records) return t('screens.cameras.rows.recordings-off');
  if (state.status !== 'ready' && state.clips.length === 0) return undefined;
  const count = clipsToday(state.clips, now);
  if (count === 0) return t('screens.cameras.rows.recordings-none');
  if (count === 1) return t('screens.cameras.rows.recordings-one');
  return t('screens.cameras.rows.recordings-many', { count: String(count) });
}

export function LiveRows({ camera, clips, sections }: LiveRowsProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const recordings = useRecordingsMeta(camera, clips);
  const zones = zoneNames(camera.zones);
  const open = (child: 'recordings' | 'zones' | 'settings') =>
    router.push(`/cameras/${camera.id}/${child}`);
  return (
    <Section>
      {clips ? (
        <Row
          leading={<Avatar icon="play" />}
          title={t('screens.cameras.rows.recordings')}
          meta={recordings}
          chevron
          onPress={() => open('recordings')}
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
