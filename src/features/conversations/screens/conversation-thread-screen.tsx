import { useLocalSearchParams, useRouter } from 'expo-router';
import { validCounterpartId } from '@/core/services/conversation';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowLayout } from '@/shared/theme';
import { Notice } from '@/shared/ui/notice';
import { Screen } from '@/shared/ui/screen';
import { ArgusThread } from '@/features/conversations/components/argus-thread';
import { ConversationDesk } from '@/features/conversations/components/conversation-desk';
import { MemberThread } from '@/features/conversations/components/member-thread';
import { CONVERSATIONS_HREF } from '@/features/conversations/constants/conversation.constant';
import { useConversationThread } from '@/features/conversations/hooks/use-conversation-thread';
import { conversationLayoutOf } from '@/features/conversations/model/conversation-layout';

type PhoneThreadProps = { counterpartId: number };

function PhoneThread({ counterpartId }: PhoneThreadProps) {
  const thread = useConversationThread(counterpartId);
  if (thread.argus) return <ArgusThread thread={thread} desktop={false} />;
  return <MemberThread thread={thread} desktop={false} />;
}

function MissingThread() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <Screen
      title={t('screens.conversations.title')}
      back={{
        label: t('screens.conversations.back'),
        onPress: () => router.replace(CONVERSATIONS_HREF),
      }}>
      <Notice centred icon="chat" title={t('screens.conversations.thread-empty')} />
    </Screen>
  );
}

export default function ConversationThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { windowClass } = useWindowLayout();
  const counterpartId = validCounterpartId(id);
  if (counterpartId === null) return <MissingThread />;
  if (conversationLayoutOf(windowClass) === 'desk')
    return <ConversationDesk key={counterpartId} counterpartId={counterpartId} />;
  return <PhoneThread key={counterpartId} counterpartId={counterpartId} />;
}
