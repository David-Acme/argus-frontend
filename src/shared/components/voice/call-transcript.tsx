import { View } from 'react-native';
import type { VoiceTranscriptLine } from '@/core/types';
import { Text } from '@/shared/components/ui/text';
import { CALL_TRANSCRIPT_VISIBLE } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';

export function CallTranscript({ lines }: { lines: readonly VoiceTranscriptLine[] }) {
  const { t } = useTranslation();
  const visible = lines.slice(-CALL_TRANSCRIPT_VISIBLE);
  return (
    <View accessibilityLiveRegion="polite" className="w-full gap-2.5">
      {visible.map((line, index) => {
        const recent = index >= visible.length - 2;
        return (
          <View key={line.id} className={cn('gap-0.5', !recent && 'opacity-50')}>
            <Text variant="micro">
              {line.role === 'user' ? t('screens.voice.you') : t('screens.voice.argus')}
            </Text>
            <Text variant="body" className={line.role === 'user' ? 'text-foreground-secondary' : 'text-foreground'}>
              {line.text}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
