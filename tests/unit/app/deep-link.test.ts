import { describe, expect, test } from 'bun:test';
import { deepLinkPath } from '@/app/+native-intent';

describe('deep link allow-list', () => {
  test('known screens pass through without their query', () => {
    expect(deepLinkPath('argus://cameras/12')).toBe('/cameras/12');
    expect(deepLinkPath('argus://agenda?new=event')).toBe('/agenda');
    expect(deepLinkPath('/security')).toBe('/security');
    expect(deepLinkPath('https://argus.local/projects/')).toBe('/projects');
    expect(deepLinkPath('argus://')).toBe('/');
  });

  test('the module and activity screens of the settings can be opened by link, nothing else under it', () => {
    expect(deepLinkPath('argus://settings/modules')).toBe('/settings/modules');
    expect(deepLinkPath('argus://settings/activity?module=surveillance')).toBe('/settings/activity');
    expect(deepLinkPath('argus://settings/profiles')).toBe('/');
    expect(deepLinkPath('argus://settings/modules/../x')).toBe('/');
  });

  test('a call link keeps only a well-formed call id', () => {
    expect(deepLinkPath('argus://call?callId=call-41')).toBe('/call?callId=call-41');
    expect(deepLinkPath(`argus://call?x=1&callId=rtc-${'a'.repeat(32)}`)).toBe(
      `/call?callId=rtc-${'a'.repeat(32)}`
    );
    expect(deepLinkPath('argus://call?callId=call-41&other=2')).toBe('/call?callId=call-41');
    expect(deepLinkPath('argus://call?callId=../settings')).toBe('/call');
    expect(deepLinkPath('argus://call?callId=call-41x')).toBe('/call');
    expect(deepLinkPath('argus://agenda?callId=call-41')).toBe('/agenda');
  });

  test('anything else lands on the entry route', () => {
    expect(deepLinkPath('argus://welcome/face?mode=invite-enroll&inviteToken=x')).toBe('/');
    expect(deepLinkPath('argus://approve')).toBe('/');
    expect(deepLinkPath('argus://cameras/../settings')).toBe('/');
    expect(deepLinkPath('argus://cameras/abc')).toBe('/');
    expect(deepLinkPath('javascript:alert(1)')).toBe('/');
  });
});
