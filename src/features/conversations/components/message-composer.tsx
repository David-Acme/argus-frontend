import { View } from 'react-native';
import { CONVERSATION_MESSAGE_MAX_CHARS } from '@/core/services/conversation';
import { CAPABILITY } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Text } from '@/shared/ui/text';
import { ThreadComposer } from '@/features/conversations/components/thread-composer';
import { useTypingSignal } from '@/features/conversations/hooks/use-typing-signal';
import type { RecordedNote } from '@/features/conversations/model/voice-note';

export type MessageComposerProps = {
  counterpartId: number;
  name: string;
  onSend: (body: string) => Promise<boolean>;
  onNote: (note: RecordedNote) => void;
};

const EMPTY_DRAFT = (): string => '';

export function MessageComposer({ counterpartId, name, onSend, onNote }: MessageComposerProps) {
  const { t } = useTranslation();
  const { has } = useCapabilities();
  const typing = has(CAPABILITY.messagesRelay);
  const signal = useTypingSignal(counterpartId, typing);

  const send = (body: string) => {
    signal.stop();
    return onSend(body);
  };

  if (!typing)
    return (
      <View className="px-1">
        <Text variant="caption" tone="2">
          {t('screens.conversations.composer.ask-argus', { name })}
        </Text>
      </View>
    );
  return (
    <ThreadComposer
      placeholder={t('screens.conversations.composer.placeholder', { name })}
      sendLabel={t('screens.conversations.composer.send', { name })}
      maxChars={CONVERSATION_MESSAGE_MAX_CHARS}
      readDraft={EMPTY_DRAFT}
      onDraft={signal.onDraft}
      onSend={send}
      onNote={(note) => {
        signal.stop();
        onNote(note);
      }}
      busy={false}
    />
  );
}
