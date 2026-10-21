import { AccessibilityInfo } from 'react-native';

export type SystemFlag = 'reduceMotion' | 'reduceTransparency';

export function readSystemFlag(flag: SystemFlag): Promise<boolean> {
  return flag === 'reduceMotion'
    ? AccessibilityInfo.isReduceMotionEnabled()
    : AccessibilityInfo.isReduceTransparencyEnabled();
}

export function watchSystemFlag(
  flag: SystemFlag,
  onChange: (enabled: boolean) => void
): () => void {
  const event = flag === 'reduceMotion' ? 'reduceMotionChanged' : 'reduceTransparencyChanged';
  const subscription = AccessibilityInfo.addEventListener(event, onChange);
  return () => subscription.remove();
}
