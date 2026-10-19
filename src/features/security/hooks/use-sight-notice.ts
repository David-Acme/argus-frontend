import { useMemo } from 'react';
import { useTranslation } from '@/shared/hooks/use-translation';
import {
  sightNoticeCopy,
  sightNoticeOf,
  sightNoticeTitle,
  type SightNotice,
} from '@/features/security/model/tamper-notice';

type NoticeData = Readonly<Record<string, unknown>>;

export type SightNoticeView = {
  notice: SightNotice;
  title: string | null;
};

export function useSightNotice(kind: string | null, data: NoticeData): SightNoticeView | null {
  const { t } = useTranslation();
  return useMemo(() => {
    const notice = sightNoticeOf(kind, data);
    if (!notice) return null;
    const copy = sightNoticeCopy(notice);
    return { notice, title: copy ? sightNoticeTitle(copy, t) : null };
  }, [data, kind, t]);
}
