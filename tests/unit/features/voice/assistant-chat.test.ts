import { beforeEach, describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ASSISTANT_CHAT_REPLY_TIMEOUT_MS } from '@/features/voice/constants/voice';
import {
  AssistantChat,
  CHAT_ERRORS,
  chatMessageOf,
} from '@/features/voice/services/chat/assistant-chat';
import { uuidFromBytes } from '@/features/voice/services/chat/client-id';
import { contextTarget } from '@/features/voice/model/context-target';
import { AssistantSocket } from '@/features/voice/services/voice/assistant-socket';
import type { VoiceAction } from '@/core/types';

type Sent = { type: string; payload: unknown };

class FakeTransport {
  sent: Sent[] = [];
  connected = true;
  private typeListeners = new Map<string, Set<(payload: unknown) => void>>();
  private connectListeners = new Set<() => void>();
  private disconnectListeners = new Set<() => void>();

  ensureConnected = (): Promise<boolean> => Promise.resolve(this.connected);

  send = (type: string, payload: unknown): void => {
    this.sent.push({ type, payload });
  };

  onType = (type: string, listener: (payload: unknown) => void): (() => void) => {
    const set = this.typeListeners.get(type) ?? new Set();
    set.add(listener);
    this.typeListeners.set(type, set);
    return () => set.delete(listener);
  };

  onConnect = (listener: () => void): (() => void) => {
    this.connectListeners.add(listener);
    return () => this.connectListeners.delete(listener);
  };

  onDisconnect = (listener: () => void): (() => void) => {
    this.disconnectListeners.add(listener);
    return () => this.disconnectListeners.delete(listener);
  };

  emit(type: string, payload: unknown): void {
    this.typeListeners.get(type)?.forEach((listener) => listener(payload));
  }

  drop(): void {
    this.disconnectListeners.forEach((listener) => listener());
  }

  reconnect(): void {
    this.connectListeners.forEach((listener) => listener());
  }

  types(): string[] {
    return this.sent.map((frame) => frame.type);
  }
}

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

let transport: FakeTransport;
let socket: AssistantSocket;
let chat: AssistantChat;
let ids: number;
let callActive: boolean;
let timers: { run: () => void; ms: number; cancelled: boolean }[];

const entry = (index = 0) => {
  const found = chat.snapshot.entries[index];
  if (!found) throw new Error(`no entry ${index}`);
  return found;
};

beforeEach(() => {
  transport = new FakeTransport();
  socket = new AssistantSocket();
  ids = 0;
  callActive = false;
  timers = [];
  chat = new AssistantChat({
    transport,
    socket,
    newClientId: () => `client-${++ids}`,
    leg: 'laptop',
    now: () => 1000,
    callActive: () => callActive,
    schedule: (run, ms) => {
      const timer = { run, ms, cancelled: false };
      timers.push(timer);
      return () => {
        timer.cancelled = true;
      };
    },
  });
  chat.bindUser('7');
  chat.open();
});

