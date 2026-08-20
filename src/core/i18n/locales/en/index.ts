import { common } from './common';
import { screens } from './screens';

// Shape enforced by `localeDictionaries satisfies Record<LanguageCode, I18nSchema>`.
export const en = { common, screens };
