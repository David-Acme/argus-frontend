import { Platform, Pressable, View } from 'react-native';
import type { GuardDecision, GuardFeedbackLabel } from '@/core/types';
import { Text } from '@/shared/components/ui/text';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { DangerBadge } from '@/features/security/components/danger-badge';
import { EmptyState } from '@/shared/components/ui/empty-state';

type DecisionReviewProps = {
  decisions: GuardDecision[];
  onFeedback: (eventId: string, label: GuardFeedbackLabel) => void;
};

const LABELS: readonly { value: GuardFeedbackLabel; key: 'useful' | 'false-alarm' | 'not-now' }[] =
  [
    { value: 'useful', key: 'useful' },
    { value: 'false_alarm', key: 'false-alarm' },
    { value: 'not_now', key: 'not-now' },
  ];

const hover = Platform.select({ web: 'hover:bg-surface-secondary', default: '' });

export function DecisionReview({ decisions, onFeedback }: DecisionReviewProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();

  if (decisions.length === 0) {
    return (
      <EmptyState
        variant="panel"
        icon="check-circle"
        title={t('screens.security.decisions.empty')}
        hint={t('screens.security.decisions.empty-hint')}
        className="min-h-56"
      />
    );
  }

  return (
    <View className="-mx-3 min-h-56 gap-1">
      {decisions.map((decision) => {
        const at = new Date(decision.createdAt * 1000);
        return (
          <View key={decision.eventId} className="gap-2 rounded-2xl px-3 py-3">
            <View className="flex-row items-center justify-between gap-2">
              <Text variant="body" className="flex-1 font-medium">
                {decision.didNotify
                  ? t('screens.security.decisions.notified')
                  : t('screens.security.decisions.silent')}
              </Text>
              <DangerBadge danger={decision.severity} />
            </View>
            <Text variant="caption">
              {`${t('screens.security.decisions.camera', { id: String(decision.cameraId) })}  ${date.formatDayMonth(at)} ${date.formatTime(at)}`}
            </Text>
            <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
              {LABELS.map((label) => {
                const chosen = decision.feedbackLabel === label.value;
                return (
                  <Pressable
                    key={label.value}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: chosen }}
                    onPress={() => onFeedback(decision.eventId, label.value)}
                    className={cn(
                      'min-h-9 justify-center rounded-full border px-3.5 active:opacity-70',
                      chosen
                        ? 'bg-interactive border-interactive'
                        : cn('border-border bg-card', hover)
                    )}>
                    <Text
                      variant="label"
                      className={chosen ? 'text-foreground-on-interactive' : 'text-foreground'}>
                      {t(`screens.security.decisions.${label.key}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}
