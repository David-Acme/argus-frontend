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

  test('anything else lands on the entry route', () => {
    expect(deepLinkPath('argus://welcome/face?mode=invite-enroll&inviteToken=x')).toBe('/');
    expect(deepLinkPath('argus://approve')).toBe('/');
    expect(deepLinkPath('argus://cameras/../settings')).toBe('/');
    expect(deepLinkPath('argus://cameras/abc')).toBe('/');
    expect(deepLinkPath('javascript:alert(1)')).toBe('/');
  });
});
