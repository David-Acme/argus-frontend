import { describe, expect, test } from 'bun:test';
import type { INotificationPreviewCacheRow } from '@/core/interfaces';
import { notificationHrefOf, notificationLinkTarget } from '@/features/notification/model/notification-link';

const row = (id: string, data: Record<string, unknown>): INotificationPreviewCacheRow => ({
  id,
  type: 'camera',
  title: 'Argus',
  body: 'Tienes un aviso nuevo.',
  isRead: false,
  data,
  createdAt: 1,
});

describe('the in-app href of a notification', () => {
  test('a path inside the app is kept', () => {
    expect(notificationHrefOf({ url: '/cameras/12' })).toBe('/cameras/12');
    expect(notificationHrefOf({ url: ' /agenda ' })).toBe('/agenda');
  });

  test('anything that leaves the app, or carries a query, lands on the entry route', () => {
    expect(notificationHrefOf({ url: '//evil.example/x' })).toBe('/');
    expect(notificationHrefOf({ url: 'https://evil.example' })).toBe('/');
    expect(notificationHrefOf({ url: '/cameras/12?x=1' })).toBe('/');
    expect(notificationHrefOf({ url: 'cameras/12' })).toBe('/');
    expect(notificationHrefOf({ url: 42 })).toBe('/');
    expect(notificationHrefOf({})).toBe('/');
  });
});

describe('the target of a notification link', () => {
  const rows = [row('41', { url: '/security' }), row('42', { url: '/cameras/12' })];

  test('a link without an id goes home', () => {
    expect(notificationLinkTarget(rows, undefined)).toEqual({ kind: 'home' });
  });

  test('a row that is not local yet waits for the sync, it does not redirect', () => {
    expect(notificationLinkTarget(rows, '99')).toEqual({ kind: 'waiting' });
    expect(notificationLinkTarget([], '42')).toEqual({ kind: 'waiting' });
  });

  test('a local row opens the page its own data names', () => {
    expect(notificationLinkTarget(rows, '42')).toEqual({ kind: 'open', href: '/cameras/12' });
  });
});
