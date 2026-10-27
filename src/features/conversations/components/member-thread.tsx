import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useNow } from '@/shared/hooks/use-now';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Notice } from '@/shared/ui/notice';
import { MessageComposer } from '@/features/conversations/components/message-composer';
import { MemberHeader } from '@/features/conversations/components/thread-header';
import { ThreadFrame } from '@/features/conversations/components/thread-frame';
import { ThreadList } from '@/features/conversations/components/thread-list';
import { ThreadSearch } from '@/features/conversations/components/thread-search';
import { CONVERSATIONS_HREF } from '@/features/conversations/constants/conversation.constant';
import type { ConversationThread } from '@/features/conversations/hooks/use-conversation-thread';
import { useThreadDays } from '@/features/conversations/hooks/use-thread-days';
import { useThreadMenu } from '@/features/conversations/hooks/use-thread-menu';
import { useTyping } from '@/features/conversations/hooks/use-typing';
import { replyBodies } from '@/features/conversations/model/conversation-thread';

export type MemberThreadProps = { thread: ConversationThread; desktop: boolean };

const MINUTE_MS = 60_000;

export function MemberThread({ thread, desktop }: MemberThreadProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const now = useNow(MINUTE_MS);
  const days = useThreadDays(now);
  const typing = useTyping();
  const [searching, setSearching] = useState(false);
  const { outbox } = thread;
  const rows = [...thread.messages, ...outbox.failed];

  const clear = async () => {
    if (await thread.clear()) router.replace(CONVERSATIONS_HREF);
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace(CONVERSATIONS_HREF));

  const menu = useThreadMenu({
    lead: [],
    clearable: rows.length > 0,
    clearWords: thread.clearWords,
    onSearch: () => setSearching(true),
    onClear: clear,
  });

  return (
    <ThreadFrame
      phone={!desktop}
      header={
        <MemberHeader
          name={thread.name}
          typing={typing.typing.has(thread.counterpartId)}
          onBack={desktop ? null : back}
          menu={menu}
        />
      }
      composer={
        <MessageComposer
          counterpartId={thread.counterpartId}
          name={thread.name}
          onSend={outbox.send}
          onNote={(note) => void outbox.sendNote(note)}
        />
      }>
      {thread.loaded && rows.length === 0 ? (
        <View className="flex-1 justify-center">
          <Notice
            centred
            icon="chat"
            title={t('screens.conversations.thread-empty')}
            body={t('screens.conversations.composer.typed-note', { name: thread.name })}
          />
        </View>
      ) : (
        <ThreadList
          rows={rows}
          bodies={replyBodies(rows)}
          paging={thread}
          days={days}
          chat={{
            typing: false,
            marks: outbox.marks,
            typed: typing.typed,
            onRetry: outbox.retry,
            onDismiss: outbox.dismiss,
          }}
          argus={null}
        />
      )}
      <ThreadSearch
        counterpartId={thread.counterpartId}
        open={searching}
        onClose={() => setSearching(false)}
      />
    </ThreadFrame>
  );
}