describe('the frames a typed turn sends', () => {
  test('the first message opens a chat session, then sends the text with its client id', async () => {
    expect(chat.send('  ¿qué hay en la agenda?  ')).toBe('sent');
    expect(entry().status).toBe('sending');
    await settle();
    expect(transport.sent).toEqual([
      { type: 'voice:start', payload: { mode: 'chat', leg: 'laptop' } },
      { type: 'voice:text', payload: { text: '¿qué hay en la agenda?', clientId: 'client-1' } },
    ]);
    expect(entry().status).toBe('waiting');
    expect(socket.owner).toBe('chat');
    expect(chat.snapshot.open).toBe(true);
  });

  test('a voice note asks for its turn by note id, with no text, and resends the same note', async () => {
    const noteId = 'b'.repeat(32);
    expect(chat.sendNote(noteId, 'compra pan')).toBe('sent');
    await settle();
    expect(transport.sent.at(-1)).toEqual({
      type: 'voice:text',
      payload: { clientId: 'client-1', noteId },
    });
    expect(entry().noteId).toBe(noteId);
    expect(chat.sendNote('not-a-note', '')).toBe('invalid');
  });

  test('an open session is reused for the next message once the first is answered', async () => {
    chat.send('hola');
    await settle();
    transport.emit('voice:assistant', { text: 'Hola.', turnId: 1 });
    transport.emit('voice:text_done', { clientId: 'client-1', turnId: 1 });
    chat.send('y mañana?');
    await settle();
    expect(transport.types()).toEqual(['voice:start', 'voice:text', 'voice:text']);
  });

  test('an empty message or one past 500 characters is refused before anything is sent', async () => {
    expect(chat.send('   ')).toBe('invalid');
    expect(chat.send('a'.repeat(501))).toBe('invalid');
    expect(chatMessageOf('ñ'.repeat(500))).toBe('ñ'.repeat(500));
    await settle();
    expect(transport.sent).toEqual([]);
    expect(chat.snapshot.entries).toEqual([]);
  });

  test('one typed turn runs at a time: a second message waits for the done frame', async () => {
    chat.send('hola');
    await settle();
    expect(chat.busy).toBe(true);
    expect(chat.send('otra')).toBe('busy');
    expect(transport.types()).toEqual(['voice:start', 'voice:text']);
  });

  test('closing the thread stops the session once nothing is pending', async () => {
    chat.send('hola');
    await settle();
    transport.emit('voice:assistant', { text: 'Hola.', turnId: 4 });
    transport.emit('voice:text_done', { clientId: 'client-1', turnId: 4 });
    chat.close();
    expect(transport.types()).toEqual(['voice:start', 'voice:text', 'voice:stop']);
    expect(chat.snapshot.open).toBe(false);
  });

  test('closing while Argus answers keeps the session until the turn is done', async () => {
    chat.send('hola');
    await settle();
    chat.close();
    expect(transport.types()).not.toContain('voice:stop');
    transport.emit('voice:assistant', { text: 'Hola.', turnId: 4 });
    transport.emit('voice:text_done', { clientId: 'client-1', turnId: 4 });
    expect(transport.types()).toContain('voice:stop');
  });
});

