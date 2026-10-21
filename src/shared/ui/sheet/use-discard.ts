import { useState } from 'react';
import { IS_WEB } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';

function isMac(): boolean {
  return IS_WEB && /Mac|iPhone|iPad/.test(globalThis.navigator?.platform ?? '');
}

export type Discard = {
  asking: boolean;
  question: string;
  body: string;
  keepLabel: string;
  discardLabel: string;
  closeLabel: string;
  moreLabel: string;
  submitHint: string;
  requestClose: () => void;
  keep: () => void;
  confirm: () => void;
};

export function useDiscard(dirty: string | boolean | undefined, close: () => void): Discard {
  const { t } = useTranslation();
  const [asking, setAsking] = useState(false);
  const question =
    typeof dirty === 'string' && dirty.trim()
      ? t('common.sheet.discard-title', { name: dirty.trim() })
      : t('common.sheet.discard-changes');
  return {
    asking: asking && !!dirty,
    question,
    body: t('common.sheet.discard-body'),
    keepLabel: t('common.sheet.keep'),
    discardLabel: t('common.sheet.discard'),
    closeLabel: t('common.close'),
    moreLabel: t('common.sheet.more'),
    submitHint: !IS_WEB
      ? ''
      : isMac()
        ? t('common.sheet.submit-key-mac')
        : t('common.sheet.submit-key'),
    requestClose: () => {
      if (dirty) setAsking(true);
      else close();
    },
    keep: () => setAsking(false),
    confirm: () => {
      setAsking(false);
      close();
    },
  };
}
