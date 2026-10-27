import { useRouter } from 'expo-router';
import { useNow } from '@/shared/hooks/use-now';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowLayout } from '@/shared/theme';
import { Screen } from '@/shared/ui/screen';
import { ConversationDesk } from '@/features/conversations/components/conversation-desk';
import { ConversationList } from '@/features/conversations/components/conversation-list';
import { CONVERSATIONS_HREF } from '@/features/conversations/constants/conversation.constant';
import { useConversations } from '@/features/conversations/hooks/use-conversations';
import { conversationLayoutOf } from '@/features/conversations/model/conversation-layout';

const MINUTE_MS = 60_000;

function ConversationsList() {
  const router = useRouter();
  const { t } = useTranslation();
  const now = useNow(MINUTE_MS);
  const summaries = useConversations();
  return (
    <Screen
      title={t('screens.conversations.title')}
      back={
        router.canGoBack()
          ? { label: t('screens.conversations.back'), onPress: () => router.back() }
          : undefined
      }>
      <ConversationList
        summaries={summaries}
        now={now}
        selected={null}
        onOpen={(id) => router.push(`${CONVERSATIONS_HREF}/${id}`)}
      />
    </Screen>
  );
}

export default function ConversationsScreen() {
  const { windowClass } = useWindowLayout();
  if (conversationLayoutOf(windowClass) === 'desk') return <ConversationDesk counterpartId={0} />;
  return <ConversationsList />;
}
