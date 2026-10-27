import { describe, expect, test } from 'bun:test';
import {
  heightFindings,
  isPhoneWindow,
  type HeightEntry,
} from '../../e2e/support/ui-map/height-audit';

const entry = (patch: Partial<HeightEntry['height'] & object>, h = 640, w = 360): HeightEntry => ({
  screen: 'home',
  state: 'populated',
  file: 'home/populated.png',
  fullPage: false,
  viewport: { name: 'phone-short', w, h },
  height: { chrome: 56, firstContent: 200, underBar: [], outside: [], sheet: null, ...patch },
});

describe('the UI map height audit', () => {
  test('a phone-sized window is narrow or low, a laptop is neither', () => {
    expect(isPhoneWindow({ w: 360, h: 640 })).toBe(true);
    expect(isPhoneWindow({ w: 740, h: 360 })).toBe(true);
    expect(isPhoneWindow({ w: 1366, h: 768 })).toBe(false);
  });

  test('a capture within the rules has no finding', () => {
    expect(heightFindings(entry({}))).toEqual([]);
  });

  test('heavy chrome, low first content, an empty sheet band and hidden controls are findings', () => {
    const rules = (patch: Partial<HeightEntry['height'] & object>, h?: number, w?: number) =>
      heightFindings(entry(patch, h, w)).map((finding) => finding.rule);
    expect(rules({ chrome: 98, firstContent: 100 }, 360, 740)).toEqual(['chrome']);
    expect(rules({ firstContent: 285 }, 568, 320)).toEqual(['first-content']);
    expect(rules({ sheet: { top: 60, height: 500, emptyBand: 260 } })).toEqual(['sheet-empty']);
    expect(rules({ underBar: ['Guardar'], outside: ['Colgar'] })).toEqual(['under-bar', 'outside']);
  });

  test('full-page captures and desktop windows are not judged', () => {
    expect(heightFindings({ ...entry({ chrome: 300 }), fullPage: true })).toEqual([]);
    expect(heightFindings(entry({ chrome: 300 }, 900, 1440))).toEqual([]);
  });
});
