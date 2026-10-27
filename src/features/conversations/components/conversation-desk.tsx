import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useNow } from '@/shared/hooks/use-now';
import { useTranslation } from '@/shared/hooks/use-translation';
import { size } from '@/shared/theme';
import { Screen, ScreenColumn, ScreenColumns } from '@/shared/ui/screen';
import { Section } from '@/shared/ui/section';
import { ArgusThread } from '@/features/conversations/components/argus-thread';
import { ContextPanel } from '@/features/conversations/components/context-panel';
import { ConversationList } from '@/features/conversations/components/conversation-list';
import { MemberThread } from '@/features/conversations/components/member-thread';
import { CONVERSATIONS_HREF } from '@/features/conversations/constants/conversation.constant';
import { useConversationThread } from '@/features/conversations/hooks/use-conversation-thread';
import { useConversations } from '@/features/conversations/hooks/use-conversations';
import { useSpaceToTalk } from '@/features/conversations/hooks/use-space-to-talk';

export type ConversationDeskProps = { counterpartId: number };

const MINUTE_MS = 60_000;

export function ConversationDesk({ counterpartId }: ConversationDeskProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const now = useNow(MINUTE_MS);
  const summaries = useConversations();
  const thread = useConversationThread(counterpartId);
  useSpaceToTalk(thread.argus);

  const open = (id: number) => {
    if (id !== counterpartId) router.replace(`${CONVERSATIONS_HREF}/${id}`);
  };

  return (
    <Screen columns>
      <ScreenColumns>
        <ScreenColumn width={size.columnAside} label={t('screens.conversations.title')}>
          <Section title={t('screens.conversations.title')} variant="plain">
            <ConversationList
              summaries={summaries}
              now={now}
              selected={counterpartId}
              onOpen={open}
            />
          </Section>
        </ScreenColumn>
        <View className="border-line min-w-0 flex-1 border-x">
          {thread.argus ? (
            <ArgusThread key={counterpartId} thread={thread} desktop />
          ) : (
            <MemberThread key={counterpartId} thread={thread} desktop />
          )}
        </View>
        {thread.argus ? (
          <ScreenColumn width={size.columnContext} label={t('screens.conversations.context.label')}>
            <ContextPanel />
          </ScreenColumn>
        ) : null}
      </ScreenColumns>
    </Screen>
  );
}
