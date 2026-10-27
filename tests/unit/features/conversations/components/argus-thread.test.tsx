import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
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

const typing: { snapshot: { typing: ReadonlyMap<number, number>; typed: ReadonlySet<string> } } = {
  snapshot: { typing: new Map(), typed: new Set() },
};

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

const outbox = {
  failed: [] as IConversationMessageCacheRow[],
  marks: new Map(),
  send: (body: string) => {
    calls.push(`relay ${body}`);
    return Promise.resolve(true);
  },
  sendNote: () => {
    calls.push('note');
    return Promise.resolve(null);
  },
  owns: () => false,
  retry: (id: string) => calls.push(`outbox retry ${id}`),
  dismiss: (id: string) => calls.push(`outbox dismiss ${id}`),
};

const thread = (messages: IConversationMessageCacheRow[]): ConversationThread => ({
  counterpartId: 0,
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
  clearWords: {
    title: '¿Borrar la conversación?',
    body: 'Se borra de tus dispositivos.',
    confirmLabel: 'Borrar',
  },
  outbox,
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
mock.module('@/features/conversations/hooks/use-thread-search', () => ({
  useThreadSearch: () => ({ text: '', setText: () => undefined, results: [] }),
}));
mock.module('@/core/services/conversation.service', () => ({
  conversationService: {
    searchThread: () => Promise.resolve([]),
    forgetMessage: (id: string) => {
      calls.push(`forget ${id}`);
      return Promise.resolve();
    },
  },
}));
mock.module('@/shared/libs/toast', () => ({
  toast: {
    success: (title: string) => calls.push(`toast ${title}`),
    info: (title: string) => calls.push(`toast ${title}`),
  },
}));
mock.module('@/features/conversations/services/typing', () => ({
  bindTyping: () => undefined,
  sendTyping: (counterpartId: number, active: boolean) =>
    calls.push(`typing ${counterpartId} ${active}`),
  typingTracker: {
    subscribe: () => () => undefined,
    get snapshot() {
      return typing.snapshot;
    },
  },
}));
mock.module('@/features/conversations/services/note-player', () => ({
  notePlayer: {
    subscribe: () => () => undefined,
    snapshot: {
      noteId: null,
      loading: false,
      failed: false,
      playing: false,
      positionMs: 0,
      durationMs: 0,
      speed: 1,
    },
    toggle: (noteId: string) => {
      calls.push(`play ${noteId}`);
      return Promise.resolve();
    },
    setSpeed: () => undefined,
    seek: () => undefined,
    stop: () => undefined,
  },
}));
mock.module('@/features/conversations/hooks/use-note-recorder', () => ({
  useNoteRecorder: () => ({
    supported: true,
    phase: 'idle',
    elapsedMs: 0,
    live: { get: () => ({ seq: 0, values: [] }), set: () => undefined },
    start: () => {
      calls.push('record start');
      return Promise.resolve(true);
    },
    finish: () => Promise.resolve(null),
    cancel: () => calls.push('record cancel'),
  }),
}));
mock.module('@/features/home', () => ({ useHomePeople: () => ({ people: [], loaded: true }) }));
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
  doneResults: () => [],
  useResultLine: () => () => '',
  useResultWhen: () => () => '',
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
    sendNote: (noteId: string) => {
      calls.push(`chat note ${noteId}`);
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
const { BubbleMeta } = await import('@/features/conversations/components/bubble-meta');
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

const openMenu = async (name: string) => {
  fireEvent.keyDown(screen.getByRole('button', { name }), { key: 'Enter' });
};

const chatEntry = (patch: Partial<AssistantChatEntry>): AssistantChatEntry => ({
  clientId: 'x1',
  text: 'Pon el modo noche',
  sentAt: Date.now(),
  status: 'sending',
  reply: '',
  turnId: null,
  error: null,
  ...patch,
});

const NOTE = {
  id: 'f'.repeat(32),
  mime: 'audio/ogg' as const,
  durationMs: 12_000,
  peaks: [10, 60, 100, 30],
};

beforeEach(() => {
  calls.length = 0;
  voice.stage = 'idle';
  voice.error = null;
  voice.canListen = true;
  voice.results = [];
  voice.entries = [];
  typing.snapshot = { typing: new Map(), typed: new Set() };
  outbox.failed = [];
});

describe('the Argus thread', () => {
  test('an empty thread invites to write or talk, with no suggestion chips', async () => {
    await show(<ArgusThread thread={thread([])} desktop={false} />);
    expect(screen.getByText('Puedes escribirme o hablarme')).toBeDefined();
    expect(
      screen.queryAllByRole('button', {
        name: /Muéstrame Cocina|¿Qué tengo|¿Quién está|Modo noche/,
      })
    ).toHaveLength(0);
  });

  test('the header is one line: name, «en casa», a plain call icon and ⋯ with Borrar last', async () => {
    await show(<ArgusThread thread={thread([message('2', { body: 'Hola' })])} desktop={false} />);
    expect(screen.getByRole('heading', { name: 'Argus' })).toBeDefined();
    expect(screen.getByText('en casa')).toBeDefined();
    expect(screen.queryByText('Borrar')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Llamar a Argus' }));
    await openMenu('Más opciones de la conversación');
    const items = (await screen.findAllByRole('menuitem', { hidden: true })).filter(
      (item) => item.textContent
    );
    expect(items.map((item) => item.textContent)).toEqual([
      'Ver las conversaciones',
      'Buscar',
      'Borrar la conversación',
    ]);
    fireEvent.click(items[2] as HTMLElement);
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog.textContent).toContain('Se borra de tus dispositivos.');
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Borrar' }));
    });
    expect(calls).toEqual(['push /call', 'clear']);
  });

  test('Argus typing shows the dots and «escribiendo…» in the header', async () => {
    typing.snapshot = { typing: new Map([[0, Date.now() + 6000]]), typed: new Set() };
    await show(
      <ArgusThread
        thread={thread([message('1', { direction: 'out', body: 'Hola' })])}
        desktop={false}
      />
    );
    expect(screen.getByRole('status', { name: 'Argus está escribiendo' })).toBeDefined();
    expect(screen.getByText('escribiendo…')).toBeDefined();
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
    const reply = screen.getAllByText('Aquí está la cocina.')[0] as HTMLElement;
    const card = screen.getAllByText('card camera live')[0] as HTMLElement;
    expect(reply.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test('a closed question from Argus carries Sí and No inside its bubble', async () => {
    const rows = [
      message('1', { direction: 'out', body: 'Regar' }),
      message('2', { body: '¿Te lo recuerdo?' }),
    ];
    await show(<ArgusThread thread={thread(rows)} desktop={false} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Sí' })[0] as HTMLElement);
    expect(calls).toContain('send Sí');
  });

  test('a typed message shows the clock, then ✓✓ on the typing frame, and a failed one a quiet resend', async () => {
    voice.entries = [chatEntry({ clientId: 'w1', text: 'Hola', status: 'waiting' })];
    typing.snapshot = { typing: new Map(), typed: new Set(['w1']) };
    await show(<ArgusThread thread={thread([])} desktop={false} />);
    expect(screen.getAllByLabelText(/^Hola\. .*Entregado$/).length).toBeGreaterThan(0);
  });

  test('a failed typed message keeps a subtle resend beside it, no banner', async () => {
    voice.entries = [chatEntry({ status: 'failed', error: 'SOCKET_LOST|gone' })];
    await show(<ArgusThread thread={thread([])} desktop={false} />);
    expect(screen.queryByText(/^No enviado\./)).toBeNull();
    fireEvent.click(
      screen.getAllByRole('button', {
        name: 'Volver a enviar «Pon el modo noche»',
      })[0] as HTMLElement
    );
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

  const argus = (stage: HoldTalkStage, readDraft: () => string = () => '') => (
    <ArgusComposer
      talk={talk(stage)}
      heard={stage === 'listening' ? 'pon el modo' : ''}
      busy={false}
      readDraft={readDraft}
      onDraft={() => undefined}
      onSend={(text) => calls.push(`send ${text}`) > 0}
      onNote={() => calls.push('note')}
    />
  );

  test('an empty field offers a voice note instead of send', async () => {
    await show(argus('idle'));
    expect(screen.getByRole('button', { name: /grabar una nota de voz$/i })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Enviar el mensaje a Argus' })).toBeNull();
  });

  test('typing turns the microphone into send', async () => {
    await show(argus('idle'));
    fireEvent.change(screen.getByRole('textbox', { name: 'Escríbele a Argus' }), {
      target: { value: '¿Quién está?' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Enviar el mensaje a Argus' }));
    });
    expect(calls).toEqual(['send ¿Quién está?']);
  });

  test('the field opens with the draft kept for it', async () => {
    await show(argus('idle', () => 'borrador de prueba'));
    expect(
      (screen.getByRole('textbox', { name: 'Escríbele a Argus' }) as HTMLTextAreaElement).value
    ).toBe('borrador de prueba');
  });

  test('while listening it shows what it hears, sends on a tap and cancels without sending', async () => {
    await show(argus('listening'));
    expect(screen.getByText('«pon el modo»')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar lo que dije' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dejar de escuchar sin enviar' }));
    expect(calls).toEqual(['talk finish true', 'talk finish false']);
  });

  test('a member composer says it is typing and stops when the message is sent', async () => {
    const send = mock((_body: string) => Promise.resolve(true));
    await show(
      <MessageComposer counterpartId={3} name="Ana" onSend={send} onNote={() => undefined} />
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Escríbele a Ana' }), {
      target: { value: 'Ya voy' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Enviar el mensaje a Ana' }));
    });
    expect(send).toHaveBeenCalledWith('Ya voy');
    expect(calls).toEqual(['typing 3 true', 'typing 3 false']);
  });
});

describe('the pieces of a thread', () => {
  test('the words of a bubble are their own run, findable whole, with the time reserve beside them', async () => {
    await show(
      <MessageBubble
        message={message('7', { direction: 'in', body: 'Ana is at home.' })}
        repliedBody={null}
        status={null}
      />
    );
    expect(screen.getByText('Ana is at home.', { exact: true })).toBeDefined();
  });

  test('time and ticks sit inside the bubble: clock, ✓, ✓✓ and blue ✓✓', async () => {
    await show(
      <>
        <BubbleMeta time="21:54" note={null} status="sending" />
        <BubbleMeta time="21:55" note={null} status="sent" />
        <BubbleMeta time="21:56" note="Por la cámara" status="read" />
        <TypingIndicator />
        <DaySeparator label="Hoy" />
      </>
    );
    expect(screen.getByText('21:54')).toBeDefined();
    expect(screen.getByText('Por la cámara · 21:56')).toBeDefined();
    expect(screen.getByRole('status', { name: 'Argus está escribiendo' })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Hoy' })).toBeDefined();
  });

  test('a bubble names its receipt for assistive tech and a camera turn says where it was heard', async () => {
    await show(
      <>
        <MessageBubble
          message={message('1', { direction: 'out', body: 'Ven', kind: 'relay' })}
          repliedBody={null}
          status="read"
        />
        <MessageBubble
          message={message('2', { body: 'Hola', leg: 'camera' })}
          repliedBody={null}
          status={null}
        />
      </>
    );
    expect(screen.getAllByLabelText(/^Ven\. .*Leído$/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^Por la cámara · /).length).toBeGreaterThan(0);
  });

  test('a voice note plays from its bubble and keeps a short transcript hidden until asked', async () => {
    await show(
      <MessageBubble
        message={message('3', {
          direction: 'out',
          body: 'Compra pan',
          via: 'voice',
          voiceNote: NOTE,
        })}
        repliedBody={null}
        status="delivered"
      />
    );
    expect(screen.queryByText('Compra pan')).toBeNull();
    expect(screen.getByText('0:12')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Ver transcripción' }));
    expect(screen.getByText('Compra pan')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Ver más' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar transcripción' }));
    expect(screen.queryByText('Compra pan')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Reproducir la nota de voz/ }));
    expect(calls).toEqual([`play ${NOTE.id}`]);
  });

  test('a long transcript opens folded to two lines, then whole with «Ver más», then hides', async () => {
    const body =
      'Hola, Argus, quería saber qué tengo pendiente para mañana por la tarde y el jueves.';
    await show(
      <MessageBubble
        message={message('4', { direction: 'out', body, via: 'voice', voiceNote: NOTE })}
        repliedBody={null}
        status="read"
      />
    );
    const clamped = () => screen.getByText(body).className.includes('WebkitBoxOrient');
    expect(screen.queryByText(body)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ver transcripción' }));
    expect(clamped()).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Ver más' }));
    expect(clamped()).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar transcripción' }));
    expect(screen.queryByText(body)).toBeNull();
  });

  test('a bubble opens its actions: copy or share, and Eliminar para mí last behind a confirm', async () => {
    await show(
      <MessageBubble
        message={message('41', { body: 'Hola, David' })}
        repliedBody={null}
        status={null}
      />
    );
    fireEvent.contextMenu(screen.getAllByLabelText(/^Hola, David\. /)[0] as HTMLElement);
    const items = (await screen.findAllByRole('menuitem', { hidden: true })).filter(
      (item) => item.textContent
    );
    expect(items.at(-1)?.textContent).toBe('Eliminar para mí');
    fireEvent.click(items.at(-1) as HTMLElement);
    const dialog = await screen.findByRole('alertdialog');
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }));
    });
    expect(calls).toEqual(['forget 41']);
  });

  test('the empty state and the failure notice speak in words', async () => {
    await show(
      <>
        <ArgusEmpty />
        <TalkNotice failure="not-heard" onAllow={() => Promise.resolve()} />
      </>
    );
    expect(screen.getByText('Te ayudo con la agenda, las cámaras y la casa.')).toBeDefined();
    expect(screen.getByText(/^No te escuché./)).toBeDefined();
  });

  test('the desktop header keeps «Mantén Espacio para hablar» and a member header shows its typing', async () => {
    typing.snapshot = { typing: new Map([[2, Date.now() + 6000]]), typed: new Set() };
    await show(
      <>
        <ArgusHeader
          desktop
          typing={false}
          onBack={null}
          onInfo={null}
          onCall={() => calls.push('call')}
          menu={[]}
        />
        <MemberHeader name="Ana" typing onBack={() => calls.push('back')} menu={[]} />
      </>
    );
    expect(screen.getByText('Mantén Espacio para hablar')).toBeDefined();
    expect(screen.getByText('escribiendo…')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    fireEvent.click(screen.getByRole('button', { name: 'Llamar a Argus' }));
    expect(calls).toEqual(['back', 'call']);
  });

  test('the first frame already holds the bubbles: the snapshot paints until the list has laid out', async () => {
    await show(
      <ThreadFrame phone header={<Text>Cabecera</Text>} composer={<Text>Redactor</Text>}>
        <ThreadList
          rows={[message('5', { body: 'Nada hasta las seis.' })]}
          bodies={new Map()}
          paging={thread([])}
          days={{ today: 0, startOfDay: () => 0, dayLabel: () => 'Hoy' }}
          chat={{ typing: true, marks: new Map(), typed: new Set() }}
          argus={null}
        />
      </ThreadFrame>
    );
    expect(screen.getByTestId('thread-snapshot')).toBeDefined();
    expect(screen.getAllByText('Nada hasta las seis.').length).toBe(2);
    expect(screen.getByTestId('thread-snapshot').style.paddingBottom).toBe('12px');
    expect(screen.getByText('Redactor')).toBeDefined();
  });

  test('a member thread clears from ⋯ and returns to the conversations', async () => {
    const ana = {
      ...thread([message('9', { counterpartId: 2, body: 'La cena está lista' })]),
      counterpartId: 2,
      argus: false,
      name: 'Ana',
      clearWords: {
        title: '¿Borrar la conversación con Ana?',
        body: 'Ana conserva su copia.',
        confirmLabel: 'Borrar',
      },
    };
    await show(<MemberThread thread={ana} desktop={false} />);
    await openMenu('Más opciones de la conversación');
    const items = (await screen.findAllByRole('menuitem', { hidden: true })).filter(
      (item) => item.textContent
    );
    fireEvent.click(items.at(-1) as HTMLElement);
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog.textContent).toContain('Ana conserva su copia');
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Borrar' }));
    });
    expect(calls).toEqual(['clear', 'replace /conversations']);
  });
});
