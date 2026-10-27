import { describe, expect, test } from 'bun:test';
import { withoutSignedOutHistory } from '@/features/auth/model/signed-in-history';

const route = (name: string) => ({ name, key: `${name}-key` });

describe('the history under the signed-in app', () => {
  test('the face login and the QR login under Home are dropped, so Back leaves the app', () => {
    const state = {
      index: 2,
      routes: [route('welcome'), route('login'), route('(app)')],
      stale: false,
    };
    const next = withoutSignedOutHistory(state);
    expect(next?.routes.map((item) => item.name)).toEqual(['(app)']);
    expect(next?.index).toBe(0);
    expect(next?.stale).toBe(false);
  });

  test('other screens under the app are kept, in order', () => {
    const state = { index: 2, routes: [route('qr'), route('welcome'), route('(app)')] };
    expect(withoutSignedOutHistory(state)?.routes.map((item) => item.name)).toEqual([
      'qr',
      '(app)',
    ]);
  });

  test('nothing changes while the onboarding is on screen or the history is already clean', () => {
    expect(
      withoutSignedOutHistory({ index: 1, routes: [route('(app)'), route('welcome')] })
    ).toBeNull();
    expect(withoutSignedOutHistory({ index: 0, routes: [route('(app)')] })).toBeNull();
    expect(withoutSignedOutHistory({ index: 3, routes: [route('(app)')] })).toBeNull();
  });
});
