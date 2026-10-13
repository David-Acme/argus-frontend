import { describe, expect, test } from 'bun:test';
import type { IServiceResponse } from '@/core/interfaces';
import { removalResponse } from '@/core/services/notification';

const gone: IServiceResponse<unknown> = { status: 204, ok: true, info: null, errors: null };

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

describe('removalResponse', () => {
  test('every row deleted answers ok with nothing refused', () => {
    expect(removalResponse([{ id: '1', response: gone }, { id: '2', response: gone }])).toEqual({
      status: 200,
      ok: true,
      info: { refused: [] },
      errors: null,
    });
  });

  test('a row the server no longer has counts as deleted, since another device got there first', () => {
    expect(removalResponse([{ id: '1', response: notFound }]).info).toEqual({ refused: [] });
  });

  test('a refusal of some rows names only those, so only they come back', () => {
    const response = removalResponse([
      { id: '1', response: gone },
      { id: '2', response: offline },
      { id: '3', response: notFound },
    ]);
    expect(response.ok).toBe(true);
    expect(response.info).toEqual({ refused: ['2'] });
  });

  test('a refusal of every row is the first refusal itself, so it can be retried', () => {
    expect(removalResponse([{ id: '1', response: offline }, { id: '2', response: offline }])).toEqual({
      status: 0,
      ok: false,
      info: null,
      errors: { code: 'NETWORK_ERROR', message: 'offline' },
    });
  });

  test('a 404 that is not the not-found refusal is still a refusal', () => {
    const routeMissing: IServiceResponse<unknown> = {
      status: 404,
      ok: false,
      info: null,
      errors: { code: 'ROUTE_NOT_FOUND', message: 'no route' },
    };
    expect(removalResponse([{ id: '1', response: routeMissing }]).ok).toBe(false);
  });

  test('nothing to delete is nothing refused', () => {
    expect(removalResponse([]).info).toEqual({ refused: [] });
  });
});
