import { describe, expect, test } from 'bun:test';
import { advanceAuditCursor, buildAuditRequest } from './audit-log-cursor';

describe('audit log cursor', () => {
  test('pins the first page to the server watermark', () => {
    expect(buildAuditRequest(null)).toEqual({ findLast: true });
  });

  test('continues from the last applied log without moving beyond the watermark', () => {
    expect(buildAuditRequest({ lastId: 24, watermarkId: 91 })).toEqual({
      afterId: 24,
      endId: 91,
    });
  });

  test('uses cursor zero to request the first log written after an empty cache', () => {
    expect(buildAuditRequest({ lastId: 0, watermarkId: 7 })).toEqual({
      afterId: 0,
      endId: 7,
    });
  });

  test('advances only after a contiguous page has been applied', () => {
    expect(
      advanceAuditCursor(
        { lastId: 24, watermarkId: 91 },
        [{ id: 25 }, { id: 26 }],
      ),
    ).toEqual({ lastId: 26, watermarkId: 91 });
  });
});
