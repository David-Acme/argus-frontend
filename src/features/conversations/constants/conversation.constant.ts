import type { TranslationKey } from '@/core/types';
import type { SuggestionId } from '@/features/conversations/model/suggestions';

export const UNREAD_BADGE_MAX = 99;

export const CHAT_CLOCK_SKEW_MS = 5 * 60 * 1000;

export const CONVERSATIONS_HREF = '/conversations';

export const DAY_PILL_HOLD_MS = 1000;

export const SUGGESTION_KEYS: Readonly<
  Record<Exclude<SuggestionId, 'show-camera'>, TranslationKey>
> = {
  'who-home': 'screens.conversations.suggest.who-home',
  'night-mode': 'screens.conversations.suggest.night-mode',
  today: 'screens.conversations.suggest.today',
  tomorrow: 'screens.conversations.suggest.tomorrow',
  remind: 'screens.conversations.suggest.remind',
};