describe('the frames a typed turn receives', () => {
  test('the reply is joined across sentences and the turn ends on its done frame', async () => {
    chat.send('¿quién está en casa?');
    await settle();
    transport.emit('voice:assistant', { text: 'Ana está en casa.', turnId: 9 });
    transport.emit('voice:assistant', { text: ' David salió.', turnId: 9 });
    expect(entry().reply).toBe('Ana está en casa. David salió.');
    expect(entry().turnId).toBe('9');
    expect(entry().status).toBe('waiting');
    transport.emit('voice:text_done', { clientId: 'client-1', turnId: 9 });
    expect(entry().status).toBe('done');
  });

  test('consecutive messages are told apart by the client id and the turn id', async () => {
    chat.send('uno');
    await settle();
    transport.emit('voice:assistant', { text: 'Primero.', turnId: 1 });
    transport.emit('voice:text_done', { clientId: 'client-1', turnId: 1 });
    chat.send('dos');
    await settle();
    transport.emit('voice:assistant', { text: 'Segundo.', turnId: 2 });
    transport.emit('voice:text_done', { clientId: 'client-2', turnId: 2 });
    expect(entry(0)).toMatchObject({ reply: 'Primero.', status: 'done' });
    expect(entry(1)).toMatchObject({ reply: 'Segundo.', status: 'done' });
  });

  test('a new session numbers its turns from one again, and its reply still reaches the new message', async () => {
    chat.send('recuérdame abrir la ventana');
    await settle();
    transport.emit('voice:assistant', { text: 'Recordatorio guardado.', turnId: 1 });
    transport.emit('voice:text_done', { clientId: 'client-1', turnId: 1 });
    chat.close();
    chat.open();
    chat.send('sí');
    await settle();
    transport.emit('voice:assistant', { text: 'Borré el recordatorio.', turnId: 1 });
    transport.emit('voice:text_done', { clientId: 'client-2', turnId: 1 });
    expect(transport.types()).toEqual([
      'voice:start',
      'voice:text',
      'voice:stop',
      'voice:start',
      'voice:text',
    ]);
    expect(entry(0)).toMatchObject({ reply: 'Recordatorio guardado.', status: 'done' });
    expect(entry(1)).toMatchObject({ reply: 'Borré el recordatorio.', status: 'done' });
  });

  test('a turn that answered nothing ends as unanswered, with retry', async () => {
    chat.send('hola');
    await settle();
    transport.emit('voice:assistant', { text: '', turnId: 1, speech: 'unavailable' });
    transport.emit('voice:text_done', { clientId: 'client-1', turnId: 1 });
    expect(entry()).toMatchObject({ status: 'failed', error: CHAT_ERRORS.unanswered });
  });

  test('withheld words are replaced by the correction the server sends', async () => {
    chat.send('palabra de auxilio');
    await settle();
    transport.emit('voice:stt_correction', { text: '…' });
    expect(entry().text).toBe('…');
  });

  test('the end of the session closes the typing of a message still unanswered', async () => {
    let now = 1000;
    chat = new AssistantChat({
      transport,
      socket,
      newClientId: () => `late-${++ids}`,
      leg: 'phone',
      now: () => now,
      callActive: () => false,
      schedule: () => () => undefined,
    });
    chat.bindUser('7');
    chat.open();
    chat.send('hola');
    await settle();
    now = 10_000;
    transport.emit('voice:done', { sessionId: 0 });
    expect(chat.snapshot.entries.at(-1)).toMatchObject({
      status: 'failed',
      error: CHAT_ERRORS.ended,
    });
    expect(chat.snapshot.open).toBe(false);
  });

  test('the done of a call that just ended does not close the new chat session', async () => {
    chat.send('hola');
    await settle();
    transport.emit('voice:assistant', { text: 'Hola.', turnId: 1 });
    transport.emit('voice:text_done', { clientId: 'client-1', turnId: 1 });
    transport.emit('voice:done', { sessionId: 0 });
    expect(chat.snapshot.open).toBe(true);
  });

  test('the draft survives leaving the composer and is cleared for another account', () => {
    chat.setDraft('a medio escribir');
    expect(chat.draft).toBe('a medio escribir');
    chat.bindUser('8');
    expect(chat.draft).toBe('');
  });

  test('the draft survives a call taking the socket and the same account binding again', async () => {
    chat.send('hola');
    await settle();
    transport.emit('voice:text_done', { clientId: 'client-1', turnId: 1 });
    chat.setDraft('borrador de prueba');
    chat.close();
    socket.claim('voice');
    chat.bindUser('7');
    chat.open();
    expect(chat.draft).toBe('borrador de prueba');
  });

  test('a done frame for an unknown client id changes nothing', async () => {
    chat.send('hola');
    await settle();
    transport.emit('voice:text_done', { clientId: 'someone-else', turnId: 3 });
    expect(entry().status).toBe('waiting');
  });

  test('an app action is handed to the bridge once and its result goes back to the session', async () => {
    const actions: VoiceAction[] = [];
    chat.onAction((action) => actions.push(action));
    chat.send('enséñame la entrada');
    await settle();
    const frame = { id: 5, name: 'app.show_camera', arguments: { camera: 'Entrada' } };
    transport.emit('voice:action', frame);
    transport.emit('voice:action', frame);
    expect(actions).toEqual([
      { id: '5', name: 'app.show_camera', arguments: { camera: 'Entrada' } },
    ]);
    chat.completeAction('5', { ok: true, detail: null });
    expect(transport.sent.at(-1)).toEqual({
      type: 'voice:action_result',
      payload: { id: 5, ok: true, detail: '' },
    });
  });

  test('frames arrive for nobody while no chat session is open', () => {
    const actions: VoiceAction[] = [];
    chat.onAction((action) => actions.push(action));
    transport.emit('voice:action', { id: 1, name: 'app.open', arguments: { screen: 'home' } });
    transport.emit('voice:assistant', { text: 'hola', turnId: 1 });
    expect(actions).toEqual([]);
    expect(chat.snapshot.entries).toEqual([]);
  });
});

