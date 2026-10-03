import { View } from 'react-native';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { useVoiceTest } from '../hooks/use-voice-test';
import { VOICEPRINT_PROBLEM_KEYS } from '../model/voiceprint-problem';
import { VoiceLevel } from './voice-level';

type VoiceTestDialogProps = {
  onClose: () => void;
};

export function VoiceTestDialog({ onClose }: VoiceTestDialogProps) {
  const { t } = useTranslation();
  const test = useVoiceTest();
  const recording = test.phase === 'recording';
  const checking = test.phase === 'checking';
  const verdict = test.verdict;
  const similarity = verdict ? String(Math.max(0, Math.round(verdict.score * 100))) : '0';

  const close = () => {
    test.reset();
    onClose();
  };

  const change = (open: boolean) => {
    if (!open) close();
  };

  return (
    <AdaptiveDialog
      open
      onOpenChange={change}
      title={t('screens.voiceprint.verify.title')}
      closeLabel={t('common.close')}
      dismissible={!recording}
      footer={
        <>
          <Button variant="outline" onPress={close}>
            <Text>{t('common.close')}</Text>
          </Button>
          {recording ? (
            <Button onPress={test.stop}>
              <Icon name="square" />
              <Text>{t('screens.voiceprint.enroll.stop')}</Text>
            </Button>
          ) : (
            <Button onPress={test.record} loading={checking} disabled={checking}>
              <Icon name="mic" />
              <Text>
                {test.phase === 'answered' ? t('screens.voiceprint.verify.again') : t('screens.voiceprint.enroll.record')}
              </Text>
            </Button>
          )}
        </>
      }>
      <View className="gap-4">
        {verdict ? (
          <View className="items-center gap-2 py-2" accessibilityLiveRegion="polite">
            <View
              className={cn(
                'size-14 items-center justify-center rounded-full',
                verdict.matched ? 'bg-success/15' : 'bg-warning/15',
              )}>
              <Icon
                name={verdict.matched ? 'check-circle' : 'triangle-alert'}
                className={cn('size-7', verdict.matched ? 'text-success' : 'text-warning-strong')}
              />
            </View>
            <Text variant="headline">
              {verdict.matched ? t('screens.voiceprint.verify.matched') : t('screens.voiceprint.verify.not-matched')}
            </Text>
            <Text variant="caption">{t('screens.voiceprint.verify.similarity', { score: similarity })}</Text>
            {verdict.matched ? null : (
              <Text variant="body" className="text-foreground-secondary text-center">
                {t('screens.voiceprint.verify.not-matched-hint')}
              </Text>
            )}
          </View>
        ) : (
          <>
            <VoiceLevel level={test.level} active={recording} />
            <Text
              variant="label"
              className={test.problem ? 'text-error-strong text-center' : 'text-foreground-secondary text-center'}
              accessibilityLiveRegion="polite">
              {test.problem
                ? t(VOICEPRINT_PROBLEM_KEYS[test.problem])
                : recording
                  ? t('screens.voiceprint.enroll.recording')
                  : checking
                    ? t('screens.voiceprint.enroll.checking')
                    : t('screens.voiceprint.verify.instruction')}
            </Text>
          </>
        )}
      </View>
    </AdaptiveDialog>
  );
}
