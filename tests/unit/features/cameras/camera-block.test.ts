import { describe, expect, test } from 'bun:test';
import { localeDictionaries } from '@/core/i18n/locales';
import { cameraActionBlock, listenSwitchPaused } from '@/features/cameras/model/camera-block';

describe('a camera that cannot act now offers nothing it cannot do', () => {
  test('privacy blocks talk and movement, a camera turned off blocks everything', () => {
    expect(cameraActionBlock({ masked: true, enabled: true })).toBe('privacy');
    expect(cameraActionBlock({ masked: false, enabled: false })).toBe('disabled');
    expect(cameraActionBlock({ masked: true, enabled: false })).toBe('disabled');
    expect(cameraActionBlock({ masked: false, enabled: true })).toBeNull();
  });

  test('the listen switch pauses while the camera is masked or off', () => {
    expect(listenSwitchPaused('masked')).toBe(true);
    expect(listenSwitchPaused('disabled')).toBe(true);
    expect(listenSwitchPaused('listening')).toBe(false);
    expect(listenSwitchPaused('off')).toBe(false);
  });

  test('two different actions on the camera page never share a label', () => {
    for (const language of ['es', 'en'] as const) {
      const cameras = localeDictionaries[language].screens.cameras;
      expect(cameras.sight['sector-add']).not.toBe(cameras['add-zone']);
    }
  });
});
