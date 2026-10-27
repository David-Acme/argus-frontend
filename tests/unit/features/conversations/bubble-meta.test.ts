import { describe, expect, test } from 'bun:test';
import {
  glyphShownOf,
  META_BREAK,
  META_GLYPH_ROOM,
  metaLabelOf,
  metaReserveOf,
} from '@/features/conversations/model/bubble-meta';

const breaks = (text: string): number =>
  [...text].filter((char) => /\s/.test(char) && char !== ' ' && char !== ' ').length;

describe('the time and ticks of a bubble', () => {
  test('the label is the time, after the note when there is one', () => {
    expect(metaLabelOf('21:54', null)).toBe('21:54');
    expect(metaLabelOf('21:54', 'Por voz')).toBe('Por voz · 21:54');
  });

  test('the reserve breaks only before itself, so the time stays inline when it fits and drops whole to its own line when it does not', () => {
    const reserve = metaReserveOf({ label: 'Por la cámara · 4:01 AM', glyph: false });
    expect(reserve.startsWith(META_BREAK)).toBe(true);
    expect(breaks(reserve)).toBe(1);
  });

  test('the reserve is as wide as the label, plus room for the ticks when they show', () => {
    const plain = metaReserveOf({ label: '4:01 AM', glyph: false });
    const ticked = metaReserveOf({ label: '4:01 AM', glyph: true });
    expect(plain).toContain('4:01 AM');
    expect(ticked).toBe(`${plain}${META_GLYPH_ROOM}`);
  });

  test('the ticks show for every receipt but a failed send, which shows its resend instead', () => {
    expect(glyphShownOf('sending')).toBe(true);
    expect(glyphShownOf('read')).toBe(true);
    expect(glyphShownOf('failed')).toBe(false);
    expect(glyphShownOf(null)).toBe(false);
  });
});
