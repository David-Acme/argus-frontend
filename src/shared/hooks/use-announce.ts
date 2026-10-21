import { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useAnnounce(message: string | undefined): void {
  useEffect(() => {
    if (message) AccessibilityInfo.announceForAccessibility(message);
  }, [message]);
}
