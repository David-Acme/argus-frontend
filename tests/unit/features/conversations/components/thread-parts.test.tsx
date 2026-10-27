import { describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import type { IConversationMessageCacheRow } from '@/core/interfaces';
import { createDateFormatter } from '@/shared/hooks/use-date-formatter/date';
import { Text } from '@/shared/ui/text';
import type { LiveLevels } from '@/features/conversations/model/live-wave';
import '../../../shared/ui/translation-stub';

const calls: string[] = [];

const found: { rows: IConversationMessageCacheRow[] } = { rows: [] };

const row = (
  id: string,
  patch: Partial<IConversationMessageCacheRow> = {}
): IConversationMessageCacheRow => ({
  id,
  counterpartId: 3,
  counterpartName: 'Ana',
  direction: 'in',
  kind: 'relay',
  body: 'La cena está lista',
  leg: null,
  state: 'received',
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
mock.module('@/core/services/conversation.service', () => ({ conversationService: {} }));
mock.module('@/shared/libs/toast', () => ({
  toast: { success: () => undefined, info: () => undefined },
}));
mock.module('@/features/conversations/hooks/use-thread-search', () => ({
  useThreadSearch: () => ({ text: 'cena', setText: () => undefined, results: found.rows }),
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
    toggle: () => Promise.resolve(),
    setSpeed: () => undefined,
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
mock.module('react-native-keyboard-controller', async () => {
  const web = await import('react-native-web');
  return { KeyboardStickyView: web.View };
});
mock.module('@/features/conversations/components/context-panel', () => ({
  ContextPanel: () => <Text>Lo que hizo Argus</Text>,
}));

const { ThreadComposer } = await import('@/features/conversations/components/thread-composer');
const { MicHold } = await import('@/features/conversations/components/mic-hold');
const { MicHold: WebMicHold } = await import('@/features/conversations/components/mic-hold.web');
const { RecordingBar } = await import('@/features/conversations/components/recording-bar');
const { ScrollDown } = await import('@/features/conversations/components/scroll-down');
const { NoteWave } = await import('@/features/conversations/components/note-wave');
const { VoiceNoteBubble } = await import('@/features/conversations/components/voice-note-bubble');
const { ThreadSnapshot } = await import('@/features/conversations/components/thread-snapshot');
const { ThreadItemView } = await import('@/features/conversations/components/thread-item');
const { BubbleTail } = await import('@/features/conversations/components/bubble-tail');
const { BubbleFrame } = await import('@/features/conversations/components/bubble-frame');
const { BubbleMore } = await import('@/features/conversations/components/bubble-more');
const { BubbleMore: WebBubbleMore } =
  await import('@/features/conversations/components/bubble-more.web');
const { ThreadSearch } = await import('@/features/conversations/components/thread-search');
const { ArgusInfo } = await import('@/features/conversations/components/argus-info');

const shared = <T,>(value: T): SharedValue<T> =>
  ({ get: () => value, set: () => undefined }) as unknown as SharedValue<T>;

const show = async (node: ReactNode) => {
  calls.length = 0;
  await act(async () => {
    render(<>{node}</>);
  });
};

const VIEW = {
  bodies: new Map<string, string>(),
  days: { startOfDay: () => 0, dayLabel: () => 'Hoy' },
  chat: { typing: false, marks: new Map(), typed: new Set<string>() },
  argus: null,
};

const ITEMS = [
  { label: 'Copiar', icon: 'copy' as const, onPress: () => calls.push('copy') },
] as const;

describe('the composer parts', () => {
  test('one field and one round button that sends what is typed, and keeps it when the send fails', async () => {
    await show(
      <ThreadComposer
        placeholder="Escríbele a Ana"
        sendLabel="Enviar el mensaje a Ana"
        maxChars={500}
        readDraft={() => ''}
        onDraft={(draft) => calls.push(`draft ${draft}`)}
        onSend={(text) => {
          calls.push(`send ${text}`);
          return false;
        }}
        onNote={null}
        busy={false}
      />
    );
    const field = screen.getByRole('textbox', { name: 'Escríbele a Ana' }) as HTMLTextAreaElement;
    fireEvent.change(field, { target: { value: 'Ya voy' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Enviar el mensaje a Ana' }));
    });
    expect(calls).toEqual(['draft Ya voy', 'draft ', 'send Ya voy', 'draft Ya voy']);
    expect(field.value).toBe('Ya voy');
  });

  test('the phone microphone is held, and shows the lock above it while held', async () => {
    const noop = () => undefined;
    await show(
      <MicHold
        holding
        drag={shared(0)}
        onStart={noop}
        onDecide={noop}
        onRelease={noop}
        onActivate={noop}
      />
    );
    expect(
      screen.getByRole('button', { name: 'Mantén pulsado para grabar una nota de voz' })
    ).toBeDefined();
  });

  test('the desktop microphone records on a click', async () => {
    const noop = () => undefined;
    await show(
      <WebMicHold
        holding={false}
        drag={shared(0)}
        onStart={noop}
        onDecide={noop}
        onRelease={noop}
        onActivate={() => calls.push('activate')}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Grabar una nota de voz' }));
    expect(calls).toEqual(['activate']);
  });

  test('recording shows the time, a hint to slide while held, and a discard once locked', async () => {
    await show(
      <RecordingBar
        mode="holding"
        elapsedMs={3200}
        live={shared<LiveLevels>({ seq: 0, values: [] })}
        drag={shared(-20)}
        onCancel={() => undefined}
      />
    );
    expect(screen.getByText('0:03')).toBeDefined();
    expect(screen.getByText('Desliza para cancelar')).toBeDefined();
    await show(
      <RecordingBar
        mode="locked"
        elapsedMs={1000}
        live={shared<LiveLevels>({ seq: 2, values: [0.2, 0.8] })}
        drag={shared(0)}
        onCancel={() => calls.push('discard')}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Descartar la nota' }));
    expect(calls).toEqual(['discard']);
  });
});

describe('the thread parts', () => {
  test('the round scroll button counts what arrived while away', async () => {
    await show(
      <ScrollDown unseen={3} onPress={() => calls.push('down')} offset={{ closed: 0, opened: 0 }} />
    );
    fireEvent.click(
      screen.getByRole('button', { name: '3 mensajes nuevos. Ir a lo más reciente' })
    );
    expect(screen.getByText('3')).toBeDefined();
    expect(calls).toEqual(['down']);
  });

  test('a note not stored yet shows its wave and duration but cannot play', async () => {
    await show(
      <VoiceNoteBubble
        note={{ id: '', mime: 'audio/mp4', durationMs: 4000, peaks: [10, 50] }}
        transcript=""
        view="hidden"
        onView={() => undefined}
      />
    );
    expect(screen.getByText('0:04')).toBeDefined();
    expect(
      (screen.getByRole('button', { name: /^Reproducir la nota de voz/ }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
    await show(
      <NoteWave
        peaks={[0, 100, 40]}
        positionMs={2000}
        durationMs={4000}
        playing={false}
        speed={1}
      />
    );
  });

  test('the first-frame snapshot and the list rows render the same bubbles', async () => {
    const item = {
      type: 'message' as const,
      key: '1',
      day: 0,
      message: row('1'),
      groupStart: true,
      groupEnd: true,
    };
    await show(
      <>
        <ThreadSnapshot items={[item]} bottom={60} {...VIEW} />
        <ThreadItemView item={item} {...VIEW} />
        <BubbleTail side="start" fill="surface" />
      </>
    );
    expect(screen.getAllByText('La cena está lista')).toHaveLength(2);
  });

  test('a bubble without actions is left alone, and the hover ⋯ shows only on the web build', async () => {
    await show(
      <>
        <BubbleFrame items={null} label="Hola">
          <Text>Hola</Text>
        </BubbleFrame>
        <BubbleMore items={ITEMS} />
      </>
    );
    expect(screen.getByText('Hola')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Copiar' })).toBeNull();
    await show(<WebBubbleMore items={ITEMS} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copiar' }));
    expect(calls).toEqual(['copy']);
  });

  test('search lists the matching lines with their day and time', async () => {
    found.rows = [row('7')];
    await show(<ThreadSearch counterpartId={3} open onClose={() => undefined} />);
    expect(screen.getByText('La cena está lista')).toBeDefined();
    found.rows = [];
    await show(<ThreadSearch counterpartId={3} open onClose={() => undefined} />);
    expect(screen.getByText('Nada coincide')).toBeDefined();
  });

  test('tapping Argus in the header shows what it did and leads to the conversations', async () => {
    await show(
      <ArgusInfo
        open
        onClose={() => calls.push('close')}
        onConversations={() => calls.push('list')}
      />
    );
    expect(screen.getByText('Lo que hizo Argus')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Ver las conversaciones' }));
    expect(calls).toEqual(['close', 'list']);
  });
});
