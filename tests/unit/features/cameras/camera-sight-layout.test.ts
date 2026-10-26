import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (path: string) => readFileSync(join(import.meta.dir, '../../../../src', path), 'utf8');

const THREAD_ROW = read('features/home/components/notification-thread-row.tsx');
const EPISODE_CARD = read('features/security/components/episode-card.tsx');
const APP_LAYOUT = read('app/(app)/_layout.tsx');

describe('notices and incidents', () => {
  test('a sight notice renders its own title and answers in the thread row', () => {
    expect(THREAD_ROW).toContain('const sight = useSightNotice(thread.kind, latest.data);');
    expect(THREAD_ROW).toContain('<SightNoticeActions notice={sight.notice}');
  });

  test('a tamper incident shows its evidence and the claim', () => {
    expect(EPISODE_CARD).toContain(
      '<TamperEvidenceView target={{ cameraId: episode.cameraId, onsetAt: episode.firstSeen }} enabled={evidence} />'
    );
    expect(EPISODE_CARD).toContain("t('screens.security.tamper.claim')");
  });

  test('evidence is kept as soon as a tamper notice lands, for every signed-in screen', () => {
    expect(APP_LAYOUT).toContain('useTamperEvidenceKeeper();');
  });
});
