import { describe, expect, test } from 'bun:test';
import type { IServiceResponse } from '@/core/interfaces';
import {
  belongsToThread,
  notificationThreadKey,
  removalSettled,
  threadRemovalPaths,
  threadRemovalResult,
} from '@/core/services/notification';

const deleted: IServiceResponse<unknown> = { status: 204, ok: true, info: null, errors: null };

const notFound: IServiceResponse<unknown> = {
  status: 404,
  ok: false,
  info: null,
  errors: { code: 'NOT_FOUND', message: 'Notification not found' },
};

const offline: IServiceResponse<unknown> = {
  status: 0,
  ok: false,
  info: null,
  errors: { code: 'NETWORK_ERROR', message: 'offline' },
};

const routeMissing: IServiceResponse<unknown> = {
  status: 404,
  ok: false,
  info: null,
  errors: { code: 'ROUTE_NOT_FOUND', message: 'no route' },
};

const episode = 'guard:episode:41';

describe('deleting a whole thread', () => {
  test('a thread is one request for its key, however many entries the page has loaded', () => {
    const loaded = Array.from({ length: 3 }, (_, index) => String(index + 1));
    expect(threadRemovalPaths({ threadKey: episode, ids: loaded })).toEqual([
      '/notification/thread/guard%3Aepisode%3A41',
    ]);
    expect(threadRemovalPaths({ threadKey: 'a b/c', ids: [] })).toEqual(['/notification/thread/a%20b%2Fc']);
  });

  test('a row without a thread key is deleted by its id', () => {
    expect(threadRemovalPaths({ threadKey: null, ids: ['20'] })).toEqual(['/notification/20']);
  });

  test('the server answering 204 is done', () => {
    expect(removalSettled(deleted)).toBe(true);
    expect(threadRemovalResult([deleted])).toEqual({ status: 200, ok: true, info: null, errors: null });
  });

  test('a 404 not found counts as done: no live row of that thread is left on the server', () => {
    expect(removalSettled(notFound)).toBe(true);
    expect(threadRemovalResult([notFound])).toEqual({ status: 200, ok: true, info: null, errors: null });
  });

  test('any other refusal is the refusal itself, so the rows come back and Retry is offered', () => {
    expect(removalSettled(routeMissing)).toBe(false);
    expect(threadRemovalResult([offline])).toEqual({
      status: 0,
      ok: false,
      info: null,
      errors: { code: 'NETWORK_ERROR', message: 'offline' },
    });
    expect(threadRemovalResult([deleted, routeMissing]).ok).toBe(false);
  });
});

describe('the local rows a thread delete forgets', () => {
  const pageSize = 4;
  const local = [
    ...Array.from({ length: pageSize + 3 }, (_, index) => ({
      id: String(100 + index),
      data: { threadKey: index % 2 === 0 ? episode : ` ${episode} ` },
    })),
    { id: '200', data: { threadKey: 'guard:episode:42' } },
    { id: '201', data: { threadKey: 41 } },
    { id: '202', data: {} },
  ];

  test('every local row of the thread goes, the ones past the loaded page included', () => {
    const loaded = local.slice(0, pageSize).map((row) => row.id);
    const target = { threadKey: episode, ids: loaded };
    expect(local.filter((row) => belongsToThread(row, target)).map((row) => row.id)).toEqual([
      '100',
      '101',
      '102',
      '103',
      '104',
      '105',
      '106',
    ]);
  });

  test('a row thread forgets only its own row', () => {
    expect(local.filter((row) => belongsToThread(row, { threadKey: null, ids: ['202'] })).map((row) => row.id)).toEqual([
      '202',
    ]);
  });

  test('the key is a trimmed string, never a number or a blank', () => {
    expect(notificationThreadKey({ threadKey: '  guard:episode:41 ' })).toBe(episode);
    expect(notificationThreadKey({ threadKey: 41 })).toBeNull();
    expect(notificationThreadKey({ threadKey: '   ' })).toBeNull();
    expect(notificationThreadKey(null)).toBeNull();
  });
});
