import {
  AndroidHaptics,
  ImpactFeedbackStyle,
  NotificationFeedbackType,
  impactAsync,
  notificationAsync,
  performAndroidHapticsAsync,
  selectionAsync,
} from 'expo-haptics';
import type { FeedbackKind } from '@/core/types';
import { IS_ANDROID } from '@/shared/constants';

const ANDROID: Record<FeedbackKind, AndroidHaptics> = {
  selection: AndroidHaptics.Segment_Tick,
  success: AndroidHaptics.Confirm,
  warning: AndroidHaptics.Reject,
  impactLight: AndroidHaptics.Context_Click,
};

const IOS: Record<FeedbackKind, () => Promise<void>> = {
  selection: () => selectionAsync(),
  success: () => notificationAsync(NotificationFeedbackType.Success),
  warning: () => notificationAsync(NotificationFeedbackType.Warning),
  impactLight: () => impactAsync(ImpactFeedbackStyle.Light),
};

export function feedback(kind: FeedbackKind): void {
  const played = IS_ANDROID ? performAndroidHapticsAsync(ANDROID[kind]) : IOS[kind]();
  played.catch(() => undefined);
}
