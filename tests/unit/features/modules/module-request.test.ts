import { describe, expect, test } from 'bun:test';
import { readModuleRequest } from '@/core/contracts/modules.contract';
import type { IServiceResponse } from '@/core/interfaces';
import type { ModuleRequestAnswer } from '@/core/types';
import {
  requestableModules,
  requestDay,
  requestOutcome,
  wasRequestedToday,
  withRequest,
} from '@/features/modules/model/module-request';
import { moduleRequestOf, groupNotifications } from '@/features/home/model/notification-threads';
import { moduleRecord } from '@tests/support/access-fixtures';

const answer = (info: ModuleRequestAnswer | null, code?: string): IServiceResponse<ModuleRequestAnswer> =>
  info
    ? { status: 200, ok: true, info, errors: null }
    : { status: 409, ok: false, info: null, errors: { code: code ?? 'X', message: '' } };

describe('module requests', () => {
  test('reads what the server answers', () => {
    expect(readModuleRequest({ moduleId: 'surveillance', requested: true, duplicate: false })).toEqual({
      moduleId: 'surveillance',
      requested: true,
      duplicate: false,
    });
    expect(readModuleRequest({ moduleId: 'surveillance' })).toEqual({
      moduleId: 'surveillance',
      requested: true,
      duplicate: false,
    });
    expect(readModuleRequest({ requested: true })).toBeNull();
  });

  test('the outcome tells sent, asked again today, already on, not available and failed apart', () => {
    expect(requestOutcome(answer({ moduleId: 'm', requested: true, duplicate: false }))).toBe('sent');
    expect(requestOutcome(answer({ moduleId: 'm', requested: true, duplicate: true }))).toBe('again');
    expect(requestOutcome(answer(null, 'MODULE_COMING_SOON'))).toBe('soon');
    expect(requestOutcome(answer(null, 'CONFLICT'))).toBe('active');
    expect(requestOutcome(answer(null, 'MODULE_JOB_RUNNING'))).toBe('installing');
    expect(requestOutcome(answer(null, 'SERVICE_UNAVAILABLE'))).toBe('failed');
  });

  test('a request is remembered for the day only', () => {
    const today = requestDay(new Date(2026, 9, 6, 23, 59));
    expect(today).toBe('2026-10-06');
    const next = withRequest({ surveillance: '2026-10-05' }, 'productivity', today);
    expect(next).toEqual({ productivity: '2026-10-06' });
    expect(wasRequestedToday(next, 'productivity', today)).toBe(true);
    expect(wasRequestedToday(next, 'surveillance', today)).toBe(false);
    expect(wasRequestedToday(next, 'productivity', requestDay(new Date(2026, 9, 7)))).toBe(false);
  });

  test('only modules that are off, not core and not coming soon can be asked for', () => {
    const modules = [
      moduleRecord({ id: 'core', kind: 'core', enabled: true }),
      moduleRecord({ id: 'surveillance' }),
      moduleRecord({ id: 'productivity', enabled: true }),
      moduleRecord({ id: 'agronomy', kind: 'coming_soon' }),
      moduleRecord({ id: 'reports' }),
    ];
    expect(requestableModules(modules, new Set()).map((module) => module.id)).toEqual(['surveillance', 'reports']);
    expect(requestableModules(modules, new Set(['reports'])).map((module) => module.id)).toEqual(['surveillance']);
  });
});

describe('the owner notification of a request', () => {
  const row = (data: Record<string, unknown>) => ({
    id: '1',
    type: 'module_request',
    title: 'Ana pide activar Vigilancia',
    body: '',
    isRead: false,
    data,
    createdAt: 1,
  });

  test('carries the module to enable and who asked', () => {
    const [thread] = groupNotifications([
      row({
        kind: 'module_request',
        moduleId: 'surveillance',
        requestedByName: 'Ana',
        action: 'enable_module',
        threadKey: 'module_request:surveillance:7:2026-10-06',
      }),
    ]);
    expect(thread && moduleRequestOf(thread)).toEqual({ moduleId: 'surveillance', requestedByName: 'Ana' });
  });

  test('is nothing for any other notification or one without a module', () => {
    const [other] = groupNotifications([row({ kind: 'call' })]);
    const [bare] = groupNotifications([row({ kind: 'module_request' })]);
    expect(other && moduleRequestOf(other)).toBeNull();
    expect(bare && moduleRequestOf(bare)).toBeNull();
  });
});
