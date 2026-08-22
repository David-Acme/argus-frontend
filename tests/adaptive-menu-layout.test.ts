import { describe, expect, test } from 'bun:test';
import { shouldUseAdaptiveMenuSheet } from '../src/shared/libs/adaptive-menu-layout';

describe('shouldUseAdaptiveMenuSheet', () => {
  test('uses a touch sheet on a portrait phone', () => {
    expect(
      shouldUseAdaptiveMenuSheet({ isCompact: true, isExpanded: false, isNative: true, isShort: false })
    ).toBe(true);
  });

  test('keeps a phone in landscape touch-friendly even when its width is medium', () => {
    expect(
      shouldUseAdaptiveMenuSheet({ isCompact: false, isExpanded: false, isNative: true, isShort: true })
    ).toBe(true);
  });

  test('uses the native sheet on tablets so touch actions remain reachable', () => {
    expect(
      shouldUseAdaptiveMenuSheet({ isCompact: false, isExpanded: true, isNative: true, isShort: false })
    ).toBe(true);
  });

  test('uses the anchored menu on a desktop browser', () => {
    expect(
      shouldUseAdaptiveMenuSheet({ isCompact: false, isExpanded: true, isNative: false, isShort: false })
    ).toBe(false);
  });
});
