import { View } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { Text } from '@/shared/ui/text';
import type { CallResult } from '@/features/voice/model/call-stage';
import { voiceActionLabel } from '@/features/voice/model/voice-action-label';

const STATUS_KEYS = {
  pending: 'screens.voice.actions.pending',
  done: 'screens.voice.actions.done',
  failed: 'screens.voice.actions.failed',
} as const;

type CallResultCardProps = {
  result: CallResult;
  onView?: () => void;
};

export function CallResultCard({ result, onView }: CallResultCardProps) {
  const copy = useTranslation();
  const { t } = copy;
  const { action } = result;
  const status = t(STATUS_KEYS[action.status]);
  return (
    <View
      accessibilityLiveRegion="polite"
      className="bg-surface border-line rounded-media w-full flex-row items-center gap-3 border p-3">
      <View className="bg-fill size-well rounded-well items-center justify-center">
        <Icon
          name={result.icon}
          size="small"
          tone={action.status === 'failed' ? 'alert' : 'accent'}
        />
      </View>
      <View className="min-w-0 flex-1">
        <Text variant="label" numberOfLines={1}>
          {voiceActionLabel(action, copy)}
        </Text>
        <Text variant="rowMeta" tone={action.status === 'failed' ? 'alert' : '2'} numberOfLines={2}>
          {action.detail ? `${status} · ${action.detail}` : status}
        </Text>
      </View>
      {result.opensCamera && onView ? (
        <Button label={t('screens.voice.stage.view')} onPress={onView} compact />
      ) : null}
    </View>
  );
}
