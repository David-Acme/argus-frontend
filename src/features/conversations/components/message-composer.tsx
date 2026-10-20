import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { CONVERSATION_MESSAGE_MAX_CHARS } from '@/core/services/conversation';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { Textarea } from '@/shared/components/ui/textarea';
import { CAPABILITY } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { voiceCallSupported } from '@/features/voice';
import { canType, charactersOf, composerMode, sendableMessage } from '@/features/conversations/model/composer';

type MessageComposerProps = {
  name: string;
  argus: boolean;
  onSend: (body: string) => Promise<boolean>;
  className?: string;
};

const COUNTER_FROM = CONVERSATION_MESSAGE_MAX_CHARS - 100;

export function MessageComposer({ name, argus, onSend, className }: MessageComposerProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { has } = useCapabilities();
  const [draft, setDraft] = useState('');
  const mode = composerMode({ argus, voiceAllowed: has(CAPABILITY.assistantVoice), voiceSupported: voiceCallSupported() });
  const typing = canType({ argus, relayAllowed: has(CAPABILITY.messagesRelay) });
  const voice = mode !== 'no-voice';
  const body = sendableMessage(draft, CONVERSATION_MESSAGE_MAX_CHARS);
  const characters = charactersOf(draft);
  const prompt =
    mode === 'argus-by-voice'
      ? t('screens.conversations.composer.argus-prompt')
      : t('screens.conversations.composer.relay-prompt', { name });
  const note = typing
    ? t('screens.conversations.composer.typed-note', { name })
    : argus
      ? voice
        ? t('screens.conversations.argus-hint')
        : t('screens.conversations.composer.argus-no-voice')
      : voice
        ? t('screens.conversations.composer.relay-voice-note', { name })
        : t('screens.conversations.composer.no-voice', { name });

  const talk = () => router.push('/call');

  const send = async () => {
    if (body === null) return;
    setDraft('');
    const sent = await onSend(body);
    if (!sent) setDraft((current) => (current.length === 0 ? body : current));
  };

  return (
    <View className={cn('mt-3 gap-1.5', className)}>
      {typing ? (
        <View className="flex-row items-end gap-2">
          <Textarea
            value={draft}
            onChangeText={setDraft}
            placeholder={t('screens.conversations.composer.placeholder', { name })}
            accessibilityLabel={t('screens.conversations.composer.label', { name })}
            className="max-h-32 min-h-11 min-w-0 flex-1 rounded-3xl px-4"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('screens.conversations.composer.send', { name })}
            accessibilityState={{ disabled: body === null }}
            disabled={body === null}
            onPress={() => void send()}
            hitSlop={4}
            className={cn(
              'bg-interactive size-11 items-center justify-center rounded-full active:opacity-80',
              body === null && 'opacity-40'
            )}>
            <Icon name="send" className="text-foreground-on-interactive size-5" />
          </Pressable>
          {voice ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('screens.conversations.composer.talk')}
              accessibilityHint={t('screens.conversations.composer.opens-call')}
              onPress={talk}
              hitSlop={4}
              className="bg-card border-border size-11 items-center justify-center rounded-full border active:opacity-70">
              <Icon name="mic" className="text-foreground size-5" />
            </Pressable>
          ) : null}
        </View>
      ) : voice ? (
        <View className="flex-row items-center gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={prompt}
            accessibilityHint={t('screens.conversations.composer.opens-call')}
            onPress={talk}
            className="bg-card border-border min-h-11 min-w-0 flex-1 flex-row items-center rounded-3xl border px-4 py-2 active:opacity-70">
            <Text variant="body" className="text-muted-foreground min-w-0 flex-1" numberOfLines={2}>
              {prompt}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('screens.conversations.composer.talk')}
            onPress={talk}
            hitSlop={4}
            className="bg-interactive size-11 items-center justify-center rounded-full active:opacity-80">
            <Icon name="mic" className="text-foreground-on-interactive size-5" />
          </Pressable>
        </View>
      ) : null}
      <View className="flex-row items-start gap-2 px-1">
        <Text variant="caption" className="text-foreground-secondary min-w-0 flex-1">
          {note}
        </Text>
        {typing && characters > COUNTER_FROM ? (
          <Text
            variant="micro"
            className={characters > CONVERSATION_MESSAGE_MAX_CHARS ? 'text-error-strong' : undefined}>
            {t('screens.conversations.composer.count', {
              count: String(characters),
              max: String(CONVERSATION_MESSAGE_MAX_CHARS),
            })}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
