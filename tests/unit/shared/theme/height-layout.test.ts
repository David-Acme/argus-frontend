import { describe, expect, test } from 'bun:test';
import {
  heightClassOf,
  heightLayoutOf,
  paletteTopOf,
  phoneLandscape,
  sheetBodyCapOf,
  sheetCeilingOf,
  sheetDetentsOf,
  sheetScrolls,
  stageStepOf,
  talkSizeOf,
} from '@/shared/theme/height-layout';
import { inset, layout, size, space } from '@/shared/theme/tokens';

describe('responsive by height', () => {
  test('the short-phone viewports are short or tiny, a tall phone is regular', () => {
    expect(heightClassOf(568)).toBe('tiny');
    expect(heightClassOf(640)).toBe('short');
    expect(heightClassOf(667)).toBe('short');
    expect(heightClassOf(740)).toBe('short');
    expect(heightClassOf(800)).toBe('regular');
  });

  test('a phone on its side is landscape, a tablet is not', () => {
    expect(phoneLandscape({ width: 800, height: 360 })).toBe(true);
    expect(phoneLandscape({ width: 1024, height: 768 })).toBe(false);
    expect(phoneLandscape({ width: 360, height: 400 })).toBe(false);
  });

  test('the stage and the talk button step down on short windows', () => {
    const tall = heightLayoutOf({ width: 360, height: 800 });
    const short = heightLayoutOf({ width: 360, height: 640 });
    const tiny = heightLayoutOf({ width: 320, height: 568 });
    const side = heightLayoutOf({ width: 800, height: 360 });
    expect(stageStepOf(tall)).toBe('regular');
    expect(stageStepOf(short)).toBe('short');
    expect(stageStepOf(tiny)).toBe('tiny');
    expect(stageStepOf(side)).toBe('short');
    expect(talkSizeOf(tall)).toBe(size.talk);
    expect(talkSizeOf(short)).toBe(size.talkShort);
    expect(talkSizeOf(side)).toBe(size.talkShort);
  });

  test('a long sheet opens near full height on a short window and sizes to content otherwise', () => {
    const tall = heightLayoutOf({ width: 360, height: 800 });
    const short = heightLayoutOf({ width: 360, height: 640 });
    const landscape = heightLayoutOf({ width: 800, height: 360 });
    expect(sheetDetentsOf({ long: false, form: false }, short)).toEqual(['auto']);
    expect(sheetDetentsOf({ long: true, form: true }, tall)).toEqual([0.6, 1]);
    expect(sheetDetentsOf({ long: true, form: false }, short)).toEqual([1]);
    expect(sheetDetentsOf({ long: true, form: false }, landscape)).toEqual([1]);
  });

  test('a form sizes to its content on a tall phone and opens near full height, scrolling, on a short one', () => {
    const tall = heightLayoutOf({ width: 360, height: 800 });
    expect(sheetDetentsOf({ long: false, form: true }, tall)).toEqual(['auto']);
    expect(sheetScrolls(sheetDetentsOf({ long: false, form: true }, tall))).toBe(false);
    for (const height of [568, 640, 667]) {
      const detents = sheetDetentsOf(
        { long: false, form: true },
        heightLayoutOf({ width: 360, height })
      );
      expect(detents).toEqual([1]);
      expect(sheetScrolls(detents)).toBe(true);
    }
  });

  test('a sheet sizes to its content up to the ceiling, and its body scrolls in the room under the header and the keyboard', () => {
    expect(sheetCeilingOf({ height: 640, top: 24 })).toBe(640 - 24 - space[4]);
    expect(sheetBodyCapOf({ height: 640, top: 24, header: 70, keyboard: 0 })).toBe(
      640 - 24 - space[4] - 70
    );
    expect(sheetBodyCapOf({ height: 568, top: 20, header: 70, keyboard: 280 })).toBe(
      568 - 20 - space[4] - 70 - 280
    );
    expect(sheetBodyCapOf({ height: 360, top: 0, header: 70, keyboard: 320 })).toBe(0);
  });

  test('the command palette drops from its desktop height only where the window is tall enough', () => {
    expect(paletteTopOf(heightLayoutOf({ width: 1280, height: 820 }))).toBe(inset.palette.top);
    expect(paletteTopOf(heightLayoutOf({ width: 360, height: 640 }))).toBe(layout.gutterCompact);
    expect(paletteTopOf(heightLayoutOf({ width: 740, height: 360 }))).toBe(layout.gutterCompact);
  });
});
