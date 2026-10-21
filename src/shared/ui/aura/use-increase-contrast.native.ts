import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { IS_ANDROID } from '@/shared/constants';

export function useIncreaseContrast(): boolean {
  const [more, setMore] = useState(false);
  useEffect(() => {
    const read = IS_ANDROID
      ? AccessibilityInfo.isHighTextContrastEnabled
      : AccessibilityInfo.isDarkerSystemColorsEnabled;
    read()
      .then(setMore)
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener(
      IS_ANDROID ? 'highTextContrastChanged' : 'darkerSystemColorsChanged',
      setMore
    );
    return () => subscription.remove();
  }, []);
  return more;
}
