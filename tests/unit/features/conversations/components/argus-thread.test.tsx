import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { IConversationMessageCacheRow } from '@/core/interfaces';
import type { AssistantChatEntry } from '@/core/types';
import { createDateFormatter } from '@/shared/hooks/use-date-formatter/date';
import { Text } from '@/shared/ui/text';
import type { ArgusResult, HoldTalkStage } from '@/features/voice';
import { threadResultsOf } from '@/features/voice/model/result-merge';
import type { ConversationThread } from '@/features/conversations/hooks/use-conversation-thread';
import '../../../shared/ui/translation-stub';

type ListProps = {
  data: readonly { key: string }[];
  renderItem: (props: { item: unknown; index: number }) => ReactNode;
};

const calls: string[] = [];

const voice: {
  stage: HoldTalkStage;
  error: string | null;
  canListen: boolean;
  results: ArgusResult[];
  entries: AssistantChatEntry[];
} = { stage: 'idle', error: null, canListen: true, results: [], entries: [] };

const message = (
  id: string,
  patch: Partial<IConversationMessageCacheRow> = {}
): IConversationMessageCacheRow => ({
  id,
  counterpartId: 0,
  counterpartName: '',
  direction: 'in',
  kind: 'turn',
  body: '',
  leg: null,
  state: 'delivered',
  messageKey: `k${id}`,
  replyToKey: null,
  result: null,
  via: null,
  receipt: null,
  voiceNote: null,
  isRead: true,
  createdAt: Date.UTC(2026, 9, 26, 15, 0),
  ...patch,
});

const thread = (messages: IConversationMessageCacheRow[]): ConversationThread => ({
  messages,
  loaded: true,
  hasOlder: false,
  newest: messages.at(-1) ?? null,
  live: true,
  name: 'Argus',
  argus: true,
  clear: () => {
    calls.push('clear');
    return Promise.resolve(true);
  },
  send: (body) => {
    calls.push(`relay ${body}`);
    return Promise.resolve(true);
  },
  loadOlder: () => Promise.resolve(false),
  loadNewer: () => Promise.resolve(false),
  toLatest: () => undefined,
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
    canGoBack: () => false,
  }),
  useLocalSearchParams: () => ({}),
  useIsFocused: () => true,
}));
mock.module('react-native-keyboard-controller', async () => {
  const web = await import('react-native-web');
  return {
    KeyboardStickyView: web.View,
    KeyboardAwareScrollView: web.ScrollView,
    KeyboardEvents: { addListener: () => ({ remove: () => undefined }) },
    KeyboardController: { dismiss: async () => undefined, isVisible: () => false },
  };
});
mock.module('@/features/conversations/components/thread-scroller', () => ({
  ThreadScroller: ({ data, renderItem }: ListProps) =>
    data.map((item, index) => <div key={item.key}>{renderItem({ item, index })}</div>),
}));
mock.module('@/shared/hooks/use-capabilities', () => ({
  useCapabilities: () => ({
    has: () => true,
    cameraActions: { watch: true, talk: true },
    guard: { view: true, setMode: true },
  }),
}));
mock.module('@/shared/hooks/use-cached-rows', () => ({
  useViewCacheRows: () => [{ id: 'c1', name: 'Cocina', isEnabled: true }],
}));
mock.module('@/shared/libs/permission-prompt', () => ({
  ensurePermission: (kind: string) => {
    calls.push(`permission ${kind}`);
    return Promise.resolve(true);
  },
}));
mock.module('@/features/voice', () => ({
  ASSISTANT_CHAT_MAX_CHARS: 500,
  HOLD_FAILURE_SHOWN_MS: 8000,
  HOLD_FAILURE_WORDS: {
    'not-heard': { title: 'screens.voice.hold.errors.not-heard', body: null },
    permission: { title: 'screens.voice.hold.errors.permission', body: null },
  },
  ArgusResultCard: ({ result, live }: { result: ArgusResult; live: boolean }) => (
    <Text>{`card ${result.kind}${live ? ' live' : ''}`}</Text>
  ),
  argusCallSupported: () => true,
  voiceCallSupported: () => true,
  holdTalkFailureOf: (error: string | null) =>
    error?.startsWith('MIC_PERMISSION_DENIED') ? 'permission' : 'not-heard',
  liveCameraResultId: (results: ArgusResult[]) =>
    results.findLast((result) => result.kind === 'camera')?.id ?? null,
  shownResults: (results: ArgusResult[]) => results,
  threadResultsOf,
  useArgusResults: () => voice.results,
  useResultActions: () => ({ surface: 'chat' }),
  useVoiceHeard: () => 'muéstrame',
  useArgusTalk: () => ({
    stage: voice.stage,
    error: voice.error,
    canListen: voice.canListen,
    start: () => calls.push('talk start'),
    finish: (send: boolean) => calls.push(`talk finish ${send}`),
    dismiss: () => calls.push('talk dismiss'),
  }),
  useAssistantChat: () => ({
    entries: voice.entries,
    open: true,
    busy: false,
    readDraft: () => '',
    setDraft: (draft: string) => calls.push(`draft ${draft}`),
    send: (text: string) => {
      calls.push(`send ${text}`);
      return 'sent';
    },
    retry: (clientId: string) => calls.push(`retry ${clientId}`),
    dismiss: (clientId: string) => calls.push(`dismiss ${clientId}`),
  }),
}));

