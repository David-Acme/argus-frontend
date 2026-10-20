import { useState } from 'react';
import {
  Pressable,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from 'react-native';
import type { AssistantMode } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { SegmentedControl } from '@/shared/components/ui/segmented-control';
import { Text } from '@/shared/components/ui/text';
import { Textarea } from '@/shared/components/ui/textarea';
import { IS_WEB } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { ASSISTANT_CHAT_MAX_CHARS } from '@/features/voice';
import { MessageComposer } from '@/features/conversations/components/message-composer';
import {
  charactersOf,
  sendableMessage,
  submitsOnEnter,
} from '@/features/conversations/model/composer';

type AssistantComposerProps = {
  name: string;
  mode: AssistantMode | null;
  modes: readonly AssistantMode[];
  onChoose: (mode: AssistantMode) => void;
  onSend: (text: string) => boolean;
  busy: boolean;
  initialDraft: string;
  onDraft: (draft: string) => void;
};

type ChatComposerProps = {
  onSend: (text: string) => boolean;
  busy: boolean;
  initialDraft: string;
  onDraft: (draft: string) => void;
};

type WebKeyEvent = {
  key: string;
  shiftKey?: boolean;
  isComposing?: boolean;
};

const COUNTER_FROM = ASSISTANT_CHAT_MAX_CHARS - 100;

export function AssistantComposer({
  name,
  mode,
  modes,
  onChoose,
  onSend,
  busy,
  initialDraft,
  onDraft,
}: AssistantComposerProps) {
  const { t } = useTranslation();
  const options = modes.map((value) => ({
    value,
    label: t(
      value === 'voice' ? 'screens.conversations.chat.voice' : 'screens.conversations.chat.chat'
    ),
    icon: value === 'voice' ? ('mic' as const) : ('messages-square' as const),
  }));

  return (
    <View className="mt-3 gap-2">
      {mode !== null && modes.length > 1 ? (
        <View className="w-full max-w-xs self-center">
          <SegmentedControl
            options={options}
            value={mode}
            onChange={onChoose}
            accessibilityLabel={t('screens.conversations.chat.mode-label')}
          />
        </View>
      ) : null}
      {mode === 'chat' ? (
        <ChatComposer onSend={onSend} busy={busy} initialDraft={initialDraft} onDraft={onDraft} />
      ) : (
        <MessageComposer name={name} argus onSend={() => Promise.resolve(false)} className="mt-0" />
      )}
    </View>
  );
}

function ChatComposer({ onSend, busy, initialDraft, onDraft }: ChatComposerProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(initialDraft);
  const body = sendableMessage(draft, ASSISTANT_CHAT_MAX_CHARS);
  const characters = charactersOf(draft);
  const blocked = body === null || busy;

  const change = (next: string) => {
    setDraft(next);
    onDraft(next);
  };

  const send = () => {
    if (body === null || busy) return;
    if (onSend(body)) change('');
  };

  const onKeyPress = (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (!submitsOnEnter(IS_WEB, event.nativeEvent as WebKeyEvent)) return;
    event.preventDefault();
    send();
  };

  return (
    <View className="gap-1.5">
      <View className="flex-row items-end gap-2">
        <Textarea
          value={draft}
          onChangeText={change}
          onKeyPress={onKeyPress}
          placeholder={t('screens.conversations.chat.placeholder')}
          accessibilityLabel={t('screens.conversations.chat.label')}
          className="max-h-32 min-h-11 min-w-0 flex-1 rounded-3xl px-4"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('screens.conversations.chat.send')}
          accessibilityState={{ disabled: blocked, busy }}
          disabled={blocked}
          onPress={send}
          hitSlop={4}
          className={cn(
            'bg-interactive size-11 items-center justify-center rounded-full active:opacity-80',
            blocked && 'opacity-40'
          )}>
          <Icon name="send" className="text-foreground-on-interactive size-5" />
        </Pressable>
      </View>
      <View className="flex-row items-start gap-2 px-1">
        <Text variant="caption" className="text-foreground-secondary min-w-0 flex-1">
          {t('screens.conversations.chat.note')}
        </Text>
        {characters > COUNTER_FROM ? (
          <Text
            variant="micro"
            className={characters > ASSISTANT_CHAT_MAX_CHARS ? 'text-error-strong' : undefined}>
            {t('screens.conversations.composer.count', {
              count: String(characters),
              max: String(ASSISTANT_CHAT_MAX_CHARS),
            })}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
