import { beforeEach, describe, expect, test } from 'bun:test';
import type { InAppAlert } from '@/core/services/push/in-app-alert';
import { useInAppAlertStore } from '@/core/stores/in-app-alert.store';

const alert = (intentId: string, critical: boolean): InAppAlert => ({
  intentId,
  title: 'Argus',
  body: 'Hay un aviso importante.',
  critical,
  deepLink: null,
});

describe('the in-app alert store', () => {
  beforeEach(() => {
    useInAppAlertStore.getState().dismiss();
  });

  test('a critical alert stays when a normal one arrives after it', () => {
    useInAppAlertStore.getState().show(alert('critical', true));
    useInAppAlertStore.getState().show(alert('normal', false));
    expect(useInAppAlertStore.getState().alert?.intentId).toBe('critical');
  });

  test('a normal alert is replaced by a later one of either urgency', () => {
    useInAppAlertStore.getState().show(alert('first', false));
    useInAppAlertStore.getState().show(alert('second', false));
    expect(useInAppAlertStore.getState().alert?.intentId).toBe('second');
    useInAppAlertStore.getState().show(alert('third', true));
    expect(useInAppAlertStore.getState().alert?.intentId).toBe('third');
  });

  test('dismiss clears the alert', () => {
    useInAppAlertStore.getState().show(alert('gone', true));
    useInAppAlertStore.getState().dismiss();
    expect(useInAppAlertStore.getState().alert).toBeNull();
  });
});
