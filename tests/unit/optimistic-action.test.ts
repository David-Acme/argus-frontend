import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { IServiceResponse } from '@/core/interfaces';
import type { ToastAction } from '@/core/types';

type ShownToast = { intent: string; title: string; description?: string; action?: ToastAction };

const shown: ShownToast[] = [];
let confirmAnswer = true;

mock.module('@/core/stores', () => ({
  useAuthStore: {
    getState: () => ({ user: { id: 1 } }),
    subscribe: () => () => undefined,
  },
  useToastStore: {
    getState: () => ({
      show: (intent: string, title: string, description?: string, action?: ToastAction) => {
        shown.push({ intent, title, description, action });
        return `toast-${shown.length}`;
      },
      dismiss: () => undefined,
    }),
  },
  useConfirmStore: {
    getState: () => ({
      ask: (_request: unknown, resolve: (accepted: boolean) => void) => resolve(confirmAnswer),
    }),
  },
}));

mock.module('@/core/i18n', () => ({ t: (key: string) => key }));

let drawnKeys = 0;
mock.module('@/core/services/http', () => ({
  newIdempotencyKey: () => {
    drawnKeys += 1;
    return `key-${drawnKeys}`;
  },
}));

const { optimisticRegistry } = await import('@/shared/libs/optimistic');
const { runOptimistic, serverRecordId } = await import('@/shared/libs/optimistic-action');

const ok = <T>(info: T): IServiceResponse<T> => ({ ok: true, status: 200, info, errors: null });
const refused = (code: string): IServiceResponse<null> => ({
  ok: false,
  status: 503,
  info: null,
  errors: { code, message: code },
});

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const flush = () => new Promise((done) => setTimeout(done, 0));

describe('runOptimistic', () => {
  beforeEach(() => {
    shown.length = 0;
    confirmAnswer = true;
    optimisticRegistry.clear();
  });

  test('the intent is visible while the call runs and confirmed with the server id', async () => {
    const call = deferred<IServiceResponse<{ id: number }>>();
    const running = runOptimistic({
      intents: [{ table: 'project_task', kind: 'create', values: { title: 'Paint' } }],
      call: () => call.promise,
    });
    await flush();
    expect(optimisticRegistry.snapshot()).toHaveLength(1);
    expect(optimisticRegistry.snapshot()[0]?.confirmed).toBe(false);
    call.resolve(ok({ id: 42 }));
    expect(await running).not.toBeNull();
    expect(optimisticRegistry.snapshot()[0]).toMatchObject({ confirmed: true, recordId: '42' });
  });

  test('a refusal rolls back and offers Retry only when retrying can help', async () => {
    await runOptimistic({
      intents: [
        { table: 'project_task', kind: 'update', recordId: '1', values: { status: 'done' } },
      ],
      call: async () => refused('NETWORK_ERROR'),
    });
    expect(optimisticRegistry.snapshot()).toEqual([]);
    expect(shown.at(-1)?.action?.label).toBe('common.retry');

    await runOptimistic({
      intents: [
        { table: 'project_task', kind: 'update', recordId: '1', values: { status: 'done' } },
      ],
      call: async () => refused('FORBIDDEN'),
    });
    expect(shown.at(-1)?.intent).toBe('error');
    expect(shown.at(-1)?.action).toBeUndefined();
  });

  test('every attempt of one action carries the same idempotency key', async () => {
    const keys: string[] = [];
    await runOptimistic({
      intents: [{ table: 'project_task', kind: 'create', values: { title: 'Paint' } }],
      call: async (key) => {
        keys.push(key);
        return refused('NETWORK_ERROR');
      },
    });
    shown.at(-1)?.action?.onPress();
    await flush();
    expect(keys).toHaveLength(2);
    expect(keys[1]).toBe(keys[0]);

    await runOptimistic({
      intents: [{ table: 'project_task', kind: 'create', values: { title: 'Sand' } }],
      call: async (key) => {
        keys.push(key);
        return ok({ id: 8 });
      },
    });
    expect(keys[2]).not.toBe(keys[0]);
  });

  test('Undo before the window closes cancels the call and restores the row', async () => {
    let calls = 0;
    const running = runOptimistic({
      intents: [{ table: 'calendar_event', kind: 'delete', recordId: '4' }],
      call: async () => {
        calls += 1;
        return ok(null);
      },
      undo: { title: 'Deleted' },
    });
    await flush();
    expect(optimisticRegistry.snapshot()).toHaveLength(1);
    const undo = shown.at(-1)?.action;
    expect(undo?.label).toBe('common.undo');
    undo?.onPress();
    expect(await running).toBeNull();
    expect(calls).toBe(0);
    expect(optimisticRegistry.snapshot()).toEqual([]);
  });

  test('a declined confirm never begins an intent', async () => {
    confirmAnswer = false;
    let calls = 0;
    const result = await runOptimistic({
      confirm: { title: 'Sure?', intent: 'danger' },
      intents: [{ table: 'user', kind: 'update', recordId: '2', values: { isActive: false } }],
      call: async () => {
        calls += 1;
        return ok(null);
      },
    });
    expect(result).toBeNull();
    expect(calls).toBe(0);
    expect(optimisticRegistry.snapshot()).toEqual([]);
  });

  test('a partial answer rolls back only the refused records and says so', async () => {
    const call = deferred<IServiceResponse<{ refused: string[] }>>();
    const running = runOptimistic({
      intents: [
        {
          table: 'setting',
          kind: 'update',
          recordId: 'tts:tts.pocket_variant_es',
          values: { value: 'fast' },
        },
        {
          table: 'setting',
          kind: 'update',
          recordId: 'tts:tts.pocket_voice_es',
          values: { value: 'jean' },
        },
      ],
      call: () => call.promise,
      success: 'Applied',
      refusals: (info) =>
        info.refused.length > 0
          ? { recordIds: info.refused, title: 'Not applied', description: 'voice' }
          : null,
    });
    await flush();
    expect(optimisticRegistry.snapshot()).toHaveLength(2);
    call.resolve(ok({ refused: ['tts:tts.pocket_voice_es'] }));
    expect(await running).not.toBeNull();
    const left = optimisticRegistry.snapshot();
    expect(left).toHaveLength(1);
    expect(left[0]).toMatchObject({ recordId: 'tts:tts.pocket_variant_es', confirmed: true });
    expect(shown.at(-1)).toMatchObject({
      intent: 'error',
      title: 'Not applied',
      description: 'voice',
    });

    await runOptimistic({
      intents: [
        {
          table: 'setting',
          kind: 'update',
          recordId: 'vlm:vision.max_input_px',
          values: { value: '256' },
        },
      ],
      call: async () => ok({ refused: [] }),
      success: 'Applied',
      refusals: (info: { refused: string[] }) =>
        info.refused.length > 0 ? { recordIds: info.refused, title: 'Not applied' } : null,
    });
    expect(shown.at(-1)).toMatchObject({ intent: 'success', title: 'Applied' });
  });

  test('the server id is read from the created row', () => {
    expect(serverRecordId({ id: 7, title: 'x' })).toBe('7');
    expect(serverRecordId({ id: 'abc' })).toBe('abc');
    expect(serverRecordId(null)).toBeUndefined();
    expect(serverRecordId({ deleted: true })).toBeUndefined();
  });
});
