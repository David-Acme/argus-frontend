import { describe, expect, test } from 'bun:test';
import type { VoiceAction } from '@/core/types';
import {
  answeredOffer,
  callResultOf,
  cameraPlacementOf,
  doneResults,
  liveCameraResultId,
  resultOfAction,
  resultOfFrame,
  settleResult,
  shownResults,
  upsertResult,
  type ArgusResult,
} from '@/features/voice/model/argus-result';

const AT = 1_000;

const frame = (tool: string, data: Record<string, unknown>, ok = true) => ({
  id: 9,
  tool,
  ok,
  data,
});

const SHOW: VoiceAction = { id: '3', name: 'app.show_camera', arguments: { camera: 'Cocina' } };

const camera = (id: string, at: number, cameraId: string | null = 'cam-1'): ArgusResult => ({
  id,
  at,
  status: 'done',
  kind: 'camera',
  cameraId,
  name: 'Cocina',
});

describe('a result frame from the backend', () => {
  test('an implicit reminder is an open question until it is answered', () => {
    const result = resultOfFrame(
      frame('memory.remind', { title: 'Pagar el agua', remindAt: 1_800, confirm: true }),
      AT
    );
    expect(result).toEqual({
      id: 'result:9',
      at: AT,
      status: 'pending',
      kind: 'reminder',
      asking: true,
      title: 'Pagar el agua',
      remindAt: 1_800_000,
    });
    expect(result && answeredOffer(result, true)).toMatchObject({ asking: false, status: 'done' });
    expect(result && answeredOffer(result, false)).toMatchObject({
      asking: false,
      status: 'failed',
    });
  });

  test('a moved event keeps the time it had before, in milliseconds', () => {
    expect(
      resultOfFrame(
        frame('calendar.move_event', {
          eventId: 41,
          title: 'Dentista',
          startsAt: 2_000,
          endsAt: 5_600,
          previousStartsAt: 1_000,
        }),
        AT
      )
    ).toMatchObject({
      kind: 'event-moved',
      eventId: '41',
      startsAt: 2_000_000,
      endsAt: 5_600_000,
      previousStartsAt: 1_000_000,
      previousEndsAt: null,
    });
  });

  test('a mode change names the mode it replaced and the place', () => {
    expect(
      resultOfFrame(
        frame('app.set_guard_mode', {
          mode: 'night',
          previousMode: 'home',
          environmentId: 2,
          environmentName: 'Casa',
        }),
        AT
      )
    ).toMatchObject({ kind: 'guard-mode', mode: 'night', previousMode: 'home', environmentId: 2 });
  });

  test('a day of the agenda lists its items, an unknown kind read as an event', () => {
    const result = resultOfFrame(
      frame('calendar.list_events', {
        day: 3_000,
        items: [
          { id: 1, title: 'Pagar el agua', startsAt: 3_100, kind: 'reminder' },
          { id: 2, title: 'Técnico', startsAt: 3_200, kind: 'meeting' },
        ],
      }),
      AT
    );
    expect(result).toMatchObject({ kind: 'agenda-day', day: 3_000_000 });
    expect(result?.kind === 'agenda-day' ? result.items.map((item) => item.kind) : []).toEqual([
      'reminder',
      'event',
    ]);
  });

  test('a module that is off becomes the offer to turn it on', () => {
    expect(resultOfFrame(frame('modules.enable', { module: 'productivity' }), AT)).toMatchObject({
      kind: 'screen',
      screen: 'modules',
      module: 'productivity',
    });
    expect(resultOfFrame(frame('modules.enable', { module: '../x' }), AT)).toBeNull();
  });

  test('a failed tool, an unknown tool and a malformed payload draw no card', () => {
    expect(
      resultOfFrame(frame('memory.remind', { title: 'x', remindAt: 1 }, false), AT)
    ).toBeNull();
    expect(resultOfFrame(frame('weather.today', { title: 'x' }), AT)).toBeNull();
    expect(resultOfFrame(frame('app.set_guard_mode', { mode: 'party' }), AT)).toBeNull();
    expect(resultOfFrame({ tool: 'memory.remind' }, AT)).toBeNull();
    expect(resultOfFrame(null, AT)).toBeNull();
  });
});

