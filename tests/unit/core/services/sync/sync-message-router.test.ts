import { describe, expect, test } from 'bun:test';
import {
  SyncMessageRouter,
  auditScopeOfRequest,
  readErrorFrame,
  type SyncFrameHandlers,
} from '@/core/services/sync/sync-message-router';
import { isSyncRequestError, retriesSyncFailure } from '@/core/services/sync/sync-request-error';
import { SYNC_OPERATION, VOICE_ERROR_TYPE } from '@/shared/constants';

const recordingHandlers = (calls: unknown[][]): SyncFrameHandlers => ({
  initialInfo: (info) => calls.push(['initialInfo', info]),
  syncResponse: (response) => calls.push(['syncResponse', response]),
  syncFailure: (error) => calls.push(['syncFailure', error]),
  auditResponse: (scope, response) => calls.push(['auditResponse', scope, response]),
  auditFailure: (scope, error) => calls.push(['auditFailure', scope, error]),
  liveFrame: (frame) => calls.push(['liveFrame', frame.operation]),
  authContextChanged: (info) => calls.push(['authContextChanged', info]),
  sessionSignal: (signal) => calls.push(['sessionSignal', signal]),
});

describe('auditScopeOfRequest', () => {
  test('maps the two audit request types and nothing else', () => {
    expect(auditScopeOfRequest('sync_audit_log')).toBe('global');
    expect(auditScopeOfRequest('sync_user_audit_log')).toBe('user');
    expect(auditScopeOfRequest('sync')).toBeNull();
  });
});

describe('readErrorFrame', () => {
  test('prefers the error text, then a string payload, then a generic message', () => {
    expect(readErrorFrame('sync_error', { error: 'boom', status: 409 })).toEqual({
      requestType: 'sync',
      status: 409,
      message: 'boom',
    });
    expect(readErrorFrame('voice:start_error', { payload: 'nope' as never })).toEqual({
      requestType: 'voice:start',
      status: 0,
      message: 'nope',
    });
    expect(readErrorFrame('x_error', { status: 'bad' })).toEqual({
      requestType: 'x',
      status: 0,
      message: 'Socket error: x_error',
    });
  });
});

describe('SyncMessageRouter', () => {
  test('a sync error rejects the sync request with its status', () => {
    const calls: unknown[][] = [];
    const router = new SyncMessageRouter(recordingHandlers(calls));
    router.route(JSON.stringify({ type: 'sync_error', status: 409, error: 'old' }));
    expect(calls[0]?.[0]).toBe('syncFailure');
    expect(isSyncRequestError(calls[0]?.[1], 409)).toBe(true);
  });

  test('a 503 from a server shutting down rejects the request and is retried, a 401 is not', () => {
    const calls: unknown[][] = [];
    const router = new SyncMessageRouter(recordingHandlers(calls));
    router.route(JSON.stringify({ type: 'sync_error', status: 503, error: 'shutting down' }));
    router.route(JSON.stringify({ type: 'sync_audit_log_error', status: 503, error: 'shutting down' }));
    expect(calls.map((call) => call[0])).toEqual(['syncFailure', 'auditFailure']);
    expect(isSyncRequestError(calls[0]?.[1], 503)).toBe(true);
    expect(retriesSyncFailure(calls[0]?.[1])).toBe(true);
    expect(retriesSyncFailure(calls[1]?.[2])).toBe(true);
    router.route(JSON.stringify({ type: 'sync_error', status: 401, error: 'expired' }));
    expect(retriesSyncFailure(calls[2]?.[1])).toBe(false);
  });

  test('an audit error rejects only its scope', () => {
    const calls: unknown[][] = [];
    const router = new SyncMessageRouter(recordingHandlers(calls));
    router.route(JSON.stringify({ type: 'sync_user_audit_log_error', status: 500 }));
    expect(calls[0]?.slice(0, 2)).toEqual(['auditFailure', 'user']);
  });

  test('a voice error reaches its own listeners and the voice error listeners', () => {
    const router = new SyncMessageRouter(recordingHandlers([]));
    const seen: unknown[] = [];
    router.onType('voice:start_error', (payload) => seen.push(['own', payload]));
    router.onType(VOICE_ERROR_TYPE, (payload) => seen.push(['voice', payload]));
    router.route(JSON.stringify({ type: 'voice:start_error', status: 503, error: 'busy' }));
    expect(seen).toEqual([
      ['own', { status: 503, error: 'busy' }],
      ['voice', { status: 503, error: 'busy' }],
    ]);
  });

  test('typed frames go to their listeners and operations to listeners before handlers', () => {
    const calls: unknown[][] = [];
    const router = new SyncMessageRouter(recordingHandlers(calls));
    router.onType('voice:stt', (payload) => calls.push(['type', payload]));
    router.on(SYNC_OPERATION.Add, () => calls.push(['listener']));
    router.route(JSON.stringify({ type: 'voice:stt', payload: 'hi' }));
    router.route(JSON.stringify({ operation: SYNC_OPERATION.Add, option: 'camera', info: {} }));
    router.route(
      JSON.stringify({ operation: SYNC_OPERATION.SynchronizeAuditLog, info: { info: [] } })
    );
    router.route('not json');
    router.route(JSON.stringify({ operation: 'x' }));
    expect(calls).toEqual([
      ['type', 'hi'],
      ['listener'],
      ['liveFrame', SYNC_OPERATION.Add],
      ['auditResponse', 'global', { info: [] }],
    ]);
  });

  test('a module_update frame reaches only its listeners and no sync handler', () => {
    const calls: unknown[][] = [];
    const router = new SyncMessageRouter(recordingHandlers(calls));
    router.on(SYNC_OPERATION.ModuleUpdate, (frame) => calls.push(['module', frame.info]));
    router.route(JSON.stringify({ operation: 12, option: 'module_update', info: { modules: [] } }));
    expect(SYNC_OPERATION.ModuleUpdate).toBe(12);
    expect(calls).toEqual([['module', { modules: [] }]]);
  });

  test('an AuthContextChanged that names a session reason is a session signal, not a role change', () => {
    const calls: unknown[][] = [];
    const router = new SyncMessageRouter(recordingHandlers(calls));
    const sessionId = 'a'.repeat(32);
    const role = { id: 4, name: 'Ana', role: 'resident', isActive: true, resync: true };
    router.route(
      JSON.stringify({
        operation: SYNC_OPERATION.AuthContextChanged,
        info: { reason: 'sessionRevoked', sessionId, resync: false },
      })
    );
    router.route(
      JSON.stringify({ operation: SYNC_OPERATION.AuthContextChanged, info: { reason: 'sessionsChanged', resync: false } })
    );
    router.route(
      JSON.stringify({
        operation: SYNC_OPERATION.AuthContextChanged,
        option: 'user_invitation',
        info: { reason: 'userSessionsChanged', userId: 9, resync: false },
      })
    );
    router.route(JSON.stringify({ operation: SYNC_OPERATION.AuthContextChanged, info: role }));
    router.route(
      JSON.stringify({ operation: SYNC_OPERATION.AuthContextChanged, info: { reason: 'sessionRevoked', sessionId: 'x' } })
    );
    expect(calls).toEqual([
      ['sessionSignal', { reason: 'sessionRevoked', sessionId, cause: null }],
      ['sessionSignal', { reason: 'sessionsChanged' }],
      ['sessionSignal', { reason: 'userSessionsChanged', userId: 9 }],
      ['authContextChanged', role],
      ['authContextChanged', { reason: 'sessionRevoked', sessionId: 'x' }],
    ]);
  });
});
