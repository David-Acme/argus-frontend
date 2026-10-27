import { View } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { size } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { Text } from '@/shared/ui/text';
import { SLIDE_CANCEL_PX } from '@/features/conversations/constants/voice-note.constant';
import { cancelProgress } from '@/features/conversations/model/hold-record';
import type { HoldRecordMode } from '@/features/conversations/model/hold-record';
import { noteClock } from '@/features/conversations/model/voice-note';

export type RecordingBarProps = {
  mode: Exclude<HoldRecordMode, 'idle'>;
  elapsedMs: number;
  levels: readonly number[];
  dragDx: number;
  onCancel: () => void;
};

type LiveWaveProps = { levels: readonly number[] };

const MIN_BAR = 0.1;

const barStyle = (level: number) => ({
  width: size.noteBar,
  height: Math.max(MIN_BAR, level) * size.noteWave,
});

function LiveWave({ levels }: LiveWaveProps) {
  return (
    <View
      aria-hidden
      className="h-note-wave min-w-0 flex-1 flex-row items-center justify-end gap-0.5 overflow-hidden">
      {levels.map((level, index) => (
        <View key={index} style={barStyle(level)} className="bg-text-2 rounded-full" />
      ))}
    </View>
  );
}

export function RecordingBar({ mode, elapsedMs, levels, dragDx, onCancel }: RecordingBarProps) {
  const { t } = useTranslation();
  const clock = noteClock(elapsedMs);
  const fade = { opacity: 1 - cancelProgress(dragDx, SLIDE_CANCEL_PX) };
  return (
    <View
      role="status"
      accessibilityLiveRegion="polite"
      accessibilityLabel={t('screens.conversations.note.recording', { clock })}
      className="bg-surface border-line min-h-field min-w-0 flex-1 flex-row items-center gap-2 rounded-full border px-3">
      {mode === 'locked' ? (
        <Button
          iconOnly
          compact
          icon="trash"
          label={t('screens.conversations.note.discard')}
          onPress={onCancel}
        />
      ) : null}
      <View className="bg-alert size-dot rounded-full" />
      <Text variant="meta" tone="default">
        {clock}
      </Text>
      {mode === 'locked' ? (
        <LiveWave levels={levels} />
      ) : (
        <View style={fade} className="min-w-0 flex-1 flex-row items-center justify-end gap-1">
          <Icon name="chevl" size="small" tone="text-2" />
          <Text variant="meta" tone="2" numberOfLines={1}>
            {t('screens.conversations.note.slide-cancel')}
          </Text>
        </View>
      )}
    </View>
  );
}