const { ArgusThread } = await import('@/features/conversations/components/argus-thread');
const { MemberThread } = await import('@/features/conversations/components/member-thread');
const { MessageBubble } = await import('@/features/conversations/components/message-bubble');
const { TypingIndicator } = await import('@/features/conversations/components/typing-indicator');
const { DaySeparator } = await import('@/features/conversations/components/day-separator');
const { ArgusComposer } = await import('@/features/conversations/components/argus-composer');
const { MessageComposer } = await import('@/features/conversations/components/message-composer');
const { SuggestionChips } = await import('@/features/conversations/components/suggestion-chips');
const { ArgusEmpty } = await import('@/features/conversations/components/argus-empty');
const { TalkNotice } = await import('@/features/conversations/components/talk-notice');
const { ArgusHeader, MemberHeader } =
  await import('@/features/conversations/components/thread-header');
const { ThreadFrame } = await import('@/features/conversations/components/thread-frame');
const { ThreadList } = await import('@/features/conversations/components/thread-list');

const show = async (node: ReactNode) => {
  await act(async () => {
    render(<>{node}</>);
  });
};

beforeEach(() => {
  calls.length = 0;
  voice.stage = 'idle';
  voice.error = null;
  voice.canListen = true;
  voice.results = [];
  voice.entries = [];
});

