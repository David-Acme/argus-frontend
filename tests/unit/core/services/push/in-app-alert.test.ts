import { describe, expect, test } from 'bun:test';
import { parseInAppAlert } from '@/core/services/push/in-app-alert';

const payload = {
  intentId: 'a1b2',
  title: 'Argus',
  body: 'Hay un aviso importante.',
  critical: true,
  deepLink: 'argus://notification?notificationId=n-7',
};

describe('the in-app alert payload', () => {
  test('a well-formed alert keeps its fields and opens its deep link', () => {
    expect(parseInAppAlert(JSON.stringify(payload))).toEqual(payload);
  });

  test('an empty deep link means nothing to open', () => {
    expect(parseInAppAlert(JSON.stringify({ ...payload, deepLink: '' }))?.deepLink).toBeNull();
  });

  test('anything that is not a complete alert is refused', () => {
    expect(parseInAppAlert('not json')).toBeNull();
    expect(parseInAppAlert('null')).toBeNull();
    expect(parseInAppAlert(JSON.stringify({ ...payload, critical: 'yes' }))).toBeNull();
    expect(parseInAppAlert(JSON.stringify({ ...payload, intentId: 7 }))).toBeNull();
    expect(parseInAppAlert(JSON.stringify({ title: 'Argus' }))).toBeNull();
  });
});
