import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { deepLinkPath } from '@/app/+native-intent';
import { readWatchConversation, readWatchList, WATCH_ROUTES } from '@/core/contracts/watch.contract';
import { localeDictionaries } from '@/core/i18n/locales';
import { translate } from '@/core/i18n/translate';
import type { TranslateFn, WatchConversation, WatchTurn } from '@/core/types';
import {
  canContinueHere,
  canEndConversation,
  isWatchLive,
  latestConversation,
  liveConversation,
  mergeConversation,
  mergeTurns,
  newlyWoken,
  pruneConversations,
  replaceConversations,
  resumableSecondsLeft,
  WATCH_AUDIENCE_NOTE,
  WATCH_END_LABEL,
  WATCH_HANDOFF_LABEL,
  WATCH_INDICATORS,
  WATCH_KEEP_ENDED_MS,
} from '@/features/watch/model/watch-conversation';
import { SYNC_OPERATION } from '@/shared/constants';

const es = ((key: string, params?: Record<string, string>) =>
  translate(localeDictionaries.es, key as never, params as never)) as TranslateFn;
const en = ((key: string, params?: Record<string, string>) =>
  translate(localeDictionaries.en, key as never, params as never)) as TranslateFn;

const watchSource = (relative: string) =>
  readFileSync(join(import.meta.dir, '../../../../src/features/watch', relative), 'utf8');

const NOW = 1_791_000_000_000;

const turn = (id: string, at: number, text = id, role: WatchTurn['role'] = 'user'): WatchTurn => ({
  id,
  role,
  text,
  at,
  final: true,
});

const conversation = (overrides: Partial<WatchConversation> = {}): WatchConversation => ({
  conversationId: 'w-1',
  cameraId: '4',
  cameraName: 'Sala',
  state: 'listening',
  handoff: 'camera',
  audience: 'member',
  startedAt: NOW - 20_000,
  updatedAt: NOW - 1_000,
  resumableUntil: null,
  endReason: null,
  turns: [],
  ...overrides,
});

describe('the camera conversation the server sends', () => {
  test('a frame in seconds is read in milliseconds, with its turns in order', () => {
    const read = readWatchConversation({
      conversationId: 'w-9',
      cameraId: 4,
      cameraName: 'Sala',
      state: 'speaking',
      handoff: 'camera',
      audience: 'discreet',
      startedAt: 1_791_000_000,
      updatedAt: 1_791_000_010,
      resumableUntil: null,
      endReason: null,
      turns: [
        { id: 1, role: 'user', text: ' ¿qué tengo hoy? ', at: 1_791_000_002, final: true },
        { id: 2, role: 'argus', text: 'Mañana tienes dos cosas.', at: 1_791_000_004, final: false },
        { id: 3, role: 'assistant', text: '   ', at: 1_791_000_005 },
        { role: 'user', text: 'no id', at: 1 },
      ],
    });
    expect(read).not.toBeNull();
    expect(read?.cameraId).toBe('4');
    expect(read?.startedAt).toBe(1_791_000_000_000);
    expect(read?.audience).toBe('discreet');
    expect(read?.turns.map((entry) => entry.id)).toEqual(['1', '2']);
    expect(read?.turns[0]?.text).toBe('¿qué tengo hoy?');
    expect(read?.turns[1]?.final).toBe(false);
    expect(read?.turns[1]?.role).toBe('assistant');
  });

  test('an unknown word from a newer server reads as the safe default', () => {
    const read = readWatchConversation({
      conversationId: 'w-2',
      cameraId: '7',
      state: 'whispering',
      handoff: 'teleport',
      audience: 'robot',
      startedAt: 1,
      updatedAt: 2,
      endReason: 'meteor',
    });
    expect(read?.state).toBe('listening');
    expect(read?.handoff).toBe('camera');
    expect(read?.audience).toBe('guest');
    expect(read?.endReason).toBe('failed');
    expect(read?.cameraName).toBe('');
    expect(read?.turns).toEqual([]);
  });

  test('a frame without its id or camera is dropped, and the list keeps only what it can read', () => {
    expect(readWatchConversation({ cameraId: 1, startedAt: 1, updatedAt: 1 })).toBeNull();
    expect(readWatchConversation(null)).toBeNull();
    const list = readWatchList({
      conversations: [{ conversationId: 'a', cameraId: 1, startedAt: 1, updatedAt: 1 }, { nope: true }],
    });
    expect(list?.map((entry) => entry.conversationId)).toEqual(['a']);
    expect(readWatchList({})).toBeNull();
  });

  test('the frame and the routes keep the numbers and paths the client was written against', () => {
    expect(SYNC_OPERATION.WatchUpdate).toBe(15);
    expect(WATCH_ROUTES.list).toBe('/rtc/watch');
    expect(WATCH_ROUTES.end('w 1')).toBe('/rtc/watch/w%201/end');
  });
});

