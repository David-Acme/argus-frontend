import { describe, expect, test } from 'bun:test';
import { resourceOf } from '@/shared/libs/remote-resource';

const retry = () => undefined;

describe('resourceOf', () => {
  test('data is shown, whatever else happened', () => {
    expect(resourceOf({ data: [1], status: 'failed', retry })).toEqual({
      status: 'ready',
      data: [1],
    });
  });

  test('an empty answer is an answer, never an endless wait', () => {
    expect(
      resourceOf({ data: [], status: 'ready', retry, empty: (rows) => rows.length === 0 })
    ).toEqual({
      status: 'empty',
    });
  });

  test('a failed read is a failure with its retry, never an empty list', () => {
    expect(resourceOf({ data: null, status: 'failed', retry })).toEqual({
      status: 'failed',
      retry,
    });
    expect(resourceOf({ data: null, status: 'loading', retry })).toEqual({ status: 'loading' });
  });
});
