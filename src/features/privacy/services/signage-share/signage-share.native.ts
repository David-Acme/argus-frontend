import { Share } from 'react-native';
import type { SignageShareInput, SignageShareOutcome } from '@/features/privacy/model/signage';
import { signageText } from '@/features/privacy/model/signage';

export const SIGNAGE_SHARE_ACTION = 'share' as const;

export async function shareSignage({ signage }: SignageShareInput): Promise<SignageShareOutcome> {
  try {
    const result = await Share.share({ title: signage.heading, message: signageText(signage) });
    return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
  } catch {
    return 'failed';
  }
}
