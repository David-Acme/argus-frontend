import type { TranslateFn } from '@/core/types';
import { consentDraft, decisionOf, privacyService } from '@/features/privacy';
import { toast } from '@/shared/libs/toast';

export async function submitConsentDraft(t: TranslateFn): Promise<boolean> {
  const draft = consentDraft.peek();
  if (!draft) return false;
  const saved = await privacyService.decide(decisionOf(draft));
  if (saved.ok) {
    consentDraft.take();
    return true;
  }
  toast.warning(t('screens.privacy.consent.save-failed'), t('screens.privacy.consent.saved-later'));
  return false;
}