describe('refusals and failures', () => {
  test('an error naming the client id fails that message and keeps the session', async () => {
    chat.send('uno');
    await settle();
    transport.emit('voice:text_error', { status: 409, error: 'busy', clientId: 'someone-else' });
    expect(entry().status).toBe('waiting');
    transport.emit('voice:text_error', {
      status: 422,
      error: 'invalid text',
      clientId: 'client-1',
    });
    transport.emit('voice:error', { status: 422, error: 'invalid text', clientId: 'client-1' });
    expect(entry()).toMatchObject({ status: 'failed', error: 'invalid text' });
    expect(chat.snapshot.open).toBe(true);
  });

  test('a 409 for the message means no chat session runs, so the retry opens one again', async () => {
    chat.send('hola');
    await settle();
    transport.emit('voice:text_error', { status: 409, error: 'no chat', clientId: 'client-1' });
    expect(entry()).toMatchObject({ status: 'failed', error: 'no chat' });
    expect(chat.snapshot.open).toBe(false);
    chat.retry('client-1');
    await settle();
    expect(transport.types().slice(-2)).toEqual(['voice:start', 'voice:text']);
  });

  test('an error without a client id fails the oldest pending message and closes the session', async () => {
    chat.send('hola');
    await settle();
    transport.emit('voice:error', { status: 503, error: 'Voice is unavailable' });
    expect(entry()).toMatchObject({ status: 'failed', error: 'Voice is unavailable' });
    expect(chat.snapshot.open).toBe(false);
  });

  test('retry sends the same words again under a new client id, reopening the session', async () => {
    chat.send('hola');
    await settle();
    transport.emit('voice:error', { status: 503, error: 'Voice is unavailable' });
    chat.retry('client-1');
    await settle();
    expect(chat.snapshot.entries.map((item) => item.clientId)).toEqual(['client-2']);
    expect(transport.sent.slice(-2)).toEqual([
      { type: 'voice:start', payload: { mode: 'chat', leg: 'laptop' } },
      { type: 'voice:text', payload: { text: 'hola', clientId: 'client-2' } },
    ]);
  });

  test('a failed message can be dismissed', async () => {
    transport.connected = false;
    chat.send('hola');
    await settle();
    expect(entry()).toMatchObject({ status: 'failed', error: CHAT_ERRORS.socketUnavailable });
    chat.dismiss('client-1');
    expect(chat.snapshot.entries).toEqual([]);
  });

  test('a turn that never finishes fails after the reply timeout', async () => {
    chat.send('hola');
    await settle();
    const timer = timers.find((candidate) => !candidate.cancelled);
    expect(timer?.ms).toBe(ASSISTANT_CHAT_REPLY_TIMEOUT_MS);
    timer?.run();
    expect(entry()).toMatchObject({ status: 'failed', error: CHAT_ERRORS.timeout });
  });

  test('a live call refuses the typed message instead of taking the socket', async () => {
    callActive = true;
    chat.send('hola');
    await settle();
    expect(entry()).toMatchObject({ status: 'failed', error: CHAT_ERRORS.callActive });
    expect(transport.sent).toEqual([]);
  });

  test('a voice call that claims the socket interrupts the pending messages', async () => {
    chat.send('hola');
    await settle();
    socket.claim('voice');
    expect(entry()).toMatchObject({ status: 'failed', error: CHAT_ERRORS.interrupted });
    expect(chat.snapshot.open).toBe(false);
    transport.emit('voice:assistant', { text: 'tarde', turnId: 1 });
    expect(entry().reply).toBe('');
  });
});

describe('a dropped socket', () => {
  test('the message in flight fails as lost and the session reopens with resume on reconnect', async () => {
    chat.send('hola');
    await settle();
    transport.drop();
    expect(entry()).toMatchObject({ status: 'failed', error: CHAT_ERRORS.socketLost });
    expect(chat.snapshot.open).toBe(false);
    transport.reconnect();
    await settle();
    expect(transport.sent.at(-1)).toEqual({
      type: 'voice:start',
      payload: { mode: 'chat', leg: 'laptop', resume: true },
    });
    expect(chat.snapshot.open).toBe(true);
  });

  test('a message sent while offline fails as unreachable and goes out on retry once the socket is back', async () => {
    transport.connected = false;
    chat.send('hola');
    await settle();
    expect(entry()).toMatchObject({ status: 'failed', error: CHAT_ERRORS.socketUnavailable });
    transport.connected = true;
    chat.retry('client-1');
    await settle();
    expect(transport.sent.at(-1)).toEqual({
      type: 'voice:text',
      payload: { text: 'hola', clientId: 'client-2' },
    });
    expect(entry().status).toBe('waiting');
  });

  test('a thread that was closed does not reopen the session on reconnect', async () => {
    chat.send('hola');
    await settle();
    transport.emit('voice:text_done', { clientId: 'client-1', turnId: 1 });
    chat.close();
    const before = transport.sent.length;
    transport.drop();
    transport.reconnect();
    await settle();
    expect(transport.sent.length).toBe(before);
  });
});

