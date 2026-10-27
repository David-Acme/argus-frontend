import { describe, expect, test } from 'bun:test';
import { notificationHrefOf } from '@/features/notification/model/notification-link';

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

describe('the href of a household message', () => {
  test('opens the thread with its counterpart, whatever url it carries', () => {
    expect(
      notificationHrefOf({
        kind: 'household_message',
        counterpartId: 3,
        fromUserId: 3,
        messageKey: 'm',
      })
    ).toBe('/conversations/3');
    expect(
      notificationHrefOf({ kind: 'household_message', counterpartId: 0, url: '/agenda' })
    ).toBe('/conversations/0');
  });

  test('falls back to the sender, and to the url when neither id is usable', () => {
    expect(notificationHrefOf({ kind: 'household_message', fromUserId: 5 })).toBe(
      '/conversations/5'
    );
    expect(
      notificationHrefOf({ kind: 'household_message', counterpartId: 'x', url: '/agenda' })
    ).toBe('/agenda');
  });
});
