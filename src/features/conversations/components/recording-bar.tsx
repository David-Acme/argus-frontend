import { View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { Text } from '@/shared/ui/text';
import { LiveWave } from '@/features/conversations/components/live-wave';
import { SLIDE_CANCEL_PX } from '@/features/conversations/constants/voice-note.constant';
import { cancelProgress } from '@/features/conversations/model/hold-record';
import type { LiveLevels } from '@/features/conversations/model/live-wave';
import type { HoldRecordMode } from '@/features/conversations/model/hold-record';
import { noteClock } from '@/features/conversations/model/voice-note';

export type RecordingBarProps = {
  mode: Exclude<HoldRecordMode, 'idle'>;
  elapsedMs: number;
  live: SharedValue<LiveLevels>;
  drag: SharedValue<number>;
  onCancel: () => void;
};

export function RecordingBar({ mode, elapsedMs, live, drag, onCancel }: RecordingBarProps) {
  const { t } = useTranslation();
  const clock = noteClock(elapsedMs);
  const fade = useAnimatedStyle(() => ({
    opacity: 1 - cancelProgress(drag.get(), SLIDE_CANCEL_PX),
  }));
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
        <LiveWave live={live} />
      ) : (
        <Animated.View
          style={fade}
          className="min-w-0 flex-1 flex-row items-center justify-end gap-1">
          <Icon name="chevl" size="small" tone="text-2" />
          <Text variant="meta" tone="2" numberOfLines={1}>
            {t('screens.conversations.note.slide-cancel')}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}