describe('the session owner', () => {
  test('another account never sees the previous messages', async () => {
    chat.send('hola');
    await settle();
    chat.bindUser('8');
    expect(chat.snapshot.entries).toEqual([]);
  });

  test('a client id is a version 4 uuid', () => {
    const id = uuidFromBytes(Uint8Array.from({ length: 16 }, (_, index) => index * 17));
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe('one assistant stream per socket', () => {
  const read = (path: string) =>
    readFileSync(join(import.meta.dir, '../../../../src', path), 'utf8');
  const VOICE = read('features/voice/services/voice/voice.service.ts');

  test('a voice call claims the socket on start and on resume, and ignores the frames while chat owns it', () => {
    expect(VOICE.match(/assistantSocket\.claim\('voice'\)/g)).toHaveLength(2);
    expect(VOICE).toContain("return this.transport !== 'rtc' && assistantSocket.owner !== 'chat';");
  });

  test('the socket remembers the last claimant and tells the others', () => {
    const owner = new AssistantSocket();
    const claims: string[] = [];
    owner.onClaim((claimant) => claims.push(claimant));
    owner.claim('voice');
    owner.claim('voice');
    owner.claim('chat');
    expect(owner.owner).toBe('chat');
    expect(claims).toEqual(['voice', 'chat']);
  });
});

describe('the context a chat session receives', () => {
  test('the camera names and the situation go to an open chat session as voice:context', async () => {
    chat.sendContext({ kind: 'note', text: 'Cámaras: Entrada' });
    expect(transport.sent).toEqual([]);
    chat.send('hola');
    await settle();
    chat.sendContext({ kind: 'note', text: 'Cámaras: Entrada' });
    chat.sendContext({ kind: 'situation', text: 'Modo: en casa' });
    expect(transport.sent.slice(-2)).toEqual([
      { type: 'voice:context', payload: { kind: 'note', text: 'Cámaras: Entrada' } },
      { type: 'voice:context', payload: { kind: 'situation', text: 'Modo: en casa' } },
    ]);
  });

  test('a session a call took over receives no context', async () => {
    chat.send('hola');
    await settle();
    socket.claim('voice');
    const before = transport.sent.length;
    chat.sendContext({ kind: 'note', text: 'x' });
    expect(transport.sent.length).toBe(before);
  });

  test('a live call takes the context, an open chat session otherwise, and nothing gets it when neither runs', () => {
    expect(contextTarget({ voiceActive: true, chatOpen: true })).toBe('voice');
    expect(contextTarget({ voiceActive: false, chatOpen: true })).toBe('chat');
    expect(contextTarget({ voiceActive: false, chatOpen: false })).toBeNull();
  });

  test('the bridge sends the same notes to the chat session behind the same capability checks', () => {
    const bridge = readFileSync(
      join(import.meta.dir, '../../../../src/features/voice/hooks/use-call-bridge.ts'),
      'utf8'
    );
    expect(bridge).toContain('const target = contextTarget({ voiceActive: isActive, chatOpen });');
    expect(bridge).toContain(
      "target === 'voice' ? voiceService.sendContext(context) : assistantChat.sendContext(context);"
    );
    expect(bridge).toContain('if (!watchesCameras) return;');
    expect(bridge).not.toMatch(/voiceService\.sendContext\(\{/);
  });
});

describe('an answer by button', () => {
  test('opens the chat session if needed and sends voice:confirm with the question id', async () => {
    expect(chat.confirm({ id: 'ab12', answer: 'yes' })).toBe(true);
    await settle();
    expect(transport.sent).toEqual([
      { type: 'voice:start', payload: { mode: 'chat', leg: 'laptop' } },
      { type: 'voice:confirm', payload: { id: 'ab12', answer: 'yes' } },
    ]);
    expect(chat.snapshot.entries).toEqual([]);
  });

  test('is not sent while a call holds the conversation', async () => {
    callActive = true;
    expect(chat.confirm({ id: 'ab12', answer: 'no' })).toBe(false);
    await settle();
    expect(transport.sent).toEqual([]);
  });

  test('is dropped when the account changes before the session opens', async () => {
    chat.confirm({ id: 'ab12', answer: 'no' });
    chat.bindUser('8');
    await settle();
    expect(transport.types()).not.toContain('voice:confirm');
  });
});