describe('merging what arrives', () => {
  test('turns merge by id, the newest copy wins, in time order', () => {
    const merged = mergeTurns([turn('a', 1), turn('b', 3, 'b old')], [turn('b', 3, 'b new'), turn('c', 2)]);
    expect(merged.map((entry) => `${entry.id}:${entry.text}`)).toEqual(['a:a', 'c:c', 'b:b new']);
  });

  test('a stale frame never rolls the state back but still adds its turns', () => {
    const held = conversation({ state: 'speaking', updatedAt: NOW, turns: [turn('a', NOW - 5)] });
    const stale = conversation({ state: 'listening', updatedAt: NOW - 2_000, turns: [turn('z', NOW - 9)] });
    const [merged] = mergeConversation([held], stale, NOW);
    expect(merged?.state).toBe('speaking');
    expect(merged?.turns.map((entry) => entry.id)).toEqual(['z', 'a']);
  });

  test('a delta frame keeps the turns already held', () => {
    const held = conversation({ turns: [turn('a', NOW - 9)] });
    const delta = conversation({ state: 'thinking', updatedAt: NOW, turns: [turn('b', NOW - 1, 'b', 'assistant')] });
    const [merged] = mergeConversation([held], delta, NOW);
    expect(merged?.state).toBe('thinking');
    expect(merged?.turns.map((entry) => entry.id)).toEqual(['a', 'b']);
  });

  test('the server list is the truth: a conversation it no longer lists has ended', () => {
    const held = [conversation({ conversationId: 'gone' }), conversation({ conversationId: 'kept' })];
    const fresh = [conversation({ conversationId: 'kept', state: 'speaking', updatedAt: NOW })];
    const merged = replaceConversations(held, fresh, NOW);
    expect(merged.find((entry) => entry.conversationId === 'gone')?.state).toBe('ended');
    expect(merged.find((entry) => entry.conversationId === 'kept')?.state).toBe('speaking');
  });

  test('old ended conversations leave, and a lapsed pause ends', () => {
    const old = conversation({ conversationId: 'old', state: 'ended', updatedAt: NOW - WATCH_KEEP_ENDED_MS - 1 });
    const lapsed = conversation({ conversationId: 'lapsed', state: 'resumable', resumableUntil: NOW - 1 });
    const pruned = pruneConversations([old, lapsed], NOW);
    expect(pruned.map((entry) => entry.conversationId)).toEqual(['lapsed']);
    expect(pruned[0]?.state).toBe('ended');
    expect(pruned[0]?.endReason).toBe('camera_lost');
  });
});

describe('what the phone shows and offers', () => {
  test('the live conversation is the newest one still open or still resumable', () => {
    const ended = conversation({ conversationId: 'e', state: 'ended', updatedAt: NOW });
    const paused = conversation({ conversationId: 'p', state: 'resumable', resumableUntil: NOW + 60_000 });
    expect(liveConversation([ended, paused], NOW)?.conversationId).toBe('p');
    expect(liveConversation([ended], NOW)).toBeNull();
    expect(latestConversation([ended], NOW)?.conversationId).toBe('e');
    expect(isWatchLive(paused, NOW + 60_000)).toBe(false);
    expect(resumableSecondsLeft(paused, NOW + 1_500)).toBe(59);
  });

  test('"Continuar aquí" is offered only to the identified member, from the camera leg, outside a call', () => {
    const open = conversation();
    expect(canContinueHere(open, NOW, false)).toBe(true);
    expect(canContinueHere(conversation({ audience: 'discreet', handoff: 'offering' }), NOW, false)).toBe(true);
    expect(canContinueHere(conversation({ state: 'resumable', resumableUntil: NOW + 1 }), NOW, false)).toBe(true);
    expect(canContinueHere(open, NOW, true)).toBe(false);
    expect(canContinueHere(conversation({ audience: 'guest' }), NOW, false)).toBe(false);
    expect(canContinueHere(conversation({ audience: 'visitor' }), NOW, false)).toBe(false);
    expect(canContinueHere(conversation({ handoff: 'bridging' }), NOW, false)).toBe(false);
    expect(canContinueHere(conversation({ state: 'ended' }), NOW, false)).toBe(false);
    expect(canEndConversation(conversation({ handoff: 'device' }), NOW)).toBe(false);
    expect(canEndConversation(open, NOW)).toBe(true);
  });

  test('the wake cue fires once, when a conversation opens', () => {
    expect(newlyWoken(undefined, conversation({ state: 'waking' }))).toBe(true);
    expect(newlyWoken(conversation({ state: 'ended' }), conversation({ state: 'listening' }))).toBe(true);
    expect(newlyWoken(conversation({ state: 'waking' }), conversation({ state: 'listening' }))).toBe(false);
    expect(newlyWoken(undefined, conversation({ state: 'speaking' }))).toBe(false);
  });

  test('every state, hand-off, audience and ending has its words in both languages', () => {
    const keys = [
      ...Object.values(WATCH_INDICATORS).map((indicator) => indicator.label),
      ...Object.values(WATCH_HANDOFF_LABEL).filter((key): key is NonNullable<typeof key> => key !== null),
      ...Object.values(WATCH_AUDIENCE_NOTE).filter((key): key is NonNullable<typeof key> => key !== null),
      ...Object.values(WATCH_END_LABEL),
    ];
    for (const key of keys) {
      expect(es(key)).not.toBe(key);
      expect(en(key)).not.toBe(key);
    }
    expect(es('screens.watch.pill-label', { state: es(WATCH_INDICATORS.listening.label), camera: 'Sala' })).toBe(
      'Te escucha · Sala'
    );
  });

  test('the transcript screen is a route the app and its deep links know', () => {
    expect(deepLinkPath('argus://watch')).toBe('/watch');
    const pill = watchSource('components/watch-pill.tsx');
    expect(pill).toContain("if (!live || callActive || pathname === WATCH_ROUTE || pathname.startsWith('/welcome')) return null;");
    const feed = watchSource('services/watch-feed.ts');
    expect(feed).toContain('synchronizeService.on(SYNC_OPERATION.WatchUpdate, (message) => {');
    expect(feed).toContain('synchronizeService.onConnect(() => {');
  });
});
