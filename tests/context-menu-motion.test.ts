import { describe, expect, test } from 'bun:test';
import { contextMenuMotion } from '../src/shared/libs/context-menu-motion';

describe('contextMenuMotion', () => {
  test('gives an iPad context menu a softer pace than Android', () => {
    const android = contextMenuMotion('android');
    const ios = contextMenuMotion('ios');

    expect(android.enterDuration).toBeLessThan(ios.enterDuration);
    expect(android.exitDuration).toBeLessThan(ios.exitDuration);
    expect(android.initialScale).toBeGreaterThan(ios.initialScale);
  });
});
