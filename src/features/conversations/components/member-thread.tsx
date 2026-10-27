import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useNow } from '@/shared/hooks/use-now';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Notice } from '@/shared/ui/notice';
import { MessageComposer } from '@/features/conversations/components/message-composer';
import { MemberHeader } from '@/features/conversations/components/thread-header';
import { ThreadFrame } from '@/features/conversations/components/thread-frame';
import { ThreadList } from '@/features/conversations/components/thread-list';
import { CONVERSATIONS_HREF } from '@/features/conversations/constants/conversation.constant';
import type { ConversationThread } from '@/features/conversations/hooks/use-conversation-thread';
import { useThreadDays } from '@/features/conversations/hooks/use-thread-days';
import type { ChatMark } from '@/features/conversations/model/assistant-chat-overlay';
import { replyBodies } from '@/features/conversations/model/conversation-thread';

export type MemberThreadProps = { thread: ConversationThread; desktop: boolean };

const MINUTE_MS = 60_000;

const NO_MARKS: ReadonlyMap<string, ChatMark> = new Map();

export function MemberThread({ thread, desktop }: MemberThreadProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const now = useNow(MINUTE_MS);
  const days = useThreadDays(now);
  const rows = thread.messages;

  const clear = async () => {
    if (await thread.clear()) router.replace(CONVERSATIONS_HREF);
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace(CONVERSATIONS_HREF));

  return (
    <ThreadFrame
      phone={!desktop}
      header={
        <MemberHeader
          name={thread.name}
          onBack={desktop ? null : back}
          onClear={rows.length > 0 ? () => void clear() : null}
        />
      }
      composer={<MessageComposer name={thread.name} onSend={thread.send} />}>
      {thread.loaded && rows.length === 0 ? (
        <View className="flex-1 justify-center">
          <Notice
            centred
            icon="chat"
            title={t('screens.conversations.thread-empty')}
            body={t('screens.conversations.empty-hint')}
          />
        </View>
      ) : (
        <ThreadList
          rows={rows}
          bodies={replyBodies(rows)}
          paging={thread}
          days={days}
          chat={{ typing: false, marks: NO_MARKS }}
          argus={null}
        />
      )}
    </ThreadFrame>
  );
}
