import { describe, expect, test } from 'bun:test';
import type { VoiceNoteContent } from '@/core/types';
import { NotePlayer } from '@/features/conversations/services/note-player/note-player';
import type {
  NoteEngine,
  NoteStatus,
} from '@/features/conversations/services/note-player/note-player';

const CONTENT: VoiceNoteContent = { mimeType: 'audio/ogg', durationMs: 4000, base64: 'T2dnUw==' };

function harness() {
  const log: string[] = [];
  const reports: ((status: NoteStatus) => void)[] = [];
  const engine: NoteEngine = {
    open: (content, onStatus) => {
      log.push(`open ${content.durationMs}`);
      reports.push(onStatus);
      return {
        play: () => log.push('play'),
        pause: () => log.push('pause'),
        seek: (ms) => log.push(`seek ${ms}`),
        setRate: (rate) => log.push(`rate ${rate}`),
        release: () => log.push('release'),
      };
    },
  };
  let fetches = 0;
  const player = new NotePlayer({
    engine,
    fetchContent: async (noteId) => {
      fetches += 1;
      return noteId === 'missing' ? null : CONTENT;
    },
  });
  return { player, log, reports, fetches: () => fetches };
}

describe('one voice note plays at a time', () => {
  test('a note is fetched once, plays at the chosen speed, and pauses on a second tap', async () => {
    const { player, log, reports, fetches } = harness();
    player.setSpeed(1.5);
    await player.toggle('a');
    reports[0]?.({ positionMs: 1000, durationMs: 4000, playing: true, ended: false });
    expect(player.snapshot).toMatchObject({
      noteId: 'a',
      playing: true,
      positionMs: 1000,
      speed: 1.5,
    });
    await player.toggle('a');
    expect(log).toEqual(['open 4000', 'rate 1.5', 'play', 'pause']);
    player.stop();
    await player.toggle('a');
    expect(fetches()).toBe(1);
  });

  test('starting another note stops the first, and the end rewinds it', async () => {
    const { player, log, reports } = harness();
    await player.toggle('a');
    await player.toggle('b');
    expect(log).toContain('release');
    expect(player.snapshot.noteId).toBe('b');
    reports[1]?.({ positionMs: 4000, durationMs: 4000, playing: false, ended: true });
    expect(player.snapshot).toMatchObject({ playing: false, positionMs: 0 });
  });

  test('a note the server no longer serves says it could not be played', async () => {
    const { player } = harness();
    await player.toggle('missing');
    expect(player.snapshot).toMatchObject({ noteId: 'missing', failed: true, loading: false });
  });
});
