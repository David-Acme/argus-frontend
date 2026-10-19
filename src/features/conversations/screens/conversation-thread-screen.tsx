import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef } from 'react';
import { ScrollView, View } from 'react-native';
import { validCounterpartId } from '@/core/services/conversation';
import { AppScreen, ScreenHeader } from '@/shared/components/layout';
import { AdaptiveMenu } from '@/shared/components/ui/adaptive-menu';
import { Button } from '@/shared/components/ui/button';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Icon } from '@/shared/components/ui/icon';
import { IconButton } from '@/shared/components/ui/icon-button';
import { Text } from '@/shared/components/ui/text';
import { CAPABILITY } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useNow } from '@/shared/hooks/use-now';
import { useTranslation } from '@/shared/hooks/use-translation';
import { ConversationDay } from '@/features/conversations/components/conversation-day';
import { useConversationThread } from '@/features/conversations/hooks/use-conversation-thread';
import { dayKindOf, groupByDay, replyBodies } from '@/features/conversations/model/conversation-thread';

type ThreadBodyProps = {
  counterpartId: number;
};

type ThreadHintProps = {
  name: string;
  argus: boolean;
};

function ThreadHint({ name, argus }: ThreadHintProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { has } = useCapabilities();

  return (
    <View className="bg-surface-secondary mt-3 flex-row items-center gap-3 rounded-2xl px-4 py-3">
      <Icon name="mic" className="text-foreground-secondary size-5" />
      <Text variant="caption" className="text-foreground-secondary min-w-0 flex-1">
        {argus ? t('screens.conversations.argus-hint') : t('screens.conversations.thread-hint', { name })}
      </Text>
      {has(CAPABILITY.assistantVoice) ? (
        <Button size="sm" variant="outline" onPress={() => router.push('/call')}>
          <Text>{t('screens.home.talk')}</Text>
        </Button>
      ) : null}
    </View>
  );
}

function ThreadBody({ counterpartId }: ThreadBodyProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const date = useDateFormatter();
  const now = useNow(60000);
  const scroll = useRef<ScrollView>(null);
  const { messages, name, argus, clear } = useConversationThread(counterpartId);
  const days = useMemo(
    () => groupByDay(messages, (at) => date.startOfDay(new Date(at)).getTime()),
    [date, messages]
  );
  const bodies = useMemo(() => replyBodies(messages), [messages]);
  const today = date.startOfDay(new Date(now));
  const todayStart = today.getTime();
  const yesterdayStart = date.addDays(today, -1).getTime();

  const dayLabel = (day: number): string => {
    const kind = dayKindOf(day, todayStart, yesterdayStart);
    if (kind === 'today') return t('screens.conversations.today');
    if (kind === 'yesterday') return t('screens.conversations.yesterday');
    return date.formatFullDate(new Date(day));
  };

  const onClear = async () => {
    if (await clear()) router.replace('/conversations');
  };

  return (
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
                options={[{ value: 'clear' as const, label: t('screens.conversations.clear'), icon: 'trash', destructive: true }]}
                onSelect={() => void onClear()}
                title={name}
                closeLabel={t('common.close')}
                trigger={<IconButton icon="more-horizontal" label={t('screens.conversations.actions')} />}
              />
            ) : null
          }
        />
      }>
      {messages.length === 0 ? (
        <EmptyState
          icon="messages-square"
          title={t('screens.conversations.thread-empty')}
          hint={argus ? t('screens.conversations.argus-hint') : t('screens.conversations.empty-hint')}
        />
      ) : (
        <ScrollView
          ref={scroll}
          className="flex-1"
          contentContainerClassName="gap-5 pb-2"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
          {days.map((group) => (
            <ConversationDay key={group.day} label={dayLabel(group.day)} messages={group.messages} bodies={bodies} />
          ))}
        </ScrollView>
      )}
      <ThreadHint name={name} argus={argus} />
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
        bottomNav={false}
        header={<ScreenHeader title={t('screens.conversations.title')} onBack={() => router.replace('/conversations')} />}>
        <EmptyState icon="messages-square" title={t('screens.conversations.thread-empty')} />
      </AppScreen>
    );
  }

  return <ThreadBody key={counterpartId} counterpartId={counterpartId} />;
}
