import { View } from 'react-native';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useVoiceRecognition } from '@/features/people/hooks/use-voice-recognition';

type VoiceRecognitionRowProps = {
  userId: number;
  name: string;
};

export function VoiceRecognitionRow({ userId, name }: VoiceRecognitionRowProps) {
  const { t } = useTranslation();
  const dates = useDateFormatter();
  const { voice, pending, forget } = useVoiceRecognition(userId);

  if (!voice) return null;

  const since = new Date(voice.since * 1000);
  return (
    <View className="bg-surface-secondary flex-row items-center gap-3 rounded-2xl px-4 py-3">
      <Icon name="audio-lines" className="text-foreground-secondary size-5" />
      <View className="min-w-0 flex-1 gap-0.5">
        <Text variant="label">{t('screens.users.voice.recognized')}</Text>
        <Text variant="caption">
          {t('screens.users.voice.recognized-since', { date: dates.formatDayMonth(since) })}
        </Text>
      </View>
      <Button
        variant="ghost"
        size="sm"
        loading={pending}
        accessibilityLabel={t('screens.users.voice.forget-title', { name })}
        onPress={() => void forget({ userId, name })}>
        <Text>{t('screens.users.voice.forget')}</Text>
      </Button>
    </View>
  );
}