describe('the Argus thread', () => {
  test('an empty thread invites to write or talk with three suggestions that send at once', async () => {
    await show(<ArgusThread thread={thread([])} desktop={false} />);
    expect(screen.getByText('Puedes escribirme o hablarme')).toBeDefined();
    expect(
      screen.getAllByRole('button', { name: /Muéstrame Cocina|¿Qué tengo|¿Quién está|Modo noche/ })
        .length
    ).toBe(3);
    fireEvent.click(screen.getByRole('button', { name: 'Muéstrame Cocina' }));
    expect(calls).toContain('send Muéstrame Cocina');
  });

  test('the header opens the conversations and the phone starts the call', async () => {
    await show(<ArgusThread thread={thread([])} desktop={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Argus. Ver las conversaciones' }));
    fireEvent.click(screen.getByRole('button', { name: 'Llamar a Argus' }));
    expect(calls).toEqual(['push /conversations', 'push /call']);
  });

  test('a result card sits under the reply it belongs to, the newest camera live', async () => {
    const rows = [
      message('1', {
        direction: 'out',
        body: 'Muéstrame la cocina',
        leg: 'phone',
        createdAt: 1_000,
      }),
      message('2', { body: 'Aquí está la cocina.', createdAt: 2_000 }),
    ];
    voice.results = [
      { id: 'a', at: 1_500, status: 'done', kind: 'camera', cameraId: 'c1', name: 'Cocina' },
    ];
    await show(<ArgusThread thread={thread(rows)} desktop={false} />);
    expect(screen.getByText('Aquí está la cocina.')).toBeDefined();
    expect(screen.getByText('card camera live')).toBeDefined();
    const reply = screen.getByText('Aquí está la cocina.');
    const card = screen.getByText('card camera live');
    expect(reply.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test('the cards kept with the conversation come back after a restart, settled by later lines', async () => {
    const offer = {
      id: 'ab12',
      tool: 'memory.remind',
      ok: true,
      data: { title: 'Regar', remindAt: 1_800, confirm: true },
    };
    const rows = [
      message('1', { direction: 'out', body: 'Regar las plantas', createdAt: 1_000, via: 'voice' }),
      message('2', { body: '¿Te lo recuerdo?', createdAt: 2_000, result: [offer], via: 'voice' }),
      message('3', { direction: 'out', body: 'sí', createdAt: 3_000, via: 'text' }),
      message('4', {
        body: 'Listo.',
        createdAt: 4_000,
        result: [{ ...offer, data: { title: 'Regar', remindAt: 1_800 } }],
        via: 'text',
      }),
    ];
    await show(<ArgusThread thread={thread(rows)} desktop={false} />);
    expect(screen.getAllByText('card reminder')).toHaveLength(1);
    const question = screen.getByText('¿Te lo recuerdo?');
    const card = screen.getByText('card reminder');
    expect(question.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      card.compareDocumentPosition(screen.getByText('sí')) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  test('a typed message that failed stays as «No enviado» with Reintentar', async () => {
    voice.entries = [
      {
        clientId: 'x1',
        text: 'Pon el modo noche',
        sentAt: Date.now(),
        status: 'failed',
        reply: '',
        turnId: null,
        error: 'SOCKET_LOST|gone',
      },
    ];
    await show(<ArgusThread thread={thread([])} desktop={false} />);
    expect(screen.getByText('No enviado. No hay conexión con Argus.')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Volver a enviar «Pon el modo noche»' }));
    expect(calls).toContain('retry x1');
  });

  test('a denied microphone offers to allow it', async () => {
    voice.stage = 'failed';
    voice.error = 'MIC_PERMISSION_DENIED|no';
    await show(<ArgusThread thread={thread([])} desktop={false} />);
    expect(screen.getByText(/^Argus no puede oírte/)).toBeDefined();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Permitir' }));
    });
    expect(calls).toEqual(['talk dismiss', 'permission microphone']);
  });
});

describe('the composer', () => {
  const talk = (stage: HoldTalkStage) => ({
    stage,
    mode: 'tap' as const,
    error: null,
    canListen: true,
    start: (mode?: string) => calls.push(`talk start ${mode}`),
    finish: (send: boolean) => calls.push(`talk finish ${send}`),
    dismiss: () => undefined,
  });

  test('the microphone listens on a tap, and a typed message turns it into send', async () => {
    const send = mock((text: string) => text.length > 0);
    await show(
      <ArgusComposer
        talk={talk('idle')}
        heard=""
        busy={false}
        readDraft={() => ''}
        onDraft={() => undefined}
        onSend={send}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Hablar con Argus' }));
    expect(calls).toEqual(['talk start tap']);
    fireEvent.change(screen.getByRole('textbox', { name: 'Escríbele a Argus' }), {
      target: { value: '¿Quién está en casa?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar el mensaje a Argus' }));
    expect(send).toHaveBeenCalledWith('¿Quién está en casa?');
  });

  test('the field opens with the draft kept for it, so a trip to the call loses nothing', async () => {
    await show(
      <ArgusComposer
        talk={talk('idle')}
        heard=""
        busy={false}
        readDraft={() => 'borrador de prueba'}
        onDraft={() => undefined}
        onSend={() => true}
      />
    );
    const field = screen.getByRole('textbox', { name: 'Escríbele a Argus' });
    expect((field as HTMLTextAreaElement).value).toBe('borrador de prueba');
    expect(screen.getByRole('button', { name: 'Enviar el mensaje a Argus' })).toBeDefined();
  });

  test('while listening it shows what it hears and a tap sends it', async () => {
    await show(
      <ArgusComposer
        talk={talk('listening')}
        heard="pon el modo"
        busy={false}
        readDraft={() => ''}
        onDraft={() => undefined}
        onSend={() => true}
      />
    );
    expect(screen.getByText('«pon el modo»')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar lo que dije' }));
    expect(calls).toEqual(['talk finish true']);
  });

  test('while listening a visible cancel stops without sending, and the words say tap', async () => {
    await show(
      <ArgusComposer
        talk={talk('listening')}
        heard=""
        busy={false}
        readDraft={() => ''}
        onDraft={() => undefined}
        onSend={() => true}
      />
    );
    expect(screen.getByText('Te escucho… toca para enviar')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Dejar de escuchar sin enviar' }));
    expect(calls).toEqual(['talk finish false']);
  });

  test('leaving the thread while listening cancels the listening', async () => {
    const view = render(
      <ArgusComposer
        talk={talk('listening')}
        heard=""
        busy={false}
        readDraft={() => ''}
        onDraft={() => undefined}
        onSend={() => true}
      />
    );
    act(() => view.unmount());
    expect(calls).toEqual(['talk finish false']);
  });

  test('a member thread is typed under the sender name with the voice shortcut beside it', async () => {
    const send = mock((_body: string) => Promise.resolve(true));
    await show(<MessageComposer name="Ana" onSend={send} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Escríbele a Ana' }), {
      target: { value: 'Ya voy' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Enviar el mensaje a Ana' }));
    });
    expect(send).toHaveBeenCalledWith('Ya voy');
    fireEvent.click(screen.getByRole('button', { name: 'Hablar con Argus' }));
    expect(calls).toEqual(['push /call']);
  });
});

describe('the pieces of a thread', () => {
  test('my bubble says where it was said and when, Argus has its Estela', async () => {
    await show(
      <>
        <MessageBubble
          message={message('1', { direction: 'out', body: 'Hola', leg: 'laptop' })}
          repliedBody={null}
        />
        <MessageBubble
          message={message('2', { body: 'Hola, David' })}
          repliedBody={null}
          presence={{ state: 'happy', live: true }}
        />
        <TypingIndicator />
        <DaySeparator label="Hoy" />
      </>
    );
    expect(screen.getByText(/^Desde el portátil · /)).toBeDefined();
    expect(screen.getByRole('status', { name: 'Argus está pensando' })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Hoy' })).toBeDefined();
  });

  test('a spoken exchange says so in its meta', async () => {
    await show(
      <>
        <MessageBubble
          message={message('1', { direction: 'out', body: 'Hola', leg: 'phone', via: 'voice' })}
          repliedBody={null}
        />
        <MessageBubble message={message('2', { body: 'Hola', via: 'voice' })} repliedBody={null} />
        <MessageBubble
          message={message('3', { body: 'Escrito', via: 'text' })}
          repliedBody={null}
        />
      </>
    );
    expect(screen.getByText(/^Desde el teléfono · por voz · /)).toBeDefined();
    expect(screen.getByText(/^Por voz · /)).toBeDefined();
    expect(screen.queryAllByText(/por voz/i)).toHaveLength(2);
  });

  test('suggestions fill the draft when they need more words', async () => {
    const pick = mock((_text: string, _send: boolean) => undefined);
    await show(
      <SuggestionChips suggestions={[{ id: 'remind', camera: null, send: false }]} onPick={pick} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Recuérdame…' }));
    expect(pick).toHaveBeenCalledWith('Recuérdame ', false);
  });

  test('the empty state and the failure notice speak in words', async () => {
    await show(
      <>
        <ArgusEmpty suggestions={[]} onPick={() => undefined} />
        <TalkNotice failure="not-heard" onAllow={() => Promise.resolve()} />
      </>
    );
    expect(screen.getByText('Te ayudo con la agenda, las cámaras y la casa.')).toBeDefined();
    expect(screen.getByText(/^No te escuché./)).toBeDefined();
  });

  test('the headers go back, clear and call', async () => {
    await show(
      <>
        <ArgusHeader
          desktop
          onBack={null}
          onConversations={null}
          onCall={() => calls.push('call')}
          onClear={null}
        />
        <MemberHeader
          name="Ana"
          onBack={() => calls.push('back')}
          onClear={() => calls.push('clear')}
        />
      </>
    );
    expect(screen.getByText('Mantén Espacio para hablar')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    fireEvent.click(screen.getByRole('button', { name: 'Borrar la conversación' }));
    fireEvent.click(screen.getByRole('button', { name: 'Llamar a Argus' }));
    expect(calls).toEqual(['back', 'clear', 'call']);
  });

  test('on a phone Borrar waits in the ⋯ menu beside Ver las conversaciones, so the header keeps one line', async () => {
    await show(
      <ArgusHeader
        desktop={false}
        onBack={() => calls.push('back')}
        onConversations={() => calls.push('list')}
        onCall={() => calls.push('call')}
        onClear={() => calls.push('clear')}
      />
    );
    expect(screen.queryByRole('button', { name: 'Borrar la conversación' })).toBeNull();
    const more = screen.getByRole('button', { name: 'Más opciones de la conversación' });
    fireEvent.keyDown(more, { key: 'Enter' });
    expect(
      await screen.findByRole('menuitem', { name: 'Ver las conversaciones', hidden: true })
    ).toBeDefined();
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Borrar la conversación', hidden: true })
    );
    expect(calls).toEqual(['clear']);
  });

  test('the frame and the list render what they are given', async () => {
    await show(
      <ThreadFrame phone header={<Text>Cabecera</Text>} composer={<Text>Redactor</Text>}>
        <ThreadList
          rows={[message('5', { body: 'Nada hasta las seis.' })]}
          bodies={new Map()}
          paging={thread([])}
          days={{ startOfDay: () => 0, dayLabel: () => 'Hoy' }}
          chat={{ typing: true, marks: new Map() }}
          argus={null}
        />
      </ThreadFrame>
    );
    expect(screen.getByText('Cabecera')).toBeDefined();
    expect(screen.getByText('Nada hasta las seis.')).toBeDefined();
    expect(screen.getByText('Redactor')).toBeDefined();
  });

  test('a member thread clears and returns to the conversations', async () => {
    const ana = {
      ...thread([message('9', { counterpartId: 2, body: 'La cena está lista' })]),
      argus: false,
      name: 'Ana',
    };
    await show(<MemberThread thread={ana} desktop={false} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Borrar la conversación' }));
    });
    expect(calls).toEqual(['clear', 'replace /conversations']);
  });
});
