import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (path: string) => readFileSync(join(import.meta.dir, '../../../../src', path), 'utf8');

const NEWS_ITEM = read('features/home/components/feed/news-item.tsx');
const APP_LAYOUT = read('app/(app)/_layout.tsx');

describe('notices and incidents', () => {
  test('a sight notice renders its own title and answers in the feed item', () => {
    expect(NEWS_ITEM).toContain('const sight = useSightNotice(thread.kind, thread.latest.data);');
    expect(NEWS_ITEM).toContain('<SightNoticeActions notice={sight.notice}');
  });

  test('evidence is kept as soon as a tamper notice lands, for every signed-in screen', () => {
    expect(APP_LAYOUT).toContain('useTamperEvidenceKeeper();');
  });
});
