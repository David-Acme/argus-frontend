import { describe, expect, test } from 'bun:test';
import { toAuditPatch } from './audit-log-patch';

describe('audit log patch', () => {
  test('turns the current values of a known table into a partial model patch', () => {
    expect(
      toAuditPatch({
        id: 8,
        recordId: 42,
        tableName: 'camera',
        changes: {
          isEnabled: { previous: true, current: false },
          name: { previous: 'Front', current: 'Entrance' },
        },
      }),
    ).toEqual({
      id: 8,
      key: 'camera',
      recordId: '42',
      props: { isEnabled: false, name: 'Entrance' },
    });
  });

  test('ignores logs for a table outside the Watermelon sync surface', () => {
    expect(
      toAuditPatch({
        id: 9,
        recordId: 42,
        tableName: 'audit_log',
        changes: { name: { current: 'Ignored' } },
      }),
    ).toBeNull();
  });
});
