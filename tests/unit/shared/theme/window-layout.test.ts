import { describe, expect, test } from 'bun:test';
import { breakpoints, layout } from '@/shared/theme/tokens';
import { classifyWindowSize, isShortWindow, windowClassOf } from '@/shared/theme/window-layout';

describe('window layout', () => {
  test('the class follows tokens.breakpoints at each edge', () => {
    expect(windowClassOf(breakpoints.medium - 1)).toBe('compact');
    expect(windowClassOf(breakpoints.medium)).toBe('medium');
    expect(windowClassOf(breakpoints.expanded - 1)).toBe('medium');
    expect(windowClassOf(breakpoints.expanded)).toBe('expanded');
    expect(windowClassOf(breakpoints.wide - 1)).toBe('expanded');
    expect(windowClassOf(breakpoints.wide)).toBe('wide');
  });

  test('navigation is a bar on compact, a rail on medium and a sidebar above', () => {
    expect(classifyWindowSize({ width: 360, height: 760 })).toEqual({
      windowClass: 'compact',
      navigation: 'bar',
    });
    expect(classifyWindowSize({ width: 768, height: 1024 })).toEqual({
      windowClass: 'medium',
      navigation: 'rail',
    });
    expect(classifyWindowSize({ width: 1280, height: 800 })).toEqual({
      windowClass: 'expanded',
      navigation: 'sidebar',
    });
    expect(classifyWindowSize({ width: 2560, height: 1440 })).toEqual({
      windowClass: 'wide',
      navigation: 'sidebar',
    });
  });

  test('a compact height keeps the bar', () => {
    expect(classifyWindowSize({ width: 800, height: layout.compactHeight - 1 }).navigation).toBe(
      'bar'
    );
    expect(classifyWindowSize({ width: 800, height: layout.compactHeight }).navigation).toBe(
      'rail'
    );
  });

  test('the short phones are short, a 360×740 phone is not', () => {
    for (const height of [568, 640, 667]) expect(isShortWindow(height)).toBe(true);
    expect(isShortWindow(740)).toBe(false);
  });
});
