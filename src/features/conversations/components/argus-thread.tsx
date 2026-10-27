import { useRouter } from 'expo-router';
import { ASSISTANT_CALL_HREF, CAPABILITY } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import {
  ArgusResultCard,
  argusCallSupported,
  liveCameraResultId,
  useResultActions,
} from '@/features/voice';
import type { ArgusResult } from '@/features/voice';
import { ArgusComposer } from '@/features/conversations/components/argus-composer';
import { ArgusEmpty } from '@/features/conversations/components/argus-empty';
import { SuggestionChips } from '@/features/conversations/components/suggestion-chips';
import { TalkNotice } from '@/features/conversations/components/talk-notice';
import { ArgusHeader } from '@/features/conversations/components/thread-header';
import { ThreadFrame } from '@/features/conversations/components/thread-frame';
import { ThreadList } from '@/features/conversations/components/thread-list';
import { CONVERSATIONS_HREF } from '@/features/conversations/constants/conversation.constant';
import { useArgusThread } from '@/features/conversations/hooks/use-argus-thread';
import type { ConversationThread } from '@/features/conversations/hooks/use-conversation-thread';
import { useThreadDays } from '@/features/conversations/hooks/use-thread-days';
import { replyBodies } from '@/features/conversations/model/conversation-thread';

export type ArgusThreadProps = { thread: ConversationThread; desktop: boolean };

export function ArgusThread({ thread, desktop }: ArgusThreadProps) {
  const router = useRouter();
  const { has } = useCapabilities();
  const state = useArgusThread(thread);
  const actions = useResultActions('chat');
  const days = useThreadDays(state.now);
  const rows = state.overlay.rows;
  const liveId = liveCameraResultId(state.results);
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
      desktop={desktop}
      onBack={!desktop && router.canGoBack() ? () => router.back() : null}
      onConversations={desktop ? null : () => router.push(CONVERSATIONS_HREF)}
      onCall={calls ? () => router.push(ASSISTANT_CALL_HREF) : null}
      onClear={thread.messages.length > 0 ? () => void thread.clear() : null}
    />
  );

  const composer = (
    <>
      {state.failure ? <TalkNotice failure={state.failure} onAllow={state.allowMic} /> : null}
      {empty ? null : <SuggestionChips suggestions={state.suggestions} onPick={state.pick} />}
      <ArgusComposer
        key={state.draftVersion}
        talk={state.talk}
        heard={state.heard}
        busy={state.chat.busy}
        readDraft={state.chat.readDraft}
        onDraft={state.chat.setDraft}
        onSend={state.send}
      />
    </>
  );

  return (
    <ThreadFrame phone={!desktop} header={header} composer={composer}>
      {empty ? (
        <ArgusEmpty suggestions={state.suggestions} onPick={state.pick} />
      ) : (
        <ThreadList
          rows={rows}
          bodies={replyBodies(rows)}
          paging={thread}
          days={days}
          chat={{
            typing: state.typing,
            marks: state.overlay.marks,
            onRetry: state.chat.retry,
            onDismiss: state.chat.dismiss,
          }}
          argus={{ results: state.anchored, newestIn: state.newestIn, renderResult }}
        />
      )}
    </ThreadFrame>
  );
}
