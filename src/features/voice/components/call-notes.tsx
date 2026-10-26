import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { VoiceActionRecord } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { Text } from '@/shared/ui/text';
import { endedSummaryOf } from '@/features/voice/model/call-stage';
import { voiceActionLabel } from '@/features/voice/model/voice-action-label';

type StageTopProps = {
  header?: ReactNode;
  onMinimise?: () => void;
  onSwitchToChat?: () => void;
};

type WaitingCardProps = {
  reason: string;
  onAnswer?: () => void;
  onDismiss?: () => void;
};

export function StageTop({ header, onMinimise, onSwitchToChat }: StageTopProps) {
  const { t } = useTranslation();
  if (header) return header;
  return (
    <View className="flex-row items-center justify-between">
      {onMinimise ? (
        <Button
          iconOnly
          icon="chevd"
          label={t('screens.voice.stage.minimise')}
          onPress={onMinimise}
          filled
        />
      ) : (
        <View />
      )}
      {onSwitchToChat ? (
        <Button
          iconOnly
          icon="chat"
          label={t('screens.voice.to-chat')}
          onPress={onSwitchToChat}
          filled
        />
      ) : null}
    </View>
  );
}

export function WaitingCard({ reason, onAnswer, onDismiss }: WaitingCardProps) {
  const { t } = useTranslation();
  return (
    <View
      accessibilityLiveRegion="polite"
      className="bg-surface rounded-media mt-4 w-full flex-row items-center gap-3 p-3">
      <View className="min-w-0 flex-1">
        <Text variant="label">{t('screens.voice.waiting-title')}</Text>
        <Text variant="rowMeta" tone="2" numberOfLines={2}>
          {reason}
        </Text>
      </View>
      {onDismiss ? (
        <Button
          label={t('screens.voice.waiting-dismiss')}
          onPress={onDismiss}
          compact
          variant="ghost"
        />
      ) : null}
      {onAnswer ? (
        <Button
          label={t('screens.voice.waiting-answer')}
          onPress={onAnswer}
          compact
          variant="primary"
        />
      ) : null}
    </View>
  );
}

export function EndedSummary({ actions }: { actions: readonly VoiceActionRecord[] }) {
  const copy = useTranslation();
  const done = endedSummaryOf(actions);
  if (done.length === 0) return null;
  return (
    <View className="bg-surface border-line rounded-media mt-6 w-full border py-1">
      {done.map((action, index) => (
        <View
          key={action.id}
          className={
            index > 0
              ? 'border-line flex-row items-center gap-3 border-t px-4 py-3'
              : 'flex-row items-center gap-3 px-4 py-3'
          }>
          <Icon name="check" size="small" tone="accent" />
          <Text variant="label" numberOfLines={2}>
            {voiceActionLabel(action, copy)}
          </Text>
        </View>
      ))}
    </View>
  );
}
