import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef } from 'react';
import { ScrollView } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { validCounterpartId } from '@/core/services/conversation';
import { AppScreen, ScreenHeader } from '@/shared/components/layout';
import { AdaptiveMenu } from '@/shared/components/ui/adaptive-menu';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { IconButton } from '@/shared/components/ui/icon-button';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useNow } from '@/shared/hooks/use-now';
import { useTranslation } from '@/shared/hooks/use-translation';
import type { AssistantMode } from '@/core/types';
import { ASSISTANT_CALL_HREF, IS_NATIVE } from '@/shared/constants';
import { useAssistantChat } from '@/features/voice';
import { AssistantComposer } from '@/features/conversations/components/assistant-composer';
import { TypingIndicator } from '@/features/conversations/components/typing-indicator';
import { useAssistantMode } from '@/features/conversations/hooks/use-assistant-mode';
import { chatOverlay } from '@/features/conversations/model/assistant-chat-overlay';
import { ConversationDay } from '@/features/conversations/components/conversation-day';
import { MessageComposer } from '@/features/conversations/components/message-composer';
import { useConversationThread } from '@/features/conversations/hooks/use-conversation-thread';
import {
  dayKindOf,
  groupByDay,
  replyBodies,
} from '@/features/conversations/model/conversation-thread';

type ThreadBodyProps = {
  counterpartId: number;
};

const CHAT_CLOCK_SKEW_MS = 5 * 60 * 1000;

function ThreadBody({ counterpartId }: ThreadBodyProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const date = useDateFormatter();
  const now = useNow(60000);
  const scroll = useRef<ScrollView>(null);
  const { messages, name, argus, clear, send } = useConversationThread(counterpartId);
  const assistant = useAssistantMode();
  const chat = useAssistantChat(argus && assistant.mode === 'chat');
  const overlay = useMemo(
    () =>
      chatOverlay({
        messages,
        entries: argus ? chat.entries : [],
        leg: IS_NATIVE ? 'phone' : 'laptop',
        skewMs: CHAT_CLOCK_SKEW_MS,
      }),
    [argus, chat.entries, messages]
  );
  const rows = overlay.rows;
  const days = useMemo(
    () => groupByDay(rows, (at) => date.startOfDay(new Date(at)).getTime()),
    [date, rows]
  );
  const bodies = useMemo(() => replyBodies(rows), [rows]);
  const emptyHint = !argus
    ? t('screens.conversations.empty-hint')
    : assistant.mode === 'chat'
      ? t('screens.conversations.chat.empty-hint')
      : t('screens.conversations.argus-hint');
  const today = date.startOfDay(new Date(now));
  const todayStart = today.getTime();
  const yesterdayStart = date.addDays(today, -1).getTime();

  const dayLabel = (day: number): string => {
    const kind = dayKindOf(day, todayStart, yesterdayStart);
    if (kind === 'today') return t('screens.conversations.today');
    if (kind === 'yesterday') return t('screens.conversations.yesterday');
    return date.formatFullDate(new Date(day));
  };

  const chooseMode = (mode: AssistantMode) => {
    assistant.choose(mode);
    if (mode === 'voice') router.push(ASSISTANT_CALL_HREF);
  };

  const onClear = async () => {
    if (await clear()) router.replace('/conversations');
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <AppScreen
        scrollable={false}
        bottomNav={false}
        header={
          <ScreenHeader
            title={name}
            subtitle={t('screens.conversations.back')}
            onBack={() => (router.canGoBack() ? router.back() : router.replace('/conversations'))}
            action={
              messages.length > 0 ? (
                <AdaptiveMenu
                  options={[
                    {
                      value: 'clear' as const,
                      label: t('screens.conversations.clear'),
                      icon: 'trash',
                      destructive: true,
                    },
                  ]}
                  onSelect={() => void onClear()}
                  title={name}
                  closeLabel={t('common.close')}
                  trigger={
                    <IconButton icon="more-horizontal" label={t('screens.conversations.actions')} />
                  }
                />
              ) : null
            }
          />
        }>
        {rows.length === 0 ? (
          <EmptyState
            icon="messages-square"
            title={t('screens.conversations.thread-empty')}
            hint={emptyHint}
          />
        ) : (
          <ScrollView
            ref={scroll}
            className="flex-1"
            contentContainerClassName="gap-5 pb-2"
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
            {days.map((group) => (
              <ConversationDay
                key={group.day}
                label={dayLabel(group.day)}
                messages={group.messages}
                bodies={bodies}
                marks={overlay.marks}
                onRetry={chat.retry}
                onDismiss={chat.dismiss}
              />
            ))}
            {overlay.typing ? <TypingIndicator /> : null}
          </ScrollView>
        )}
        {argus ? (
          <AssistantComposer
            name={name}
            mode={assistant.mode}
            modes={assistant.modes}
            onChoose={chooseMode}
            onSend={(text) => chat.send(text) === 'sent'}
            busy={chat.busy}
            initialDraft={chat.draft}
            onDraft={chat.setDraft}
          />
        ) : (
          <MessageComposer name={name} argus={false} onSend={send} />
        )}
      </AppScreen>
    </KeyboardAvoidingView>
  );
}

export default function ConversationThreadScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const counterpartId = validCounterpartId(id);

  if (counterpartId === null) {
    return (
      <AppScreen
        bottomNav={false}
        header={
          <ScreenHeader
            title={t('screens.conversations.title')}
            onBack={() => router.replace('/conversations')}
          />
        }>
        <EmptyState icon="messages-square" title={t('screens.conversations.thread-empty')} />
      </AppScreen>
    );
  }

  return <ThreadBody key={counterpartId} counterpartId={counterpartId} />;
}