describe('a result from an app action', () => {
  test('showing a camera starts pending and settles with the camera it resolved', () => {
    const pending = resultOfAction(SHOW, AT);
    expect(pending).toMatchObject({
      id: 'action:3',
      kind: 'camera',
      status: 'pending',
      name: 'Cocina',
    });
    const settled =
      pending &&
      settleResult(pending, {
        outcome: { ok: true, detail: null },
        cameraId: 'cam-7',
        cameraName: 'Cocina norte',
      });
    expect(settled).toMatchObject({ status: 'done', cameraId: 'cam-7', name: 'Cocina norte' });
  });

  test('opening the modules screen for a module carries the module', () => {
    expect(
      resultOfAction(
        { id: '4', name: 'app.open', arguments: { screen: 'modules', module: 'productivity' } },
        AT
      )
    ).toMatchObject({ kind: 'screen', screen: 'modules', module: 'productivity' });
  });

  test('a guard mode action is spoken by the guard itself and draws no card', () => {
    expect(
      resultOfAction({ id: '5', name: 'app.set_guard_mode', arguments: { mode: 'night' } }, AT)
    ).toBeNull();
  });
});

describe('which results show', () => {
  test('a result replaces the one with its id and the list keeps the newest', () => {
    const first = camera('a', 1);
    const kept = upsertResult(upsertResult([], first, 2), camera('b', 2), 2);
    expect(upsertResult(kept, { ...first, status: 'failed' }, 2).map((r) => r.status)).toEqual([
      'failed',
      'done',
    ]);
    expect(upsertResult(kept, camera('c', 3), 2).map((r) => r.id)).toEqual(['b', 'c']);
  });

  test('failed results show only for a camera, so a refusal is never drawn as a fact', () => {
    const failedMode: ArgusResult = {
      id: 'm',
      at: 1,
      status: 'failed',
      kind: 'guard-mode',
      mode: 'night',
      previousMode: null,
      environmentId: null,
      environmentName: null,
    };
    const failedCamera = { ...camera('c', 2), status: 'failed' as const };
    expect(shownResults([failedMode, failedCamera]).map((r) => r.id)).toEqual(['c']);
  });

  test('only the newest camera that resolved plays live', () => {
    expect(liveCameraResultId([camera('a', 1), camera('b', 2), camera('c', 3, null)])).toBe('b');
    expect(liveCameraResultId([])).toBeNull();
  });

  test('the call shows its own newest result, never one from before it started', () => {
    expect(callResultOf([camera('a', 1), camera('b', 5)], 3)?.id).toBe('b');
    expect(callResultOf([camera('a', 1)], 3)).toBeNull();
  });

  test('an offer still waiting for a yes is not something Argus did', () => {
    const offer: ArgusResult = {
      id: 'o',
      at: 3,
      status: 'done',
      kind: 'screen',
      screen: 'modules',
      module: 'productivity',
    };
    expect(doneResults([camera('a', 1), offer])).toEqual([camera('a', 1)]);
  });

  test('what Argus did lists the done results newest first', () => {
    const pending = { ...camera('p', 4), status: 'pending' as const };
    expect(doneResults([camera('a', 1), pending, camera('b', 2)]).map((r) => r.id)).toEqual([
      'b',
      'a',
    ]);
  });
});

describe('where a camera opens', () => {
  test('inside the call, inside the thread, or as its own screen', () => {
    expect(cameraPlacementOf({ inCall: true, path: '/call' })).toBe('call');
    expect(cameraPlacementOf({ inCall: false, path: '/conversations/0' })).toBe('thread');
    expect(cameraPlacementOf({ inCall: true, path: '/conversations' })).toBe('thread');
    expect(cameraPlacementOf({ inCall: true, path: '/' })).toBe('screen');
  });
});
