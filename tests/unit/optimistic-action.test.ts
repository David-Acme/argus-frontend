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
    getState: () => ({ ask: (_request: unknown, resolve: (accepted: boolean) => void) => resolve(confirmAnswer) }),
  },
}));

mock.module('@/core/i18n', () => ({ t: (key: string) => key }));

const { optimisticRegistry } = await import('@/shared/libs/optimistic');
const { runOptimistic, serverRecordId } = await import('@/shared/libs/optimistic-action');

const ok = <T,>(info: T): IServiceResponse<T> => ({ ok: true, status: 200, info, errors: null });
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
      intents: [{ table: 'project_task', kind: 'update', recordId: '1', values: { status: 'done' } }],
      call: async () => refused('NETWORK_ERROR'),
    });
    expect(optimisticRegistry.snapshot()).toEqual([]);
    expect(shown.at(-1)?.action?.label).toBe('common.retry');

    await runOptimistic({
      intents: [{ table: 'project_task', kind: 'update', recordId: '1', values: { status: 'done' } }],
      call: async () => refused('FORBIDDEN'),
    });
    expect(shown.at(-1)?.intent).toBe('error');
    expect(shown.at(-1)?.action).toBeUndefined();
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

  test('the server id is read from the created row', () => {
    expect(serverRecordId({ id: 7, title: 'x' })).toBe('7');
    expect(serverRecordId({ id: 'abc' })).toBe('abc');
    expect(serverRecordId(null)).toBeUndefined();
    expect(serverRecordId({ deleted: true })).toBeUndefined();
  });
});
