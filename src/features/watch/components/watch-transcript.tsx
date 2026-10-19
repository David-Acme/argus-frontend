import { View } from 'react-native';
import type { WatchTurn } from '@/core/types';
import { Text } from '@/shared/components/ui/text';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';

type WatchTranscriptProps = {
  turns: readonly WatchTurn[];
};

export function WatchTranscript({ turns }: WatchTranscriptProps) {
  const { t } = useTranslation();
  const dates = useDateFormatter();

  if (turns.length === 0) {
    return <Text variant="caption">{t('screens.watch.transcript-empty')}</Text>;
  }

  return (
    <View accessibilityLiveRegion="polite" className="gap-3">
      {turns.map((turn) => (
        <View
          key={turn.id}
          className={cn(
            'max-w-[88%] gap-0.5 rounded-2xl px-3.5 py-2.5',
            turn.role === 'user'
              ? 'bg-surface-secondary dark:bg-card-secondary self-end'
              : 'bg-accent-soft self-start'
          )}>
          <Text variant="micro">
            {[
              turn.role === 'user' ? t('screens.watch.you') : t('screens.watch.argus'),
              dates.formatTime(new Date(turn.at)),
              turn.final ? null : t('screens.watch.transcript-partial'),
            ]
              .filter((part): part is string => part !== null)
              .join(' · ')}
          </Text>
          <Text variant="body" className={turn.final ? 'text-foreground' : 'text-foreground-secondary'}>
            {turn.text}
          </Text>
        </View>
      ))}
    </View>
  );
}
