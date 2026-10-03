import type { IconName } from '@/core/types/icon.type';
import type { TranslationKey } from '@/core/types/i18n.type';

export type QrScanPurpose = 'server' | 'invite' | 'generic' | 'login';

export type QrScanStatus = 'idle' | 'scanning' | 'scanned' | 'cancelled';

export type QrScanFeedback = 'requesting' | 'searching' | 'detected' | 'invalid' | 'blocked';

export type QrScanTone = 'muted' | 'accent' | 'error';

export type QrScanConfig = {
  purpose: QrScanPurpose;
  title: TranslationKey;
  hint: TranslationKey | null;
  manualLabel: TranslationKey | null;
  manualPlaceholder: TranslationKey | null;
  pattern: RegExp | null;
  invalidMessage: TranslationKey | null;
};

export type QrScanPurposeDefaults = Omit<QrScanConfig, 'purpose'>;

export type QrScanFeedbackDefinition = {
  label: TranslationKey;
  tone: QrScanTone;
  icon: IconName | null;
};
