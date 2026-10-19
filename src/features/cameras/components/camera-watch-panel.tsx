import { View } from 'react-native';
import type { CameraListening } from '@/features/cameras/model/camera-watch';
import { CAMERA_LISTENING_LABEL } from '@/features/cameras/model/camera-watch';
import { Panel } from '@/shared/components/ui/panel';
import { StatusBadge } from '@/shared/components/ui/status-badge';
import { ToggleRow } from '@/shared/components/ui/toggle-row';
import { useTranslation } from '@/shared/hooks/use-translation';

type CameraWatchPanelProps = {
  watchman: boolean;
  noAudio: boolean;
  listening: CameraListening;
  editable: boolean;
  onChange: (field: 'watchman' | 'noAudio', value: boolean) => void;
  className?: string;
};

export function CameraWatchPanel({
  watchman,
  noAudio,
  listening,
  editable,
  onChange,
  className,
}: CameraWatchPanelProps) {
  const { t } = useTranslation();
  const active = listening === 'listening';

  return (
    <Panel
      title={t('screens.cameras.watch.title')}
      description={t('screens.cameras.watch.description')}
      className={className}>
      <StatusBadge
        icon={active ? 'ear' : 'mic-off'}
        label={t(CAMERA_LISTENING_LABEL[listening])}
        iconClassName={active ? 'text-success' : 'text-muted-foreground'}
      />
      <View className="gap-1">
        <ToggleRow
          label={t('screens.cameras.watch.listen')}
          hint={t('screens.cameras.watch.listen-hint')}
          value={watchman && !noAudio}
          disabled={!editable || noAudio}
          onChange={(value) => onChange('watchman', value)}
        />
        <ToggleRow
          label={t('screens.cameras.watch.no-audio')}
          hint={t('screens.cameras.watch.no-audio-hint')}
          value={noAudio}
          disabled={!editable}
          onChange={(value) => onChange('noAudio', value)}
        />
      </View>
    </Panel>
  );
}
