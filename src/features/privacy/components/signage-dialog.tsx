import { useMemo, useState } from 'react';
import { View } from 'react-native';
import type { SignageShareOutcome } from '@/features/privacy/model/signage';
import { buildSignage, SIGNAGE_RESPONSIBLE_MAX } from '@/features/privacy/model/signage';
import { PRIVACY_JURISDICTION } from '@/features/privacy/constants/privacy';
import { SIGNAGE_SHARE_ACTION, shareSignage } from '@/features/privacy/services/signage-share';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Input } from '@/shared/components/ui/input';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { toast } from '@/shared/libs/toast';

type SignageDialogProps = {
  open: boolean;
  audio: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SignageDialog({ open, audio, onOpenChange }: SignageDialogProps) {
  const { t, language } = useTranslation();
  const [responsible, setResponsible] = useState('');
  const [sending, setSending] = useState(false);
  const signage = useMemo(
    () => buildSignage({ audio, responsible, language, jurisdiction: PRIVACY_JURISDICTION }, t),
    [audio, language, responsible, t]
  );

  const send = async () => {
    setSending(true);
    const outcome: SignageShareOutcome = await shareSignage({ signage, language });
    setSending(false);
    if (outcome === 'copied') toast.success(t('screens.privacy.signage.copied'));
    if (outcome === 'failed') toast.error(t('screens.privacy.signage.share-failed'));
  };

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('screens.privacy.signage.title')}
      description={t('screens.privacy.signage.description')}
      closeLabel={t('common.close')}
      footer={
        <>
          <Button variant="outline" disabled={sending} onPress={() => onOpenChange(false)}>
            <Text>{t('common.close')}</Text>
          </Button>
          <Button loading={sending} onPress={() => void send()}>
            <Text>
              {SIGNAGE_SHARE_ACTION === 'print' ? t('screens.privacy.signage.print') : t('screens.privacy.signage.share')}
            </Text>
          </Button>
        </>
      }>
      <View className="gap-4 pb-1">
        <View className="gap-1.5">
          <Text variant="label">{t('screens.privacy.signage.responsible-label')}</Text>
          <Input
            value={responsible}
            onChangeText={setResponsible}
            maxLength={SIGNAGE_RESPONSIBLE_MAX}
            placeholder={t('screens.privacy.signage.responsible-placeholder')}
            accessibilityLabel={t('screens.privacy.signage.responsible-label')}
          />
        </View>
        <View
          accessibilityRole="summary"
          className="border-foreground gap-2.5 rounded-2xl border-2 p-5">
          <View className="flex-row items-center gap-2.5">
            <Icon name={audio ? 'ear' : 'video'} className="text-foreground size-6" />
            <Text variant="headline" className="min-w-0 flex-1 tracking-wide">
              {signage.heading}
            </Text>
          </View>
          {signage.lines.map((line) => (
            <Text key={line} variant="body" className="text-foreground-secondary">
              {line}
            </Text>
          ))}
        </View>
      </View>
    </AdaptiveDialog>
  );
}
