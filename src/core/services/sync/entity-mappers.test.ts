import { describe, expect, test } from 'bun:test';
import { toPartialModelProps } from './entity-mappers';

describe('partial sync mapping', () => {
  test('maps only the fields carried by an audit diff', () => {
    expect(toPartialModelProps('camera', { isEnabled: false })).toEqual({
      isEnabled: false,
    });
  });

  test('keeps an explicit null instead of applying defaults for absent fields', () => {
    expect(toPartialModelProps('project_task', { assigneeId: null })).toEqual({
      assigneeId: null,
    });
  });
});
