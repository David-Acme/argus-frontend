import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ASSISTANT_CALL_HREF, CAPABILITY } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import type { MenuItem } from '@/shared/ui/menu';
import {
  ArgusResultCard,
  argusCallSupported,
  liveCameraResultId,
  useResultActions,
} from '@/features/voice';
import type { ArgusResult } from '@/features/voice';
import { ArgusComposer } from '@/features/conversations/components/argus-composer';
import { ArgusEmpty } from '@/features/conversations/components/argus-empty';
import { ArgusInfo } from '@/features/conversations/components/argus-info';
import { TalkNotice } from '@/features/conversations/components/talk-notice';
import { ArgusHeader } from '@/features/conversations/components/thread-header';
import { ThreadFrame } from '@/features/conversations/components/thread-frame';
import { ThreadList } from '@/features/conversations/components/thread-list';
import { ThreadSearch } from '@/features/conversations/components/thread-search';
import { CONVERSATIONS_HREF } from '@/features/conversations/constants/conversation.constant';
import { useArgusThread } from '@/features/conversations/hooks/use-argus-thread';
import type { ArgusThreadState } from '@/features/conversations/hooks/use-argus-thread';
import type { ConversationThread } from '@/features/conversations/hooks/use-conversation-thread';
import { useThreadDays } from '@/features/conversations/hooks/use-thread-days';
import { useThreadMenu } from '@/features/conversations/hooks/use-thread-menu';
import { replyBodies } from '@/features/conversations/model/conversation-thread';
import { streamingResultId } from '@/features/conversations/model/thread-results';

export type ArgusThreadProps = { thread: ConversationThread; desktop: boolean };

type ComposerAreaProps = { state: ArgusThreadState };

function ThreadComposerArea({ state }: ComposerAreaProps) {
  return (
    <>
      {state.failure ? <TalkNotice failure={state.failure} onAllow={state.allowMic} /> : null}
      <ArgusComposer
        talk={state.talk}
        heard={state.heard}
        busy={state.chat.busy}
        readDraft={state.chat.readDraft}
        onDraft={state.chat.setDraft}
        onSend={state.send}
        onNote={state.sendNote}
      />
    </>
  );
}

function useArgusMenu(
  thread: ConversationThread,
  desktop: boolean,
  onSearch: () => void
): MenuItem[] {
  const router = useRouter();
  const { t } = useTranslation();
  const list: MenuItem = {
    label: t('screens.conversations.see-list'),
    icon: 'chat',
    family: 'view',
    onPress: () => router.push(CONVERSATIONS_HREF),
  };
  return useThreadMenu({
    lead: desktop ? [] : [list],
    clearable: thread.messages.length > 0,
    clearWords: thread.clearWords,
    onSearch,
    onClear: () => thread.clear(),
  });
}

export function ArgusThread({ thread, desktop }: ArgusThreadProps) {
  const router = useRouter();
  const { has } = useCapabilities();
  const state = useArgusThread(thread);
  const actions = useResultActions('chat');
  const days = useThreadDays(state.now);
  const [sheet, setSheet] = useState<'info' | 'search' | null>(null);
  const menu = useArgusMenu(thread, desktop, () => setSheet('search'));
  const rows = state.overlay.rows;
  const liveId = streamingResultId(
    state.anchored,
    state.newestIn,
    liveCameraResultId(state.results)
  );
  const calls = has(CAPABILITY.assistantVoice) && argusCallSupported();
  const empty = thread.loaded && rows.length === 0 && !state.typing;

  const renderResult = (result: ArgusResult) => (
    <ArgusResultCard
      result={result}
      live={result.id === liveId}
      now={state.now}
      actions={actions}
    />
  );

  const header = (
    <ArgusHeader
      typing={state.typing}
      desktop={desktop}
      onBack={!desktop && router.canGoBack() ? () => router.back() : null}
      onInfo={desktop ? null : () => setSheet('info')}
      onCall={calls ? () => router.push(ASSISTANT_CALL_HREF) : null}
      menu={menu}
    />
  );

  return (
    <ThreadFrame phone={!desktop} header={header} composer={<ThreadComposerArea state={state} />}>
      {empty ? (
        <ArgusEmpty />
      ) : (
        <ThreadList
          rows={rows}
          bodies={replyBodies(rows)}
          paging={thread}
          days={days}
          chat={{
            typing: state.typing,
            marks: state.marks,
            typed: state.typed,
            onRetry: state.retry,
            onDismiss: state.dismiss,
          }}
          argus={{
            results: state.anchored,
            renderResult,
          }}
        />
      )}
      <ArgusInfo
        open={sheet === 'info'}
        onClose={() => setSheet(null)}
        onConversations={() => router.push(CONVERSATIONS_HREF)}
      />
      <ThreadSearch counterpartId={0} open={sheet === 'search'} onClose={() => setSheet(null)} />
    </ThreadFrame>
  );
}
