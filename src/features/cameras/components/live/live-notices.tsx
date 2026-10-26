import { View } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { Cluster, Stack } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/notice';
import type { CameraLive } from '@/features/cameras/hooks/use-camera-live';

export type LiveNoticesProps = { view: CameraLive };

const LEASE = {
  mine: 'screens.cameras.sight.lease-mine',
  argus: 'screens.cameras.sight.lease-argus',
  other: 'screens.cameras.sight.lease-other',
} as const;

function PresetChips({ view }: LiveNoticesProps) {
  const { t } = useTranslation();
  const { presets, aim, access } = view;
  if (!presets) return null;
  return (
    <Cluster gap={2}>
      {aim.homePreset ? (
        <Button
          compact
          variant="secondary"
          icon="home"
          label={t('screens.cameras.stage.home')}
          onPress={presets.goHome}
        />
      ) : null}
      {presets.presets.map((preset) => (
        <Button
          compact
          variant="secondary"
          key={preset.id}
          label={preset.name || t('screens.cameras.patrol.unnamed-stop')}
          onPress={() => presets.goto(preset)}
        />
      ))}
      {access.managePresets ? (
        <Button
          compact
          variant="secondary"
          icon="plus"
          label={t('screens.cameras.preset-save')}
          onPress={() => void presets.save()}
        />
      ) : null}
    </Cluster>
  );
}

export function LiveNotices({ view }: LiveNoticesProps) {
  const { t } = useTranslation();
  const { live, ptz, aim } = view;
  const steering = live.ptzShown && ptz !== null;
  const lease = steering && aim.lease !== 'free' ? aim.lease : null;
  const items = [
    live.quality.fellBack ? (
      <Notice
        key="quality"
        inline
        title={t('screens.cameras.live.fell-back')}
        action={{ label: t('screens.cameras.live.restore'), onPress: live.quality.restore }}
      />
    ) : null,
    steering && ptz.limit ? (
      <Notice key="limit" inline icon="alert" title={t('screens.cameras.ptz-limit')} />
    ) : null,
    lease ? (
      <Notice
        key="lease"
        inline
        tone={lease === 'other' ? 'attention' : 'info'}
        title={t(LEASE[lease])}
        action={
          lease === 'mine'
            ? { label: t('screens.cameras.sight.give-back'), onPress: () => void aim.giveBack() }
            : undefined
        }
      />
    ) : null,
    steering ? <PresetChips key="presets" view={view} /> : null,
  ].filter(Boolean);
  if (items.length === 0) return null;
  return (
    <View className="mt-3">
      <Stack gap={2}>{items}</Stack>
    </View>
  );
}
