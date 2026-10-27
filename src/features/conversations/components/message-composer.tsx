import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { CONVERSATION_MESSAGE_MAX_CHARS } from '@/core/services/conversation';
import { ASSISTANT_CALL_HREF, CAPABILITY } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { Text } from '@/shared/ui/text';
import { voiceCallSupported } from '@/features/voice';
import { charactersOf, sendableMessage, showsCounter } from '@/features/conversations/model/composer';

export type MessageComposerProps = {
  name: string;
  onSend: (body: string) => Promise<boolean>;
};

export function MessageComposer({ name, onSend }: MessageComposerProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { has } = useCapabilities();
  const [draft, setDraft] = useState('');
  const typing = has(CAPABILITY.messagesRelay);
  const voice = has(CAPABILITY.assistantVoice) && voiceCallSupported();
  const body = sendableMessage(draft, CONVERSATION_MESSAGE_MAX_CHARS);
  const characters = charactersOf(draft);

  const send = async () => {
    if (body === null) return;
    setDraft('');
    const sent = await onSend(body);
    if (!sent) setDraft((current) => (current.length === 0 ? body : current));
  };

  return (
    <View className="gap-1">
      {typing ? (
        <View className="flex-row items-end gap-2">
          <View className="min-w-0 flex-1">
            <Field
              kind="message"
              placeholder={t('screens.conversations.composer.placeholder', { name })}
              value={draft}
              onChangeText={setDraft}
              submit={{ key: 'done', onSubmit: () => void send() }}
            />
          </View>
          <Button
            iconOnly
            ink
            icon="send"
            label={t('screens.conversations.composer.send', { name })}
            onPress={send}
            disabled={body === null}
          />
          {voice ? (
            <Button
              iconOnly
              filled
              icon="mic"
              label={t('screens.conversations.composer.talk')}
              onPress={() => router.push(ASSISTANT_CALL_HREF)}
            />
          ) : null}
        </View>
      ) : null}
      <View className="flex-row items-start gap-2 px-1">
        <View className="min-w-0 flex-1">
          <Text variant="caption" tone="2">
            {typing
              ? t('screens.conversations.composer.typed-note', { name })
              : t('screens.conversations.composer.ask-argus', { name })}
          </Text>
        </View>
        {typing && showsCounter(characters, CONVERSATION_MESSAGE_MAX_CHARS) ? (
          <Text variant="caption" tone={characters > CONVERSATION_MESSAGE_MAX_CHARS ? 'alert' : '3'}>
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
