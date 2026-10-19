import { describe, expect, test } from 'bun:test';
import {
  CONVERSATION_PATH,
  conversationReadPath,
  conversationThreadPath,
  validCounterpartId,
} from '@/core/services/conversation';
import { ARGUS_ROUTE_SERVICES, ARGUS_DEFAULT_ROUTE_PORTS } from '@/shared/constants/net.constant';

describe('the conversation routes', () => {
  test('are served by argus-notification, beside /notification', () => {
    expect(CONVERSATION_PATH).toBe('/conversation');
    expect(ARGUS_ROUTE_SERVICES.conversation).toBe('notification');
    expect(ARGUS_DEFAULT_ROUTE_PORTS.conversation).toBe(ARGUS_DEFAULT_ROUTE_PORTS.notification);
  });

  test('name the thread by its counterpart, Argus included', () => {
    expect(conversationThreadPath(3)).toBe('/conversation/3');
    expect(conversationThreadPath(0)).toBe('/conversation/0');
    expect(conversationReadPath(3)).toBe('/conversation/3/read');
  });
});

describe('validCounterpartId', () => {
  test('accepts Argus and members as numbers or numeric strings', () => {
    expect(validCounterpartId(0)).toBe(0);
    expect(validCounterpartId(12)).toBe(12);
    expect(validCounterpartId('12')).toBe(12);
    expect(validCounterpartId('0')).toBe(0);
  });

  test('refuses anything else', () => {
    for (const value of [-1, 1.5, '', ' ', 'abc', '3/read', null, undefined, Number.NaN, {}]) {
      expect(validCounterpartId(value)).toBeNull();
    }
  });
});
