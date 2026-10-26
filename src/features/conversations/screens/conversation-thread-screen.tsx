import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { ThreadList } from '@/features/conversations/components/thread-list';
import { useAssistantMode } from '@/features/conversations/hooks/use-assistant-mode';
import { chatOverlay } from '@/features/conversations/model/assistant-chat-overlay';
import { MessageComposer } from '@/features/conversations/components/message-composer';
import { useConversationThread } from '@/features/conversations/hooks/use-conversation-thread';
import { dayKindOf, replyBodies } from '@/features/conversations/model/conversation-thread';
import { keyboardOffsets } from '@/features/conversations/model/thread-list';

type ThreadBodyProps = {
  counterpartId: number;
};

const CHAT_CLOCK_SKEW_MS = 5 * 60 * 1000;

const COMPOSER_ABOVE_LIST: ViewStyle = { zIndex: 1 };

const LIST_HREF = '/conversations';

const HOME_HREF = '/';

function ThreadBody({ counterpartId }: ThreadBodyProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const date = useDateFormatter();
  const now = useNow(60000);
  const insets = useSafeAreaInsets();
  const thread = useConversationThread(counterpartId);
  const { messages, name, argus, clear, send } = thread;
  const assistant = useAssistantMode();
  const chat = useAssistantChat(argus && assistant.mode === 'chat');
  const overlay = useMemo(
    () =>
      chatOverlay({
        messages,
        entries: argus && thread.live ? chat.entries : [],
        leg: IS_NATIVE ? 'phone' : 'laptop',
        skewMs: CHAT_CLOCK_SKEW_MS,
      }),
    [argus, chat.entries, messages, thread.live]
  );
  const rows = overlay.rows;
  const startOfDay = useCallback((at: number) => date.startOfDay(new Date(at)).getTime(), [date]);
  const bodies = useMemo(() => replyBodies(rows), [rows]);
  const emptyHint = !argus
    ? t('screens.conversations.empty-hint')
    : assistant.mode === 'chat'
      ? t('screens.conversations.chat.empty-hint')
      : t('screens.conversations.argus-hint');
  const today = date.startOfDay(new Date(now));
  const todayStart = today.getTime();
  const yesterdayStart = date.addDays(today, -1).getTime();

  const dayLabel = useCallback(
    (day: number): string => {
      const kind = dayKindOf(day, todayStart, yesterdayStart);
      if (kind === 'today') return t('screens.conversations.today');
      if (kind === 'yesterday') return t('screens.conversations.yesterday');
      return date.formatFullDate(new Date(day));
    },
    [date, t, todayStart, yesterdayStart]
  );

  const chooseMode = (mode: AssistantMode) => {
    assistant.choose(mode);
    if (mode === 'voice') router.push(ASSISTANT_CALL_HREF);
  };

  const onClear = async () => {
    if (await clear()) router.replace(LIST_HREF);
  };

  return (
    <AppScreen
      scrollable={false}
      header={
        <ScreenHeader
          title={name}
          subtitle={t('screens.conversations.back')}
          onBack={() =>
            router.canGoBack() ? router.back() : router.replace(argus ? HOME_HREF : LIST_HREF)
          }
          action={
            <View className="flex-row items-center gap-2">
              {argus ? (
                <IconButton
                  icon="messages-square"
                  label={t('screens.conversations.title')}
                  onPress={() => router.push(LIST_HREF)}
                />
              ) : null}
              {messages.length > 0 ? (
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
              ) : null}
            </View>
          }
        />
      }>
      {!thread.loaded ? (
        <View className="min-h-0 flex-1" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="messages-square"
          title={t('screens.conversations.thread-empty')}
          hint={emptyHint}
        />
      ) : (
        <ThreadList
          rows={rows}
          live={thread.live}
          newest={thread.newest}
          hasOlder={thread.hasOlder}
          loadOlder={thread.loadOlder}
          loadNewer={thread.loadNewer}
          toLatest={thread.toLatest}
          startOfDay={startOfDay}
          dayLabel={dayLabel}
          typing={overlay.typing}
          bodies={bodies}
          marks={overlay.marks}
          onRetry={chat.retry}
          onDismiss={chat.dismiss}
        />
      )}
      <KeyboardStickyView
        offset={keyboardOffsets(insets.bottom).sticky}
        style={COMPOSER_ABOVE_LIST}>
        <View className="bg-background">
          {argus ? (
            <AssistantComposer
              name={name}
              mode={assistant.mode}
              modes={assistant.modes}
              onChoose={chooseMode}
              onSend={(text) => {
                if (!thread.live) thread.toLatest();
                return chat.send(text) === 'sent';
              }}
              busy={chat.busy}
              readDraft={chat.readDraft}
              onDraft={chat.setDraft}
            />
          ) : (
            <MessageComposer name={name} argus={false} onSend={send} />
          )}
        </View>
      </KeyboardStickyView>
    </AppScreen>
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
        header={
          <ScreenHeader
            title={t('screens.conversations.title')}
            onBack={() => router.replace(LIST_HREF)}
          />
        }>
        <EmptyState icon="messages-square" title={t('screens.conversations.thread-empty')} />
      </AppScreen>
    );
  }

  return <ThreadBody key={counterpartId} counterpartId={counterpartId} />;
}
