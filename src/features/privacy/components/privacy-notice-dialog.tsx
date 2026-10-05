import { View } from 'react-native';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { Button } from '@/shared/components/ui/button';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { PRIVACY_JURISDICTION, PRIVACY_NOTICE_VERSION } from '@/features/privacy/constants/privacy';

type PrivacyNoticeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type NoticeSectionProps = {
  title: string;
  body: string;
};

function NoticeSection({ title, body }: NoticeSectionProps) {
  return (
    <View className="gap-1">
      <Text variant="label">{title}</Text>
      <Text variant="body" className="text-foreground-secondary">
        {body}
      </Text>
    </View>
  );
}

export function PrivacyNoticeDialog({ open, onOpenChange }: PrivacyNoticeDialogProps) {
  const { t, language } = useTranslation();
  const place = PRIVACY_JURISDICTION;
  const country = place.country[language];
  const laws = place.laws[language];
  const authority = place.authority[language];

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      size="wide"
      title={t('screens.privacy.notice.title')}
      description={t('screens.privacy.notice.version', { version: String(PRIVACY_NOTICE_VERSION) })}
      closeLabel={t('screens.privacy.notice.close')}
      footer={
        <Button onPress={() => onOpenChange(false)}>
          <Text>{t('screens.privacy.notice.close')}</Text>
        </Button>
      }>
      <View className="gap-4 pb-2">
        <NoticeSection title={t('screens.privacy.notice.where-title')} body={t('screens.privacy.notice.where-body')} />
        <NoticeSection title={t('screens.privacy.notice.what-title')} body={t('screens.privacy.notice.what-body')} />
        <NoticeSection
          title={t('screens.privacy.notice.sensitive-title')}
          body={t('screens.privacy.notice.sensitive-body', { laws })}
        />
        <NoticeSection
          title={t('screens.privacy.notice.retention-title')}
          body={t('screens.privacy.notice.retention-body', {
            country,
            videoDays: String(place.videoDays),
            videoMaxDays: String(place.videoMaxDays),
            incidentDays: String(place.incidentDays),
          })}
        />
        <NoticeSection title={t('screens.privacy.notice.choices-title')} body={t('screens.privacy.notice.choices-body')} />
        <NoticeSection
          title={t('screens.privacy.notice.rights-title')}
          body={t('screens.privacy.notice.rights-body', { country, authority })}
        />
        <NoticeSection
          title={t('screens.privacy.notice.owner-title')}
          body={t('screens.privacy.notice.owner-body', { laws })}
        />
        <NoticeSection title={t('screens.privacy.notice.terms-title')} body={t('screens.privacy.notice.terms-body')} />
        <Text variant="caption">{t('screens.privacy.notice.legal-note')}</Text>
      </View>
    </AdaptiveDialog>
  );
}
