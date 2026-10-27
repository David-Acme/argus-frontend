import type { TranslationKey } from '@/core/types';
import type { HoldTalkFailure } from '@/features/voice/model/hold-talk';

export type HoldWords = { title: TranslationKey; body: TranslationKey | null };

const RETRY = 'screens.voice.hold.retry-hint';

export const HOLD_FAILURE_WORDS: Readonly<Record<HoldTalkFailure, HoldWords>> = {
  'not-heard': {
    title: 'screens.voice.hold.errors.not-heard',
    body: 'screens.voice.hold.errors.not-heard-hint',
  },
  'no-reply': { title: 'screens.voice.hold.errors.no-reply', body: RETRY },
  connection: { title: 'screens.voice.hold.errors.connection', body: RETRY },
  permission: {
    title: 'screens.voice.hold.errors.permission',
    body: 'screens.voice.hold.errors.permission-hint',
  },
  session: { title: 'screens.voice.errors.session-revoked', body: null },
  account: { title: 'screens.voice.errors.account-disabled', body: null },
  generic: { title: 'screens.voice.hold.errors.generic', body: RETRY },
};
