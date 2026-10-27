import { useTranslation } from '@/shared/hooks/use-translation';
import { Notice } from '@/shared/ui/notice';
import { HOLD_FAILURE_WORDS } from '@/features/voice';
import type { HoldTalkFailure } from '@/features/voice';

export type TalkNoticeProps = {
  failure: HoldTalkFailure;
  onAllow: () => Promise<void>;
};

export function TalkNotice({ failure, onAllow }: TalkNoticeProps) {
  const { t } = useTranslation();
  if (failure === 'permission')
    return (
      <Notice
        inline
        tone="attention"
        icon="mic"
        title={t('screens.conversations.mic-denied')}
        body={t('screens.conversations.mic-denied-hint')}
        action={{ label: t('screens.conversations.mic-allow'), onPress: onAllow, primary: true }}
      />
    );
  const words = HOLD_FAILURE_WORDS[failure];
  return (
    <Notice
      inline
      tone="attention"
      icon="mic"
      title={t(words.title)}
      body={words.body ? t(words.body) : undefined}
    />
  );
}
