import { describe, expect, test } from 'bun:test';
import { NOTIFICATIONS_PANEL, NOTIFICATIONS_PANEL_HREF, PANEL_PARAM } from '@/shared/constants';
import { panelRequestOf } from '@/features/home/model/notification-panel';
import { routeFallback } from '@/shared/libs/route-access';
import { viewFor } from './support/access-fixtures';

const paramsOf = (href: string): Record<string, string> =>
  Object.fromEntries(new URL(href, 'https://argus.local').searchParams.entries());

describe('the notifications panel asked for by a route param', () => {
  test('the param names the panel and the href is the home route carrying it', () => {
    expect(PANEL_PARAM).toBe('panel');
    expect(NOTIFICATIONS_PANEL).toBe('notifications');
    expect(NOTIFICATIONS_PANEL_HREF).toBe('/?panel=notifications');
    expect(new URL(NOTIFICATIONS_PANEL_HREF, 'https://argus.local').pathname).toBe('/');
  });

  test('opens when the home route carries the panel and the person may read notifications, and clears the param', () => {
    expect(panelRequestOf({ panel: 'notifications' }, true)).toEqual({ open: true, clear: true });
    expect(panelRequestOf(paramsOf(NOTIFICATIONS_PANEL_HREF), true)).toEqual({ open: true, clear: true });
  });

  test('opens once: after the param is cleared the same screen asks for nothing', () => {
    const arriving = panelRequestOf(paramsOf(NOTIFICATIONS_PANEL_HREF), true);
    expect(arriving).toEqual({ open: true, clear: true });
    const afterClearing = panelRequestOf({}, true);
    expect(afterClearing).toEqual({ open: false, clear: false });
    expect(panelRequestOf({ panel: undefined }, true)).toEqual({ open: false, clear: false });
  });

  test('a route without the param opens nothing and clears nothing', () => {
    expect(panelRequestOf({}, true)).toEqual({ open: false, clear: false });
    expect(panelRequestOf({ module: 'surveillance' }, true)).toEqual({ open: false, clear: false });
  });

  test('a value that is not the panel opens nothing but is still cleared, so a reload or back never keeps it', () => {
    expect(panelRequestOf({ panel: 'settings' }, true)).toEqual({ open: false, clear: true });
    expect(panelRequestOf({ panel: '' }, true)).toEqual({ open: false, clear: true });
    expect(panelRequestOf({ panel: 'Notifications' }, true)).toEqual({ open: false, clear: true });
  });

  test('repeated params follow the first value', () => {
    expect(panelRequestOf({ panel: ['notifications', 'settings'] }, true)).toEqual({ open: true, clear: true });
    expect(panelRequestOf({ panel: ['settings', 'notifications'] }, true)).toEqual({ open: false, clear: true });
  });

  test('without notifications.read nothing opens, and the param is still cleared', () => {
    expect(panelRequestOf({ panel: 'notifications' }, false)).toEqual({ open: false, clear: true });
  });

  test('the home route stays open to every role, an inactive one included, so the param can reach the screen', () => {
    for (const role of ['owner', 'resident', 'guard', 'guest'] as const) {
      expect(routeFallback(NOTIFICATIONS_PANEL_HREF, viewFor(role))).toBeNull();
      expect(routeFallback(NOTIFICATIONS_PANEL_HREF, viewFor(role, { modules: [] }))).toBeNull();
    }
  });
});
