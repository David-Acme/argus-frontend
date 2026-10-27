import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { IConversationSummaryCacheRow } from '@/core/interfaces';
import { createDateFormatter } from '@/shared/hooks/use-date-formatter/date';
import { Text } from '@/shared/ui/text';
import type { ArgusResult } from '@/features/voice';
import '../../../shared/ui/translation-stub';
import { setWindowWidth } from '../../../shared/ui/window-width';

const calls: string[] = [];

const state: { id: string; results: ArgusResult[]; summaries: IConversationSummaryCacheRow[] } = {
  id: '0',
  results: [],
  summaries: [],
};

const NOW = Date.UTC(2026, 9, 26, 15, 0);

const summary = (
  counterpartId: number,
  name: string,
  body: string
): IConversationSummaryCacheRow => ({
  counterpartId,
  counterpartName: name,
  unread: counterpartId === 2 ? 3 : 0,
  last: {
    id: `m${counterpartId}`,
    counterpartId,
    counterpartName: name,
    direction: 'in',
    kind: counterpartId === 0 ? 'turn' : 'relay',
    body,
    leg: null,
    state: 'received',
    messageKey: `k${counterpartId}`,
    replyToKey: null,
    result: null,
    via: null,
    receipt: null,
    voiceNote: null,
    isRead: false,
    createdAt: NOW,
  },
  lastSent: null,
});

mock.module('@/shared/hooks/use-date-formatter', () => ({
  useDateFormatter: () =>
    createDateFormatter('es', {
      languageTag: 'es-PE',
      regionCode: 'PE',
      uses24hourClock: true,
      firstWeekday: 2,
      timeZone: null,
    }),
}));
mock.module(
  '@/core/services/conversation',
  () => import('@/core/services/conversation/conversation-paths')
);
mock.module('expo-router', () => ({
  useRouter: () => ({
    push: (href: string) => calls.push(`push ${href}`),
    replace: (href: string) => calls.push(`replace ${href}`),
    back: () => calls.push('back'),
    canGoBack: () => true,
  }),
  useLocalSearchParams: () => ({ id: state.id }),
  useIsFocused: () => true,
}));
mock.module('@/features/conversations/hooks/use-conversations', () => ({
  useConversations: () => state.summaries,
}));
mock.module('@/features/conversations/hooks/use-conversation-thread', () => ({
  useConversationThread: (counterpartId: number) => ({
    messages: [],
    loaded: true,
    hasOlder: false,
    newest: null,
    live: true,
    name: counterpartId === 0 ? 'Argus' : 'Ana',
    argus: counterpartId === 0,
    clear: () => Promise.resolve(true),
    send: () => Promise.resolve(true),
    loadOlder: () => Promise.resolve(false),
    loadNewer: () => Promise.resolve(false),
    toLatest: () => undefined,
  }),
}));
mock.module('@/features/conversations/components/argus-thread', () => ({
  ArgusThread: ({ desktop }: { desktop: boolean }) => (
    <Text>{`argus thread ${desktop ? 'desk' : 'phone'}`}</Text>
  ),
}));
mock.module('@/features/conversations/components/member-thread', () => ({
  MemberThread: ({ thread }: { thread: { name: string } }) => (
    <Text>{`thread with ${thread.name}`}</Text>
  ),
}));
mock.module('@/features/home', () => ({
  useHomePeople: () => ({
    readable: true,
    people: [{ id: '1', name: 'David', initial: 'D', self: true, state: 'home', since: null }],
  }),
}));
mock.module('@/features/voice', () => ({
  doneResults: (results: ArgusResult[]) => results.filter((result) => result.status === 'done'),
  shownResults: (results: ArgusResult[]) => results,
  useArgusResults: () => state.results,
  useArgusTalk: () => ({ canListen: true, start: () => undefined, finish: () => undefined }),
  useResultLine: () => () => ({ title: 'Te mostré Cocina', icon: 'cam' }),
  useResultWhen: () => ({ timeOf: () => '15:00' }),
}));

const { default: ConversationsScreen } =
  await import('@/features/conversations/screens/conversations-screen');
const { default: ConversationThreadScreen } =
  await import('@/features/conversations/screens/conversation-thread-screen');
const { ConversationList } = await import('@/features/conversations/components/conversation-list');
const { ConversationRow } = await import('@/features/conversations/components/conversation-row');
const { ContextPanel } = await import('@/features/conversations/components/context-panel');
const { ConversationDesk } = await import('@/features/conversations/components/conversation-desk');

beforeEach(() => {
  calls.length = 0;
  state.id = '0';
  state.results = [];
  state.summaries = [
    summary(0, '', 'Listo, te lo recuerdo.'),
    summary(2, 'Ana', 'La cena está lista'),
  ];
  setWindowWidth(360);
});

describe('the conversations', () => {
  test('on a phone the list puts Argus first and opens a thread', async () => {
    await act(async () => {
      render(<ConversationsScreen />);
    });
    expect(screen.getByRole('heading', { name: 'Conversaciones' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /^Ana\. / }));
    expect(calls).toEqual(['push /conversations/2']);
  });

  test('Argus is pinned even before it has said anything', async () => {
    await act(async () => {
      render(
        <ConversationList
          summaries={[]}
          now={NOW}
          selected={0}
          onOpen={(id) => calls.push(`open ${id}`)}
        />
      );
    });
    fireEvent.click(screen.getByRole('button', { name: 'Argus' }));
    expect(calls).toEqual(['open 0']);
    expect(screen.getByText('Aún no hablas con nadie de casa')).toBeDefined();
  });

  test('a row counts what is unread', async () => {
    await act(async () => {
      render(
        <ConversationRow
          summary={summary(2, 'Ana', 'Hola')}
          now={NOW}
          selected
          onOpen={() => undefined}
        />
      );
    });
    expect(screen.getByText('3')).toBeDefined();
  });

  test('on a phone the thread route opens the thread full screen', async () => {
    state.id = '2';
    await act(async () => {
      render(<ConversationThreadScreen />);
    });
    expect(screen.getByText('thread with Ana')).toBeDefined();
  });

  test('a thread id that is not a number says the conversation is empty', async () => {
    state.id = 'abc';
    await act(async () => {
      render(<ConversationThreadScreen />);
    });
    expect(screen.getByText('Esta conversación está vacía')).toBeDefined();
  });

  test('on a desktop the conversations, the thread and what Argus did sit side by side', async () => {
    setWindowWidth(1440);
    await act(async () => {
      render(<ConversationsScreen />);
    });
    expect(screen.getByText('argus thread desk')).toBeDefined();
    expect(screen.getByText('Lo que hizo Argus')).toBeDefined();
    expect(screen.getByText('En casa')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /^Ana\. / }));
    expect(calls).toEqual(['replace /conversations/2']);
  });

  test('a desktop member thread has no Argus panel', async () => {
    setWindowWidth(1440);
    await act(async () => {
      render(<ConversationDesk counterpartId={2} />);
    });
    expect(screen.getByText('thread with Ana')).toBeDefined();
    expect(screen.queryByText('Lo que hizo Argus')).toBeNull();
  });

  test('what Argus did lists its done results, and says so when there are none', async () => {
    const { rerender } = render(<ContextPanel />);
    expect(screen.getByText('Aún no hice nada aquí')).toBeDefined();
    state.results = [
      { id: 'a', at: NOW, status: 'done', kind: 'camera', cameraId: 'c1', name: 'Cocina' },
    ];
    rerender(<ContextPanel />);
    expect(screen.getByText('Te mostré Cocina')).toBeDefined();
  });
});
